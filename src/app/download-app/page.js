"use client";
/* global navigator */

import { useState } from "react";
import PublicHeader from "@/app/components/public/PublicHeader";
import PublicFooter from "@/app/components/public/PublicFooter";

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
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shareUrl)}&margin=8`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <PublicHeader />

      <main className="flex-1 py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold tracking-wide">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              OFFICIAL ANDROID APP · v1.0.1
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
              Insurance Protection <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 bg-clip-text text-transparent">
                Right In Your Pocket
              </span>
            </h1>

            <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
              Track your complete policy portfolio, download verified insurer PDF schedules, and file emergency claims directly from your smartphone.
            </p>

            {/* Direct Download & Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-4">
              <a
                href={directApkUrl}
                download="bimaheadquarter.apk"
                className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-blue-600 text-white font-extrabold shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all text-base"
              >
                <span className="material-symbols-outlined text-2xl">download</span>
                <span>Download Android APK</span>
              </a>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all text-sm shadow-xs"
              >
                <span className="material-symbols-outlined text-lg">
                  {copied ? "check_circle" : "link"}
                </span>
                <span>{copied ? "Link Copied!" : "Copy Share Link"}</span>
              </button>
            </div>

            {/* Share Download Link Options */}
            <div className="pt-4 border-t border-slate-200/80 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Share Download Link With Family or Clients
              </div>
              <div className="flex flex-wrap gap-2.5">
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-emerald-600">chat</span>
                  <span>Share on WhatsApp</span>
                </a>

                {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold hover:bg-indigo-100 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base text-indigo-600">share</span>
                    <span>More Options...</span>
                  </button>
                )}
              </div>
            </div>

            {/* App Specs */}
            <div className="flex items-center gap-6 pt-2 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-600 text-base">verified</span>
                Verified Clean APK
              </span>
              <span>•</span>
              <span>Size: ~28 MB</span>
              <span>•</span>
              <span>Android 8.0 &amp; Above</span>
            </div>
          </div>

          {/* QR Code Card for Scanning */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-xl border border-slate-200 text-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500" />
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 text-2xl">
                📱
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-1">
                Scan to Install on Phone
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Point your phone camera to download the APK directly
              </p>

              <div className="mx-auto w-52 h-52 p-3 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner flex items-center justify-center mb-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt="Scan QR code to install BimaHeadquarter app"
                  width={190}
                  height={190}
                  className="rounded-xl"
                />
              </div>

              <a
                href={directApkUrl}
                download="bimaheadquarter.apk"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-base">download</span>
                <span>Direct Download APK</span>
              </a>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="border-t border-slate-200 pt-16 mb-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Why Install The BimaHeadquarter App?
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Engineered for seamless self-service, instant policy access, and dedicated claim advocacy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
              </div>
              <h4 className="font-bold text-base text-slate-900">1-Tap Policy PDF Downloads</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Download official insurer policy schedules and certificates instantly on your device without waiting for emails.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">shield</span>
              </div>
              <h4 className="font-bold text-base text-slate-900">All Policies in One Dashboard</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Motor, Health, Fire, Warehouse, and Life coverage organized with vehicle plate tags and expiry countdowns.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">report_problem</span>
              </div>
              <h4 className="font-bold text-base text-slate-900">Fast Claim Filing &amp; Advocacy</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Submit claims with repair estimates or hospital bills in seconds and get end-to-end advisor assistance.
              </p>
            </div>
          </div>
        </div>

        {/* 3-Step Installation Guide */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-blue-950 p-8 sm:p-10 text-white shadow-xl">
          <div className="max-w-2xl mb-8">
            <div className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">
              Installation Instructions
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold">
              How to Install the APK on Android
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="text-3xl font-extrabold text-blue-400 mb-2">01</div>
              <div className="font-bold text-sm mb-1">Download APK</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Click &quot;Download Android APK&quot;. Your browser will start downloading the file.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="text-3xl font-extrabold text-blue-400 mb-2">02</div>
              <div className="font-bold text-sm mb-1">Allow Unknown Sources</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                If prompted, tap &quot;Settings&quot; and toggle &quot;Allow from this source&quot; to permit APK install.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="text-3xl font-extrabold text-blue-400 mb-2">03</div>
              <div className="font-bold text-sm mb-1">Install &amp; Log In</div>
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
