"use client";
/* global navigator */

import { useEffect, useState } from "react";
import ModalPortal from "@/app/components/shared/ModalPortal";

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

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(downloadPageUrl)}&margin=8`;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-download-title"
      >
        {/* Blurred Backdrop */}
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Centered Modal Card */}
        <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10 transition-all z-10 max-h-[90vh] flex flex-col">
          {/* Top Banner Gradient */}
          <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 px-6 py-6 text-white sm:px-8">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div className="flex items-center gap-3.5 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/30 ring-1 ring-white/30 backdrop-blur-sm text-2xl shadow-md">
                📱
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Official Android App · v1.0.1
                </div>
                <h3 id="app-download-title" className="text-xl font-extrabold tracking-tight text-white mt-1">
                  Download BimaHeadquarter
                </h3>
              </div>
            </div>
            <p className="text-xs text-blue-100/80 leading-relaxed">
              Track policies, download verified PDF schedules, and file insurance claims directly from your phone.
            </p>
          </div>

          {/* Modal Body */}
          <div className="overflow-y-auto p-6 sm:p-7 space-y-6 flex-1">
            {/* Primary Direct Download CTA */}
            <div className="space-y-2">
              <a
                href={directApkUrl}
                download="bimaheadquarter.apk"
                className="group relative flex w-full items-center justify-between rounded-2xl bg-blue-600 px-6 py-4 font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/40 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-2xl">download</span>
                  </div>
                  <div className="text-left">
                    <div className="text-base font-extrabold">Download Android APK</div>
                    <div className="text-xs text-blue-100 font-normal">Direct Package · 28 MB · Android 8.0+</div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-xl text-blue-200 group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </a>
              <p className="text-center text-[11.5px] text-slate-500">
                100% Safe, IRDAI licensed client portal APK verified by BimaHeadquarter.
              </p>
            </div>

            {/* QR Code + Desktop Scanning */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="flex-shrink-0 bg-white p-2 rounded-xl shadow-xs border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt="Scan QR code to download app"
                  width={100}
                  height={100}
                  className="rounded-lg"
                />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
                  Scan to Download on Phone
                </div>
                <div className="text-sm font-bold text-slate-800">
                  Open your camera to install instantly
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Point your mobile camera at this QR code to download directly onto your smartphone.
                </div>
              </div>
            </div>

            {/* Share Download Link Section */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Share Downloadable Link
                </span>
                <span className="text-xs text-slate-400">Invite clients & family</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* WhatsApp Share */}
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-xs font-bold text-emerald-800 transition-all hover:bg-emerald-100 hover:border-emerald-300"
                >
                  <span className="material-symbols-outlined text-lg text-emerald-600">chat</span>
                  <span>Share on WhatsApp</span>
                </a>

                {/* Copy Link Button */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold transition-all ${
                    copied
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    {copied ? "check_circle" : "link"}
                  </span>
                  <span>{copied ? "Link Copied!" : "Copy App Link"}</span>
                </button>
              </div>

              {/* Native Web Share API if supported */}
              {canShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-2.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">share</span>
                  <span>More Sharing Options...</span>
                </button>
              )}
            </div>

            {/* Fast Install Guide */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-slate-600">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                Quick 3-Step Installation:
              </div>
              <ol className="space-y-1 text-xs list-decimal list-inside text-slate-600">
                <li>Tap <strong>Download Android APK</strong> above.</li>
                <li>Tap the downloaded file in your browser or notifications.</li>
                <li>Choose <strong>Install</strong> (Allow from this source if prompted) &amp; Open!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
