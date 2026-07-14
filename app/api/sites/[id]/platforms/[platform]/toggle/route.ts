import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPlatform } from "@/lib/platforms";

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
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled (boolean) is required" }, { status: 400 });
  }

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.token !== token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const connection = await prisma.platformConnection.findUnique({
    where: { siteId_platform: { siteId: id, platform } },
  });
  if (!connection) {
    return NextResponse.json({ error: "Platform not connected" }, { status: 404 });
  }

  const updated = await prisma.platformConnection.update({
    where: { id: connection.id },
    data: { enabled: body.enabled },
  });

  return NextResponse.json({ connection: updated });
}
