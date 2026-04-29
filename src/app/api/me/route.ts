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

  // Strip any accidental whitespace (copy-paste from n8n UI can introduce spaces)
  const cleanKey = typeof n8nApiKey === "string" ? n8nApiKey.replace(/\s+/g, "") || null : undefined;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { n8nApiKey: cleanKey },
    select: { id: true, name: true, email: true, role: true, n8nApiKey: true },
  });

  return NextResponse.json(user);
}
