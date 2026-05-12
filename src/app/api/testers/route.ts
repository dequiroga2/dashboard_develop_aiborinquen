import { NextResponse } from "next/server";
import { getRequiredSession, unauthorized, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const where = isAdmin(session)
    ? {}
    : { demo: { userId: session.user.id } };

  const testers = await prisma.authorizedTester.findMany({
    where,
    include: {
      demo: {
        select: { id: true, name: true, status: true, botName: true },
      },
    },
    orderBy: [{ normalizedPhone: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(testers);
}
