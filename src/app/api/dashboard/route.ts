import { NextResponse } from "next/server";
import { getRequiredSession, unauthorized, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const userFilter = isAdmin(session) ? {} : { userId: session.user.id };
  const demoFilter = isAdmin(session) ? {} : { demo: { userId: session.user.id } };

  const [
    totalClients,
    totalDemos,
    activeDemos,
    totalTesters,
    recentConversations,
    recentErrors,
  ] = await Promise.all([
    prisma.client.count({ where: userFilter }),
    prisma.demo.count({ where: userFilter }),
    prisma.demo.count({ where: { ...userFilter, status: "active" } }),
    prisma.authorizedTester.count({ where: demoFilter }),
    prisma.conversation.findMany({
      where: demoFilter,
      include: {
        tester: { select: { name: true, phone: true } },
        demo: { select: { name: true, botName: true } },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 5,
    }),
    prisma.webhookLog.findMany({
      where: { ...demoFilter, status: { in: ["error", "unauthorized", "inactive_demo"] } },
      include: { demo: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    totalClients,
    totalDemos,
    activeDemos,
    totalTesters,
    recentConversations,
    recentErrors,
  });
}
