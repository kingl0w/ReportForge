import { z } from "zod/v4";

/**validates the query params eBay sends to the OAuth callback*/
export const ebayCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

/**validates a manual sync request body*/
export const ebaySyncRequestSchema = z.object({
  connectionId: z.string().uuid(),
  dataTypes: z
    .array(z.enum(["orders", "listings", "payouts", "performance"]))
    .optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**validates the DELETE body to disconnect an eBay account*/
export const ebayDisconnectSchema = z.object({
  connectionId: z.string().uuid(),
});
