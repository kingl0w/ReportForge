import type { DataSet, Column } from "@/types/data";
import type {
  ShopifyOrder,
  ShopifyProduct,
  ShopifyCustomer,
} from "./types";

export function transformOrders(
  orders: ShopifyOrder[],
  shop: string
): DataSet {
  const columns: Column[] = [
    col("Order ID", "order_id", "string", orders.map((o) => o.name)),
    col("Date", "date", "date", orders.map((o) => o.created_at)),
    col("Customer", "customer", "string", orders.map((o) => customerName(o.customer))),
    col("Total", "total", "currency", orders.map((o) => o.total_price)),
    col("Status", "status", "string", orders.map((o) => o.financial_status)),
    col("Fulfillment", "fulfillment", "string", orders.map((o) => o.fulfillment_status ?? "unfulfilled")),
    col("Items Count", "items_count", "number", orders.map((o) => o.line_items.length)),
  ];

  const rows = orders.map((o) => ({
    order_id: o.name,
    date: o.created_at,
    customer: customerName(o.customer),
    total: parseFloat(o.total_price),
    status: o.financial_status,
    fulfillment: o.fulfillment_status ?? "unfulfilled",
    items_count: o.line_items.length,
  }));

  return {
    columns,
    rows,
    rowCount: rows.length,
    metadata: {
      source: `shopify:${shop}`,
      fileSize: 0,
      fileType: "shopify",
      parseWarnings: [],
    },
  };
}

/**includes total inventory, average price, and revenue estimate columns*/
export function transformProducts(
  products: ShopifyProduct[],
  shop: string
): DataSet {
  const columns: Column[] = [
    col("Product", "product", "string", products.map((p) => p.title)),
    col("Vendor", "vendor", "string", products.map((p) => p.vendor)),
    col("Type", "product_type", "string", products.map((p) => p.product_type)),
    col("Status", "status", "string", products.map((p) => p.status)),
    col("Variants", "variants", "number", products.map((p) => p.variants.length)),
    col("Price (min)", "price_min", "currency", products.map((p) => minPrice(p))),
    col("Price (max)", "price_max", "currency", products.map((p) => maxPrice(p))),
    col("Total Inventory", "total_inventory", "number", products.map((p) => totalInventory(p))),
    col("Avg Price", "avg_price", "currency", products.map((p) => avgPrice(p))),
    col("Created", "created", "date", products.map((p) => p.created_at)),
  ];

  const rows = products.map((p) => ({
    product: p.title,
    vendor: p.vendor,
    product_type: p.product_type,
    status: p.status,
    variants: p.variants.length,
    price_min: minPrice(p),
    price_max: maxPrice(p),
    total_inventory: totalInventory(p),
    avg_price: avgPrice(p),
    created: p.created_at,
  }));

  return {
    columns,
    rows,
    rowCount: rows.length,
    metadata: {
      source: `shopify:${shop}`,
      fileSize: 0,
      fileType: "shopify",
      parseWarnings: [],
    },
  };
}

/**strips PII (no names/emails), adds segment and spending tier columns*/
export function transformCustomers(
  customers: ShopifyCustomer[],
  shop: string
): DataSet {
  //compute spending quartiles for tier assignment
  const spentValues = customers
    .map((c) => parseFloat(c.total_spent))
    .filter((v) => !isNaN(v))
    .sort((a, b) => a - b);

  const q1 = percentile(spentValues, 25);
  const q3 = percentile(spentValues, 75);

  const columns: Column[] = [
    col("Customer ID", "customer_id", "string", customers.map((c) => `CUST-${c.id}`)),
    col("Orders Count", "orders_count", "number", customers.map((c) => c.orders_count)),
    col("Total Spent", "total_spent", "currency", customers.map((c) => c.total_spent)),
    col("Segment", "segment", "string", customers.map((c) => c.orders_count <= 1 ? "new" : "returning")),
    col("Spending Tier", "spending_tier", "string", customers.map((c) => spendingTier(parseFloat(c.total_spent), q1, q3))),
    col("Lifetime Value", "lifetime_value", "currency", customers.map((c) => c.total_spent)),
    col("Created", "created", "date", customers.map((c) => c.created_at)),
  ];

  const rows = customers.map((c) => {
    const spent = parseFloat(c.total_spent);
    return {
      customer_id: `CUST-${c.id}`,
      orders_count: c.orders_count,
      total_spent: spent,
      segment: c.orders_count <= 1 ? "new" : "returning",
      spending_tier: spendingTier(spent, q1, q3),
      lifetime_value: spent,
      created: c.created_at,
    };
  });

  return {
    columns,
    rows,
    rowCount: rows.length,
    metadata: {
      source: `shopify:${shop}`,
      fileSize: 0,
      fileType: "shopify",
      parseWarnings: [],
    },
  };
}

/**orders enriched with product data for weekly reports*/
export function transformAllData(
  orders: ShopifyOrder[],
  products: ShopifyProduct[],
  customers: ShopifyCustomer[],
  shop: string
): DataSet {
  const productMap = new Map<number, ShopifyProduct>();
  for (const p of products) {
    productMap.set(p.id, p);
  }

  const columns: Column[] = [
    col("Order ID", "order_id", "string", orders.map((o) => o.name)),
    col("Date", "date", "date", orders.map((o) => o.created_at)),
    col("Customer", "customer", "string", orders.map((o) => customerName(o.customer))),
    col("Total", "total", "currency", orders.map((o) => o.total_price)),
    col("Tax", "tax", "currency", orders.map((o) => o.total_tax)),
    col("Status", "status", "string", orders.map((o) => o.financial_status)),
    col("Fulfillment", "fulfillment", "string", orders.map((o) => o.fulfillment_status ?? "unfulfilled")),
    col("Items Count", "items_count", "number", orders.map((o) => o.line_items.length)),
    col("Top Product", "top_product", "string", orders.map((o) => topProduct(o, productMap))),
  ];

  const rows = orders.map((o) => ({
    order_id: o.name,
    date: o.created_at,
    customer: customerName(o.customer),
    total: parseFloat(o.total_price),
    tax: parseFloat(o.total_tax),
    status: o.financial_status,
    fulfillment: o.fulfillment_status ?? "unfulfilled",
    items_count: o.line_items.length,
    top_product: topProduct(o, productMap),
  }));

  const warnings: string[] = [];
  if (customers.length === 0) {
    warnings.push("No customer data available");
  }

  return {
    columns,
    rows,
    rowCount: rows.length,
    metadata: {
      source: `shopify:${shop}`,
      fileSize: 0,
      fileType: "shopify",
      parseWarnings: warnings,
    },
  };
}

function customerName(
  customer: ShopifyOrder["customer"]
): string {
  if (!customer) return "Guest";
  //use anonymized customer ID to avoid PII leakage in reports
  return customer.id ? `CUST-${customer.id}` : "Guest";
}

function totalInventory(product: ShopifyProduct): number {
  return product.variants.reduce((sum, v) => sum + v.inventory_quantity, 0);
}

function avgPrice(product: ShopifyProduct): number {
  if (product.variants.length === 0) return 0;
  const sum = product.variants.reduce((s, v) => s + parseFloat(v.price), 0);
  return Math.round((sum / product.variants.length) * 100) / 100;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function spendingTier(spent: number, q1: number, q3: number): string {
  if (spent <= q1) return "low";
  if (spent >= q3) return "high";
  return "medium";
}

function minPrice(product: ShopifyProduct): number {
  if (product.variants.length === 0) return 0;
  return Math.min(...product.variants.map((v) => parseFloat(v.price)));
}

function maxPrice(product: ShopifyProduct): number {
  if (product.variants.length === 0) return 0;
  return Math.max(...product.variants.map((v) => parseFloat(v.price)));
}

function topProduct(
  order: ShopifyOrder,
  productMap: Map<number, ShopifyProduct>
): string {
  if (order.line_items.length === 0) return "N/A";
  //find the highest-value line item
  const sorted = [...order.line_items].sort(
    (a, b) => parseFloat(b.price) * b.quantity - parseFloat(a.price) * a.quantity
  );
  const top = sorted[0];
  if (top.product_id && productMap.has(top.product_id)) {
    return productMap.get(top.product_id)!.title;
  }
  return top.title;
}

function col(
  name: string,
  key: string,
  type: Column["type"],
  values: unknown[]
): Column {
  const nonNull = values.filter((v) => v != null && v !== "");
  return {
    name: key,
    originalName: name,
    type,
    sampleValues: nonNull.slice(0, 5),
    nullCount: values.length - nonNull.length,
  };
}
