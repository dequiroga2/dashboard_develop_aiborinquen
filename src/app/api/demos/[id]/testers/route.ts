import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession, unauthorized, forbidden, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { testerCreateSchema } from "@/schemas/tester.schema";
import { normalizePhone } from "@/lib/normalize";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const demo = await prisma.demo.findUnique({ where: { id: params.id } });
  if (!demo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!isAdmin(session) && demo.userId !== session.user.id) return forbidden();

  const testers = await prisma.authorizedTester.findMany({
    where: { demoId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(testers);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const demo = await prisma.demo.findUnique({ where: { id: params.id } });
  if (!demo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!isAdmin(session) && demo.userId !== session.user.id) return forbidden();

  const body = await req.json();
  const parsed = testerCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const normalizedPhone = normalizePhone(parsed.data.phone);

  // Check for duplicate phone in this demo
  const existing = await prisma.authorizedTester.findFirst({
    where: { demoId: params.id, normalizedPhone },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Este teléfono ya está registrado en esta demo" },
      { status: 409 }
    );
  }

  // Check phone reuse across active demos (if not allowed)
  if (!demo.allowPhoneReuse) {
    const activeConflict = await prisma.authorizedTester.findFirst({
      where: {
        normalizedPhone,
        active: true,
        demo: { status: "active" },
        demoId: { not: params.id },
      },
    });
    if (activeConflict) {
      return NextResponse.json(
        {
          error:
            "Este teléfono ya está activo en otra demo. Desactívalo primero o habilita 'permitir reutilización'.",
        },
        { status: 409 }
      );
    }
  }

  const tester = await prisma.authorizedTester.create({
    data: { ...parsed.data, demoId: params.id, normalizedPhone },
  });

  return NextResponse.json(tester, { status: 201 });
}
