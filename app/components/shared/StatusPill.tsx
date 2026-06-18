// TODO: Wire this into status displays after upload component extraction is stable.
export default function StatusPill({ children, className = "status-pill" }) {
  return <span className={className}>{children}</span>;
}
