import { getState, subscribe } from "../../../lib/perf-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = payload => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch (_) {
          cleanup();
        }
      };
      const unsubscribe = subscribe(send);
      const heartbeat = setInterval(() => send({ type: "heartbeat", at: new Date().toISOString() }), 25000);
      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try { controller.close(); } catch (_) {}
      };
      request.signal.addEventListener("abort", cleanup, { once: true });
      const state = await getState();
      send({ type: "connected", revision: state.revision, updatedAt: state.updatedAt });
    },
    cancel() {
      cleanup();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
