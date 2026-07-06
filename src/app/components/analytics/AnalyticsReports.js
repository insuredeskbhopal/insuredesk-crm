"use client";

import { useState, useMemo, useEffect } from "react";
import { Calendar, Briefcase, Car, TrendingUp, Layers, X, AlertCircle } from "lucide-react";

// Bezier Curve generator for smooth path strings
function getBezierPath(points) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cp1x = curr.x + (next.x - curr.x) / 3;
    const cp1y = curr.y;
    const cp2x = curr.x + 2 * (next.x - curr.x) / 3;
    const cp2y = next.y;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }
  return d;
}

export default function AnalyticsReports({ records = [], onEditRecord }) {
  const [activeTab, setActiveTab] = useState("motor-report");
  const [selectedAgent, setSelectedAgent] = useState("all");
  
  // Date Filters
  const [datePreset, setDatePreset] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // Monthly Report Modal States
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedPolicyType, setSelectedPolicyType] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Helper to determine if a record is Motor LOB
  const isMotorRecord = (record) => {
    const type = String(record.policyType || "").toLowerCase();
    const desc = String(record.description || "").toLowerCase();
    const file = String(record.sourceFile || "").toLowerCase();
    const comp = String(record.insuranceCompany || "").toLowerCase();
    const haystack = `${type} ${desc} ${file} ${comp}`;

    return (
      record.vehicleNumber ||
      record.registrationNumber ||
      record.engineNumber ||
      record.chassisNumber ||
      /\b(motor|private car|two wheeler|bike|scooter|commercial vehicle|taxi|cab|bus|chassis|engine)\b/.test(haystack)
    );
  };

  // Helper to extract upload/created date object safely
  const getUploadDate = (record) => {
    const dateStr = record.uploadedAt || record.savedAt || record.createdAt;
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Format date to DD/MM/YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const str = String(dateStr).trim();
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      return `${slashMatch[1].padStart(2, "0")}/${slashMatch[2].padStart(2, "0")}/${slashMatch[3]}`;
    }
    try {
      const d = new Date(str);
      if (isNaN(d.getTime())) return str;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return str;
    }
  };

  // Helper to parse numbers safely
  const parsePremium = (value) => {
    if (typeof value === "number") return value;
    const cleaned = String(value || "").replace(/[^0-9.]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Format money back
  const formatPremium = (value) => {
    return Math.round(value).toLocaleString("en-IN");
  };

  // Filter records by LOB family (Motor only)
  const motorRecords = useMemo(() => {
    return records.filter(isMotorRecord);
  }, [records]);

  // Filter records by LOB family (Warehouse / Non-Motor only)
  const warehouseRecords = useMemo(() => {
    return records.filter((r) => !isMotorRecord(r));
  }, [records]);

  // Extract unique agents from the list of records
  const uniqueAgents = useMemo(() => {
    const agents = new Set();
    records.forEach((r) => {
      const agentName = r.createdBy || r.assignedTo || "System";
      if (agentName) agents.add(agentName);
    });
    return Array.from(agents).sort((a, b) => a.localeCompare(b));
  }, [records]);

  // Generate range boundaries based on preset value
  const getPresetRange = (preset) => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    switch (preset) {
      case "today":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "yesterday":
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case "last-3-days":
        start.setDate(now.getDate() - 2);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "this-week": {
        const day = now.getDay();
        start.setDate(now.getDate() - day);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case "last-week": {
        const day = now.getDay();
        start.setDate(now.getDate() - day - 7);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - day - 1);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case "this-month":
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "last-month":
        start.setMonth(now.getMonth() - 1);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(now.getMonth());
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case "last-3-months":
        start.setMonth(now.getMonth() - 3);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "last-6-months":
        start.setMonth(now.getMonth() - 6);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "this-year":
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "last-year":
        start.setFullYear(now.getFullYear() - 1, 0, 1);
        start.setHours(0, 0, 0, 0);
        end.setFullYear(now.getFullYear() - 1, 11, 31);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        return null;
    }
    return { start, end };
  };

  // Apply filters: tab, agent, and date presets/custom limits (filtering by upload date)
  const filteredRecords = useMemo(() => {
    let list = activeTab === "warehouse-report" ? warehouseRecords : motorRecords;

    // Agent filter
    if (activeTab === "motor-individual" && selectedAgent !== "all") {
      list = list.filter((r) => (r.createdBy || r.assignedTo || "System") === selectedAgent);
    }

    // Date range filter
    if (datePreset !== "all") {
      let startLimit = null;
      let endLimit = null;

      if (datePreset === "custom") {
        if (startDateFilter) startLimit = new Date(startDateFilter + "T00:00:00");
        if (endDateFilter) endLimit = new Date(endDateFilter + "T23:59:59");
      } else {
        const range = getPresetRange(datePreset);
        if (range) {
          startLimit = range.start;
          endLimit = range.end;
        }
      }

      list = list.filter((r) => {
        const uploadDate = getUploadDate(r);
        if (!uploadDate) return false;
        if (startLimit && uploadDate < startLimit) return false;
        if (endLimit && uploadDate > endLimit) return false;
        return true;
      });
    }

    return list;
  }, [activeTab, selectedAgent, motorRecords, warehouseRecords, datePreset, startDateFilter, endDateFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedAgent, datePreset, startDateFilter, endDateFilter]);

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRecords.slice(startIndex, startIndex + pageSize);
  }, [filteredRecords, currentPage]);

  const pageNumbers = useMemo(() => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      
      if (currentPage <= 3) {
        end = 4;
      }
      if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }
      
      if (start > 2) {
        pages.push("...");
      }
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      
      if (end < totalPages - 1) {
        pages.push("...");
      }
      
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    return pages;
  }, [currentPage, totalPages]);

  // Sum premium and net premium for the filtered list (entire filtered dataset)
  const totals = useMemo(() => {
    let premiumSum = 0;
    let netPremiumSum = 0;
    filteredRecords.forEach((r) => {
      premiumSum += parsePremium(r.premium || r.totalPremium);
      netPremiumSum += parsePremium(r.netPremium);
    });
    return {
      premium: premiumSum,
      netPremium: netPremiumSum,
    };
  }, [filteredRecords]);

  // Reset agent dropdown filter if tab changes to individual
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    if (tabName === "motor-individual" && selectedAgent === "all" && uniqueAgents.length > 0) {
      setSelectedAgent(uniqueAgents[0]);
    }
  };

  const clearDateFilters = () => {
    setStartDateFilter("");
    setEndDateFilter("");
  };

  const uniqueDatesCount = useMemo(() => {
    const dates = new Set();
    filteredRecords.forEach((r) => {
      const uploadDate = r.uploadedAt || r.savedAt || r.createdAt;
      if (uploadDate) {
        dates.add(formatDate(uploadDate));
      }
    });
    return dates.size;
  }, [filteredRecords]);

  // --- Line Chart Data Generation (Daily or Hourly Upload Premium Trend) ---
  const lineChartData = useMemo(() => {
    if (filteredRecords.length === 0) return [];

    // If all records are from a single unique upload date, generate hourly trend
    if (uniqueDatesCount === 1) {
      const hourlyPremium = {};
      filteredRecords.forEach((r) => {
        const uploadDate = getUploadDate(r);
        if (!uploadDate) return;
        const hour = uploadDate.getHours();
        hourlyPremium[hour] = (hourlyPremium[hour] || 0) + parsePremium(r.premium || r.totalPremium);
      });

      const activeHours = Object.keys(hourlyPremium).map(Number).sort((a, b) => a - b);
      let hoursToShow = [];
      if (activeHours.length > 0) {
        const minH = Math.max(0, activeHours[0] - 1);
        const maxH = Math.min(23, activeHours[activeHours.length - 1] + 1);
        for (let h = minH; h <= maxH; h++) {
          hoursToShow.push(h);
        }
      } else {
        hoursToShow = [9, 11, 13, 15, 17, 19];
      }

      return hoursToShow.map((h) => {
        const displayHour = h === 0 ? "12 AM" : h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`;
        return {
          label: displayHour,
          value: hourlyPremium[h] || 0,
          rawDate: null,
        };
      });
    }

    // Otherwise, generate daily trend
    const dailyPremium = {};
    filteredRecords.forEach((r) => {
      const uploadDate = r.uploadedAt || r.savedAt || r.createdAt;
      if (!uploadDate) return;
      
      const cleanDate = formatDate(uploadDate);
      const parts = cleanDate.split("/");
      const sortKey = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : cleanDate;
      dailyPremium[sortKey] = (dailyPremium[sortKey] || 0) + parsePremium(r.premium || r.totalPremium);
    });

    const sortedSortKeys = Object.keys(dailyPremium).sort();
    const last7Keys = sortedSortKeys.slice(-7);

    return last7Keys.map((sortKey) => {
      const parts = sortKey.split("-");
      const displayLabel = parts.length === 3 ? `${parts[2]}/${parts[1]}` : sortKey;
      return {
        label: displayLabel,
        value: dailyPremium[sortKey],
        rawDate: sortKey,
      };
    });
  }, [filteredRecords, uniqueDatesCount]);

  const svgWidth = 500;
  const svgHeight = 160;
  const graphPadding = 30;

  const graphPoints = useMemo(() => {
    if (lineChartData.length === 0) return [];
    const maxVal = Math.max(...lineChartData.map((d) => d.value), 1000);
    const stepX = (svgWidth - graphPadding * 2) / Math.max(1, lineChartData.length - 1);

    return lineChartData.map((d, index) => {
      const x = graphPadding + index * stepX;
      const y = svgHeight - graphPadding - (d.value / maxVal) * (svgHeight - graphPadding * 2);
      return { x, y, label: d.label, value: d.value, rawDate: d.rawDate };
    });
  }, [lineChartData]);

  const linePathD = useMemo(() => {
    return getBezierPath(graphPoints);
  }, [graphPoints]);

  const areaPathD = useMemo(() => {
    if (graphPoints.length === 0) return "";
    const startX = graphPoints[0].x;
    const endX = graphPoints[graphPoints.length - 1].x;
    const groundY = svgHeight - graphPadding;
    return `${linePathD} L ${endX} ${groundY} L ${startX} ${groundY} Z`;
  }, [graphPoints, linePathD]);

  // Click on a specific graph node to apply that date filter
  const handlePointClick = (rawDate) => {
    if (!rawDate) return;
    setDatePreset("custom");
    setStartDateFilter(rawDate);
    setEndDateFilter(rawDate);
  };

  // --- Bar Chart Data Generation (Top Insurers by Premium) ---
  const barChartData = useMemo(() => {
    const insurerPremium = {};
    filteredRecords.forEach((r) => {
      const insurer = r.insuranceCompany || "Unknown";
      insurerPremium[insurer] = (insurerPremium[insurer] || 0) + parsePremium(r.premium || r.totalPremium);
    });

    return Object.entries(insurerPremium)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredRecords]);

  const maxInsurerPremium = useMemo(() => {
    return Math.max(...barChartData.map((d) => d.value), 1);
  }, [barChartData]);

  // --- Donut Chart Data Generation (Policy Type Mix) ---
  const donutChartData = useMemo(() => {
    const typeCounts = {};
    filteredRecords.forEach((r) => {
      const type = r.policyType || "Unknown";
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const sorted = Object.entries(typeCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const top3 = sorted.slice(0, 3);
    const otherCount = sorted.slice(3).reduce((sum, item) => sum + item.value, 0);

    if (otherCount > 0) {
      top3.push({ label: "Others", value: otherCount });
    }

    return top3;
  }, [filteredRecords]);

  const donutGradient = useMemo(() => {
    const total = donutChartData.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return "conic-gradient(#cbd5e1 0 100%)";

    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
    let startPercent = 0;
    const sections = donutChartData.map((item, index) => {
      const endPercent = startPercent + (item.value / total) * 100;
      const part = `${colors[index % colors.length]} ${startPercent}% ${endPercent}%`;
      startPercent = endPercent;
      return part;
    });

    return `conic-gradient(${sections.join(", ")})`;
  }, [donutChartData]);

  // Get available months dynamically from records to populate dropdown
  const monthOptions = useMemo(() => {
    const monthsMap = {};
    records.forEach((r) => {
      const uploadDate = getUploadDate(r);
      if (!uploadDate) return;
      const year = uploadDate.getFullYear();
      const month = uploadDate.getMonth(); // 0-indexed
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      const label = uploadDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      monthsMap[key] = label;
    });

    if (Object.keys(monthsMap).length === 0) {
      const options = [];
      const current = new Date();
      for (let i = 0; i < 12; i++) {
        const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
        options.push({ value: key, label });
      }
      return options;
    }

    return Object.entries(monthsMap)
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => b.value.localeCompare(a.value));
  }, [records]);

  // Filters for monthly report
  const monthlyFilteredRecords = useMemo(() => {
    if (!selectedMonth || !selectedPolicyType) return [];

    const [yearStr, monthStr] = selectedMonth.split("-");
    const targetYear = parseInt(yearStr, 10);
    const targetMonth = parseInt(monthStr, 10) - 1;

    return records.filter((r) => {
      const uploadDate = getUploadDate(r);
      if (!uploadDate) return false;
      if (uploadDate.getFullYear() !== targetYear || uploadDate.getMonth() !== targetMonth) {
        return false;
      }

      if (selectedPolicyType === "motor") {
        return isMotorRecord(r);
      } else if (selectedPolicyType === "warehouse") {
        return !isMotorRecord(r);
      }
      return true;
    });
  }, [records, selectedMonth, selectedPolicyType]);

  const monthlyTotals = useMemo(() => {
    let totalNet = 0;
    let totalGross = 0;
    monthlyFilteredRecords.forEach((r) => {
      totalNet += parsePremium(r.netPremium);
      totalGross += parsePremium(r.premium || r.totalPremium);
    });
    return {
      netPremium: totalNet,
      grossPremium: totalGross,
      count: monthlyFilteredRecords.length
    };
  }, [monthlyFilteredRecords]);

  const companySummary = useMemo(() => {
    const summary = {};
    monthlyFilteredRecords.forEach((r) => {
      const company = r.insuranceCompany || "Unknown Insurer";
      if (!summary[company]) {
        summary[company] = {
          count: 0,
          netPremium: 0,
          grossPremium: 0,
        };
      }
      summary[company].count += 1;
      summary[company].netPremium += parsePremium(r.netPremium);
      summary[company].grossPremium += parsePremium(r.premium || r.totalPremium);
    });

    return Object.entries(summary)
      .map(([name, data]) => ({
        name,
        ...data,
      }))
      .sort((a, b) => b.netPremium - a.netPremium);
  }, [monthlyFilteredRecords]);

  const relativeAnalysis = useMemo(() => {
    let motorCount = 0;
    let motorNetPremium = 0;
    let motorGrossPremium = 0;
    const motorCompanies = new Set();

    let warehouseCount = 0;
    let warehouseNetPremium = 0;
    let warehouseGrossPremium = 0;
    const warehouseCompanies = new Set();

    monthlyFilteredRecords.forEach((r) => {
      const isMotor = isMotorRecord(r);
      const netPrem = parsePremium(r.netPremium);
      const grossPrem = parsePremium(r.premium || r.totalPremium);
      const comp = r.insuranceCompany;

      if (isMotor) {
        motorCount++;
        motorNetPremium += netPrem;
        motorGrossPremium += grossPrem;
        if (comp) motorCompanies.add(comp);
      } else {
        warehouseCount++;
        warehouseNetPremium += netPrem;
        warehouseGrossPremium += grossPrem;
        if (comp) warehouseCompanies.add(comp);
      }
    });

    return {
      motor: {
        count: motorCount,
        netPremium: motorNetPremium,
        grossPremium: motorGrossPremium,
        avgNet: motorCount > 0 ? Math.round(motorNetPremium / motorCount) : 0,
        companies: Array.from(motorCompanies).slice(0, 3).join(", ") || "None",
      },
      warehouse: {
        count: warehouseCount,
        netPremium: warehouseNetPremium,
        grossPremium: warehouseGrossPremium,
        avgNet: warehouseCount > 0 ? Math.round(warehouseNetPremium / warehouseCount) : 0,
        companies: Array.from(warehouseCompanies).slice(0, 3).join(", ") || "None",
      }
    };
  }, [monthlyFilteredRecords]);

  const fieldCompleteness = useMemo(() => {
    const motorRecordsFiltered = monthlyFilteredRecords.filter(isMotorRecord);
    const warehouseRecordsFiltered = monthlyFilteredRecords.filter((r) => !isMotorRecord(r));

    const motorFieldsList = [
      { name: "Vehicle Number", key: "vehicleNumber" },
      { name: "Make / Model", key: "makeModel" },
      { name: "Engine Number", key: "engineNumber" },
      { name: "Chassis Number", key: "chassisNumber" },
      { name: "IDV (Sum Insured)", key: "idv" },
      { name: "NCB (%)", key: "ncb" },
      { name: "Fuel Type", key: "fuelType" },
    ];

    const warehouseFieldsList = [
      { name: "Risk Location (Premises)", key: "premisesAddress" },
      { name: "Business Description", key: "businessDescription" },
      { name: "Sum Insured", key: "sumInsured" },
      { name: "Occupancy Type", key: "occupancy" },
      { name: "Burglary Sum Insured", key: "burglarySumInsured" },
      { name: "Fidelity Sum Insured", key: "fidelitySumInsured" },
    ];

    const calculateFillRate = (recordsList, fieldsList) => {
      if (recordsList.length === 0) return [];
      return fieldsList.map(field => {
        let filledCount = 0;
        recordsList.forEach(r => {
          const val = r[field.key];
          if (val && String(val).trim() !== "" && String(val) !== "N/A" && String(val) !== "0") {
            filledCount++;
          }
        });
        return {
          name: field.name,
          fillRate: Math.round((filledCount / recordsList.length) * 100),
          filledCount,
          totalCount: recordsList.length
        };
      });
    };

    return {
      motor: calculateFillRate(motorRecordsFiltered, motorFieldsList),
      warehouse: calculateFillRate(warehouseRecordsFiltered, warehouseFieldsList)
    };
  }, [monthlyFilteredRecords]);

  const isIndividualTab = activeTab === "motor-individual";

  return (
    <div className="reports-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .reports-container {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          background: var(--surface-low, #fcfdfd);
        }

        .tabs-and-filters-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #ffffff;
          padding: 16px 24px;
          border: 1px solid var(--border-soft, #e2e8f0);
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.01);
          flex-wrap: wrap;
          gap: 16px;
        }

        .segmented-control {
          display: flex;
          background: var(--surface-variant, #f1f5f9);
          padding: 4px;
          border-radius: 12px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
        }

        .tab-btn {
          padding: 8px 20px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: var(--text-secondary, #64748b);
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .tab-btn:hover {
          color: var(--text-primary, #0f172a);
        }

        .tab-btn.active {
          background: #ffffff;
          color: var(--text-primary, #0f172a);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .filters-row {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: center;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary, #64748b);
        }

        .filter-input {
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid var(--border, #cbd5e1);
          background: #ffffff;
          color: var(--text-primary, #0f172a);
          font-size: 13px;
          font-weight: 600;
          outline: none;
          min-width: 140px;
        }

        .filter-select {
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid var(--border, #cbd5e1);
          background: #ffffff;
          color: var(--text-primary, #0f172a);
          font-size: 13px;
          font-weight: 600;
          outline: none;
          cursor: pointer;
          min-width: 160px;
        }

        .clear-btn {
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: var(--text-secondary, #64748b);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .clear-btn:hover {
          background: #f1f5f9;
          color: var(--text-primary, #0f172a);
        }

        /* Chart Dashboard Grid */
        .reports-charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
          margin-bottom: 8px;
        }

        .chart-card {
          background: #ffffff;
          border: 1px solid var(--border-soft, #e2e8f0);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.01), 0 2px 4px -2px rgba(0, 0, 0, 0.01);
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-height: 230px;
        }

        .chart-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chart-title {
          font-size: 13px;
          font-weight: 800;
          color: var(--text-primary, #0f172a);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        /* Donut Chart styles */
        .donut-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          height: 100%;
        }

        .donut-chart-circle {
          position: relative;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.03);
          flex-shrink: 0;
        }

        .donut-hole {
          position: absolute;
          width: 80px;
          height: 80px;
          background: #ffffff;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .donut-hole strong {
          font-size: 18px;
          color: var(--text-primary, #0f172a);
          font-weight: 800;
        }

        .donut-hole span {
          font-size: 9px;
          color: var(--text-secondary, #64748b);
          font-weight: 600;
          text-transform: uppercase;
        }

        .chart-legend {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 11px;
          flex: 1;
        }

        .legend-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .legend-left {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow: hidden;
        }

        .legend-color {
          width: 10px;
          height: 10px;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .legend-name {
          font-weight: 600;
          color: var(--text-secondary, #475569);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .legend-val {
          font-weight: 700;
          color: var(--text-primary, #0f172a);
        }

        /* Bar chart styles */
        .bar-chart-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          height: 100%;
          justify-content: center;
        }

        .bar-row {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
        }

        .bar-label {
          width: 90px;
          font-weight: 700;
          color: var(--text-secondary, #475569);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .bar-track {
          flex: 1;
          height: 8px;
          background: #f1f5f9;
          border-radius: 9999px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.4s ease;
        }

        .bar-value {
          width: 80px;
          text-align: right;
          font-weight: 700;
          color: var(--text-primary, #0f172a);
          white-space: nowrap;
        }

        /* Line SVG styles */
        .line-chart-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chart-svg {
          width: 100%;
          height: auto;
          overflow: visible;
        }

        /* Premium path neon and draw animations */
        @keyframes drawPath {
          from {
            stroke-dashoffset: 1000;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes fadeArea {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .trend-path-glow {
          opacity: 0.18;
          stroke: #3b82f6;
          stroke-width: 8px;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .trend-path {
          stroke: #3b82f6;
          stroke-width: 3px;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: drawPath 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .trend-area {
          animation: fadeArea 2s ease-in-out forwards;
        }

        .graph-dot-group {
          cursor: pointer;
        }

        .graph-dot-circle {
          transition: r 0.2s cubic-bezier(0.4, 0, 0.2, 1), fill 0.2s;
        }

        .graph-dot-group:hover .graph-dot-circle {
          r: 7.5px;
          fill: #1d4ed8;
        }

        .graph-dot-group:hover text {
          fill: #1d4ed8;
          font-weight: 900;
        }

        /* Table and Card shadow depth */
        .table-card {
          border: 1px solid var(--border-soft, #e2e8f0);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
          background: #ffffff;
        }

        .report-table-wrapper {
          overflow-x: auto;
        }

        .report-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }

        .report-table th {
          background: #f8fafc !important; 
          color: var(--text-secondary, #475569) !important;
          padding: 16px 20px;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #e2e8f0;
          white-space: nowrap;
        }

        .report-table td {
          padding: 16px 20px;
          color: var(--text-primary, #334155);
          border-bottom: 1px solid #f1f5f9;
        }

        .report-table tr.report-table-row {
          transition: background-color 0.15s ease;
          cursor: pointer;
        }

        .report-table tr.report-table-row:hover {
          background-color: var(--border-soft, #f1f5f9) !important;
        }

        .report-table tr.report-table-row:nth-child(even) {
          background-color: #fafbfc;
        }

        .report-table tr.report-table-row:nth-child(even):hover {
          background-color: var(--border-soft, #f1f5f9) !important;
        }

        .report-table tfoot tr td {
          background: #f8fafc !important; 
          color: var(--text-primary, #0f172a) !important;
          font-weight: 800;
          padding: 16px 20px;
          border-top: 2px solid #cbd5e1;
          font-size: 13px;
          white-space: nowrap;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        .badge-new {
          background: #dcfce7;
          color: #15803d;
        }

        .badge-renewal {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .badge-other {
          background: #f3f4f6;
          color: #4b5563;
        }

        /* Pagination Control Bar */
        .pagination-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: #ffffff;
          border-top: 1px solid var(--border-soft, #f1f5f9);
        }

        .pagination-text {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary, #64748b);
        }

        .pagination-buttons {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .page-nav-btn {
          padding: 6px 12px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-primary, #0f172a);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .page-nav-btn:hover:not(:disabled) {
          background: var(--border-soft, #f1f5f9);
        }

        .page-nav-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .page-number-btn {
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-primary, #0f172a);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .page-number-btn:hover {
          background: var(--border-soft, #f1f5f9);
        }

        .page-number-btn.active {
          background: var(--accent, #3b82f6);
          color: #ffffff;
        }

        .pagination-ellipsis {
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary, #64748b);
          font-size: 13px;
          font-weight: 700;
        }

        .monthly-report-modal {
          width: 90% !important;
          max-width: 1050px !important;
          max-height: 90vh !important;
          border-radius: 16px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 20px !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
          border: 1px solid rgba(25, 28, 29, 0.08) !important;
          overflow: hidden !important;
          padding: 24px !important;
        }

        .monthly-report-modal .tb-modal-header {
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 16px;
        }

        .monthly-report-modal .tb-modal-close {
          background: #f1f5f9;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }

        .monthly-report-modal .tb-modal-close:hover {
          background: #e2e8f0;
        }

        .monthly-report-trigger-card {
          transition: transform 0.25s, box-shadow 0.25s;
        }

        .monthly-report-trigger-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px -8px rgba(0, 0, 0, 0.15);
          border-color: #3b82f6;
        }
      `}} />

      {/* 1. Interactive Charts Dashboard (at the very top) */}
      <div className="reports-charts-grid">
        {/* Monthly Performance Report Trigger Card */}
        <div className="chart-card monthly-report-trigger-card" onClick={() => setIsMonthlyModalOpen(true)} style={{ cursor: "pointer" }}>
          <div className="chart-header-row">
            <h3 className="chart-title" style={{ display: "flex", alignItems: "center", gap: "8px", textTransform: "uppercase" }}>
              <Calendar size={18} style={{ color: "#3b82f6" }} />
              Monthly Report
            </h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", justifyContent: "center", height: "100%", alignItems: "center", textAlign: "center", padding: "12px 0" }}>
             <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "16px", borderRadius: "50%", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", width: "56px", height: "56px" }}>
               <TrendingUp size={26} />
             </div>
             <div>
               <strong style={{ fontSize: "14px", color: "var(--text-primary, #0f172a)", display: "block" }}>Monthly Report Center</strong>
               <p style={{ fontSize: "11px", color: "var(--text-secondary, #64748b)", marginTop: "4px", lineHeight: "1.4" }}>Consolidated overview of motor & warehouse policies by month, LOB comparison, and data audit.</p>
             </div>
             <button type="button" className="primary-action" style={{ padding: "8px 16px", fontSize: "12px", borderRadius: "8px", width: "100%", marginTop: "4px", cursor: "pointer" }}>
               Generate Monthly Report
             </button>
          </div>
        </div>

        {/* Line Graph (Daily Upload Premium Trend) */}
        <div className="chart-card">
          <div className="chart-header-row">
            <h3 className="chart-title">
              {uniqueDatesCount === 1 ? "Hourly Premium Trend" : "Daily Premium Trend"}
            </h3>
          </div>
          <div className="line-chart-container">
            {graphPoints.length === 0 ? (
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>
                No trend data available for selected filters.
              </span>
            ) : (
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="chart-svg">
                <defs>
                  <linearGradient id="line-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Horizontal reference lines */}
                {[0, 0.5, 1].map((ratio, idx) => {
                  const y = graphPadding + ratio * (svgHeight - graphPadding * 2);
                  return (
                    <line
                      key={idx}
                      x1={graphPadding}
                      y1={y}
                      x2={svgWidth - graphPadding}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1.5"
                    />
                  );
                })}
                {/* Curve fill area */}
                <path d={areaPathD} fill="url(#line-grad)" className="trend-area" />
                {/* Double path for Glow */}
                <path d={linePathD} fill="none" className="trend-path-glow" />
                {/* Path line with drawing animation */}
                <path d={linePathD} fill="none" className="trend-path" />
                {/* Interactive Points */}
                {graphPoints.map((p, idx) => (
                  <g key={idx} className="graph-dot-group" onClick={() => handlePointClick(p.rawDate)}>
                    <title suppressHydrationWarning>{`Click to filter table by ${formatDate(p.rawDate)}`}</title>
                    <circle cx={p.x} cy={p.y} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2.5" className="graph-dot-circle" />
                    <text
                      x={p.x}
                      y={p.y - 12}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="800"
                      fill="#1e293b"
                    >
                      ₹{formatPremium(p.value)}
                    </text>
                    <text
                      x={p.x}
                      y={svgHeight - 10}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="700"
                      fill="#64748b"
                    >
                      {p.label}
                    </text>
                  </g>
                ))}
              </svg>
            )}
          </div>
        </div>

        {/* Bar Chart (Insurer Premium Distribution) */}
        <div className="chart-card">
          <div className="chart-header-row">
            <h3 className="chart-title">Insurers by Premium</h3>
          </div>
          <div className="bar-chart-list">
            {barChartData.length === 0 ? (
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600", textAlign: "center" }}>
                No insurer data available.
              </span>
            ) : (
              barChartData.map((item, index) => {
                const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
                const fillPercent = (item.value / maxInsurerPremium) * 100;
                return (
                  <div className="bar-row" key={item.label}>
                    <span className="bar-label" title={item.label}>
                      {item.label}
                    </span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${fillPercent}%`,
                          backgroundColor: colors[index % colors.length],
                        }}
                      />
                    </div>
                    <span className="bar-value">₹{formatPremium(item.value)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Donut Chart (Policy Type Mix) */}
        <div className="chart-card">
          <div className="chart-header-row">
            <h3 className="chart-title">Policy Type Mix</h3>
          </div>
          <div className="donut-container">
            {donutChartData.length === 0 ? (
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600" }}>
                No policy types recorded.
              </span>
            ) : (
              <>
                <div className="donut-chart-circle" style={{ background: donutGradient }}>
                  <div className="donut-hole">
                    <strong>{filteredRecords.length}</strong>
                    <span>Policies</span>
                  </div>
                </div>
                <div className="chart-legend">
                  {donutChartData.map((item, index) => {
                    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
                    return (
                      <div className="legend-item" key={item.label}>
                        <div className="legend-left">
                          <span
                            className="legend-color"
                            style={{ backgroundColor: colors[index % colors.length] }}
                          />
                          <span className="legend-name" title={item.label}>
                            {item.label}
                          </span>
                        </div>
                        <span className="legend-val">{item.value}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Tabs and Filters Toolbar (positioned below the charts) */}
      <div className="tabs-and-filters-wrapper">
        <div className="segmented-control">
          {[
            { id: "motor-report", label: "Motor Report" },
            { id: "motor-individual", label: "Individual Motor Report" },
            { id: "warehouse-report", label: "Warehouse Report" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="filters-row">
          {isIndividualTab && (
            <div className="filter-group">
              <span className="filter-label">Agent:</span>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Agents</option>
                {uniqueAgents.map((agent) => (
                  <option key={agent} value={agent}>
                    {agent}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-group">
            <span className="filter-label">Date Filter:</span>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last-3-days">Last 3 Days</option>
              <option value="this-week">This Week</option>
              <option value="last-week">Last Week</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="last-3-months">Last 3 Months</option>
              <option value="last-6-months">Last 6 Months</option>
              <option value="this-year">This Year</option>
              <option value="last-year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {datePreset === "custom" && (
            <>
              <div className="filter-group">
                <span className="filter-label">From:</span>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <span className="filter-label">To:</span>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="filter-input"
                />
              </div>

              {(startDateFilter || endDateFilter) && (
                <button onClick={clearDateFilters} className="clear-btn" type="button">
                  Clear
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 3. Main Report Table Container */}
      <div className="table-card">
        <div className="report-table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th style={{ whiteSpace: "nowrap", minWidth: "110px" }}>Date</th>
                <th>Insured Name</th>
                <th style={{ whiteSpace: "nowrap" }}>
                  {activeTab === "warehouse-report" ? "Profile / Location" : "Vehicle Number"}
                </th>
                <th>Policy Type</th>
                <th style={{ textAlign: "right", whiteSpace: "nowrap", minWidth: "120px" }}>Premium</th>
                <th style={{ textAlign: "right", whiteSpace: "nowrap", minWidth: "120px" }}>Net Premium</th>
                <th>Insurance Company</th>
                <th style={{ whiteSpace: "nowrap" }}>New / Renewal</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "var(--text-secondary)", fontWeight: "600" }}>
                    No {activeTab === "warehouse-report" ? "warehouse" : "motor"} policy records found for this report filter.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => {
                  const lobBadgeClass = 
                    record.newOrRenewal === "New" 
                      ? "badge badge-new" 
                      : record.newOrRenewal === "Renewal" 
                      ? "badge badge-renewal" 
                      : "badge badge-other";

                  // Display the Upload Date in the DATE column
                  const displayDate = record.uploadedAt || record.savedAt || record.createdAt;

                  return (
                    <tr
                      key={record.id}
                      onClick={() => onEditRecord && onEditRecord(record)}
                      className="report-table-row"
                    >
                      <td style={{ whiteSpace: "nowrap" }}>{formatDate(displayDate)}</td>
                      <td style={{ fontWeight: "700" }}>{record.insuredName}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {activeTab === "warehouse-report"
                          ? (record.warehouseProfileName || record.groupName || "N/A")
                          : (record.vehicleNumber || "N/A")}
                      </td>
                      <td>{record.policyType || "N/A"}</td>
                      <td style={{ textAlign: "right", fontWeight: "600", whiteSpace: "nowrap" }}>
                        {record.premium ? formatPremium(parsePremium(record.premium)) : "-"}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "600", whiteSpace: "nowrap" }}>
                        {record.netPremium ? formatPremium(parsePremium(record.netPremium)) : "-"}
                      </td>
                      <td>{record.insuranceCompany || "N/A"}</td>
                      <td>
                        <span className={lobBadgeClass}>
                          {record.newOrRenewal || "N/A"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredRecords.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3}></td>
                  <td style={{ textTransform: "uppercase" }}>Total</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{formatPremium(totals.premium)}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{formatPremium(totals.netPremium)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination Toolbar */}
        {filteredRecords.length > pageSize && (
          <div className="pagination-container">
            <span className="pagination-text">
              Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length} records
            </span>
            <div className="pagination-buttons">
              <button
                type="button"
                className="page-nav-btn"
                onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              {pageNumbers.map((pageNum, idx) => {
                if (pageNum === "...") {
                  return (
                    <span key={`ell-${idx}`} className="pagination-ellipsis">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={pageNum}
                    type="button"
                    className={`page-number-btn ${currentPage === pageNum ? "active" : ""}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                className="page-nav-btn"
                onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Performance Report Modal Overlay */}
      {isMonthlyModalOpen && (
        <div className="tb-modal-backdrop" onClick={() => setIsMonthlyModalOpen(false)}>
          <div className="tb-modal-card monthly-report-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tb-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px", margin: 0, color: "var(--text-primary, #0f172a)" }}>
                <Calendar size={22} style={{ color: "#3b82f6" }} />
                Monthly Performance Report Center
              </h2>
              <button type="button" className="tb-modal-close" onClick={() => setIsMonthlyModalOpen(false)} style={{ border: "none", background: "none", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <div className="monthly-report-filters" style={{ display: "flex", gap: "16px", background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Select Month</span>
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)} 
                  className="filter-select"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                >
                  <option value="">Choose Month...</option>
                  {monthOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Policy Type / LOB</span>
                <select 
                  value={selectedPolicyType} 
                  onChange={(e) => setSelectedPolicyType(e.target.value)} 
                  className="filter-select"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                >
                  <option value="">Choose Policy Type...</option>
                  <option value="all">All Policies (Motor & Warehouse)</option>
                  <option value="motor">Motor Policies Only</option>
                  <option value="warehouse">Warehouse Policies Only</option>
                </select>
              </div>
            </div>

            <div className="monthly-report-body" style={{ flex: 1, overflowY: "auto", minHeight: "350px", maxHeight: "65vh", paddingRight: "4px" }}>
              {!selectedMonth || !selectedPolicyType ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "300px", color: "#94a3b8", gap: "12px" }}>
                  <Calendar size={48} style={{ strokeWidth: "1.5", color: "#94a3b8" }} />
                  <div style={{ textAlign: "center" }}>
                    <h3 style={{ fontWeight: "700", color: "#64748b" }}>Report Ready to Generate</h3>
                    <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Select a month and a policy type from the filters above to load analytics.</p>
                  </div>
                </div>
              ) : monthlyFilteredRecords.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "300px", color: "#94a3b8", gap: "12px" }}>
                  <AlertCircle size={48} style={{ color: "#ef4444", strokeWidth: "1.5" }} />
                  <div style={{ textAlign: "center" }}>
                    <h3 style={{ fontWeight: "700", color: "#64748b" }}>No Policy Records Found</h3>
                    <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>There are no policy records matching the selected month and policy type filter.</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {/* KPI Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                    <div className="metric-card" style={{ display: "flex", flexDirection: "column", gap: "4px", background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>TOTAL POLICIES</span>
                      <strong style={{ fontSize: "24px", color: "#0f172a" }}>{monthlyTotals.count}</strong>
                      <small style={{ color: "#10b981", fontWeight: "600" }}>Active for LOB selection</small>
                    </div>
                    <div className="metric-card" style={{ display: "flex", flexDirection: "column", gap: "4px", background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>NET PREMIUM</span>
                      <strong style={{ fontSize: "24px", color: "#3b82f6" }}>₹{formatPremium(monthlyTotals.netPremium)}</strong>
                      <small style={{ color: "#3b82f6", fontWeight: "600" }}>Excluding GST / taxes</small>
                    </div>
                    <div className="metric-card" style={{ display: "flex", flexDirection: "column", gap: "4px", background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>GROSS PREMIUM</span>
                      <strong style={{ fontSize: "24px", color: "#f59e0b" }}>₹{formatPremium(monthlyTotals.grossPremium)}</strong>
                      <small style={{ color: "#f59e0b", fontWeight: "600" }}>Including GST / levies</small>
                    </div>
                  </div>

                  {/* Relative LOB Comparison Card */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <div style={{ padding: "20px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)", boxShadow: "0 2px 4px rgba(0,0,0,0.01)" }}>
                      <h4 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "800", color: "#1d4ed8", textTransform: "uppercase", margin: "0 0 12px 0" }}>
                        <Car size={18} />
                        Motor LOB Summary
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(226, 232, 240, 0.6)", paddingBottom: "6px" }}>
                          <span style={{ color: "#64748b" }}>Policies Count:</span>
                          <strong style={{ color: "#0f172a" }}>{relativeAnalysis.motor.count}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(226, 232, 240, 0.6)", paddingBottom: "6px" }}>
                          <span style={{ color: "#64748b" }}>Total Net Premium:</span>
                          <strong style={{ color: "#0f172a" }}>₹{formatPremium(relativeAnalysis.motor.netPremium)}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(226, 232, 240, 0.6)", paddingBottom: "6px" }}>
                          <span style={{ color: "#64748b" }}>Avg Premium/Policy:</span>
                          <strong style={{ color: "#0f172a" }}>₹{formatPremium(relativeAnalysis.motor.avgNet)}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#64748b" }}>Key Insurers:</span>
                          <strong style={{ color: "#0f172a", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "200px" }} title={relativeAnalysis.motor.companies}>{relativeAnalysis.motor.companies}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: "20px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)", boxShadow: "0 2px 4px rgba(0,0,0,0.01)" }}>
                      <h4 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "800", color: "#047857", textTransform: "uppercase", margin: "0 0 12px 0" }}>
                        <Briefcase size={18} />
                        Warehouse LOB Summary
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(226, 232, 240, 0.6)", paddingBottom: "6px" }}>
                          <span style={{ color: "#64748b" }}>Policies Count:</span>
                          <strong style={{ color: "#0f172a" }}>{relativeAnalysis.warehouse.count}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(226, 232, 240, 0.6)", paddingBottom: "6px" }}>
                          <span style={{ color: "#64748b" }}>Total Net Premium:</span>
                          <strong style={{ color: "#0f172a" }}>₹{formatPremium(relativeAnalysis.warehouse.netPremium)}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(226, 232, 240, 0.6)", paddingBottom: "6px" }}>
                          <span style={{ color: "#64748b" }}>Avg Premium/Policy:</span>
                          <strong style={{ color: "#0f172a" }}>₹{formatPremium(relativeAnalysis.warehouse.avgNet)}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#64748b" }}>Key Insurers:</span>
                          <strong style={{ color: "#0f172a", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "200px" }} title={relativeAnalysis.warehouse.companies}>{relativeAnalysis.warehouse.companies}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Field Completeness / Quality Audit */}
                  <div className="glass-panel" style={{ border: "1px solid #e2e8f0", borderRadius: "12px", background: "#ffffff" }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
                      <h4 style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                        <Layers size={18} style={{ color: "#8b5cf6" }} />
                        Data Quality & Extraction Field Completeness
                      </h4>
                      <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0 0" }}>Check field fill rates to identify missing metadata (what more is needed) in database entries.</p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", padding: "20px" }}>
                      <div>
                        <h5 style={{ fontSize: "11px", fontWeight: "800", color: "#1d4ed8", margin: "0 0 12px 0", textTransform: "uppercase" }}>Motor LOB Field Audit</h5>
                        {fieldCompleteness.motor.length === 0 ? (
                          <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>No Motor policies for this month to audit.</p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {fieldCompleteness.motor.map(item => (
                              <div key={item.name} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "700" }}>
                                  <span style={{ color: "#475569" }}>{item.name}</span>
                                  <span style={{ color: item.fillRate > 75 ? "#10b981" : item.fillRate > 40 ? "#f59e0b" : "#ef4444" }}>{item.fillRate}% ({item.filledCount}/{item.totalCount})</span>
                                </div>
                                <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${item.fillRate}%`, background: item.fillRate > 75 ? "#10b981" : item.fillRate > 40 ? "#f59e0b" : "#ef4444", borderRadius: "999px" }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <h5 style={{ fontSize: "11px", fontWeight: "800", color: "#047857", margin: "0 0 12px 0", textTransform: "uppercase" }}>Warehouse LOB Field Audit</h5>
                        {fieldCompleteness.warehouse.length === 0 ? (
                          <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>No Warehouse policies for this month to audit.</p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {fieldCompleteness.warehouse.map(item => (
                              <div key={item.name} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "700" }}>
                                  <span style={{ color: "#475569" }}>{item.name}</span>
                                  <span style={{ color: item.fillRate > 75 ? "#10b981" : item.fillRate > 40 ? "#f59e0b" : "#ef4444" }}>{item.fillRate}% ({item.filledCount}/{item.totalCount})</span>
                                </div>
                                <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${item.fillRate}%`, background: item.fillRate > 75 ? "#10b981" : item.fillRate > 40 ? "#f59e0b" : "#ef4444", borderRadius: "999px" }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Insurer wise table */}
                  <div className="table-card" style={{ marginTop: "8px" }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
                      <h3 style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase", margin: 0 }}>INSURANCE COMPANY WISE REPORT</h3>
                    </div>
                    <div className="report-table-wrapper">
                      <table className="report-table">
                        <thead>
                          <tr>
                            <th>Insurance Company</th>
                            <th style={{ textAlign: "center" }}>Policy Count</th>
                            <th style={{ textAlign: "right" }}>Total Net Premium</th>
                            <th style={{ textAlign: "right" }}>Total Gross Premium</th>
                            <th style={{ textAlign: "right" }}>Avg Net Premium</th>
                          </tr>
                        </thead>
                        <tbody>
                          {companySummary.map((item) => (
                            <tr key={item.name} className="report-table-row">
                              <td style={{ fontWeight: "700" }}>{item.name}</td>
                              <td style={{ textAlign: "center", fontWeight: "600" }}>{item.count}</td>
                              <td style={{ textAlign: "right", fontWeight: "600" }}>₹{formatPremium(item.netPremium)}</td>
                              <td style={{ textAlign: "right", fontWeight: "600" }}>₹{formatPremium(item.grossPremium)}</td>
                              <td style={{ textAlign: "right", fontWeight: "600" }}>₹{formatPremium(item.count > 0 ? Math.round(item.netPremium / item.count) : 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Detailed policies list */}
                  <div className="table-card" style={{ marginTop: "8px" }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
                      <h3 style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a", textTransform: "uppercase", margin: 0 }}>DETAILED POLICIES LIST</h3>
                    </div>
                    <div className="report-table-wrapper">
                      <table className="report-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Insured Name</th>
                            <th>Insurer</th>
                            {selectedPolicyType === "motor" ? (
                              <>
                                <th>Vehicle No.</th>
                                <th>Make & Model</th>
                                <th>IDV</th>
                                <th>NCB</th>
                              </>
                            ) : selectedPolicyType === "warehouse" ? (
                              <>
                                <th>Risk Location</th>
                                <th>Sum Insured</th>
                                <th>Occupancy</th>
                              </>
                            ) : (
                              <>
                                <th>Type</th>
                                <th>Vehicle / Location</th>
                                <th>Sum Insured / IDV</th>
                              </>
                            )}
                            <th style={{ textAlign: "right" }}>Net Premium</th>
                            <th style={{ textAlign: "right" }}>Gross Premium</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyFilteredRecords.map((record) => {
                            const isMotor = isMotorRecord(record);
                            const displayDate = record.uploadedAt || record.savedAt || record.createdAt;
                            
                            return (
                              <tr key={record.id} className="report-table-row" onClick={() => { setIsMonthlyModalOpen(false); onEditRecord && onEditRecord(record); }} style={{ cursor: "pointer" }}>
                                <td style={{ whiteSpace: "nowrap" }}>{formatDate(displayDate)}</td>
                                <td style={{ fontWeight: "700" }}>{record.insuredName}</td>
                                <td>{record.insuranceCompany || "N/A"}</td>
                                
                                {selectedPolicyType === "motor" ? (
                                  <>
                                    <td style={{ fontWeight: "600" }}>{record.vehicleNumber || "N/A"}</td>
                                    <td>{record.makeModel || "N/A"}</td>
                                    <td>{record.idv ? `₹${formatPremium(parsePremium(record.idv))}` : "N/A"}</td>
                                    <td>{record.ncb || "N/A"}</td>
                                  </>
                                ) : selectedPolicyType === "warehouse" ? (
                                  <>
                                    <td title={record.premisesAddress || record.riskLocation} style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {record.premisesAddress || record.riskLocation || "N/A"}
                                    </td>
                                    <td>{record.sumInsured ? `₹${formatPremium(parsePremium(record.sumInsured))}` : "N/A"}</td>
                                    <td>{record.occupancy || "N/A"}</td>
                                  </>
                                ) : (
                                  <>
                                    <td>
                                      <span className={`badge ${isMotor ? 'badge-new' : 'badge-renewal'}`} style={{ textTransform: "uppercase" }}>
                                        {isMotor ? 'Motor' : 'Warehouse'}
                                      </span>
                                    </td>
                                    <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={isMotor ? record.vehicleNumber : (record.premisesAddress || record.riskLocation)}>
                                      {isMotor ? (record.vehicleNumber || "N/A") : (record.premisesAddress || record.riskLocation || "N/A")}
                                    </td>
                                    <td>
                                      {isMotor 
                                        ? (record.idv ? `₹${formatPremium(parsePremium(record.idv))}` : "N/A")
                                        : (record.sumInsured ? `₹${formatPremium(parsePremium(record.sumInsured))}` : "N/A")}
                                    </td>
                                  </>
                                )}
                                <td style={{ textAlign: "right", fontWeight: "600" }}>₹{formatPremium(parsePremium(record.netPremium))}</td>
                                <td style={{ textAlign: "right", fontWeight: "600" }}>₹{formatPremium(parsePremium(record.premium || record.totalPremium))}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
