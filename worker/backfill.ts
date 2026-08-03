import { runPersistentIngestion } from "./pipeline";
import { getSourceAdapters, type SourceKey } from "./sources";

const BACKFILL_SOURCES: Array<{ key: SourceKey; maxPages: number }> = [
  { key: "platum", maxPages: 8 },
  { key: "wowtale", maxPages: 8 },
  { key: "kstartup", maxPages: 5 },
  { key: "mss-press", maxPages: 8 },
  { key: "mss-business", maxPages: 8 },
  { key: "motir-press", maxPages: 8 },
  { key: "startup-recipe", maxPages: 8 },
  { key: "startup-alliance", maxPages: 8 },
];

function numericArgument(name: string, fallback: number) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  const value = raw ? Number.parseInt(raw, 10) : fallback;
  if (!Number.isFinite(value) || value < 1) throw new Error(`${name} must be a positive integer.`);
  return value;
}

function requestedSource() {
  const raw = process.argv.find((argument) => argument.startsWith("--source="))?.slice(9);
  if (!raw) return undefined;
  const source = BACKFILL_SOURCES.find(({ key }) => key === raw);
  if (!source) throw new Error(`Unsupported backfill source: ${raw}`);
  return source;
}

export async function runBackfill() {
  const days = numericArgument("days", 30);
  const boundary = new Date(Date.now() - days * 24 * 60 * 60 * 1_000);
  const adapters = getSourceAdapters();
  const selected = requestedSource();
  const sources = selected ? [selected] : BACKFILL_SOURCES;
  const output = [];

  for (const source of sources) {
    const adapter = adapters[source.key];
    if (!adapter?.supportsBackfill) {
      output.push({ source: source.key, status: "skipped", reason: "not configured" });
      continue;
    }

    const totals = { fetched: 0, created: 0, updated: 0, duplicate: 0, failed: 0 };
    let pages = 0;
    for (let page = 1; page <= source.maxPages; page += 1) {
      const rawItems = await adapter.fetch(String(page));
      if (rawItems.length === 0) break;
      const datedItems = rawItems
        .map((item) => ({ item, date: item.publishedAt ? new Date(item.publishedAt) : null }))
        .filter(
          (entry): entry is { item: (typeof rawItems)[number]; date: Date } =>
            Boolean(entry.date && !Number.isNaN(entry.date.getTime())),
        );
      if (datedItems.length === 0) break;

      const recentItems = datedItems
        .filter(({ date }) => date >= boundary)
        .map(({ item }) => item);
      if (recentItems.length > 0) {
        const counts = await runPersistentIngestion(adapter, String(page), recentItems);
        totals.fetched += counts.fetched;
        totals.created += counts.created;
        totals.updated += counts.updated;
        totals.duplicate += counts.duplicate;
        totals.failed += counts.failed;
        pages = page;
      }

      const oldest = datedItems.reduce(
        (value, entry) => (entry.date < value ? entry.date : value),
        datedItems[0]!.date,
      );
      if (oldest < boundary) break;
    }

    output.push({ source: source.key, status: "success", pages, ...totals });
  }

  console.log(JSON.stringify({ days, boundary: boundary.toISOString(), results: output }, null, 2));
  if (output.some((result) => "failed" in result && result.failed > 0)) process.exitCode = 1;
}
