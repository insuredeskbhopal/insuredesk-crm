import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const BASE_STORAGE_DIR = process.env.VERCEL
  ? path.join("/tmp", "storage", "reviews")
  : path.join(process.cwd(), "storage", "reviews");
const EVENTS_FILE = path.join(BASE_STORAGE_DIR, "events.jsonl");
const FEEDBACK_FILE = path.join(BASE_STORAGE_DIR, "feedback.jsonl");

let dirReadyPromise = null;

async function ensureStorageDir() {
  if (!dirReadyPromise) {
    dirReadyPromise = fs.mkdir(BASE_STORAGE_DIR, { recursive: true }).catch((err) => {
      console.error("[Review Storage] Failed to ensure directory:", err);
      dirReadyPromise = null;
      throw err;
    });
  }
  return dirReadyPromise;
}

/**
 * Anonymize client IP using SHA256 with a salt
 */
export function hashIp(ip) {
  if (!ip) return "unknown";
  const salt = process.env.JWT_SECRET || "bimaheadquarter-review-salt";
  return crypto.createHash("sha256").update(String(ip) + salt).digest("hex").slice(0, 16);
}

/**
 * Record an isolated analytics event to append-only JSONL
 */
export async function recordReviewEvent(event) {
  try {
    await ensureStorageDir();
    const payload = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: String(event.eventType || "unknown").slice(0, 50),
      campaign: event.campaign ? String(event.campaign).slice(0, 50) : null,
      source: event.source ? String(event.source).slice(0, 50) : null,
      channel: event.channel ? String(event.channel).slice(0, 50) : null,
      lang: event.lang === "hi" ? "hi" : "en",
      ipHash: event.ipHash || "unknown",
      userAgent: event.userAgent ? String(event.userAgent).slice(0, 200) : null,
      metadata: event.metadata || {},
    };

    const line = JSON.stringify(payload) + "\n";
    await fs.appendFile(EVENTS_FILE, line, "utf8");
    return { success: true, id: payload.id };
  } catch (err) {
    console.error("[Review Storage] Failed to record event:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Save private client feedback to isolated storage
 */
export async function savePrivateFeedback(feedback) {
  try {
    await ensureStorageDir();
    const payload = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      rating: Number(feedback.rating) || null,
      name: feedback.name ? String(feedback.name).trim().slice(0, 100) : null,
      contact: feedback.contact ? String(feedback.contact).trim().slice(0, 100) : null,
      message: String(feedback.message || "").trim().slice(0, 2000),
      consent: Boolean(feedback.consent),
      campaign: feedback.campaign ? String(feedback.campaign).slice(0, 50) : null,
      source: feedback.source ? String(feedback.source).slice(0, 50) : null,
      ipHash: feedback.ipHash || "unknown",
      userAgent: feedback.userAgent ? String(feedback.userAgent).slice(0, 200) : null,
    };

    const line = JSON.stringify(payload) + "\n";
    await fs.appendFile(FEEDBACK_FILE, line, "utf8");

    // Proactively notify CRM via Prisma Notification if available
    try {
      const { prisma } = await import("@/lib/db/prisma");
      if (prisma && prisma.notification) {
        await prisma.notification.create({
          data: {
            title: `New Customer Feedback (${payload.rating ? `${payload.rating}★` : "Direct Note"})`,
            message: `Feedback received from ${payload.name || "Anonymous Client"}: "${payload.message.slice(0, 120)}${payload.message.length > 120 ? "..." : ""}"`,
            category: "CUSTOMER",
            severity: payload.rating && payload.rating <= 2 ? "WARNING" : "INFO",
            module: "customer-feedback",
            sourceKey: `feedback-${payload.id}`,
            metadata: {
              feedbackId: payload.id,
              rating: payload.rating,
              contact: payload.contact,
              consent: payload.consent,
            },
          },
        }).catch((notifErr) => {
          // Non-fatal if notification table has specific constraints
          console.warn("[Review Storage] CRM Notification non-fatal fallback:", notifErr?.message);
        });
      }
    } catch {
      // Ignore Prisma import issues
    }

    return { success: true, id: payload.id };
  } catch (err) {
    console.error("[Review Storage] Failed to save feedback:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Read and aggregate review analytics from isolated JSONL files
 */
export async function getReviewAnalyticsData() {
  await ensureStorageDir();

  const events = [];
  try {
    const rawEvents = await fs.readFile(EVENTS_FILE, "utf8");
    const lines = rawEvents.split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        events.push(JSON.parse(line));
      } catch {
        // Skip corrupted lines
      }
    }
  } catch (err) {
    if (err.code !== "ENOENT") console.warn("[Review Storage] Could not read events file:", err.message);
  }

  const feedbackList = [];
  try {
    const rawFeedback = await fs.readFile(FEEDBACK_FILE, "utf8");
    const lines = rawFeedback.split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        feedbackList.push(JSON.parse(line));
      } catch {
        // Skip corrupted lines
      }
    }
  } catch (err) {
    if (err.code !== "ENOENT") console.warn("[Review Storage] Could not read feedback file:", err.message);
  }

  // Aggregate metrics
  let totalVisits = 0;
  let googleClicks = 0;
  let redirectShortcuts = 0;
  let qrVisits = 0;
  let whatsappVisits = 0;
  const uniqueVisitors = new Set();
  const sourceBreakdown = {};
  const dailyTrendsMap = {};

  for (const ev of events) {
    const dateKey = ev.timestamp ? ev.timestamp.slice(0, 10) : "unknown";
    if (!dailyTrendsMap[dateKey]) {
      dailyTrendsMap[dateKey] = { date: dateKey, visits: 0, googleClicks: 0, redirects: 0 };
    }

    if (ev.ipHash && ev.ipHash !== "unknown") {
      uniqueVisitors.add(ev.ipHash);
    }

    if (ev.eventType === "review_page_view") {
      totalVisits++;
      dailyTrendsMap[dateKey].visits++;

      const src = ev.source || ev.channel || "direct";
      sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;

      if (src.includes("qr") || ev.metadata?.src === "qr") qrVisits++;
      if (src.includes("whatsapp") || ev.metadata?.src === "whatsapp") whatsappVisits++;
    } else if (ev.eventType === "review_google_click") {
      googleClicks++;
      dailyTrendsMap[dateKey].googleClicks++;
    } else if (ev.eventType === "review_shortlink_redirect") {
      redirectShortcuts++;
      dailyTrendsMap[dateKey].redirects++;
    }
  }

  const clickThroughRate = totalVisits > 0 ? Number(((googleClicks / totalVisits) * 100).toFixed(1)) : 0;

  const dailyTrends = Object.values(dailyTrendsMap).sort((a, b) => a.date.localeCompare(b.date));

  // Sort feedback by newest first
  feedbackList.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));

  return {
    metrics: {
      totalVisits,
      approxUniqueVisits: uniqueVisitors.size,
      googleClicks,
      clickThroughRate,
      redirectShortcuts,
      qrVisits,
      whatsappVisits,
      privateFeedbackCount: feedbackList.length,
      note: "Google clicks track visitors proceeding to Google's review form. Google does not publish a verification webhook for off-site completed reviews.",
    },
    sourceBreakdown,
    dailyTrends,
    recentFeedback: feedbackList.slice(0, 50),
  };
}
