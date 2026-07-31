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

  return Response.json(
    {
      error: "Legacy ecosystem indicator collection is disabled by PRD v0.3.",
    },
    { status: 410 },
  );
}
