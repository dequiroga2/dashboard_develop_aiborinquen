import { z } from "zod";

export const demoCreateSchema = z.object({
  clientId: z.string().min(1, "El cliente es requerido"),
  name: z.string().min(1, "El nombre es requerido"),
  botName: z.string().min(1, "El nombre del bot es requerido"),
  channel: z.enum(["whatsapp", "sms", "both"]).default("whatsapp"),
  provider: z.enum(["twilio", "meta", "ycloud", "other"]).default("twilio"),
  n8nWebhookUrl: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("inactive"),
  allowPhoneReuse: z.boolean().default(false),
  expiresAt: z.string().optional().nullable(),
  internalNotes: z.string().optional(),
});

export const demoUpdateSchema = demoCreateSchema.partial();

export type DemoCreateInput = z.infer<typeof demoCreateSchema>;
export type DemoUpdateInput = z.infer<typeof demoUpdateSchema>;
