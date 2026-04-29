import { NextRequest, NextResponse } from "next/server";
import { routeInboundMessage } from "@/lib/demo-router";

export const dynamic = "force-dynamic";

// Meta webhook verification (GET)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN || "demo-router-2024";

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden", received: { mode, token, verifyToken } }, { status: 403 });
}

// Send reply via Meta WhatsApp API
async function sendMetaReply(to: string, text: string) {
  const token = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) return;

  await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
}

export type MessageType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "sticker"
  | "location"
  | "contacts"
  | "button"
  | "interactive"
  | "unknown";

export interface MediaInfo {
  id: string;
  mimeType: string | null;
  sha256: string | null;
  filename: string | null;
}

export interface MetaExtracted {
  phone: string;
  text: string;
  isStatus: boolean;
  messageType: MessageType;
  media: MediaInfo | null;
}

// Parse Meta WhatsApp payload
function extractFromMeta(body: any): MetaExtracted {
  const empty: MetaExtracted = { phone: "", text: "", isStatus: false, messageType: "unknown", media: null };
  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    // Ignore status updates (delivered, read, sent)
    if (value?.statuses) return { ...empty, isStatus: true };

    const message = value?.messages?.[0];
    if (!message) return empty;

    const phone: string = message.from || "";
    const rawType: string = message.type || "unknown";
    const messageType = rawType as MessageType;

    // Extract text from text messages, button replies, or interactive replies
    let text = "";
    if (rawType === "text") text = message.text?.body || "";
    else if (rawType === "button") text = message.button?.text || message.button?.payload || "";
    else if (rawType === "interactive") {
      const ir = message.interactive;
      text = ir?.button_reply?.title || ir?.list_reply?.title || ir?.nfm_reply?.response_json || "";
    }

    // Extract media metadata for non-text types
    let media: MediaInfo | null = null;
    const mediaObj = message[rawType];
    if (mediaObj && rawType !== "text" && rawType !== "button" && rawType !== "interactive" && rawType !== "location" && rawType !== "contacts") {
      media = {
        id: mediaObj.id || "",
        mimeType: mediaObj.mime_type || null,
        sha256: mediaObj.sha256 || null,
        filename: mediaObj.filename || null,
      };
    }

    return { phone, text, isStatus: false, messageType, media };
  } catch {
    return empty;
  }
}

function verifySecret(req: NextRequest): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true;
  const header = req.headers.get("x-demo-router-secret");
  return header === secret;
}

function extractFromGenericJson(body: any) {
  return {
    phone: body.from || body.phone || body.From || body.sender || "",
    text: body.text || body.message || body.Body || body.body || body.content || "",
    channel: (body.channel || body.Channel || "whatsapp") as "whatsapp" | "sms",
    provider: body.provider || "other",
  };
}

export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawPayload: Record<string, unknown> = {};

  try {
    rawPayload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Detect Meta format by checking for entry/changes structure
  const isMeta = Array.isArray(rawPayload.entry);

  if (isMeta) {
    const { phone, text, isStatus, messageType, media } = extractFromMeta(rawPayload);

    // Ignore delivery/read status updates silently
    if (isStatus) return NextResponse.json({ ok: true });

    if (!phone) return NextResponse.json({ ok: true });

    // Allow non-text messages through (text may be empty for media)
    const result = await routeInboundMessage({
      phone,
      text,
      channel: "whatsapp",
      provider: "meta",
      messageType,
      media,
      rawPayload,
    });

    // Only send if reply is non-empty (empty = n8n is handling async)
    if (result.reply) {
      await sendMetaReply(phone, result.reply);
    }

    return NextResponse.json({ ok: true });
  }

  // Generic format (for testing with curl/Postman)
  const { phone, text, channel, provider } = extractFromGenericJson(rawPayload);

  if (!phone || !text) {
    return NextResponse.json({ error: "Missing required fields: phone, text" }, { status: 400 });
  }

  const result = await routeInboundMessage({ phone, text, channel, provider, rawPayload });

  return NextResponse.json({ reply: result.reply, status: result.status });
}
