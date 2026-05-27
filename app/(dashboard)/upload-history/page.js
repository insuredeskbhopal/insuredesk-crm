export const dynamic = "force-dynamic";

import PageHeader from "@/app/components/layout/PageHeader";
import { loadScopedUploads } from "@/lib/scoped-data";
import { normalizeUploadStatus, UPLOAD_STATUS } from "@/lib/upload-status";

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
  const normalized = normalizeUploadStatus(status);
  return {
    [UPLOAD_STATUS.FAILED]: { background: "rgba(224, 80, 80, 0.12)", color: "#c62828" },
    [UPLOAD_STATUS.APPROVED]: { background: "rgba(46, 125, 50, 0.12)", color: "#2e7d32" },
    [UPLOAD_STATUS.REVIEW_REQUIRED]: { background: "rgba(25, 118, 210, 0.12)", color: "#1976d2" },
    [UPLOAD_STATUS.PROCESSING]: { background: "rgba(239, 108, 0, 0.12)", color: "#ef6c00" },
    [UPLOAD_STATUS.PENDING]: { background: "#f3f4f5", color: "var(--primary)" }
  }[normalized];
}

function statusLabel(status) {
  const normalized = normalizeUploadStatus(status);
  return {
    [UPLOAD_STATUS.PENDING]: "Pending",
    [UPLOAD_STATUS.PROCESSING]: "Processing",
    [UPLOAD_STATUS.REVIEW_REQUIRED]: "Ready for Review",
    [UPLOAD_STATUS.APPROVED]: "Saved to DB",
    [UPLOAD_STATUS.FAILED]: "Failed"
  }[normalized];
}

export default async function UploadHistoryPage() {
  const uploads = await loadScopedUploads({
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
                      {normalizeUploadStatus(upload.status) === UPLOAD_STATUS.FAILED ? (
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
