import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession, unauthorized, forbidden, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const conv = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: { demo: true },
  });
  if (!conv) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!isAdmin(session) && conv.demo.userId !== session.user.id) return forbidden();

  const logs = await prisma.webhookLog.findMany({
    where: { conversationId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(logs);
}
