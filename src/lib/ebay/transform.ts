import type { DataSet, Column } from "@/types/data";
import type {
  EbayOrder,
  EbayItemSummary,
  EbayPayout,
  EbayTransaction,
} from "./types";

export function transformOrders(
  orders: EbayOrder[],
  storeName: string
): DataSet {
  const columns: Column[] = [
    col("Order ID", "order_id", "string", orders.map((o) => o.orderId)),
    col("Date", "date", "date", orders.map((o) => o.creationDate)),
    col("Buyer", "buyer", "string", orders.map((o) => o.buyer.username)),
    col("Total", "total", "currency", orders.map((o) => parseAmount(o.pricingSummary.total))),
    col("Subtotal", "subtotal", "currency", orders.map((o) => parseAmount(o.pricingSummary.priceSubtotal))),
    col("Shipping", "shipping", "currency", orders.map((o) => parseAmount(o.pricingSummary.deliveryCost))),
    col("Tax", "tax", "currency", orders.map((o) => parseAmount(o.pricingSummary.tax))),
    col("Status", "status", "string", orders.map((o) => o.orderPaymentStatus)),
    col("Fulfillment", "fulfillment", "string", orders.map((o) => o.orderFulfillmentStatus)),
    col("Items Count", "items_count", "number", orders.map((o) => o.lineItems.length)),
    col("Top Item", "top_item", "string", orders.map((o) => topLineItem(o))),
  ];

  const rows = orders.map((o) => ({
    order_id: o.orderId,
    date: o.creationDate,
    buyer: o.buyer.username,
    total: parseAmount(o.pricingSummary.total),
    subtotal: parseAmount(o.pricingSummary.priceSubtotal),
    shipping: parseAmount(o.pricingSummary.deliveryCost),
    tax: parseAmount(o.pricingSummary.tax),
    status: o.orderPaymentStatus,
    fulfillment: o.orderFulfillmentStatus,
    items_count: o.lineItems.length,
    top_item: topLineItem(o),
  }));

  return {
    columns,
    rows,
    rowCount: rows.length,
    metadata: {
      source: `ebay:${storeName}`,
      fileSize: 0,
      fileType: "ebay",
      parseWarnings: [],
    },
  };
}

export function transformListings(
  items: EbayItemSummary[],
  storeName: string
): DataSet {
  const columns: Column[] = [
    col("Item ID", "item_id", "string", items.map((i) => i.itemId)),
    col("Title", "title", "string", items.map((i) => i.title)),
    col("Price", "price", "currency", items.map((i) => parseAmount(i.price))),
    col("Condition", "condition", "string", items.map((i) => i.condition)),
    col("Category", "category", "string", items.map((i) => lastCategory(i.categoryPath))),
    col("Category Path", "category_path", "string", items.map((i) => i.categoryPath)),
    col("Available", "quantity_available", "number", items.map((i) => i.quantityAvailable ?? 0)),
    col("Sold", "quantity_sold", "number", items.map((i) => i.quantitySold ?? 0)),
    col("Format", "format", "string", items.map((i) => i.buyingOptions.join(", "))),
  ];

  const rows = items.map((i) => ({
    item_id: i.itemId,
    title: i.title,
    price: parseAmount(i.price),
    condition: i.condition,
    category: lastCategory(i.categoryPath),
    category_path: i.categoryPath,
    quantity_available: i.quantityAvailable ?? 0,
    quantity_sold: i.quantitySold ?? 0,
    format: i.buyingOptions.join(", "),
  }));

  return {
    columns,
    rows,
    rowCount: rows.length,
    metadata: {
      source: `ebay:${storeName}`,
      fileSize: 0,
      fileType: "ebay",
      parseWarnings: [],
    },
  };
}

export function transformTransactions(
  transactions: EbayTransaction[],
  storeName: string
): DataSet {
  const columns: Column[] = [
    col("Transaction ID", "transaction_id", "string", transactions.map((t) => t.transactionId)),
    col("Date", "date", "date", transactions.map((t) => t.transactionDate)),
    col("Type", "type", "string", transactions.map((t) => t.transactionType)),
    col("Status", "status", "string", transactions.map((t) => t.transactionStatus)),
    col("Amount", "amount", "currency", transactions.map((t) => parseAmount(t.amount))),
    col("Fees", "fees", "currency", transactions.map((t) => parseAmount(t.totalFeeAmount))),
    col("Gross", "gross", "currency", transactions.map((t) => parseAmount(t.totalFeeBasisAmount))),
    col("Order ID", "order_id", "string", transactions.map((t) => t.orderId ?? "")),
    col("Item", "item_title", "string", transactions.map((t) => t.orderLineItems?.[0]?.title ?? "")),
  ];

  const rows = transactions.map((t) => ({
    transaction_id: t.transactionId,
    date: t.transactionDate,
    type: t.transactionType,
    status: t.transactionStatus,
    amount: parseAmount(t.amount),
    fees: parseAmount(t.totalFeeAmount),
    gross: parseAmount(t.totalFeeBasisAmount),
    order_id: t.orderId ?? "",
    item_title: t.orderLineItems?.[0]?.title ?? "",
  }));

  return {
    columns,
    rows,
    rowCount: rows.length,
    metadata: {
      source: `ebay:${storeName}`,
      fileSize: 0,
      fileType: "ebay",
      parseWarnings: [],
    },
  };
}

export function transformPayouts(
  payouts: EbayPayout[],
  storeName: string
): DataSet {
  const columns: Column[] = [
    col("Payout ID", "payout_id", "string", payouts.map((p) => p.payoutId)),
    col("Date", "date", "date", payouts.map((p) => p.payoutDate)),
    col("Amount", "amount", "currency", payouts.map((p) => parseAmount(p.amount))),
    col("Status", "status", "string", payouts.map((p) => p.payoutStatus)),
    col("Transactions", "transaction_count", "number", payouts.map((p) => p.transactionCount)),
  ];

  const rows = payouts.map((p) => ({
    payout_id: p.payoutId,
    date: p.payoutDate,
    amount: parseAmount(p.amount),
    status: p.payoutStatus,
    transaction_count: p.transactionCount,
  }));

  return {
    columns,
    rows,
    rowCount: rows.length,
    metadata: {
      source: `ebay:${storeName}`,
      fileSize: 0,
      fileType: "ebay",
      parseWarnings: [],
    },
  };
}

/**merges order data with fee data from transactions*/
export function transformAllData(
  orders: EbayOrder[],
  transactions: EbayTransaction[],
  storeName: string
): DataSet {
  const feesByOrder = new Map<string, number>();
  for (const t of transactions) {
    if (t.orderId && t.totalFeeAmount) {
      const current = feesByOrder.get(t.orderId) ?? 0;
      feesByOrder.set(t.orderId, current + parseAmount(t.totalFeeAmount));
    }
  }

  const columns: Column[] = [
    col("Order ID", "order_id", "string", orders.map((o) => o.orderId)),
    col("Date", "date", "date", orders.map((o) => o.creationDate)),
    col("Buyer", "buyer", "string", orders.map((o) => o.buyer.username)),
    col("Total", "total", "currency", orders.map((o) => parseAmount(o.pricingSummary.total))),
    col("Shipping", "shipping", "currency", orders.map((o) => parseAmount(o.pricingSummary.deliveryCost))),
    col("Tax", "tax", "currency", orders.map((o) => parseAmount(o.pricingSummary.tax))),
    col("eBay Fees", "ebay_fees", "currency", orders.map((o) => feesByOrder.get(o.orderId) ?? 0)),
    col("Net", "net", "currency", orders.map((o) => {
      const total = parseAmount(o.pricingSummary.total);
      const fees = feesByOrder.get(o.orderId) ?? 0;
      return Math.round((total - fees) * 100) / 100;
    })),
    col("Status", "status", "string", orders.map((o) => o.orderPaymentStatus)),
    col("Fulfillment", "fulfillment", "string", orders.map((o) => o.orderFulfillmentStatus)),
    col("Items Count", "items_count", "number", orders.map((o) => o.lineItems.length)),
    col("Top Item", "top_item", "string", orders.map((o) => topLineItem(o))),
  ];

  const rows = orders.map((o) => {
    const total = parseAmount(o.pricingSummary.total);
    const fees = feesByOrder.get(o.orderId) ?? 0;
    return {
      order_id: o.orderId,
      date: o.creationDate,
      buyer: o.buyer.username,
      total,
      shipping: parseAmount(o.pricingSummary.deliveryCost),
      tax: parseAmount(o.pricingSummary.tax),
      ebay_fees: fees,
      net: Math.round((total - fees) * 100) / 100,
      status: o.orderPaymentStatus,
      fulfillment: o.orderFulfillmentStatus,
      items_count: o.lineItems.length,
      top_item: topLineItem(o),
    };
  });

  return {
    columns,
    rows,
    rowCount: rows.length,
    metadata: {
      source: `ebay:${storeName}`,
      fileSize: 0,
      fileType: "ebay",
      parseWarnings: [],
    },
  };
}

function parseAmount(amount: { value: string } | undefined | null): number {
  if (!amount?.value) return 0;
  const num = parseFloat(amount.value);
  return isNaN(num) ? 0 : num;
}

function topLineItem(order: EbayOrder): string {
  if (order.lineItems.length === 0) return "N/A";
  const sorted = [...order.lineItems].sort(
    (a, b) =>
      parseAmount(b.lineItemCost) * b.quantity -
      parseAmount(a.lineItemCost) * a.quantity
  );
  return sorted[0].title;
}

function lastCategory(categoryPath: string): string {
  const parts = categoryPath.split("|");
  return parts[parts.length - 1]?.trim() || categoryPath;
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
