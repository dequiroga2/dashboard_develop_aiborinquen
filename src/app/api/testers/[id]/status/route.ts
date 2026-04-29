import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession, unauthorized, forbidden, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const tester = await prisma.authorizedTester.findUnique({
    where: { id: params.id },
    include: { demo: true },
  });
  if (!tester) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!isAdmin(session) && tester.demo.userId !== session.user.id) return forbidden();

  const { active } = await req.json();
  const updated = await prisma.authorizedTester.update({
    where: { id: params.id },
    data: { active },
  });

  return NextResponse.json(updated);
}
