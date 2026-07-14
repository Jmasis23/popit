import type { PlatformDetails } from "@/lib/platforms";

const YELP_BASE = "https://api.yelp.com/v3";

export type YelpCandidate = {
  yelpId: string;
  name: string;
  address: string;
  rating?: number;
  reviewCount?: number;
};

function getApiKey(): string {
  const key = process.env.YELP_API_KEY;
  if (!key) {
    throw new Error("YELP_API_KEY is not configured on the server.");
  }
  return key;
}

function authHeaders() {
  return { Authorization: `Bearer ${getApiKey()}` };
}

type RawBusiness = {
  id: string;
  name: string;
  rating?: number;
  review_count?: number;
  location?: { display_address?: string[] };
};

export async function searchYelpBusinesses(
  query: string
): Promise<YelpCandidate[]> {
  const url = new URL(`${YELP_BASE}/businesses/search`);
  // Yelp requires a location; callers pass a combined "name, city" query,
  // which Yelp's fuzzy location matching generally tolerates.
  url.searchParams.set("term", query);
  url.searchParams.set("location", query);
  url.searchParams.set("limit", "5");

  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Yelp search failed: ${res.status} ${body}`);
  }
  const data = await res.json();

  return ((data.businesses ?? []) as RawBusiness[]).map((b) => ({
    yelpId: b.id,
    name: b.name,
    address: (b.location?.display_address ?? []).join(", "),
    rating: b.rating,
    reviewCount: b.review_count,
  }));
}

export async function getYelpDetails(yelpId: string): Promise<PlatformDetails> {
  const [businessRes, reviewsRes] = await Promise.all([
    fetch(`${YELP_BASE}/businesses/${yelpId}`, { headers: authHeaders() }),
    fetch(`${YELP_BASE}/businesses/${yelpId}/reviews?sort_by=newest`, {
      headers: authHeaders(),
    }),
  ]);

  if (!businessRes.ok) {
    throw new Error(`Yelp business lookup failed: ${businessRes.status}`);
  }
  if (!reviewsRes.ok) {
    throw new Error(`Yelp reviews lookup failed: ${reviewsRes.status}`);
  }

  const business = await businessRes.json();
  const reviewsData = await reviewsRes.json();

  type RawReview = {
    user?: { name?: string; image_url?: string };
    rating: number;
    text: string;
    time_created?: string;
  };

  return {
    externalId: yelpId,
    label: business.name,
    address: (business.location?.display_address ?? []).join(", "),
    rating: business.rating,
    reviewCount: business.review_count,
    // Yelp's API only returns up to 3 review excerpts (~150 chars each) per
    // business — full review text isn't available via the public API.
    reviews: ((reviewsData.reviews ?? []) as RawReview[]).map((r) => ({
      authorName: r.user?.name ?? "Yelp user",
      authorPhotoUrl: r.user?.image_url,
      rating: r.rating,
      text: r.text,
      time: r.time_created ? Date.parse(r.time_created) / 1000 : undefined,
    })),
  };
}
