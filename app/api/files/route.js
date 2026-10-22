import { readUpload, saveUpload } from "../../../lib/perf-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function POST(request) {
  try {
    const form = await request.formData();
    const taskId = String(form.get("taskId") || "");
    const documentId = String(form.get("documentId") || "");
    const file = form.get("file");
    if (!taskId || !documentId || !(file instanceof File)) {
      return Response.json({ error: "taskId, documentId, and file are required." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ error: "Files must be 20 MB or smaller." }, { status: 413 });
    }
    const stored = await saveUpload(taskId, documentId, Buffer.from(await file.arrayBuffer()));
    return Response.json({
      taskId,
      documentId,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: stored.size,
      stored: true
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const taskId = url.searchParams.get("taskId");
    const documentId = url.searchParams.get("documentId");
    const name = url.searchParams.get("name") || "document";
    const type = url.searchParams.get("type") || "application/octet-stream";
    const stored = await readUpload(taskId, documentId);
    return new Response(stored.bytes, {
      headers: {
        "Content-Type": type,
        "Content-Length": String(stored.size),
        "Content-Disposition": `inline; filename="${name.replace(/["\r\n]/g, "_")}"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    return Response.json({ error: "File not found.", detail: error.message }, { status: 404 });
  }
}
