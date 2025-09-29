import React from "react";
import "./ThirdFrame.css";

/* ===================== Helpers ===================== */
function pickFirstString(...vals) {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function nowIsoUtc() {
  return new Date().toISOString();
}

function coerceBodyToHtml(body) {
  if (body == null) return "";
  const toHtml = (s) =>
    s
      .replace(/\r?\n/g, "<br/>") // سطور -> <br/>
      .replace(/[ \t]+/g, " ")    // تقليل مضاعفات المسافات
      .trim();

  if (typeof body === "string") {
    const trimmed = body.trim();
    return trimmed.startsWith("<") ? trimmed : toHtml(trimmed);
  }
  if (typeof body === "object") {
    const cand =
      (typeof body.html === "string" && body.html) ||
      (typeof body.rendered === "string" && body.rendered) ||
      (typeof body.content === "string" && body.content) ||
      (typeof body.text === "string" && body.text) ||
      Object.values(body).find((v) => typeof v === "string" && v.trim());
    if (!cand) return "";
    const trimmed = cand.trim();
    return trimmed.startsWith("<") ? trimmed : toHtml(trimmed);
  }
  return String(body);
}

// تنظيف صارم للصورة: يشيل الفراغات ويصلّح https(s) وينقلها لـhttps عند الحاجة
function sanitizeImageUrl(url) {
  if (!url) return null;
  try {
    let s = String(url).trim().replace(/\s+/g, ""); // احذف كل الفراغات
    s = s
      .replace(/^httpss:\/\//i, "https://") // httpss:// -> https://
      .replace(/^https:\/\//i, "https://")  // توحيد
      .replace(/^http:\/\//i, window.location.protocol === "https:" ? "https://" : "http://")
      .replace(/^https:\/\/g+/i, "https://g"); // لو صار تكرار g بالغلط
    const u = new URL(s, window.location.origin);
    if (window.location.protocol === "https:" && u.protocol === "http:") {
      u.protocol = "https:";
    }
    return u.toString();
  } catch {
    return null; // رجّع null ليفعّل placeholder بدل صورة مكسورة
  }
}

/* === مرسى التناوب الأسبوعي: أول جمعة من السنة الساعة 10:00 === */
function firstFriday10OfYear(d = new Date()) {
  const y = d.getFullYear();
  const x = new Date(y, 0, 1, 10, 0, 0, 0); // 1 Jan, 10:00
  const day = x.getDay(); // 0=Sun..6=Sat
  const toFri = (5 - day + 7) % 7; // 5=Fri
  x.setDate(x.getDate() + toFri);
  return x; // أول جمعة 10:00
}

function weeklyIndexAnchoredOnFriday10(now = new Date()) {
  const anchor = firstFriday10OfYear(now);
  const diff = now.getTime() - anchor.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)); // 0,1,2,...
}

/* ===================== Fetch + Normalize ===================== */
async function fetchThirdFrameItems() {
  // مرّر at= الآن (UTC ISO)
  const at = nowIsoUtc();
  const res = await fetch(`/api/content/home-third-frame?at=${encodeURIComponent(at)}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* ignore parse errors and show raw message below */
  }

  if (!res.ok) {
    const serverMsg = data?.error || data?.message || text;
    throw new Error(serverMsg ? `${res.status}: ${serverMsg}` : `HTTP ${res.status}`);
  }

  // دعم أشكال مختلفة للرد
  let list = [];
  if (Array.isArray(data)) list = data;
  else if (Array.isArray(data?.items)) list = data.items;
  else if (Array.isArray(data?.data)) list = data.data;
  else if (Array.isArray(data?.rows)) list = data.rows;
  else if (data?.content) list = [data.content];
  else if (data && typeof data === "object") list = [data];

  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("لا توجد عناصر لعرضها في الإطار الثالث.");
  }

  // طبعنة العناصر لنفس مفاتيحك (title, bodyHtml, image_url)
  const normalized = list.map((it) => {
    const title = (it.title || it.name || "").trim();
    const bodyHtml = coerceBodyToHtml(
      it.body ?? it.content ?? it.description ?? it.summary ?? it.text ?? it
    );
    // hero_url أولاً ثم بدائل أخرى
    const rawImg = pickFirstString(it.hero_url, it.image_url, it.cover_url, it.thumbnail, it.photo);
    const image_url = sanitizeImageUrl(rawImg) || null;

    return { title, bodyHtml, image_url };
  });

  return normalized;
}

/* ===================== Component ===================== */
export default function ThirdFrame() {
  const [item, setItem] = React.useState(null);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const items = await fetchThirdFrameItems();

        // اختيار العنصر وفق "الجمعة 10:00"
        const weekIdx = weeklyIndexAnchoredOnFriday10(new Date());
        const idx = ((weekIdx % items.length) + items.length) % items.length;

        setItem(items[idx]);
      } catch (e) {
        setErr("تعذّر تحميل معلومات الإطار الثالث: " + e.message);
      }
    })();
  }, []);

  if (err) return <p className="third-frame-error">{err}</p>;
  if (!item) return null;

  return (
    <section className="third-frame" dir="rtl" aria-label="تأمل هذا الأسبوع">
      {/* النص يمين */}
      <div className="tf-col tf-col--right">
        <h2 className="tf-title">تأمل هذا الأسبوع</h2>
        {item.title && <h3 className="tf-subtitle">{item.title}</h3>}

        {item.bodyHtml ? (
          <div
            className="tf-paragraph"
            dangerouslySetInnerHTML={{ __html: item.bodyHtml }}
          />
        ) : null}
      </div>

      {/* الصورة شمال */}
      <div className="tf-col tf-col--left">
        <div className="image-4x5">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.title || "صورة التأمل"}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = "https://placehold.co/800x1000?text=No+Image";
              }}
            />
          ) : (
            <div className="image-placeholder">لا توجد صورة</div>
          )}
        </div>
      </div>
    </section>
  );
}
