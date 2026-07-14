import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = body?.name?.trim();
  const url = body?.url?.trim();

  if (!name || !url) {
    return NextResponse.json(
      { error: "name and url are required" },
      { status: 400 }
    );
  }

  const site = await prisma.site.create({
    data: { name, url },
  });

  return NextResponse.json({ id: site.id, token: site.token });
}
