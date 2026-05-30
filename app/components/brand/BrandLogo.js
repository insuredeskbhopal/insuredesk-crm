import Link from "next/link";

export default function BrandLogo({ href, className = "", compact = false }) {
  const content = (
    <span className={`brand-logo ${compact ? "compact" : ""} ${className}`.trim()}>
      <span className="brand-logo-mark" aria-hidden="true">BH</span>
      {!compact ? <span className="brand-logo-text">BIMAHEADQUARTER</span> : null}
    </span>
  );

  if (href) {
    return (
      <Link className="brand-logo-link" href={href}>
        {content}
      </Link>
    );
  }

  return content;
}
