"use client";

import { useState } from "react";
import { ShieldCheck, Mail, Lock, KeyRound, AlertCircle, Loader2, LogIn, Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!accessCode || !email || !password) {
      setError("Office access code, email, and password are required.");
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
        throw new Error(data.error || "Something went wrong.");
      }

      setSuccess("Logged in successfully. Redirecting...");

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass-panel auth-card">
      <div className="auth-card-header">
        <h2>Office CRM Access</h2>
        <p>Private staff login for BIMAHEADQUARTER operations</p>
      </div>

      {error && (
        <div className="auth-alert error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="auth-alert success">
          <ShieldCheck size={16} />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <label className="input-group">
          <span>Office Access Code</span>
          <div className="input-with-icon">
            <KeyRound size={16} className="auth-icon" />
            <input
              type="password"
              placeholder="Enter office code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              required
              autoComplete="off"
              disabled={loading}
            />
          </div>
        </label>

        <label className="input-group">
          <span>Email Address</span>
          <div className="input-with-icon">
            <Mail size={16} className="auth-icon" />
            <input
              type="email"
              placeholder="staff@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </label>

        <label className="input-group">
          <span>Password</span>
          <div className="input-with-icon">
            <Lock size={16} className="auth-icon" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <button type="submit" className="primary-action auth-btn" disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />}
          <span>Enter CRM</span>
        </button>
      </form>

      <div className="auth-card-footer">
        Accounts and office codes are managed by the super admin only.
      </div>
    </section>
  );
}
