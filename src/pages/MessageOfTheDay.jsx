import React, { useMemo, useState } from "react";
import "./MessageOfTheDay.css";

/**
 * MessageOfTheDay
 * - UI: اختيار شعور -> توليد رسالة
 * - يعمل مع API (اختياري) + fallback محلي
 * - RTL جاهز
 */

const DEFAULT_API_URL = "/api/message-of-the-day";

const MOODS = [
  { key: "tired", label: "😔 متعب" },
  { key: "confused", label: "😕 محتار" },
  { key: "anxious", label: "😞 قلقان" },
  { key: "peace", label: "🌱 محتاج سلام" },
  { key: "grateful", label: "✨ شُكران" },
];

// رسائل fallback (إذا الـ API مش موجود أو فشل)
const FALLBACK = {
  tired: [
    {
      message:
        "يمكن اليوم تقيل… بس مش لازم تشيله لحالك. خُد نفس، وخُطوة صغيرة كفاية.",
      verse: "متى 11:28",
      content: { type: "video", title: "لما التعب يطوّل", url: "/programs/today" },
    },
    {
      message:
        "لو طاقتك قليلة، هذا مش فشل. الراحة جزء من الطريق، وربّنا بيقوّي الضعيف.",
      verse: "إشعياء 40:29",
      content: { type: "article", title: "كيف أرتاح بدون ذنب", url: "/articles" },
    },
  ],
  confused: [
    {
      message:
        "الحيرة بتوجع… بسها مش نهاية. اسأل خطوة وحدة: شو الشي الصح اللي بقدر أعمله هلا؟",
      verse: "يعقوب 1:5",
      content: { type: "video", title: "لما ما بعرف أقرر", url: "/programs" },
    },
    {
      message:
        "مش لازم تفهم كل شيء اليوم. يكفي تمشي بالنور اللي عندك الآن، والباقي بيوضح.",
      verse: "مزمور 119:105",
      content: { type: "short", title: "نور للطريق", url: "/shorts" },
    },
  ],
  anxious: [
    {
      message:
        "إذا قلبك مشغول… جرّب تحط همّ واحد قدام ربنا بدل ما تحملهم كلهم مرة واحدة.",
      verse: "1 بطرس 5:7",
      content: { type: "video", title: "كيف أهدّي قلبي", url: "/programs" },
    },
    {
      message:
        "القلق بيكبر لما بنسكت. احكي لربنا ببساطة: ‘أنا خايف’… وهو بيسمع.",
      verse: "مزمور 34:4",
      content: { type: "article", title: "سلام وسط القلق", url: "/articles" },
    },
  ],
  peace: [
    {
      message:
        "السلام مش دايمًا يعني ما في مشاكل… أحيانًا يعني حضور ربنا داخل المشكلة.",
      verse: "يوحنا 14:27",
      content: { type: "video", title: "سلام مش من العالم", url: "/programs" },
    },
    {
      message:
        "خليك قريب من الأشياء اللي تهديك: كلمة، صلاة قصيرة، وامتنان صغير.",
      verse: "فيلبي 4:6-7",
      content: { type: "short", title: "دقيقة سلام", url: "/shorts" },
    },
  ],
  grateful: [
    {
      message:
        "حلو إنك شايف النعمة اليوم. الشكر مش بس شعور… هو طريقة بتفتح القلب للمزيد.",
      verse: "1 تسالونيكي 5:18",
      content: { type: "article", title: "قوة الشكر", url: "/articles" },
    },
    {
      message:
        "حتى الأشياء الصغيرة تستحق شكر. اكتب نعمتين اليوم… وشوف كيف بتتغيّر نظرتك.",
      verse: "مزمور 103:2",
      content: { type: "video", title: "ليش الشكر بيفرق", url: "/programs" },
    },
  ],
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildShareText(result) {
  const verseLine = result?.verse ? `\n\n📖 ${result.verse}` : "";
  const titleLine = result?.content?.title ? `\n\n🔗 ${result.content.title}` : "";
  const urlLine = result?.content?.url ? `\n${window.location.origin}${result.content.url}` : "";
  return `💌 رسالة اليوم لك\n\n${result?.message || ""}${verseLine}${titleLine}${urlLine}`.trim();
}

export default function MessageOfTheDay({ apiUrl = DEFAULT_API_URL, lang = "ar" }) {
  const [mood, setMood] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const moodLabel = useMemo(() => MOODS.find((m) => m.key === mood)?.label || "", [mood]);

  async function generate(useNew = false) {
    if (!mood) return;
    setLoading(true);
    setErrMsg("");

    // 1) حاول API أولاً
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood,
          lang,
          // useNew: لو بدك تخليه يغيّر النتيجة حتى لو نفس اليوم (اختياري)
          useNew,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.message) {
          setResult(data);
          setLoading(false);
          return;
        }
      }
      // إذا الرد مش ok أو ناقص → نوقع على fallback
    } catch (e) {
      // تجاهل وكمّل fallback
    }

    // 2) fallback محلي
    const fb = FALLBACK[mood] || [];
    const picked = pickRandom(fb) || {
      message: "الله قريب… حتى لو ما بتحس. جرّب دقيقة هدوء واطلب السلام.",
      verse: "مزمور 46:1",
      content: { type: "video", title: "رسائل تشجيع", url: "/programs/today" },
    };
    setResult(picked);
    setErrMsg("ملاحظة: تم استخدام رسالة جاهزة (بدون AI).");
    setLoading(false);
  }

  function resetAll() {
    setMood("");
    setResult(null);
    setErrMsg("");
    setLoading(false);
  }

  async function shareWhatsApp() {
    if (!result) return;
    const text = buildShareText(result);
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }

  async function shareSystem() {
    if (!result) return;
    const text = buildShareText(result);

    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (e) {
        // لو المستخدم سكرها
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      alert("تم نسخ الرسالة ✅");
    } catch (e) {
      alert("ما قدرنا ننسخ الرسالة. انسخها يدويًا.");
    }
  }

  return (
    <section className="motd" dir="rtl">
      <div className="motd-card">
        <div className="motd-header">
          <div className="motd-title">💌 رسالة اليوم لك</div>
          <div className="motd-subtitle">اختار شعورك… وخلي الرسالة توصل لقلبك</div>
        </div>

        <div className="motd-moods" aria-label="اختيار الشعور">
          {MOODS.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`motd-chip ${mood === m.key ? "active" : ""}`}
              onClick={() => {
                setMood(m.key);
                setResult(null);
                setErrMsg("");
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="motd-actions">
          <button
            type="button"
            className="motd-btn primary"
            disabled={!mood || loading}
            onClick={() => generate(false)}
          >
            {loading ? "جاري التحضير..." : "اعرض رسالة اليوم"}
          </button>

          <button
            type="button"
            className="motd-btn"
            disabled={!mood || loading}
            onClick={() => generate(true)}
            title="رسالة جديدة"
          >
            🔁 رسالة جديدة
          </button>

          <button type="button" className="motd-btn ghost" onClick={resetAll}>
            إعادة
          </button>
        </div>

        {mood && (
          <div className="motd-hint">
            شعورك الحالي: <span className="motd-hint-strong">{moodLabel}</span>
          </div>
        )}

        {errMsg && <div className="motd-note">{errMsg}</div>}

        {result && (
          <div className="motd-result">
            <div className="motd-message">{result.message}</div>

            <div className="motd-verse">
              <span className="motd-verse-badge">📖 آية</span>
              <span className="motd-verse-text">{result.verse}</span>
            </div>

            {result.content?.url && (
              <a className="motd-content" href={result.content.url}>
                <span className="motd-content-badge">
                  {result.content.type === "video"
                    ? "🎥 فيديو"
                    : result.content.type === "short"
                    ? "🎬 شورت"
                    : "📄 مقال"}
                </span>
                <span className="motd-content-title">{result.content.title || "افتح المحتوى"}</span>
                <span className="motd-content-arrow">←</span>
              </a>
            )}

            <div className="motd-share">
              <button type="button" className="motd-btn" onClick={shareWhatsApp}>
                📤 واتساب
              </button>
              <button type="button" className="motd-btn" onClick={shareSystem}>
                📲 مشاركة / نسخ
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
