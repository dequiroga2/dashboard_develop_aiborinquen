import { NextResponse } from "next/server";
import { getRequiredSession, unauthorized } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  return NextResponse.json(user);
}
