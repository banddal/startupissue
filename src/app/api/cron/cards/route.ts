import { isCronAuthorized } from "@/lib/cron-auth";
import { runPersistentIngestion } from "../../../../../worker/pipeline";
import { getSourceAdapters, sourceKeys } from "../../../../../worker/sources";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (
    !isCronAuthorized(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adapters = getSourceAdapters();
  const results = [];

  for (const sourceKey of sourceKeys) {
    const adapter = adapters[sourceKey];
    if (!adapter) {
      results.push({ source: sourceKey, status: "skipped", reason: "not configured" });
      continue;
    }
    try {
      const counts = await runPersistentIngestion(adapter);
      results.push({ source: sourceKey, status: "success", ...counts });
    } catch (error) {
      results.push({
        source: sourceKey,
        status: "failed",
        reason: error instanceof Error ? error.message : "Unknown ingestion error",
      });
    }
  }

  const failed = results.filter((result) => result.status === "failed").length;
  return Response.json({
    status: failed === 0 ? "success" : "partial_failure",
    failed,
    results,
  });
}
