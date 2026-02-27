import type {
  EbayOrder,
  EbayOrdersResponse,
  EbayItemSummary,
  EbaySearchResponse,
  EbayPayout,
  EbayPayoutsResponse,
  EbayTransaction,
  EbayTransactionsResponse,
  EbayCredentials,
} from "./types";
import { refreshAccessToken, getApiBaseUrl } from "./oauth";
import { encrypt, decrypt } from "@/lib/crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_LIMIT = 200;
const MAX_PAGES = 10;
/**delay between paginated requests to respect eBay rate limits*/
const RATE_LIMIT_DELAY_MS = 200;
const DEFAULT_MARKETPLACE = "EBAY_US";

export class EbayClient {
  private accessToken: string;
  private readonly refreshToken: string;
  private accessTokenExpiry: Date;
  private readonly marketplace: string;
  private readonly connectionId: string;

  constructor(
    credentials: EbayCredentials,
    connectionId: string,
    marketplace?: string
  ) {
    this.accessToken = credentials.accessToken;
    this.refreshToken = credentials.refreshToken;
    this.accessTokenExpiry = new Date(credentials.accessTokenExpiry);
    this.marketplace = marketplace ?? DEFAULT_MARKETPLACE;
    this.connectionId = connectionId;
  }

  static fromEncrypted(
    encryptedCredentials: EbayCredentials,
    connectionId: string,
    marketplace?: string
  ): EbayClient {
    return new EbayClient(
      {
        accessToken: decrypt(encryptedCredentials.accessToken),
        refreshToken: decrypt(encryptedCredentials.refreshToken),
        accessTokenExpiry: encryptedCredentials.accessTokenExpiry,
        refreshTokenExpiry: encryptedCredentials.refreshTokenExpiry,
      },
      connectionId,
      marketplace
    );
  }

  private async ensureValidToken(): Promise<void> {
    //refresh if token expires in less than 5 minutes
    const buffer = 5 * 60 * 1000;
    if (Date.now() + buffer < this.accessTokenExpiry.getTime()) {
      return;
    }

    const tokenResponse = await refreshAccessToken(this.refreshToken);
    this.accessToken = tokenResponse.access_token;
    this.accessTokenExpiry = new Date(
      Date.now() + tokenResponse.expires_in * 1000
    );

    const admin = createAdminClient();
    const encryptedAccess = encrypt(tokenResponse.access_token);
    await admin
      .from("DataConnection")
      .update({
        credentials: {
          accessToken: encryptedAccess,
          refreshToken: encrypt(this.refreshToken),
          accessTokenExpiry: this.accessTokenExpiry.toISOString(),
          refreshTokenExpiry: new Date(
            Date.now() + tokenResponse.refresh_token_expires_in * 1000
          ).toISOString(),
        },
      })
      .eq("id", this.connectionId);
  }

  private async authHeaders(): Promise<Record<string, string>> {
    await this.ensureValidToken();
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      "X-EBAY-C-MARKETPLACE-ID": this.marketplace,
    };
  }

  async fetchOrders(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<EbayOrder[]> {
    const filterParts: string[] = [];
    if (params?.startDate) {
      filterParts.push(`creationdate:[${params.startDate}..`);
      if (params.endDate) {
        //replace the open range with a closed one
        filterParts[filterParts.length - 1] =
          `creationdate:[${params.startDate}..${params.endDate}]`;
      } else {
        filterParts[filterParts.length - 1] += "]";
      }
    } else if (params?.endDate) {
      filterParts.push(`creationdate:[..${params.endDate}]`);
    }

    const baseParams = new URLSearchParams({
      limit: String(PAGE_LIMIT),
    });
    if (filterParts.length > 0) {
      baseParams.set("filter", filterParts.join(","));
    }

    const baseUrl = `${getApiBaseUrl()}/sell/fulfillment/v1/order`;
    return this.fetchAllPagesOffset<EbayOrder, EbayOrdersResponse>(
      baseUrl,
      baseParams,
      "orders"
    );
  }

  //falls back to searching by seller username
  async fetchListings(params?: {
    status?: string;
  }): Promise<EbayItemSummary[]> {
    const searchParams = new URLSearchParams({
      limit: String(PAGE_LIMIT),
      //Browse API returns items the logged-in user is selling
      q: "",
      filter: params?.status
        ? `buyingOptions:{${params.status}}`
        : "buyingOptions:{FIXED_PRICE|AUCTION}",
    });

    const baseUrl = `${getApiBaseUrl()}/buy/browse/v1/item_summary/search`;
    return this.fetchAllPagesOffset<EbayItemSummary, EbaySearchResponse>(
      baseUrl,
      searchParams,
      "itemSummaries"
    );
  }

  async fetchPayouts(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<EbayPayout[]> {
    const filterParts: string[] = [];
    if (params?.startDate) {
      const end = params.endDate ?? new Date().toISOString();
      filterParts.push(
        `payoutDate:[${params.startDate}..${end}]`
      );
    }

    const baseParams = new URLSearchParams({
      limit: String(PAGE_LIMIT),
      sort: "payoutDate",
    });
    if (filterParts.length > 0) {
      baseParams.set("filter", filterParts.join(","));
    }

    const baseUrl = `${getApiBaseUrl()}/sell/finances/v1/payout`;
    return this.fetchAllPagesOffset<EbayPayout, EbayPayoutsResponse>(
      baseUrl,
      baseParams,
      "payouts"
    );
  }

  async fetchTransactions(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<EbayTransaction[]> {
    const filterParts: string[] = [];
    if (params?.startDate) {
      const end = params.endDate ?? new Date().toISOString();
      filterParts.push(
        `transactionDate:[${params.startDate}..${end}]`
      );
    }
    filterParts.push("transactionType:{SALE,SHIPPING_LABEL,NON_SALE_CHARGE}");

    const baseParams = new URLSearchParams({
      limit: String(PAGE_LIMIT),
    });
    baseParams.set("filter", filterParts.join(","));

    const baseUrl = `${getApiBaseUrl()}/sell/finances/v1/transaction`;
    return this.fetchAllPagesOffset<EbayTransaction, EbayTransactionsResponse>(
      baseUrl,
      baseParams,
      "transactions"
    );
  }

  async fetchSalesOverview(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    orders: EbayOrder[];
    transactions: EbayTransaction[];
  }> {
    const [orders, transactions] = await Promise.all([
      this.fetchOrders(params),
      this.fetchTransactions(params),
    ]);
    return { orders, transactions };
  }

  private async fetchAllPagesOffset<T, R extends { total: number }>(
    baseUrl: string,
    params: URLSearchParams,
    resourceKey: string
  ): Promise<T[]> {
    const results: T[] = [];
    let offset = 0;
    let page = 0;
    let retries = 0;
    const MAX_RETRIES = 3;

    while (page < MAX_PAGES) {
      params.set("offset", String(offset));
      const url = `${baseUrl}?${params.toString()}`;
      const headers = await this.authHeaders();

      const response = await fetch(url, { headers });

      if (!response.ok) {
        if (response.status === 429) {
          retries++;
          if (retries > MAX_RETRIES) {
            throw new Error("eBay API rate limit exceeded after multiple retries");
          }
          const retryAfter = response.headers.get("Retry-After");
          const delayMs = retryAfter
            ? parseFloat(retryAfter) * 1000
            : RATE_LIMIT_DELAY_MS * 5;
          await sleep(delayMs);
          continue;
        }

        throw new Error(
          `eBay API error (${response.status}): ${await response.text()}`
        );
      }

      const data = (await response.json()) as R & Record<string, unknown>;
      const items = data[resourceKey] as T[] | undefined;

      if (!items || items.length === 0) break;
      results.push(...items);

      offset += items.length;
      if (offset >= data.total) break;

      page++;

      if (page < MAX_PAGES) {
        await sleep(RATE_LIMIT_DELAY_MS);
      }
    }

    return results;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
