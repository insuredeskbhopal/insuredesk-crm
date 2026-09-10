import Link from "next/link";
import Image from "next/image";

export default function BrandLogo({ href, className = "", compact = false, variant = "default", prefetch }) {
  const isWhite = variant === "white" || variant === "light";
  const content = (
    <span className={`brand-logo ${compact ? "compact" : ""} ${isWhite ? "brand-logo-white" : ""} ${className}`.trim()}>
      <Image
        className="brand-logo-image"
        src={isWhite ? "/brand/white-logo.webp" : "/brand/main-logo-wide.webp"}
        alt="Bima Headquarter"
        width={isWhite ? 1382 : 1024}
        height={isWhite ? 763 : 570}
        unoptimized
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
