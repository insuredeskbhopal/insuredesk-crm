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
  Lock,
} from "lucide-react";

export default function DownloadAppPage() {
  const [copied, setCopied] = useState(false);

  const shareUrl = "https://www.bimaheadquarter.com/download-app";
  const directApkUrl = "/api/downloads/app";
  const shareText =
    "Download the official BimaHeadquarter Insurance App to manage your motor, health & warehouse policies, download verified PDFs, and file claims directly from your phone:";

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
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(shareUrl)}&margin=6`;

  return (
    <div className="min-h-screen bg-slate-50/40 text-slate-900 flex flex-col font-sans selection:bg-slate-200 selection:text-slate-900">
      <PublicHeader />

      <main className="flex-1 py-12 md:py-18 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        {/* Top Announcement Pill */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs text-xs font-bold text-slate-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
            <span>OFFICIAL ANDROID RELEASE · v1.0.1</span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Verified Clean Build
            </span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center mb-20">
          <div className="lg:col-span-7 space-y-6 text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
              Insurance Protection <br />
              <span className="text-slate-800">Right In Your Pocket</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              Track your complete policy portfolio across Motor, Health, Fire &amp; Warehouse, download verified insurer PDF schedules, and file emergency claims directly from your Android phone.
            </p>

            {/* Prominent White Store Action Card Button */}
            <div className="pt-2">
              <a
                href={directApkUrl}
                download="bimaheadquarter.apk"
                className="group flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-slate-300 hover:shadow-md transition-all active:scale-[0.99] text-left max-w-lg cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="h-13 w-13 sm:h-14 sm:w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shadow-2xs group-hover:scale-105 transition-transform">
                    <Smartphone className="h-7 w-7 text-slate-800" strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                        Download Android App
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/80 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">
                        <Sparkles className="h-3 w-3 text-emerald-600" />
                        APK
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                      Direct Safe Download · Free · Android 8.0+
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pl-3">
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200 text-xs font-bold text-slate-700">
                    <Download className="h-3.5 w-3.5 text-slate-600" />
                    59 MB
                  </span>
                  <div className="h-10 w-10 rounded-xl bg-slate-100 group-hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors">
                    <ArrowRight className="h-5 w-5 text-slate-800 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </a>
            </div>

            {/* Symmetrical Twin Share Actions (WhatsApp & Copy Link) */}
            <div className="pt-2 max-w-lg">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5 text-slate-500" />
                Share Download Link with Family or Clients
              </div>

              <div className="grid grid-cols-2 gap-3">
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-xs font-bold transition-all shadow-2xs cursor-pointer"
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
                      : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
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

              {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                <div className="pt-2.5">
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>More share options...</span>
                  </button>
                </div>
              )}
            </div>

            {/* App Specs Footer */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Verified Clean APK
              </span>
              <span>•</span>
              <span>Size: ~59 MB</span>
              <span>•</span>
              <span>Android 8.0 &amp; Above</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-600">
                <Lock className="h-3.5 w-3.5 text-slate-400" /> 256-Bit Encrypted
              </span>
            </div>
          </div>

          {/* QR Code Card - Pure White, Minimalist & Focused */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm rounded-[28px] bg-white p-7 shadow-xl border border-slate-200/90 text-center relative overflow-hidden">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 shadow-2xs border border-slate-100">
                <Smartphone className="h-7 w-7 text-slate-800" />
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-1">
                Scan to Install on Phone
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                Point your phone camera to download directly
              </p>

              <div className="mx-auto w-56 h-56 p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center mb-6 relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt="Scan QR code to install BimaHeadquarter app"
                  width={204}
                  height={204}
                  className="rounded-xl transition-transform group-hover:scale-102"
                />
                <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white shadow-md ring-4 ring-white">
                  <QrCode className="h-4 w-4" />
                </div>
              </div>

              <a
                href={directApkUrl}
                download="bimaheadquarter.apk"
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-xs font-extrabold text-white hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
              >
                <Download className="h-4 w-4 text-slate-300 group-hover:scale-110 transition-transform" />
                <span>Direct Download APK (59 MB)</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
        </div>

        {/* Feature Grid - All-White Cards */}
        <div className="border-t border-slate-200/80 pt-16 mb-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Why Install The BimaHeadquarter App?
            </h2>
            <p className="text-slate-500 text-sm mt-2">
              Engineered for seamless self-service, instant policy access, and dedicated claim advocacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3.5 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-slate-50 text-slate-800 flex items-center justify-center border border-slate-100">
                <FileText className="h-6 w-6 text-slate-700" strokeWidth={2} />
              </div>
              <h4 className="font-bold text-base text-slate-900">1-Tap Policy PDF Downloads</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Download official insurer policy schedules and certificates instantly on your device without waiting for emails.
              </p>
            </div>

            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3.5 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-100">
                <LayoutDashboard className="h-6 w-6 text-emerald-700" strokeWidth={2} />
              </div>
              <h4 className="font-bold text-base text-slate-900">All Policies in One Dashboard</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Motor, Health, Fire, Warehouse, and Life coverage organized with vehicle plate tags and expiry countdowns.
              </p>
            </div>

            <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3.5 hover:shadow-md transition-shadow">
              <div className="h-12 w-12 rounded-xl bg-slate-50 text-slate-800 flex items-center justify-center border border-slate-100">
                <ShieldAlert className="h-6 w-6 text-slate-700" strokeWidth={2} />
              </div>
              <h4 className="font-bold text-base text-slate-900">Fast Claim Filing &amp; Advocacy</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Submit claims with repair estimates or hospital bills in seconds and get end-to-end advisor assistance.
              </p>
            </div>
          </div>
        </div>

        {/* 3-Step Installation Guide - Pristine White Cards (Zero Black Background) */}
        <div className="rounded-3xl bg-white p-8 sm:p-10 border border-slate-200/90 shadow-sm mb-12">
          <div className="max-w-2xl mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200/80 text-[11px] font-black uppercase tracking-wider text-emerald-800 mb-2">
              <Sparkles className="h-3 w-3 text-emerald-600" />
              Easy 3-Step Setup
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              How to Install the APK on Android
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Follow these simple steps to install the app safely on any Android smartphone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50/60 rounded-2xl p-6 border border-slate-200/80 hover:bg-slate-50 transition-colors space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-black text-slate-400">01</div>
                <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                  <Download className="h-5 w-5 text-slate-700" />
                </div>
              </div>
              <div className="font-bold text-sm text-slate-900">Download the APK</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tap &quot;Download Android App&quot;. Your mobile browser will safely download the official APK package.
              </p>
            </div>

            <div className="bg-slate-50/60 rounded-2xl p-6 border border-slate-200/80 hover:bg-slate-50 transition-colors space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-black text-slate-400">02</div>
                <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <div className="font-bold text-sm text-slate-900">Allow Installation</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                If prompted by Android, tap &quot;Settings&quot; and toggle &quot;Allow from this source&quot; to permit installation.
              </p>
            </div>

            <div className="bg-slate-50/60 rounded-2xl p-6 border border-slate-200/80 hover:bg-slate-50 transition-colors space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-black text-slate-400">03</div>
                <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <div className="font-bold text-sm text-slate-900">Install &amp; Log In</div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tap &quot;Install&quot; and launch BimaHeadquarter with your registered mobile number or Client ID!
              </p>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
