import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { isValidUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Body required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.url === "string") {
    if (!isValidUrl(body.url)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    updates.url = body.url.trim();
  }
  if (typeof body.title === "string" && body.title.trim()) updates.title = body.title.trim();
  if (typeof body.summary === "string" || body.summary === null) updates.summary = body.summary;
  if (typeof body.metaImage === "string" || body.metaImage === null) updates.metaImage = body.metaImage;
  if (typeof body.checked === "boolean") updates.checked = body.checked;
  if (typeof body.categoryId === "string" || body.categoryId === null) updates.categoryId = body.categoryId;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  }

  const updated = await db
    .update(links)
    .set(updates)
    .where(eq(links.id, id))
    .returning();

  if (!updated[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ link: updated[0] });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const deleted = await db
    .delete(links)
    .where(eq(links.id, id))
    .returning({ id: links.id });

  if (!deleted[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
