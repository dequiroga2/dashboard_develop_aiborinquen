import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession, unauthorized, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { demoCreateSchema } from "@/schemas/demo.schema";

export async function GET() {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const where = isAdmin(session) ? {} : { userId: session.user.id };

  const demos = await prisma.demo.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, companyName: true } },
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { testers: true, conversations: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(demos);
}

export async function POST(req: NextRequest) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const body = await req.json();
  const parsed = demoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  // Verify client belongs to this user
  const client = await prisma.client.findUnique({ where: { id: parsed.data.clientId } });
  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  if (!isAdmin(session) && client.userId !== session.user.id) {
    return NextResponse.json({ error: "No puedes crear demos para este cliente" }, { status: 403 });
  }

  const { expiresAt, n8nWebhookUrl, ...rest } = parsed.data;

  const demo = await prisma.demo.create({
    data: {
      ...rest,
      userId: session.user.id,
      n8nWebhookUrl: n8nWebhookUrl || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json(demo, { status: 201 });
}
