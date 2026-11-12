import { Suspense } from "react";
import PdfTrainingStudioPage from "@/app/components/operations/PdfTrainingStudioPage";

export const metadata = {
  title: "PDF Training Studio | Operations Hub",
  description:
    "Interactive PDF layout training studio, held-out 95% accuracy benchmark, and CRM extraction rule sync.",
};

export default function OperationsPdfTrainingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading PDF Training Studio...</div>}>
      <PdfTrainingStudioPage />
    </Suspense>
  );
}

