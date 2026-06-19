"use client";

import { AlertTriangle, RotateCw } from "lucide-react";

export default function Error({ error, reset }) {
  return (
    <main className="state-page">
      <section className="state-card error-state">
        <div className="state-icon">
          <AlertTriangle size={28} />
        </div>
        <p className="eyebrow">Page error</p>
        <h1>Something went wrong</h1>
        <p>{error?.message || "The dashboard could not load. Please try again."}</p>
        <button className="secondary-action" type="button" onClick={reset}>
          <RotateCw size={16} /> Try again
        </button>
      </section>
    </main>
  );
}
