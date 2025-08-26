// src/lib/validate.js
import { z } from "zod";

const schemas = {
  prayer: z.object({
    name: z.string().min(1, "الاسم مطلوب"),
    phone: z.string().min(6, "رقم هاتف غير صالح").optional(),
    message: z.string().min(1, "الرسالة مطلوبة")
  }),
  contact: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    message: z.string().min(1)
  })
};

export const validate = (key) => (req, res, next) => {
  const schema = schemas[key];
  if (!schema) return next();
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation error", details: parsed.error.flatten() });
  }
  next();
};
