"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Mail, Lock, AlertCircle, Loader2, LogIn, Eye, EyeOff } from "lucide-react";



const GoogleIcon = () => (
  <svg className="google-icon-svg" viewBox="0 0 24 24">
    <path
      fill="#EA4335"
      d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.336 0 3.332 2.69 1.395 6.618L5.266 9.765z"
    />
    <path
      fill="#34A853"
      d="M16.04 15.34C15.01 16.09 13.62 16.54 12 16.54a4.54 4.54 0 0 1-4.32-3.14l-3.95 3.06C5.69 20.35 8.57 22 12 22c3.27 0 6.03-1.07 8.01-2.91l-3.97-3.75z"
    />
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.43h6.49c-.28 1.48-1.12 2.74-2.4 3.58l3.97 3.75c2.31-2.13 3.63-5.26 3.63-9.17z"
    />
    <path
      fill="#FBBC05"
      d="M7.68 13.4a4.545 4.545 0 0 1 0-2.8l-3.95-3.07a7.078 7.078 0 0 0 0 8.94l3.95-3.07z"
    />
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new window.URLSearchParams(window.location.search);
      const errorParam = params.get("error");
      if (errorParam) {
        const errorMap = {
          missing_auth_code: "Google Authorization code was missing.",
          token_exchange_failed: "Failed to exchange authorization token with Google.",
          profile_retrieval_failed: "Failed to retrieve user profile information from Google.",
          account_deactivated: "Your BIMAHEADQUARTER account is deactivated.",
          internal_server_error: "An internal server error occurred during Google sign-in."
        };
        setError(errorMap[errorParam] || "Google authentication failed.");
      }
    }
  }, []);

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
        window.location.href = "/dashboard";
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const res = await fetch("/api/auth/google/url");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to initiate Google sign-in.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setGoogleLoading(false);
    }
  };

  return (
    <section className="glass-panel auth-card">
      <div className="auth-card-header">
        <h2>Welcome back</h2>
        <p>Log in to access your BIMAHEADQUARTER account</p>
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
              disabled={loading || googleLoading}
            />
          </div>
        </label>
        <label className="input-group">
          <span>Password</span>
          <div className="input-with-icon">
            <Lock size={16} className="auth-icon" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading || googleLoading}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading || googleLoading}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>



        <button type="submit" className="primary-action auth-btn" disabled={loading || googleLoading}>
          {loading ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />}
          <span>Log In</span>
        </button>
      </form>

      <div className="auth-separator">or continue with</div>

      <button 
        type="button" 
        onClick={handleGoogleLogin} 
        className="google-auth-btn" 
        disabled={loading || googleLoading}
      >
        {googleLoading ? <Loader2 size={16} className="spin" /> : <GoogleIcon />}
        <span>Sign in with Google</span>
      </button>

      <div className="auth-card-footer">
        Don't have an account? <Link href="/signup">Sign Up</Link>
      </div>
    </section>
  );
}
