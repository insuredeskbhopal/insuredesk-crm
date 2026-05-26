"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Mail, Lock, User, AlertCircle, Loader2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Something went wrong.");
      }

      setSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="glass-panel auth-card">
      <div className="auth-card-header">
        <h2>Create an account</h2>
        <p>Get started with BIMAHEADQUARTER enterprise portal</p>
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
          <span>Full Name</span>
          <div className="input-with-icon">
            <User size={16} className="auth-icon" />
            <input
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
        </label>

        <label className="input-group">
          <span>Email Address *</span>
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
          <span>Password *</span>
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

        <label className="input-group">
          <span>Confirm Password *</span>
          <div className="input-with-icon">
            <Lock size={16} className="auth-icon" />
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </label>

        <button type="submit" className="primary-action auth-btn" disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
          <span>Sign Up</span>
        </button>
      </form>

      <div className="auth-card-footer">
        Already have an account? <Link href="/login">Log In</Link>
      </div>
    </section>
  );
}
