import { NextRequest, NextResponse } from "next/server";
import { routeInboundMessage } from "@/lib/demo-router";

export const dynamic = "force-dynamic";

function twiml(message: string) {
  const escaped = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new NextResponse(xml, { headers: { "Content-Type": "text/xml" } });
}

export async function POST(req: NextRequest) {
  const text = await req.text();
  const params = new URLSearchParams(text);

  const from = params.get("From") || "";          // "whatsapp:+573203406072"
  const body = params.get("Body") || "";
  const numMedia = parseInt(params.get("NumMedia") || "0", 10);
  const mediaUrl = params.get("MediaUrl0") || null;
  const mediaType = params.get("MediaContentType0") || null;

  // Strip "whatsapp:" prefix and keep the + for routing
  const phone = from.replace(/^whatsapp:/i, "");

  if (!phone) return twiml("");

  let messageType = "text";
  let media = null;
  if (numMedia > 0 && mediaUrl) {
    if (mediaType?.startsWith("image/")) messageType = "image";
    else if (mediaType?.startsWith("audio/")) messageType = "audio";
    else if (mediaType?.startsWith("video/")) messageType = "video";
    else messageType = "document";
    media = { id: mediaUrl, mimeType: mediaType, sha256: null, filename: null };
  }

  const rawPayload = Object.fromEntries(params.entries()) as Record<string, unknown>;

  const result = await routeInboundMessage({
    phone,
    text: body,
    channel: "whatsapp",
    provider: "twilio",
    messageType: messageType as any,
    media,
    rawPayload,
  });

  // Async (n8n handles reply) — return empty TwiML so Twilio doesn't retry
  if (!result.reply) return twiml("");

  // Sync reply (unauthorized, inactive, error)
  return twiml(result.reply);
}
