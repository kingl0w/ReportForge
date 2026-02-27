/**each provider (Shopify, eBay, future Amazon/Etsy) maps their
 * API responses to these common interfaces so report templates
 * can work with any provider's normalized data.*/

export interface EcommerceOrder {
  orderId: string;
  /**ISO 8601 date string*/
  orderDate: string;
  total: number;
  /**currency code (USD, EUR, etc.)*/
  currency: string;
  status: string;
  fulfillmentStatus: string;
  itemCount: number;
  /**anonymized if needed*/
  buyerLabel: string;
  topItemName: string;
  /**eBay fees, Shopify payments fees, etc.*/
  platformFees: number;
  shippingCost: number;
  tax: number;
  /**after fees and shipping*/
  netAmount: number;
}

export interface EcommerceProduct {
  productId: string;
  title: string;
  category: string;
  /**active, ended, sold, draft, etc.*/
  status: string;
  price: number;
  currency: string;
  quantity: number;
  totalSold: number;
  /**ISO 8601*/
  createdAt: string;
  /**vendor/brand (Shopify) or seller store name*/
  vendor: string;
}

/**all customer data is anonymized*/
export interface EcommerceCustomer {
  customerId: string;
  orderCount: number;
  totalSpent: number;
  currency: string;
  segment: "new" | "returning";
  /**based on quartiles*/
  spendingTier: "low" | "medium" | "high";
  /**ISO 8601*/
  firstOrderDate: string;
}

export interface EcommerceSalesMetric {
  /**ISO 8601, day granularity*/
  date: string;
  grossRevenue: number;
  fees: number;
  netRevenue: number;
  orderCount: number;
  itemsSold: number;
  averageOrderValue: number;
}

export type EcommerceProvider = "shopify" | "ebay";

export interface EcommerceDataBundle {
  provider: EcommerceProvider;
  storeName: string;
  orders: EcommerceOrder[];
  products: EcommerceProduct[];
  customers: EcommerceCustomer[];
  salesMetrics: EcommerceSalesMetric[];
}
