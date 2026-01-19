// routes/messageOfTheDay.js (or .ts)
import express from "express";
import OpenAI from "openai";

const router = express.Router();

type Mood = "tired" | "confused" | "anxious" | "peace" | "grateful";

const MOOD_AR: Record<Mood, string> = {
  tired: "متعب",
  confused: "محتار",
  anxious: "قلقان",
  peace: "محتاج سلام",
  grateful: "شُكران",
};

function pickContent(mood: Mood) {
  const map = {
    tired: { type: "video", title: "لما التعب يطوّل", url: "/programs/today" },
    confused: { type: "video", title: "لما ما بعرف أقرر", url: "/programs" },
    anxious: { type: "article", title: "سلام وسط القلق", url: "/articles" },
    peace: { type: "short", title: "دقيقة سلام", url: "/shorts" },
    grateful: { type: "article", title: "قوة الشكر", url: "/articles" },
  };
  return map[mood];
}

router.post("/message-of-the-day", async (req, res) => {
  try {
    const mood = req.body?.mood as Mood;

    if (!MOOD_AR[mood]) {
      return res.status(400).json({ error: "Invalid mood" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const openai = new OpenAI({ apiKey });

    const content = pickContent(mood);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "أنت كاتب رسائل تشجيع روحية قصيرة جدًا بالعربية. الأسلوب دافئ وإنساني وغير وعظي. لا تذكر أنك ذكاء اصطناعي.",
        },
        {
          role: "user",
          content: `
اكتب رسالة قصيرة جدًا (3–4 أسطر) لشخص يشعر بأنه ${MOOD_AR[mood]}.

❗ الشروط:
- أعد النتيجة بصيغة JSON فقط
- المفاتيح المطلوبة:
{
  "message": "النص",
  "verse": "مرجع الآية فقط"
}
- لا تكتب أي نص خارج JSON
          `.trim(),
        },
      ],
      temperature: 0.6,
      // مهم جدًا عشان ما يرجّع كلام خارج JSON
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message?.content || "{}";

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: "AI did not return valid JSON", raw });
    }

    if (!parsed.message || !parsed.verse) {
      return res.status(500).json({ error: "Incomplete AI response", parsed });
    }

    return res.json({
      message: String(parsed.message).trim(),
      verse: String(parsed.verse).trim(),
      content,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

export default router;
