import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/schema";
import { asc } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.position), asc(categories.createdAt));
  return NextResponse.json({ categories: rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const inserted = await db
    .insert(categories)
    .values({
      name: body.name.trim(),
      color: typeof body.color === "string" && body.color ? body.color : "#6366f1",
      emoji: typeof body.emoji === "string" && body.emoji ? body.emoji : null,
      parentId: typeof body.parentId === "string" && body.parentId ? body.parentId : null,
      position: typeof body.position === "number" ? body.position : 0,
    })
    .returning();

  return NextResponse.json({ category: inserted[0] }, { status: 201 });
}
