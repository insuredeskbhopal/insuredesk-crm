"use client";

import { useEffect, useState, useMemo } from "react";
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
} from "lucide-react";
import ModalPortal from "@/app/components/shared/ModalPortal";

export default function MonthlyAttendanceView() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedStaff, setSelectedStaff] = useState(null);

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

  const handlePrevMonth = () => {
    const [yearStr, mStr] = currentMonth.split("-");
    let y = parseInt(yearStr, 10);
    let m = parseInt(mStr, 10) - 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    setCurrentMonth(`${y}-${String(m).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    const [yearStr, mStr] = currentMonth.split("-");
    let y = parseInt(yearStr, 10);
    let m = parseInt(mStr, 10) + 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
    setCurrentMonth(`${y}-${String(m).padStart(2, "0")}`);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    setCurrentMonth(`${year}-${month}`);
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

  // Export to CSV function
  const handleExportCSV = () => {
    if (!data || !data.staff) return;

    const daysCount = data.totalDays;
    const headerRow = [
      "Staff Name",
      "Email",
      "Role",
      "WhatsApp",
      "Today First In",
      ...Array.from({ length: daysCount }, (_, i) => `Day ${i + 1}`),
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
      `Staff_Monthly_Attendance_${data.month}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              <Calendar size={18} color="#1c6c39" />
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
            onClick={handleExportCSV}
            title="Export Monthly Attendance to CSV"
          >
            <Download size={14} /> Export CSV
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
        <div className="monthly-matrix-wrap">
          <table className="monthly-matrix-table">
            <thead>
              <tr>
                <th className="sticky-col-user">Staff Member</th>
                <th className="sticky-col-role">Role</th>
                {data?.days?.map((d) => (
                  <th
                    key={d.dayNumber}
                    className={`day-col-head ${d.isSunday ? "day-sunday" : ""} ${
                      d.isToday ? "day-today" : ""
                    }`}
                    title={`${d.dateStr} (${d.weekday})`}
                  >
                    <div className="day-number">{d.dayNumber}</div>
                    <div className="day-weekday">{d.weekday}</div>
                  </th>
                ))}
                <th className="summary-th" title="Full Day Present">P</th>
                <th className="summary-th" title="Half Day Present">HD</th>
                <th className="summary-th" title="Approved Leaves">L</th>
                <th className="summary-th" title="Field / Client Visits">F</th>
                <th className="summary-th" title="Absent Days">A</th>
                <th className="summary-th" title="Attendance Percentage">Att. %</th>
                <th className="summary-th" title="Total Logged Hours">Hours</th>
                <th className="summary-th">Actions</th>
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
                          <div>
                            <strong style={{ display: "block", fontSize: 13 }}>{user.name}</strong>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                              <span style={{ fontSize: 11, color: "#64748b" }}>
                                {user.whatsappPhone || user.email}
                              </span>
                              {s.todayPunchIn && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "#065f46",
                                    background: "#ecfdf5",
                                    padding: "1px 5px",
                                    borderRadius: 4,
                                    border: "1px solid #a7f3d0",
                                    whiteSpace: "nowrap",
                                  }}
                                  title={`First login time today: ${s.todayPunchIn}`}
                                >
                                  In: {s.todayPunchIn}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Sticky Role */}
                      <td className="sticky-col-role">
                        <span className="presence-role-badge">{user.role}</span>
                      </td>

                      {/* Day Columns */}
                      {staffDays.map((d) => (
                        <td
                          key={d.day}
                          className={`day-cell ${d.status === "WO" ? "day-sunday" : ""}`}
                          title={`${d.date} (${d.weekday}): ${d.label} ${
                            d.hours ? `• ${d.hours}h` : ""
                          } ${d.punchIn ? `(In: ${d.punchIn}, Out: ${d.punchOut})` : ""}`}
                        >
                          <span className={`att-chip att-chip-${d.badge.toLowerCase()}`}>
                            {d.badge}
                          </span>
                        </td>
                      ))}

                      {/* Summary Metrics */}
                      <td className="summary-td font-semibold text-green-700">{s.presentDays}</td>
                      <td className="summary-td text-amber-600">{s.halfDays}</td>
                      <td className="summary-td text-purple-600">{s.leaveDays}</td>
                      <td className="summary-td text-sky-600">{s.fieldWorkDays}</td>
                      <td className="summary-td font-semibold text-red-600">{s.absentDays}</td>

                      {/* Attendance % */}
                      <td className="summary-td">
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
                      <td className="summary-td font-semibold">{s.totalHours}h</td>

                      {/* Action */}
                      <td className="summary-td">
                        <button
                          className="presence-action-btn"
                          onClick={() => setSelectedStaff(staffItem)}
                          title="View Day-by-Day Punch In & Activity Details"
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
                        <th>First Login (In)</th>
                        <th>Last Seen (Out)</th>
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
