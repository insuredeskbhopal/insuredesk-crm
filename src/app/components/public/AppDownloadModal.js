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
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(downloadPageUrl)}&margin=8`;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-download-title"
      >
        {/* Backdrop with rich blur */}
        <div
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Dialog Card */}
        <div className="relative w-full max-w-[500px] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 transition-all z-10 my-auto flex flex-col max-h-[92vh] border border-slate-200/80">
          
          {/* Header with BimaHeadquarter Signature Navy & Emerald Theme */}
          <div className="relative bg-gradient-to-br from-[#031638] via-[#0a234f] to-[#0f3460] px-6 pt-6 pb-5 text-white overflow-hidden">
            {/* Ambient Lighting Orbs */}
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#1c6c39]/30 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />
            
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 ring-1 ring-white/15 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white hover:scale-105 active:scale-95"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Brand Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-400/30 backdrop-blur-sm mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Official Android App · v1.0.1</span>
            </div>

            {/* Title & App Icon */}
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white shadow-lg shadow-blue-900/40 ring-2 ring-white/25">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 id="app-download-title" className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
                  BimaHeadquarter App
                </h3>
                <p className="text-xs text-blue-200/90 font-medium mt-0.5">
                  Your complete insurance portfolio in your pocket
                </p>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="overflow-y-auto p-5 sm:p-6 space-y-5 flex-1 bg-gradient-to-b from-slate-50/50 to-white">
            
            {/* Primary Download CTA Button */}
            <div className="space-y-2">
              <a
                href={directApkUrl}
                download="bimaheadquarter.apk"
                className="group relative flex w-full items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-[#031638] via-[#0d2d69] to-[#1657ff] p-4 font-bold text-white shadow-xl shadow-blue-900/20 transition-all hover:shadow-2xl hover:shadow-blue-600/30 hover:-translate-y-0.5 active:translate-y-0"
              >
                {/* Subtle Shimmer Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 -translate-x-full group-hover:translate-x-full transform" />
                
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-xs group-hover:scale-110 transition-transform">
                    <Download className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-base font-extrabold tracking-tight flex items-center gap-1.5">
                      Download Android APK
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    </div>
                    <div className="text-[11.5px] text-blue-200/90 font-medium">
                      Latest Build · ~59 MB · Android 8.0+
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white group-hover:bg-white/20 group-hover:translate-x-1 transition-all">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </a>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>100% Safe · IRDAI Licensed Portal · Verified Clean APK</span>
              </div>
            </div>

            {/* QR Code Quick Scan Box */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm flex items-center gap-4">
              <div className="relative flex-shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-xs group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt="Scan QR code to install BimaHeadquarter app"
                  width={96}
                  height={96}
                  className="rounded-lg transition-transform group-hover:scale-105"
                />
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm ring-2 ring-white">
                  <QrCode className="h-3 w-3" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 mb-1">
                  <QrCode className="h-3 w-3" />
                  Scan to Install on Phone
                </div>
                <h4 className="text-xs font-bold text-slate-900 leading-snug">
                  Point phone camera at code
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                  Instantly triggers direct download on any Android device without typing.
                </p>
              </div>
            </div>

            {/* Share Download Link Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold uppercase tracking-wider text-slate-700 text-[11px] flex items-center gap-1.5">
                  <Share2 className="h-3.5 w-3.5 text-blue-600" />
                  Share App With Clients &amp; Family
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* WhatsApp Share Button */}
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3.5 py-2.5 text-xs font-bold text-emerald-800 transition-all hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-xs active:scale-[0.98]"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600 fill-emerald-600" />
                  <span>WhatsApp</span>
                </a>

                {/* Copy Link Button */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all active:scale-[0.98] ${
                    copied
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-blue-600" />
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

              {/* Native System Share if Supported */}
              {canShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100/80 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200/80 transition-colors"
                >
                  <Share2 className="h-3.5 w-3.5 text-slate-600" />
                  <span>More Sharing Options...</span>
                </button>
              )}
            </div>

            {/* 3-Step Installation Guide Cards */}
            <div className="rounded-2xl border border-slate-200/70 bg-slate-100/60 p-3.5 space-y-2.5">
              <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-slate-600" />
                Quick 3-Step Setup
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white p-2.5 border border-slate-200/80 shadow-2xs">
                  <div className="flex h-5 w-5 mx-auto items-center justify-center rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold mb-1">
                    1
                  </div>
                  <div className="text-[11px] font-bold text-slate-800">Download</div>
                  <div className="text-[9.5px] text-slate-500 mt-0.5">Tap button above</div>
                </div>

                <div className="rounded-xl bg-white p-2.5 border border-slate-200/80 shadow-2xs">
                  <div className="flex h-5 w-5 mx-auto items-center justify-center rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-extrabold mb-1">
                    2
                  </div>
                  <div className="text-[11px] font-bold text-slate-800">Allow Install</div>
                  <div className="text-[9.5px] text-slate-500 mt-0.5">Toggle permission</div>
                </div>

                <div className="rounded-xl bg-white p-2.5 border border-slate-200/80 shadow-2xs">
                  <div className="flex h-5 w-5 mx-auto items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold mb-1">
                    3
                  </div>
                  <div className="text-[11px] font-bold text-slate-800">Log In</div>
                  <div className="text-[9.5px] text-slate-500 mt-0.5">Phone or Client ID</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
