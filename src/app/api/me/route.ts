import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession, unauthorized } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, n8nApiKey: true },
  });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const body = await req.json();
  const { n8nApiKey } = body;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { n8nApiKey: n8nApiKey ?? undefined },
    select: { id: true, name: true, email: true, role: true, n8nApiKey: true },
  });

  return NextResponse.json(user);
}
