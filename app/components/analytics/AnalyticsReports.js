import { useState, useEffect } from "react";
import KpiCard from "./KpiCard";
import ReportPanel from "./ReportPanel";
import ReportRow from "./ReportRow";
import { formatMoney } from "@/lib/analytics";
import InsurerLogo from "@/app/components/brand/InsurerLogo";

export default function AnalyticsReports({ analytics, onSelectReport }) {
  const [activeTab, setActiveTab] = useState("overview");

  const motorItem = analytics.policyFamilies.find((f) => f.label === "Motor Policy");
  const motorCount = motorItem ? motorItem.count : 0;

  const fireItem = analytics.policyFamilies.find((f) => f.label === "Fire Policy");
  const fireCount = fireItem ? fireItem.count : 0;

  const totalCount = analytics.policyFamilies.reduce((sum, item) => sum + item.count, 0);

  useEffect(() => {
    if (activeTab === "motor" && motorCount === 0) {
      setActiveTab("overview");
    } else if (activeTab === "fire" && fireCount === 0) {
      setActiveTab("overview");
    }
  }, [motorCount, fireCount, activeTab]);

  return (
    <div className="analytics-workspace">
      <div className="analytics-tabs">
        <button
          className={`analytics-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
          type="button"
        >
          General Overview
          <span className="tab-badge">{totalCount}</span>
        </button>
        {motorCount > 0 && (
          <button
            className={`analytics-tab-btn ${activeTab === "motor" ? "active" : ""}`}
            onClick={() => setActiveTab("motor")}
            type="button"
          >
            Motor Portfolio
            <span className="tab-badge">{motorCount}</span>
          </button>
        )}
        {fireCount > 0 && (
          <button
            className={`analytics-tab-btn ${activeTab === "fire" ? "active" : ""}`}
            onClick={() => setActiveTab("fire")}
            type="button"
          >
            Fire Portfolio
            <span className="tab-badge">{fireCount}</span>
          </button>
        )}
      </div>

      {activeTab === "overview" && (
        <>
          <section className="report-kpi-grid">
            {analytics.kpis.map((item) => (
              <KpiCard key={item.id} item={item} onClick={() => onSelectReport(item.report)} />
            ))}
          </section>

          <section className="analytics-chart-grid">
            <DonutReport
              title="Policy Families"
              subtitle="Distribution of policies by family type."
              items={analytics.policyFamilies}
              onSelect={onSelectReport}
            />
            <BarReport
              title="Premium by Family"
              subtitle="Premium value across policy families."
              items={analytics.familyPremium}
              max={analytics.maxFamilyPremium}
              valueType="money"
              onSelect={onSelectReport}
            />
            <DonutReport
              title="PDF Document Status"
              subtitle="With PDF vs missing PDF."
              items={analytics.pdfDistribution}
              onSelect={onSelectReport}
            />
            <DonutReport
              title="Renewal Buckets"
              subtitle="Upcoming and expired policies."
              items={analytics.renewals}
              onSelect={onSelectReport}
            />
            <BarReport
              title="Insurance Company"
              subtitle="Policy count by insurer. Click a bar for records."
              items={analytics.insurers}
              max={analytics.maxInsurerCount}
              compactInsurer
              horizontal
              onSelect={onSelectReport}
            />
            <BarReport
              title="Policy Type Mix"
              subtitle="Product/type distribution across all lines."
              items={analytics.policyTypes}
              max={analytics.maxPolicyTypeCount}
              onSelect={onSelectReport}
            />
          </section>
        </>
      )}

      {activeTab === "motor" && (
        <section className="analytics-chart-grid">
          <BarReport
            title="Vehicle Make"
            subtitle="Policy count by manufacturer/make."
            items={analytics.makeModels}
            max={analytics.maxMakeModelCount}
            onSelect={onSelectReport}
          />
          <BarReport
            title="Vehicle Type Mix"
            subtitle="Distribution of motor policy types."
            items={analytics.vehicleTypes}
            max={analytics.maxVehicleTypeCount}
            onSelect={onSelectReport}
          />
          <BarReport
            title="NCB Distribution"
            subtitle="No Claim Bonus bracket distribution."
            items={analytics.ncbBrackets}
            max={analytics.maxNcbBracketCount}
            onSelect={onSelectReport}
          />
        </section>
      )}

      {activeTab === "fire" && (
        <section className="analytics-chart-grid">
          <BarReport
            title="District Performance"
            subtitle="Policy count by district."
            items={analytics.districts}
            max={analytics.maxDistrictCount}
            onSelect={onSelectReport}
          />
          <BarReport
            title="Tehsil Performance"
            subtitle="Policy count by tehsil."
            items={analytics.tehsils}
            max={analytics.maxTehsilCount}
            onSelect={onSelectReport}
          />
          <BarReport
            title="Premium by District"
            subtitle="Premium value behind each district."
            items={analytics.districtPremium}
            max={analytics.maxDistrictPremium}
            valueType="money"
            onSelect={onSelectReport}
          />
        </section>
      )}

      <section className="report-grid">
        <ReportPanel title="Top Customers" subtitle="Click a customer to open their report.">
          {analytics.customers.map((item) => (
            <button className="report-row" type="button" key={item.id} onClick={() => onSelectReport(item.report)}>
              <span>{item.name}</span>
              <strong>{formatMoney(item.premiumTotal)}</strong>
              <small>{item.policies.length} polic{item.policies.length === 1 ? "y" : "ies"}</small>
            </button>
          ))}
        </ReportPanel>

        <ReportPanel title="High Value Policies" subtitle="Largest sum insured policies.">
          {analytics.highValuePolicies.map((item) => (
            <ReportRow key={item.id} item={item} onClick={() => onSelectReport(item.report)} />
          ))}
        </ReportPanel>

        <ReportPanel title="Data Quality" subtitle="Find records your team should clean.">
          {analytics.quality.map((item) => (
            <ReportRow key={item.id} item={item} onClick={() => onSelectReport(item.report)} />
          ))}
        </ReportPanel>
      </section>
    </div>
  );
}

function DonutReport({ title, subtitle, items, onSelect }) {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const gradient = buildDonutGradient(items);

  return (
    <section className="glass-panel report-panel chart-panel">
      <div>
        <p className="eyebrow">Pie Report</p>
        <h2>{title}</h2>
        <span>{subtitle}</span>
      </div>
      <div className="donut-report">
        <div className="donut-chart" style={{ background: gradient }}>
          <strong>{total}</strong>
          <span>Policies</span>
        </div>
        <div className="donut-legend">
          {items.map((item, index) => (
            <button type="button" key={item.id} onClick={() => onSelect(item.report)}>
              <i className={`chart-swatch swatch-${(index % 6) + 1}`} />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function BarReport({ title, subtitle, items, max, valueType = "count", compactInsurer = false, horizontal = false, onSelect }) {
  return (
    <section className={`glass-panel report-panel chart-panel ${horizontal ? "wide-chart-panel" : ""}`}>
      <div>
        <p className="eyebrow">Bar Report</p>
        <h2>{title}</h2>
        <span>{subtitle}</span>
      </div>
      <div className={`report-list ${horizontal ? "horizontal-scroll" : ""}`}>
        {items.map((item) => (
          <ReportBar key={item.id} item={item} max={max} valueType={valueType} compactInsurer={compactInsurer} onClick={() => onSelect(item.report)} />
        ))}
      </div>
    </section>
  );
}

function ReportBar({ item, max, valueType = "count", compactInsurer = false, onClick }) {
  const measure = valueType === "money" ? item.amount : item.count;
  const width = `${Math.max(4, (measure / Math.max(1, max)) * 100)}%`;
  const value = valueType === "money" ? formatMoney(item.amount) : item.count;
  const premium = item.amount ? formatMoney(item.amount) : "";

  return (
    <button className={`report-bar-row ${compactInsurer ? "compact-insurer-bar" : ""}`} type="button" title={item.label} onClick={onClick}>
      {compactInsurer ? (
        <span className="report-insurer-mark" aria-label={item.label}>
          <InsurerLogo company={item.label} showName={false} />
          <b>{getInsurerShortCode(item.label)}</b>
        </span>
      ) : (
        <span>{item.label}</span>
      )}
      <div><i style={{ width }} /></div>
      <strong>{value}</strong>
      <small>{compactInsurer ? premium : item.hint}</small>
    </button>
  );
}

function getInsurerShortCode(label = "") {
  const text = String(label || "").toUpperCase();
  if (/NEW\s+INDIA/.test(text)) return "NIA";
  if (/IFFCO/.test(text)) return "IFFCO";
  if (/TATA\s*AIG/.test(text)) return "TATA";
  if (/HDFC/.test(text)) return "HDFC";
  if (/ICICI/.test(text)) return "ICICI";
  if (/BAJAJ/.test(text)) return "BAJAJ";
  if (/ROYAL\s+SUNDARAM/.test(text)) return "RSA";
  if (/GENERALI/.test(text)) return "FG";
  if (/GO\s*DIGIT|DIGIT/.test(text)) return "DIGIT";
  if (/SBI/.test(text)) return "SBI";
  if (/UNITED\s+INDIA/.test(text)) return "UIIC";
  if (/ORIENTAL/.test(text)) return "OIC";
  if (/NATIONAL/.test(text)) return "NIC";
  const words = text
    .replace(/\b(?:THE|GENERAL|INSURANCE|COMPANY|LIMITED|LTD|CO)\b/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (words.map((word) => word[0]).join("") || "INS").slice(0, 5);
}

function buildDonutGradient(items) {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (!total) return "conic-gradient(var(--surface-highest) 0 100%)";

  const colors = ["#191c1d", "#74777f", "#c4c6cf", "#e1e3e4", "#a7abb3", "#5f6368"];
  let start = 0;
  const parts = items.map((item, index) => {
    const end = start + (Number(item.value || 0) / total) * 100;
    const part = `${colors[index % colors.length]} ${start}% ${end}%`;
    start = end;
    return part;
  });

  return `conic-gradient(${parts.join(", ")})`;
}
