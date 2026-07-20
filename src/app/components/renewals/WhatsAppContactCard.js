"use client";

import { AlertCircle, Building2, Mail, MessageCircle, Pencil, Phone, User } from "lucide-react";

const displayValue = (value) => String(value || "").trim() || "Not available";
const displayPhone = (value) => {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  const mobile = digits.length >= 10 ? digits.slice(-10) : "";
  return mobile ? `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}` : displayValue(raw);
};

export default function WhatsAppContactCard({ details, onEdit }) {
  if (!details) return null;

  const missingName = !String(details.name || "").trim();
  const digits = String(details.mobile || "").replace(/\D/g, "");
  const missingMobile = digits.length < 10;
  const notice = missingMobile
    ? missingName
      ? "Contact name and WhatsApp mobile are missing. Add them before sending."
      : "A valid WhatsApp mobile is missing. Add it before sending."
    : missingName
      ? "Contact name is not available. You can add or update it before sending."
      : details.importedFromExcel
        ? "Please verify the contact details before sending."
        : "";
  const rows = [
    { label: "Name", icon: User, value: displayValue(details.name), missing: missingName },
    { label: "Mobile", icon: Phone, value: displayPhone(details.mobile), missing: missingMobile },
    { label: "WhatsApp", icon: MessageCircle, value: displayPhone(details.whatsapp), missing: missingMobile },
    { label: "Email", icon: Mail, value: displayValue(details.email) },
    { label: "Company", icon: Building2, value: displayValue(details.company) },
    { label: "Role", icon: User, value: displayValue(details.role) },
  ];

  return (
    <aside className="rn-whatsapp-contact-card">
      <div className="rn-whatsapp-contact-card__header">
        <div>
          <strong>Client Contact Details</strong>
          <small>This recipient will receive the WhatsApp message.</small>
        </div>
        <button type="button" className="rn-btn" onClick={onEdit}>
          <Pencil size={14} /> Edit
        </button>
      </div>

      {notice ? (
        <div className={`rn-whatsapp-contact-card__notice${missingMobile ? " is-missing" : ""}`}>
          <AlertCircle size={15} />
          <span>{notice}</span>
        </div>
      ) : null}

      <dl>
        {rows.map(({ label, icon: Icon, value, missing }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={missing ? "is-missing" : ""}>
              <Icon size={15} /> {value}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
