import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="state-page">
      <section className="state-card">
        <div className="state-icon">
          <SearchX size={28} />
        </div>
        <p className="eyebrow">Not found</p>
        <h1>Page not available</h1>
        <p>The page you opened does not exist in this workspace.</p>
        <Link className="state-link" href="/">
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}
