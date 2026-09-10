"use client";

import { useState, useEffect } from "react";

const RATING_LABELS = {
  1: "Needs improvement",
  2: "Fair",
  3: "Helpful",
  4: "Very helpful",
  5: "Exceptional guide!",
};

function StarSvg({ filled = false, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "#f59e0b" : "#e2e8f0"}
      stroke={filled ? "#d97706" : "#cbd5e1"}
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="star-svg"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export default function ArticleRatingWidget({
  slug,
  ratingValue = "4.8",
  ratingCount = "105",
}) {
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`blog_rating_${slug}`);
      if (saved) {
        setUserRating(Number(saved));
        setHasVoted(true);
      }
    } catch {
      // Ignore localStorage restrictions
    }
  }, [slug]);

  const handleRate = (val) => {
    setUserRating(val);
    setHasVoted(true);
    try {
      window.localStorage.setItem(`blog_rating_${slug}`, String(val));
    } catch {
      // Ignore localStorage restrictions
    }
  };

  const handleResetVote = () => {
    setHasVoted(false);
    setUserRating(0);
    try {
      window.localStorage.removeItem(`blog_rating_${slug}`);
    } catch {
      // Ignore localStorage restrictions
    }
  };

  const activeLabel = hoverRating ? RATING_LABELS[hoverRating] : null;

  return (
    <section
      className="article-rating-widget"
      itemProp="aggregateRating"
      itemScope
      itemType="https://schema.org/AggregateRating"
      aria-label="Reader Rating and Feedback"
    >
      {/* Schema.org Microdata for Google Search Engine */}
      <meta itemProp="bestRating" content="5" />
      <meta itemProp="worstRating" content="1" />
      <meta itemProp="ratingValue" content={ratingValue} />
      <meta itemProp="ratingCount" content={ratingCount} />
      <meta itemProp="reviewCount" content={ratingCount} />

      {/* Top Trust Eyebrow */}
      <div className="rating-widget-eyebrow">
        <span className="rating-trust-pill">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Reader Trust Score
        </span>
      </div>

      <div className="rating-widget-grid">
        {/* Left Side: Score & Review Summary */}
        <div className="rating-primary-stats">
          <div className="rating-score-display">
            <span className="score-big">{ratingValue}</span>
            <span className="score-denom">/ 5</span>
          </div>

          <div className="rating-meta-column">
            <div
              className="rating-stars-row"
              aria-label={`Rated ${ratingValue} out of 5 stars`}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <StarSvg key={star} filled={true} size={16} />
              ))}
            </div>
            <div className="rating-proof-text">
              Based on <strong>{ratingCount} verified ratings</strong>
              <span className="rating-separator">·</span>
              <span className="helpful-tag">98% helpful</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="rating-widget-divider" />

        {/* Right Side: Interactive Rating or Voted Card */}
        <div className="rating-interactive-action">
          {hasVoted ? (
            <div className="rating-success-banner" role="status">
              <div className="success-icon-badge">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="success-text">
                <div className="success-line-1">
                  <strong>Thank you for your rating!</strong>
                  <button
                    type="button"
                    className="re-rate-btn"
                    onClick={handleResetVote}
                    title="Change your rating"
                  >
                    Change
                  </button>
                </div>
                <span className="success-line-2">
                  You rated this guide {userRating} out of 5 stars.
                </span>
              </div>
            </div>
          ) : (
            <div className="rating-prompt-wrapper">
              <div className="prompt-header">
                <span className="prompt-title">How helpful was this guide?</span>
                <span
                  className={`prompt-hover-label ${activeLabel ? "is-active" : ""}`}
                  aria-live="polite"
                >
                  {activeLabel || "Rate article"}
                </span>
              </div>

              <div
                className="interactive-star-group"
                role="radiogroup"
                aria-label="Rate this article from 1 to 5 stars"
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= (hoverRating || userRating);
                  return (
                    <button
                      key={star}
                      type="button"
                      className={`star-tap-btn ${isFilled ? "filled" : ""}`}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => handleRate(star)}
                      aria-label={`Rate ${star} out of 5 stars`}
                    >
                      <StarSvg filled={isFilled} size={22} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
