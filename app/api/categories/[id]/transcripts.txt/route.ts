import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories, links } from "@/lib/schema";
import {
  categoryTranscriptFilename,
  formatCategoryTranscriptExport,
} from "@/lib/transcript-export";
import { asc, inArray } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const categoryRows = await db.select().from(categories);
  const category = categoryRows.find((row) => row.id === id);

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const categoryIds = descendantCategoryIds(id, categoryRows);
  const rows = categoryIds.length
    ? await db
        .select({
          title: links.title,
          url: links.url,
          transcriptText: links.transcriptText,
          transcriptionCompletedAt: links.transcriptionCompletedAt,
          createdAt: links.createdAt,
        })
        .from(links)
        .where(inArray(links.categoryId, categoryIds))
        .orderBy(asc(links.createdAt))
    : [];

  const body = formatCategoryTranscriptExport(
    { name: category.name },
    rows.filter((link) => link.transcriptText?.trim()),
  );

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${categoryTranscriptFilename(category.name)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function descendantCategoryIds(
  rootId: string,
  allCategories: Array<{ id: string; parentId: string | null }>,
) {
  const ids = new Set([rootId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const category of allCategories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        changed = true;
      }
    }
  }

  return [...ids];
}
