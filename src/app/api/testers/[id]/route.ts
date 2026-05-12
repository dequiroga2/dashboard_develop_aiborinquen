import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession, unauthorized, forbidden, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { testerUpdateSchema } from "@/schemas/tester.schema";
import { normalizePhone } from "@/lib/normalize";

async function getTesterOrForbid(id: string, session: any) {
  const tester = await prisma.authorizedTester.findUnique({
    where: { id },
    include: { demo: true },
  });
  if (!tester) return null;
  if (!isAdmin(session) && tester.demo.userId !== session.user.id) return "forbidden";
  return tester;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const tester = await getTesterOrForbid(params.id, session);
  if (!tester) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (tester === "forbidden") return forbidden();

  const body = await req.json();
  const parsed = testerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data: any = { ...parsed.data };
  if (parsed.data.phone) {
    data.normalizedPhone = normalizePhone(parsed.data.phone);
  }

  const updated = await prisma.authorizedTester.update({ where: { id: params.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const tester = await getTesterOrForbid(params.id, session);
  if (!tester) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (tester === "forbidden") return forbidden();

  // Delete messages → webhook logs → conversations before deleting tester (FK constraints)
  const conversations = await prisma.conversation.findMany({
    where: { testerId: params.id },
    select: { id: true },
  });
  const convIds = conversations.map((c) => c.id);

  if (convIds.length > 0) {
    await prisma.message.deleteMany({ where: { conversationId: { in: convIds } } });
    await prisma.webhookLog.updateMany({ where: { conversationId: { in: convIds } }, data: { conversationId: null } });
    await prisma.conversation.deleteMany({ where: { id: { in: convIds } } });
  }

  await prisma.authorizedTester.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
