export async function saveTaskDocument(taskId, documentId, file) {
  const form = new FormData();
  form.append("taskId", taskId);
  form.append("documentId", documentId);
  form.append("file", file, file.name);
  const response = await fetch("/api/files", { method: "POST", body: form });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not upload the document.");
  return result;
}

export async function getTaskDocument(taskId, documentId, metadata = {}) {
  const query = new URLSearchParams({
    taskId,
    documentId,
    name: metadata.name || "document",
    type: metadata.type || "application/octet-stream"
  });
  const response = await fetch(`/api/files?${query}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not download the document.");
  return response.blob();
}

export const saveScriptPdf = (taskId, file) => saveTaskDocument(taskId, `legacy-${taskId}`, file);
export const getScriptPdf = taskId => getTaskDocument(taskId, `legacy-${taskId}`);
