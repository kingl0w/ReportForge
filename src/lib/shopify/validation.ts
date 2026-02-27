import { z } from "zod/v4";

/**validates a Shopify store domain (e.g. mystore.myshopify.com)*/
export const shopDomainSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/,
    "Must be a valid *.myshopify.com domain"
  );

/**validates the query params Shopify sends to the OAuth callback*/
export const shopifyCallbackSchema = z.object({
  code: z.string().min(1),
  hmac: z.string().min(1),
  shop: shopDomainSchema,
  state: z.string().min(1),
  timestamp: z.string().min(1),
});

/**validates a manual sync request body*/
export const syncRequestSchema = z.object({
  connectionId: z.string().uuid(),
  dataTypes: z
    .array(z.enum(["orders", "products", "customers"]))
    .optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**validates the POST body to initiate Shopify OAuth*/
export const shopifyConnectSchema = z.object({
  shop: shopDomainSchema,
});

/**validates the DELETE body to disconnect a Shopify store*/
export const shopifyDisconnectSchema = z.object({
  connectionId: z.string().uuid(),
});
