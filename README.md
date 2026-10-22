# Perf Team Dashboard

A local Next.js dashboard for the Performance team go-live workflow, populated from the `AI Tracker Main` and `Work Plan` tabs in `Brand Perf Edit.xlsx`. Only the Perf team workspace is exposed.

## Run locally

```powershell
npm install
npm run build
npm run start
```

Open `http://localhost:4317`. For hot reload, use `npm run dev`; it uses the same port.

## Full-stack architecture

- Next.js serves both the dashboard and Node.js API routes.
- Server state is stored in `.data/perf-state.json` with atomic writes and optimistic revision checks.
- Server-Sent Events at `/api/events` update other open browsers immediately after scripts, approvals, links, or statuses change.
- Script and supporting-file uploads are stored under `.data/uploads` and streamed through `/api/files`.
- Workflow transitions and Google Docs / Drive link hosts are validated again on the server.
- The header displays the live connection state: Connecting, Saving, Live backend, or Sync issue.

### API routes

- `GET /api/state` — current tasks, approvals, messages, links, and revision.
- `PUT /api/state` — persist an optimistic-concurrency snapshot.
- `DELETE /api/state` — reset server state to the workbook seed.
- `GET /api/events` — real-time SSE change stream.
- `POST /api/files` — upload scripts and supporting video documents, up to 20 MB.
- `GET /api/files` — retrieve a stored file.
- `GET /api/health` — backend health, storage mode, revision, and record counts.

## Data and safety

- No credentials or external API calls are included.
- `public/data/workbook-data.json` is the browser-readable workbook snapshot.
- `public/config/workflow.json` contains the workflow and permission contract.
- The original workbook remains unchanged.
- User changes persist on the backend and synchronize across browser sessions.
- `.data/` is intentionally ignored by Git so live operational state and uploaded files are not committed.

## Included experience

- Perf-only sidebar and go-live dashboard.
- Ready for live, Live, Rework, and Failed / On hold queues.
- Video brief and AI brief queue switching.
- Search, priority/status filters, and list/board views.
- Task detail drawer, activity, comments, timing, and Go Live actions.
- Responsive desktop and mobile layouts.

## Limitations

- Authentication and roles are simulated.
- Imported records may contain operational names, instructions, and links from the source workbook.
- The included filesystem persistence is designed for a single persistent Node.js server. A multi-instance/cloud deployment should replace it with shared Postgres/object storage while retaining the same API contract.
