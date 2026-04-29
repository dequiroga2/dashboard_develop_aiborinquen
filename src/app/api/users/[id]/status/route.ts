import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession, unauthorized, forbidden, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const { active } = await req.json();
  const user = await prisma.user.update({
    where: { id: params.id },
    data: { active },
    select: { id: true, name: true, active: true },
  });

  return NextResponse.json(user);
}
