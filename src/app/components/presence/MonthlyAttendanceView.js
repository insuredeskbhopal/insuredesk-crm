"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Coffee,
  Search,
  RefreshCw,
  ArrowRight,
  X,
  Activity,
  FileSpreadsheet,
} from "lucide-react";
import ModalPortal from "@/app/components/shared/ModalPortal";

export default function MonthlyAttendanceView({
  onSwitchToLive,
  viewMode,
  onViewModeChange,
  initialMode = "monthly",
}) {
  const tableContainerRef = useRef(null);

  const getPayrollCycleKey = (d = new Date()) => {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    // In this office, payroll month runs from 11th of start month to 10th of next month
    if (day >= 11) {
      return `${y}-${String(m).padStart(2, "0")}`;
    } else {
      const prevM = m - 1 === 0 ? 12 : m - 1;
      const prevY = m - 1 === 0 ? y - 1 : y;
      return `${prevY}-${String(prevM).padStart(2, "0")}`;
    }
  };

  // Restore month from URL or localStorage
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlMonth = params.get("month");
        if (urlMonth && /^\d{4}-\d{2}$/.test(urlMonth)) return urlMonth;
        const saved = window.localStorage.getItem("presence_selected_month");
        if (saved && /^\d{4}-\d{2}$/.test(saved)) return saved;
      } catch {}
    }
    return getPayrollCycleKey();
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Restore role filter from localStorage
  const [roleFilter, setRoleFilter] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("presence_role_filter");
        if (saved) return saved;
      } catch {}
    }
    return "all";
  });

  const handleRoleFilterChange = (role) => {
    setRoleFilter(role);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("presence_role_filter", role);
      } catch {}
    }
  };

  const [selectedStaff, setSelectedStaff] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Attendance Mode ('monthly' | 'daily')
  const [attendanceMode, setAttendanceMode] = useState(
    viewMode === "daily" ? "daily" : initialMode || "monthly"
  );

  useEffect(() => {
    if (viewMode === "daily" || viewMode === "monthly") {
      setAttendanceMode(viewMode);
    }
  }, [viewMode]);

  const handleSwitchMode = (mode) => {
    setAttendanceMode(mode);
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  // Restore selected date from URL or localStorage
  const [selectedDate, setSelectedDate] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlDate = params.get("date");
        if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) return urlDate;
        const saved = window.localStorage.getItem("presence_selected_date");
        if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) return saved;
      } catch {}
    }
    return "2026-09-24";
  });

  // Restore daily status filter from localStorage
  const [dailyStatusFilter, setDailyStatusFilter] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("presence_daily_status_filter");
        if (saved) return saved;
      } catch {}
    }
    return "all";
  });

  const handleDailyStatusFilterChange = (status) => {
    setDailyStatusFilter(status);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("presence_daily_status_filter", status);
      } catch {}
    }
  };

  useEffect(() => {
    if (data?.currentDate) {
      if (typeof window !== "undefined") {
        try {
          const params = new URLSearchParams(window.location.search);
          const urlDate = params.get("date");
          const saved = window.localStorage.getItem("presence_selected_date");
          if (urlDate || saved) return; // Keep user's chosen date across reloads
        } catch {}
      }
      setSelectedDate(data.currentDate);
    }
  }, [data?.currentDate]);

  const updateSelectedDate = (d) => {
    setSelectedDate(d);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("presence_selected_date", d);
        const params = new URLSearchParams(window.location.search);
        params.set("date", d);
        const nextUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, "", nextUrl);
      } catch {}
    }
  };

  const handlePrevDay = () => {
    if (!data?.days || data.days.length === 0) return;
    const currentIndex = data.days.findIndex(
      (d) => (d.dateStr || d.date) === selectedDate
    );
    if (currentIndex > 0) {
      updateSelectedDate(data.days[currentIndex - 1].dateStr || data.days[currentIndex - 1].date);
    }
  };

  const handleNextDay = () => {
    if (!data?.days || data.days.length === 0) return;
    const currentIndex = data.days.findIndex(
      (d) => (d.dateStr || d.date) === selectedDate
    );
    if (currentIndex >= 0 && currentIndex < data.days.length - 1) {
      updateSelectedDate(data.days[currentIndex + 1].dateStr || data.days[currentIndex + 1].date);
    }
  };

  const handleSelectToday = () => {
    const todayObj = data?.days?.find((d) => d.isToday);
    if (todayObj) {
      updateSelectedDate(todayObj.dateStr || todayObj.date);
    } else {
      updateSelectedDate(data?.currentDate || "2026-09-24");
    }
  };

  const selectedDayObj = useMemo(() => {
    if (!data?.days) return null;
    return data.days.find((d) => (d.dateStr || d.date) === selectedDate) || null;
  }, [data?.days, selectedDate]);

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDayObj) {
      return selectedDate;
    }
    const [y] = selectedDate.split("-");
    return `${selectedDayObj.weekday}, ${selectedDayObj.dayNumber} ${selectedDayObj.monthShort || "Sept"} ${y || "2026"}`;
  }, [selectedDayObj, selectedDate]);

  const isViewingToday = useMemo(() => {
    if (selectedDayObj?.isToday) return true;
    return selectedDate === (data?.currentDate || "2026-09-24");
  }, [selectedDayObj, selectedDate, data?.currentDate]);

  const fetchMonthlyData = async (month) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/operations/presence/monthly?month=${month}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load monthly attendance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyData(currentMonth);
  }, [currentMonth]);

  const handleMatrixScroll = (e) => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem("presence_matrix_scroll_x", String(e.currentTarget.scrollLeft));
      } catch {}
    }
  };

  const scrollToToday = () => {
    if (data?.days && tableContainerRef.current) {
      const todayIndex = data.days.findIndex((d) => d.isToday);
      if (todayIndex >= 0) {
        const scrollPos = Math.max(0, (todayIndex - 1) * 102);
        tableContainerRef.current.scrollTo({ left: scrollPos, behavior: "smooth" });
        if (typeof window !== "undefined") {
          try {
            window.sessionStorage.setItem("presence_matrix_scroll_x", String(scrollPos));
          } catch {}
        }
      }
    }
  };

  useEffect(() => {
    if (data?.days && tableContainerRef.current) {
      if (typeof window !== "undefined") {
        try {
          const savedScroll = window.sessionStorage.getItem("presence_matrix_scroll_x");
          if (savedScroll !== null && !isNaN(Number(savedScroll))) {
            tableContainerRef.current.scrollTo({ left: Number(savedScroll), behavior: "auto" });
            return;
          }
        } catch {}
      }

      const todayIndex = data.days.findIndex((d) => d.isToday);
      if (todayIndex > 2) {
        const scrollPos = Math.max(0, (todayIndex - 2) * 102);
        tableContainerRef.current.scrollTo({ left: scrollPos, behavior: "smooth" });
      }
    }
  }, [data?.days]);

  const updateCurrentMonth = (m) => {
    setCurrentMonth(m);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("presence_selected_month", m);
        const params = new URLSearchParams(window.location.search);
        params.set("month", m);
        const nextUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, "", nextUrl);
      } catch {}
    }
  };

  const handlePrevMonth = () => {
    const [yearStr, mStr] = currentMonth.split("-");
    let y = parseInt(yearStr, 10);
    let m = parseInt(mStr, 10) - 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    updateCurrentMonth(`${y}-${String(m).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    const [yearStr, mStr] = currentMonth.split("-");
    let y = parseInt(yearStr, 10);
    let m = parseInt(mStr, 10) + 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
    updateCurrentMonth(`${y}-${String(m).padStart(2, "0")}`);
  };

  const handleCurrentMonth = () => {
    updateCurrentMonth(getPayrollCycleKey());
  };

  // Filter staff list
  const filteredStaff = useMemo(() => {
    if (!data?.staff) return [];
    let list = data.staff;

    if (roleFilter !== "all") {
      list = list.filter((s) => s.user.role === roleFilter);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) =>
          s.user.name?.toLowerCase().includes(q) ||
          s.user.email?.toLowerCase().includes(q) ||
          s.user.whatsappPhone?.includes(q)
      );
    }

    return list;
  }, [data?.staff, roleFilter, query]);

  // Daily Staff Roster for the selected day
  const dailyRoster = useMemo(() => {
    if (!data?.staff) return [];
    const isToday = isViewingToday;

    return data.staff.map((s) => {
      const dayRecord = s.days?.find((d) => (d.date === selectedDate || d.dateStr === selectedDate)) || null;
      const punchIn = dayRecord?.punchIn || (isToday ? s.summary?.todayPunchIn : null);
      const punchOut = dayRecord?.punchOut || (isToday ? s.summary?.todayPunchOut : null);
      const isSunday = Boolean(dayRecord?.isSunday || dayRecord?.status === "WO");
      const isLeave = Boolean(dayRecord?.status === "LEAVE");
      const isField = Boolean(dayRecord?.status === "FIELD_WORK");
      const isActive = Boolean(punchIn && !punchOut && isToday);
      const isCompleted = Boolean(punchIn && punchOut);
      const isPending = Boolean(!punchIn && !isSunday && !isLeave && !isField);

      let statusLabel = "Absent";
      let statusType = "absent";
      if (isSunday) {
        statusLabel = "Weekly Off";
        statusType = "wo";
      } else if (isLeave) {
        statusLabel = "Approved Leave";
        statusType = "leave";
      } else if (isField) {
        statusLabel = "Field Work";
        statusType = "field";
      } else if (isActive) {
        statusLabel = "Active Now";
        statusType = "active";
      } else if (isCompleted) {
        statusLabel = (dayRecord?.hours || 0) >= 4.5 ? "Present" : "Half Day";
        statusType = (dayRecord?.hours || 0) >= 4.5 ? "present" : "half_day";
      } else if (punchIn) {
        statusLabel = "Present";
        statusType = "present";
      } else if (isToday) {
        statusLabel = "Pending Login";
        statusType = "pending";
      }

      return {
        staffItem: s,
        user: s.user,
        dayRecord,
        punchIn,
        punchOut,
        hours: dayRecord?.hours || 0,
        statusLabel,
        statusType,
        isActive,
        isCompleted,
        isPending,
        isSunday,
      };
    });
  }, [data?.staff, selectedDate, isViewingToday]);

  const dailyKpis = useMemo(() => {
    const totalStaff = dailyRoster.length;
    const presentCount = dailyRoster.filter((s) => s.punchIn).length;
    const activeCount = dailyRoster.filter((s) => s.isActive).length;
    const completedCount = dailyRoster.filter((s) => s.isCompleted).length;
    const pendingCount = dailyRoster.filter((s) => s.isPending).length;
    const leaveCount = dailyRoster.filter((s) => s.statusType === "leave").length;
    const fieldCount = dailyRoster.filter((s) => s.statusType === "field").length;
    const absentCount = dailyRoster.filter((s) => s.statusType === "absent").length;
    const totalHoursLogged = dailyRoster.reduce((sum, s) => sum + (s.hours || 0), 0);
    const roundHours = Math.round(totalHoursLogged * 10) / 10;

    return {
      totalStaff,
      presentCount,
      activeCount,
      completedCount,
      pendingCount,
      leaveCount,
      fieldCount,
      absentCount,
      totalHoursLogged: roundHours,
      warningsCount: 0,
    };
  }, [dailyRoster]);

  const filteredDailyList = useMemo(() => {
    let list = dailyRoster;

    if (dailyStatusFilter === "present") {
      list = list.filter((s) => s.punchIn);
    } else if (dailyStatusFilter === "active") {
      list = list.filter((s) => s.isActive);
    } else if (dailyStatusFilter === "pending") {
      list = list.filter((s) => s.isPending);
    }

    if (roleFilter !== "all") {
      list = list.filter((s) => s.user.role === roleFilter);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) =>
          s.user.name?.toLowerCase().includes(q) ||
          s.user.email?.toLowerCase().includes(q) ||
          s.user.whatsappPhone?.includes(q) ||
          s.user.role?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [dailyRoster, dailyStatusFilter, roleFilter, query]);

  // Export Daily Attendance to CSV
  const handleExportDailyCSV = () => {
    if (!dailyRoster || dailyRoster.length === 0) return;

    const headerRow = [
      "Staff Name",
      "Email",
      "Role",
      "WhatsApp",
      "Date",
      "Punch IN",
      "Punch OUT",
      "Hours Logged",
      "Status",
    ];

    const dataRows = dailyRoster.map((item) => [
      `"${item.user.name}"`,
      `"${item.user.email}"`,
      `"${item.user.role}"`,
      `"${item.user.whatsappPhone || ""}"`,
      `"${selectedDate}"`,
      `"${item.punchIn || "--"}"`,
      `"${item.punchOut || (item.isActive ? "Active" : "--")}"`,
      item.hours || 0,
      `"${item.statusLabel}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headerRow.join(","), ...dataRows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Staff_Daily_Attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to CSV function
  const handleExportCSV = () => {
    if (!data || !data.staff) return;

    const dayHeaders = (data.days || []).map((d) => `"${d.dayNumber} ${d.monthShort || ""} (${d.weekday})"`);
    const headerRow = [
      "Staff Name",
      "Email",
      "Role",
      "WhatsApp",
      "Today IN",
      "Today OUT",
      ...dayHeaders,
      "Present (P)",
      "Half Days (HD)",
      "Leaves (L)",
      "Field Work (F)",
      "Absent (A)",
      "Attendance %",
      "Total Hours",
      "Warnings",
    ];

    const dataRows = data.staff.map((s) => {
      const dayValues = s.days.map((d) => d.badge);
      return [
        `"${s.user.name}"`,
        `"${s.user.email}"`,
        `"${s.user.role}"`,
        `"${s.user.whatsappPhone || ""}"`,
        `"${s.summary.todayPunchIn || "--"}"`,
        `"${s.summary.todayPunchOut || "--"}"`,
        ...dayValues,
        s.summary.presentDays,
        s.summary.halfDays,
        s.summary.leaveDays,
        s.summary.fieldWorkDays,
        s.summary.absentDays,
        `"${s.summary.attendancePercentage}%"`,
        s.summary.totalHours,
        s.summary.warningsCount,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headerRow.join(","), ...dataRows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Staff_Payroll_Attendance_${data.startDate || data.month}_to_${data.endDate || ""}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Excel (.xlsx) via server-side generation
  const handleExportXlsx = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      const res = await fetch(`/api/operations/presence/monthly/export?month=${currentMonth}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Extract filename from Content-Disposition or use default
      const cd = res.headers.get("content-disposition");
      const match = cd?.match(/filename="?([^"]+)"?/);
      a.download = match?.[1] || `Bima_Headquarter_Attendance_${currentMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("XLSX export error:", err);
      if (typeof window !== "undefined") {
        window.alert("Unable to generate attendance report. Please try again.");
      }
    } finally {
      setExporting(false);
    }
  };

  const summary = data?.officeSummary || {
    totalStaff: 0,
    totalWorkingDays: 0,
    elapsedWorkingDays: 0,
    averageAttendanceRate: 100,
    totalPresentDays: 0,
    totalHalfDays: 0,
    totalLeaves: 0,
    totalFieldWork: 0,
    totalAbsences: 0,
    totalHoursLogged: 0,
    totalWarnings: 0,
  };

  return (
    <div className="monthly-attendance-view">
      {attendanceMode === "daily" ? (
        <>
          {/* Daily Navigator & Actions Bar */}
          <section className="monthly-nav-bar">
            <div className="monthly-nav-controls">
              <div className="monthly-nav-arrows">
                <button
                  className="presence-btn presence-btn-outline"
                  onClick={handlePrevDay}
                  title="Previous Day"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="monthly-nav-title">
                  <Calendar size={18} color="#10b981" />
                  <strong>{formattedSelectedDate}</strong>
                </div>
                <button
                  className="presence-btn presence-btn-outline"
                  onClick={handleNextDay}
                  title="Next Day"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <button
                className={`presence-btn ${isViewingToday ? "presence-btn-primary" : "presence-btn-outline"}`}
                onClick={handleSelectToday}
                style={{ fontSize: 12 }}
                title="Jump to Today's Attendance"
              >
                Today
              </button>
              <button
                className="presence-btn presence-btn-outline"
                onClick={() => handleSwitchMode("monthly")}
                style={{ fontSize: 12, gap: 6 }}
                title="Switch to Monthly Attendance Register"
              >
                <Calendar size={14} /> Monthly Register
              </button>
            </div>

            <div className="monthly-nav-actions">
              <button
                className="presence-btn presence-btn-outline"
                onClick={() => fetchMonthlyData(currentMonth)}
                title="Refresh Attendance"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
              <button
                className="presence-btn presence-btn-primary"
                onClick={handleExportDailyCSV}
                title="Export Daily Attendance to CSV"
              >
                <Download size={14} /> Export CSV
              </button>
            </div>
          </section>

          {/* Daily KPI Grid (8 Cards) */}
          <section className="presence-kpi-grid">
            <div className="presence-kpi-card">
              <div className="presence-kpi-icon" style={{ background: "#ecfdf5", color: "#10b981" }}>
                <Users size={20} />
              </div>
              <div className="presence-kpi-info">
                <strong style={{ color: "#065f46" }}>
                  {dailyKpis.presentCount} / {dailyKpis.totalStaff}
                </strong>
                <p>{isViewingToday ? "Staff Present Today" : "Present on Date"}</p>
              </div>
            </div>

            <div className="presence-kpi-card">
              <div className="presence-kpi-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
                <CheckCircle2 size={20} />
              </div>
              <div className="presence-kpi-info">
                <strong style={{ color: "#1d4ed8" }}>{dailyKpis.activeCount}</strong>
                <p>{isViewingToday ? "Active in CRM Now" : "Active Staff"}</p>
              </div>
            </div>

            <div className="presence-kpi-card">
              <div className="presence-kpi-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                <Clock size={20} />
              </div>
              <div className="presence-kpi-info">
                <strong style={{ color: "#15803d" }}>{dailyKpis.completedCount}</strong>
                <p>Shift Completed (OUT)</p>
              </div>
            </div>

            <div className="presence-kpi-card">
              <div className="presence-kpi-icon" style={{ background: "#faf5ff", color: "#9333ea" }}>
                <Coffee size={20} />
              </div>
              <div className="presence-kpi-info">
                <strong>{dailyKpis.leaveCount}</strong>
                <p>Approved Leaves</p>
              </div>
            </div>

            <div className="presence-kpi-card">
              <div className="presence-kpi-icon" style={{ background: "#f0f9ff", color: "#0284c7" }}>
                <MapPin size={20} />
              </div>
              <div className="presence-kpi-info">
                <strong>{dailyKpis.fieldCount}</strong>
                <p>Field / Client Visits</p>
              </div>
            </div>

            <div className="presence-kpi-card">
              <div className="presence-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}>
                <AlertTriangle size={20} />
              </div>
              <div className="presence-kpi-info">
                <strong style={{ color: "#991b1b" }}>
                  {isViewingToday ? dailyKpis.pendingCount : dailyKpis.absentCount}
                </strong>
                <p>{isViewingToday ? "Pending Login" : "Recorded Absences"}</p>
              </div>
            </div>

            <div className="presence-kpi-card">
              <div className="presence-kpi-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}>
                <Clock size={20} />
              </div>
              <div className="presence-kpi-info">
                <strong>{dailyKpis.totalHoursLogged}h</strong>
                <p>Total Hours Logged</p>
              </div>
            </div>

            <div className="presence-kpi-card">
              <div className="presence-kpi-icon" style={{ background: "#fefce8", color: "#ca8a04" }}>
                <AlertTriangle size={20} />
              </div>
              <div className="presence-kpi-info">
                <strong>{dailyKpis.warningsCount}</strong>
                <p>Warnings Recorded</p>
              </div>
            </div>
          </section>

          {/* Daily Attendance Table Card */}
          <section className="presence-table-card">
            {/* Toolbar */}
            <div className="presence-toolbar">
              <div className="presence-search-input">
                <Search size={16} color="#94a3b8" />
                <input
                  type="search"
                  placeholder="Search staff by name, email, phone..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className="presence-filter-tabs">
                <button
                  className={`presence-filter-tab ${dailyStatusFilter === "all" ? "active" : ""}`}
                  onClick={() => setDailyStatusFilter("all")}
                >
                  All Staff ({dailyKpis.totalStaff})
                </button>
                <button
                  className={`presence-filter-tab ${dailyStatusFilter === "present" ? "active" : ""}`}
                  onClick={() => setDailyStatusFilter("present")}
                >
                  Present ({dailyKpis.presentCount})
                </button>
                <button
                  className={`presence-filter-tab ${dailyStatusFilter === "active" ? "active" : ""}`}
                  onClick={() => setDailyStatusFilter("active")}
                >
                  Active Now ({dailyKpis.activeCount})
                </button>
                <button
                  className={`presence-filter-tab ${dailyStatusFilter === "pending" ? "active" : ""}`}
                  onClick={() => setDailyStatusFilter("pending")}
                >
                  Pending ({dailyKpis.pendingCount})
                </button>
              </div>

              <div className="presence-filter-tabs">
                <button
                  className={`presence-filter-tab ${roleFilter === "all" ? "active" : ""}`}
                  onClick={() => setRoleFilter("all")}
                >
                  All Roles
                </button>
                <button
                  className={`presence-filter-tab ${roleFilter === "SUPER_ADMIN" ? "active" : ""}`}
                  onClick={() => setRoleFilter("SUPER_ADMIN")}
                >
                  Super Admin
                </button>
                <button
                  className={`presence-filter-tab ${roleFilter === "MANAGER" ? "active" : ""}`}
                  onClick={() => setRoleFilter("MANAGER")}
                >
                  Managers
                </button>
                <button
                  className={`presence-filter-tab ${roleFilter === "AGENT" ? "active" : ""}`}
                  onClick={() => setRoleFilter("AGENT")}
                >
                  Agents
                </button>
              </div>
            </div>

            {/* In-Page Table */}
            <div className="presence-table-wrap">
              <table className="presence-table daily-attendance-table">
                <thead>
                  <tr>
                    <th className="daily-col-user">Staff Member</th>
                    <th className="daily-col-role">Role</th>
                    <th className="daily-col-in">Punch IN</th>
                    <th className="daily-col-out">Punch OUT</th>
                    <th className="daily-col-hours">Hours Logged</th>
                    <th className="daily-col-status">Status</th>
                    <th className="daily-col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: 36, color: "#64748b" }}>
                        <RefreshCw size={20} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                        Loading daily attendance records...
                      </td>
                    </tr>
                  ) : filteredDailyList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: 36, color: "#64748b" }}>
                        No staff records match the search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDailyList.map((item) => (
                      <tr key={item.user.id}>
                        <td className="daily-col-user">
                          <div className="presence-user-cell">
                            <div className="presence-avatar">
                              {(item.user.name || item.user.email)[0].toUpperCase()}
                            </div>
                            <div className="presence-user-meta">
                              <strong className="presence-user-name" title={item.user.name}>
                                {item.user.name}
                              </strong>
                              <span className="presence-user-email" title={item.user.email}>
                                {item.user.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="daily-col-role">
                          <span className="presence-role-badge">
                            {item.user.role ? item.user.role.replace(/_/g, " ") : "STAFF"}
                          </span>
                        </td>

                        <td className="daily-col-in">
                          {item.punchIn ? (
                            <span className="daily-punch-pill punch-pill-in">
                              {item.punchIn}
                            </span>
                          ) : (
                            <span className="daily-punch-pill punch-pill-none">--:--</span>
                          )}
                        </td>

                        <td className="daily-col-out">
                          {item.punchOut ? (
                            <span className="daily-punch-pill punch-pill-out">
                              {item.punchOut}
                            </span>
                          ) : item.isActive ? (
                            <span className="daily-punch-pill punch-pill-active">
                              ● Active
                            </span>
                          ) : (
                            <span className="daily-punch-pill punch-pill-none">--:--</span>
                          )}
                        </td>

                        <td className="daily-col-hours">
                          <strong style={{ color: "#1e293b", fontSize: 13 }}>
                            {item.hours > 0 ? `${item.hours}h` : "--"}
                          </strong>
                        </td>

                        <td className="daily-col-status">
                          <span className={`daily-status-chip chip-${item.statusType}`}>
                            {item.statusLabel}
                          </span>
                        </td>

                        <td className="daily-col-actions">
                          <button
                            className="presence-action-btn"
                            onClick={() => setSelectedStaff(item.staffItem)}
                            title="View Staff Activity Details"
                          >
                            Details <ArrowRight size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <>
          {/* Month Navigator & Export Bar */}
          <section className="monthly-nav-bar">
            <div className="monthly-nav-controls">
              <div className="monthly-nav-arrows">
                <button
                  className="presence-btn presence-btn-outline"
                  onClick={handlePrevMonth}
                  title="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="monthly-nav-title">
                  <Calendar size={18} color="#10b981" />
                  <strong>{data?.monthName || currentMonth}</strong>
                </div>
                <button
                  className="presence-btn presence-btn-outline"
                  onClick={handleNextMonth}
                  title="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <button
                className="presence-btn presence-btn-outline"
                onClick={handleCurrentMonth}
                style={{ fontSize: 12 }}
              >
                Current Month
              </button>
              <button
                className="presence-btn presence-btn-primary"
                onClick={() => handleSwitchMode("daily")}
                style={{ fontSize: 12, gap: 6 }}
                title="Switch to Daily Attendance Table"
              >
                <Clock size={14} /> Daily Attendance
              </button>
              <button
                className="presence-btn presence-btn-outline"
                onClick={scrollToToday}
                style={{ fontSize: 12, gap: 5 }}
                title="Scroll matrix table to today's date column"
              >
                Jump to Today
              </button>
            </div>

            <div className="monthly-nav-actions">
              <button
                className="presence-btn presence-btn-outline"
                onClick={() => fetchMonthlyData(currentMonth)}
                title="Refresh Attendance"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
              <button
                className="presence-btn presence-btn-primary"
                onClick={handleExportXlsx}
                disabled={exporting}
                title="Export Monthly Attendance to Excel (.xlsx)"
              >
                <FileSpreadsheet size={14} className={exporting ? "animate-spin" : ""} />
                {exporting ? "Preparing..." : "Export Excel"}
              </button>
              <button
                className="presence-btn presence-btn-outline"
                onClick={handleExportCSV}
                title="Export Monthly Attendance to CSV"
              >
                <Download size={14} /> CSV
              </button>
            </div>
          </section>

      {/* KPI Cards Grid (4x2) */}
      <section className="presence-kpi-grid">
        <div className="presence-kpi-card">
          <div className="presence-kpi-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
            <Calendar size={20} />
          </div>
          <div className="presence-kpi-info">
            <strong>
              {summary.elapsedWorkingDays} / {summary.totalWorkingDays}
            </strong>
            <p>Working Days (Elapsed / Total)</p>
          </div>
        </div>

        <div className="presence-kpi-card">
          <div className="presence-kpi-icon" style={{ background: "#ecfdf5", color: "#10b981" }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="presence-kpi-info">
            <strong style={{ color: "#065f46" }}>{summary.averageAttendanceRate}%</strong>
            <p>Avg Staff Attendance</p>
          </div>
        </div>

        <div className="presence-kpi-card">
          <div className="presence-kpi-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
            <Users size={20} />
          </div>
          <div className="presence-kpi-info">
            <strong style={{ color: "#15803d" }}>{summary.totalPresentDays}</strong>
            <p>Total Present Man-Days</p>
          </div>
        </div>

        <div className="presence-kpi-card">
          <div className="presence-kpi-icon" style={{ background: "#faf5ff", color: "#9333ea" }}>
            <Coffee size={20} />
          </div>
          <div className="presence-kpi-info">
            <strong>{summary.totalLeaves}</strong>
            <p>Approved Leaves</p>
          </div>
        </div>

        <div className="presence-kpi-card">
          <div className="presence-kpi-icon" style={{ background: "#f0f9ff", color: "#0284c7" }}>
            <MapPin size={20} />
          </div>
          <div className="presence-kpi-info">
            <strong>{summary.totalFieldWork}</strong>
            <p>Field / Client Visits</p>
          </div>
        </div>

        <div className="presence-kpi-card">
          <div className="presence-kpi-icon" style={{ background: "#fef2f2", color: "#dc2626" }}>
            <AlertTriangle size={20} />
          </div>
          <div className="presence-kpi-info">
            <strong style={{ color: "#991b1b" }}>{summary.totalAbsences}</strong>
            <p>Recorded Absences</p>
          </div>
        </div>

        <div className="presence-kpi-card">
          <div className="presence-kpi-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}>
            <Clock size={20} />
          </div>
          <div className="presence-kpi-info">
            <strong>{summary.totalHoursLogged}h</strong>
            <p>Total Hours Logged</p>
          </div>
        </div>

        <div className="presence-kpi-card">
          <div className="presence-kpi-icon" style={{ background: "#fefce8", color: "#ca8a04" }}>
            <AlertTriangle size={20} />
          </div>
          <div className="presence-kpi-info">
            <strong>{summary.totalWarnings}</strong>
            <p>Warnings Recorded</p>
          </div>
        </div>
      </section>

      {/* Monthly Attendance Matrix Card */}
      <section className="presence-table-card">
        {/* Toolbar & Badges Legend */}
        <div className="presence-toolbar">
          <div className="presence-search-input">
            <Search size={16} color="#94a3b8" />
            <input
              type="search"
              placeholder="Search staff by name, email, phone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="monthly-legend-group">
            <span className="monthly-legend-item">
              <span className="att-chip att-chip-p">P</span> Present
            </span>
            <span className="monthly-legend-item">
              <span className="att-chip att-chip-hd">HD</span> Half Day
            </span>
            <span className="monthly-legend-item">
              <span className="att-chip att-chip-l">L</span> Leave
            </span>
            <span className="monthly-legend-item">
              <span className="att-chip att-chip-f">F</span> Field Visit
            </span>
            <span className="monthly-legend-item">
              <span className="att-chip att-chip-a">A</span> Absent
            </span>
            <span className="monthly-legend-item">
              <span className="att-chip att-chip-wo">WO</span> Weekly Off
            </span>
          </div>

          <div className="presence-filter-tabs">
            <button
              className={`presence-filter-tab ${roleFilter === "all" ? "active" : ""}`}
              onClick={() => setRoleFilter("all")}
            >
              All ({data?.staff?.length || 0})
            </button>
            <button
              className={`presence-filter-tab ${roleFilter === "SUPER_ADMIN" ? "active" : ""}`}
              onClick={() => setRoleFilter("SUPER_ADMIN")}
            >
              Super Admin
            </button>
            <button
              className={`presence-filter-tab ${roleFilter === "MANAGER" ? "active" : ""}`}
              onClick={() => setRoleFilter("MANAGER")}
            >
              Managers
            </button>
            <button
              className={`presence-filter-tab ${roleFilter === "AGENT" ? "active" : ""}`}
              onClick={() => setRoleFilter("AGENT")}
            >
              Agents
            </button>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="monthly-matrix-wrap" ref={tableContainerRef}>
          <table className="monthly-matrix-table">
            <thead>
              <tr>
                <th className="sticky-col-user">Staff Member</th>
                <th className="sticky-col-role">Role</th>
                {data?.days?.map((d) => (
                  <th
                    key={d.dateStr}
                    className={`day-col-head ${d.isSunday ? "day-sunday" : ""} ${
                      d.isToday ? "day-today" : ""
                    }`}
                    title={`${d.dateStr} (${d.weekday})`}
                  >
                    <div className="day-number">{d.dayNumber}</div>
                    <div className="day-weekday">
                      {d.weekday} <span style={{ opacity: 0.75, fontSize: 9 }}>• {d.monthShort}</span>
                    </div>
                  </th>
                ))}
                <th className="summary-th col-stat" title="Full Day Present">P</th>
                <th className="summary-th col-stat" title="Half Day Present">HD</th>
                <th className="summary-th col-stat" title="Approved Leaves">L</th>
                <th className="summary-th col-stat" title="Field / Client Visits">F</th>
                <th className="summary-th col-stat" title="Absent Days">A</th>
                <th className="summary-th col-att" title="Attendance Percentage">Att. %</th>
                <th className="summary-th col-hours" title="Total Logged Hours">Hours</th>
                <th className="summary-th col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={(data?.days?.length || 30) + 10}
                    style={{ textAlign: "center", padding: 36, color: "#64748b" }}
                  >
                    <RefreshCw size={20} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                    Loading monthly attendance records...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td
                    colSpan={(data?.days?.length || 30) + 10}
                    style={{ textAlign: "center", padding: 36, color: "#64748b" }}
                  >
                    No staff records match the search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staffItem) => {
                  const { user, summary: s, days: staffDays } = staffItem;
                  return (
                    <tr key={user.id}>
                      {/* Sticky User Info */}
                      <td className="sticky-col-user">
                        <div className="presence-user-cell">
                          <div className="presence-avatar">
                            {(user.name || user.email)[0].toUpperCase()}
                          </div>
                          <div className="presence-user-meta">
                            <strong className="presence-user-name" title={user.name}>
                              {user.name}
                            </strong>
                            <span className="presence-user-email" title={user.email}>
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Sticky Role */}
                      <td className="sticky-col-role">
                        <span className="presence-role-badge">
                          {user.role ? user.role.replace(/_/g, " ") : "STAFF"}
                        </span>
                      </td>

                      {/* Day Columns */}
                      {staffDays.map((d) => {
                        const isSunday = d.status === "WO";
                        const isFuture = d.status === "FUTURE";
                        const hasPunch = Boolean(d.punchIn);
                        const isLeave = d.status === "LEAVE";
                        const isField = d.status === "FIELD_WORK";

                        return (
                          <td
                            key={d.date || d.day}
                            className={`day-cell ${isSunday ? "day-sunday" : ""} ${d.isToday ? "day-today" : ""} ${isFuture ? "day-future" : ""}`}
                            title={`${d.date} (${d.weekday}): ${d.label} ${
                              d.hours ? `• ${d.hours}h` : ""
                            } ${d.punchIn ? `(In: ${d.punchIn}, Out: ${d.punchOut || "Active"})` : ""}`}
                          >
                            {hasPunch ? (
                              <div
                                className={`day-punch-box punch-${d.badge.toLowerCase()} ${d.isToday ? "punch-today" : ""}`}
                                onClick={() => setSelectedStaff(staffItem)}
                                title={`${staffItem.user.name} • ${d.date} (${d.weekday}): In: ${d.punchIn}, Out: ${d.punchOut || "Active"}. Click to view details.`}
                              >
                                <div className="day-punch-row">
                                  <span className="punch-tag punch-tag-in">IN</span>
                                  <span className="punch-time punch-time-in">{d.punchIn}</span>
                                </div>
                                <div className="day-punch-row">
                                  <span className={`punch-tag ${d.punchOut ? "punch-tag-out" : "punch-tag-active"}`}>
                                    OUT
                                  </span>
                                  <span className={`punch-time ${!d.punchOut ? "punch-time-active" : "punch-time-out"}`}>
                                    {d.punchOut || (d.date === data?.currentDate ? "Active" : "--:--")}
                                  </span>
                                </div>
                              </div>
                            ) : isSunday ? (
                              <div className="day-wo-cell" title="Weekly Off (Sunday)">
                                <span className="day-wo-text">WO</span>
                              </div>
                            ) : isFuture ? (
                              <span className="day-future-dash" title="Upcoming Date">—</span>
                            ) : isLeave ? (
                              <div
                                className="day-punch-box punch-leave"
                                onClick={() => setSelectedStaff(staffItem)}
                                title={d.reason || "Approved Leave"}
                              >
                                <span className="punch-tag punch-tag-leave">LEAVE</span>
                              </div>
                            ) : isField ? (
                              <div
                                className="day-punch-box punch-field"
                                onClick={() => setSelectedStaff(staffItem)}
                                title={d.reason || "Field Work"}
                              >
                                <span className="punch-tag punch-tag-field">FIELD</span>
                              </div>
                            ) : (
                              /* Absent Day: Shows clean structured IN and OUT */
                              <div
                                className="day-punch-box punch-absent"
                                onClick={() => setSelectedStaff(staffItem)}
                                title={`${d.date} (${d.weekday}): Absent (No punch recorded). Click to view details.`}
                              >
                                <div className="day-punch-row">
                                  <span className="punch-tag punch-tag-absent">IN</span>
                                  <span className="punch-time punch-time-absent">--:--</span>
                                </div>
                                <div className="day-punch-row">
                                  <span className="punch-tag punch-tag-absent">OUT</span>
                                  <span className="punch-time punch-time-absent">--:--</span>
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Summary Metrics */}
                      <td className="summary-td col-stat"><span className="summary-stat-num summary-stat-p">{s.presentDays}</span></td>
                      <td className="summary-td col-stat"><span className="summary-stat-num summary-stat-hd">{s.halfDays}</span></td>
                      <td className="summary-td col-stat"><span className="summary-stat-num summary-stat-l">{s.leaveDays}</span></td>
                      <td className="summary-td col-stat"><span className="summary-stat-num summary-stat-f">{s.fieldWorkDays}</span></td>
                      <td className="summary-td col-stat"><span className="summary-stat-num summary-stat-a">{s.absentDays}</span></td>

                      {/* Attendance % */}
                      <td className="summary-td col-att">
                        <span
                          className={`presence-pct-badge ${
                            s.attendancePercentage >= 85
                              ? "pct-good"
                              : s.attendancePercentage >= 70
                              ? "pct-warn"
                              : "pct-bad"
                          }`}
                        >
                          {s.attendancePercentage}%
                        </span>
                      </td>

                      {/* Total Hours */}
                      <td className="summary-td col-hours">
                        <span className="summary-hours-val">{s.totalHours}h</span>
                      </td>

                      {/* Action */}
                      <td className="summary-td col-actions">
                        <button
                          className="presence-action-btn"
                          onClick={() => setSelectedStaff(staffItem)}
                          title="View Day-by-Day Activity Details"
                        >
                          Details <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )}

  {/* Staff Day-by-Day Drill-Down Drawer / Modal */}
      {selectedStaff && (
        <ModalPortal>
          <div
            className="presence-drawer-backdrop"
            onClick={() => setSelectedStaff(null)}
          >
            <div
              className="presence-drawer monthly-detail-drawer"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="presence-drawer-head">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="presence-avatar">
                    {(selectedStaff.user.name || selectedStaff.user.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16 }}>{selectedStaff.user.name}</h3>
                    <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                      {selectedStaff.user.email} • {selectedStaff.user.role}
                    </p>
                  </div>
                </div>
                <button
                  className="presence-btn presence-btn-outline"
                  onClick={() => setSelectedStaff(null)}
                  style={{ padding: "6px" }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="presence-drawer-body">
                {/* Month Summary KPI */}
                <div className="monthly-staff-kpis">
                  <div className="monthly-staff-kpi">
                    <strong>{selectedStaff.summary.presentDays}</strong>
                    <span>Present Days</span>
                  </div>
                  <div className="monthly-staff-kpi">
                    <strong>{selectedStaff.summary.halfDays}</strong>
                    <span>Half Days</span>
                  </div>
                  <div className="monthly-staff-kpi">
                    <strong>{selectedStaff.summary.leaveDays}</strong>
                    <span>Leaves</span>
                  </div>
                  <div className="monthly-staff-kpi">
                    <strong>{selectedStaff.summary.fieldWorkDays}</strong>
                    <span>Field Work</span>
                  </div>
                  <div className="monthly-staff-kpi">
                    <strong style={{ color: "#dc2626" }}>{selectedStaff.summary.absentDays}</strong>
                    <span>Absences</span>
                  </div>
                  <div className="monthly-staff-kpi">
                    <strong style={{ color: "#1c6c39" }}>
                      {selectedStaff.summary.attendancePercentage}%
                    </strong>
                    <span>Attendance</span>
                  </div>
                  <div className="monthly-staff-kpi">
                    <strong>{selectedStaff.summary.totalHours}h</strong>
                    <span>Logged Hours</span>
                  </div>
                  <div className="monthly-staff-kpi">
                    <strong>{selectedStaff.summary.warningsCount}</strong>
                    <span>Warnings</span>
                  </div>
                </div>

                <h4 style={{ margin: "14px 0 8px", fontSize: 14 }}>
                  Day-by-Day Shift Log ({data?.monthName})
                </h4>

                <div className="monthly-day-log-table-wrap">
                  <table className="presence-table">
                    <thead>
                      <tr>
                        <th>Date & Day</th>
                        <th>Status</th>
                        <th>IN Time</th>
                        <th>OUT Time</th>
                        <th>Hours</th>
                        <th>Warnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStaff.days.map((d) => (
                        <tr key={d.day}>
                          <td>
                            <strong>Day {d.day}</strong> ({d.weekday})
                            <div style={{ fontSize: 11, color: "#64748b" }}>{d.date}</div>
                          </td>
                          <td>
                            <span className={`att-chip att-chip-${d.badge.toLowerCase()}`}>
                              {d.badge}
                            </span>{" "}
                            <span style={{ fontSize: 12, marginLeft: 4 }}>{d.label}</span>
                          </td>
                          <td style={{ fontSize: 12 }}>
                            {d.punchIn || <span style={{ color: "#94a3b8" }}>--</span>}
                          </td>
                          <td style={{ fontSize: 12 }}>
                            {d.punchOut || <span style={{ color: "#94a3b8" }}>--</span>}
                          </td>
                          <td style={{ fontSize: 12, fontWeight: 600 }}>
                            {d.hours > 0 ? `${d.hours}h` : <span style={{ color: "#94a3b8" }}>0h</span>}
                          </td>
                          <td>
                            {d.warnings > 0 ? (
                              <span className="presence-warning-badge badge-warn-1">
                                {d.warnings} warn
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, color: "#94a3b8" }}>-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
