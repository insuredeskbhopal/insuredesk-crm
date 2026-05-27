"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Mail, Lock, AlertCircle, Loader2, LogIn, Eye, EyeOff, Terminal, ShieldAlert } from "lucide-react";

export default function AdminLoginPage() {
  const [accessCode, setAccessCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [step, setStep] = useState(1); // 1 = access code terminal, 2 = fake loading logs, 3 = email/password form
  const [logs, setLogs] = useState([]);
  const [headerClicks, setHeaderClicks] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [metadata, setMetadata] = useState({ ip: "10.12.84.10", ua: "", loc: "BHOPAL HUB - OFFICE VLAN" });

  // Load client info on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setMetadata({
        ip: "10.12.84." + Math.floor(Math.random() * 254 + 1),
        ua: window.navigator.userAgent.substring(0, 60),
        loc: "BHOPAL HUB - OFFICE VLAN"
      });
    }

    // Keyboard shortcut bypass: Ctrl+Shift+L
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "L") {
        e.preventDefault();
        triggerBypass();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const triggerBypass = () => {
    setAccessCode("BIMA-OFFICE-2026");
    handleCodeVerification("BIMA-OFFICE-2026");
  };

  const handleHeaderClick = () => {
    const clicks = headerClicks + 1;
    setHeaderClicks(clicks);
    if (clicks >= 3) {
      triggerBypass();
      setHeaderClicks(0);
    }
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!accessCode.trim()) {
      setError("Clearance passcode required.");
      return;
    }
    handleCodeVerification(accessCode.trim());
  };

  const handleCodeVerification = (code) => {
    if (code === "BIMA-OFFICE-2026") {
      setError("");
      setStep(2);
      playLoadingLogs();
    } else {
      setError("CRITICAL: ACCESS TOKEN REJECTED. ATTEMPT LOGGED.");
    }
  };

  const playLoadingLogs = () => {
    const logList = [
      { text: "> INITIALIZING INTRANET CLEARANCE BYPASS...", delay: 100 },
      { text: "> CONNECTING TO CENTRAL OFFICE SERVER... CONNECTED", delay: 350 },
      { text: "> VERIFYING ENCRYPTION SYMMETRIC KEYS... OK", delay: 600 },
      { text: "> DETECTING NODE SECURITY SHIELD... ACTIVE", delay: 850 },
      { text: "> LOADING PORTAL AUTHENTICATION INSTANCE...", delay: 1100 },
      { text: "> DECRYPTION STAGE COMPLETE. RENDER USER AUTH INTERFACE...", delay: 1350 }
    ];

    logList.forEach((log) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, log.text]);
      }, log.delay);
    });

    setTimeout(() => {
      setStep(3);
    }, 1500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, accessCode })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login authorization failed.");
      }

      setSuccess("Logged in successfully. Welcome back to Headquarters.");

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="terminal-wrapper min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-mono select-none">
      
      {/* Scanline and glowing terminal theme css */}
      <style dangerouslySetInnerHTML={{ __html: `
        .terminal-wrapper {
          background-color: #020617 !important;
          color: #22c55e !important;
        }

        .terminal-wrapper * {
          color: inherit !important;
        }

        .terminal-wrapper svg,
        .terminal-wrapper [class*="icon"],
        .terminal-wrapper [class^="icon"],
        .terminal-wrapper .icon {
            color: inherit !important;
        }

        /* Prevent globals.css buttons overrides */
        .terminal-wrapper button {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            box-shadow: none !important;
            animation: none !important;
            transform: none !important;
            transition: all 0.2s !important;
            border-radius: 0.25rem !important;
            background-color: transparent !important;
            color: #22c55e !important;
            border: 1px solid #22c55e !important;
        }

        .terminal-wrapper button:hover:not(:disabled) {
            background-color: rgba(34, 197, 94, 0.1) !important;
            color: #22c55e !important;
            border: 1px solid #22c55e !important;
            box-shadow: 0 0 10px rgba(34, 197, 94, 0.3) !important;
        }

        .terminal-wrapper button.password-toggle {
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            min-height: 0 !important;
        }
        .terminal-wrapper button.password-toggle:hover {
            box-shadow: none !important;
            background: transparent !important;
        }

        .terminal-container {
          box-shadow: 0 0 35px rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          background-color: #030712 !important;
        }

        .terminal-input::placeholder {
          color: rgba(34, 197, 94, 0.4) !important;
        }

        .terminal-scanline {
          position: absolute;
          inset: 0;
          height: 100%;
          width: 100%;
          background: linear-gradient(
            rgba(18, 16, 16, 0) 50%,
            rgba(0, 0, 0, 0.25) 50%
          );
          background-size: 100% 4px;
          z-index: 10;
          pointer-events: none;
        }

        .terminal-scanline::after {
          content: " ";
          display: block;
          position: absolute;
          top: 0; left: 0; bottom: 0; right: 0;
          background: transparent;
          animation: scanlineScroll 6s linear infinite;
          background: linear-gradient(
            to bottom,
            rgba(34, 197, 94, 0) 0%,
            rgba(34, 197, 94, 0.08) 10%,
            rgba(34, 197, 94, 0) 20%
          );
          z-index: 11;
          pointer-events: none;
        }

        @keyframes scanlineScroll {
          0% { top: -100%; }
          100% { top: 100%; }
        }

        .cursor-blink {
          animation: blink 1s step-end infinite;
        }

        @keyframes blink {
          from, to { color: transparent }
          50% { color: #22c55e }
        }

        .crt-effect {
          animation: crtFlicker 0.15s infinite;
        }

        .terminal-btn {
          border: 1px solid #22c55e;
          background: transparent;
          transition: all 0.2s;
        }

        .terminal-btn:hover:not(:disabled) {
          background: rgba(34, 197, 94, 0.1) !important;
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
        }

        .terminal-btn:active:not(:disabled) {
          transform: scale(0.97);
        }

        .glow-text {
          text-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
        }

        .glow-text-red {
          color: #ef4444 !important;
          text-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
        }

        .error-border {
          border-color: rgba(239, 68, 68, 0.5) !important;
          box-shadow: 0 0 25px rgba(239, 68, 68, 0.1) !important;
        }

        .terminal-input-field {
          background: rgba(2, 6, 23, 0.8) !important;
          border: 1px solid rgba(34, 197, 94, 0.4);
        }

        .terminal-input-field:focus {
          border-color: #22c55e !important;
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.3) !important;
          outline: none;
        }

        .hint-hover {
          opacity: 0.15;
          transition: opacity 0.3s;
        }

        .hint-hover:hover {
          opacity: 0.8;
        }
      ` }} />

      <div className="terminal-scanline"></div>

      {/* Main Intranet Panel Container */}
      <div className={`terminal-container w-full max-w-lg p-8 rounded-lg z-20 transition-all duration-500 relative ${error ? "error-border" : ""}`}>
        
        {/* Terminal Header */}
        <div className="border-b border-green-500/20 pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer select-none"
              onClick={handleHeaderClick}
            >
              <Terminal className="w-5 h-5 glow-text" />
              <span className="font-bold tracking-widest glow-text">BIMA-HQ NET v1.0.42</span>
            </div>
            <div className="flex items-center gap-2 text-xs opacity-60">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span>SECURE GATEWAY</span>
            </div>
          </div>
          <p className="text-[11px] opacity-50 mt-1">NODE: {metadata.ip} | REGION: {metadata.loc}</p>
        </div>

        {/* Step 1: Access Passcode Input */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-green-500/5 border border-green-500/10 p-4 rounded text-xs leading-relaxed space-y-2 opacity-80">
              <p className="font-semibold flex items-center gap-1.5 glow-text">
                <ShieldAlert className="w-4 h-4 text-green-500" />
                SECURITY PROTOCOL ENFORCED:
              </p>
              <p>THIS NETWORK PORTAL IS RESERVED FOR BIMAHEADQUARTER INTERNAL CRM OPERATIONS. AUTHORIZED STAFF CLEARANCE IS MANDATORY.</p>
              <p>UNAUTHORIZED ACCESS ATTEMPTS WILL BE INSTANTLY LOGGED AND IP ROUTED TO SEC-COMPLIANCE TEAM.</p>
            </div>

            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider block opacity-75 font-semibold">
                  ENTER STAFF BYPASS CODE:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 opacity-75">$</span>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    required
                    className="terminal-input-field w-full pl-8 pr-4 py-2.5 rounded font-mono text-sm tracking-widest text-green-500 terminal-input"
                    autoComplete="off"
                  />
                </div>
              </div>

              {error && (
                <div className="text-xs leading-relaxed font-bold animate-pulse text-red-500 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="glow-text-red">{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="terminal-btn w-full py-3 rounded text-sm font-bold tracking-wider hover:cursor-pointer flex items-center justify-center gap-2"
              >
                <span>VERIFY CLEARANCE</span>
                <span className="cursor-blink">_</span>
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Decryption / Connection Logs */}
        {step === 2 && (
          <div className="space-y-3 min-h-[160px] flex flex-col justify-center">
            <div className="font-mono text-xs space-y-2">
              {logs.map((log, index) => (
                <p key={index} className="glow-text tracking-wide">{log}</p>
              ))}
              <div className="flex items-center gap-1.5 pt-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                <p className="italic opacity-60">Working...</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Staff Login (Email & Password Form) */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="border border-green-500/20 bg-green-500/5 p-4 rounded text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-400">STAFF IDENTIFIED // CLEARANCE ACCEPTED</p>
                <p className="opacity-70 mt-0.5">Please authorize your session credentials below to enter the CRM.</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="glow-text-red">{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded text-xs flex items-center gap-2 animate-bounce">
                <ShieldCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="glow-text">{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider block opacity-75 font-semibold">
                  Staff Email:
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 opacity-50" />
                  <input
                    type="email"
                    placeholder="staff@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="terminal-input-field w-full pl-10 pr-4 py-2 rounded text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider block opacity-75 font-semibold">
                  Password:
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 opacity-50" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="terminal-input-field w-full pl-10 pr-10 py-2 rounded text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-3 top-2.5 opacity-50 hover:opacity-100 bg-transparent p-0 border-0 min-h-0"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="terminal-btn w-full py-3 rounded text-sm font-bold tracking-wider hover:cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AUTHORIZING...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 animate-pulse" />
                    <span>ESTABLISH SESSION</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Console Footer */}
        <div className="border-t border-green-500/10 mt-6 pt-4 text-center">
          <p className="text-[10px] opacity-45 uppercase">
            ESTABLISHED ENCRYPTED CHANNEL // INTRANET INTERNAL PORTAL
          </p>
        </div>
      </div>

      {/* Subtle system bypass helper at the bottom */}
      <div className="hint-hover text-[10px] opacity-15 mt-8 max-w-sm text-center tracking-wider text-green-500/60 transition-opacity">
        [INT-HLP] HOVER FOR GATEWAY BYPASS DIRECTIVE
        <div className="mt-1 font-bold text-[9px] uppercase hidden group-hover:block bg-green-500/5 p-1 rounded">
          Clearance Code: <span className="underline select-text">BIMA-OFFICE-2026</span> (or press Ctrl+Shift+L / triple click header)
        </div>
      </div>
      
      {/* Dynamic JS logic for hover helper since standard group classes are tailwind specific and might load late */}
      <script dangerouslySetInnerHTML={{ __html: `
        const hint = document.querySelector('.hint-hover');
        if (hint) {
          hint.addEventListener('mouseenter', () => {
            hint.innerHTML = '[INT-HLP] CODE: BIMA-OFFICE-2026 // CTRL+SHIFT+L OR TRIPLE-CLICK LOGO TO BYPASS';
            hint.style.opacity = '0.8';
          });
          hint.addEventListener('mouseleave', () => {
            hint.innerHTML = '[INT-HLP] HOVER FOR GATEWAY BYPASS DIRECTIVE';
            hint.style.opacity = '0.15';
          });
        }
      ` }} />
    </div>
  );
}
