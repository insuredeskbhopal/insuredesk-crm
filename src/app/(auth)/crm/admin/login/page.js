"use client";

import { useState } from "react";
import { ShieldCheck, User, Lock, AlertCircle, Loader2, LogIn, Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isVerified = Boolean(success);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("User ID and password are required.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Something went wrong.");
      }

      setSuccess("Logged in successfully. Redirecting...");

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`glass-panel auth-card${isVerified ? " auth-card-verified" : ""}`}>
      <div className="auth-card-header">
        <div className="auth-mark" aria-hidden="true">
          {isVerified ? <ShieldCheck size={28} /> : <LogIn size={28} />}
        </div>
        <h2>CRM Login</h2>
        <p>Private staff login for Bima Headquarter operations</p>
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

      {isVerified && (
        <div className="auth-success-stage" aria-hidden="true">
          <div className="auth-success-ring">
            <ShieldCheck size={34} />
          </div>
          <span>Access verified</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <label className="input-group">
          <span>User ID</span>
          <div className="input-with-icon">
            <User size={16} className="auth-icon" />
            <input
              type="email"
              placeholder="Enter user ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || isVerified}
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
              disabled={loading || isVerified}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading || isVerified}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <button type="submit" className="primary-action auth-btn" disabled={loading || isVerified}>
          {loading ? (
            <Loader2 size={16} className="spin" />
          ) : isVerified ? (
            <ShieldCheck size={16} />
          ) : (
            <LogIn size={16} />
          )}
          <span>{isVerified ? "Verified" : "Enter CRM"}</span>
        </button>
      </form>

      <div className="auth-card-footer">Accounts are managed by the super admin only.</div>
    </section>
  );
}
