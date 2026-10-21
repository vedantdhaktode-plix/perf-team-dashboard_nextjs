# Perf Team Dashboard

A local Next.js dashboard for the Performance team go-live workflow, populated from the `AI Tracker Main` and `Work Plan` tabs in `Brand Perf Edit.xlsx`. Only the Perf team workspace is exposed.

## Run locally

```powershell
npm install
npm run build
npm run start
```

Open `http://localhost:4317`. For hot reload, use `npm run dev`; it uses the same port.

## Data and safety

- No credentials or external API calls are included.
- `public/data/workbook-data.json` is the browser-readable workbook snapshot.
- `public/config/workflow.json` contains the workflow and permission contract.
- The original workbook remains unchanged.
- User changes persist only in browser `localStorage`.

## Included experience

- Perf-only sidebar and go-live dashboard.
- Ready for live, Live, Rework, and Failed / On hold queues.
- Video brief and AI brief queue switching.
- Search, priority/status filters, and list/board views.
- Task detail drawer, activity, comments, timing, and Go Live actions.
- Responsive desktop and mobile layouts.

## Limitations

- Authentication and roles are simulated.
- Browser storage is not shared multi-user persistence.
- Imported records may contain operational names, instructions, and links from the source workbook.
