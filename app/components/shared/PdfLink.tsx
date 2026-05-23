import { Download } from "lucide-react";

export default function PdfLink({
  href,
  className = "pdf-icon-link",
  title,
  ariaLabel,
  children
}) {
  return (
    <a className={className} href={href} title={title} aria-label={ariaLabel}>
      {children || <Download size={14} />}
    </a>
  );
}
