import { getState, replaceState, resetState } from "../../../lib/perf-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getState(), {
    headers: { "Cache-Control": "no-store" }
  });
}

export async function PUT(request) {
  try {
    const payload = await request.json();
    const result = await replaceState(
      { tasks: payload.tasks, messages: payload.messages },
      payload.baseRevision,
      payload.actor
    );
    if (result.conflict) {
      return Response.json(
        { error: "revision_conflict", state: result.state },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }
    return Response.json(result.state, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  const actor = request.headers.get("x-perf-actor") || "unknown";
  return Response.json(await resetState(actor), {
    headers: { "Cache-Control": "no-store" }
  });
}
