"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { Trash2, X } from "lucide-react";
import { RecentRemarkList } from "./components";

function ModalCloseButton({ onClick, label }) {
  return (
    <button type="button" className="claims-action-modal__close" onClick={onClick} aria-label={label}>
      <X size={20} />
    </button>
  );
}

export function ClaimRemarkModal({
  claim,
  remark,
  followUpDate,
  isSaving,
  onRemarkChange,
  onFollowUpDateChange,
  onClose,
  onSave,
}) {
  if (typeof document === "undefined" || !claim) return null;

  return createPortal(
    <div className="tb-modal-backdrop claims-action-modal-backdrop" onClick={onClose}>
      <form
        className="claims-register-panel claims-remark-card claims-action-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-remark-modal-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={onSave}
      >
        <header className="claims-action-modal__header">
          <div className="claims-remark-modal-titlebar">
            <Image
              src="/brand/main-logo-wide.webp"
              alt="Bima Headquarter"
              width={133}
              height={74}
              className="claims-remark-modal-logo"
            />
            <div className="claims-remark-modal-titlecopy">
              <span className="claims-action-modal__eyebrow">Claim Follow-up</span>
              <h2 id="claim-remark-modal-title">{claim.claimNo || "Claim Follow-up"}</h2>
            </div>
          </div>
          <ModalCloseButton onClick={onClose} label="Close claim follow-up" />
        </header>

        <div className="claims-action-modal__body">
          <section className="claims-previous-remarks claims-recent-remarks">
            <div>
              <span className="claims-action-modal__eyebrow">Latest Remarks</span>
              <strong className="claims-action-modal__count">
                {(claim.remarks || []).length.toLocaleString("en-IN")} saved
              </strong>
            </div>
            <RecentRemarkList remarks={claim.remarks || []} />
          </section>

          <label className="claims-wide-field">
            <span className="claims-action-modal__eyebrow">Follow-up Remark *</span>
            <textarea
              value={remark}
              required
              rows={4}
              placeholder="Add today's update, pending document, insurer response, or next action"
              onChange={(event) => onRemarkChange(event.target.value)}
            />
          </label>

          <label className="claims-wide-field">
            <span className="claims-action-modal__eyebrow">Next Action Date</span>
            <input
              type="date"
              value={followUpDate}
              onChange={(event) => onFollowUpDateChange(event.target.value)}
            />
          </label>
        </div>

        <footer className="claims-action-modal__footer">
          <button type="button" className="claims-action-modal__button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="claims-action-modal__button claims-action-modal__button--primary"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Remark"}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}

export function ClaimDeleteModal({ claim, confirmation, isSaving, onConfirmationChange, onClose, onDelete }) {
  if (typeof document === "undefined" || !claim) return null;

  const isConfirmed = confirmation === "DELETE";
  const documentCount = claim.documentCount ?? claim.documents?.length ?? 0;
  const remarkCount = claim.remarkCount ?? claim.remarks?.length ?? 0;

  return createPortal(
    <div
      className="tb-modal-backdrop claims-action-modal-backdrop claims-action-modal-backdrop--delete"
      onClick={onClose}
    >
      <section
        className="claims-register-panel claims-delete-card claims-action-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-delete-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="claims-action-modal__header">
          <div className="claims-action-modal__titlebar">
            <Trash2 size={24} aria-hidden="true" />
            <div>
              <span className="claims-action-modal__eyebrow">Delete Claim</span>
              <h2 id="claim-delete-modal-title">Are you sure?</h2>
            </div>
          </div>
          <ModalCloseButton onClick={onClose} label="Close delete confirmation" />
        </header>

        <div className="claims-action-modal__body">
          <p>
            This will remove claim <strong>{claim.claimNo || claim.insuredName || "record"}</strong> from the
            database.
          </p>

          {documentCount || remarkCount ? (
            <div className="claims-action-modal__warning">
              <strong>Warning: This claim contains associated items that will also be deleted:</strong>
              <ul>
                {documentCount ? <li>{documentCount} Supporting Document(s)</li> : null}
                {remarkCount ? <li>{remarkCount} Remark &amp; Follow-up History Record(s)</li> : null}
              </ul>
            </div>
          ) : null}

          <label className="claims-action-modal__confirmation">
            <span>
              To confirm deletion, type <strong>DELETE</strong> in the box below:
            </span>
            <input
              type="text"
              value={confirmation}
              placeholder="Type DELETE"
              autoComplete="off"
              onChange={(event) => onConfirmationChange(event.target.value)}
            />
          </label>
        </div>

        <footer className="claims-action-modal__footer">
          <button type="button" className="claims-action-modal__button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="claims-action-modal__button claims-action-modal__button--danger"
            disabled={isSaving || !isConfirmed}
            onClick={() => onDelete(claim.id)}
          >
            {isSaving ? "Deleting..." : "Yes, Delete"}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
