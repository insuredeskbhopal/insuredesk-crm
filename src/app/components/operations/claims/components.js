import { Download, MessageSquarePlus, Trash2 } from "lucide-react";
import { formatDate, formatFileSize } from "./utils";

export function ClaimField({ field, value, onChange }) {
  const className = `claims-add-modal-field${field.type === "textarea" ? " claims-add-modal-wide" : ""}`;

  return (
    <label className={className}>
      <span>
        {field.label}
        {field.required ? " *" : ""}
      </span>
      {field.type === "select" ? (
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          value={value}
          placeholder={field.placeholder}
          rows={2}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          type={field.type || "text"}
          inputMode={field.inputMode}
          value={value}
          placeholder={field.placeholder}
          readOnly={field.readOnly}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

export function DocumentList({ documents, onRemove }) {
  if (!documents.length) {
    return <p className="claims-document-empty">No supporting documents uploaded.</p>;
  }

  return (
    <div className="claims-document-list">
      {documents.map((document) => (
        <div key={document.id} className="claims-document-item">
          <div>
            <strong>{document.name}</strong>
            <span>
              {document.fileName} - {formatFileSize(document.size)}
            </span>
          </div>
          <div className="claims-row-actions">
            <a href={document.dataUrl} download={document.fileName} aria-label={`Download ${document.name}`}>
              <Download size={15} />
            </a>
            {onRemove ? (
              <button
                type="button"
                onClick={() => onRemove(document.id)}
                aria-label={`Remove ${document.name}`}
              >
                <Trash2 size={15} />
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RemarkList({ remarks }) {
  if (!remarks.length) {
    return <p className="claims-document-empty">No remarks added yet.</p>;
  }

  return (
    <div className="claims-remark-list">
      {remarks.map((remark) => (
        <div key={remark.id} className="claims-remark-item">
          <strong>{remark.text}</strong>
          <span>
            {formatDate(remark.createdAt)}
            {remark.followUpDate ? ` | Follow-up ${formatDate(remark.followUpDate)}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RecentRemarkList({ remarks }) {
  const latestRemarks = (remarks || []).slice(0, 2);

  if (!latestRemarks.length) {
    return <p className="claims-document-empty">No remarks added yet.</p>;
  }

  return (
    <div className="claims-recent-remark-list">
      {latestRemarks.map((remark, index) => (
        <article key={remark.id} className="claims-recent-remark-card">
          <div className="claims-recent-remark-top">
            <span>{index === 0 ? "Latest" : "Previous"}</span>
            <time>{formatDate(remark.createdAt)}</time>
          </div>
          <p>{remark.text}</p>
          {remark.followUpDate ? (
            <strong>
              <MessageSquarePlus size={13} /> Follow-up {formatDate(remark.followUpDate)}
            </strong>
          ) : null}
        </article>
      ))}
    </div>
  );
}
