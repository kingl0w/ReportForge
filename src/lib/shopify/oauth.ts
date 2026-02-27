import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";

const SHOPIFY_SCOPES = "read_orders,read_products,read_customers";

function getClientId(): string {
  const id = process.env.SHOPIFY_CLIENT_ID;
  if (!id) throw new Error("SHOPIFY_CLIENT_ID is not set");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) throw new Error("SHOPIFY_CLIENT_SECRET is not set");
  return secret;
}

function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/connections/shopify/callback`;
}

export function generateNonce(): string {
  return randomBytes(16).toString("hex");
}

const SHOPIFY_DOMAIN_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

function assertValidShop(shop: string): void {
  if (!SHOPIFY_DOMAIN_RE.test(shop)) {
    throw new Error("Invalid Shopify domain");
  }
}

export function buildAuthUrl(shop: string, state: string): string {
  assertValidShop(shop);
  const params = new URLSearchParams({
    client_id: getClientId(),
    scope: SHOPIFY_SCOPES,
    redirect_uri: getRedirectUri(),
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/*all query params except `hmac` are sorted and joined, then verified against
 * the HMAC using the client secret.*/
export function verifyHmac(
  query: Record<string, string>,
  secret?: string
): boolean {
  const hmac = query.hmac;
  if (!hmac) return false;

  const clientSecret = secret ?? getClientSecret();

  //sort remaining params alphabetically and join with &
  const message = Object.keys(query)
    .filter((key) => key !== "hmac")
    .sort()
    .map((key) => `${key}=${query[key]}`)
    .join("&");

  const computed = createHmac("sha256", clientSecret)
    .update(message)
    .digest("hex");

  //timing-safe comparison
  try {
    return timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(hmac, "hex")
    );
  } catch {
    return false;
  }
}

export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<string> {
  assertValidShop(shop);
  const response = await fetch(
    `https://${shop}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: getClientId(),
        client_secret: getClientSecret(),
        code,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify token exchange failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { access_token: string };
  if (!data.access_token) {
    throw new Error("Shopify token exchange returned no access_token");
  }

  return data.access_token;
}

export { SHOPIFY_SCOPES };
