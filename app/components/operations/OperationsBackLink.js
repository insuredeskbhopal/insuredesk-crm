import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function OperationsBackLink() {
  return (
    <Link className="operations-back-link" href="/operations" aria-label="Back to Operations Hub">
      <ArrowLeft size={18} /> Operations Hub
    </Link>
  );
}
