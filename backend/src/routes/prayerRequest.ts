// backend/src/routes/prayerRequest.ts

import { Router } from "express";
import nodemailer from "nodemailer";

const router = Router();

// ⚠️ مهم: لازم تضيفي القيم في backend/.env
// SMTP_HOST=
// SMTP_PORT=587
// SMTP_USER=
// SMTP_PASS=

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

router.post("/", async (req, res) => {
  try {
    const { name, message, topic, canContact, contactInfo } = req.body || {};


    if (!message || !message.trim()) {
      return res.status(400).json({ error: "نص الطلب مطلوب" });
    }

const mailText = [
  "وَصَلَ طلب صلاة جديد من الموقع:",
  "",
  `الموضوع: ${topic || "بدون تحديد"}`,
  `الاسم: ${name?.trim() || "لم يُذكر"}`,
  `يسمح بالتواصل؟ ${canContact ? "نعم" : "لا"}`,
  canContact && contactInfo
    ? `طريقة التواصل: ${contactInfo}`
    : "",
  "",
  "نص الطلب:",
  message,
  "",
  "— أُرسل من نموذج طلب الصلاة على موقع صوت الحياة والأمل —",
].filter(Boolean).join("\n"); // filter(Boolean) عشان يشيل السطر الفاضي لو ما في contactInfo


   await transporter.sendMail({
  from: `"صوت الحياة والأمل" <awr360naz@gmail.com>`,
  to: "awr360naz@gmail.com",
  subject: `طلب صلاة — ${topic}`,
  text: mailText,
});


    res.json({ ok: true });
  } catch (err) {
    console.error("Prayer Request Error:", err);
    res.status(500).json({ error: "تعذّر إرسال الطلب." });
  }
});

export default router;
