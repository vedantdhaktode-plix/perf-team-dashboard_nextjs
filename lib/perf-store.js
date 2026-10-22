import { EventEmitter } from "node:events";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");
const STATE_FILE = path.join(DATA_DIR, "perf-state.json");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const MAX_TASKS = 10000;
const MAX_MESSAGES = 50000;
const MAX_NOTIFICATIONS = 50000;

const runtime = globalThis.__perfTeamRuntime || {
  emitter: new EventEmitter(),
  writeQueue: Promise.resolve()
};

runtime.emitter.setMaxListeners(250);
globalThis.__perfTeamRuntime = runtime;

function clone(value) {
  return structuredClone(value);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function createSeedState() {
  const [mockData, workbookData] = await Promise.all([
    readJson(path.join(process.cwd(), "public", "data", "mock-data.json")),
    readJson(path.join(process.cwd(), "public", "data", "workbook-data.json"))
  ]);
  const operationalFixtures = mockData.tasks.filter(task =>
    ["social_research", "script_changes_requested", "script_approval_pending"].includes(task.state)
  );

  return {
    version: 1,
    revision: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: "system-seed",
    tasks: [...operationalFixtures, ...workbookData.tasks],
    messages: mockData.messages || [],
    notifications: mockData.notifications || []
  };
}

async function writeStateFile(state) {
  await mkdir(DATA_DIR, { recursive: true });
  const temporaryFile = `${STATE_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(state), "utf8");
  await rename(temporaryFile, STATE_FILE);
}

export async function getState() {
  try {
    const state = await readJson(STATE_FILE);
    if (!Array.isArray(state.notifications)) {
      const mockData = await readJson(path.join(process.cwd(), "public", "data", "mock-data.json"));
      state.notifications = mockData.notifications || [];
    }
    return state;
  } catch (error) {
    if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
    const seeded = await createSeedState();
    await writeStateFile(seeded);
    return seeded;
  }
}

function validHttpsHost(value, hostname) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.toLowerCase() === hostname;
  } catch (_) {
    return false;
  }
}

function stateIsReachable(from, to, transitions) {
  if (!from || from === to) return true;
  const visited = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const state = queue.shift();
    for (const next of transitions[state] || []) {
      if (next === to) return true;
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

async function validateSnapshot(snapshot, current) {
  if (!Array.isArray(snapshot.tasks) || !Array.isArray(snapshot.messages) || !Array.isArray(snapshot.notifications)) {
    throw new Error("Tasks, messages, and notifications must be arrays.");
  }
  if (snapshot.tasks.length > MAX_TASKS || snapshot.messages.length > MAX_MESSAGES || snapshot.notifications.length > MAX_NOTIFICATIONS) {
    throw new Error("Snapshot exceeds the configured record limit.");
  }
  const taskIds = new Set();
  const currentTasks = new Map((current?.tasks || []).map(task => [task.id, task]));
  const workflow = await readJson(path.join(process.cwd(), "public", "config", "workflow.json"));
  for (const task of snapshot.tasks) {
    if (!task || typeof task.id !== "string" || !task.id.trim()) throw new Error("Every task requires an id.");
    if (taskIds.has(task.id)) throw new Error(`Duplicate task id: ${task.id}`);
    taskIds.add(task.id);
    const previous = currentTasks.get(task.id);
    if (previous && !stateIsReachable(previous.state, task.state, workflow.transitions)) {
      throw new Error(`Rejected workflow transition for ${task.id}: ${previous.state} to ${task.state}`);
    }
    if (task.scriptLink && task.scriptLink !== previous?.scriptLink && !validHttpsHost(task.scriptLink, "docs.google.com")) {
      throw new Error(`Script links for ${task.id} must use docs.google.com.`);
    }
    if (task.videoLink && task.videoLink !== previous?.videoLink && !validHttpsHost(task.videoLink, "drive.google.com")) {
      throw new Error(`Video links for ${task.id} must use drive.google.com.`);
    }
  }
}

export function replaceState(snapshot, baseRevision, actor = "unknown") {
  const operation = runtime.writeQueue.then(async () => {
    const current = await getState();
    if (Number(baseRevision) !== current.revision) {
      return { conflict: true, state: current };
    }

    await validateSnapshot(snapshot, current);
    const next = {
      version: 1,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: String(actor || "unknown").slice(0, 120),
      tasks: clone(snapshot.tasks),
      messages: clone(snapshot.messages),
      notifications: clone(snapshot.notifications)
    };
    await writeStateFile(next);
    runtime.emitter.emit("change", {
      type: "state.changed",
      revision: next.revision,
      updatedAt: next.updatedAt,
      updatedBy: next.updatedBy
    });
    return { conflict: false, state: next };
  });
  runtime.writeQueue = operation.catch(() => {});
  return operation;
}

export function resetState(actor = "unknown") {
  const operation = runtime.writeQueue.then(async () => {
    const current = await getState();
    const seeded = await createSeedState();
    seeded.revision = current.revision + 1;
    seeded.updatedAt = new Date().toISOString();
    seeded.updatedBy = String(actor || "unknown").slice(0, 120);
    await writeStateFile(seeded);
    runtime.emitter.emit("change", {
      type: "state.reset",
      revision: seeded.revision,
      updatedAt: seeded.updatedAt,
      updatedBy: seeded.updatedBy
    });
    return seeded;
  });
  runtime.writeQueue = operation.catch(() => {});
  return operation;
}

export function subscribe(listener) {
  runtime.emitter.on("change", listener);
  return () => runtime.emitter.off("change", listener);
}

function safeSegment(value) {
  const safe = String(value || "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
  if (!safe) throw new Error("Invalid storage identifier.");
  return safe;
}

function uploadPath(taskId, documentId) {
  return path.join(UPLOAD_DIR, `${safeSegment(taskId)}__${safeSegment(documentId)}`);
}

export async function saveUpload(taskId, documentId, bytes) {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filePath = uploadPath(taskId, documentId);
  await writeFile(filePath, bytes);
  return { size: bytes.byteLength };
}

export async function readUpload(taskId, documentId) {
  const filePath = uploadPath(taskId, documentId);
  const [bytes, fileStat] = await Promise.all([readFile(filePath), stat(filePath)]);
  return { bytes, size: fileStat.size };
}

export async function healthSummary() {
  const state = await getState();
  return {
    ok: true,
    storage: "server-filesystem",
    realtime: "sse",
    revision: state.revision,
    taskCount: state.tasks.length,
    messageCount: state.messages.length,
    notificationCount: state.notifications.length,
    updatedAt: state.updatedAt
  };
}
