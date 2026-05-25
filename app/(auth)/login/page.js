"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Mail, Lock, AlertCircle, Loader2, LogIn } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Something went wrong.");
      }

      setSuccess("Logged in successfully! Redirecting...");
      
      setTimeout(() => {
        // Redirect using window.location to trigger a clean page state re-evaluation in middleware
        window.location.href = "/dashboard";
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass-panel auth-card">
      <div className="auth-card-header">
        <h2>Welcome back</h2>
        <p>Log in to access your InsurCRM account</p>
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
          <span>Email Address</span>
          <div className="input-with-icon">
            <Mail size={16} className="auth-icon" />
            <input
              type="email"
              placeholder="name@company.com"
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
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </label>

        <button type="submit" className="primary-action auth-btn" disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />}
          <span>Log In</span>
        </button>
      </form>

      <div className="auth-card-footer">
        Don't have an account? <Link href="/signup">Sign Up</Link>
      </div>
    </section>
  );
}
