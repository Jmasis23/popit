import type { PlatformDetails } from "@/lib/platforms";

const TRUSTPILOT_BASE = "https://api.trustpilot.com/v1";

export type TrustpilotCandidate = {
  businessUnitId: string;
  name: string;
  domain: string;
  rating?: number;
  reviewCount?: number;
};

function getApiKey(): string {
  const key = process.env.TRUSTPILOT_API_KEY;
  if (!key) {
    throw new Error("TRUSTPILOT_API_KEY is not configured on the server.");
  }
  return key;
}

function normalizeDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

export async function findTrustpilotBusinessUnit(
  domainOrUrl: string
): Promise<TrustpilotCandidate> {
  const domain = normalizeDomain(domainOrUrl);
  const url = new URL(`${TRUSTPILOT_BASE}/business-units/find`);
  url.searchParams.set("name", domain);
  url.searchParams.set("apikey", getApiKey());

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(
      `Trustpilot couldn't find a business unit for "${domain}" (${res.status})`
    );
  }
  const data = await res.json();

  return {
    businessUnitId: data.id,
    name: data.displayName ?? domain,
    domain,
    rating: data.score?.trustScore,
    reviewCount: data.numberOfReviews?.total,
  };
}

export async function getTrustpilotDetails(
  businessUnitId: string
): Promise<PlatformDetails> {
  const url = new URL(
    `${TRUSTPILOT_BASE}/business-units/${businessUnitId}/reviews`
  );
  url.searchParams.set("apikey", getApiKey());
  url.searchParams.set("perPage", "20");
  url.searchParams.set("orderBy", "createdat.desc");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Trustpilot reviews lookup failed: ${res.status}`);
  }
  const data = await res.json();

  type RawReview = {
    consumer?: { displayName?: string; imageUrl?: string };
    stars: number;
    text: string;
    createdAt?: string;
  };

  return {
    externalId: businessUnitId,
    label: data.businessUnit?.displayName ?? businessUnitId,
    reviews: ((data.reviews ?? []) as RawReview[]).map((r) => ({
      authorName: r.consumer?.displayName ?? "Trustpilot user",
      authorPhotoUrl: r.consumer?.imageUrl,
      rating: r.stars,
      text: r.text,
      time: r.createdAt ? Date.parse(r.createdAt) / 1000 : undefined,
    })),
  };
}
