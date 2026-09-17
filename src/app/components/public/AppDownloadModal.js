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
  MessageCircle,
  CheckCircle2,
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
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(publicShareUrl)}&margin=4`;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-download-title"
      >
        {/* Crisp Frosted Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Card - 100% Pure All-White Luxury Theme (Zero Blue, Zero Black) */}
        <div className="relative w-full max-w-[680px] overflow-hidden rounded-[28px] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)] ring-1 ring-slate-200/90 transition-all z-10 my-auto flex flex-col border border-slate-100">
          
          {/* Header Bar - Pristine Pure White */}
          <div className="px-7 pt-6 pb-4 flex items-center justify-between border-b border-slate-100 bg-white">
            <div className="flex items-center gap-3.5">
              {/* Pure White App Icon */}
              <div className="h-11 w-11 rounded-2xl bg-white text-slate-800 flex items-center justify-center shadow-xs border border-slate-200">
                <Smartphone className="h-5.5 w-5.5 text-slate-800" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="app-download-title" className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    BimaHeadquarter
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Verified App
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Official Android Release · Version 1.0.1
                </p>
              </div>
            </div>

            {/* High-Visibility Clean Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-full bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer border border-slate-200"
              aria-label="Close modal"
            >
              <X className="h-4 w-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Main 2-Column Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-12 p-7 gap-7 items-center bg-white">
            
            {/* Left Column: Pure White QR Code Plinth */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-5 rounded-2xl bg-white border border-slate-200 text-center shadow-xs">
              <div className="p-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt="Scan QR code to install BimaHeadquarter app"
                  width={140}
                  height={140}
                  className="rounded-lg"
                />
              </div>

              <div className="mt-3.5 space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-800 text-xs font-bold border border-slate-200">
                  <QrCode className="h-3.5 w-3.5 text-slate-700" />
                  <span>Scan to Install</span>
                </div>
                <p className="text-[11px] text-slate-500 max-w-[170px] mx-auto leading-relaxed pt-1">
                  Point phone camera at code to open live link instantly
                </p>
              </div>
            </div>

            {/* Right Column: Value Props & All-White Download Actions */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-4.5">
              
              {/* Feature Highlights */}
              <div className="space-y-2">
                <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Your Policy Portfolio On The Go
                </h4>
                <div className="space-y-1.5 text-xs text-slate-600">
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

              {/* Primary Download Button - 100% All-White Luxury Card Button */}
              <div>
                <a
                  href={directApkUrl}
                  download="bimaheadquarter.apk"
                  className="group relative flex w-full items-center justify-between rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 p-4 font-bold text-slate-900 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border-2 border-slate-200 hover:border-slate-400"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 border border-slate-200/80 group-hover:scale-105 transition-transform">
                      <Download className="h-5 w-5 text-slate-800" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900">
                        Download Android APK
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Direct Package · ~59 MB · Clean &amp; Verified
                      </div>
                    </div>
                  </div>

                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-slate-200 group-hover:translate-x-0.5 transition-all">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </a>
              </div>

              {/* WhatsApp Share & Copy Link Actions */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* WhatsApp Share */}
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50/60 hover:border-emerald-300 text-slate-800 px-3 py-2.5 text-xs font-bold transition-all shadow-2xs active:scale-[0.98]"
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
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800 hover:border-slate-300"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" />
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

              {/* Native Share Option (if available) */}
              {canShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors pt-0.5"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>More sharing options</span>
                </button>
              )}

            </div>
          </div>

          {/* Bottom Security / Trust Footer - Pure White */}
          <div className="px-7 py-3.5 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>100% Secure &amp; Verified APK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>IRDAI Licensed Client Portal</span>
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
