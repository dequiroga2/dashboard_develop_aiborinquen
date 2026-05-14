import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession, unauthorized } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/** Send an outbound message via the demo's provider (Meta or Twilio) and save it. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Allow n8n to call this using the webhook secret (same pattern as /messages)
  const secret = process.env.WEBHOOK_SECRET;
  const header = req.headers.get("x-demo-router-secret");
  if (secret && header !== secret) {
    const session = await getRequiredSession();
    if (!session) return unauthorized();
  }

  const body = await req.json();
  const { content, senderType = "bot", mediaUrl, mediaType } = body;
  if (!content) return NextResponse.json({ error: "content requerido" }, { status: 400 });

  const conv = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: { demo: true },
  });
  if (!conv) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Save outbound message
  await prisma.message.create({
    data: {
      conversationId: conv.id,
      demoId: conv.demoId,
      direction: "outbound",
      senderType,
      content,
    },
  });
  await prisma.conversation.update({
    where: { id: conv.id },
    data: { lastMessage: content, lastMessageAt: new Date() },
  });

  const phone = conv.phone;
  const provider = conv.demo.provider;

  if (provider === "twilio") {
    await sendViaTwilio(phone, content, mediaUrl ?? undefined);
  } else {
    if (mediaUrl) {
      await sendMetaMedia(phone, mediaUrl, mediaType ?? null, content);
    } else {
      await sendViaMeta(phone, content);
    }
  }

  return NextResponse.json({ ok: true });
}

// ── Meta: send plain text ──────────────────────────────────────────────────
async function sendViaMeta(phone: string, text: string) {
  const token = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return;

  await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: text } }),
  });
}

// ── Meta: download file → upload to Meta → send ───────────────────────────
async function sendMetaMedia(phone: string, fileUrl: string, mimeType: string | null, caption: string) {
  const token = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return;

  // Download the file
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) return;
  const blob = await fileRes.blob();
  const detectedMime = mimeType || blob.type || "application/octet-stream";

  // Upload to Meta
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", detectedMime);
  form.append("file", blob, "file");

  const uploadRes = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!uploadRes.ok) return;
  const { id: mediaId } = await uploadRes.json();

  const isImage = detectedMime.startsWith("image/");
  const msgBody = isImage
    ? { messaging_product: "whatsapp", to: phone, type: "image", image: { id: mediaId, caption } }
    : { messaging_product: "whatsapp", to: phone, type: "document", document: { id: mediaId, caption, filename: "archivo" } };

  await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(msgBody),
  });
}

// ── Twilio: send text (+ optional media URL) ───────────────────────────────
async function sendViaTwilio(phone: string, text: string, mediaUrl?: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!accountSid || !authToken || !from) return;

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const to = `whatsapp:+${phone}`;

  const params: Record<string, string> = {
    From: `whatsapp:${from}`,
    To: to,
    Body: text,
  };
  // Twilio fetches the file directly from the public URL (e.g. Google Drive)
  if (mediaUrl) params.MediaUrl0 = mediaUrl;

  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${auth}` },
    body: new URLSearchParams(params).toString(),
  });
}
