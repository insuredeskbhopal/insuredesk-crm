"use client";

import { useState } from "react";
import { Copy, Check, MessageCircle, QrCode, Share2 } from "lucide-react";
import { BRAND_CONFIG, WHATSAPP_REVIEW_TEMPLATE_HINDI } from "@/lib/review/config";

export default function ReviewShareButtons({
  customerPhone = "",
  customerName: _customerName = "",
  campaign = "crm_customer",
  compact = false,
}) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Clean phone number for WhatsApp wa.me link
  const rawPhone = String(customerPhone || "").replace(/\D/g, "");
  const formattedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

  // Branded review link with safe campaign attribution — zero PII in the URL!
  const reviewLink = `${BRAND_CONFIG.canonicalReviewUrl}?src=crm&c=${encodeURIComponent(campaign)}`;

  // Construct message with the exact required Hindi template
  const customWhatsAppText = WHATSAPP_REVIEW_TEMPLATE_HINDI.replace(
    "https://bimaheadquarter.com/review",
    reviewLink
  );

  const handleCopyLink = async () => {
    try {
      if (typeof window !== "undefined" && window.navigator?.clipboard?.writeText) {
        await window.navigator.clipboard.writeText(reviewLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        return;
      }
    } catch {
      // Fallback
    }

    try {
      const input = document.createElement("input");
      input.value = reviewLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const handleWhatsAppShare = async () => {
    if (!formattedPhone) { window.alert("Choose a customer with a phone number before sending."); return; }
    try {
      const response = await fetch("/api/operations/whatsapp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient: formattedPhone, message: customWhatsAppText }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send review request");
      window.alert("Review request sent from My Primary WhatsApp.");
    } catch (error) { window.alert(error.message); }
  };

  const handleDownloadQr = () => {
    window.open(`/api/review/qr?c=${encodeURIComponent(campaign)}&format=png`, "_blank");
  };

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleCopyLink}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
          title="Copy Branded Review Link"
        >
          {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
          <span>{copied ? "Copied" : "Copy Link"}</span>
        </button>

        <button
          type="button"
          onClick={handleWhatsAppShare}
          className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
          title="Share via WhatsApp"
        >
          <MessageCircle size={13} className="text-emerald-600" />
          <span>WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadQr}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
          title="Download Print QR Code"
        >
          <QrCode size={13} className="text-blue-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
            <Share2 size={14} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Google Review Request</h4>
            <p className="text-[11px] text-slate-500">Official branded link with attribution</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline"
        >
          {showPreview ? "Hide Message" : "View Template"}
        </button>
      </div>

      {showPreview && (
        <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed shadow-2xs">
          {customWhatsAppText}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-2xs cursor-pointer"
        >
          {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-slate-600" />}
          <span>{copied ? "Link Copied!" : "Copy Review Link"}</span>
        </button>

        <button
          type="button"
          onClick={handleWhatsAppShare}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
        >
          <MessageCircle size={14} />
          <span>Share on WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadQr}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          title="Download Print QR Code"
        >
          <QrCode size={14} className="text-blue-600" />
          <span>Download QR</span>
        </button>
      </div>
    </div>
  );
}
