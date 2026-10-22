import { healthSummary } from "../../../lib/perf-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await healthSummary(), {
    headers: { "Cache-Control": "no-store" }
  });
}
