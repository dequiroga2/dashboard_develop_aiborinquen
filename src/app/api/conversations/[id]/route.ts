import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession, unauthorized, forbidden, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function getConvOrForbid(id: string, session: any) {
  const conv = await prisma.conversation.findUnique({
    where: { id },
    include: { demo: true },
  });
  if (!conv) return null;
  if (!isAdmin(session) && conv.demo.userId !== session.user.id) return "forbidden";
  return conv;
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const conv = await getConvOrForbid(params.id, session);
  if (!conv) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (conv === "forbidden") return forbidden();

  const full = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      demo: {
        include: {
          client: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      tester: true,
    },
  });

  return NextResponse.json(full);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const conv = await getConvOrForbid(params.id, session);
  if (!conv) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (conv === "forbidden") return forbidden();

  const { status } = await req.json();
  if (!["open", "closed", "blocked"].includes(status)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 422 });
  }

  const updated = await prisma.conversation.update({
    where: { id: params.id },
    data: { status },
  });

  return NextResponse.json(updated);
}
