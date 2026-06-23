import Link from "next/link";

export default function BrandLogo({ href, className = "", compact = false }) {
  const content = (
    <span className={`brand-logo ${compact ? "compact" : ""} ${className}`.trim()}>
      <img
        className="brand-logo-image"
        src="/brand/main-logo-wide.webp"
        alt="Bima Headquarter"
        width={1024}
        height={570}
      />
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
