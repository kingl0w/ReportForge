/**eBay API response types*/

export interface EbayLineItem {
  lineItemId: string;
  title: string;
  quantity: number;
  lineItemCost: EbayAmount;
  deliveryCost: EbayAmount;
  lineItemFulfillmentStatus: string;
  /**legacy item ID*/
  legacyItemId: string;
  sku?: string;
}

export interface EbayAmount {
  value: string;
  currency: string;
}

export interface EbayBuyer {
  username: string;
}

export interface EbayPricingSummary {
  priceSubtotal: EbayAmount;
  deliveryCost: EbayAmount;
  tax: EbayAmount;
  total: EbayAmount;
}

export interface EbayPaymentSummary {
  totalDueSeller: EbayAmount;
  payments: {
    paymentMethod: string;
    paymentStatus: string;
    amount: EbayAmount;
  }[];
}

export interface EbayFulfillmentStartInstruction {
  shippingStep?: {
    shipTo?: {
      fullName: string;
      contactAddress?: {
        countryCode: string;
        stateOrProvince?: string;
      };
    };
  };
}

export interface EbayOrder {
  orderId: string;
  creationDate: string;
  lastModifiedDate: string;
  orderFulfillmentStatus: string;
  orderPaymentStatus: string;
  pricingSummary: EbayPricingSummary;
  paymentSummary: EbayPaymentSummary;
  buyer: EbayBuyer;
  lineItems: EbayLineItem[];
  fulfillmentStartInstructions?: EbayFulfillmentStartInstruction[];
  cancelStatus?: { cancelState: string };
  salesRecordReference?: string;
}

export interface EbayOrdersResponse {
  href: string;
  total: number;
  limit: number;
  offset: number;
  orders: EbayOrder[];
  next?: string;
}

export interface EbayItemSummary {
  itemId: string;
  title: string;
  price: EbayAmount;
  condition: string;
  categoryPath: string;
  categoryId: string;
  image?: { imageUrl: string };
  itemLocation?: { country: string; postalCode?: string };
  seller: { username: string; feedbackPercentage: string; feedbackScore: number };
  buyingOptions: string[];
  currentBidPrice?: EbayAmount;
  quantityAvailable?: number;
  quantitySold?: number;
  itemCreationDate?: string;
}

export interface EbaySearchResponse {
  href: string;
  total: number;
  limit: number;
  offset: number;
  itemSummaries?: EbayItemSummary[];
  next?: string;
}

export interface EbayPayout {
  payoutId: string;
  payoutStatus: string;
  payoutDate: string;
  amount: EbayAmount;
  payoutMemo?: string;
  transactionCount: number;
}

export interface EbayPayoutsResponse {
  href: string;
  total: number;
  limit: number;
  offset: number;
  payouts: EbayPayout[];
  next?: string;
}

export interface EbayTransaction {
  transactionId: string;
  transactionType: string;
  transactionDate: string;
  transactionStatus: string;
  amount: EbayAmount;
  totalFeeBasisAmount?: EbayAmount;
  totalFeeAmount?: EbayAmount;
  orderId?: string;
  orderLineItems?: { lineItemId: string; title: string }[];
  payin?: { payinDate: string };
}

export interface EbayTransactionsResponse {
  href: string;
  total: number;
  limit: number;
  offset: number;
  transactions: EbayTransaction[];
  next?: string;
}

export interface EbayTrafficReport {
  header: { dimensionKeys: string[]; metricKeys: string[] };
  records: EbayTrafficRecord[];
}

export interface EbayTrafficRecord {
  dimensionValues: { value: string }[];
  metricValues: { value: string; applicability?: string }[];
}

export interface EbayConnectionConfig {
  /**default: EBAY_US*/
  marketplace: string;
  /**for display only*/
  username: string;
}

export interface EbayCredentials {
  accessToken: string;
  refreshToken: string;
  /**ISO 8601*/
  accessTokenExpiry: string;
  /**ISO 8601*/
  refreshTokenExpiry: string;
}

export interface EbayOAuthState {
  state: string;
  userId: string;
}

export interface EbayTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token: string;
  refresh_token_expires_in: number;
}
