import type { PlatformDetails } from "@/lib/platforms";

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";

export type PlaceCandidate = {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  userRatingsTotal?: number;
};

export type PlaceReview = {
  authorName: string;
  authorPhotoUrl?: string;
  rating: number;
  text: string;
  relativeTime?: string;
  time?: number;
};

export type PlaceDetails = {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  userRatingsTotal?: number;
  reviews: PlaceReview[];
};

function getApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    throw new Error(
      "GOOGLE_PLACES_API_KEY is not configured on the server."
    );
  }
  return key;
}

export async function searchPlaces(query: string): Promise<PlaceCandidate[]> {
  const url = new URL(`${PLACES_BASE}/textsearch/json`);
  url.searchParams.set("query", query);
  url.searchParams.set("key", getApiKey());

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Google Places search failed: ${res.status}`);
  }
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(
      `Google Places search error: ${data.status} ${data.error_message ?? ""}`
    );
  }

  type RawResult = {
    place_id: string;
    name: string;
    formatted_address: string;
    rating?: number;
    user_ratings_total?: number;
  };

  return ((data.results ?? []) as RawResult[]).slice(0, 5).map((r) => ({
    placeId: r.place_id,
    name: r.name,
    address: r.formatted_address,
    rating: r.rating,
    userRatingsTotal: r.user_ratings_total,
  }));
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const url = new URL(`${PLACES_BASE}/details/json`);
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "name,formatted_address,rating,user_ratings_total,review"
  );
  url.searchParams.set("key", getApiKey());

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Google Places details failed: ${res.status}`);
  }
  const data = await res.json();
  if (data.status !== "OK") {
    throw new Error(
      `Google Places details error: ${data.status} ${data.error_message ?? ""}`
    );
  }

  type RawReview = {
    author_name: string;
    profile_photo_url?: string;
    rating: number;
    text: string;
    relative_time_description?: string;
    time?: number;
  };

  const result = data.result;
  const reviews: PlaceReview[] = ((result.reviews ?? []) as RawReview[]).map(
    (r) => ({
      authorName: r.author_name,
      authorPhotoUrl: r.profile_photo_url,
      rating: r.rating,
      text: r.text,
      relativeTime: r.relative_time_description,
      time: r.time,
    })
  );

  return {
    placeId,
    name: result.name,
    address: result.formatted_address,
    rating: result.rating,
    userRatingsTotal: result.user_ratings_total,
    reviews,
  };
}

export function toPlatformDetails(details: PlaceDetails): PlatformDetails {
  return {
    externalId: details.placeId,
    label: details.name,
    address: details.address,
    rating: details.rating,
    reviewCount: details.userRatingsTotal,
    reviews: details.reviews,
  };
}
