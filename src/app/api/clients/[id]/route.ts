import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession, unauthorized, forbidden, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { clientUpdateSchema } from "@/schemas/client.schema";

async function getClientOrForbid(id: string, session: any) {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) return null;
  if (!isAdmin(session) && client.userId !== session.user.id) return "forbidden";
  return client;
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const client = await getClientOrForbid(params.id, session);
  if (!client) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (client === "forbidden") return forbidden();

  const full = await prisma.client.findUnique({
    where: { id: params.id },
    include: { demos: { include: { _count: { select: { conversations: true } } } } },
  });

  return NextResponse.json(full);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const client = await getClientOrForbid(params.id, session);
  if (!client) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (client === "forbidden") return forbidden();

  const body = await req.json();
  const parsed = clientUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const updated = await prisma.client.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const client = await getClientOrForbid(params.id, session);
  if (!client) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (client === "forbidden") return forbidden();

  await prisma.client.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
