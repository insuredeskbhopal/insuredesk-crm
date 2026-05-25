export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import PageHeader from "@/app/components/layout/PageHeader";

function formatSize(bytes) {
  if (!bytes) return "-";
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}

function formatDate(date) {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(date);
  }
}

function getStatusStyle(status) {
  return {
    failed: { background: "rgba(224, 80, 80, 0.12)", color: "#c62828" },
    saved: { background: "rgba(46, 125, 50, 0.12)", color: "#2e7d32" },
    ready_for_review: { background: "rgba(25, 118, 210, 0.12)", color: "#1976d2" },
    needs_manual_classification: { background: "rgba(239, 108, 0, 0.12)", color: "#ef6c00" }
  }[status] || { background: "#f3f4f5", color: "var(--primary)" };
}

function statusLabel(status) {
  return {
    uploaded: "Uploaded",
    extracting: "Extracting",
    ready_for_review: "Ready for Review",
    needs_manual_classification: "Needs Review",
    saved: "Saved to DB",
    failed: "Failed"
  }[status] || status;
}

export default async function UploadHistoryPage() {
  const uploads = await prisma.uploadedFile.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      sourceFile: true,
      sizeBytes: true,
      status: true,
      createdAt: true,
      errorMessage: true
    }
  });

  return (
    <>
      <PageHeader
        title="OCR Ingestion History"
        subtitle="Review PDF uploads, extraction status, and OCR processing logs."
      />

      <section className="glass-panel table-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Log Audit</p>
            <h2>Ingested file activities</h2>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Upload Date</th>
                <th>File Size</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {uploads.length ? (
                uploads.map((upload) => (
                  <tr key={upload.id}>
                    <td><strong>{upload.sourceFile}</strong></td>
                    <td>{formatDate(upload.createdAt)}</td>
                    <td>{formatSize(upload.sizeBytes)}</td>
                    <td>
                      <span className="status-pill" style={getStatusStyle(upload.status)}>
                        {statusLabel(upload.status)}
                      </span>
                    </td>
                    <td>
                      {upload.status === "failed" ? (
                        <span className="queue-error" style={{ margin: 0 }}>
                          {upload.errorMessage || "Unknown error"}
                        </span>
                      ) : (
                        <span className="success-text" style={{ color: "var(--success, #2e7d32)" }}>
                          OCR processed successfully
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty" style={{ textAlign: "center", padding: "40px" }}>
                    No upload history records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
