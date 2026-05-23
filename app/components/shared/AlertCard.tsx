import { AlertTriangle, CheckCircle, X } from "lucide-react";

export default function AlertCard({ alert, onDismiss }) {
  const isError = alert.type === "error";

  return (
    <section className={`alert-card ${alert.type || "info"}`} role={isError ? "alert" : "status"}>
      <div className="alert-icon">
        {isError ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
      </div>
      <div>
        <strong>{alert.title}</strong>
        <p>{alert.message}</p>
      </div>
      <button className="alert-dismiss" type="button" onClick={onDismiss} aria-label="Dismiss alert">
        <X size={15} />
      </button>
    </section>
  );
}

