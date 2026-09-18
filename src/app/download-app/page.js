"use client";
/* global navigator */

import { useState } from "react";
import PublicHeader from "@/app/components/public/PublicHeader";
import PublicFooter from "@/app/components/public/PublicFooter";
import LandingEffects from "@/app/components/LandingEffects";
import {
  Smartphone,
  Download,
  QrCode,
  Share2,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  MessageCircle,
  FileText,
  LayoutDashboard,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Star,
  Shield,
  Car,
  HeartPulse,
  Building2,
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
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(28, 108, 57, 0.08), rgba(3, 22, 56, 0.03) 60%, transparent 100%)",
        }}
        aria-hidden="true"
      />

      <main className="flex-1 pt-6 sm:pt-10 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* =========================================================================
            1. Hero Section
            ========================================================================= */}
        <section className="mb-20 lg:mb-24">
          {/* Official Release Pill Badge */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-xs text-xs font-bold text-slate-700 hover:border-emerald-300 transition-colors">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              <span className="tracking-wide">OFFICIAL ANDROID RELEASE · v1.0.1</span>
              <span className="text-slate-300">|</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Verified Clean Build
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-7 text-left">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black tracking-tight text-slate-900 leading-[1.12]">
                  Insurance Protection <br />
                  <span className="bg-gradient-to-r from-emerald-700 via-slate-900 to-emerald-800 bg-clip-text text-transparent">
                    Right In Your Pocket
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
                  Track your complete policy portfolio across Motor, Health, Fire &amp; Warehouse. Download official insurer PDF schedules offline, verify coverage terms, and trigger immediate claim advocacy directly from your Android phone.
                </p>
              </div>

              {/* Main Prominent Store Card Button */}
              <div className="pt-1 max-w-xl">
                <a
                  href={directApkUrl}
                  download="bimaheadquarter.apk"
                  className="group relative flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-white border-2 border-emerald-600/30 hover:border-emerald-600 shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 active:scale-[0.99] text-left cursor-pointer"
                >
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/70 border border-emerald-200/80 flex items-center justify-center text-emerald-800 shadow-2xs group-hover:scale-105 group-hover:border-emerald-300 transition-all">
                      <Smartphone className="h-8 w-8 text-emerald-800" strokeWidth={2.2} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                          Download Android APK
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/90 text-[10px] font-black uppercase tracking-wide text-emerald-800">
                          <Sparkles className="h-3 w-3 text-emerald-600" />
                          v1.0.1
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                        Direct Safe Download · Free · Android 8.0 &amp; Above
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pl-3">
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700">
                      <Download className="h-3.5 w-3.5 text-slate-600" />
                      59 MB
                    </span>
                    <div className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-200/90 group-hover:bg-emerald-600 group-hover:border-emerald-600 group-hover:text-white text-slate-800 flex items-center justify-center transition-all shadow-2xs">
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </a>
              </div>

              {/* Symmetrical Twin Share Actions (WhatsApp & Copy Link) */}
              <div className="pt-1 max-w-xl space-y-2.5">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Share2 className="h-3.5 w-3.5 text-slate-500" />
                  Share Download Link with Family or Clients
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={whatsappShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200/90 text-slate-800 hover:bg-emerald-50/60 hover:border-emerald-300 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-600 fill-emerald-600" />
                    <span>WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                      copied
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-slate-200/90 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
                        <span>Copied Link!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 text-slate-500" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>

                {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <Share2 className="h-3 w-3" />
                    <span>More share options...</span>
                  </button>
                )}
              </div>

              {/* Trust & Spec Badges */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5 text-slate-800 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Verified Clean APK
                </span>
                <span>•</span>
                <span>Size: ~59 MB</span>
                <span>•</span>
                <span>Android 8.0 &amp; Above</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-700">
                  <Lock className="h-3.5 w-3.5 text-slate-400" /> 256-Bit SSL Encrypted
                </span>
              </div>
            </div>

            {/* Right Column: Realistic Phone Mockup + QR Scanner Dock */}
            <div className="lg:col-span-5 flex flex-col items-center">
              {/* Device Preview Card Container */}
              <div className="w-full max-w-sm rounded-[36px] bg-white p-6 shadow-xl border border-slate-200/90 text-center relative">
                {/* Header of Preview Box */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                      <QrCode className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-900">Scan to Install</div>
                      <div className="text-[10px] text-slate-500">Point phone camera to download</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    Direct
                  </span>
                </div>

                {/* QR Code Container */}
                <div className="mx-auto w-52 h-52 sm:w-56 sm:h-56 p-3 bg-white rounded-2xl border-2 border-slate-100 shadow-xs flex items-center justify-center mb-5 relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeUrl}
                    alt="Scan QR code to install BimaHeadquarter app"
                    width={204}
                    height={204}
                    className="rounded-xl transition-transform group-hover:scale-102 object-contain"
                    onError={(e) => {
                      e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(shareUrl)}&margin=4`;
                    }}
                  />
                  <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 text-emerald-700 shadow-md ring-4 ring-white">
                    <QrCode className="h-4 w-4" />
                  </div>
                </div>

                {/* Secondary Direct Download Trigger inside Card */}
                <a
                  href={directApkUrl}
                  download="bimaheadquarter.apk"
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-white hover:bg-emerald-50/70 text-slate-900 border border-slate-200 hover:border-emerald-300 px-4 py-3 text-xs font-black transition-all shadow-xs hover:shadow-sm cursor-pointer"
                >
                  <Download className="h-4 w-4 stroke-[2.5] text-emerald-600 group-hover:scale-110 transition-transform" />
                  <span>Direct Download APK (59 MB)</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
                </a>

                {/* Realistic Phone Mini-Preview Snippet */}
                <div className="mt-5 pt-4 border-t border-slate-100 text-left space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Live Mobile Vault Highlights
                  </div>
                  <div className="rounded-xl bg-slate-50/80 p-2.5 border border-slate-200/70 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-emerald-600" />
                      <div>
                        <div className="font-bold text-slate-800 text-[11px]">Motor &amp; Fleet Vault</div>
                        <div className="text-[10px] text-slate-500">1-Tap PDF Schedules</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Offline
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. Social Proof & Performance Metrics Bar
            ========================================================================= */}
        <section className="mb-20">
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
            3. Feature Bento Grid: Why Install BimaHeadquarter
            ========================================================================= */}
        <section className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200/80 text-[11px] font-black uppercase tracking-wider text-emerald-800 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              Engineered For Policyholders
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Everything Your Insurance Portfolio Needs
            </h2>
            <p className="text-slate-500 text-sm sm:text-base mt-2">
              Say goodbye to scattered email inboxes, lost renewal dates, and unreachable customer helplines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Bento Card 1: 1-Tap Policy PDF Vault */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md transition-all space-y-4 text-left">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shadow-2xs">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">1-Tap Offline Policy Vault</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Download verified insurer policy schedules directly to your phone. Access official digital certificates instantly during traffic checks or hospital admissions without internet.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] font-bold text-slate-700">
                  Motor Schedules
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] font-bold text-slate-700">
                  Health E-Cards
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] font-bold text-slate-700">
                  Fire &amp; Warehouse
                </span>
              </div>
            </div>

            {/* Bento Card 2: All Policies in One Dashboard */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md transition-all space-y-4 text-left">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-2xs">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Unified Portfolio Dashboard</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Track personal, family, and commercial fleet coverage in one consolidated view. Tagged with vehicle registration numbers, insured declared value (IDV), and live policy status.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] font-bold text-slate-700">
                  Multi-Vehicle
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] font-bold text-slate-700">
                  Family Health
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] font-bold text-slate-700">
                  Commercial Stock
                </span>
              </div>
            </div>

            {/* Bento Card 3: Fast Claim Filing & Advocacy */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md transition-all space-y-4 text-left">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shadow-2xs">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Emergency Claim Advocacy</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Had an accident or sudden hospitalization? Trigger immediate claim support directly from the app. Upload garage estimates or discharge bills for expert review.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] font-bold text-slate-700">
                  Surveyor Assistance
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] font-bold text-slate-700">
                  Cashless Coordination
                </span>
              </div>
            </div>

            {/* Bento Card 4: Renewal Reminders */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md transition-all space-y-4 text-left">
              <div className="h-12 w-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 shadow-2xs">
                <RefreshCw className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Timely Renewal Alerts</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Never let your insurance lapse or lose your No Claim Bonus (NCB). Get automated notifications 30 days prior to expiration with transparent quote comparisons from 25+ insurers.
              </p>
            </div>

            {/* Bento Card 5: Fine Print Audits */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md transition-all space-y-4 text-left">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-2xs">
                <FileCheck className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Verified Insurer Direct Sync</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Direct policy matching across ICICI Lombard, HDFC ERGO, Tata AIG, Star Health, Go Digit, Bajaj Allianz, and New India Assurance without manual data entry.
              </p>
            </div>

            {/* Bento Card 6: Direct Advisory Desk */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md transition-all space-y-4 text-left">
              <div className="h-12 w-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shadow-2xs">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Institutional Governance</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Backed by InsureDesk IMF Pvt. Ltd. (IRDAI Regd. IMF182444280220190240). Unbiased fiduciary guidance dedicated entirely to the policyholder&apos;s legal interests.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. Step-by-Step Installation Guide
            ========================================================================= */}
        <section className="mb-20">
          <div className="rounded-3xl bg-white p-8 sm:p-12 border border-slate-200/90 shadow-sm">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 01 */}
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all space-y-3.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-slate-300">01</span>
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
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all space-y-3.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-slate-300">02</span>
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
              <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all space-y-3.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-slate-300">03</span>
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
            <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 text-left flex items-start gap-3.5">
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
        <section className="mb-16">
          <div className="max-w-3xl mx-auto text-left">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2">
                <HelpCircle className="h-3.5 w-3.5" />
                Got Questions?
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-3">
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
      </main>

      {/* Floating Bottom Quick-Download Bar for Mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg flex items-center gap-2">
        <a
          href={directApkUrl}
          download="bimaheadquarter.apk"
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white text-slate-900 border-2 border-emerald-600 font-extrabold text-xs shadow-xs active:scale-95 transition-all"
        >
          <Download className="h-4 w-4 text-emerald-700" strokeWidth={2.5} />
          <span>Download Android APK (59 MB)</span>
        </a>
        <a
          href={whatsappShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 rounded-xl bg-white border border-slate-200 text-emerald-600 shadow-xs"
          aria-label="Share on WhatsApp"
        >
          <MessageCircle className="h-5 w-5 fill-emerald-600" />
        </a>
      </div>

      <PublicFooter />
    </div>
  );
}
