"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

export default function CompaniesViewPage() {
  const router = useRouter();
  const [companyData, setCompanyData] = useState([]);
  const [loading, setLoading] = useState(true);

  const targetCompanies = [
    "ICICI Lombard",
    "TATA AIG",
    "New India",
    "IFFCO Tokio",
    "HDFC ERGO",
    "Bajaj Allianz",
    "Royal Sundaram",
    "Future Generali",
    "Digit",
    "SBI General",
    "Universal Sompo",
  ];

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/renewals/companies", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data.companyStats) {
          // Normalize and map results
          const mapped = targetCompanies.map((name) => {
            // Find match in SQL result
            const match = data.companyStats.find((row) =>
              String(row.company || "")
                .toLowerCase()
                .includes(name.toLowerCase()),
            );
            return {
              name,
              total: match ? match.total : 0,
              due: match ? match.due : 0,
              renewed: match ? match.renewed : 0,
              lost: match ? match.lost : 0,
            };
          });
          setCompanyData(mapped);
        }
      } catch (error) {
        console.error("Failed to load company stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  const handleCardClick = (companyName) => {
    router.push(`/dashboard/renewals/customers?company=${encodeURIComponent(companyName)}`);
  };

  const renderCompanyLogo = (name) => {
    const logos = {
      "ICICI Lombard": "/logo/icici-lombard-general-insurance.svg",
      "TATA AIG": "/logo/tata-aig-general-insurance.png",
      "New India": "/logo/new-india-assurance.svg",
      "IFFCO Tokio": "/logo/iffco-tokio-general-insurance.svg",
      "HDFC ERGO": "/logo/hdfc-ergo-general-insurance.svg",
      "Bajaj Allianz": "/logo/bajaj-allianz-general-insurance.svg",
      "Royal Sundaram": "/logo/royal-sundaram-general-insurance.png",
      "Future Generali": "/logo/future-generali-logo.png",
      "SBI General": "/logo/sbi-general-insurance.png",
    };

    const src = logos[name];
    if (src) {
      return (
        <div
          style={{
            width: "36px",
            height: "36px",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
            borderRadius: "8px",
            border: "1px solid rgba(25,28,29,0.06)",
            overflow: "hidden",
            padding: "2px",
            flexShrink: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        </div>
      );
    }

    if (name === "Digit") {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            backgroundColor: "#3a3a3c",
            color: "#ff8c00",
            borderRadius: "8px",
            fontWeight: "900",
            fontSize: "11px",
            letterSpacing: "-0.5px",
            flexShrink: 0,
          }}
        >
          digit
        </div>
      );
    }

    if (name === "Universal Sompo") {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            backgroundColor: "#1e3a8a",
            color: "#ffffff",
            borderRadius: "8px",
            fontWeight: "900",
            fontSize: "8px",
            textAlign: "center",
            lineHeight: "1.0",
            border: "1px solid #3b82f6",
            padding: "1px",
            flexShrink: 0,
          }}
        >
          <span>UNI</span>
          <span>SOMPO</span>
        </div>
      );
    }

    return (
      <div
        style={{
          padding: "8px",
          borderRadius: "8px",
          backgroundColor: "var(--rn-border-light)",
          color: "var(--rn-text-secondary)",
          width: "36px",
          height: "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Building2 size={18} />
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
        <p>Loading company stats...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="renewals-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {companyData.map((company) => (
          <div key={company.name} className="renewals-card" onClick={() => handleCardClick(company.name)}>
            <div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
                {renderCompanyLogo(company.name)}
                <h4
                  style={{ fontSize: "16px", fontWeight: "600", margin: 0, color: "var(--rn-text-primary)" }}
                >
                  {company.name}
                </h4>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
                <div>
                  <span
                    style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--rn-text-muted)" }}
                  >
                    Total Policies
                  </span>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--rn-text-primary)" }}>
                    {company.total}
                  </div>
                </div>
                <div>
                  <span
                    style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--rn-text-muted)" }}
                  >
                    Policies Due
                  </span>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--rn-warning)" }}>
                    {company.due}
                  </div>
                </div>
                <div>
                  <span
                    style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--rn-text-muted)" }}
                  >
                    Renewed
                  </span>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--rn-success)" }}>
                    {company.renewed}
                  </div>
                </div>
                <div>
                  <span
                    style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--rn-text-muted)" }}
                  >
                    Lost
                  </span>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--rn-danger)" }}>
                    {company.lost}
                  </div>
                </div>
              </div>
            </div>
            <p className="renewals-card-footer" style={{ margin: "16px 0 0 0" }}>
              Click to view all {company.name} policies
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
