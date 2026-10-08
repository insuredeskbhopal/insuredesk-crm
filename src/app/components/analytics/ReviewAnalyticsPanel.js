"use client";

import { useState, useEffect } from "react";
import {
  ExternalLink,
  Eye,
  TrendingUp,
  RefreshCw,
  Star,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export default function ReviewAnalyticsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/review/analytics");
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("You must be logged into the CRM to view review analytics.");
        }
        throw new Error("Failed to load review analytics data.");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.error || "Invalid response format.");
      }
    } catch (err) {
      setError(err.message || "Unable to fetch review analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const metrics = data?.metrics || {
    totalVisits: 0,
    approxUniqueVisits: 0,
    googleClicks: 0,
    clickThroughRate: 0,
    redirectShortcuts: 0,
    qrVisits: 0,
    whatsappVisits: 0,
    privateFeedbackCount: 0,
  };

  const sources = data?.sourceBreakdown || {};
  const feedbackList = data?.recentFeedback || [];

  return (
    <div className="space-y-6">
      {/* Header with Title and Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Google Review & Feedback Analytics</h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200">
              Live Production
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Privacy-conscious telemetry from /review and /r campaigns
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-blue-600" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Visits</span>
            <Eye size={15} className="text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{metrics.totalVisits}</div>
          <div className="text-[11px] text-slate-500">
            ~{metrics.approxUniqueVisits} unique visitors
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Google Review Clicks</span>
            <ExternalLink size={15} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{metrics.googleClicks}</div>
          <div className="text-[11px] text-indigo-700 font-semibold">
            {metrics.clickThroughRate}% Click-through rate
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Channel Attribution</span>
            <TrendingUp size={15} className="text-emerald-600" />
          </div>
          <div className="text-sm font-bold text-slate-800 space-y-0.5">
            <div>QR: <span className="text-slate-900">{metrics.qrVisits}</span></div>
            <div>WhatsApp: <span className="text-slate-900">{metrics.whatsappVisits}</span></div>
          </div>
          <div className="text-[10px] text-slate-400">Redirects (/r): {metrics.redirectShortcuts}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Private Feedback</span>
            <Star size={15} className="text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{metrics.privateFeedbackCount}</div>
          <div className="text-[11px] text-slate-500">Direct notes received</div>
        </div>
      </div>

      {/* Transparency & Methodology Note */}
      <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-amber-900 text-xs flex items-start gap-2.5">
        <HelpCircle size={15} className="text-amber-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Transparency Notice:</strong> Google review button clicks represent customers who proceeded to the official Google Business Profile review form. Google does not publish an automated webhook to verify individual reviews completed off-site. Figures are strictly reported as clicks and direct feedback, not claimed reviews.
        </p>
      </div>

      {/* Attribution Sources Breakdown */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
          Campaign & Traffic Sources
        </h3>
        {Object.keys(sources).length === 0 ? (
          <p className="text-xs text-slate-400 italic">No source attribution recorded yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.entries(sources).map(([src, count]) => (
              <span
                key={src}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5"
              >
                <span>{src}:</span>
                <span className="font-extrabold text-blue-700">{count}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Private Customer Feedback Submissions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Private Customer Feedback ({feedbackList.length})
          </h3>
          <span className="text-xs text-slate-400">Confidential direct submissions</span>
        </div>

        {feedbackList.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">
            No private customer feedback received yet. New submissions will appear here in real-time.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Consent</th>
                  <th className="px-4 py-3">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {feedbackList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {item.timestamp ? new Date(item.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold">
                      {item.rating ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                          {item.rating} ★
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-900">
                      {item.name || "Anonymous"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {item.contact || "Not provided"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.consent ? (
                        <span className="text-emerald-700 font-semibold">Yes</span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs break-words text-slate-800">
                      {item.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
