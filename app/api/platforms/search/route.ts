import { NextRequest, NextResponse } from "next/server";
import { searchPlaces } from "@/lib/places";
import { searchYelpBusinesses } from "@/lib/yelp";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim();
  const platform = req.nextUrl.searchParams.get("platform") ?? "google";

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    if (platform === "yelp") {
      const results = await searchYelpBusinesses(query);
      return NextResponse.json({
        results: results.map((r) => ({
          id: r.yelpId,
          name: r.name,
          address: r.address,
          rating: r.rating,
          reviewCount: r.reviewCount,
        })),
      });
    }

    const results = await searchPlaces(query);
    return NextResponse.json({
      results: results.map((r) => ({
        id: r.placeId,
        name: r.name,
        address: r.address,
        rating: r.rating,
        reviewCount: r.userRatingsTotal,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
