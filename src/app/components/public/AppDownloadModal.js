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
  ShieldCheck,
  MessageCircle,
  ExternalLink,
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
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(publicShareUrl)}&margin=4`;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
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

        {/* Modal Card - Focused, Centered, Gold-Standard Layout (All-White) */}
        <div className="relative w-full max-w-[450px] overflow-hidden rounded-[28px] bg-white shadow-[0_25px_70px_-15px_rgba(0,0,0,0.15)] ring-1 ring-slate-200 transition-all z-10 my-auto flex flex-col p-6 sm:p-7 text-center">
          
          {/* Close Button Top-Right - Bold, High-Contrast & Prominently Sized */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 sm:right-5 sm:top-5 h-10 w-10 rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 hover:text-slate-950 flex items-center justify-center transition-all cursor-pointer border border-slate-200/80 shadow-2xs"
            aria-label="Close modal"
          >
            <X size={26} strokeWidth={3} className="w-[26px] h-[26px] text-slate-800" />
          </button>

          {/* Centered App Icon & Identity */}
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-800 border-2 border-slate-200 shadow-sm">
            <Smartphone size={28} strokeWidth={2} className="w-7 h-7 text-slate-800" />
          </div>

          <div className="inline-flex items-center gap-1.5 mx-auto rounded-full bg-emerald-50 px-3 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 mb-2">
            <ShieldCheck size={16} className="w-4 h-4 text-emerald-600" />
            <span>Official Client App · v1.0.1</span>
          </div>

          <h3 id="app-download-title" className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
            Download App
          </h3>

          <p className="text-xs text-slate-500 mt-1 max-w-[320px] mx-auto leading-relaxed">
            Scan the QR code with your phone camera to download directly on Android.
          </p>

          {/* Centerpiece Hero: Clean White QR Code Stage */}
          <div className="my-5 mx-auto p-4 rounded-2xl bg-white border border-slate-200 shadow-sm inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeUrl}
              alt="Scan QR code to install BimaHeadquarter app"
              width={180}
              height={180}
              className="rounded-xl mx-auto"
            />
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-800 mt-3">
              <QrCode size={18} className="w-4.5 h-4.5 text-slate-700" />
              <span>Point Camera to Install</span>
            </div>
          </div>

          {/* Clean "OR" Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200/80" />
            </div>
            <div className="relative flex justify-center text-[10.5px] uppercase tracking-wider text-slate-400">
              <span className="bg-white px-3 font-extrabold">or download on device</span>
            </div>
          </div>

          {/* Direct Download Button - Pure White Luxury Card Button */}
          <div className="mt-3 space-y-2.5">
            <a
              href={directApkUrl}
              download="bimaheadquarter.apk"
              className="flex items-center justify-between w-full p-3.5 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 border-2 border-slate-200 hover:border-slate-400 transition-all text-slate-900 font-bold shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 border border-slate-200/80">
                  <Download size={20} strokeWidth={2.2} className="w-5 h-5 text-slate-800" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-900 leading-snug">
                    Download Android APK
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Latest Release · ~59 MB · Clean &amp; Verified
                  </div>
                </div>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-slate-200 transition-colors">
                <ExternalLink size={16} className="w-4 h-4" />
              </div>
            </a>

            {/* WhatsApp Share & Copy Link */}
            <div className="grid grid-cols-2 gap-2">
              {/* WhatsApp Share */}
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50/70 hover:border-emerald-300 text-slate-800 py-2.5 px-3 text-xs font-bold transition-all shadow-2xs active:scale-[0.98]"
              >
                <MessageCircle size={18} className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                <span>WhatsApp</span>
              </a>

              {/* Copy Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-xs font-bold transition-all shadow-2xs active:scale-[0.98] ${
                  copied
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800 hover:border-slate-300"
                }`}
              >
                {copied ? (
                  <>
                    <Check size={18} className="w-4 h-4 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={18} className="w-4 h-4 text-slate-500" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Native Share Option */}
            {canShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors pt-1"
              >
                <Share2 size={16} className="w-4 h-4" />
                <span>More sharing options</span>
              </button>
            )}
          </div>

          {/* Footer Verification */}
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <ShieldCheck size={16} className="w-4 h-4 text-emerald-600" />
            <span>IRDAI Verified Client Portal · bimaheadquarter.com</span>
          </div>

        </div>
      </div>
    </ModalPortal>
  );
}
