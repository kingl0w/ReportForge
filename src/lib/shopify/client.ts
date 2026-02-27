import type {
  ShopifyOrder,
  ShopifyProduct,
  ShopifyCustomer,
} from "./types";

const API_VERSION = "2024-10";
const MAX_PAGES = 10;
const PAGE_LIMIT = 250;

/**delay in ms between paginated requests to stay under Shopify's 2 req/sec limit*/
const RATE_LIMIT_DELAY_MS = 550;
/**when the bucket has fewer than this many calls remaining, add extra delay*/
const RATE_LIMIT_THRESHOLD = 4;

/*Shopify Admin REST API client.
 * Handles paginated requests with cursor-based pagination via Link headers.
 * Includes rate limiting to respect Shopify's 2 req/sec / bucket-of-40 limit.*/
export class ShopifyClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(shop: string, accessToken: string) {
    this.baseUrl = `https://${shop}/admin/api/${API_VERSION}`;
    this.headers = {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    };
  }

  async fetchOrders(params?: {
    created_at_min?: string;
    created_at_max?: string;
    limit?: number;
  }): Promise<ShopifyOrder[]> {
    const searchParams = new URLSearchParams({
      limit: String(params?.limit ?? PAGE_LIMIT),
      status: "any",
    });
    if (params?.created_at_min) {
      searchParams.set("created_at_min", params.created_at_min);
    }
    if (params?.created_at_max) {
      searchParams.set("created_at_max", params.created_at_max);
    }

    const url = `${this.baseUrl}/orders.json?${searchParams.toString()}`;
    return this.fetchAllPages<ShopifyOrder>(url, "orders");
  }

  async fetchProducts(params?: {
    limit?: number;
  }): Promise<ShopifyProduct[]> {
    const searchParams = new URLSearchParams({
      limit: String(params?.limit ?? PAGE_LIMIT),
    });

    const url = `${this.baseUrl}/products.json?${searchParams.toString()}`;
    return this.fetchAllPages<ShopifyProduct>(url, "products");
  }

  async fetchCustomers(params?: {
    limit?: number;
  }): Promise<ShopifyCustomer[]> {
    const searchParams = new URLSearchParams({
      limit: String(params?.limit ?? PAGE_LIMIT),
    });

    const url = `${this.baseUrl}/customers.json?${searchParams.toString()}`;
    return this.fetchAllPages<ShopifyCustomer>(url, "customers");
  }

  /**convenience method used by the sync route*/
  async fetchSalesOverview(params?: {
    created_at_min?: string;
    created_at_max?: string;
  }): Promise<{ orders: ShopifyOrder[]; products: ShopifyProduct[] }> {
    const [orders, products] = await Promise.all([
      this.fetchOrders({
        created_at_min: params?.created_at_min,
        created_at_max: params?.created_at_max,
      }),
      this.fetchProducts(),
    ]);
    return { orders, products };
  }

  /*safety cap: MAX_PAGES pages (PAGE_LIMIT * MAX_PAGES items max).
   * Includes rate limiting to avoid hitting Shopify's API throttle.*/
  private async fetchAllPages<T>(
    initialUrl: string,
    resourceKey: string
  ): Promise<T[]> {
    const results: T[] = [];
    let url: string | null = initialUrl;
    let page = 0;
    let retries = 0;
    const MAX_RETRIES = 3;

    while (url && page < MAX_PAGES) {
      const response = await fetch(url, { headers: this.headers });

      if (!response.ok) {
        //handle 429 Too Many Requests with Retry-After
        if (response.status === 429) {
          retries++;
          if (retries > MAX_RETRIES) {
            throw new Error("Shopify API rate limit exceeded after multiple retries");
          }
          const retryAfter = response.headers.get("Retry-After");
          const delayMs = retryAfter
            ? parseFloat(retryAfter) * 1000
            : RATE_LIMIT_DELAY_MS * 2;
          await sleep(delayMs);
          continue;
        }

        throw new Error(
          `Shopify API error (${response.status}): ${await response.text()}`
        );
      }

      const data = (await response.json()) as Record<string, T[]>;
      const items = data[resourceKey];
      if (!items || items.length === 0) break;

      results.push(...items);
      url = this.parseNextLink(response.headers.get("link"));
      page++;

      //rate limiting: if there's a next page, delay before fetching
      if (url) {
        const callLimit = response.headers.get(
          "X-Shopify-Shop-Api-Call-Limit"
        );
        const delay = this.calculateDelay(callLimit);
        if (delay > 0) {
          await sleep(delay);
        }
      }
    }

    return results;
  }

  /**header format: "32/40" (used/available)*/
  private calculateDelay(callLimitHeader: string | null): number {
    if (!callLimitHeader) return RATE_LIMIT_DELAY_MS;

    const parts = callLimitHeader.split("/");
    if (parts.length !== 2) return RATE_LIMIT_DELAY_MS;

    const used = parseInt(parts[0], 10);
    const max = parseInt(parts[1], 10);
    if (isNaN(used) || isNaN(max)) return RATE_LIMIT_DELAY_MS;

    const remaining = max - used;
    if (remaining <= RATE_LIMIT_THRESHOLD) {
      //near capacity — add extra delay
      return RATE_LIMIT_DELAY_MS * 2;
    }

    return RATE_LIMIT_DELAY_MS;
  }

  /**format: `<url>; rel="next"`, optionally with a `previous` link too*/
  private parseNextLink(linkHeader: string | null): string | null {
    if (!linkHeader) return null;

    const parts = linkHeader.split(",");
    for (const part of parts) {
      const match = part.match(/<([^>]+)>;\s*rel="next"/);
      if (match) return match[1];
    }
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
