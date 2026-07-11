/* eslint-disable no-undef */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LogOut,
  Shield,
  FileText,
  HelpCircle,
  ArrowRight,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  LayoutDashboard,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";


export default function ClientPortal() {
  const [profile, setProfile] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab State: "dashboard", "policies", "claims", "assistance", "profile"
  const [activeTab, setActiveTab] = useState("dashboard");

  // Claim Initiation Form States
  const [showInitiateForm, setShowInitiateForm] = useState(false);
  const [claimForm, setClaimForm] = useState({
    policyNo: "",
    claimType: "Motor",
    claimDescription: "",
    claimDate: new Date().toISOString().split("T")[0],
  });
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState("");

  // Claims Selection State
  const [selectedClaimId, setSelectedClaimId] = useState(null);

  // Carousel State
  const [carouselIndex, setCarouselIndex] = useState(0);

  const carouselSlides = [
    {
      title: "Monsoon Safety Check",
      desc: "Audit warehouse drainage & storage limits before the heavy Bhopal rains.",
      tag: "Alert Desk",
      bg: "from-blue-600 to-indigo-700",
      text: "text-white",
    },
    {
      title: "Preserve Your NCB Bonus",
      desc: "Ask your risk advisor about adding NCB Protect to your vehicle covers.",
      tag: "Smart Saving",
      bg: "from-emerald-600 to-teal-700",
      text: "text-white",
    },
    {
      title: "15+ Cashless Garages",
      desc: "Instant cashless settlement at authorized network partners in Bhopal.",
      tag: "Claims Guide",
      bg: "from-purple-600 to-indigo-700",
      text: "text-white",
    },
  ];

  useEffect(() => {
    const fetchPortalData = async () => {
      try {
        // 1. Fetch Profile
        const profileRes = await fetch("/api/client/profile");
        if (!profileRes.ok) {
          window.location.href = "/login";
          return;
        }
        const profileData = await profileRes.json();
        setProfile(profileData.profile);

        // 2. Fetch Policies
        const policiesRes = await fetch("/api/client/policies");
        if (policiesRes.ok) {
          const policiesData = await policiesRes.json();
          setPolicies(policiesData.policies || []);
        }

        // 3. Fetch Claims
        const claimsRes = await fetch("/api/client/claims");
        if (claimsRes.ok) {
          const claimsData = await claimsRes.json();
          setClaims(claimsData.claims || []);
        }
      } catch (err) {
        console.error("Failed to load portal data:", err);
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    };
    fetchPortalData();
  }, []);

  // Carousel Auto Cycle
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % carouselSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.href = "/login";
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleInitiateClaim = async (e) => {
    e.preventDefault();
    setSubmittingClaim(true);
    setClaimError("");
    setClaimSuccess("");

    if (!claimForm.policyNo) {
      setClaimError("Please select an active policy.");
      setSubmittingClaim(false);
      return;
    }

    const selectedPol = policies.find((p) => {
      const payload = p.reviewedData || p.data || {};
      return payload.policyNumber === claimForm.policyNo;
    });

    const selectedCompany = selectedPol
      ? (selectedPol.selectedCompany || (selectedPol.reviewedData || selectedPol.data || {}).insuranceCompany || "")
      : "";

    try {
      const res = await fetch("/api/client/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyNo: claimForm.policyNo,
          insuranceCompany: selectedCompany,
          claimType: claimForm.claimType,
          claimDescription: claimForm.claimDescription,
          claimDate: claimForm.claimDate,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        setClaimSuccess("Claim submitted successfully!");
        
        // Refresh claims log
        const claimsRes = await fetch("/api/client/claims");
        const claimsData = await claimsRes.json();
        if (claimsData.success) {
          setClaims(claimsData.claims);
        }

        setClaimForm({
          policyNo: "",
          claimType: "Motor",
          claimDescription: "",
          claimDate: new Date().toISOString().split("T")[0],
        });

        setTimeout(() => {
          setShowInitiateForm(false);
          setClaimSuccess("");
        }, 1500);
      } else {
        setClaimError(resData.error || "Failed to initiate claim.");
      }
    } catch (err) {
      setClaimError("Could not reach servers. Please try again.");
    } finally {
      setSubmittingClaim(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f8fafc] text-slate-800 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-emerald-400/20 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[350px] h-[350px] rounded-full bg-blue-400/15 blur-[80px] pointer-events-none" />
        <div className="text-center z-10">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mx-auto" />
          <p className="mt-4 text-sm font-semibold text-slate-600">Securing your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f1f5f9] via-[#f8fafc] to-[#e2e8f0] text-slate-800 flex flex-col font-sans relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] rounded-full bg-emerald-400/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[550px] h-[550px] rounded-full bg-indigo-400/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[35%] right-[15%] w-[400px] h-[400px] rounded-full bg-sky-300/10 blur-[100px] pointer-events-none" />

      {/* ========================================================================= */}
      {/* A. DESKTOP VIEWPORT LAYOUT */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col min-h-screen w-full">
        {/* Navbar */}
        <header className="border-b border-white/40 bg-white/70 backdrop-blur-md sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/brand/main-logo-wide.webp"
                alt="BimaHeadquarter"
                className="h-12 w-auto object-contain"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 bg-white/80 px-3.5 py-1.5 rounded-full border border-slate-200/50 text-xs shadow-sm">
                <User size={12} className="text-emerald-600" />
                <span className="font-semibold text-slate-700">{profile?.name}</span>
                <span className="bg-emerald-500/10 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border border-emerald-500/20">
                  Client
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 border border-red-200/50 hover:bg-red-600 hover:text-white transition-all cursor-pointer shadow-sm"
              >
                <LogOut size={13} />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Tab Selection Header Menu */}
        <div className="border-b border-slate-200/50 bg-white/40 backdrop-blur-md z-10 sticky top-16">
          <div className="max-w-7xl mx-auto px-8 flex items-center gap-6">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "policies", label: "Active Policies", icon: FileText },
              { id: "claims", label: "Claims Support", icon: Shield },
              { id: "assistance", label: "Need Assistance?", icon: HelpCircle },
              { id: "profile", label: "My Profile", icon: User },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "border-emerald-600 text-emerald-600"
                      : "border-transparent text-emerald-800/50 hover:text-emerald-700 hover:border-emerald-300/40"
                  }`}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Workspace Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10">
          
          {/* 1. Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* Desktop Promo Banner Carousel */}
              <div className="relative rounded-[20px] overflow-hidden bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-6 shadow-sm flex items-center justify-between">
                <div className="space-y-2 max-w-2xl">
                  <span className="bg-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider force-white">
                    {carouselSlides[carouselIndex].tag}
                  </span>
                  <h3 className="text-lg font-semibold force-white">{carouselSlides[carouselIndex].title}</h3>
                  <p className="text-xs leading-relaxed force-slate-light">
                    {carouselSlides[carouselIndex].desc}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setCarouselIndex((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length)}
                    className="p-1.5 rounded-full bg-emerald-800/60 hover:bg-emerald-700/80 text-emerald-200 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCarouselIndex((prev) => (prev + 1) % carouselSlides.length)}
                    className="p-1.5 rounded-full bg-emerald-800/60 hover:bg-emerald-700/80 text-emerald-200 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Information welcome sheet */}
              <div className="relative rounded-[24px] overflow-hidden bg-gradient-to-br from-emerald-50/80 via-sky-50/80 to-indigo-50/80 border border-white/60 p-8 shadow-sm">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] pointer-events-none" />
                <div className="relative z-10">
                  <span className="inline-flex items-center gap-1.5 bg-emerald-600/10 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-emerald-500/20 shadow-sm">
                    <Shield size={12} /> Secure Client Space
                  </span>
                  <h1 className="text-3xl md:text-4xl font-semibold text-slate-800 tracking-tight mb-3">
                    Welcome, <span className="text-emerald-700">{profile?.name || "Client"}</span>
                  </h1>
                  <p className="text-slate-600 text-sm md:text-base leading-relaxed max-w-3xl">
                    This is your dedicated BimaHeadquarter client portal. You can securely track active coverages, review policy expiries, manage claims support, and consult our risk advisors.
                  </p>
                </div>
              </div>

              {/* Stats overview boxes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div
                  onClick={() => setActiveTab("policies")}
                  className="bg-white/75 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all flex items-center gap-4 text-left cursor-pointer"
                >
                  <div className="h-12 w-12 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200 shadow-sm">
                    <FileText size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{policies.length}</div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Coverages</div>
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab("claims")}
                  className="bg-white/75 backdrop-blur-md border border-white/50 p-6 rounded-2xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all flex items-center gap-4 text-left cursor-pointer"
                >
                  <div className="h-12 w-12 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200 shadow-sm">
                    <Shield size={22} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{claims.length}</div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tracked Claims</div>
                  </div>
                </div>

                <div className="bg-gradient-to-tr from-emerald-50/70 to-teal-50/70 border border-emerald-100/85 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200 shadow-sm">
                    <Phone size={20} />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-700">88188 89660</div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bhopal Hotline</div>
                  </div>
                </div>
              </div>

              {/* Useful Client Panels Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                {/* Emergency Triage Checklist */}
                <div className="bg-white/75 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <AlertTriangle size={14} /> Accident & Emergency Triage
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    In the event of an accident or loss, follow this procedure to secure your coverage claims:
                  </p>
                  <div className="space-y-3.5 text-xs text-slate-600">
                    <div className="flex gap-3">
                      <span className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0">1</span>
                      <p className="leading-relaxed">Document all damages visually immediately at the spot.</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0">2</span>
                      <p className="leading-relaxed">Call direct Bhopal hotline at <strong className="text-slate-800">88188 89660</strong> to log roadside towing assistance.</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0">3</span>
                      <p className="leading-relaxed">Attach receipts and report the file directly inside the Claims Support tab.</p>
                    </div>
                  </div>
                </div>

                {/* Expiry overview list */}
                <div className="bg-white/75 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                      <CalendarDays size={14} /> Policy Renewal Timelines
                    </h3>
                    {policies.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center">No active policies tracked.</p>
                    ) : (
                      <div className="space-y-3.5">
                        {policies.slice(0, 3).map((p) => {
                          const payload = p.reviewedData || p.data || {};
                          return (
                            <div key={p.id} className="flex justify-between items-center text-xs pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                              <div>
                                <div className="font-bold text-slate-800 truncate max-w-[220px]">
                                  {payload.policyNumber || "Pending Reference"}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {p.selectedCompany || payload.insuranceCompany || "-"}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block">Renewal Date</span>
                                <span className="font-semibold text-slate-700">
                                  {formatDate(p.renewalDate || payload.policyExpiryDate)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setActiveTab("policies")}
                    className="w-full flex items-center justify-between p-3.5 mt-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-500 hover:bg-white text-xs font-bold text-slate-700 transition-all shadow-sm cursor-pointer"
                  >
                    <span>View all policies expiries</span>
                    <ArrowRight size={13} className="text-slate-500" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. Policies Tab */}
          {activeTab === "policies" && (
            <div className="bg-white/75 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="text-emerald-600" size={18} />
                  <h2 className="text-lg font-bold text-slate-800">My Active Insurance Coverages</h2>
                </div>
                <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-slate-200/50">
                  {policies.length} Policies
                </span>
              </div>

              {policies.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-slate-55 flex items-center justify-center text-slate-400 border border-slate-200/30">
                    <FileText size={22} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">No active policies found</h3>
                  <p className="text-xs text-slate-400 max-w-[280px] leading-relaxed">
                    Your commercial risk advisor will upload your active coverages shortly.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-3 pr-4">Policy / Type</th>
                        <th className="py-3 px-4">Insurer</th>
                        <th className="py-3 px-4">Expiry Date</th>
                        <th className="py-3 pl-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {policies.map((p) => {
                        const payload = p.reviewedData || p.data || {};
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 text-slate-650 transition-colors">
                            <td className="py-3 pr-4">
                              <div className="font-bold text-slate-800 truncate max-w-[200px]">
                                {payload.policyNumber || "Pending Issuance"}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {p.selectedPolicyType || payload.policyType || "General"}
                              </div>
                            </td>
                            <td className="py-3 px-4 truncate max-w-[120px] font-semibold text-slate-700">
                              {p.selectedCompany || payload.insuranceCompany || "-"}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-500">
                              {formatDate(p.renewalDate || payload.policyExpiryDate)}
                            </td>
                            <td className="py-3 pl-4 text-right">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                p.isActivePolicy
                                  ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                                  : "bg-slate-100 text-slate-500 border border-slate-200"
                              }`}>
                                {p.isActivePolicy ? "Active" : "Expired"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 3. Claims Tab */}
          {activeTab === "claims" && (
            <div className="space-y-6">
              {showInitiateForm ? (
                <div className="bg-white/75 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-sm">
                  <form onSubmit={handleInitiateClaim} className="space-y-4 max-w-xl mx-auto py-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Initiate New Claim</h3>
                      <button
                        type="button"
                        onClick={() => setShowInitiateForm(false)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    {claimError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
                        {claimError}
                      </div>
                    )}

                    {claimSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-600">
                        {claimSuccess}
                      </div>
                    )}

                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Select Policy</label>
                        <select
                          value={claimForm.policyNo}
                          onChange={(e) => {
                            const selectedPolicyNo = e.target.value;
                            const selectedPolicy = policies.find((p) => {
                              const payload = p.reviewedData || p.data || {};
                              return payload.policyNumber === selectedPolicyNo;
                            });
                            const polType = selectedPolicy
                              ? (selectedPolicy.selectedPolicyType || (selectedPolicy.reviewedData || selectedPolicy.data || {}).policyType || "Motor")
                              : "Motor";
                            setClaimForm({ ...claimForm, policyNo: selectedPolicyNo, claimType: polType });
                          }}
                          className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white"
                          required
                        >
                          <option value="">-- Select Active Policy --</option>
                          {policies.map((p) => {
                            const payload = p.reviewedData || p.data || {};
                            return (
                              <option key={p.id} value={payload.policyNumber}>
                                {payload.policyNumber} ({p.selectedCompany || payload.insuranceCompany || "-"} / {p.selectedPolicyType || payload.policyType || "General"})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Claim Type / Line of Business</label>
                        <select
                          value={claimForm.claimType}
                          onChange={(e) => setClaimForm({ ...claimForm, claimType: e.target.value })}
                          className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all bg-white"
                          required
                        >
                          <option value="Motor">Motor</option>
                          <option value="Health">Health</option>
                          <option value="Fire">Fire</option>
                          <option value="Marine">Marine</option>
                          <option value="Burglary">Burglary</option>
                          <option value="Engineering">Engineering</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Date of Accident / Loss</label>
                        <input
                          type="date"
                          value={claimForm.claimDate}
                          onChange={(e) => setClaimForm({ ...claimForm, claimDate: e.target.value })}
                          className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">Incident Details / Description</label>
                        <textarea
                          value={claimForm.claimDescription}
                          onChange={(e) => setClaimForm({ ...claimForm, claimDescription: e.target.value })}
                          placeholder="Describe the incident, damage, or medical event..."
                          className="w-full min-h-[96px] p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-vertical"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingClaim}
                      className="w-full mt-4 h-10 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer force-white"
                    >
                      {submittingClaim ? (
                        <span className="force-white">Initiating Claim...</span>
                      ) : (
                        <span className="force-white">Initiate Claim</span>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  {/* Claims log list section */}
                  <div className="bg-white/75 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Shield className="text-emerald-600" size={18} />
                        <h2 className="text-lg font-bold text-slate-800">Claims Log & Progress</h2>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setClaimError("");
                            setClaimSuccess("");
                            setShowInitiateForm(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer force-white"
                        >
                          <span className="force-white">+ Initiate Claim</span>
                        </button>
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-slate-200/50">
                          {claims.length} Claims
                        </span>
                      </div>
                    </div>

                    {claims.length === 0 ? (
                      <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
                        <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-200/30">
                          <Shield size={22} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700">No active claims reported</h3>
                        <p className="text-xs text-slate-400 max-w-[280px] leading-relaxed">
                          If you need claim assistance, please click &ldquo;+ Initiate Claim&rdquo; to file a new request.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {claims.map((c) => (
                          <div key={c.id} className="bg-white/60 border border-slate-200/50 rounded-xl p-4 flex items-center justify-between hover:border-slate-350 transition-colors shadow-sm">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-800">{c.claimNo}</span>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/60 font-semibold">
                                  {c.claimType}
                                </span>
                              </div>
                              <p className="text-xs text-slate-550 line-clamp-1 max-w-[320px]">
                                {c.claimDescription || "No description provided."}
                              </p>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                <Calendar size={10} />
                                <span>Filed: {formatDate(c.claimDate)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                c.claimStatus.toLowerCase() === "open"
                                  ? "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                                  : c.claimStatus.toLowerCase() === "settled" || c.claimStatus.toLowerCase() === "completed"
                                  ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                                  : "bg-slate-100 text-slate-500 border border-slate-200"
                              }`}>
                                {c.claimStatus}
                              </span>
                              <div
                                onClick={() => setSelectedClaimId(selectedClaimId === c.id ? null : c.id)}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-600 hover:text-white cursor-pointer transition-all text-[10px] font-bold shadow-sm"
                              >
                                {selectedClaimId === c.id ? "Hide Details" : "Track Claim"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Claim Tracker Detail Card (CRM Live Data) */}
                  {selectedClaimId && claims.find(c => c.id === selectedClaimId) && (() => {
                    const activeClaim = claims.find(c => c.id === selectedClaimId);
                    return (
                      <div className="bg-white/75 backdrop-blur-md border-2 border-emerald-500/30 rounded-2xl p-5 shadow-md space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Live CRM Tracking Desk</span>
                            <h3 className="text-sm font-bold text-slate-800">Claim File: {activeClaim.claimNo}</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedClaimId(null)}
                            className="text-xs font-bold text-slate-400 hover:text-slate-650"
                          >
                            ✕ Close Tracker
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                            <span className="text-xs font-bold text-slate-850 block mt-0.5 capitalize">{activeClaim.claimStatus}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Associated Policy</span>
                            <span className="text-xs font-bold text-slate-850 block mt-0.5">{activeClaim.policyNo || "-"}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Incident Date</span>
                            <span className="text-xs font-bold text-slate-850 block mt-0.5">{formatDate(activeClaim.claimDate)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Next Operations Review</span>
                            <span className="text-xs font-bold text-slate-850 block mt-0.5">
                              {activeClaim.followUpDate ? formatDate(activeClaim.followUpDate) : "Constant Assessment"}
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-xl space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Latest Desk Remark / CRM Status Updates</span>
                          <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                            {activeClaim.currentRemark || "Your claim is currently undergoing document verification by our backend office. No remarks updated yet."}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* 4. Assistance Tab */}
          {activeTab === "assistance" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white/75 backdrop-blur-md border border-white/50 rounded-2xl p-6 flex flex-col shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-500/20 shadow-sm">
                  <HelpCircle size={18} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Need Assistance?</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  Our Bhopal desk handles full-scope claim document verification, policy NCB transfers, limit audits, and coverage endorsements.
                </p>
                <div className="space-y-3 mt-auto">
                  <Link
                    href="/contact"
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white/60 border border-slate-200/70 hover:border-emerald-500/80 hover:bg-white text-xs font-bold text-slate-700 transition-all group shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  >
                    <span>Request Claim Support</span>
                    <ArrowRight size={13} className="text-slate-400 group-hover:translate-x-0.5 group-hover:text-emerald-600 transition-all" />
                  </Link>
                  <Link
                    href="/contact"
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white/60 border border-slate-200/70 hover:border-emerald-500/80 hover:bg-white text-xs font-bold text-slate-700 transition-all group shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  >
                    <span>Consult Risk Advisor</span>
                    <ArrowRight size={13} className="text-slate-400 group-hover:translate-x-0.5 group-hover:text-emerald-600 transition-all" />
                  </Link>
                </div>
              </div>

              <div className="bg-gradient-to-tr from-emerald-50/70 to-teal-50/70 border border-emerald-100/85 rounded-2xl p-6 text-center shadow-sm flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-emerald-800/80 tracking-wider">Direct Bhopal Hotline</span>
                <h4 className="text-2xl font-black text-emerald-700 mt-1 mb-2 tracking-wide">88188 89660</h4>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Call our commercial desk directly for renewals or claim status updates.
                </p>
              </div>
            </div>
          )}

          {/* 5. Profile Tab */}
          {activeTab === "profile" && (
            <div className="bg-white/75 backdrop-blur-md border border-white/50 rounded-2xl p-8 shadow-sm max-w-2xl">
              <h2 className="text-xl font-bold text-slate-800 mb-6 pb-2 border-b border-slate-100 flex items-center gap-2">
                <User size={20} className="text-emerald-600" />
                <span>My Customer Profile Card</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Registered Name</span>
                  <div className="text-sm font-semibold text-slate-800">{profile?.name || "-"}</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Mobile Number</span>
                  <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <Phone size={13} className="text-slate-400" />
                    <span>{profile?.phone || "-"}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Email Address</span>
                  <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <Mail size={13} className="text-slate-400" />
                    <span>{profile?.email || "-"}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Client ID (Unique Ref)</span>
                  <div className="text-xs font-mono font-bold text-slate-600">{profile?.id || "-"}</div>
                </div>

                {profile?.address && (
                  <div className="md:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Registered Address</span>
                    <div className="text-sm font-semibold text-slate-800 flex items-start gap-1.5">
                      <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                      <span>{profile.address}, {profile.city}, {profile.state}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/40 py-6 text-center text-xs text-slate-400 bg-white/50 z-10 backdrop-blur-sm mt-auto">
          © {new Date().getFullYear()} BIMAHEADQUARTER. Secured Client Workspace.
        </footer>
      </div>

      {/* ========================================================================= */}
      {/* B. MOBILE APP VIEWPORT LAYOUT */}
      {/* ========================================================================= */}
      <div className="flex md:hidden flex-col min-h-screen w-full bg-[#f8fafc] z-10 pb-20">
        {/* Sticky Mobile App Bar */}
        <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200/60 px-4 h-14 flex items-center justify-between z-30 shadow-sm">
          <div className="flex items-center gap-1.5">
            <img
              src="/brand/main-logo-wide.webp"
              alt="BimaHeadquarter"
              className="h-9 w-auto object-contain"
            />
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-colors shadow-sm"
          >
            <LogOut size={10} />
            <span>Logout</span>
          </button>
        </header>

        {/* Constrained layout column feed */}
        <div className="max-w-md w-full mx-auto px-4 py-5 flex-1 flex flex-col gap-5">

          {/* 1. Mobile Dashboard View */}
          {activeTab === "dashboard" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              
              {/* Premium Auto-cycling Promotional Banner Card Carousel */}
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-4 shadow-md min-h-[110px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="bg-emerald-500 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider force-white">
                      {carouselSlides[carouselIndex].tag}
                    </span>
                    <div className="flex gap-1.5">
                      {carouselSlides.map((_, idx) => (
                        <div
                          key={idx}
                          className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                            carouselIndex === idx ? "bg-emerald-400 w-3" : "bg-emerald-700/50"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <h3 className="text-[12.5px] font-bold mt-1.5 tracking-wide force-white">
                    {carouselSlides[carouselIndex].title}
                  </h3>
                  <p className="text-[10px] mt-1 leading-relaxed force-slate-light">
                    {carouselSlides[carouselIndex].desc}
                  </p>
                </div>
              </div>

              {/* Premium Digital Client Pass Card */}
              <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl p-5 text-white shadow-md relative overflow-hidden flex flex-col justify-between h-44">
                <div className="absolute inset-0 bg-white/5 backdrop-blur-[0.5px] pointer-events-none" />
                <div className="absolute top-[-10%] right-[-10%] w-[120px] h-[120px] rounded-full bg-white/10 blur-xl pointer-events-none" />
                
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <div className="text-[10px] uppercase font-semibold tracking-widest force-white">BimaHeadquarter</div>
                    <div className="text-[9px] font-medium force-mint">Secured Digital Client Card</div>
                  </div>
                  <div className="h-9 rounded-lg bg-white/20 flex items-center justify-center px-2 border border-white/20 shadow-sm">
                    <img src="/brand/main-logo-wide.webp" alt="BH" className="h-6 w-auto object-contain brightness-0 invert" />
                  </div>
                </div>

                <div className="mt-3 relative z-10">
                  <div className="text-[8px] uppercase tracking-wider font-medium force-emerald-light">Customer Account</div>
                  <div className="text-base font-semibold truncate force-white">{profile?.name || "Client"}</div>
                  <div className="text-[9.5px] mt-0.5 force-slate-light font-normal">{profile?.phone}</div>
                </div>

                <div className="flex justify-between items-end mt-auto pt-2.5 text-[9.5px] relative z-10" style={{ borderTop: "1px solid rgba(255,255,255,.12)" }}>
                  <div className="min-w-0 pr-2">
                    <span className="block text-[8px] font-medium force-emerald-light">Client ID</span>
                    <span className="font-mono font-normal truncate block force-slate-light">
                      {profile?.id ? profile.id.slice(0, 18) + "..." : "-"}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block text-[8px] font-medium force-emerald-light">Direct Helpline</span>
                    <span className="font-semibold block force-white">88188 89660</span>
                  </div>
                </div>
              </div>

              {/* Grid cards with fixed icon bubble sizes */}
              <div className="grid grid-cols-2 gap-3.5">
                <div
                  onClick={() => setActiveTab("policies")}
                  className="bg-white border border-slate-200/50 p-4 rounded-2xl shadow-sm active:scale-95 transition-all flex items-center gap-3 h-20 cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200 shrink-0 shadow-sm">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xl font-bold text-slate-800 leading-tight">{policies.length}</div>
                    <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider truncate">Policies</div>
                  </div>
                </div>

                <div
                  onClick={() => setActiveTab("claims")}
                  className="bg-white border border-slate-200/50 p-4 rounded-2xl shadow-sm active:scale-95 transition-all flex items-center gap-3 h-20 cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-200 shrink-0 shadow-sm">
                    <Shield size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xl font-bold text-slate-800 leading-tight">{claims.length}</div>
                    <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider truncate">Claims</div>
                  </div>
                </div>
              </div>

              {/* Bhopal hotline quick panel */}
              <div className="bg-gradient-to-tr from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4 shadow-sm text-center">
                <span className="text-[8.5px] uppercase font-medium text-emerald-800/80 tracking-wider">Direct Bhopal Hotline</span>
                <h4 className="text-lg font-bold text-emerald-700 mt-1 mb-1">88188 89660</h4>
                <p className="text-slate-600 text-[9.5px] leading-relaxed">Call our Bhopal desk directly for renewals or claim updates.</p>
              </div>

              {/* Policy Expiries list */}
              <div className="bg-white border border-slate-200/50 rounded-2xl p-4 shadow-sm space-y-3.5">
                <h4 className="text-[10px] font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <CalendarDays size={12} /> Policy Renewal Expiries
                </h4>
                {policies.length === 0 ? (
                  <p className="text-[10px] text-slate-400 py-3 text-center">No active policies tracked.</p>
                ) : (
                  <div className="space-y-3">
                    {policies.slice(0, 2).map((p) => {
                      const payload = p.reviewedData || p.data || {};
                      return (
                        <div key={p.id} className="flex justify-between items-center text-xs pb-2 last:pb-0 border-b border-slate-55 last:border-0">
                          <div>
                            <div className="font-semibold text-slate-800 truncate max-w-[160px]">
                              {payload.policyNumber || "Pending..."}
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              {p.selectedCompany || payload.insuranceCompany || "-"}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 block">Renewal Date</span>
                            <span className="font-medium text-slate-700">
                              {formatDate(p.renewalDate || payload.policyExpiryDate)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Accident Emergency Guide */}
              <div className="bg-white border border-slate-200/50 rounded-2xl p-4 shadow-sm space-y-3">
                <h4 className="text-[10px] font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <AlertTriangle size={12} /> Accident & Loss Emergency Guide
                </h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  In case of vehicle accidents or emergency property damage:
                </p>
                <div className="space-y-2.5 text-[10px] text-slate-600">
                  <div className="flex gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center font-medium text-slate-700 shrink-0">1</span>
                    <p className="leading-relaxed">Document all damages visually on the spot with pictures.</p>
                  </div>
                  <div className="flex gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center font-medium text-slate-700 shrink-0">2</span>
                    <p className="leading-relaxed">Call direct Bhopal hotline at <strong className="text-slate-800 font-semibold">88188 89660</strong> for immediate towing triage.</p>
                  </div>
                  <div className="flex gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center font-medium text-slate-700 shrink-0">3</span>
                    <p className="leading-relaxed">Submit files and request claim support inside the Claims tab.</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* 2. Mobile Policies View */}
          {activeTab === "policies" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-emerald-600" />
                  <span>My Coverages</span>
                </h3>
                <span className="text-[9.5px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/50">
                  {policies.length} Total
                </span>
              </div>

              {policies.length === 0 ? (
                <div className="bg-white border border-slate-200/50 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3 shadow-sm">
                  <div className="h-11 w-11 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-200">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">No Policies Uploaded</h4>
                    <p className="text-[9.5px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                      Your active coverages will appear here once uploaded by the advisor.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {policies.map((p) => {
                    const payload = p.reviewedData || p.data || {};
                    return (
                      <div key={p.id} className="bg-white border border-slate-200/40 rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[8.5px] uppercase font-bold text-slate-400">Policy Number</span>
                            <div className="font-extrabold text-slate-800 text-xs mt-0.5">{payload.policyNumber || "Pending Issuance"}</div>
                          </div>
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            p.isActivePolicy
                              ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}>
                            {p.isActivePolicy ? "Active" : "Expired"}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5 text-[10.5px]">
                          <div>
                            <span className="text-[8.5px] uppercase font-semibold text-slate-400 block">Insurer</span>
                            <span className="font-semibold text-slate-700 block truncate mt-0.5">{p.selectedCompany || payload.insuranceCompany || "-"}</span>
                          </div>
                          <div>
                            <span className="text-[8.5px] uppercase font-semibold text-slate-400 block">Expiry Date</span>
                            <span className="font-semibold text-slate-700 block mt-0.5">{formatDate(p.renewalDate || payload.policyExpiryDate)}</span>
                          </div>
                        </div>
                        
                        <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 text-[9.5px] text-slate-600 border border-slate-200/30 flex justify-between items-center">
                          <span>LOB Type: <strong className="text-slate-800 font-bold">{p.selectedPolicyType || payload.policyType || "General"}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. Mobile Claims View */}
          {activeTab === "claims" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {showInitiateForm ? (
                <div className="bg-white border border-slate-200/50 rounded-2xl p-5 shadow-sm">
                  <form onSubmit={handleInitiateClaim} className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Initiate Claim</h3>
                      <button
                        type="button"
                        onClick={() => setShowInitiateForm(false)}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    {claimError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[10px] font-semibold text-red-600">
                        {claimError}
                      </div>
                    )}

                    {claimSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[10px] font-semibold text-emerald-600">
                        {claimSuccess}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Select Policy</label>
                        <select
                          value={claimForm.policyNo}
                          onChange={(e) => {
                            const selectedPolicyNo = e.target.value;
                            const selectedPolicy = policies.find((p) => {
                              const payload = p.reviewedData || p.data || {};
                              return payload.policyNumber === selectedPolicyNo;
                            });
                            const polType = selectedPolicy
                              ? (selectedPolicy.selectedPolicyType || (selectedPolicy.reviewedData || selectedPolicy.data || {}).policyType || "Motor")
                              : "Motor";
                            setClaimForm({ ...claimForm, policyNo: selectedPolicyNo, claimType: polType });
                          }}
                          className="w-full h-9 px-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                          required
                        >
                          <option value="">-- Select Active Policy --</option>
                          {policies.map((p) => {
                            const payload = p.reviewedData || p.data || {};
                            return (
                              <option key={p.id} value={payload.policyNumber}>
                                {payload.policyNumber}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Claim Type</label>
                        <select
                          value={claimForm.claimType}
                          onChange={(e) => setClaimForm({ ...claimForm, claimType: e.target.value })}
                          className="w-full h-9 px-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white"
                          required
                        >
                          <option value="Motor">Motor</option>
                          <option value="Health">Health</option>
                          <option value="Fire">Fire</option>
                          <option value="Marine">Marine</option>
                          <option value="Burglary">Burglary</option>
                          <option value="Engineering">Engineering</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Date of Loss</label>
                        <input
                          type="date"
                          value={claimForm.claimDate}
                          onChange={(e) => setClaimForm({ ...claimForm, claimDate: e.target.value })}
                          className="w-full h-9 px-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Incident Details</label>
                        <textarea
                          value={claimForm.claimDescription}
                          onChange={(e) => setClaimForm({ ...claimForm, claimDescription: e.target.value })}
                          placeholder="Describe what happened..."
                          className="w-full min-h-[72px] p-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-vertical"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingClaim}
                      className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer force-white"
                    >
                      {submittingClaim ? (
                        <span className="force-white">Initiating Claim...</span>
                      ) : (
                        <span className="force-white">Initiate Claim</span>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  {/* Mobile claims log list card */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Shield size={14} className="text-emerald-600" />
                        <span>Claims Log</span>
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setClaimError("");
                            setClaimSuccess("");
                            setShowInitiateForm(true);
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold shadow-sm transition-colors cursor-pointer force-white"
                        >
                          <span className="force-white">+ Initiate Claim</span>
                        </button>
                        <span className="text-[9.5px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/50">
                          {claims.length} Claims
                        </span>
                      </div>
                    </div>

                    {claims.length === 0 ? (
                      <div className="bg-white border border-slate-200/50 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3 shadow-sm">
                        <div className="h-11 w-11 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-200">
                          <Shield size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-700">No Claims Tracked</h4>
                          <p className="text-[9.5px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                            No active claim file records. Click &ldquo;+ Initiate Claim&rdquo; above to report a new loss request.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {claims.map((c) => (
                          <div key={c.id} className="bg-white border border-slate-200/40 rounded-xl p-3 flex flex-col gap-2.5 shadow-sm">
                            <div className="flex items-center justify-between min-w-0">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-extrabold text-xs text-slate-800">{c.claimNo}</span>
                                  <span className="text-[8px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded border border-slate-200/50 font-bold">
                                    {c.claimType}
                                  </span>
                                </div>
                                <div className="text-[8.5px] text-slate-400 flex items-center gap-1">
                                  <Calendar size={9} />
                                  <span>Filed: {formatDate(c.claimDate)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                  c.claimStatus.toLowerCase() === "open"
                                    ? "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                                    : c.claimStatus.toLowerCase() === "settled" || c.claimStatus.toLowerCase() === "completed"
                                    ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                                    : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}>
                                  {c.claimStatus}
                                </span>
                                <div
                                  onClick={() => setSelectedClaimId(selectedClaimId === c.id ? null : c.id)}
                                  className="px-2 py-1 rounded bg-slate-100 hover:bg-emerald-600 hover:text-white cursor-pointer transition-all text-[8.5px] font-bold shadow-sm"
                                >
                                  {selectedClaimId === c.id ? "Hide" : "Track"}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mobile Selected Claim Live Status (CRM Data) */}
                  {selectedClaimId && claims.find(c => c.id === selectedClaimId) && (() => {
                    const activeClaim = claims.find(c => c.id === selectedClaimId);
                    return (
                      <div className="bg-white border-2 border-emerald-500/30 rounded-2xl p-4 shadow-md space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div>
                            <span className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">Operations Tracker</span>
                            <h4 className="text-xs font-bold text-slate-800">{activeClaim.claimNo}</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedClaimId(null)}
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                          >
                            ✕ Hide
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 text-[10px]">
                          <div>
                            <span className="text-[8.5px] uppercase font-semibold text-slate-400 block">Status</span>
                            <span className="font-semibold text-slate-700 block mt-0.5 capitalize">{activeClaim.claimStatus}</span>
                          </div>
                          <div>
                            <span className="text-[8.5px] uppercase font-semibold text-slate-400 block">Policy Number</span>
                            <span className="font-semibold text-slate-700 block mt-0.5 truncate">{activeClaim.policyNo || "-"}</span>
                          </div>
                          <div>
                            <span className="text-[8.5px] uppercase font-semibold text-slate-400 block">Incident Date</span>
                            <span className="font-semibold text-slate-700 block mt-0.5">{formatDate(activeClaim.claimDate)}</span>
                          </div>
                          <div>
                            <span className="text-[8.5px] uppercase font-semibold text-slate-400 block">Next Desk Review</span>
                            <span className="font-semibold text-slate-700 block mt-0.5 truncate">
                              {activeClaim.followUpDate ? formatDate(activeClaim.followUpDate) : "Constant Assessment"}
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/50 p-3 rounded-lg text-[9.5px]">
                          <span className="text-[8px] uppercase font-semibold text-slate-400 block mb-1">Latest Operation Remark</span>
                          <p className="text-slate-600 font-bold leading-relaxed">
                            {activeClaim.currentRemark || "Your file is undergoing document checklist verification by the operations desk."}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* 4. Mobile Assistance View */}
          {activeTab === "assistance" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="bg-white border border-slate-200/50 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="h-9 w-9 rounded-lg text-emerald-600 flex items-center justify-center border border-emerald-500/20 shadow-sm bg-emerald-50">
                  <HelpCircle size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Assistance Desk</h3>
                  <p className="text-slate-500 text-[10.5px] leading-relaxed mt-1">
                    Our commercial risk desk handles policy limit audits, security reviews, and claim support.
                  </p>
                </div>
                <div className="space-y-2.5 pt-2.5">
                  <Link
                    href="/contact"
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-500 text-[10.5px] font-bold text-slate-700 transition-all shadow-sm active:scale-95"
                  >
                    <span>Request Claim Support</span>
                    <ArrowRight size={12} className="text-slate-400" />
                  </Link>
                  <Link
                    href="/contact"
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-500 text-[10.5px] font-bold text-slate-700 transition-all shadow-sm active:scale-95"
                  >
                    <span>Consult Risk Advisor</span>
                    <ArrowRight size={12} className="text-slate-400" />
                  </Link>
                </div>
              </div>

              {/* Bhopal hotline panel */}
              <div className="bg-gradient-to-tr from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5 text-center shadow-sm">
                <span className="text-[8.5px] uppercase font-bold text-emerald-800/80 tracking-wider">Direct Bhopal Hotline</span>
                <h4 className="text-lg font-black text-emerald-700 mt-1 mb-1 tracking-wide">88188 89660</h4>
                <p className="text-slate-650 text-[9.5px] leading-relaxed">
                  Call our commercial desk directly for renewals or claim status updates.
                </p>
              </div>
            </div>
          )}

          {/* 5. Mobile Profile View */}
          {activeTab === "profile" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="bg-white border border-slate-200/50 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <User size={15} className="text-emerald-600" />
                  <span>My Profile Details</span>
                </h3>
                
                <div className="space-y-3.5 text-xs text-slate-650">
                  <div>
                    <span className="text-[8.5px] uppercase font-bold text-slate-400 block mb-0.5">Full Name</span>
                    <span className="font-bold text-slate-800">{profile?.name || "-"}</span>
                  </div>

                  <div>
                    <span className="text-[8.5px] uppercase font-bold text-slate-400 block mb-0.5">Mobile Number</span>
                    <span className="font-semibold text-slate-800">{profile?.phone || "-"}</span>
                  </div>

                  {profile?.email && (
                    <div>
                      <span className="text-[8.5px] uppercase font-bold text-slate-400 block mb-0.5">Email Address</span>
                      <span className="font-semibold text-slate-800">{profile.email}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-[8.5px] uppercase font-bold text-slate-400 block mb-0.5">Client Reference ID</span>
                    <span className="font-mono text-[10px] text-slate-600 block truncate">{profile?.id}</span>
                  </div>

                  {profile?.address && (
                    <div className="border-t border-slate-100 pt-2.5">
                      <span className="text-[8.5px] uppercase font-bold text-slate-400 block mb-0.5">Registered Address</span>
                      <span className="font-medium text-slate-800">{profile.address}, {profile.city}, {profile.state}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Sticky Mobile iOS-style Bottom Tab Dock (5 Tabs) */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-2 h-16 flex items-center justify-around shadow-[0_-5px_15px_rgba(0,0,0,0.03)] pb-4">
          {[
            { id: "dashboard", label: "Home", icon: LayoutDashboard },
            { id: "policies", label: "Policies", icon: FileText },
            { id: "claims", label: "Claims", icon: Shield },
            { id: "assistance", label: "Support", icon: HelpCircle },
            { id: "profile", label: "Profile", icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`flex flex-col items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                  isSelected ? "text-emerald-600 font-semibold scale-105" : "text-emerald-800/40 hover:text-emerald-600/70"
                }`}
              >
                <Icon size={18} />
                <span className="text-[8.5px]">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
