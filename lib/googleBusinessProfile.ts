import type { PlatformDetails } from "@/lib/platforms";

// Unlike the Google Places integration (an API-key lookup anyone's server
// can do for any public business), the Business Profile API requires the
// business owner to sign in with the Google account that manages their
// listing and grant OAuth consent — this is the only way to read reviews
// through Google's supported API rather than scraping the public reviews
// page. Note: production access to the Business Profile APIs requires
// applying for API access from Google (https://support.google.com/business/answer/9053347);
// without approval this only works for accounts added as test users on the
// OAuth consent screen.
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ACCOUNTS_URL = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
const BUSINESS_INFO_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";
const REVIEWS_BASE = "https://mybusiness.googleapis.com/v4";
const SCOPE = "https://www.googleapis.com/auth/business.manage";

function getCredentials() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET are not configured on the server."
    );
  }
  return { clientId, clientSecret };
}

export function buildAuthUrl(redirectUri: string, state: string): string {
  const { clientId } = getCredentials();
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

export type TokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
};

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<TokenSet> {
  const { clientId, clientSecret } = getCredentials();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google OAuth token exchange failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  const { clientId, clientSecret } = getCredentials();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google OAuth token refresh failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

async function authedGet(url: string, accessToken: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Business Profile API request failed: ${res.status} ${body}`);
  }
  return res.json();
}

// Picks the first account + first location the authorizing user manages.
// A multi-location business would need a picker UI to choose among them;
// out of scope for this MVP.
export async function findFirstLocation(
  accessToken: string
): Promise<{ accountId: string; locationId: string; title: string }> {
  const accountsData = await authedGet(ACCOUNTS_URL, accessToken);
  const account = accountsData.accounts?.[0];
  if (!account) {
    throw new Error("No Google Business Profile accounts found for this login.");
  }
  const accountId: string = account.name.split("/")[1];

  const locationsUrl = new URL(`${BUSINESS_INFO_BASE}/${account.name}/locations`);
  locationsUrl.searchParams.set("readMask", "name,title");
  const locationsData = await authedGet(locationsUrl.toString(), accessToken);
  const location = locationsData.locations?.[0];
  if (!location) {
    throw new Error("No locations found on this Google Business Profile account.");
  }
  const locationId: string = location.name.split("/")[1];

  return { accountId, locationId, title: location.title ?? "Google Business Profile" };
}

export async function getBusinessProfileReviews(
  accessToken: string,
  accountId: string,
  locationId: string
): Promise<PlatformDetails> {
  const data = await authedGet(
    `${REVIEWS_BASE}/accounts/${accountId}/locations/${locationId}/reviews`,
    accessToken
  );

  const starToNumber: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };

  type RawReview = {
    reviewer?: { displayName?: string; profilePhotoUrl?: string };
    starRating?: string;
    comment?: string;
    createTime?: string;
  };

  return {
    externalId: `${accountId}/${locationId}`,
    label: "Google Business Profile",
    reviews: ((data.reviews ?? []) as RawReview[])
      .filter((r) => r.comment)
      .map((r) => ({
        authorName: r.reviewer?.displayName ?? "Google user",
        authorPhotoUrl: r.reviewer?.profilePhotoUrl,
        rating: r.starRating ? starToNumber[r.starRating] ?? 0 : 0,
        text: r.comment ?? "",
        time: r.createTime ? Date.parse(r.createTime) / 1000 : undefined,
      })),
  };
}
