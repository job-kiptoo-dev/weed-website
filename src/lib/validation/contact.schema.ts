import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email(),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(20).max(2000),
});
