"use client";

import { useState } from "react";

export default function BlogSidebarForm({ defaultService }) {
  const [formState, setFormState] = useState({
    name: "",
    phone: "",
    message: `I need consultation regarding ${defaultService || "Insurance"}.`
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formState.name || !formState.phone) {
      window.alert("Please provide name and phone number.");
      return;
    }
    setIsSubmitted(true);
    setFormState({
      name: "",
      phone: "",
      message: ""
    });
  };

  const handleChange = (e) => {
    setFormState((curr) => ({
      ...curr,
      [e.target.name]: e.target.value
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
          <button type="submit">
            Submit Request
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
      )}
    </div>
  );
}
