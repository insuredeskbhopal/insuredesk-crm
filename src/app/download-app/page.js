"use client";
/* global navigator */

import { useState } from "react";
import PublicHeader from "@/app/components/public/PublicHeader";
import PublicFooter from "@/app/components/public/PublicFooter";
import LandingEffects from "@/app/components/LandingEffects";
import {
  Download,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  MessageCircle,
  FileText,
  LayoutDashboard,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Shield,
  HelpCircle,
  ChevronDown,
  RefreshCw,
  FileCheck,
} from "lucide-react";

export default function DownloadAppPage() {
  const [copied, setCopied] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const shareUrl = "https://www.bimaheadquarter.com/download-app";
  const directApkUrl = "/api/downloads/app";
  const shareText =
    "Download the official BimaHeadquarter Insurance App to manage your motor, health & warehouse policies, download verified PDFs, and file claims directly from your phone:";
  const qrCodeUrl = "/brand/app-qr.png";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "BimaHeadquarter Mobile App",
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // ignore
      }
    }
  };

  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;

  const faqs = [
    {
      q: "Is the BimaHeadquarter APK safe to install on my Android device?",
      a: "Yes, 100%. The APK package is digitally compiled, SHA-256 verified, and virus-scanned directly by InsureDesk IMF Pvt. Ltd. (IRDAI Regd.). It contains zero advertisements, trackers, or unwanted permissions.",
    },
    {
      q: "Why is the app installed via direct APK instead of Google Play?",
      a: "We provide an enterprise release directly to our registered policyholders and corporate clients to deliver instant, unthrottled policy vault downloads and rapid claim advocacy updates without third-party app store delays.",
    },
    {
      q: "Why does Android show 'Allow from this source' during setup?",
      a: "This is a standard security prompt displayed by Android whenever an application is downloaded directly via Chrome or mobile browser. Simply tap 'Settings' and toggle 'Allow from this source' to complete the 10-second setup.",
    },
    {
      q: "Can I download and store policy schedule PDFs offline?",
      a: "Yes. Once downloaded, all verified insurer PDF schedules (Motor, Health, Fire, Marine, Warehouse) are encrypted and cached locally on your device for instant offline access during traffic checks or hospital admissions.",
    },
  ];

  return (
    <div className="landing-shell bg-white text-slate-900 font-sans overflow-x-hidden min-h-screen flex flex-col selection:bg-emerald-100 selection:text-emerald-900 relative">
      <LandingEffects />
      <PublicHeader />

      {/* Ambient Top Glow (100% White Theme Compliant) */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(16, 185, 129, 0.12), rgba(3, 22, 56, 0.03) 60%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <main className="flex-1 pt-6 sm:pt-10 pb-24 dl-app-container w-full">
        {/* =========================================================================
            1. Hero Section (Rock-solid 2-column flex split)
            ========================================================================= */}
        <section className="mb-20 lg:mb-28">
          <div className="dl-hero-split">
            {/* Left Content Column */}
            <div className="dl-hero-left space-y-6 text-left">
              {/* Official Release Pill Badge */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-50/90 border border-emerald-200/90 text-xs font-bold text-emerald-900 shadow-2xs">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600" />
                </span>
                <span className="tracking-wide">BIMAHEADQUARTER MOBILE APP · ANDROID v1.0.1</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[52px] font-black tracking-tight text-slate-900 leading-[1.14]">
                Manage Policies &amp; Download PDFs <br />
                <span className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 bg-clip-text text-transparent">
                  Directly From Your Smartphone
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Experience seamless policy self-service. Access verified policy documents, track renewal dates, view vehicle specifications, and submit claims with instant advocacy.
              </p>

              {/* High-Impact Primary & Secondary Action Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                {/* Download Android APK Button */}
                <a
                  href={directApkUrl}
                  download="bimaheadquarter.apk"
                  className="dl-shimmer group inline-flex items-center justify-center gap-3 px-7 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-700/25 hover:shadow-xl hover:shadow-emerald-700/35 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                  style={{ color: "#ffffff" }}
                >
                  <Download className="h-5 w-5 text-white stroke-[2.5] dl-bounce-arrow" />
                  <span className="text-base font-black">Download Android APK</span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-800/70 text-xs font-bold text-emerald-100">
                    59 MB
                  </span>
                </a>

                {/* Share on WhatsApp Button */}
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white border border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50/70 text-slate-800 text-sm font-extrabold shadow-2xs hover:shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600 fill-emerald-600" />
                  <span>Share on WhatsApp</span>
                </a>

                {/* Copy Link Button */}
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl border text-sm font-extrabold shadow-2xs transition-all active:scale-[0.98] cursor-pointer ${
                    copied
                      ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                      : "border-slate-200/90 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600 animate-bounce" strokeWidth={2.5} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-slate-500" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Subtle Native Share Option */}
              {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                <div className="text-left pt-0.5">
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>More share options...</span>
                  </button>
                </div>
              )}

              {/* The 3 Key Core Value Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">1-Tap PDF Download</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Real-Time Sync</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                  <div className="h-7 w-7 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Emergency Claim Filing</span>
                </div>
              </div>

              {/* Security & Verification Badges */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Verified Clean APK (SHA-256)
                </span>
                <span>•</span>
                <span>Android 8.0 &amp; Above</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-700">
                  <Lock className="h-3.5 w-3.5 text-slate-400" /> 256-Bit SSL Secured
                </span>
              </div>
            </div>

            {/* Right Column: High-End QR Scanner Card */}
            <div className="dl-hero-right relative">
              {/* Floating Badge (Top Left) */}
              <div className="dl-float-1 absolute -top-4 -left-4 z-20 hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-emerald-200 text-[11px] font-black text-emerald-900 shadow-md">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>IRDAI Registered IMF</span>
              </div>

              {/* Main QR Card Chassis */}
              <div className="w-full max-w-[360px] sm:max-w-[380px] rounded-[36px] bg-white p-6 sm:p-7 shadow-2xl shadow-slate-900/6 border border-slate-200/90 text-center relative z-10">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  SCAN TO INSTALL
                </div>
                <div className="text-sm font-bold text-slate-900 mb-4">
                  Point phone camera to install instantly
                </div>

                {/* QR Code Container with Glowing Laser Scanner Animation */}
                <div className="mx-auto w-56 h-56 p-4 bg-white rounded-3xl border-2 border-slate-100 shadow-inner flex items-center justify-center mb-4 relative overflow-hidden group">
                  {/* Animated Glowing Laser Scanner Line */}
                  <div className="dl-scan-beam" />

                  {/* Viewfinder Target Reticles */}
                  <div className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-emerald-600 rounded-tl-md pointer-events-none" />
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-emerald-600 rounded-tr-md pointer-events-none" />
                  <div className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-emerald-600 rounded-bl-md pointer-events-none" />
                  <div className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-emerald-600 rounded-br-md pointer-events-none" />

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeUrl}
                    alt="Scan QR code to install BimaHeadquarter app"
                    width={216}
                    height={216}
                    className="rounded-2xl transition-transform group-hover:scale-102 object-contain"
                    onError={(e) => {
                      e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(shareUrl)}&margin=4`;
                    }}
                  />
                </div>

                {/* Direct Download Button */}
                <a
                  href={directApkUrl}
                  download="bimaheadquarter.apk"
                  className="dl-shimmer flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 text-xs font-black transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer mb-3"
                  style={{ color: "#ffffff" }}
                >
                  <Download className="h-4 w-4 text-white stroke-[2.5]" />
                  <span>Direct Download APK (59 MB)</span>
                </a>

                {/* Specs Footer */}
                <div className="pt-2 border-t border-slate-100 text-center text-[11px] font-semibold text-slate-500">
                  APK Size: ~59 MB · Verified Clean Build
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. Social Proof & Key Performance Metrics Strip
            ========================================================================= */}
        <section className="mb-20 lg:mb-28">
          <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm p-6 sm:p-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              <div className="text-center pt-3 lg:pt-0">
                <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">10,000+</div>
                <div className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">Policies Managed</div>
              </div>

              <div className="text-center pt-3 lg:pt-0">
                <div className="text-3xl sm:text-4xl font-black text-emerald-700 tracking-tight">25+</div>
                <div className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">Top National Insurers</div>
              </div>

              <div className="text-center pt-3 lg:pt-0">
                <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">100%</div>
                <div className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">Direct Verified APK</div>
              </div>

              <div className="text-center pt-3 lg:pt-0">
                <div className="text-3xl sm:text-4xl font-black text-emerald-700 tracking-tight">4.9★</div>
                <div className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">Claims Advocacy Rating</div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. Feature Bento Grid: Full Container Width
            ========================================================================= */}
        <section className="mb-20 lg:mb-28">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200/80 text-[11px] font-black uppercase tracking-wider text-emerald-800 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              Engineered For Policyholders
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Everything Your Insurance Portfolio Needs
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1.5">
              Say goodbye to scattered email inboxes, lost renewal dates, and unreachable customer helplines.
            </p>
          </div>

          <div className="dl-bento-grid">
            {/* Bento Card 1: 1-Tap Policy PDF Vault */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-3.5 text-left flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shadow-2xs group-hover:scale-110 transition-transform">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-900 transition-colors">
                  1-Tap Offline Policy Vault
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Download verified insurer policy schedules directly to your phone. Access official digital certificates instantly during traffic checks or hospital admissions without internet.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-700">
                  Motor Schedules
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-700">
                  Health E-Cards
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-700">
                  Fire &amp; Warehouse
                </span>
              </div>
            </div>

            {/* Bento Card 2: All Policies in One Dashboard */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-3.5 text-left flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-2xs group-hover:scale-110 transition-transform">
                  <LayoutDashboard className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-900 transition-colors">
                  Unified Portfolio Dashboard
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Track personal, family, and commercial fleet coverage in one consolidated view. Tagged with vehicle registration numbers, insured declared value (IDV), and live policy status.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-700">
                  Multi-Vehicle
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-700">
                  Family Health
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-700">
                  Commercial Stock
                </span>
              </div>
            </div>

            {/* Bento Card 3: Fast Claim Filing & Advocacy */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-3.5 text-left flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shadow-2xs group-hover:scale-110 transition-transform">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 group-hover:text-amber-900 transition-colors">
                  Emergency Claim Advocacy
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Had an accident or sudden hospitalization? Trigger immediate claim support directly from the app. Upload garage estimates or discharge bills for expert review.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-700">
                  Surveyor Assistance
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-700">
                  Cashless Coordination
                </span>
              </div>
            </div>

            {/* Bento Card 4: Renewal Reminders */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-3.5 text-left flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 shadow-2xs group-hover:scale-110 transition-transform">
                  <RefreshCw className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 group-hover:text-purple-900 transition-colors">
                  Timely Renewal Alerts
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Never let your insurance lapse or lose your No Claim Bonus (NCB). Get automated notifications 30 days prior to expiration with transparent quote comparisons from 25+ insurers.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-700">
                  NCB Protection
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-700">
                  Multi-Insurer Quotes
                </span>
              </div>
            </div>

            {/* Bento Card 5: Fine Print Audits */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-3.5 text-left flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-2xs group-hover:scale-110 transition-transform">
                  <FileCheck className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-900 transition-colors">
                  Verified Insurer Direct Sync
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Direct policy matching across ICICI Lombard, HDFC ERGO, Tata AIG, Star Health, Go Digit, Bajaj Allianz, and New India Assurance without manual data entry.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-700">
                  Zero Manual Entry
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-700">
                  Instant Verification
                </span>
              </div>
            </div>

            {/* Bento Card 6: Institutional Governance */}
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-3.5 text-left flex flex-col justify-between group">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shadow-2xs group-hover:scale-110 transition-transform">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 group-hover:text-teal-900 transition-colors">
                  Institutional Governance
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Backed by InsureDesk IMF Pvt. Ltd. (IRDAI Regd. IMF182444280220190240). Unbiased fiduciary guidance dedicated entirely to the policyholder&apos;s legal interests.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-700">
                  IRDAI Compliant
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/70 text-[10px] font-bold text-slate-700">
                  Fiduciary Guidance
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. Step-by-Step Installation Guide
            ========================================================================= */}
        <section className="mb-20 lg:mb-28">
          <div className="rounded-3xl bg-white p-6 sm:p-10 border border-slate-200/90 shadow-sm">
            <div className="max-w-2xl mb-10 text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200/80 text-[11px] font-black uppercase tracking-wider text-emerald-800 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Quick 10-Second Setup
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                How to Install the APK on Android
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">
                Follow these simple steps to install the official BimaHeadquarter package safely on any Android phone.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Step 01 */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 space-y-3.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-slate-200">01</span>
                  <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shadow-2xs">
                    <Download className="h-5 w-5" />
                  </div>
                </div>
                <div className="font-bold text-base text-slate-900">Download the APK</div>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Tap &quot;Download Android APK&quot; or scan the QR code. Your mobile browser will safely download the official <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-800">bimaheadquarter.apk</code> package.
                </p>
              </div>

              {/* Step 02 */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 space-y-3.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-slate-200">02</span>
                  <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                </div>
                <div className="font-bold text-base text-slate-900">Permit Installation</div>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  If prompted by Android, tap &quot;Settings&quot; and toggle &quot;Allow from this source&quot;. This is standard security for direct business apps outside Google Play.
                </p>
              </div>

              {/* Step 03 */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 space-y-3.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-slate-200">03</span>
                  <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>
                <div className="font-bold text-base text-slate-900">Install &amp; Log In</div>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Tap &quot;Install&quot; and launch BimaHeadquarter with your registered mobile phone number. Your policies sync automatically within seconds!
                </p>
              </div>
            </div>

            {/* Android Permission Clarification Note */}
            <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-left flex items-start gap-3.5">
              <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-emerald-900 leading-relaxed">
                <span className="font-bold">Enterprise Digital Signature:</span> BimaHeadquarter APK is compiled by InsureDesk IMF Pvt. Ltd. with strict IRDAI compliance. The download is completely clean, encrypted, and direct from our secure high-speed CDN.
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. Frequently Asked Questions
            ========================================================================= */}
        <section className="mb-20">
          <div className="max-w-4xl mx-auto text-left">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2">
                <HelpCircle className="h-3.5 w-3.5" />
                Got Questions?
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-3.5">
              {faqs.map((faq, index) => {
                const isOpen = activeFaq === index;
                return (
                  <div
                    key={faq.q}
                    className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFaq(isOpen ? null : index)}
                      className="w-full px-5 sm:px-6 py-4 flex items-center justify-between text-left gap-4 font-bold text-sm sm:text-base text-slate-900 cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-emerald-700" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 sm:px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================================
            6. Bottom Conversion Strip (100% All-White Theme)
            ========================================================================= */}
        <section
          className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 text-center text-slate-900 shadow-lg relative overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 10%, rgba(16, 185, 129, 0.08), transparent 70%), #ffffff",
          }}
        >
          <div className="max-w-2xl mx-auto space-y-4 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-black uppercase tracking-wider text-emerald-800 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              Direct Android Download
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
              Ready to Carry Your Policy Fortress?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl mx-auto">
              Install the official BimaHeadquarter Android APK today. Free lifetime policy tracking, verified insurer PDF schedules, and expert claim assistance.
            </p>
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <a
                href={directApkUrl}
                download="bimaheadquarter.apk"
                className="dl-shimmer w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                style={{ color: "#ffffff" }}
              >
                <Download className="h-4 w-4 text-white stroke-[2.5]" />
                <span className="text-white font-black">Download Android APK (59 MB)</span>
              </a>
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-white hover:bg-emerald-50/80 text-slate-800 hover:text-emerald-950 font-bold text-sm border border-slate-200 hover:border-emerald-300 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <MessageCircle className="h-4 w-4 fill-emerald-600 text-emerald-600" />
                <span className="text-slate-800 font-bold">Share via WhatsApp</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
