import { prisma } from "./prisma";
import { normalizePhone } from "./normalize";
import { Channel, Prisma } from "@prisma/client";

type Json = Prisma.InputJsonValue;

const UNAUTHORIZED_MSG =
  process.env.DEFAULT_UNAUTHORIZED_MESSAGE ||
  "Hola. Este número está habilitado solo para pruebas autorizadas. Por favor contacta al equipo que te compartió la demo.";

const INACTIVE_MSG =
  process.env.DEFAULT_INACTIVE_DEMO_MESSAGE ||
  "Esta demo no está activa en este momento.";

const N8N_ERROR_MSG =
  process.env.DEFAULT_N8N_ERROR_MESSAGE ||
  "En este momento la demo no está disponible. Por favor intenta nuevamente más tarde.";

function toJson(v: unknown): Json {
  return JSON.parse(JSON.stringify(v)) as Json;
}

export interface MediaInfo {
  id: string;
  mimeType: string | null;
  sha256: string | null;
  filename: string | null;
}

export interface InboundMessage {
  phone: string;
  text: string;
  channel: "whatsapp" | "sms";
  provider: string;
  messageType?: string;
  media?: MediaInfo | null;
  rawPayload: Record<string, unknown>;
}

export interface RouteResult {
  reply: string;
  status: "success" | "error" | "unauthorized" | "inactive_demo";
  demoId?: string;
  conversationId?: string;
  responseTimeMs?: number;
  errorMessage?: string;
}

function mediaLabel(type?: string, media?: MediaInfo | null): string {
  switch (type) {
    case "image":    return "🖼️ Imagen";
    case "audio":    return "🎵 Audio";
    case "video":    return "🎬 Video";
    case "sticker":  return "😄 Sticker";
    case "document": return media?.filename ? `📄 ${media.filename}` : "📄 Documento";
    case "location": return "📍 Ubicación";
    default:         return "📎 Archivo adjunto";
  }
}

export async function routeInboundMessage(msg: InboundMessage): Promise<RouteResult> {
  const normalized = normalizePhone(msg.phone);
  const rawJson = toJson(msg.rawPayload);
  const normalizedJson = toJson({ phone: normalized, text: msg.text, channel: msg.channel });

  // Find active tester
  const tester = await prisma.authorizedTester.findFirst({
    where: { normalizedPhone: normalized, active: true },
    include: {
      demo: {
        include: {
          client: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!tester) {
    await prisma.webhookLog.create({
      data: {
        provider: msg.provider,
        inboundPayload: rawJson,
        normalizedPayload: normalizedJson,
        status: "unauthorized",
      },
    });
    return { reply: UNAUTHORIZED_MSG, status: "unauthorized" };
  }

  const { demo } = tester;

  if (demo.status !== "active") {
    await prisma.webhookLog.create({
      data: {
        demoId: demo.id,
        provider: msg.provider,
        inboundPayload: rawJson,
        normalizedPayload: normalizedJson,
        status: "inactive_demo",
      },
    });
    return { reply: INACTIVE_MSG, status: "inactive_demo", demoId: demo.id };
  }

  // Find or create conversation
  const conversation = await prisma.conversation.upsert({
    where: {
      demoId_testerId_phone_channel: {
        demoId: demo.id,
        testerId: tester.id,
        phone: normalized,
        channel: msg.channel as Channel,
      },
    },
    update: { status: "open" },
    create: {
      demoId: demo.id,
      testerId: tester.id,
      phone: normalized,
      channel: msg.channel as Channel,
      status: "open",
    },
  });

  const displayContent = msg.text || mediaLabel(msg.messageType, msg.media);

  // Save inbound message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      demoId: demo.id,
      direction: "inbound",
      senderType: "user",
      content: displayContent,
      rawPayload: rawJson,
    },
  });

  // Update conversation last message
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessage: displayContent, lastMessageAt: new Date() },
  });

  if (!demo.n8nWebhookUrl) {
    const errMsg = "Webhook de n8n no configurado.";
    await prisma.webhookLog.create({
      data: {
        demoId: demo.id,
        conversationId: conversation.id,
        provider: msg.provider,
        inboundPayload: rawJson,
        normalizedPayload: normalizedJson,
        status: "error",
        errorMessage: errMsg,
      },
    });
    return { reply: N8N_ERROR_MSG, status: "error", demoId: demo.id, conversationId: conversation.id, errorMessage: errMsg };
  }

  // Build n8n payload
  const n8nPayloadObj = {
    demo_id: demo.id,
    client_id: demo.client.id,
    client_name: demo.client.name,
    demo_name: demo.name,
    bot_name: demo.botName,
    developer: { id: demo.user.id, name: demo.user.name, email: demo.user.email },
    tester: { id: tester.id, name: tester.name, phone: tester.phone, role: tester.role as string },
    conversation: { id: conversation.id, channel: msg.channel, status: "open" },
    message: {
      text: msg.text,
      type: msg.messageType || "text",
      direction: "inbound",
      timestamp: new Date().toISOString(),
      media: msg.media ?? null,
    },
    metadata: { provider: msg.provider, raw_payload: msg.rawPayload },
  };
  const n8nPayloadJson = toJson(n8nPayloadObj);

  const start = Date.now();
  let reply = N8N_ERROR_MSG;
  let n8nResponseJson: Json | null = null;
  let logStatus: "success" | "error" = "error";
  let errorMessage: string | undefined;

  try {
    const res = await fetch(demo.n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nPayloadObj),
      signal: AbortSignal.timeout(25000),
    });

    const responseTimeMs = Date.now() - start;

    if (!res.ok) {
      errorMessage = `n8n respondió con status ${res.status}`;
    } else {
      const json = await res.json();
      n8nResponseJson = toJson(json);
      if (json?.reply) {
        reply = json.reply;
        logStatus = "success";
      } else if (json?.async === true) {
        // n8n procesará y enviará la respuesta directamente a Meta
        reply = "";
        logStatus = "success";
      } else {
        errorMessage = "n8n no devolvió el campo 'reply'";
      }
    }

    if (logStatus === "success" && reply) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          demoId: demo.id,
          direction: "outbound",
          senderType: "bot",
          content: reply,
        },
      });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessage: reply, lastMessageAt: new Date() },
      });
    }

    await prisma.webhookLog.create({
      data: {
        demoId: demo.id,
        conversationId: conversation.id,
        provider: msg.provider,
        inboundPayload: rawJson,
        normalizedPayload: normalizedJson,
        n8nPayload: n8nPayloadJson,
        n8nResponse: n8nResponseJson ?? Prisma.JsonNull,
        status: logStatus,
        errorMessage: errorMessage ?? null,
        responseTimeMs,
      },
    });

    return { reply, status: logStatus, demoId: demo.id, conversationId: conversation.id, responseTimeMs, errorMessage };
  } catch (err: any) {
    const responseTimeMs = Date.now() - start;
    errorMessage = err?.message || "Error desconocido";

    await prisma.webhookLog.create({
      data: {
        demoId: demo.id,
        conversationId: conversation.id,
        provider: msg.provider,
        inboundPayload: rawJson,
        normalizedPayload: normalizedJson,
        n8nPayload: n8nPayloadJson,
        status: "error",
        errorMessage,
        responseTimeMs,
      },
    });

    return { reply: N8N_ERROR_MSG, status: "error", demoId: demo.id, conversationId: conversation.id, responseTimeMs, errorMessage };
  }
}
