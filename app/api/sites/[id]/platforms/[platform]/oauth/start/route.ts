import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAuthUrl } from "@/lib/googleBusinessProfile";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; platform: string }> }
) {
  const { id, platform } = await params;
  const token = req.nextUrl.searchParams.get("token");

  if (platform !== "google_business_profile") {
    return NextResponse.json(
      { error: "This platform doesn't use an OAuth connect flow." },
      { status: 400 }
    );
  }

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.token !== token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const redirectUri = new URL("/api/oauth/google/callback", req.nextUrl.origin).toString();
  const state = Buffer.from(JSON.stringify({ siteId: id, token })).toString("base64url");

  try {
    const authUrl = buildAuthUrl(redirectUri, state);
    return NextResponse.redirect(authUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
