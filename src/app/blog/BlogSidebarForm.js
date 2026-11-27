"use client";

import { useState } from "react";

export default function BlogSidebarForm({ defaultService }) {
  const [formState, setFormState] = useState({
    name: "",
    phone: "",
    message: `I need consultation regarding ${defaultService || "Insurance"}.`,
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (!formState.name.trim() || !formState.phone.trim()) {
      setErrorMessage("Please provide name and phone number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formState,
          service: defaultService || "Blog Consultation",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to submit request right now. Please try again.");
      }
      setIsSubmitted(true);
      setFormState({
        name: "",
        phone: "",
        message: "",
      });
    } catch (error) {
      setErrorMessage(error?.message || "Unable to submit request right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setErrorMessage("");
    setFormState((curr) => ({
      ...curr,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="blog-sidebar-cta">
      <h3>Need Expert Advice?</h3>
      <p>Request a free consultation regarding {defaultService || "insurance consulting"}.</p>

      {isSubmitted ? (
        <div className="blog-sidebar-success">
          <span className="material-symbols-outlined">check_circle</span>
          <h4>Request Received</h4>
          <p>We will contact you shortly.</p>
          <button type="button" onClick={() => setIsSubmitted(false)}>
            Send Another Request
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label>
            <span>Name *</span>
            <input
              type="text"
              name="name"
              placeholder="Your full name"
              value={formState.name}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            <span>Phone *</span>
            <input
              type="text"
              name="phone"
              placeholder="10-digit phone number"
              value={formState.phone}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            <span>Message</span>
            <textarea
              name="message"
              placeholder="Your question..."
              rows={3}
              value={formState.message}
              onChange={handleChange}
            />
          </label>
          {errorMessage ? (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-800"
            >
              {errorMessage}
            </div>
          ) : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Request"}
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
      )}
    </div>
  );
}
