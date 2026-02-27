import type {
  DataSet,
  CombineStrategy,
  SmartCombineOptions,
  SchemaInfo,
  SchemaComparison,
} from "@/types/data";
import { buildColumns } from "@/lib/utils/data-transforms";

const DEFAULT_ROW_LIMIT = 50_000;

//date-like column name patterns (Zillow-style: "2020-01", "2021-03-15", "Jan 2020", etc.)
const DATE_COLUMN_RE =
  /^\d{4}-\d{2}(-\d{2})?$|^\d{2}\/\d{4}$|^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s?\d{4}$/i;

//US states for city-to-state aggregation detection
const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]);

/**
 * Combine multiple parsed datasets into a single dataset.
 *
 * Strategies:
 * - "append": Stack rows vertically (UNION). Adds a "source_file" column.
 * - "merge": Join on common columns (JOIN). Auto-detects the join key.
 * - "auto": If all files share the same columns, append. If they share a key, merge. Otherwise append with null fills.
 * - "smart": Groups identical schemas → stack, different schemas with shared keys → join, optional wide-to-long pivot.
 */
export function combineDatasets(
  datasets: DataSet[],
  strategy: CombineStrategy = "auto",
  smartOptions?: SmartCombineOptions
): DataSet {
  if (datasets.length === 0) {
    return emptyResult(["No datasets to combine"]);
  }

  if (datasets.length === 1) {
    return datasets[0];
  }

  const warnings: string[] = [];
  const totalFileSize = datasets.reduce((sum, ds) => sum + ds.metadata.fileSize, 0);
  const rowLimit = smartOptions?.rowLimit ?? DEFAULT_ROW_LIMIT;

  if (strategy === "smart") {
    return smartCombine(datasets, totalFileSize, warnings, smartOptions);
  }

  const effectiveStrategy =
    strategy === "auto" ? detectStrategy(datasets) : strategy;

  warnings.push(
    `Combined ${datasets.length} files using "${effectiveStrategy}" strategy`
  );

  let result: DataSet;
  if (effectiveStrategy === "merge") {
    result = mergeDatasets(datasets, totalFileSize, warnings);
  } else {
    result = appendDatasets(datasets, totalFileSize, warnings);
  }

  return enforceRowLimit(result, rowLimit, warnings);
}

/**
 * Analyze schemas across multiple datasets without combining.
 * Used by the UI to show schema comparison before the user picks a strategy.
 */
export function analyzeSchemas(datasets: DataSet[]): SchemaComparison {
  const schemas: SchemaInfo[] = datasets.map((ds) => {
    const colNames = ds.columns.map((c) => c.name);
    return {
      source: ds.metadata.source,
      columns: colNames,
      rowCount: ds.rowCount,
      fingerprint: [...colNames].sort().join("|"),
    };
  });

  const groupMap = new Map<string, SchemaInfo[]>();
  for (const s of schemas) {
    const existing = groupMap.get(s.fingerprint);
    if (existing) {
      existing.push(s);
    } else {
      groupMap.set(s.fingerprint, [s]);
    }
  }
  const schemaGroups = Array.from(groupMap.values());

  const allColumnSets = schemas.map((s) => new Set(s.columns));
  const sharedColumns = schemas[0].columns.filter((col) =>
    allColumnSets.every((cs) => cs.has(col))
  );

  const sharedSet = new Set(sharedColumns);
  const uniqueColumns = new Map<string, string[]>();
  for (const s of schemas) {
    const unique = s.columns.filter((c) => !sharedSet.has(c));
    if (unique.length > 0) {
      uniqueColumns.set(s.source, unique);
    }
  }

  const detectedKeys = findAllKeyColumns(datasets, sharedColumns);

  const hasWideDateColumns = schemas.some((s) =>
    s.columns.some((c) => DATE_COLUMN_RE.test(c))
  );

  let estimatedRows: number;
  if (schemaGroups.length === 1) {
    estimatedRows = schemas.reduce((sum, s) => sum + s.rowCount, 0);
  } else if (detectedKeys.length > 0) {
    estimatedRows = Math.max(...schemas.map((s) => s.rowCount));
  } else {
    estimatedRows = schemas.reduce((sum, s) => sum + s.rowCount, 0);
  }

  return {
    schemas,
    sharedColumns,
    uniqueColumns,
    detectedKeys,
    hasWideDateColumns,
    schemaGroups,
    estimatedRows,
  };
}

/**
 * Pivot wide-format date columns to long format.
 * Turns { RegionName, State, "2020-01": 1500, "2020-02": 1520, ... }
 * into  { RegionName, State, Date: "2020-01", Value: 1500 }
 */
export function pivotWideToLong(
  dataSet: DataSet,
  valueColumnName?: string
): DataSet {
  const warnings = [...dataSet.metadata.parseWarnings];

  const dateColumns: string[] = [];
  const nonDateColumns: string[] = [];

  for (const col of dataSet.columns) {
    if (DATE_COLUMN_RE.test(col.originalName)) {
      dateColumns.push(col.originalName);
    } else {
      nonDateColumns.push(col.originalName);
    }
  }

  if (dateColumns.length === 0) {
    warnings.push("No date columns detected for pivoting");
    return { ...dataSet, metadata: { ...dataSet.metadata, parseWarnings: warnings } };
  }

  const valName = valueColumnName ?? inferValueName(dataSet.metadata.source);
  warnings.push(
    `Pivoted ${dateColumns.length} date columns to long format (Date | ${valName})`
  );

  const longRows: Record<string, unknown>[] = [];

  for (const row of dataSet.rows) {
    for (const dateCol of dateColumns) {
      const val = row[dateCol];
      if (val == null || val === "") continue;

      const newRow: Record<string, unknown> = {};
      for (const col of nonDateColumns) {
        newRow[col] = row[col];
      }
      newRow["Date"] = dateCol;
      newRow[valName] = val;
      longRows.push(newRow);
    }
  }

  const allColNames = [...nonDateColumns, "Date", valName];
  const previewRows = longRows.slice(0, 200);
  const columns = buildColumns(previewRows, allColNames);

  return {
    columns,
    rows: longRows,
    rowCount: longRows.length,
    metadata: {
      ...dataSet.metadata,
      parseWarnings: warnings,
    },
  };
}

function smartCombine(
  datasets: DataSet[],
  totalFileSize: number,
  warnings: string[],
  options?: SmartCombineOptions
): DataSet {
  const comparison = analyzeSchemas(datasets);
  const rowLimit = options?.rowLimit ?? DEFAULT_ROW_LIMIT;

  warnings.push(
    `Smart combine: ${comparison.schemaGroups.length} schema group(s), ` +
    `${comparison.sharedColumns.length} shared column(s), ` +
    `${comparison.detectedKeys.length} key column(s) detected`
  );

  const groupResults: DataSet[] = [];

  for (const group of comparison.schemaGroups) {
    const groupDatasets = group.map((info) =>
      datasets.find((ds) => ds.metadata.source === info.source)!
    );

    if (groupDatasets.length === 1) {
      groupResults.push(groupDatasets[0]);
    } else {
      const groupWarnings: string[] = [];
      const groupFileSize = groupDatasets.reduce((s, ds) => s + ds.metadata.fileSize, 0);
      const stacked = appendDatasets(groupDatasets, groupFileSize, groupWarnings);
      warnings.push(
        `Stacked ${groupDatasets.length} files with identical schema: ` +
        groupDatasets.map((ds) => ds.metadata.source).join(", ")
      );
      groupResults.push(stacked);
    }
  }

  let combined: DataSet;
  if (groupResults.length === 1) {
    combined = groupResults[0];
  } else {
    const joinKeys = findAllKeyColumns(groupResults, comparison.sharedColumns);

    if (joinKeys.length > 0) {
      warnings.push(
        `Joining ${groupResults.length} schema groups on: ${joinKeys.join(", ")}`
      );
      combined = multiKeyMerge(groupResults, joinKeys, totalFileSize, warnings);
    } else {
      warnings.push(
        "No shared key columns with overlapping values. Falling back to append."
      );
      combined = appendDatasets(groupResults, totalFileSize, warnings);
    }
  }

  if (options?.pivotDates && comparison.hasWideDateColumns) {
    combined = pivotWideToLong(combined);
    warnings.push(...combined.metadata.parseWarnings.filter((w) => w.includes("Pivoted")));
  }

  if (options?.aggregateToState) {
    const stateResult = aggregateToState(combined);
    if (stateResult) {
      combined = stateResult;
      warnings.push("Aggregated city-level data to state level");
    }
  }

  combined.metadata.parseWarnings = warnings;
  return enforceRowLimit(combined, rowLimit, warnings);
}

/**
 * Merge datasets on multiple key columns. Builds a composite key
 * from all detected key columns for a proper multi-column join.
 */
function multiKeyMerge(
  datasets: DataSet[],
  joinKeys: string[],
  totalFileSize: number,
  warnings: string[]
): DataSet {
  warnings.push(
    `Merging ${datasets.length} datasets on ${joinKeys.length > 1 ? "composite key" : "key"}: ${joinKeys.join(", ")}`
  );

  const rowMap = new Map<string, Record<string, unknown>>();

  const resolveOriginal = (ds: DataSet, normalizedName: string): string => {
    const col = ds.columns.find((c) => c.name === normalizedName);
    return col?.originalName ?? normalizedName;
  };

  const compositeKey = (row: Record<string, unknown>, ds: DataSet): string =>
    joinKeys.map((k) => String(row[resolveOriginal(ds, k)] ?? "")).join("|||");

  const baseDs = datasets[0];
  for (const row of baseDs.rows) {
    const key = compositeKey(row, baseDs);
    if (key.replace(/\|/g, "").length > 0) {
      rowMap.set(key, { ...row });
    }
  }

  const keyOriginalNames = new Set(
    joinKeys.flatMap((k) =>
      datasets.map((ds) => resolveOriginal(ds, k))
    )
  );

  for (let i = 1; i < datasets.length; i++) {
    const ds = datasets[i];
    const nonKeyColumns = ds.columns.filter(
      (c) => !joinKeys.includes(c.name) && !keyOriginalNames.has(c.originalName)
    );

    for (const row of ds.rows) {
      const key = compositeKey(row, ds);
      if (key.replace(/\|/g, "").length === 0) continue;

      const existing = rowMap.get(key);
      if (existing) {
        for (const col of nonKeyColumns) {
          existing[col.originalName] = row[col.originalName] ?? null;
        }
      } else {
        const newRow: Record<string, unknown> = { ...row };
        for (const col of baseDs.columns) {
          if (!(col.originalName in newRow)) {
            newRow[col.originalName] = null;
          }
        }
        rowMap.set(key, newRow);
      }
    }
  }

  const allRows = Array.from(rowMap.values());

  const allOriginalNames: string[] = [];
  const seen = new Set<string>();
  for (const ds of datasets) {
    for (const col of ds.columns) {
      if (!seen.has(col.originalName)) {
        seen.add(col.originalName);
        allOriginalNames.push(col.originalName);
      }
    }
  }

  const columns = buildColumns(allRows.slice(0, 200), allOriginalNames);

  return {
    columns,
    rows: allRows,
    rowCount: allRows.length,
    metadata: {
      source: datasets.map((ds) => ds.metadata.source).join(", "),
      fileSize: totalFileSize,
      fileType: "combined",
      parseWarnings: [],
    },
  };
}

/**
 * Detect if the dataset has city-level granularity and aggregate to state level.
 * Looks for a "State" (or "StateName") column alongside a region/city column
 * with many more unique values than states.
 */
function aggregateToState(dataSet: DataSet): DataSet | null {
  const stateCol = dataSet.columns.find((c) =>
    /^(state|state_name|statename)$/i.test(c.name)
  );
  if (!stateCol) return null;

  const stateValues = new Set(
    dataSet.rows
      .map((r) => String(r[stateCol.originalName] ?? "").trim().toUpperCase())
      .filter((v) => v.length > 0)
  );
  const stateOverlap = [...stateValues].filter((v) => US_STATES.has(v));
  if (stateOverlap.length < 5) return null;

  const regionCol = dataSet.columns.find((c) => {
    if (c.name === stateCol.name) return false;
    if (c.type !== "string") return false;
    const uniqueVals = new Set(
      dataSet.rows.map((r) => String(r[c.originalName] ?? ""))
    );
    return uniqueVals.size > stateValues.size * 2;
  });

  if (!regionCol) return null;

  const numericCols = dataSet.columns.filter(
    (c) => c.type === "number" || c.type === "currency" || c.type === "percentage"
  );
  if (numericCols.length === 0) return null;

  const stateGroups = new Map<string, Record<string, unknown>[]>();
  for (const row of dataSet.rows) {
    const state = String(row[stateCol.originalName] ?? "");
    if (!state) continue;
    const existing = stateGroups.get(state);
    if (existing) {
      existing.push(row);
    } else {
      stateGroups.set(state, [row]);
    }
  }

  //non-numeric, non-region columns to keep (take first value per state)
  const keepCols = dataSet.columns.filter(
    (c) =>
      c.name === stateCol.name ||
      (c.name !== regionCol.name &&
        c.type !== "number" &&
        c.type !== "currency" &&
        c.type !== "percentage")
  );

  const aggRows: Record<string, unknown>[] = [];
  for (const [, rows] of stateGroups) {
    const aggRow: Record<string, unknown> = {};

    for (const col of keepCols) {
      aggRow[col.originalName] = rows[0][col.originalName];
    }

    for (const col of numericCols) {
      const nums = rows
        .map((r) => {
          const v = r[col.originalName];
          return typeof v === "number" ? v : null;
        })
        .filter((n): n is number => n !== null);

      aggRow[col.originalName] =
        nums.length > 0
          ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
          : null;
    }

    aggRows.push(aggRow);
  }

  const colNames = [
    ...keepCols.map((c) => c.originalName),
    ...numericCols.map((c) => c.originalName),
  ];
  const columns = buildColumns(aggRows.slice(0, 200), colNames);

  return {
    columns,
    rows: aggRows,
    rowCount: aggRows.length,
    metadata: {
      ...dataSet.metadata,
      parseWarnings: [
        ...dataSet.metadata.parseWarnings,
        `Aggregated from ${dataSet.rowCount.toLocaleString()} rows (city-level) to ${aggRows.length} rows (state-level). Numeric columns averaged.`,
      ],
    },
  };
}

function detectStrategy(datasets: DataSet[]): "append" | "merge" {
  const columnSets = datasets.map(
    (ds) => new Set(ds.columns.map((c) => c.name))
  );

  const first = columnSets[0];
  const allSame = columnSets.every(
    (cs) => cs.size === first.size && [...cs].every((c) => first.has(c))
  );

  if (allSame) return "append";

  const joinKey = findJoinKey(datasets);
  if (joinKey) return "merge";

  return "append";
}

function findJoinKey(datasets: DataSet[]): string | null {
  const columnSets = datasets.map(
    (ds) => new Set(ds.columns.map((c) => c.name))
  );

  const commonColumns = [...columnSets[0]].filter((col) =>
    columnSets.every((cs) => cs.has(col))
  );

  if (commonColumns.length === 0) return null;

  const keyPatterns = [
    /^id$/i, /^key$/i, /^name$/i, /^date$/i, /_id$/i, /_key$/i,
  ];

  for (const pattern of keyPatterns) {
    const match = commonColumns.find((col) => pattern.test(col));
    if (match && hasOverlappingValues(datasets, match)) return match;
  }

  for (const col of commonColumns) {
    if (hasOverlappingValues(datasets, col)) return col;
  }

  return null;
}

/**
 * Find ALL columns that appear in every dataset and have overlapping values.
 * Returns them sorted: named keys first, then others.
 */
function findAllKeyColumns(datasets: DataSet[], sharedCols?: string[]): string[] {
  const columnSets = datasets.map(
    (ds) => new Set(ds.columns.map((c) => c.name))
  );

  const commonColumns = sharedCols ??
    [...columnSets[0]].filter((col) =>
      columnSets.every((cs) => cs.has(col))
    );

  //don't treat "2020-01" as a key
  const candidateKeys = commonColumns.filter((c) => !DATE_COLUMN_RE.test(c));

  const keys: string[] = [];
  const keyPatterns = [
    /^(region|state|country|city|county|zip|fips)/i,
    /^id$/i, /^key$/i, /^name$/i,
    /_id$/i, /_key$/i, /_code$/i,
    /^(region_?name|state_?name|size_?rank|metro)/i,
  ];

  for (const pattern of keyPatterns) {
    for (const col of candidateKeys) {
      if (pattern.test(col) && !keys.includes(col)) {
        if (hasOverlappingValues(datasets, col)) {
          keys.push(col);
        }
      }
    }
  }

  for (const col of candidateKeys) {
    if (!keys.includes(col) && hasOverlappingValues(datasets, col)) {
      //only include if it looks categorical (not all unique numbers)
      const firstDs = datasets[0];
      const origCol = firstDs.columns.find((c) => c.name === col);
      if (origCol && (origCol.type === "string" || origCol.type === "date")) {
        keys.push(col);
      }
    }
  }

  return keys;
}

function hasOverlappingValues(datasets: DataSet[], column: string): boolean {
  const valueSets = datasets.map((ds) => {
    const originalCol = ds.columns.find((c) => c.name === column);
    const key = originalCol?.originalName ?? column;
    return new Set(
      ds.rows
        .map((r) => String(r[key] ?? ""))
        .filter((v) => v !== "" && v !== "null" && v !== "undefined")
    );
  });

  for (let i = 0; i < valueSets.length; i++) {
    for (let j = i + 1; j < valueSets.length; j++) {
      for (const v of valueSets[i]) {
        if (valueSets[j].has(v)) return true;
      }
    }
  }

  return false;
}

function appendDatasets(
  datasets: DataSet[],
  totalFileSize: number,
  warnings: string[]
): DataSet {
  const allOriginalNames: string[] = [];
  const seenOriginals = new Set<string>();

  for (const ds of datasets) {
    for (const col of ds.columns) {
      if (!seenOriginals.has(col.originalName)) {
        seenOriginals.add(col.originalName);
        allOriginalNames.push(col.originalName);
      }
    }
  }

  const columnSets = datasets.map(
    (ds) => new Set(ds.columns.map((c) => c.originalName))
  );
  const allSame = columnSets.every(
    (cs) =>
      cs.size === columnSets[0].size &&
      [...cs].every((c) => columnSets[0].has(c))
  );

  if (!allSame) {
    warnings.push(
      "Datasets have different columns. Missing values filled with null."
    );
  }

  const allRows: Record<string, unknown>[] = [];

  for (const ds of datasets) {
    const existingCols = new Set(ds.columns.map((c) => c.originalName));

    for (const row of ds.rows) {
      const newRow: Record<string, unknown> = {
        source_file: ds.metadata.source,
      };
      for (const colName of allOriginalNames) {
        newRow[colName] = existingCols.has(colName)
          ? (row[colName] ?? null)
          : null;
      }
      allRows.push(newRow);
    }
  }

  const allColumnNames = ["source_file", ...allOriginalNames];
  const columns = buildColumns(allRows.slice(0, 200), allColumnNames);

  return {
    columns,
    rows: allRows,
    rowCount: allRows.length,
    metadata: {
      source: datasets.map((ds) => ds.metadata.source).join(", "),
      fileSize: totalFileSize,
      fileType: "combined",
      parseWarnings: warnings,
    },
  };
}

function mergeDatasets(
  datasets: DataSet[],
  totalFileSize: number,
  warnings: string[]
): DataSet {
  const joinKey = findJoinKey(datasets);

  if (!joinKey) {
    warnings.push("No suitable join key found. Falling back to append.");
    return appendDatasets(datasets, totalFileSize, warnings);
  }

  warnings.push(`Joining datasets on column: "${joinKey}"`);
  return multiKeyMerge(datasets, [joinKey], totalFileSize, warnings);
}

function enforceRowLimit(
  dataSet: DataSet,
  limit: number,
  warnings: string[]
): DataSet {
  if (dataSet.rows.length <= limit) return dataSet;

  warnings.push(
    `Row limit exceeded: ${dataSet.rows.length.toLocaleString()} rows truncated to ${limit.toLocaleString()}. ` +
    `Consider filtering your data or aggregating to a higher level.`
  );

  return {
    ...dataSet,
    rows: dataSet.rows.slice(0, limit),
    rowCount: dataSet.rows.length,
    metadata: {
      ...dataSet.metadata,
      parseWarnings: warnings,
    },
  };
}

/**
 * Infer a value column name from a Zillow-style filename.
 * "State_MedianRentalPrice_1Bedroom.csv" → "MedianRentalPrice_1Bedroom"
 */
function inferValueName(source: string): string {
  const base = source.replace(/\.[^.]+$/, "");
  const cleaned = base
    .replace(/^(State|Metro|City|County|Zip|Neighborhood)_/i, "")
    .replace(/_/g, " ")
    .trim();
  return cleaned || "Value";
}

function emptyResult(warnings: string[]): DataSet {
  return {
    columns: [],
    rows: [],
    rowCount: 0,
    metadata: {
      source: "combined",
      fileSize: 0,
      fileType: "combined",
      parseWarnings: warnings,
    },
  };
}
