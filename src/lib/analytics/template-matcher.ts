import type { DataProfile } from "@/types/report";

export type TemplateId =
  | "sales-report"
  | "social-media"
  | "crypto-wallet"
  | "ecommerce"
  | "analytics"
  | "financial"
  | "shopify-sales"
  | "shopify-products"
  | "shopify-customers"
  | "ebay-sales"
  | "ebay-listings"
  | "ebay-financial"
  | "custom";

interface TemplateRule {
  id: TemplateId;
  /**column name patterns (case-insensitive substrings)*/
  patterns: string[];
  /**minimum number of pattern matches to qualify*/
  minMatches: number;
}

const TEMPLATE_RULES: TemplateRule[] = [
  //Shopify-specific templates -- higher priority than generic ecommerce
  {
    id: "shopify-sales",
    patterns: [
      "order_id",
      "total",
      "fulfillment",
      "financial_status",
      "shopify",
      "items_count",
      "top_product",
      "tax",
    ],
    minMatches: 3,
  },
  {
    id: "shopify-products",
    patterns: [
      "vendor",
      "product_type",
      "variants",
      "price_min",
      "price_max",
      "total_inventory",
      "inventory",
    ],
    minMatches: 3,
  },
  {
    id: "shopify-customers",
    patterns: [
      "orders_count",
      "total_spent",
      "segment",
      "spending_tier",
      "lifetime_value",
      "customer_id",
    ],
    minMatches: 3,
  },
  //eBay-specific templates
  {
    id: "ebay-sales",
    patterns: [
      "ebay_fees",
      "top_item",
      "order_id",
      "fulfillment",
      "buyer",
      "net",
    ],
    minMatches: 3,
  },
  {
    id: "ebay-listings",
    patterns: [
      "item_id",
      "quantity_sold",
      "quantity_available",
      "condition",
      "category_path",
      "category",
      "format",
    ],
    minMatches: 3,
  },
  {
    id: "ebay-financial",
    patterns: [
      "transaction_id",
      "fees",
      "gross",
      "payout_id",
      "transaction_count",
      "ebay_fees",
    ],
    minMatches: 3,
  },
  {
    id: "sales-report",
    patterns: [
      "revenue",
      "sales",
      "orders",
      "aov",
      "arpu",
      "mrr",
      "arr",
      "deal",
      "pipeline",
      "quota",
      "commission",
      "close_rate",
      "win_rate",
    ],
    minMatches: 2,
  },
  {
    id: "social-media",
    patterns: [
      "followers",
      "likes",
      "shares",
      "engagement",
      "impressions",
      "reach",
      "retweet",
      "comments",
      "views",
      "subscribers",
      "post",
      "story",
      "reel",
      "tiktok",
      "instagram",
      "twitter",
      "youtube",
    ],
    minMatches: 2,
  },
  {
    id: "crypto-wallet",
    patterns: [
      "token",
      "wallet",
      "gas",
      "tx_hash",
      "transaction_hash",
      "block",
      "chain",
      "swap",
      "defi",
      "nft",
      "eth",
      "btc",
      "sol",
      "wei",
      "gwei",
      "staking",
      "yield",
      "liquidity",
    ],
    minMatches: 2,
  },
  {
    id: "ecommerce",
    patterns: [
      "product",
      "sku",
      "inventory",
      "shipping",
      "cart",
      "checkout",
      "fulfillment",
      "return",
      "refund",
      "category",
      "variant",
      "shopify",
      "woocommerce",
      "quantity",
      "unit_price",
    ],
    minMatches: 2,
  },
  {
    id: "analytics",
    patterns: [
      "sessions",
      "pageviews",
      "page_views",
      "bounce_rate",
      "bounce",
      "referrer",
      "utm",
      "source",
      "medium",
      "campaign",
      "conversion",
      "funnel",
      "exit_rate",
      "time_on_page",
      "unique_visitors",
    ],
    minMatches: 2,
  },
  {
    id: "financial",
    patterns: [
      "balance",
      "debit",
      "credit",
      "account",
      "ledger",
      "journal",
      "invoice",
      "payment",
      "receivable",
      "payable",
      "asset",
      "liability",
      "equity",
      "expense",
      "income",
      "profit",
      "loss",
    ],
    minMatches: 2,
  },
];

/**fuzzy matching -- checks if any column name contains the pattern.*/
export function matchTemplate(profile: DataProfile): TemplateId {
  const allColumns = [
    ...profile.numericColumns,
    ...profile.categoricalColumns,
    ...profile.dateColumns,
    ...profile.currencyColumns,
    ...profile.percentageColumns,
  ].map((c) => c.toLowerCase());

  let bestTemplate: TemplateId = "custom";
  let bestScore = 0;

  for (const rule of TEMPLATE_RULES) {
    let matches = 0;
    for (const pattern of rule.patterns) {
      if (allColumns.some((col) => col.includes(pattern))) {
        matches++;
      }
    }

    if (matches >= rule.minMatches && matches > bestScore) {
      bestScore = matches;
      bestTemplate = rule.id;
    }
  }

  //single-match fallback on high-confidence keywords (first 3 per rule)
  if (bestScore === 0) {
    for (const rule of TEMPLATE_RULES) {
      for (const pattern of rule.patterns.slice(0, 3)) {
        if (allColumns.some((col) => col.includes(pattern))) {
          return rule.id;
        }
      }
    }
  }

  return bestTemplate;
}
