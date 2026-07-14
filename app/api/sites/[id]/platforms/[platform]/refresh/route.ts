import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPlatform } from "@/lib/platforms";
import { refreshPlatform } from "@/lib/platformFetch";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; platform: string }> }
) {
  const { id, platform } = await params;
  const token = req.nextUrl.searchParams.get("token");

  if (!isPlatform(platform)) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  }

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.token !== token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const connection = await prisma.platformConnection.findUnique({
    where: { siteId_platform: { siteId: id, platform } },
  });
  if (!connection || !connection.externalId) {
    return NextResponse.json({ error: "Platform not connected" }, { status: 404 });
  }

  try {
    const { details, updatedAccessToken, updatedTokenExpiresAt } = await refreshPlatform(
      platform,
      connection.externalId,
      connection.accessToken,
      connection.refreshToken
    );

    await prisma.$transaction([
      prisma.review.deleteMany({ where: { connectionId: connection.id } }),
      prisma.platformConnection.update({
        where: { id: connection.id },
        data: {
          label: details.label,
          address: details.address,
          rating: details.rating,
          reviewCount: details.reviewCount,
          lastSyncedAt: new Date(),
          ...(updatedAccessToken ? { accessToken: updatedAccessToken } : {}),
          ...(updatedTokenExpiresAt ? { tokenExpiresAt: updatedTokenExpiresAt } : {}),
        },
      }),
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
