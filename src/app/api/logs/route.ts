import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession, unauthorized, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
  const limit = 50;
  const skip = (page - 1) * limit;

  const where = isAdmin(session)
    ? {}
    : { demo: { userId: session.user.id } };

  const [logs, total] = await Promise.all([
    prisma.webhookLog.findMany({
      where,
      include: {
        demo: { select: { id: true, name: true, botName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.webhookLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, limit });
}
