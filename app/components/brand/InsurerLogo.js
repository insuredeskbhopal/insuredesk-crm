import Image from "next/image";
import { getInsurerLogo } from "./logoAssets";

export default function InsurerLogo({ company, className = "", showName = true }) {
  const logo = getInsurerLogo(company);
  const label = company || logo?.name || "Insurance company";

  if (!logo) {
    return <span className={className}>{label || "-"}</span>;
  }

  return (
    <span className={`insurer-logo ${logo.className || ""} ${className}`.trim()} title={label}>
      <Image unoptimized src={logo.src} alt={`${logo.name} logo`} width={96} height={36} />
      {showName ? <span>{label}</span> : null}
    </span>
  );
}
