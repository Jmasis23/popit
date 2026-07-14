import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLATFORM_LABELS, type Platform } from "@/lib/platforms";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=300",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      platforms: {
        where: { enabled: true },
        include: { reviews: { orderBy: { createdAt: "desc" }, take: 20 } },
      },
    },
  });

  if (!site) {
    return NextResponse.json(
      { error: "Site not found" },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  const reviews = site.platforms.flatMap((connection) =>
    connection.reviews
      .filter((r) => r.rating >= 4)
      .map((r) => ({
        authorName: r.authorName,
        authorPhotoUrl: r.authorPhotoUrl,
        rating: r.rating,
        text: r.text,
        relativeTime: r.relativeTime,
        platform: r.platform,
        platformLabel: PLATFORM_LABELS[r.platform as Platform] ?? r.platform,
        source: connection.label,
      }))
  );

  // Interleave platforms rather than showing them in DB order, so a single
  // platform's reviews don't dominate a run of consecutive popups.
  reviews.sort(() => Math.random() - 0.5);

  return NextResponse.json(
    {
      businessName: site.name,
      position: site.position,
      intervalSeconds: site.intervalSeconds,
      reviews,
    },
    { headers: CORS_HEADERS }
  );
}
