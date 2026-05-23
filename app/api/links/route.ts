import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { isValidUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(links).orderBy(desc(links.createdAt));
  return NextResponse.json({ links: rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.url !== "string" || !isValidUrl(body.url)) {
    return NextResponse.json({ error: "Valid URL is required" }, { status: 400 });
  }
  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const inserted = await db
    .insert(links)
    .values({
      url: body.url.trim(),
      title: body.title.trim(),
      summary: typeof body.summary === "string" && body.summary ? body.summary : null,
      metaImage: typeof body.metaImage === "string" && body.metaImage ? body.metaImage : null,
      categoryId: typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null,
    })
    .returning();

  return NextResponse.json({ link: inserted[0] }, { status: 201 });
}
