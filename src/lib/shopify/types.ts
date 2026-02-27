/**Shopify Admin REST API response types*/

export interface ShopifyLineItem {
  id: number;
  title: string;
  quantity: number;
  price: string;
  sku: string | null;
  product_id: number | null;
}

export interface ShopifyCustomerRef {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export interface ShopifyOrder {
  id: number;
  name: string;
  created_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  financial_status: string;
  fulfillment_status: string | null;
  line_items: ShopifyLineItem[];
  customer: ShopifyCustomerRef | null;
  currency: string;
  order_number: number;
}

export interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  sku: string | null;
  inventory_quantity: number;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  vendor: string;
  product_type: string;
  status: string;
  created_at: string;
  variants: ShopifyVariant[];
}

export interface ShopifyCustomer {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  orders_count: number;
  total_spent: string;
  created_at: string;
}

/**config stored in DataConnection.config JSON column*/
export interface ShopifyConnectionConfig {
  shop: string;
  scopes: string;
  apiVersion: string;
}

/**credentials stored encrypted in DataConnection.credentials JSON column*/
export interface ShopifyCredentials {
  accessToken: string;
}

/**OAuth state stored in cookie during the auth flow*/
export interface ShopifyOAuthState {
  state: string;
  shop: string;
  userId: string;
}
