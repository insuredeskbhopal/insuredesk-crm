"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export function showToast(message, type = "info") {
  if (typeof window !== "undefined" && typeof window.CustomEvent === "function") {
    window.dispatchEvent(
      new window.CustomEvent("crm-toast", {
        detail: { message, type },
      })
    );
  }
}

let confirmResolver = null;

export function confirmModal({
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
}) {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    confirmResolver = resolve;
    if (typeof window.CustomEvent === "function") {
      window.dispatchEvent(
        new window.CustomEvent("crm-confirm", {
          detail: { title, message, confirmText, cancelText, danger },
        })
      );
    } else {
      resolve(true);
    }
  });
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { toast: showToast, confirm: confirmModal };
  }
  return context;
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleCustomToast = (event) => {
      const { message, type } = event.detail || {};
      if (message) {
        addToast(message, type || "info");
      }
    };

    const handleCustomConfirm = (event) => {
      setConfirmDialog(event.detail);
    };

    window.addEventListener("crm-toast", handleCustomToast);
    window.addEventListener("crm-confirm", handleCustomConfirm);
    return () => {
      window.removeEventListener("crm-toast", handleCustomToast);
      window.removeEventListener("crm-confirm", handleCustomConfirm);
    };
  }, []);

  const addToast = useCallback((message, type = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 3800);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleConfirmResponse = (choice) => {
    setConfirmDialog(null);
    if (confirmResolver) {
      confirmResolver(choice);
      confirmResolver = null;
    }
  };

  return (
    <ToastContext.Provider value={{ toast: addToast, confirm: confirmModal }}>
      {children}
      {mounted && typeof document !== "undefined"
        ? createPortal(
            <>
              {/* Toasts Viewport */}
              <div
                className="crm-toast-container"
                style={{
                  position: "fixed",
                  bottom: 24,
                  right: 24,
                  zIndex: 99999,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  pointerEvents: "none",
                  maxWidth: 420,
                  width: "100%",
                }}
              >
                {toasts.map((item) => {
                  const isSuccess = item.type === "success";
                  const isError = item.type === "error";
                  const bg = isSuccess
                    ? "#065f46"
                    : isError
                    ? "#991b1b"
                    : "#0f172a";
                  const border = isSuccess
                    ? "#059669"
                    : isError
                    ? "#dc2626"
                    : "#334155";
                  const Icon = isSuccess
                    ? CheckCircle2
                    : isError
                    ? AlertTriangle
                    : Info;

                  return (
                    <div
                      key={item.id}
                      className="crm-toast-pill"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "12px 16px",
                        borderRadius: 10,
                        background: bg,
                        border: `1px solid ${border}`,
                        color: "#ffffff",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.35), 0 8px 10px -6px rgba(0, 0, 0, 0.25)",
                        fontSize: 13.5,
                        fontWeight: 500,
                        lineHeight: 1.4,
                        pointerEvents: "auto",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Icon size={18} style={{ flexShrink: 0, opacity: 0.95 }} />
                        <span>{item.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeToast(item.id)}
                        aria-label="Close notification"
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ffffff",
                          opacity: 0.75,
                          cursor: "pointer",
                          padding: 2,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Centered Modal Backdrop for Confirmation Dialogs */}
              {confirmDialog && (
                <div
                  className="crm-confirm-overlay"
                  style={{
                    position: "fixed",
                    inset: 0,
                    backgroundColor: "rgba(15, 23, 42, 0.45)",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                    zIndex: 100000,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 16,
                  }}
                  onClick={() => handleConfirmResponse(false)}
                >
                  <div
                    className="crm-confirm-card"
                    style={{
                      background: "#ffffff",
                      borderRadius: 12,
                      maxWidth: 440,
                      width: "100%",
                      padding: 24,
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
                      <div
                        style={{
                          padding: 8,
                          borderRadius: 10,
                          background: confirmDialog.danger ? "#fef2f2" : "#eff6ff",
                          color: confirmDialog.danger ? "#dc2626" : "#2563eb",
                        }}
                      >
                        <AlertTriangle size={24} />
                      </div>
                      <div>
                        <h3 style={{ margin: "0 0 6px 0", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                          {confirmDialog.title}
                        </h3>
                        <p style={{ margin: 0, fontSize: 13.5, color: "#64748b", lineHeight: 1.5 }}>
                          {confirmDialog.message}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => handleConfirmResponse(false)}
                        style={{
                          padding: "8px 16px",
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          background: "#ffffff",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#334155",
                          cursor: "pointer",
                        }}
                      >
                        {confirmDialog.cancelText || "Cancel"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmResponse(true)}
                        style={{
                          padding: "8px 16px",
                          borderRadius: 8,
                          border: "none",
                          background: confirmDialog.danger ? "#dc2626" : "#2563eb",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#ffffff",
                          cursor: "pointer",
                        }}
                      >
                        {confirmDialog.confirmText || "Confirm"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>,
            document.body
          )
        : null}
    </ToastContext.Provider>
  );
}
