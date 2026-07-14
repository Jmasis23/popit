import type { PlatformDetails } from "@/lib/platforms";

const GRAPH_BASE = "https://graph.facebook.com/v19.0";

// Facebook's Graph API has no public search for arbitrary Pages, and a real
// "Login with Facebook" connect flow requires Meta App Review before it can
// be used by anyone other than the app's own testers. For this MVP, the
// business owner instead pastes their Page ID and a Page Access Token
// (generated from Meta's Graph API Explorer with the pages_read_engagement
// permission) directly.
export async function getFacebookDetails(
  pageId: string,
  accessToken: string
): Promise<PlatformDetails> {
  const pageUrl = new URL(`${GRAPH_BASE}/${pageId}`);
  pageUrl.searchParams.set("fields", "name,overall_star_rating,rating_count");
  pageUrl.searchParams.set("access_token", accessToken);

  const ratingsUrl = new URL(`${GRAPH_BASE}/${pageId}/ratings`);
  ratingsUrl.searchParams.set(
    "fields",
    "reviewer,rating,review_text,created_time"
  );
  ratingsUrl.searchParams.set("access_token", accessToken);

  const [pageRes, ratingsRes] = await Promise.all([
    fetch(pageUrl.toString()),
    fetch(ratingsUrl.toString()),
  ]);

  if (!pageRes.ok) {
    const body = await pageRes.text();
    throw new Error(`Facebook page lookup failed: ${pageRes.status} ${body}`);
  }
  if (!ratingsRes.ok) {
    const body = await ratingsRes.text();
    throw new Error(
      `Facebook ratings lookup failed: ${ratingsRes.status} ${body}`
    );
  }

  const page = await pageRes.json();
  const ratingsData = await ratingsRes.json();

  type RawRating = {
    reviewer?: { name?: string };
    rating: number;
    review_text?: string;
    created_time?: string;
  };

  return {
    externalId: pageId,
    label: page.name ?? pageId,
    rating: page.overall_star_rating,
    reviewCount: page.rating_count,
    reviews: ((ratingsData.data ?? []) as RawRating[])
      .filter((r) => r.review_text)
      .map((r) => ({
        authorName: r.reviewer?.name ?? "Facebook user",
        rating: r.rating,
        text: r.review_text ?? "",
        time: r.created_time ? Date.parse(r.created_time) / 1000 : undefined,
      })),
  };
}
