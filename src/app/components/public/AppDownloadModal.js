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
  CheckCircle2,
  Zap,
} from "lucide-react";

export default function AppDownloadModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // ALWAYS use official public domain for QR code, WhatsApp shares, and copied link
  const publicShareUrl = "https://www.bimaheadquarter.com/download-app";
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
      await navigator.clipboard.writeText(publicShareUrl);
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
          url: publicShareUrl,
        });
      } catch {
        // ignore
      }
    }
  };

  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${publicShareUrl}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(publicShareUrl)}&margin=4`;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-download-title"
      >
        {/* Soft Frosted Backdrop */}
        <div
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-md transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Card - Ultra-Premium All-White Sizing & Architecture */}
        <div className="relative w-full max-w-[700px] overflow-hidden rounded-[28px] bg-white shadow-[0_25px_70px_-10px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.06] transition-all z-10 my-auto flex flex-col border border-slate-100">
          
          {/* Top Bar with Brand & Close Button */}
          <div className="px-7 pt-6 pb-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="app-download-title" className="text-lg font-black text-slate-900 tracking-tight">
                    BimaHeadquarter
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 border border-emerald-200/80">
                    <ShieldCheck className="h-3 w-3 text-emerald-600" />
                    Official Client App
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Android Release · v1.0.1 (Latest)
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer border border-slate-200/50"
              aria-label="Close modal"
            >
              <X className="h-4 w-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Main 2-Column Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-12 p-7 gap-7 items-center bg-white">
            
            {/* Left Column: QR Code Stage */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/60 border border-slate-200/70 text-center shadow-2xs">
              <div className="p-2.5 rounded-2xl bg-white shadow-sm border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt="Scan QR code to install BimaHeadquarter app"
                  width={140}
                  height={140}
                  className="rounded-xl"
                />
              </div>

              <div className="mt-4 space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-slate-800 text-xs font-bold border border-slate-200 shadow-2xs">
                  <QrCode className="h-3.5 w-3.5 text-blue-600" />
                  <span>Scan to Install</span>
                </div>
                <p className="text-[11px] text-slate-500 max-w-[170px] mx-auto leading-relaxed pt-1">
                  Point phone camera at code to open live link instantly
                </p>
              </div>
            </div>

            {/* Right Column: Information, Features & Actions */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-5">
              
              {/* Feature Points */}
              <div className="space-y-2.5">
                <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Your Policy Portfolio On The Go
                </h4>
                <div className="space-y-2 text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Instant 1-tap download of original insurer PDF schedules</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Motor, Health, Fire &amp; Warehouse coverage in one place</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Fast claims filing &amp; direct advisor advocacy</span>
                  </div>
                </div>
              </div>

              {/* Primary Download Button */}
              <div>
                <a
                  href={directApkUrl}
                  download="bimaheadquarter.apk"
                  className="group relative flex w-full items-center justify-between rounded-2xl bg-slate-950 hover:bg-blue-600 active:bg-blue-700 p-4 font-bold text-white shadow-md hover:shadow-xl hover:shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white group-hover:bg-white/20 transition-colors">
                      <Download className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm sm:text-base font-extrabold tracking-tight flex items-center gap-1.5">
                        <span>Download Android APK</span>
                        <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      </div>
                      <div className="text-[11px] text-slate-300 group-hover:text-blue-100 font-medium transition-colors">
                        ~59 MB · Clean &amp; IRDAI Client Portal Verified
                      </div>
                    </div>
                  </div>

                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white group-hover:bg-white/20 group-hover:translate-x-0.5 transition-all">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </a>
              </div>

              {/* Share & Copy Bar */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* WhatsApp Share */}
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 px-3 py-2.5 text-xs font-bold transition-all shadow-2xs active:scale-[0.98]"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600 fill-emerald-600" />
                  <span>Share on WhatsApp</span>
                </a>

                {/* Copy Link */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all shadow-2xs active:scale-[0.98] ${
                    copied
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300"
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
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Native Share Option (if available) */}
              {canShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors pt-1"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>More sharing options</span>
                </button>
              )}

            </div>
          </div>

          {/* Bottom Security / Trust Footer */}
          <div className="px-7 py-3.5 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>100% Secure &amp; Verified APK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Android 8.0 &amp; Above Compatible</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              bimaheadquarter.com
            </div>
          </div>

        </div>
      </div>
    </ModalPortal>
  );
}
