import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession, unauthorized, forbidden, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Allow n8n to save outbound messages using the webhook secret
  const secret = process.env.WEBHOOK_SECRET;
  const header = req.headers.get("x-demo-router-secret");
  if (secret && header !== secret) {
    const session = await getRequiredSession();
    if (!session) return unauthorized();
  }

  const body = await req.json();
  const { content, direction = "outbound", senderType = "bot" } = body;

  if (!content) return NextResponse.json({ error: "content requerido" }, { status: 400 });

  const conv = await prisma.conversation.findUnique({ where: { id: params.id } });
  if (!conv) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const message = await prisma.message.create({
    data: {
      conversationId: params.id,
      demoId: conv.demoId,
      direction,
      senderType,
      content,
    },
  });

  await prisma.conversation.update({
    where: { id: params.id },
    data: { lastMessage: content, lastMessageAt: new Date() },
  });

  return NextResponse.json(message);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const conv = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: { demo: true },
  });
  if (!conv) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!isAdmin(session) && conv.demo.userId !== session.user.id) return forbidden();

  const deleted = await prisma.message.deleteMany({ where: { conversationId: params.id } });
  await prisma.conversation.update({
    where: { id: params.id },
    data: { lastMessage: null, lastMessageAt: null },
  });

  return NextResponse.json({ ok: true, deleted: deleted.count });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const conv = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: { demo: true },
  });
  if (!conv) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!isAdmin(session) && conv.demo.userId !== session.user.id) return forbidden();

  const after = req.nextUrl.searchParams.get("after");

  const messages = await prisma.message.findMany({
    where: {
      conversationId: params.id,
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}
