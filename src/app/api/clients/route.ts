import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession, unauthorized, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { clientCreateSchema } from "@/schemas/client.schema";

export async function GET() {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const where = isAdmin(session) ? {} : { userId: session.user.id };

  const clients = await prisma.client.findMany({
    where,
    include: { _count: { select: { demos: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const body = await req.json();
  const parsed = clientCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const client = await prisma.client.create({
    data: { ...parsed.data, userId: session.user.id },
  });

  return NextResponse.json(client, { status: 201 });
}
