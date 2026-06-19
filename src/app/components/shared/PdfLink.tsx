import { Download } from "lucide-react";
import { useCallback } from "react";

export default function PdfLink({ href, className = "pdf-icon-link", title, ariaLabel, children }) {
  const handleDownload = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        const res = await fetch(href, { credentials: "include" });
        if (!res.ok) {
          throw new Error("Failed to download PDF");
        }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const disposition = res.headers.get("Content-Disposition");
        const filename = disposition?.match(/filename\="?([^";]+)\"?/)?.[1] || "download.pdf";
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error(err);
      }
    },
    [href],
  );

  return (
    <a className={className} href={href} title={title} aria-label={ariaLabel} onClick={handleDownload}>
      {children || <Download size={14} />}
    </a>
  );
}
