import Script from "next/script";

export default function PerfDashboardPage() {
  return (
    <>
      <main id="app" className="app-shell" aria-live="polite">
        <div className="loading-state">
          <span className="brand-mark" aria-hidden="true">P</span>
          <p>Loading the performance workspace…</p>
        </div>
      </main>
      <Script src="/dashboard.js" type="module" strategy="afterInteractive" />
    </>
  );
}
