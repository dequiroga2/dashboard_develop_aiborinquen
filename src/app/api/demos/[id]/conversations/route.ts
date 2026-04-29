import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession, unauthorized, forbidden, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const demo = await prisma.demo.findUnique({ where: { id: params.id } });
  if (!demo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!isAdmin(session) && demo.userId !== session.user.id) return forbidden();

  const conversations = await prisma.conversation.findMany({
    where: { demoId: params.id },
    include: {
      tester: { select: { id: true, name: true, phone: true, role: true } },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  return NextResponse.json(conversations);
}
