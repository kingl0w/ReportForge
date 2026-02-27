import { randomBytes } from "node:crypto";
import type { EbayTokenResponse } from "./types";

const EBAY_SCOPES = [
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.analytics.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.finances.readonly",
  "https://api.ebay.com/oauth/api_scope/sell.inventory.readonly",
].join(" ");

function getClientId(): string {
  const id = process.env.EBAY_CLIENT_ID;
  if (!id) throw new Error("EBAY_CLIENT_ID is not set");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.EBAY_CLIENT_SECRET;
  if (!secret) throw new Error("EBAY_CLIENT_SECRET is not set");
  return secret;
}

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/connections/ebay/callback`;
}

/**use sandbox or production endpoints based on env*/
function isSandbox(): boolean {
  return process.env.EBAY_SANDBOX === "true";
}

function getAuthBaseUrl(): string {
  return isSandbox()
    ? "https://auth.sandbox.ebay.com"
    : "https://auth.ebay.com";
}

function getApiBaseUrl(): string {
  return isSandbox()
    ? "https://api.sandbox.ebay.com"
    : "https://api.ebay.com";
}

/**CSRF protection nonce for OAuth state parameter*/
export function generateNonce(): string {
  return randomBytes(16).toString("hex");
}

/**uses the Authorization Code Grant flow*/
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    response_type: "code",
    redirect_uri: getRedirectUri(),
    scope: EBAY_SCOPES,
    state,
  });
  return `${getAuthBaseUrl()}/oauth2/authorize?${params.toString()}`;
}

/**Base64-encoded Basic auth header required by eBay token endpoint*/
function basicAuthHeader(): string {
  const credentials = `${getClientId()}:${getClientSecret()}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<EbayTokenResponse> {
  const response = await fetch(
    `${getApiBaseUrl()}/identity/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: basicAuthHeader(),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: getRedirectUri(),
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`eBay token exchange failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as EbayTokenResponse;
  if (!data.access_token || !data.refresh_token) {
    throw new Error("eBay token exchange returned incomplete tokens");
  }

  return data;
}

/**eBay access tokens expire every 2 hours*/
export async function refreshAccessToken(
  refreshToken: string
): Promise<EbayTokenResponse> {
  const response = await fetch(
    `${getApiBaseUrl()}/identity/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: basicAuthHeader(),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: EBAY_SCOPES,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`eBay token refresh failed (${response.status}): ${text}`);
  }

  return (await response.json()) as EbayTokenResponse;
}

export { EBAY_SCOPES, getApiBaseUrl };
