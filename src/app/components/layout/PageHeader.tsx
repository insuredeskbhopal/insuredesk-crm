"use client";

import { History, LoaderCircle, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PageHeader({
  title,
  subtitle,
  showRecordSaveActions,
  isSaving,
  isUploading,
  onSaveRecord,
}) {
  const router = useRouter();

  return (
    <section className="page-title-row">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {showRecordSaveActions ? (
        <div className="title-actions">
          <button type="button" onClick={() => router.push("/upload-history")}>
            <History size={18} /> View Upload History
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={onSaveRecord}
            disabled={isSaving || isUploading}
          >
            {isUploading ? (
              <LoaderCircle size={18} className="spin" />
            ) : isSaving ? (
              <LoaderCircle size={18} className="spin" />
            ) : (
              <Upload size={18} />
            )}
            {isUploading ? "Extracting PDFs" : "Save Record"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
