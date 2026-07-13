"use client";

import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  Eye,
  EyeOff,
  FileCheck,
  Headphones,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogIn,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";

export default function ClientLoginPage() {
  const [regularCustomerId, setRegularCustomerId] = useState("");
  const [regularMpin, setRegularMpin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showMpin, setShowMpin] = useState(false);
  const [loginMode, setLoginMode] = useState("regular");
  const [googleStage, setGoogleStage] = useState("verify_link");
  const [googleEmail, setGoogleEmail] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [mpin, setMpin] = useState("");
  const isVerified = Boolean(success);

  const handleRegularSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!regularCustomerId || !regularMpin) {
      setError("Client ID and Client MPIN are required.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/client/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: regularCustomerId, mpin: regularMpin }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Something went wrong.");
      setSuccess("Logged in successfully. Redirecting...");
      setTimeout(() => {
        window.location.href = "/client/portal";
      }, 1200);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleStart = () => {
    setError("");
    setSuccess("");
    if (typeof window === "undefined" || !window.google) {
      setError("Google Identity services are loading. Please try again in a moment.");
      return;
    }

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: "780359724362-m0i25gff41i2dgru6atnkjc02n2hcq74.apps.googleusercontent.com",
        scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
        callback: async (tokenResponse) => {
          if (!tokenResponse?.access_token) return;
          setLoading(true);
          try {
            const profileResponse = await fetch(
              `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenResponse.access_token}`,
            );
            if (!profileResponse.ok) throw new Error("Failed to retrieve Google user details.");
            const userInfo = await profileResponse.json();
            setGoogleEmail(userInfo.email);

            const loginResponse = await fetch("/api/auth/client/google-mpin-login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ googleEmail: userInfo.email }),
            });
            const loginData = await loginResponse.json();
            if (loginData.success && loginData.linked) {
              setSuccess("Verified. Redirecting to portal...");
              setTimeout(() => {
                window.location.href = "/client/portal";
              }, 800);
              return;
            }
            setLoginMode("google");
            setGoogleStage("verify_link");
            setCustomerId("");
          } catch (requestError) {
            setError(requestError.message);
          } finally {
            setLoading(false);
          }
        },
      });
      tokenClient.requestAccessToken({ prompt: "consent" });
    } catch (googleError) {
      console.error("Google Identity error:", googleError);
      setError("Failed to initialize Google Login.");
    }
  };

  const handleVerifyLink = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!customerId || !mpin) {
      setError("Client ID and MPIN are required.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/client/google-mpin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleEmail, customerId, mpin }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Invalid verification details.");
      setSuccess("Account linked successfully. Redirecting...");
      setTimeout(() => {
        window.location.href = "/client/portal";
      }, 1200);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setLoginMode("regular");
    setError("");
    setSuccess("");
    setMpin("");
    setCustomerId("");
  };

  const features = [
    { icon: FileCheck, title: "Policy Repository", text: "View active policies, coverage details and documents." },
    { icon: BadgeCheck, title: "Claim Assistance", text: "Track updates and securely submit requested documents." },
    { icon: RefreshCw, title: "Renewal Management", text: "Review upcoming renewals and receive timely assistance." },
    { icon: Headphones, title: "Secure Support", text: "Connect directly with the BimaHeadquarter support desk." },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100%;
          min-height: 100%;
          overflow-x: hidden;
        }
        .client-login-shell, .client-login-shell * { box-sizing: border-box; }
        .client-login-shell {
          --navy: #07162f;
          --navy-mid: #0b2348;
          --blue: #2563eb;
          min-height: 100dvh;
          display: grid;
          grid-template-columns: minmax(430px, .9fr) minmax(560px, 1.1fr);
          color: #0f172a;
          background: radial-gradient(circle at 76% 20%, rgba(59,130,246,.16), transparent 27%), radial-gradient(circle at 85% 85%, rgba(34,211,238,.14), transparent 25%), linear-gradient(135deg,#f8fbff,#edf5ff 50%,#eaf8fb);
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
          overflow: hidden;
        }
        .client-brand-panel {
          position: relative;
          min-height: 100dvh;
          padding: clamp(42px,4.4vw,68px) clamp(38px,4.5vw,70px) 36px;
          display: flex;
          flex-direction: column;
          color: white;
          background: linear-gradient(155deg,rgba(7,22,47,.99),rgba(11,35,72,.98) 55%,rgba(10,71,84,.95));
          box-shadow:
            18px 0 34px rgba(7,22,47,.18),
            38px 0 72px rgba(7,22,47,.10);
          z-index: 2;
        }
        .client-brand-panel::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: .26;
          background-image: linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);
          background-size: 34px 34px;
          mask-image: linear-gradient(to bottom,#000,transparent 88%);
          pointer-events: none;
        }
        .client-brand-content, .client-brand-footer { position: relative; z-index: 3; }
        .client-security-label {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          width: fit-content;
          padding: 9px 14px;
          border-radius: 999px;
          background: rgba(34,211,238,.08);
          box-shadow: inset 0 0 0 1px rgba(103,232,249,.18);
          color: #99f6e4;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
        }
        .client-security-dot { width: 8px; height: 8px; border-radius: 50%; background:#34d399; box-shadow:0 0 0 6px rgba(52,211,153,.1); }
        .client-brand-copy { margin-top: clamp(42px,6vh,76px); max-width: 580px; }
        .client-eyebrow { margin: 0 0 17px; color:#a5f3fc; font-size:12px; font-weight:750; letter-spacing:.1em; text-transform:uppercase; }
        .client-brand-copy h1 { max-width:560px; margin:0; font-size:clamp(46px,4.4vw,70px); line-height:.99; letter-spacing:-.055em; font-weight:850; }
        .client-brand-copy h1 span { display:block; color:#7dd3fc; }
        .client-brand-copy > p { max-width:520px; margin:22px 0 0; color:rgba(226,232,240,.82); font-size:15px; line-height:1.7; }
        .client-feature-list { margin-top:32px; max-width:580px; padding:8px; border-radius:22px; background:linear-gradient(145deg,rgba(255,255,255,.065),rgba(255,255,255,.025)); box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 22px 50px rgba(0,0,0,.12); backdrop-filter:blur(16px); }
        .client-feature-item { display:grid; grid-template-columns:44px 1fr auto; gap:15px; align-items:center; padding:14px; border-radius:15px; transition:.22s ease; }
        .client-feature-item:hover { background:rgba(255,255,255,.055); transform:translateX(3px); }
        .client-feature-icon { width:42px; height:42px; display:grid; place-items:center; border-radius:13px; color:white; background:linear-gradient(135deg,#06b6d4,#2563eb); box-shadow:0 9px 22px rgba(6,182,212,.18); }
        .client-feature-text strong { display:block; margin-bottom:3px; font-size:14px; }
        .client-feature-text span { display:block; color:rgba(203,213,225,.74); font-size:12px; line-height:1.42; }
        .client-feature-arrow { color:rgba(255,255,255,.3); }
        .client-brand-footer { margin-top:auto; padding-top:30px; display:flex; align-items:center; gap:10px; color:rgba(203,213,225,.58); font-size:11px; }
        .client-brand-footer span:first-child { width:7px; height:7px; border-radius:50%; background:#34d399; box-shadow:0 0 0 5px rgba(52,211,153,.08); }
        html body .client-brand-panel .client-security-label { color:#99f6e4!important; }
        html body .client-brand-panel .client-eyebrow { color:#dbeafe!important; }
        html body .client-brand-panel .client-brand-copy h1 { color:#ffffff!important; }
        html body .client-brand-panel .client-brand-copy h1 span { color:#7dd3fc!important; }
        html body .client-brand-panel .client-brand-copy > p { color:rgba(226,232,240,.92)!important; }
        html body .client-brand-panel .client-feature-text strong { color:#ffffff!important; }
        html body .client-brand-panel .client-feature-text span { color:rgba(203,213,225,.82)!important; }
        html body .client-brand-panel .client-feature-arrow { color:rgba(255,255,255,.42)!important; }
        html body .client-brand-panel .client-feature-icon,
        html body .client-brand-panel .client-feature-icon svg { color:#ffffff!important; stroke:#ffffff!important; }
        html body .client-brand-panel .client-brand-footer,
        html body .client-brand-panel .client-brand-footer span { color:rgba(203,213,225,.68)!important; }
        .client-portal-panel { position:relative; min-height:100dvh; padding:72px 48px 30px; display:flex; align-items:center; justify-content:center; z-index:1; }
        .client-website-link { position:absolute; top:28px; right:38px; display:inline-flex; align-items:center; gap:8px; padding:10px 15px; color:#0b2348; text-decoration:none; font-size:12px; font-weight:750; border-radius:999px; background:rgba(255,255,255,.7); box-shadow:inset 0 0 0 1px rgba(148,163,184,.22),0 8px 25px rgba(15,35,74,.07); backdrop-filter:blur(14px); transition:.2s ease; }
        .client-website-link:hover { transform:translateY(-2px); background:white; }
        .client-mobile-brand { display:none; }
        .client-login-card { width:min(100%,540px); padding:34px 42px 28px; border-radius:30px; background:rgba(255,255,255,.76); box-shadow:0 30px 80px rgba(15,35,74,.16),inset 0 1px 0 rgba(255,255,255,.86); backdrop-filter:blur(28px); }
        .client-logo { display:flex; justify-content:center; margin-bottom:14px; }
        .client-logo img { width:min(220px,62%); max-height:112px; object-fit:contain; }
        .client-login-heading { text-align:center; margin-bottom:22px; }
        .client-portal-tag { display:block; margin-bottom:7px; color:#2563eb; font-size:10px; font-weight:850; letter-spacing:.15em; text-transform:uppercase; }
        .client-login-heading h2 { margin:0; font-size:28px; line-height:1.18; letter-spacing:-.035em; }
        .client-login-heading p { margin:7px auto 0; max-width:390px; color:#64748b; font-size:13px; line-height:1.55; }
        .client-alert { display:flex; align-items:center; gap:9px; margin-bottom:16px; padding:11px 12px; border-radius:11px; font-size:12px; line-height:1.4; }
        .client-alert.error { color:#be123c; background:#fff1f2; }
        .client-alert.success { color:#047857; background:#ecfdf5; }
        .client-success { display:grid; place-items:center; gap:10px; padding:24px; color:#059669; font-weight:750; }
        .client-form-group { margin-bottom:16px; }
        .client-form-label { display:block; margin:0 0 7px 2px; color:#334155; font-size:10.5px; font-weight:800; letter-spacing:.05em; text-transform:uppercase; }
        .client-input-wrap { position:relative; }
        .client-input-icon { position:absolute; left:16px; top:50%; transform:translateY(-50%); color:#64748b; pointer-events:none; }
        .client-form-control { width:100%; height:52px; padding:0 46px; border:0; border-radius:12px; outline:none; background:rgba(255,255,255,.88); color:#0f172a; font-size:14px; box-shadow:inset 0 0 0 1px rgba(203,213,225,.72); transition:.2s ease; }
        .client-form-control:focus { background:white; box-shadow:inset 0 0 0 1px #3b82f6,0 0 0 4px rgba(59,130,246,.12); }
        .client-form-control::placeholder { color:#94a3b8; }
        .client-toggle-mpin { position:absolute; right:14px; top:50%; transform:translateY(-50%); border:0; padding:4px; background:transparent; color:#64748b; cursor:pointer; }
        .client-form-row { min-height:28px; display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:2px; }
        .client-remember { display:inline-flex; align-items:center; gap:7px; color:#64748b; font-size:12px; }
        .client-remember input[type='checkbox'] {
          appearance:auto!important;
          -webkit-appearance:checkbox!important;
          width:15px!important;
          min-width:15px!important;
          height:15px!important;
          min-height:15px!important;
          margin:0!important;
          padding:0!important;
          border:0!important;
          border-radius:3px!important;
          background:transparent!important;
          box-shadow:none!important;
          accent-color:#2563eb;
        }
        .client-forgot {
          width:auto!important;
          min-width:0!important;
          min-height:0!important;
          height:auto!important;
          margin:0!important;
          padding:4px 0!important;
          border:0!important;
          border-radius:0!important;
          background:transparent!important;
          box-shadow:none!important;
          color:#2563eb!important;
          font-size:12px;
          font-weight:750;
          line-height:1.2;
          cursor:pointer;
        }
        .client-forgot:hover { color:#1d4ed8!important; text-decoration:underline; transform:none!important; }
        .client-primary-btn, .client-google-btn { width:100%; height:52px; display:flex; align-items:center; justify-content:center; gap:9px; border-radius:12px; font-size:13px; font-weight:800; cursor:pointer; transition:.2s ease; }
        .client-primary-btn {
          margin-top:19px;
          border:0!important;
          color:#fff!important;
          background:#1d4ed8!important;
          box-shadow:0 13px 27px rgba(29,78,216,.28);
        }
        .client-primary-btn *, .client-primary-btn svg { color:#fff!important; stroke:currentColor!important; }
        .client-primary-btn:hover,
        .client-primary-btn:focus,
        .client-primary-btn:focus-visible,
        .client-primary-btn:active {
          color:#fff!important;
          background:#1d4ed8!important;
          border-color:transparent!important;
          transform:none!important;
          box-shadow:0 13px 27px rgba(29,78,216,.32)!important;
          outline:none!important;
        }
        button.client-primary-btn:disabled,
        button.client-primary-btn[disabled] {
          opacity:.78!important;
          color:#fff!important;
          background:#1d4ed8!important;
          border:0!important;
          box-shadow:0 13px 27px rgba(29,78,216,.24)!important;
          cursor:wait!important;
        }
        button.client-primary-btn:disabled *,
        button.client-primary-btn:disabled svg,
        button.client-primary-btn[disabled] *,
        button.client-primary-btn[disabled] svg {
          color:#fff!important;
          stroke:currentColor!important;
          opacity:1!important;
        }
        html body .client-login-shell .client-login-card form button.client-primary-btn,
        html body .client-login-shell .client-login-card form button.client-primary-btn:hover,
        html body .client-login-shell .client-login-card form button.client-primary-btn:focus,
        html body .client-login-shell .client-login-card form button.client-primary-btn:focus-visible,
        html body .client-login-shell .client-login-card form button.client-primary-btn:active,
        html body .client-login-shell .client-login-card form button.client-primary-btn:disabled,
        html body .client-login-shell .client-login-card form button.client-primary-btn[disabled] {
          background:#1d4ed8!important;
          background-color:#1d4ed8!important;
          background-image:none!important;
          color:#fff!important;
          -webkit-text-fill-color:#fff!important;
          border:0!important;
          transform:none!important;
          animation:none!important;
          filter:none!important;
          box-shadow:0 13px 27px rgba(29,78,216,.28)!important;
        }
        html body .client-login-shell .client-login-card form button.client-primary-btn *,
        html body .client-login-shell .client-login-card form button.client-primary-btn svg {
          color:#fff!important;
          -webkit-text-fill-color:#fff!important;
          stroke:currentColor!important;
          opacity:1!important;
        }
        .client-primary-btn:disabled, .client-google-btn:disabled { opacity:.65; cursor:wait; transform:none; }
        .client-divider { display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:11px; margin:19px 0; color:#94a3b8; font-size:9px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; }
        .client-divider::before, .client-divider::after { content:''; height:1px; background:linear-gradient(to right,transparent,#cbd5e1); }
        .client-divider::after { background:linear-gradient(to left,transparent,#cbd5e1); }
        .client-google-btn { border:0; color:#334155; background:rgba(255,255,255,.86); box-shadow:inset 0 0 0 1px rgba(203,213,225,.7); }
        .client-google-btn:hover { transform:translateY(-2px); background:white; box-shadow:inset 0 0 0 1px rgba(148,163,184,.6),0 11px 26px rgba(15,35,74,.09); }
        .client-google-btn svg { width:20px!important; height:20px!important; flex:0 0 20px; }
        .client-security-note { margin-top:17px; display:flex; justify-content:center; align-items:center; gap:7px; color:#94a3b8; font-size:10px; text-align:center; }
        .client-security-note svg { color:#10b981; }
        .client-info-pill { margin-bottom:16px; padding:11px 12px; border-radius:11px; color:#475569; background:#eff6ff; font-size:11px; line-height:1.5; }
        .client-back-actions { margin-top:13px; display:flex; flex-direction:column; align-items:center; gap:6px; }
        .client-back-btn { display:inline-flex; align-items:center; gap:5px; border:0; background:transparent; color:#64748b; font-size:11px; font-weight:650; cursor:pointer; }
        @media (max-width:1180px) {
          .client-login-shell { grid-template-columns:.85fr 1.15fr; }
          .client-brand-panel { padding-left:38px; padding-right:50px; }
          .client-brand-copy h1 { font-size:50px; }
          .client-portal-panel { padding-left:34px; padding-right:34px; }
        }
        @media (max-width:900px) {
          .client-login-shell { display:block; min-height:100dvh; overflow-y:auto; }
          .client-brand-panel { display:none; }
          .client-portal-panel { min-height:100dvh; padding:84px 20px 28px; flex-direction:column; }
          .client-mobile-brand { display:block; margin-bottom:18px; text-align:center; }
          .client-mobile-brand span { color:#2563eb; font-size:10px; font-weight:850; letter-spacing:.13em; text-transform:uppercase; }
          .client-mobile-brand h1 { margin:9px 0 0; color:#0b2348; font-size:29px; letter-spacing:-.04em; }
          .client-login-card { padding:29px 25px 24px; border-radius:25px; }
          .client-website-link { top:20px; right:20px; }
        }
        @media (max-width:480px) {
          .client-portal-panel { padding:76px 13px 20px; }
          .client-login-card { padding:25px 18px 22px; border-radius:22px; }
          .client-logo img { width:190px; max-height:96px; }
          .client-login-heading h2 { font-size:25px; }
          .client-form-control, .client-primary-btn, .client-google-btn { height:50px; }
          .client-form-row { align-items:flex-start; }
        }
      ` }} />

      <main className="client-login-shell">
        <section className="client-brand-panel">
          <div className="client-brand-content">
            <div className="client-security-label">
              <span className="client-security-dot" />
              Protected client workspace
            </div>

            <div className="client-brand-copy">
              <p className="client-eyebrow">Insurance, simplified</p>
              <h1>
                Everything secure.
                <span>Everything together.</span>
              </h1>
              <p>
                Access active policies, follow claim progress, manage renewal requirements and connect with your insurance support team from one private workspace.
              </p>

              <div className="client-feature-list">
                {features.map(({ icon: Icon, title, text }) => (
                  <div className="client-feature-item" key={title}>
                    <div className="client-feature-icon"><Icon size={19} /></div>
                    <div className="client-feature-text"><strong>{title}</strong><span>{text}</span></div>
                    <ChevronRight className="client-feature-arrow" size={17} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="client-brand-footer">
            <span />
            <span>© {new Date().getFullYear()} BIMAHEADQUARTER. Secure Insurance Client Services.</span>
          </div>
        </section>

        <section className="client-portal-panel">
          <Link href="/" className="client-website-link">
            <ArrowLeft size={14} /> Go to Website
          </Link>

          <div className="client-mobile-brand">
            <span>● Secure client access</span>
            <h1>Your insurance workspace</h1>
          </div>

          <div className="client-login-card">
            <div className="client-logo">
              <Image src="/brand/main-logo-wide.webp" alt="BIMAHEADQUARTER" width={440} height={224} priority />
            </div>

            <div className="client-login-heading">
              <span className="client-portal-tag">Client Portal</span>
              <h2>{loginMode === "regular" ? "Welcome back" : "Secure Google setup"}</h2>
              <p>{loginMode === "regular" ? "Sign in to access your policies, claims and renewal information." : "Confirm your Client ID and MPIN once to connect your Google account."}</p>
            </div>

            {error && <div className="client-alert error"><ShieldAlert size={16} /><span>{error}</span></div>}
            {success && <div className="client-alert success"><ShieldCheck size={16} /><span>{success}</span></div>}

            {isVerified ? (
              <div className="client-success"><ShieldCheck size={38} /><span>Verification successful</span></div>
            ) : loginMode === "regular" ? (
              <form onSubmit={handleRegularSubmit}>
                <div className="client-form-group">
                  <label className="client-form-label" htmlFor="client-id">Client ID</label>
                  <div className="client-input-wrap">
                    <Mail className="client-input-icon" size={17} />
                    <input id="client-id" className="client-form-control" type="text" autoComplete="username" placeholder="Enter your Client ID" value={regularCustomerId} onChange={(event) => setRegularCustomerId(event.target.value)} disabled={loading} required />
                  </div>
                </div>

                <div className="client-form-group">
                  <label className="client-form-label" htmlFor="client-mpin">Client MPIN</label>
                  <div className="client-input-wrap">
                    <KeyRound className="client-input-icon" size={17} />
                    <input id="client-mpin" className="client-form-control" type={showMpin ? "text" : "password"} inputMode="numeric" maxLength={4} autoComplete="current-password" placeholder="Enter your MPIN" value={regularMpin} onChange={(event) => setRegularMpin(event.target.value)} disabled={loading} required />
                    <button className="client-toggle-mpin" type="button" aria-label={showMpin ? "Hide MPIN" : "Show MPIN"} onClick={() => setShowMpin((visible) => !visible)}>
                      {showMpin ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div className="client-form-row">
                  <label className="client-remember"><input type="checkbox" />Remember this device</label>
                  <button className="client-forgot" type="button" onClick={() => setError("Please contact the BimaHeadquarter support desk to reset your MPIN.")}>Forgot MPIN?</button>
                </div>

                <button className="client-primary-btn" type="submit" disabled={loading}>
                  {loading ? <Loader2 size={17} className="animate-spin" /> : <LockKeyhole size={17} />}
                  {loading ? "Verifying..." : "Sign In Securely"}
                  {!loading && <LogIn size={16} />}
                </button>

                <div className="client-divider">or continue with</div>

                <button className="client-google-btn" type="button" onClick={handleGoogleStart} disabled={loading}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>

                <div className="client-security-note"><ShieldCheck size={13} /><span>Your account is protected with encrypted client credentials.</span></div>
              </form>
            ) : googleStage === "verify_link" ? (
              <form onSubmit={handleVerifyLink}>
                <div className="client-info-pill">First-time setup for <strong>{googleEmail}</strong>. Your next Google sign-in will open the portal directly.</div>
                <div className="client-form-group">
                  <label className="client-form-label" htmlFor="google-client-id">Client ID</label>
                  <div className="client-input-wrap">
                    <Mail className="client-input-icon" size={17} />
                    <input id="google-client-id" className="client-form-control" type="text" placeholder="Enter your Client ID" value={customerId} onChange={(event) => setCustomerId(event.target.value)} disabled={loading} required />
                  </div>
                </div>
                <div className="client-form-group">
                  <label className="client-form-label" htmlFor="google-client-mpin">Client MPIN</label>
                  <div className="client-input-wrap">
                    <KeyRound className="client-input-icon" size={17} />
                    <input id="google-client-mpin" className="client-form-control" type={showMpin ? "text" : "password"} inputMode="numeric" maxLength={4} placeholder="Enter your MPIN" value={mpin} onChange={(event) => setMpin(event.target.value)} disabled={loading} required />
                    <button className="client-toggle-mpin" type="button" aria-label={showMpin ? "Hide MPIN" : "Show MPIN"} onClick={() => setShowMpin((visible) => !visible)}>{showMpin ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                  </div>
                </div>
                <button className="client-primary-btn" type="submit" disabled={loading}>{loading ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}{loading ? "Linking account..." : "Link & Authenticate"}</button>
                <div className="client-back-actions">
                  <button type="button" className="client-back-btn" onClick={handleGoogleStart}><RefreshCw size={12} />Choose another Google account</button>
                  <button type="button" className="client-back-btn" onClick={resetFlow}><ArrowLeft size={12} />Back to Client ID login</button>
                </div>
              </form>
            ) : null}
          </div>
        </section>
      </main>

      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
    </>
  );
}
