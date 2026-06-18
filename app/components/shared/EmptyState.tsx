export default function EmptyState({ children, className = "empty-card" }) {
  return <p className={className}>{children}</p>;
}
