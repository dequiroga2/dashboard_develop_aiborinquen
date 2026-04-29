import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession, unauthorized, forbidden, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { demoUpdateSchema } from "@/schemas/demo.schema";

async function getDemoOrForbid(id: string, session: any) {
  const demo = await prisma.demo.findUnique({ where: { id } });
  if (!demo) return null;
  if (!isAdmin(session) && demo.userId !== session.user.id) return "forbidden";
  return demo;
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const demo = await getDemoOrForbid(params.id, session);
  if (!demo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (demo === "forbidden") return forbidden();

  const full = await prisma.demo.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { testers: true, conversations: true } },
    },
  });

  return NextResponse.json(full);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const demo = await getDemoOrForbid(params.id, session);
  if (!demo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (demo === "forbidden") return forbidden();

  const body = await req.json();
  const parsed = demoUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { expiresAt, n8nWebhookUrl, ...rest } = parsed.data;

  const updated = await prisma.demo.update({
    where: { id: params.id },
    data: {
      ...rest,
      n8nWebhookUrl: n8nWebhookUrl === "" ? null : n8nWebhookUrl,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const demo = await getDemoOrForbid(params.id, session);
  if (!demo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (demo === "forbidden") return forbidden();

  await prisma.demo.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
