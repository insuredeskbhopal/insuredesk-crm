import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyJWT } from "@/lib/auth";

export const runtime = "nodejs";

const DEFAULT_TEMPLATES = {
  birthday_wish: {
    body: "Dear {{customerName}},\n\nWishing you a very Happy Birthday! 🎂 May this year bring you joy, health, and prosperity.\n\nBest regards,\n{{companyName}}",
    mediaUrl: "",
    mediaType: "IMAGE",
  },
  renewal_reminder: {
    body: "Dear {{customerName}},\n\nYour {{policyType}} (Policy No: {{policyNumber}}) with {{companyName}} is due for renewal on {{expiryDate}} ({{daysLeft}}).\n\nPlease connect with us to ensure continuous coverage.\n\nRegards,\n{{companyName}}",
    mediaUrl: "",
    mediaType: "IMAGE",
  },
  claim_update: {
    body: "Dear {{customerName}},\n\nWe would like to update you on your claim (No: {{policyNumber}}). Current status is: Processing.\n\nWe will keep you informed on further updates.\n\nRegards,\n{{companyName}}",
    mediaUrl: "",
    mediaType: "PDF",
  },
  policy_document: {
    body: "Dear {{customerName}},\n\nPlease find attached your policy document for policy no: {{policyNumber}} ({{policyType}}).\n\nThank you for choosing us.\n\nRegards,\n{{companyName}}",
    mediaUrl: "",
    mediaType: "PDF",
  },
  festival_greeting: {
    body: "Dear {{customerName}},\n\nWishing you and your family a very happy and prosperous festival! 🌟 May this season bring warmth and happiness.\n\nWarm regards,\n{{companyName}}",
    mediaUrl: "",
    mediaType: "IMAGE",
  },
};

async function requireSession(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) return { errorResponse: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const session = await verifyJWT(token);
  if (!session) {
    return { errorResponse: NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }) };
  }
  return session;
}

export async function GET(request) {
  try {
    const session = await requireSession(request);
    if (session.errorResponse) return session.errorResponse;

    const orgId = session.organizationId || null;
    const isSuperAdmin = session.role === "SUPER_ADMIN";
    if (!orgId && !isSuperAdmin) {
      return NextResponse.json({ error: "Organization scope is required" }, { status: 400 });
    }

    // Fetch existing custom templates
    const dbTemplates = await prisma.whatsAppTemplate.findMany({
      where: { organizationId: orgId },
    });

    const dbMap = {};
    dbTemplates.forEach((t) => {
      dbMap[t.name] = t;
    });

    // Merge custom and default templates
    const templates = Object.keys(DEFAULT_TEMPLATES).map((name) => {
      const dbTemplate = dbMap[name];
      return {
        id: dbTemplate?.id || null,
        name,
        body: dbTemplate ? dbTemplate.body : DEFAULT_TEMPLATES[name].body,
        mediaUrl: dbTemplate ? dbTemplate.mediaUrl : DEFAULT_TEMPLATES[name].mediaUrl,
        mediaType: dbTemplate ? dbTemplate.mediaType : DEFAULT_TEMPLATES[name].mediaType,
        isCustom: !!dbTemplate,
      };
    });

    return NextResponse.json({ success: true, templates });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load templates" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await requireSession(request);
    if (session.errorResponse) return session.errorResponse;

    if (session.role === "VIEWER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const orgId = session.organizationId || null;
    const isSuperAdmin = session.role === "SUPER_ADMIN";
    if (!orgId && !isSuperAdmin) {
      return NextResponse.json({ error: "Organization scope is required" }, { status: 400 });
    }

    const body = await request.json();
    const { name, bodyText, mediaUrl, mediaType } = body;

    if (!name || !DEFAULT_TEMPLATES[name]) {
      return NextResponse.json({ error: "Invalid template name" }, { status: 400 });
    }

    // Safe lookup and update/create to avoid PostgreSQL compound unique index limitations on null columns
    const existing = await prisma.whatsAppTemplate.findFirst({
      where: {
        organizationId: orgId,
        name,
      },
    });

    let template;
    if (existing) {
      template = await prisma.whatsAppTemplate.update({
        where: { id: existing.id },
        data: {
          body: bodyText,
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
        },
      });
    } else {
      template = await prisma.whatsAppTemplate.create({
        data: {
          organizationId: orgId,
          name,
          body: bodyText,
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
        },
      });
    }

    return NextResponse.json({ success: true, template });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to save template" },
      { status: 500 }
    );
  }
}
