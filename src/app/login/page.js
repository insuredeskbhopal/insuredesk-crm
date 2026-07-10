"use client";

import { useState } from "react";
import { ShieldCheck, Mail, Loader2, LogIn, KeyRound, ArrowLeft, ShieldAlert, BadgeCheck, FileCheck } from "lucide-react";
import Link from "next/link";
import Script from "next/script";

export default function ClientLoginPage() {
  const [regularCustomerId, setRegularCustomerId] = useState("");
  const [regularMpin, setRegularMpin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const isVerified = Boolean(success);

  // Google Login flow states
  const [loginMode, setLoginMode] = useState("regular"); // "regular" or "google"
  const [googleStage, setGoogleStage] = useState("verify_link"); // "verify_link" (only stage needed for unlinked accounts)
  const [googleEmail, setGoogleEmail] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [mpin, setMpin] = useState("");

  const handleRegularSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!regularCustomerId || !regularMpin) {
      setError("Client ID and Client MPIN are required.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/client/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: regularCustomerId, mpin: regularMpin }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Something went wrong.");
      }

      setSuccess("Logged in successfully. Redirecting...");

      setTimeout(() => {
        window.location.href = "/client/portal";
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  const handleGoogleStart = () => {
    setError("");
    setSuccess("");

    if (typeof window !== "undefined" && window.google) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: "780359724362-m0i25gff41i2dgru6atnkjc02n2hcq74.apps.googleusercontent.com",
          scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
          callback: async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              setLoading(true);
              try {
                const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenResponse.access_token}`);
                if (!res.ok) throw new Error("Failed to retrieve Google user details");
                const userInfo = await res.json();
                const selectedEmail = userInfo.email;

                setGoogleEmail(selectedEmail);

                // Check if this Google email is already linked in DB
                const checkRes = await fetch("/api/auth/client/google-mpin-login", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ googleEmail: selectedEmail }),
                });
                const checkData = await checkRes.json();

                if (checkData.success && checkData.linked) {
                  // Already linked — auto-login, skip everything
                  setSuccess("Verified. Redirecting to portal...");
                  setTimeout(() => { window.location.href = "/client/portal"; }, 800);
                  return;
                }

                // Not linked yet — show one-time verification form
                setLoginMode("google");
                setGoogleStage("verify_link");
                setCustomerId("");
              } catch (err) {
                setError(err.message);
              } finally {
                setLoading(false);
              }
            }
          },
        });
        tokenClient.requestAccessToken({ prompt: "consent" });
      } catch (err) {
        console.error("GIS Error:", err);
        setError("Failed to initialize Google Login client.");
      }
    } else {
      setError("Google Identity services loading. Please wait a moment and try again.");
    }
  };

  const handleVerifyLink = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!customerId || !mpin) {
      setError("Customer ID and MPIN are required.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/client/google-mpin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleEmail, customerId, mpin }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid verification details.");
      }

      setSuccess("Account linked successfully. Redirecting...");

      setTimeout(() => {
        window.location.href = "/client/portal";
      }, 1200);
    } catch (err) {
      setError(err.message);
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

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .split-container {
          display: flex;
          min-height: 100vh;
          background: linear-gradient(135deg, #eef2ff 0%, #f8fafc 50%, #e0f2fe 100%);
          color: #0f172a;
          font-family: Inter, system-ui, -apple-system, sans-serif;
          position: relative;
          overflow: hidden;
        }
        /* Floating blurred ambient blobs */
        .ambient-blob-1 {
          position: absolute;
          top: -200px;
          left: -100px;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%);
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .ambient-blob-2 {
          position: absolute;
          bottom: -200px;
          right: -100px;
          width: 700px;
          height: 700px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%);
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
        }
        .ambient-blob-3 {
          position: absolute;
          top: 30%;
          left: 45%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(236, 72, 153, 0.06) 0%, transparent 70%);
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .visual-panel {
          flex: 1.2;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 80px;
          border-right: 1px solid rgba(255, 255, 255, 0.4);
          position: relative;
          z-index: 10;
        }
        .bg-pattern {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 0);
          background-size: 24px 24px;
          pointer-events: none;
        }
        .visual-logo-container {
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 10;
        }
        .visual-logo-container img {
          height: 76px;
          width: auto;
          object-fit: contain;
          filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.05));
        }
        .feature-showcase {
          max-width: 520px;
          position: relative;
          z-index: 10;
          margin: auto 0;
        }
        .feature-showcase h1 {
          font-size: 46px;
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -1.5px;
          margin-bottom: 20px;
          color: #0f172a;
          text-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);
        }
        .feature-showcase > p {
          font-size: 15.5px;
          color: #475569;
          line-height: 1.65;
        }
        .feature-list {
          margin-top: 40px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .feature-card {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          background: rgba(255, 255, 255, 0.35);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          padding: 24px;
          border-radius: 24px;
          box-shadow: 0 4px 20px rgba(148, 163, 184, 0.05);
          transition: all 0.3s ease;
        }
        .feature-card:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.55);
          border-color: rgba(255, 255, 255, 0.8);
          box-shadow: 0 10px 30px rgba(148, 163, 184, 0.1);
        }
        .feature-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 46px;
          width: 46px;
          border-radius: 14px;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
        }
        .feature-card h3 {
          font-size: 17px;
          font-weight: 750;
          color: #0f172a;
          margin-bottom: 6px;
        }
        .feature-card p {
          font-size: 13.5px;
          color: #475569;
          line-height: 1.5;
        }
        .visual-footer {
          position: relative;
          z-index: 10;
          font-size: 12.5px;
          color: #64748b;
          font-weight: 500;
        }
        .form-panel {
          flex: 1.1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px;
          position: relative;
          z-index: 10;
        }
        .glass-login-card {
          width: 100%;
          max-width: 480px;
          background: rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 32px;
          padding: 56px;
          box-shadow: 0 30px 60px rgba(31, 38, 135, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.6);
          animation: card-fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .card-header {
          text-align: center;
          margin-bottom: 36px;
        }
        .card-header img {
          width: 320px;
          height: auto;
          margin: 0 auto 20px;
          display: block;
          object-fit: contain;
          filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.03));
        }
        .back-to-home-btn {
          position: absolute;
          top: 32px;
          right: 32px;
          z-index: 100;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 999px;
          padding: 8px 18px;
          font-size: 12.5px;
          font-weight: 700;
          color: #334155;
          text-decoration: none;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .back-to-home-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
        }
        .card-header h2 {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.5px;
          margin-bottom: 8px;
        }
        .card-header p {
          font-size: 14px;
          color: #475569;
          line-height: 1.4;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 28px;
        }
        .input-group span {
          font-size: 11.5px;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .input-container {
          position: relative;
        }
        .input-icon {
          position: absolute;
          left: 4px;
          top: 14px;
          color: #94a3b8;
          pointer-events: none;
        }
        .input-field {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 2px solid rgba(226, 232, 240, 1.2);
          border-radius: 0;
          padding: 12px 4px 12px 32px;
          color: #0f172a;
          font-size: 15px;
          outline: none;
          transition: all 0.2s;
        }
        .input-field:focus {
          border-bottom-color: #031638;
          box-shadow: none;
        }
        .submit-btn {
          width: 100%;
          max-width: 260px;
          margin: 28px auto 0;
          padding: 16px;
          border-radius: 16px;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.9);
          color: #031638;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
          transition: all 0.2s;
        }
        .submit-btn:hover {
          transform: translateY(-1px);
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #031638;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
        }
        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.5px;
          margin: 30px 0;
          text-transform: uppercase;
        }
        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid rgba(226, 232, 240, 0.8);
        }
        .google-sign-btn {
          width: 100%;
          max-width: 260px;
          margin: 0 auto;
          padding: 15px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(226, 232, 240, 0.9);
          color: #334155;
          font-weight: 500;
          font-size: 14.5px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: all 0.2s;
          box-shadow: 0 2px 5px rgba(0,0,0,0.01);
        }
        .google-sign-btn:hover {
          background: rgba(255, 255, 255, 0.95);
          color: #0f172a;
          border-color: #cbd5e1;
        }
        .google-list-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(226, 232, 240, 0.8);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }
        .google-list-btn:hover {
          border-color: #cbd5e1;
          background: white;
        }
        .google-list-btn h4 {
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 2px;
        }
        .google-list-btn p {
          font-size: 11px;
          color: #64748b;
        }
        .google-badge {
          font-size: 9px;
          font-weight: 750;
          text-transform: uppercase;
          background: rgba(37, 99, 235, 0.08);
          color: #2563eb;
          padding: 3px 6px;
          border-radius: 4px;
        }
        .back-action-btn {
          width: 100%;
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 16px;
          transition: color 0.2s;
        }
        .back-action-btn:hover {
          color: #1e293b;
        }
        .alert-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border-radius: 12px;
          font-size: 12px;
          margin-bottom: 20px;
          line-height: 1.4;
        }
        .alert-box.error {
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.15);
          color: #dc2626;
        }
        .alert-box.success {
          background: rgba(16, 185, 129, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.15);
          color: #059669;
        }
        .card-footer {
          margin-top: 28px;
          text-align: center;
          font-size: 11px;
          color: #94a3b8;
          border-t: 1px solid rgba(226, 232, 240, 0.8);
          padding-top: 14px;
        }
        .info-pill {
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 12px;
          padding: 12px;
          font-size: 11px;
          color: #475569;
          line-height: 1.5;
          margin-bottom: 18px;
        }
        .success-illustration {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 0;
          text-align: center;
        }
        .success-ring {
          height: 60px;
          width: 60px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.08);
          border: 2px solid rgba(16, 185, 129, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #059669;
          margin-bottom: 16px;
          animation: ring-pulse 1.5s infinite;
        }
        .success-illustration span {
          color: #059669;
          font-weight: 700;
          font-size: 14px;
        }
        @keyframes card-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ring-pulse {
          0% { transform: scale(0.96); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.2); }
          70% { transform: scale(1.04); box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.96); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @media (max-width: 1024px) {
          .visual-panel {
            display: none;
          }
          .form-panel {
            padding: 20px;
          }
        }
        @media (max-width: 768px) {
          .glass-login-card {
            padding: 32px 24px;
            border-radius: 24px;
          }
          .card-header img {
            width: 240px;
            margin-bottom: 16px;
          }
          .card-header h2 {
            font-size: 20px;
          }
          .submit-btn, .google-sign-btn {
            max-width: 100%;
          }
          .back-to-home-btn {
            top: 16px;
            right: 16px;
            padding: 6px 12px;
            font-size: 11px;
          }
        }
      `}} />

      <div className="split-container">
        <Link href="/" className="back-to-home-btn">
          <span>Go to Website</span>
        </Link>
        {/* Floating blurred ambient blobs */}
        <div className="ambient-blob-1" />
        <div className="ambient-blob-2" />
        <div className="ambient-blob-3" />

        {/* LEFT BRAND PANEL */}
        <div className="visual-panel">
          <div className="bg-pattern" />

          <div className="feature-showcase">
            <h1>Secure Customer Portal</h1>
            <p>
              Access your personal insurance dashboard to view live policies, review coverages, check claim progress, and request instant support.
            </p>
            <div className="feature-list">
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <FileCheck size={18} />
                </div>
                <div>
                  <h3>Instant Policy Repository</h3>
                  <p>All active insurance covers and terms organized in one single secure directory.</p>
                </div>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <BadgeCheck size={18} />
                </div>
                <div>
                  <h3>Direct Claim Coordination</h3>
                  <p>Track real-time status updates and submit document requests to our risk desk.</p>
                </div>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3>Client MPIN Security</h3>
                  <p>Encrypted data protection shields your account details from unauthorized queries.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="visual-footer">
            &copy; {new Date().getFullYear()} BIMAHEADQUARTER. Commercial Risk Consulting Desk.
          </div>
        </div>

        {/* RIGHT LOGIN CARD PANEL */}
        <div className="form-panel">
          <div className="glass-login-card">
            
            <div className="card-header">
              <img src="/brand/main-logo-wide.webp" alt="BIMAHEADQUARTER Logo" />
              <h2>Client Portal Login</h2>
              <p>
                {loginMode === "regular"
                  ? "Access coverages using your registered credentials"
                  : "Verify credentials to link your Google account"}
              </p>
            </div>

            {error && (
              <div className="alert-box error">
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert-box success">
                <ShieldCheck size={16} />
                <span>{success}</span>
              </div>
            )}

            {isVerified && (
              <div className="success-illustration" aria-hidden="true">
                <div className="success-ring">
                  <ShieldCheck size={32} />
                </div>
                <span>Verification Successful</span>
              </div>
            )}

            {!isVerified && (
              <>
                {/* STAGE 1: REGULAR LOGIN FORM */}
                {loginMode === "regular" && (
                  <form onSubmit={handleRegularSubmit} className="space-y-4">
                    <div className="input-group">
                      <span>Client ID</span>
                      <div className="input-container">
                        <Mail size={16} className="input-icon" />
                        <input
                          type="text"
                          placeholder="Enter your Client ID"
                          className="input-field"
                          value={regularCustomerId}
                          onChange={(e) => setRegularCustomerId(e.target.value)}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="input-group">
                      <span>Client MPIN</span>
                      <div className="input-container">
                        <KeyRound size={16} className="input-icon" />
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="Enter Client MPIN"
                          className="input-field"
                          value={regularMpin}
                          onChange={(e) => setRegularMpin(e.target.value)}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <button type="submit" className="submit-btn" disabled={loading}>
                      {loading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <LogIn size={16} />
                      )}
                      <span>{loading ? "Verifying..." : "Sign In"}</span>
                    </button>

                    <div className="divider">Or login with</div>

                    <button
                      type="button"
                      onClick={handleGoogleStart}
                      className="google-sign-btn"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          style={{ fill: "#4285f4" }}
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          style={{ fill: "#34a853" }}
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          style={{ fill: "#fbbc05" }}
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          style={{ fill: "#ea4335" }}
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                  </form>
                )}



                {/* STAGE 3: GOOGLE LINKING ID/MPIN */}
                {loginMode === "google" && googleStage === "verify_link" && (
                  <form onSubmit={handleVerifyLink} className="space-y-4">
                    <div className="info-pill">
                      The Google profile <strong className="text-slate-800">{googleEmail}</strong> needs to be linked to your BimaHeadquarter account.
                    </div>

                    <div className="input-group">
                      <span>Client ID</span>
                      <div className="input-container">
                        <Mail size={16} className="input-icon" />
                        <input
                          type="text"
                          placeholder="Enter your Client ID"
                          className="input-field"
                          value={customerId}
                          onChange={(e) => setCustomerId(e.target.value)}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="input-group">
                      <span>Client MPIN</span>
                      <div className="input-container">
                        <KeyRound size={16} className="input-icon" />
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="Enter Client MPIN"
                          className="input-field"
                          value={mpin}
                          onChange={(e) => setMpin(e.target.value)}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <button type="submit" className="submit-btn" disabled={loading}>
                      {loading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <ShieldCheck size={16} />
                      )}
                      <span>Link & Authenticate</span>
                    </button>

                    <div className="flex flex-col gap-1 items-center">
                      <button
                        type="button"
                        onClick={handleGoogleStart}
                        className="back-action-btn"
                      >
                        <ArrowLeft size={13} />
                        <span>Choose different Google Account</span>
                      </button>
                      <button
                        type="button"
                        onClick={resetFlow}
                        className="back-action-btn mt-1"
                      >
                        <ArrowLeft size={13} />
                        <span>Back to normal Sign In</span>
                      </button>
                    </div>
                  </form>
                )}


              </>
            )}

            <div className="card-footer">
              Credentials are issued by the BimaHeadquarter risk management desk.
            </div>

          </div>
        </div>
      </div>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
    </>
  );
}
