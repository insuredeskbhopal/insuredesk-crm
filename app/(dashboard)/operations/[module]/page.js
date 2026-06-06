import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, ClipboardList } from "lucide-react";
import { getOperationsModule } from "@/app/lib/operations-modules";

export default async function OperationsModulePage({ params }) {
  const { module: moduleId } = await params;
  const operationsModule = getOperationsModule(moduleId);

  if (!operationsModule) {
    notFound();
  }

  return (
    <div className="operations-module-page">
      <Link className="operations-back-link" href="/operations">
        <ArrowLeft size={18} /> Operations Hub
      </Link>

      <section className={`operations-module-detail accent-${operationsModule.accent}`}>
        <div className="operations-module-detail-head">
          <span><ClipboardList size={26} /></span>
          <div>
            <p>Operations Module</p>
            <h2>{operationsModule.name}</h2>
          </div>
        </div>
        <p className="operations-module-detail-copy">{operationsModule.description}</p>

        <div className="operations-module-checklist">
          {operationsModule.functions.map((item) => (
            <div key={item}>
              <BadgeCheck size={18} />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="operations-module-coming-soon">
          <strong>Workflow shell ready</strong>
          <span>
            This module route is available for the CRM workspace. Detailed forms,
            document uploads, approvals, and reports can be added without changing
            the Operations Hub layout.
          </span>
        </div>
      </section>
    </div>
  );
}
