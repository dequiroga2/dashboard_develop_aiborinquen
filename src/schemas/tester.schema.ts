import { z } from "zod";

export const testerCreateSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  phone: z.string().min(7, "El teléfono es requerido"),
  role: z.enum(["client", "tester", "internal"]).default("tester"),
  active: z.boolean().default(true),
});

export const testerUpdateSchema = testerCreateSchema.partial();

export type TesterCreateInput = z.infer<typeof testerCreateSchema>;
export type TesterUpdateInput = z.infer<typeof testerUpdateSchema>;
