import { sendContactQueryEmail } from "@/lib/email/mailer";

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone, email, service, message } = body;

    if (!name || !phone || !message) {
      return Response.json(
        { success: false, error: "Missing required fields: name, phone, and message are required." },
        { status: 400 }
      );
    }

    const result = await sendContactQueryEmail({ name, phone, email, service, message });
    if (!result.sent) {
      return Response.json(
        { success: false, error: result.reason || "Failed to send email notification" },
        { status: 500 }
      );
    }

    return Response.json({ success: true, message: "Consultation query received and notified successfully." });
  } catch (error) {
    console.error("Failed to process contact query:", error);
    return Response.json(
      { success: false, error: error?.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
