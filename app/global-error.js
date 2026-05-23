"use client";

import "./globals.css";

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body>
        <main className="state-page">
          <section className="state-card error-state">
            <div className="state-icon">!</div>
            <p className="eyebrow">Application error</p>
            <h1>InsurCRM could not start</h1>
            <p>{error?.message || "A critical error occurred while loading the app."}</p>
            <button className="secondary-action" type="button" onClick={reset}>
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
