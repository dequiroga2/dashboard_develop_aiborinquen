import { NextRequest, NextResponse } from "next/server";
import { getRequiredSession, unauthorized, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { demoCreateSchema } from "@/schemas/demo.schema";
import { createN8nWorkflow, slugify } from "@/lib/n8n";

export async function GET() {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const where = isAdmin(session) ? {} : { userId: session.user.id };

  const demos = await prisma.demo.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, companyName: true } },
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { testers: true, conversations: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(demos);
}

export async function POST(req: NextRequest) {
  const session = await getRequiredSession();
  if (!session) return unauthorized();

  const body = await req.json();
  const parsed = demoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  // Verify client belongs to this user
  const client = await prisma.client.findUnique({ where: { id: parsed.data.clientId } });
  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  if (!isAdmin(session) && client.userId !== session.user.id) {
    return NextResponse.json({ error: "No puedes crear demos para este cliente" }, { status: 403 });
  }

  const { expiresAt, n8nWebhookUrl, ...rest } = parsed.data;

  // Create demo
  const demo = await prisma.demo.create({
    data: {
      ...rest,
      userId: session.user.id,
      n8nWebhookUrl: n8nWebhookUrl || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  // Auto-create n8n workflow if user has an API key configured and no webhook URL was provided manually
  if (!n8nWebhookUrl) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { n8nApiKey: true },
    });

    if (user?.n8nApiKey) {
      const n8nBaseUrl = process.env.N8N_BASE_URL || "https://aiborinquen.app.n8n.cloud";
      const demoRouterUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "";
      const metaToken = process.env.META_ACCESS_TOKEN || "";
      const metaPhoneNumberId = process.env.META_PHONE_NUMBER_ID || "";

      const result = await createN8nWorkflow({
        clientSlug: slugify(client.name),
        demoName: demo.name,
        n8nApiKey: user.n8nApiKey,
        n8nBaseUrl,
        demoRouterUrl,
        metaToken,
        metaPhoneNumberId,
      });

      if (result) {
        await prisma.demo.update({
          where: { id: demo.id },
          data: { n8nWebhookUrl: result.webhookUrl },
        });
        return NextResponse.json(
          { ...demo, n8nWebhookUrl: result.webhookUrl, workflowCreated: true, workflowId: result.workflowId },
          { status: 201 }
        );
      }
    }
  }

  return NextResponse.json(demo, { status: 201 });
}
