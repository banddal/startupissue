import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { normalizeItem } from "./core/normalize";
import { runPersistentIngestion } from "./pipeline";
import { getSourceAdapters, sourceKeys, type SourceKey } from "./sources";

type CliOptions = {
  sources: SourceKey[];
  dryRun: boolean;
};

export function parseArgs(args: string[]): CliOptions {
  if (args[0] !== "ingest") {
    throw new Error("Usage: pnpm worker ingest --source=<key>|--all [--dry-run]");
  }

  const sourceArg = args.find((arg) => arg.startsWith("--source="));
  const all = args.includes("--all");
  if (Boolean(sourceArg) === all) {
    throw new Error("Choose exactly one of --source=<key> or --all.");
  }

  const requested = sourceArg?.slice("--source=".length);
  if (requested && !sourceKeys.includes(requested as SourceKey)) {
    throw new Error(`Unknown source "${requested}". Available: ${sourceKeys.join(", ")}.`);
  }

  return {
    sources: all ? [...sourceKeys] : [requested as SourceKey],
    dryRun: args.includes("--dry-run"),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const adapters = getSourceAdapters();
  let failed = false;

  for (const sourceKey of options.sources) {
    const adapter = adapters[sourceKey];
    if (!adapter) {
      failed = true;
      console.error(
        `[${sourceKey}] skipped: KSTARTUP_SERVICE_KEY is required for this source.`,
      );
      continue;
    }

    try {
      if (!options.dryRun) {
        const counts = await runPersistentIngestion(adapter);
        console.log(JSON.stringify({ source: sourceKey, ...counts }, null, 2));
        continue;
      }

      const collectedAt = new Date();
      const rawItems = await adapter.fetch();
      const items = [];
      const errors: Array<{ index: number; message: string }> = [];
      for (const [index, rawItem] of rawItems.entries()) {
        try {
          items.push(normalizeItem(rawItem, collectedAt));
        } catch (error) {
          errors.push({
            index,
            message: error instanceof Error ? error.message : "Unknown normalization error",
          });
        }
      }
      console.log(
        JSON.stringify(
          {
            source: sourceKey,
            count: items.length,
            failedCount: errors.length,
            errors,
            items: items.map((item) => ({
              externalId: item.externalId,
              title: item.title,
              canonicalUrl: item.canonicalUrl,
              publishedAt: item.publishedAt.toISOString(),
              publishedAtInferred: item.publishedAtInferred,
              bodyTruncated: item.bodyTruncated,
            })),
          },
          null,
          2,
        ),
      );
    } catch (error) {
      failed = true;
      console.error(
        `[${sourceKey}] failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  if (failed) process.exitCode = 1;
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (entryPath && fileURLToPath(import.meta.url) === entryPath) {
  void main();
}
