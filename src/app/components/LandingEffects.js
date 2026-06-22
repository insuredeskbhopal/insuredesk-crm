"use client";

import { useEffect } from "react";

export default function LandingEffects() {
  useEffect(() => {
    // Add page-specific body class
    document.body.classList.add("landing-page");

    const autoRevealSelectors = [
      ".landing-shell main > header",
      ".landing-shell main > section",
      ".landing-shell .glass-card",
      ".landing-shell .service-card",
      ".landing-shell .service-directory-card",
      ".landing-shell .contact-info-card",
      ".landing-shell .contact-form-card",
      ".landing-shell .blog-post-card",
      ".landing-shell .public-footer",
    ];

    const autoRevealElements = document.querySelectorAll(autoRevealSelectors.join(", "));
    autoRevealElements.forEach((element, index) => {
      if (!element.classList.contains("reveal") && !element.classList.contains("entry-anim")) {
        element.classList.add("landing-auto-reveal");
        element.style.setProperty("--reveal-delay", `${Math.min(index * 35, 180)}ms`);
      }
    });

    // Scroll Reveal animations using IntersectionObserver
    const revealElements = document.querySelectorAll(".reveal, .landing-auto-reveal");
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

    // Partner Insurers counter animation
    let counterTimer;
    const counterEl = document.getElementById("partners-counter");
    if (counterEl) {
      let count = 1;
      const target = 10;
      counterEl.textContent = "+1";
      const duration = 1000;
      const stepTime = Math.floor(duration / target);
      
      counterTimer = window.setInterval(() => {
        count++;
        if (count >= target) {
          counterEl.textContent = "+" + target;
          window.clearInterval(counterTimer);
        } else {
          counterEl.textContent = "+" + count;
        }
      }, stepTime);
    }

    return () => {
      document.body.classList.remove("landing-page");
      revealObserver.disconnect();
      autoRevealElements.forEach((element) => {
        element.classList.remove("landing-auto-reveal", "active");
        element.style.removeProperty("--reveal-delay");
      });
      glassCards.forEach((card) => {
        card.removeEventListener("mousemove", handleMouseMove);
      });
      if (counterTimer) {
        window.clearInterval(counterTimer);
      }
    };
  }, []);

  return null;
}
