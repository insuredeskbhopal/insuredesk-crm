import Link from "next/link";
import Image from "next/image";

export default function BrandLogo({ href, className = "", compact = false, prefetch }) {
  const content = (
    <span className={`brand-logo ${compact ? "compact" : ""} ${className}`.trim()}>
      <Image
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
      <Link className="brand-logo-link" href={href} prefetch={prefetch}>
        {content}
      </Link>
    );
  }

  return content;
}
