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
  const { content, senderType = "bot" } = body;
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

  const phone = conv.phone; // normalized (digits only, no +)
  const provider = conv.demo.provider;

  if (provider === "twilio") {
    await sendViaTwilio(phone, content);
  } else {
    await sendViaMeta(phone, content);
  }

  return NextResponse.json({ ok: true });
}

async function sendViaMeta(phone: string, text: string) {
  const token = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return;

  await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: text },
    }),
  });
}

async function sendViaTwilio(phone: string, text: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER; // e.g. "+17872939719"
  if (!accountSid || !authToken || !from) return;

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  // Phone from DB is digits only (e.g. "573203406072"), Twilio needs "whatsapp:+{phone}"
  const to = `whatsapp:+${phone}`;

  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({ From: `whatsapp:${from}`, To: to, Body: text }).toString(),
    }
  );
}
