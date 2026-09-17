"use client";
/* global navigator */

import { useEffect, useState } from "react";
import ModalPortal from "@/app/components/shared/ModalPortal";
import {
  Smartphone,
  Download,
  QrCode,
  Share2,
  Copy,
  Check,
  X,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  MessageCircle,
  FileCheck,
} from "lucide-react";

export default function AppDownloadModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  const downloadPageUrl = typeof window !== "undefined"
    ? `${window.location.origin}/download-app`
    : "https://www.bimaheadquarter.com/download-app";

  const directApkUrl = "/api/downloads/app";

  const shareText = "Download the official BimaHeadquarter Insurance App to manage your motor, health & warehouse policies, download verified PDFs, and file claims directly from your phone:";

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.share) {
      setCanShare(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(downloadPageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "BimaHeadquarter Mobile App",
          text: shareText,
          url: downloadPageUrl,
        });
      } catch {
        // ignore
      }
    }
  };

  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${downloadPageUrl}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(downloadPageUrl)}&margin=8`;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-download-title"
      >
        {/* Backdrop with clean blur */}
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Dialog Card - All White Theme, Spacious "Little Big Card" */}
        <div className="relative w-full max-w-[580px] overflow-hidden rounded-3xl bg-white shadow-[0_25px_70px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/80 transition-all z-10 my-auto flex flex-col max-h-[92vh]">
          
          {/* Header - Pure Clean White Theme */}
          <div className="relative bg-white px-6 sm:px-8 pt-7 pb-5 border-b border-slate-100">
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-5 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100/80 text-slate-500 border border-slate-200/80 transition-all hover:bg-slate-200/80 hover:text-slate-800 hover:scale-105 active:scale-95 shadow-2xs"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Live Status Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200/80 mb-3 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Official Android App · v1.0.1</span>
            </div>

            {/* Title & App Icon */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-700 to-indigo-600 text-white shadow-lg shadow-blue-600/20 ring-4 ring-blue-50">
                <Smartphone className="h-7 w-7 text-white" />
              </div>
              <div className="pr-8">
                <h3 id="app-download-title" className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-slate-900 leading-tight">
                  BimaHeadquarter App
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  Your complete insurance portfolio and verified policy PDFs in your pocket
                </p>
              </div>
            </div>
          </div>

          {/* Modal Body - White & Bright Theme */}
          <div className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-1 bg-white">
            
            {/* Primary Download CTA Button */}
            <div className="space-y-2">
              <a
                href={directApkUrl}
                download="bimaheadquarter.apk"
                className="group relative flex w-full items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-4 sm:p-5 font-bold text-white shadow-xl shadow-blue-600/25 transition-all hover:shadow-2xl hover:shadow-blue-600/35 hover:-translate-y-0.5 active:translate-y-0"
              >
                {/* Subtle Shimmer Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 -translate-x-full group-hover:translate-x-full transform" />
                
                <div className="flex items-center gap-4 relative z-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-white ring-1 ring-white/30 backdrop-blur-xs group-hover:scale-110 transition-transform">
                    <Download className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                      <span>Download Android APK</span>
                      <Sparkles className="h-4 w-4 text-amber-300" />
                    </div>
                    <div className="text-xs text-blue-100 font-medium mt-0.5">
                      Latest Release Build · ~59 MB · Android 8.0+
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white group-hover:bg-white/30 group-hover:translate-x-1 transition-all">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </a>

              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium pt-1">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>100% Safe · IRDAI Licensed Client Portal · Verified Clean APK</span>
              </div>
            </div>

            {/* QR Code Card - Spacious & High Contrast */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5 shadow-xs">
              <div className="relative flex-shrink-0 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt="Scan QR code to install BimaHeadquarter app"
                  width={110}
                  height={110}
                  className="rounded-xl transition-transform group-hover:scale-105"
                />
                <div className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-md ring-2 ring-white">
                  <QrCode className="h-4 w-4" />
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-md border border-blue-200/80 mb-1.5">
                  <QrCode className="h-3.5 w-3.5" />
                  Scan to Install on Phone
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900">
                  Point phone camera at QR code
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Open your mobile camera or Google Lens to instantly download and install the APK on any Android phone.
                </p>
              </div>
            </div>

            {/* Share Download Link Section */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold uppercase tracking-wider text-slate-700 text-xs flex items-center gap-1.5">
                  <Share2 className="h-4 w-4 text-blue-600" />
                  Share App With Clients &amp; Family
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* WhatsApp Share Button */}
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 px-4 py-3 text-sm font-bold text-[#0e7436] transition-all hover:bg-[#25D366]/20 hover:border-[#25D366]/60 hover:shadow-xs active:scale-[0.98]"
                >
                  <MessageCircle className="h-4 w-4 text-[#128C7E] fill-[#128C7E]" />
                  <span>Share on WhatsApp</span>
                </a>

                {/* Copy Link Button */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`flex items-center justify-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-bold transition-all active:scale-[0.98] ${
                    copied
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-blue-600" />
                      <span>Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-slate-500" />
                      <span>Copy App Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Native System Share if Supported */}
              {canShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                >
                  <Share2 className="h-3.5 w-3.5 text-slate-600" />
                  <span>More Sharing Options...</span>
                </button>
              )}
            </div>

            {/* 3-Step Setup Cards */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <FileCheck className="h-4 w-4 text-slate-600" />
                Quick 3-Step Setup
              </div>
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-xl bg-white p-3 border border-slate-200/90 shadow-2xs">
                  <div className="flex h-6 w-6 mx-auto items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-extrabold mb-1">
                    1
                  </div>
                  <div className="text-xs font-bold text-slate-800">Download</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Tap button above</div>
                </div>

                <div className="rounded-xl bg-white p-3 border border-slate-200/90 shadow-2xs">
                  <div className="flex h-6 w-6 mx-auto items-center justify-center rounded-full bg-indigo-100 text-indigo-800 text-xs font-extrabold mb-1">
                    2
                  </div>
                  <div className="text-xs font-bold text-slate-800">Allow Install</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Toggle permission</div>
                </div>

                <div className="rounded-xl bg-white p-3 border border-slate-200/90 shadow-2xs">
                  <div className="flex h-6 w-6 mx-auto items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold mb-1">
                    3
                  </div>
                  <div className="text-xs font-bold text-slate-800">Log In</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Phone or Client ID</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
