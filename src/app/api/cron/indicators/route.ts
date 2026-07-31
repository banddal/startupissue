import { refreshEcosystemIndicators } from "../../../../../scripts/refresh-ecosystem-indicators";
import { isCronAuthorized } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  if (
    !isCronAuthorized(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const output = await refreshEcosystemIndicators();
  return Response.json(output, {
    status: output.errors.length > 0 ? 207 : 200,
  });
}
