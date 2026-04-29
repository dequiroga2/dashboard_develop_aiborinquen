import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession, unauthorized, forbidden, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const demo = await prisma.demo.findUnique({ where: { id: params.id } });
  if (!demo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!isAdmin(session) && demo.userId !== session.user.id) return forbidden();

  const { status } = await req.json();
  if (!["active", "inactive"].includes(status)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 422 });
  }

  const updated = await prisma.demo.update({
    where: { id: params.id },
    data: { status },
  });

  return NextResponse.json(updated);
}
