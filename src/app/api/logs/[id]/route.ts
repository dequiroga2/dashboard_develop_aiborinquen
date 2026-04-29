import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession, unauthorized, forbidden, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const log = await prisma.webhookLog.findUnique({
    where: { id: params.id },
    include: {
      demo: { select: { id: true, name: true, userId: true } },
      conversation: true,
    },
  });

  if (!log) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!isAdmin(session) && log.demo?.userId !== session.user.id) return forbidden();

  return NextResponse.json(log);
}
