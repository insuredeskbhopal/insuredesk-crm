"use client";

import { useEffect } from "react";

export default function LandingEffects() {
  useEffect(() => {
    document.body.classList.add("landing-page");

    // 1. Navigation scroll tracking for elevation and backdrop blur
    const mainNav = document.getElementById("mainNav");
    const handleNavScroll = () => {
      if (!mainNav) return;
      if (window.scrollY > 16) {
        mainNav.classList.add("scrolled");
      } else {
        mainNav.classList.remove("scrolled");
      }
    };
    window.addEventListener("scroll", handleNavScroll, { passive: true });
    handleNavScroll();

    // 2. Select elements that participate in scroll reveal
    const autoRevealSelectors = [
      ".landing-shell main > header:not(#hero)",
      ".landing-shell main > section",
      ".landing-shell .glass-card",
      ".landing-shell .service-card",
      ".landing-shell .sh-service-card",
      ".landing-shell .service-directory-card",
      ".landing-shell .contact-info-card",
      ".landing-shell .contact-form-card",
      ".landing-shell .blog-post-card",
      ".landing-shell .company-overview-item",
      ".landing-shell .claims-process-step",
      ".landing-shell .home-faq-card",
    ];

    const autoRevealElements = document.querySelectorAll(autoRevealSelectors.join(", "));
    autoRevealElements.forEach((element) => {
      if (!element.classList.contains("reveal") && !element.classList.contains("entry-anim")) {
        element.classList.add("landing-auto-reveal");
      }
    });

    // Add staggered cascade delays to sibling cards
    const gridContainers = document.querySelectorAll(
      ".services-grid, .sh-services-grid, .hero-stats-container, .company-overview-details, .claims-process-timeline, .contact-bottom-grid"
    );
    gridContainers.forEach((container) => {
      const children = container.querySelectorAll(".reveal, .landing-auto-reveal");
      children.forEach((child, index) => {
        const delay = Math.min((index % 6) * 70, 350);
        child.style.setProperty("--reveal-delay", `${delay}ms`);
      });
    });

    // 3. Scroll Reveal via IntersectionObserver with instant activation for visible items
    const revealElements = document.querySelectorAll(".reveal, .landing-auto-reveal");
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;

    const revealObserver = new window.IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
            obs.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    revealElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // If already in viewport on page load (above fold), reveal immediately
      if (rect.top < windowHeight - 20 && rect.bottom > 0) {
        el.classList.add("active");
      } else {
        revealObserver.observe(el);
      }
    });

    // 4. Interactive 3D Perspective Tilt & Specular Spotlight
    const interactiveCards = document.querySelectorAll(
      ".glass-card, .service-card, .sh-service-card, .leadership-card, .home-cta-action-card, .contact-action-panel, .blog-card"
    );
    const cardCleanups = [];

    interactiveCards.forEach((card) => {
      const handleMouseMove = (e) => {
        const rect = card.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const tiltX = ((x - centerX) / centerX).toFixed(3);
        const tiltY = ((y - centerY) / centerY).toFixed(3);

        card.style.setProperty("--x", `${x}px`);
        card.style.setProperty("--y", `${y}px`);
        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);
        card.style.setProperty("--tilt-x", tiltX);
        card.style.setProperty("--tilt-y", tiltY);
      };

      const handleMouseLeave = () => {
        card.style.setProperty("--tilt-x", "0");
        card.style.setProperty("--tilt-y", "0");
      };

      card.addEventListener("mousemove", handleMouseMove, { passive: true });
      card.addEventListener("mouseleave", handleMouseLeave, { passive: true });
      cardCleanups.push(() => {
        card.removeEventListener("mousemove", handleMouseMove);
        card.removeEventListener("mouseleave", handleMouseLeave);
      });
    });

    // 5. Smooth Hero Statistics Counter
    let counterAnimationFrames = [];
    const statElements = document.querySelectorAll(".hero-stat-value");
    let hasAnimatedStats = false;

    const parseStatValue = (text) => {
      // Examples: "25+", "10,000+", "₹50Cr+", "98.6%"
      const match = text.trim().match(/^([^0-9.]*)([0-9.,]+)(.*)$/);
      if (!match) return null;
      const prefix = match[1] || "";
      const rawNum = match[2].replace(/,/g, "");
      const suffix = match[3] || "";
      const num = parseFloat(rawNum);
      const isDecimal = rawNum.includes(".");
      const hasCommas = match[2].includes(",");
      return { prefix, num, suffix, isDecimal, hasCommas };
    };

    const animateStats = () => {
      if (hasAnimatedStats) return;
      hasAnimatedStats = true;

      statElements.forEach((el) => {
        const targetText = el.getAttribute("data-target-value") || el.textContent;
        const parsed = parseStatValue(targetText);
        if (!parsed || isNaN(parsed.num)) return;

        el.setAttribute("data-target-value", targetText);
        const startTime = performance.now();
        const duration = 1400; // ms

        const tick = (currentTime) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease-out cubic
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const currentVal = easeOut * parsed.num;

          let formattedNum;
          if (parsed.isDecimal) {
            formattedNum = currentVal.toFixed(1);
          } else if (parsed.hasCommas) {
            formattedNum = Math.floor(currentVal).toLocaleString("en-IN");
          } else {
            formattedNum = Math.floor(currentVal).toString();
          }

          el.textContent = `${parsed.prefix}${formattedNum}${parsed.suffix}`;

          if (progress < 1) {
            const id = requestAnimationFrame(tick);
            counterAnimationFrames.push(id);
          } else {
            el.textContent = targetText;
          }
        };

        const id = requestAnimationFrame(tick);
        counterAnimationFrames.push(id);
      });
    };

    const statsContainer = document.querySelector(".hero-stats-container");
    let statsObserver = null;
    if (statsContainer && statElements.length > 0) {
      statsObserver = new window.IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            animateStats();
            if (statsObserver) statsObserver.disconnect();
          }
        },
        { threshold: 0.2 }
      );
      statsObserver.observe(statsContainer);
    }

    return () => {
      document.body.classList.remove("landing-page");
      window.removeEventListener("scroll", handleNavScroll);
      revealObserver.disconnect();
      if (statsObserver) statsObserver.disconnect();
      counterAnimationFrames.forEach((id) => cancelAnimationFrame(id));
      cardCleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return null;
}

