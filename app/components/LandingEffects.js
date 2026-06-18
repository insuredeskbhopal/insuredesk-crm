"use client";

import { useEffect } from "react";

export default function LandingEffects() {
  useEffect(() => {
    // Add page-specific body class
    document.body.classList.add("landing-page");

    // Scroll Reveal animations using IntersectionObserver
    const revealElements = document.querySelectorAll(".reveal");
    const revealObserver = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.1 },
    );
    revealElements.forEach((el) => revealObserver.observe(el));

    // Mouse Tracking for glassmorphism shimmer on hover
    const glassCards = document.querySelectorAll(".glass-card");
    const handleMouseMove = (e) => {
      const card = e.currentTarget;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Using both custom properties in case different classes reference different variables
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
      card.style.setProperty("--x", `${x}px`);
      card.style.setProperty("--y", `${y}px`);
    };

    glassCards.forEach((card) => {
      card.addEventListener("mousemove", handleMouseMove);
    });

    return () => {
      document.body.classList.remove("landing-page");
      revealObserver.disconnect();
      glassCards.forEach((card) => {
        card.removeEventListener("mousemove", handleMouseMove);
      });
    };
  }, []);

  return null;
}
