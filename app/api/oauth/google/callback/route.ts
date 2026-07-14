import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exchangeCodeForTokens,
  findFirstLocation,
  getBusinessProfileReviews,
} from "@/lib/googleBusinessProfile";

function errorRedirect(origin: string, siteId: string, token: string, message: string) {
  const url = new URL(`/dashboard/${siteId}`, origin);
  url.searchParams.set("token", token);
  url.searchParams.set("gbp_error", message);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");

  if (!stateRaw) {
    return NextResponse.json({ error: "Missing OAuth state" }, { status: 400 });
  }

  let siteId: string;
  let token: string;
  try {
    const decoded = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8"));
    siteId = decoded.siteId;
    token = decoded.token;
  } catch {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site || site.token !== token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (oauthError) {
    return errorRedirect(req.nextUrl.origin, siteId, token, `Google denied access: ${oauthError}`);
  }
  if (!code) {
    return errorRedirect(req.nextUrl.origin, siteId, token, "Missing authorization code");
  }

  const redirectUri = new URL("/api/oauth/google/callback", req.nextUrl.origin).toString();

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    if (!tokens.refreshToken) {
      throw new Error(
        "Google didn't return a refresh token. Remove Popit's access at https://myaccount.google.com/permissions and try connecting again."
      );
    }

    const { accountId, locationId, title } = await findFirstLocation(tokens.accessToken);
    const details = await getBusinessProfileReviews(tokens.accessToken, accountId, locationId);
    details.label = title;

    const connection = await prisma.platformConnection.upsert({
      where: { siteId_platform: { siteId, platform: "google_business_profile" } },
      create: {
        siteId,
        platform: "google_business_profile",
        externalId: details.externalId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        label: details.label,
        lastSyncedAt: new Date(),
      },
      update: {
        externalId: details.externalId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        label: details.label,
        lastSyncedAt: new Date(),
        enabled: true,
      },
    });

    await prisma.$transaction([
      prisma.review.deleteMany({ where: { connectionId: connection.id } }),
      prisma.review.createMany({
        data: details.reviews.map((r) => ({
          connectionId: connection.id,
          platform: "google_business_profile",
          authorName: r.authorName,
          authorPhotoUrl: r.authorPhotoUrl,
          rating: r.rating,
          text: r.text,
          relativeTime: r.relativeTime,
          reviewTime: r.time ? new Date(r.time * 1000) : null,
        })),
      }),
    ]);

    const url = new URL(`/dashboard/${siteId}`, req.nextUrl.origin);
    url.searchParams.set("token", token);
    return NextResponse.redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorRedirect(req.nextUrl.origin, siteId, token, message);
  }
}
