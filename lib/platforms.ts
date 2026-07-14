export const PLATFORMS = [
  "google",
  "google_business_profile",
  "yelp",
  "facebook",
  "trustpilot",
] as const;
export type Platform = (typeof PLATFORMS)[number];

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

export type NormalizedReview = {
  authorName: string;
  authorPhotoUrl?: string;
  rating: number;
  text: string;
  relativeTime?: string;
  time?: number; // unix seconds
};

export type PlatformDetails = {
  externalId: string;
  label: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  reviews: NormalizedReview[];
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  google: "Google",
  google_business_profile: "Google Business Profile",
  yelp: "Yelp",
  facebook: "Facebook",
  trustpilot: "Trustpilot",
};
