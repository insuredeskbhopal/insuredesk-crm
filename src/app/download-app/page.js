"use client";
/* global navigator */

import { useState } from "react";
import PublicHeader from "@/app/components/public/PublicHeader";
import PublicFooter from "@/app/components/public/PublicFooter";
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
} from "lucide-react";

export default function DownloadAppPage() {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/download-app`
    : "https://www.bimaheadquarter.com/download-app";

  const directApkUrl = "/api/downloads/app";

  const shareText = "Download the official BimaHeadquarter Insurance App to manage your motor, health & warehouse policies, download verified PDFs, and file claims directly from your phone:";

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
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(shareUrl)}&margin=8`;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      <PublicHeader />

      <main className="flex-1 py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center mb-16">
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold tracking-wide shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              <span>OFFICIAL ANDROID APP · v1.0.1</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#031638] leading-[1.12]">
              Insurance Protection <br />
              <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">
                Right In Your Pocket
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              Track your complete policy portfolio across Motor, Health, Fire &amp; Warehouse, download verified insurer PDF schedules, and file emergency claims directly from your smartphone.
            </p>

            {/* Direct Download & Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3.5">
              <a
                href={directApkUrl}
                download="bimaheadquarter.apk"
                className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#031638] via-[#0d2d69] to-[#1657ff] text-white font-extrabold shadow-xl shadow-blue-900/20 hover:shadow-2xl hover:shadow-blue-600/30 hover:-translate-y-0.5 transition-all text-base active:translate-y-0"
              >
                <Download className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
                <span>Download Android APK</span>
                <Sparkles className="h-4 w-4 text-amber-300" />
              </a>

              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border text-sm font-bold transition-all shadow-2xs active:scale-[0.98] ${
                  copied
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-blue-600" />
                    <span>Share Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-slate-500" />
                    <span>Copy Share Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Share Download Link Options */}
            <div className="pt-4 border-t border-slate-200/90 space-y-3">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5 text-blue-600" />
                Share Download Link With Family or Clients
              </div>
              <div className="flex flex-wrap gap-2.5">
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold hover:bg-emerald-100 hover:border-emerald-300 transition-all shadow-2xs"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600 fill-emerald-600" />
                  <span>Share on WhatsApp</span>
                </a>

                {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold hover:bg-indigo-100 transition-colors shadow-2xs"
                  >
                    <Share2 className="h-3.5 w-3.5 text-indigo-600" />
                    <span>More Options...</span>
                  </button>
                )}
              </div>
            </div>

            {/* App Specs */}
            <div className="flex items-center gap-4 sm:gap-6 pt-2 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Verified Clean APK
              </span>
              <span>•</span>
              <span>Size: ~59 MB</span>
              <span>•</span>
              <span>Android 8.0 &amp; Above</span>
            </div>
          </div>

          {/* QR Code Card for Scanning */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl border border-slate-200/90 text-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-[#031638] via-blue-600 to-emerald-500" />
              
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-xs ring-1 ring-blue-100">
                <Smartphone className="h-6 w-6 text-blue-600" />
              </div>

              <h3 className="text-xl font-extrabold text-[#031638] mb-1">
                Scan to Install on Phone
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Point your phone camera to download the APK directly
              </p>

              <div className="mx-auto w-52 h-52 p-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner flex items-center justify-center mb-5 relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt="Scan QR code to install BimaHeadquarter app"
                  width={190}
                  height={190}
                  className="rounded-xl transition-transform group-hover:scale-105"
                />
                <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-md ring-4 ring-white">
                  <QrCode className="h-4 w-4" />
                </div>
              </div>

              <a
                href={directApkUrl}
                download="bimaheadquarter.apk"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#031638] px-4 py-3 text-xs font-bold text-white hover:bg-blue-900 transition-colors shadow-sm"
              >
                <Download className="h-4 w-4 text-blue-300 group-hover:scale-110 transition-transform" />
                <span>Direct Download APK</span>
                <ArrowRight className="h-3.5 w-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="border-t border-slate-200/90 pt-16 mb-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#031638]">
              Why Install The BimaHeadquarter App?
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Engineered for seamless self-service, instant policy access, and dedicated claim advocacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <h4 className="font-bold text-base text-[#031638]">1-Tap Policy PDF Downloads</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Download official insurer policy schedules and certificates instantly on your device without waiting for emails.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <LayoutDashboard className="h-5 w-5 text-emerald-600" />
              </div>
              <h4 className="font-bold text-base text-[#031638]">All Policies in One Dashboard</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Motor, Health, Fire, Warehouse, and Life coverage organized with vehicle plate tags and expiry countdowns.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              </div>
              <h4 className="font-bold text-base text-[#031638]">Fast Claim Filing &amp; Advocacy</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Submit claims with repair estimates or hospital bills in seconds and get end-to-end advisor assistance.
              </p>
            </div>
          </div>
        </div>

        {/* 3-Step Installation Guide */}
        <div className="rounded-3xl bg-gradient-to-br from-[#031638] via-[#0b244d] to-[#04122c] p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden border border-white/10">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          
          <div className="max-w-2xl mb-8 relative z-10">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
              Installation Instructions
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              How to Install the APK on Android
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/15 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="text-3xl font-extrabold text-blue-400">01</div>
                <Download className="h-5 w-5 text-blue-300/80" />
              </div>
              <div className="font-bold text-sm mb-1 text-white">Download APK</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Click &quot;Download Android APK&quot;. Your browser will start downloading the file safely.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/15 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="text-3xl font-extrabold text-indigo-400">02</div>
                <ShieldCheck className="h-5 w-5 text-indigo-300/80" />
              </div>
              <div className="font-bold text-sm mb-1 text-white">Allow Unknown Sources</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                If prompted by Android, tap &quot;Settings&quot; and toggle &quot;Allow from this source&quot; to permit APK install.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/15 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="text-3xl font-extrabold text-emerald-400">03</div>
                <CheckCircle2 className="h-5 w-5 text-emerald-300/80" />
              </div>
              <div className="font-bold text-sm mb-1 text-white">Install &amp; Log In</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tap &quot;Install&quot; and launch BimaHeadquarter with your registered phone number or Client ID!
              </p>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
