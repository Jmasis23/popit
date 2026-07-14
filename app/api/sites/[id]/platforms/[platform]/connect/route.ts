import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPlatform } from "@/lib/platforms";
import { connectPlatform, type ConnectPayload } from "@/lib/platformFetch";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; platform: string }> }
) {
  const { id, platform } = await params;
  const token = req.nextUrl.searchParams.get("token");
  const body = await req.json().catch(() => null);

  if (!isPlatform(platform)) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  }

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.token !== token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let payload: ConnectPayload;
  if (platform === "google") {
    if (!body?.placeId) {
      return NextResponse.json({ error: "placeId is required" }, { status: 400 });
    }
    payload = { platform: "google", placeId: body.placeId };
  } else if (platform === "yelp") {
    if (!body?.yelpId) {
      return NextResponse.json({ error: "yelpId is required" }, { status: 400 });
    }
    payload = { platform: "yelp", yelpId: body.yelpId };
  } else if (platform === "trustpilot") {
    if (!body?.domain) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }
    payload = { platform: "trustpilot", domain: body.domain };
  } else {
    if (!body?.pageId || !body?.accessToken) {
      return NextResponse.json(
        { error: "pageId and accessToken are required" },
        { status: 400 }
      );
    }
    payload = {
      platform: "facebook",
      pageId: body.pageId,
      accessToken: body.accessToken,
    };
  }

  try {
    const { details, accessToken } = await connectPlatform(payload);

    const connection = await prisma.platformConnection.upsert({
      where: { siteId_platform: { siteId: id, platform } },
      create: {
        siteId: id,
        platform,
        externalId: details.externalId,
        accessToken,
        label: details.label,
        address: details.address,
        rating: details.rating,
        reviewCount: details.reviewCount,
        lastSyncedAt: new Date(),
      },
      update: {
        externalId: details.externalId,
        accessToken,
        label: details.label,
        address: details.address,
        rating: details.rating,
        reviewCount: details.reviewCount,
        lastSyncedAt: new Date(),
        enabled: true,
      },
    });

    await prisma.$transaction([
      prisma.review.deleteMany({ where: { connectionId: connection.id } }),
      prisma.review.createMany({
        data: details.reviews.map((r) => ({
          connectionId: connection.id,
          platform,
          authorName: r.authorName,
          authorPhotoUrl: r.authorPhotoUrl,
          rating: r.rating,
          text: r.text,
          relativeTime: r.relativeTime,
          reviewTime: r.time ? new Date(r.time * 1000) : null,
        })),
      }),
    ]);

    const updated = await prisma.platformConnection.findUnique({
      where: { id: connection.id },
      include: { reviews: true },
    });

    return NextResponse.json({ connection: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
