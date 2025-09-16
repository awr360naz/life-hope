import React, { useEffect, useState } from "react";
import "./ThirdFrame.css";

/* ===================== Helpers ===================== */
function pickFirstString(...vals) {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function extractFirstImgSrc(html) {
  if (typeof html !== "string") return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function extractFirstUrl(text) {
  if (typeof text !== "string") return null;
  const m = text.match(/https?:\/\/[^\s)'"<>]+/i);
  return m ? m[0] : null;
}

function sanitizeImageUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url, window.location.origin);
    if (window.location.protocol === "https:" && u.protocol === "http:") {
      u.protocol = "https:";
    }
    return u.toString();
  } catch {
    return url;
  }
}

function coerceBody(value) {
  if (value == null) return { text: "" };
  if (typeof value === "string") {
    if (value.trim().startsWith("<")) return { html: value };
    return { text: value };
  }
  if (Array.isArray(value)) {
    const joined = value.map(v => (typeof v === "string" ? v : "")).filter(Boolean).join(" ");
    return { text: joined };
  }
  if (typeof value === "object") {
    if (typeof value.html === "string") return { html: value.html };
    if (typeof value.text === "string") return { text: value.text };
    if (typeof value.content === "string") {
      if (value.content.trim().startsWith("<")) return { html: value.content };
      return { text: value.content };
    }
    if (typeof value.rendered === "string") return { html: value.rendered };
    for (const k of Object.keys(value)) {
      const v = value[k];
      if (typeof v === "string" && v.trim()) {
        if (v.trim().startsWith("<")) return { html: v };
        return { text: v };
      }
    }
    return { text: "" };
  }
  return { text: String(value) };
}

/* تثبيت الدوران الأسبوعي على أول خميس بالسنة */
function firstThursdayOfYear(d = new Date()) {
  const y = d.getFullYear();
  const x = new Date(y, 0, 1);
  const day = x.getDay();               // 0=Sun .. 4=Thu
  const offset = (4 - day + 7) % 7;     // إلى الخميس
  x.setDate(x.getDate() + offset);
  x.setHours(0, 0, 0, 0);
  return x;
}
function weeklyIndexAnchoredOnThursday(now = new Date()) {
  const anchor = firstThursdayOfYear(now);
  const diff = now.getTime() - anchor.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)); // 0,1,2,...
}

/* ===================== Fetch + Normalize ===================== */
async function fetchThirdFrameItem() {
  const res = await fetch("/api/content/home-third-frame", {
    headers: { Accept: "application/json" },
  });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch {}

  if (!res.ok) {
    const serverMsg = data?.error || data?.message || text;
    throw new Error(serverMsg ? `${res.status}: ${serverMsg}` : `HTTP ${res.status}`);
  }

  let list = [];
  if (Array.isArray(data)) list = data;
  else if (Array.isArray(data?.items)) list = data.items;
  else if (Array.isArray(data?.rows)) list = data.rows;
  else if (Array.isArray(data?.data)) list = data.data;
  else if (data && typeof data === "object") list = [data];

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("لا توجد عناصر لعرضها في الإطار الثالث.");
  }

  const normalized = list.map((it) => {
    // Body
    const bodyCandidate = it.body ?? it.text ?? it.content ?? it.description ?? it.summary ?? it;
    const { text: bodyText, html: bodyHtml } = coerceBody(bodyCandidate);

    // Image (جرّب مفاتيح كثيرة + استخرج من HTML أو من النص)
    let rawImg = pickFirstString(
      it.image_url, it.imageUrl, it.image,
      it.cover_url, it.coverUrl, it.cover,
      it.thumbnail, it.thumbnail_url, it.thumb, it.thumb_url,
      it.photo, it.pic
    );
    if (!rawImg) rawImg = extractFirstImgSrc(bodyHtml);
    if (!rawImg) rawImg = extractFirstUrl(bodyText);

    const imageUrl = sanitizeImageUrl(rawImg) || "/assets/placeholder.jpg";

    return {
      title: it.title ?? "—",
      bodyText,
      bodyHtml,
      imageUrl,
      updated_at: it.updated_at ?? it.updatedAt ?? null,
    };
  });

  // اختيار العنصر حسب منطق الخميس
  const now = new Date();
  const weekIdx = weeklyIndexAnchoredOnThursday(now);

  const savedRaw = localStorage.getItem("thirdFrameIndex");
  let saved = Number.isFinite(parseInt(savedRaw, 10)) ? parseInt(savedRaw, 10) : 0;
  if (normalized.length > 0) saved = Math.max(0, Math.min(saved, normalized.length - 1));

  const idx = (now.getDay() === 4)
    ? ((weekIdx % normalized.length) + normalized.length) % normalized.length
    : saved;

  localStorage.setItem("thirdFrameIndex", String(idx));
  return normalized[idx];
}

/* ===================== Component ===================== */
export default function ThirdFrame() {
  const [item, setItem] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetchThirdFrameItem()
      .then(setItem)
      .catch((e) => setErr(`خطأ في الجلب: ${e.message}`));
  }, []);

  if (err) return <p className="third-frame__error">{err}</p>;
  if (!item) return null;

  return (
    <section className="third-frame" dir="rtl">
      <div className="text-body">
        <div className="text-col text-col--right">
          <h2 className="text-title">تأمل هذا الأسبوع</h2>

          {item.bodyHtml ? (
            <div
              className="text-paragraph"
              dangerouslySetInnerHTML={{ __html: item.bodyHtml }}
            />
          ) : (
            <p className="text-paragraph">{item.bodyText}</p>
          )}
        </div>

        <div className="text-col text-col--left">
  {item.imageUrl ? (
    <img
      className="text-image"
      src={item.imageUrl}
      alt={item.title}
      onError={(e) => {
        if (!e.currentTarget.src.endsWith("/assets/placeholder.jpg")) {
          e.currentTarget.src = "/assets/placeholder.jpg";
        }
      }}
    />
  ) : (
    <div className="text-image text-image--fallback" aria-hidden="true" />
  )}
</div>

      </div>
    </section>
  );
}
