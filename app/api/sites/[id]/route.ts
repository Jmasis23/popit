import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("token");

  const site = await prisma.site.findUnique({
    where: { id },
    include: {
      platforms: {
        include: { reviews: { orderBy: { createdAt: "desc" } } },
      },
    },
  });

  if (!site || site.token !== token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ site });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("token");
  const body = await req.json().catch(() => null);

  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.token !== token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: { position?: string; intervalSeconds?: number } = {};
  if (typeof body?.position === "string") data.position = body.position;
  if (typeof body?.intervalSeconds === "number")
    data.intervalSeconds = body.intervalSeconds;

  const updated = await prisma.site.update({ where: { id }, data });
  return NextResponse.json({ site: updated });
}
