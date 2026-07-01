type TranscriptExportCategory = {
  name: string;
  exportedAt?: Date;
};

type TranscriptExportLink = {
  title: string;
  url: string;
  transcriptText: string | null;
  transcriptionCompletedAt: Date | string | null;
};

export function categoryTranscriptFilename(categoryName: string) {
  const base = categoryName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${base || "linkvault-category"}-transcripts.txt`;
}

export function formatCategoryTranscriptExport(
  category: TranscriptExportCategory,
  links: TranscriptExportLink[],
) {
  const exportedAt = category.exportedAt ?? new Date();
  const transcriptLinks = links.filter((link) => link.transcriptText?.trim());
  const sections = transcriptLinks.map((link, index) => {
    const completedAt = formatCompletedAt(link.transcriptionCompletedAt);
    const metadata = [`URL: ${link.url}`];
    if (completedAt) metadata.push(`Completed: ${completedAt}`);

    return [
      `## ${index + 1}. ${link.title}`,
      metadata.join("\n"),
      "",
      link.transcriptText!.trim(),
    ].join("\n");
  });

  const header = [
    `# ${category.name} — transcripts`,
    `Exported: ${exportedAt.toISOString()}`,
    `Videos with saved transcripts: ${transcriptLinks.length}`,
  ];

  if (sections.length === 0) {
    return [...header, "", "No saved transcripts found for this category yet.", ""].join("\n");
  }

  return [...header, "", sections.join("\n\n---\n\n"), ""].join("\n");
}

function formatCompletedAt(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  if (!Number.isFinite(time)) return null;
  return date.toISOString();
}
