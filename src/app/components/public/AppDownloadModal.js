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
  Globe,
  Lock,
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
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicShareUrl)}&margin=4`;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-download-title"
      >
        {/* Crisp Frosted Backdrop */}
        <div
          className="fixed inset-0 bg-slate-950/65 backdrop-blur-md transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Dialog Card - All White Modern Aesthetic & Spacious Dimensions */}
        <div className="relative w-full max-w-[620px] overflow-hidden rounded-3xl bg-white shadow-[0_25px_70px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/90 transition-all z-10 my-auto flex flex-col border border-slate-100">
          
          {/* Pure White Header */}
          <div className="relative bg-white px-6 sm:px-7 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-13 w-13 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-700 to-indigo-600 text-white shadow-md shadow-blue-500/20 ring-4 ring-blue-50">
                <Smartphone className="h-6.5 w-6.5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="app-download-title" className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    BimaHeadquarter
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200/80">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Verified
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-0.5">
                  Official Android App · Version 1.0.1 (Latest Release)
                </p>
              </div>
            </div>

            {/* High-Contrast Crisp Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 transition-all cursor-pointer border border-slate-200/60"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Modal Body - 2-Column Balanced Layout on Desktop */}
          <div className="p-6 sm:p-7 space-y-6 bg-white">
            
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 sm:gap-6 items-center">
              {/* Left Column: Official QR Code Box */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50/90 rounded-2xl border border-slate-200/80 text-center shadow-2xs">
                <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeUrl}
                    alt="Scan QR code to install BimaHeadquarter app"
                    width={140}
                    height={140}
                    className="rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mt-2.5">
                  <QrCode className="h-3.5 w-3.5 text-blue-600" />
                  <span>Scan with Camera</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Point phone to install directly
                </p>
              </div>

              {/* Right Column: Download CTA & Direct Actions */}
              <div className="sm:col-span-7 space-y-3.5 flex flex-col justify-center">
                {/* Primary APK Download Button */}
                <a
                  href={directApkUrl}
                  download="bimaheadquarter.apk"
                  className="group relative flex w-full items-center justify-between rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 p-4 font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:shadow-xl hover:shadow-blue-600/35 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-xs group-hover:scale-105 transition-transform">
                      <Download className="h-5.5 w-5.5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-base font-extrabold tracking-tight flex items-center gap-1.5">
                        <span>Download Android APK</span>
                        <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      </div>
                      <div className="text-[11px] text-blue-100 font-medium">
                        Latest Release · ~59 MB · Android 8.0+
                      </div>
                    </div>
                  </div>

                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white group-hover:bg-white/25 group-hover:translate-x-1 transition-all">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </a>

                {/* WhatsApp & Copy Link Sharing Buttons */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* WhatsApp Share */}
                  <a
                    href={whatsappShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2.5 text-xs font-bold text-emerald-800 transition-all hover:bg-emerald-100 hover:border-emerald-300 shadow-2xs active:scale-[0.98]"
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-600 fill-emerald-600" />
                    <span>WhatsApp</span>
                  </a>

                  {/* Copy Link */}
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all shadow-2xs active:scale-[0.98] ${
                      copied
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
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

                {/* Live Public URL Preview Bar */}
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5 truncate">
                    <Globe className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate font-mono text-slate-600 font-medium">
                      bimaheadquarter.com/download-app
                    </span>
                  </div>
                  {canShare && (
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 flex-shrink-0 ml-2"
                    >
                      <Share2 className="h-3 w-3" />
                      <span>Share</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Trust & Verification Badges */}
            <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>100% Safe &amp; Verified APK</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <span>IRDAI Licensed Client Portal</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                <span>Android 8.0 &amp; Above</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
