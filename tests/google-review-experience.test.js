import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_GOOGLE_REVIEW_URL,
  BRAND_CONFIG,
  WHATSAPP_REVIEW_TEMPLATE_HINDI,
  TRANSLATIONS,
} from "@/lib/review/config";
import {
  recordReviewEvent,
  savePrivateFeedback,
  getReviewAnalyticsData,
  hashIp,
} from "@/lib/review/storage";
import { checkSharedRateLimit } from "@/lib/review/rate-limit";
import { GET as handleRedirect } from "@/app/r/route";
import { POST as handleTrack } from "@/app/api/review/track/route";
import { POST as handleFeedback } from "@/app/api/review/feedback/route";
import { GET as handleQr } from "@/app/api/review/qr/route";
import fs from "fs/promises";
import path from "path";

describe("Google Review Experience & Branded Link System", () => {
  const testStorageDir = path.join(process.cwd(), "storage", "reviews");
  const testEventsFile = path.join(testStorageDir, "events.jsonl");
  const testFeedbackFile = path.join(testStorageDir, "feedback.jsonl");

  describe("1. Business Configuration & Security Settings", () => {
    it("should have official Google Review URL pointing to Bhopal Place ID", () => {
      expect(DEFAULT_GOOGLE_REVIEW_URL).toBe(
        "https://search.google.com/local/writereview?placeid=ChIJBXaYqcFDfDkRp3Af8Z-9HV0"
      );
      expect(DEFAULT_GOOGLE_REVIEW_URL).toContain("ChIJBXaYqcFDfDkRp3Af8Z-9HV0");
    });

    it("should match legal entity and brand identity", () => {
      expect(BRAND_CONFIG.brandName).toBe("Bima Headquarter");
      expect(BRAND_CONFIG.legalEntity).toBe("Insuredesk IMF Pvt. Ltd.");
      expect(BRAND_CONFIG.tagline).toBe("Sahi Salah • Sahi Policy • Sahi Protection");
      expect(BRAND_CONFIG.location).toContain("Bhopal");
    });

    it("should provide exact ready-to-use Hindi WhatsApp message template", () => {
      expect(WHATSAPP_REVIEW_TEMPLATE_HINDI).toContain("Bima Headquarter पर भरोसा करने के लिए आपका धन्यवाद।");
      expect(WHATSAPP_REVIEW_TEMPLATE_HINDI).toContain("अपना रिव्यू यहां दें:");
      expect(WHATSAPP_REVIEW_TEMPLATE_HINDI).toContain("https://bimaheadquarter.com/review");
    });

    it("should verify complete bilingual translation dictionary", () => {
      expect(TRANSLATIONS.en.mainHeading).toBe("Your Trust Matters to Us");
      expect(TRANSLATIONS.hi.mainHeading).toBe("आपका भरोसा हमारे लिए बहुत मायने रखता है");
      expect(TRANSLATIONS.en.googleButtonCta).toBe("Write a Google Review");
      expect(TRANSLATIONS.hi.googleButtonCta).toBe("गूगल पर अपना रिव्यू दें");

      // Verify clear non-gating disclaimer in both languages
      expect(TRANSLATIONS.en.starsNotice).toContain("not posted to Google");
      expect(TRANSLATIONS.hi.starsNotice).toContain("सीधे गूगल पर पोस्ट नहीं होता है");
    });
  });

  describe("2. Isolated File Storage & Analytics Aggregation", () => {
    it("should hash client IP without exposing raw address", () => {
      const hash1 = hashIp("192.168.1.100");
      const hash2 = hashIp("192.168.1.100");
      const hash3 = hashIp("10.0.0.1");

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1).not.toContain("192.168.1.100");
    });

    it("should record analytics events into isolated events.jsonl", async () => {
      const uniqueCampaign = `test_camp_${Date.now()}`;
      const res = await recordReviewEvent({
        eventType: "review_page_view",
        campaign: uniqueCampaign,
        source: "qr",
        channel: "qr",
        lang: "hi",
        ipHash: "testhash123",
      });

      expect(res.success).toBe(true);
      expect(res.id).toBeDefined();

      const analytics = await getReviewAnalyticsData();
      expect(analytics.metrics.totalVisits).toBeGreaterThanOrEqual(1);
      expect(analytics.sourceBreakdown.qr).toBeGreaterThanOrEqual(1);
    });

    it("should save private client feedback into isolated feedback.jsonl", async () => {
      const testMsg = `Great advice on commercial insurance ${Date.now()}`;
      const res = await savePrivateFeedback({
        rating: 5,
        name: "Test Client",
        contact: "9826012345",
        message: testMsg,
        consent: true,
        campaign: "test_delivery",
      });

      expect(res.success).toBe(true);
      expect(res.id).toBeDefined();

      const analytics = await getReviewAnalyticsData();
      const saved = analytics.recentFeedback.find((f) => f.id === res.id);
      expect(saved).toBeDefined();
      expect(saved.message).toBe(testMsg);
      expect(saved.rating).toBe(5);
      expect(saved.consent).toBe(true);
    });

    it("should accurately compute CTR and clarify that clicks are not confirmed reviews", async () => {
      const analytics = await getReviewAnalyticsData();
      expect(typeof analytics.metrics.clickThroughRate).toBe("number");
      expect(analytics.metrics.note).toContain("Google does not publish a verification webhook");
    });
  });

  describe("3. Production-Safe Shared Rate Limiting", () => {
    it("should allow requests under the limit and throttle excess requests", async () => {
      const testIp = `test_ip_${Date.now()}`;
      const action = "feedback_test";
      const maxRequests = 3;
      const windowSec = 10;

      const r1 = await checkSharedRateLimit(testIp, action, maxRequests, windowSec);
      const r2 = await checkSharedRateLimit(testIp, action, maxRequests, windowSec);
      const r3 = await checkSharedRateLimit(testIp, action, maxRequests, windowSec);
      const r4 = await checkSharedRateLimit(testIp, action, maxRequests, windowSec);

      expect(r1.allowed).toBe(true);
      expect(r2.allowed).toBe(true);
      expect(r3.allowed).toBe(true);
      expect(r4.allowed).toBe(false);
      expect(r4.resetInSeconds).toBeGreaterThan(0);
    });
  });

  describe("4. Shortcut Redirect Route /r", () => {
    it("should return HTTP 307 temporary redirect to trusted Google URL", async () => {
      const req = new Request("http://localhost:3000/r?c=delivery&src=whatsapp", {
        headers: { "user-agent": "VitestAgent", "x-forwarded-for": "127.0.0.1" },
      });

      const response = await handleRedirect(req);
      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toBe(DEFAULT_GOOGLE_REVIEW_URL);
      expect(response.headers.get("Cache-Control")).toContain("no-cache");
    });

    it("should strictly reject arbitrary redirect destinations supplied by user", async () => {
      const req = new Request("http://localhost:3000/r?redirect=https://malicious-site.com", {
        headers: { "user-agent": "VitestAgent" },
      });

      const response = await handleRedirect(req);
      expect(response.headers.get("Location")).toBe(DEFAULT_GOOGLE_REVIEW_URL);
      expect(response.headers.get("Location")).not.toContain("malicious");
    });
  });

  describe("5. QR Code Generation API /api/review/qr", () => {
    it("should generate valid scalable SVG QR code", async () => {
      const req = new Request("http://localhost:3000/api/review/qr?format=svg&c=office_desk");
      const res = await handleQr(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("image/svg+xml");
      const svgText = await res.text();
      expect(svgText).toContain("<svg");
      expect(svgText).toContain("</svg>");
    });

    it("should generate valid PNG QR code buffer", async () => {
      const req = new Request("http://localhost:3000/api/review/qr?format=png&c=policy_kit");
      const res = await handleQr(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");
      const buffer = await res.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(100);
    });
  });

  describe("6. Private Feedback API /api/review/feedback", () => {
    it("should silently trap bot submissions with honeypot field", async () => {
      const req = new Request("http://localhost:3000/api/review/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": `bot_${Date.now()}` },
        body: JSON.stringify({
          name: "Bot User",
          message: "Buy cheap crypto now",
          honeypot: "http://spam.com",
        }),
      });

      const res = await handleFeedback(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      // Feedback was NOT saved with an ID
      expect(json.feedbackId).toBeUndefined();
    });

    it("should reject submissions with messages shorter than 5 characters", async () => {
      const req = new Request("http://localhost:3000/api/review/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": `short_${Date.now()}` },
        body: JSON.stringify({
          name: "Client",
          message: "Hi",
        }),
      });

      const res = await handleFeedback(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("should accept valid customer feedback and return confirmation", async () => {
      const req = new Request("http://localhost:3000/api/review/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": `valid_${Date.now()}` },
        body: JSON.stringify({
          name: "Sunil Verma",
          contact: "9826011111",
          message: "Prompt claim settlement assistance for our corporate warehouse.",
          rating: 5,
          consent: true,
          campaign: "corporate_claim",
        }),
      });

      const res = await handleFeedback(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.feedbackId).toBeDefined();
    });
  });

  describe("7. Public Security & Routing Isolation", () => {
    it("should not expose internal CRM paths on public review landing page", async () => {
      const clientContent = await fs.readFile(
        path.join(process.cwd(), "src", "app", "review", "ReviewPageClient.js"),
        "utf8"
      );
      expect(clientContent).not.toContain("/crm/");
      expect(clientContent).not.toContain("/crm/admin/login");
      expect(clientContent).not.toContain("/admin/users");
      expect(clientContent).not.toContain("/dashboard");
    });
  });
});
