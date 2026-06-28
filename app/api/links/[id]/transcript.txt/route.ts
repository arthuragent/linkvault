import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { links } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function safeFilename(title: string) {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "linkvault-transcript"}.txt`;
}

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const rows = await db.select().from(links).where(eq(links.id, id)).limit(1);
  const link = rows[0];
  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }
  if (!link.transcriptText) {
    return NextResponse.json({ error: "Transcript not saved" }, { status: 404 });
  }

  const disposition = new URL(req.url).searchParams.get("download") === "1"
    ? "attachment"
    : "inline";

  return new NextResponse(link.transcriptText, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `${disposition}; filename="${safeFilename(link.title)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
