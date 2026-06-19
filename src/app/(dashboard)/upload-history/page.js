export const dynamic = "force-dynamic";

/* global URLSearchParams */
import PageHeader from "@/app/components/layout/PageHeader";
import { loadScopedUploads } from "@/lib/records/scoped-data";
import { normalizeUploadStatus, UPLOAD_STATUS } from "@/lib/uploads/status";

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
      minute: "2-digit",
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
    [UPLOAD_STATUS.PENDING]: { background: "#f3f4f5", color: "var(--primary)" },
  }[normalized];
}

function statusLabel(status) {
  const normalized = normalizeUploadStatus(status);
  return {
    [UPLOAD_STATUS.PENDING]: "Pending",
    [UPLOAD_STATUS.PROCESSING]: "Processing",
    [UPLOAD_STATUS.REVIEW_REQUIRED]: "Ready for Review",
    [UPLOAD_STATUS.APPROVED]: "Saved to DB",
    [UPLOAD_STATUS.FAILED]: "Failed",
  }[normalized];
}

function getPageNumbers(currentPage, totalPages) {
  const pages = [];
  const maxVisible = 5;
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }
  return pages;
}

export default async function UploadHistoryPage(props) {
  const searchParams = await props.searchParams;
  const page = parseInt(searchParams.page || "1", 10);
  const limit = parseInt(searchParams.limit || "20", 10);
  const q = searchParams.q || "";

  const { uploads, totalCount, totalPages } = await loadScopedUploads({
    page,
    limit,
    q,
    select: {
      id: true,
      sourceFile: true,
      sizeBytes: true,
      status: true,
      createdAt: true,
      errorMessage: true,
    },
  });
  const pageHref = (targetPage) => {
    const params = new URLSearchParams();
    if (targetPage > 1) params.set("page", String(targetPage));
    if (limit !== 20) params.set("limit", String(limit));
    if (q) params.set("q", q);
    const query = params.toString();
    return query ? `?${query}` : "?";
  };

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
                    <td>
                      <strong>{upload.sourceFile}</strong>
                    </td>
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div
            className="table-pagination"
            style={{
              marginTop: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 24px",
              borderTop: "1px solid var(--border, #e2e8f0)",
            }}
          >
            <span style={{ fontSize: "14px", color: "var(--text-secondary, #64748b)" }}>
              Showing page {page} of {totalPages} ({totalCount} uploads found)
            </span>
            <div className="table-page-list" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {page > 1 ? (
                <a
                  href={pageHref(page - 1)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border, #cbd5e1)",
                    textDecoration: "none",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                  }}
                >
                  Prev
                </a>
              ) : (
                <span
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border, #cbd5e1)",
                    color: "var(--text-secondary, #cbd5e1)",
                    fontSize: "14px",
                    cursor: "not-allowed",
                  }}
                >
                  Prev
                </span>
              )}
              {getPageNumbers(page, totalPages).map((pNum, index) =>
                pNum === "..." ? (
                  <span
                    key={`ellipsis-${index}`}
                    style={{ padding: "0 8px", color: "var(--text-secondary, #64748b)" }}
                  >
                    ...
                  </span>
                ) : (
                  <a
                    key={pNum}
                    href={pageHref(pNum)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border, #cbd5e1)",
                      background: page === pNum ? "var(--primary, #1e3a8a)" : "#ffffff",
                      color: page === pNum ? "#ffffff" : "var(--text-primary, #0f172a)",
                      textDecoration: "none",
                      fontSize: "14px",
                      fontWeight: page === pNum ? "bold" : "normal",
                    }}
                  >
                    {pNum}
                  </a>
                ),
              )}
              {page < totalPages ? (
                <a
                  href={pageHref(page + 1)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border, #cbd5e1)",
                    textDecoration: "none",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                  }}
                >
                  Next
                </a>
              ) : (
                <span
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border, #cbd5e1)",
                    color: "var(--text-secondary, #cbd5e1)",
                    fontSize: "14px",
                    cursor: "not-allowed",
                  }}
                >
                  Next
                </span>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
