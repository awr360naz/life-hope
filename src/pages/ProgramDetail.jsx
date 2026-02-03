import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import "./ProgramDetail.css";

// ✅ الكاروسيلات
import CamiPropheciesCarousel from "../components/CamiPropheciesCarousel";
import ThtSaqfWahdCarousel from "../components/ThtSaqfWahdCarousel";
import SehaAfdalCarousel from "../components/SehaAfdalCarousel";
import MrayaAlrohCarousel from "../components/MrayaAlrohCarousel";

export default function ProgramDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(
          `/api/content/programs/${encodeURIComponent(id)}`,
          { headers: { Accept: "application/json" } }
        );

        const text = await res.text();
        let data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {}

        if (!res.ok) {
          throw new Error(
            data?.error || data?.message || text || `HTTP ${res.status}`
          );
        }

        setItem(data);
      } catch (e) {
        setErr(e?.message || "فشل جلب تفاصيل البرنامج");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ✅ توحيد العنوان عشان لو في مسافات زيادة
  const normalizedTitle = useMemo(() => {
  const t = item?.title;
  if (typeof t !== "string") return "";

  return t
    .replace(/،/g, ",")          // توحيد الفاصلة
    .replace(/\s+/g, " ")        // مسافات
    .trim()
    .replace(/[أإآ]/g, "ا")      // توحيد الألف
    .replace(/ة/g, "ه")          // (اختياري) لو عندك اختلافات
    .replace(/ى/g, "ي");         // توحيد الياء
}, [item]);


  // ✅ خريطة (title -> carousel)
 const programCarousels = useMemo(
  () => ({
    // ✅ كامي
    "برنامج فتح نبؤات": <CamiPropheciesCarousel />,
    "برنامج فتح نبؤات": <CamiPropheciesCarousel />,

    // ✅ تحت سقف واحد (بدون "برنامج")
    "تحت سقف واحد": <ThtSaqfWahdCarousel />,
    "برنامج تحت سقف واحد": <ThtSaqfWahdCarousel />,

    // ✅ صحة افضل لحياة افضل (بدون همزات)
    "برنامج صحه افضل لحياه افضل": <SehaAfdalCarousel />,
    "صحه افضل لحياه افضل": <SehaAfdalCarousel />,
    "برنامج صحة افضل لحياة افضل": <SehaAfdalCarousel />,
    "صحة افضل لحياة افضل": <SehaAfdalCarousel />,

    // ✅ مرايا الروح
    "برنامج مرايا الروح": <MrayaAlrohCarousel />,
    "مرايا الروح": <MrayaAlrohCarousel />,
  }),
  []
);


  // ✅ الكورسول النهائي (إن وجد)
  const ProgramCarousel = normalizedTitle
    ? programCarousels[normalizedTitle] || null
    : null;

  // ✅ المحتوى النصي/HTML
  const content = useMemo(() => {
    if (!item) return "";
    const candidates = [
      item.content,
      item.description,
      item.subtitle,
      item.body,
      item.text,
      item.html,
    ];
    return (
      candidates.find((v) => typeof v === "string" && v.trim().length) || ""
    );
  }, [item]);

  const isHtml =
    typeof content === "string" && /<\/?[a-z][\s\S]*>/i.test(content);

  if (loading) return <main className="pd" dir="rtl">جارٍ التحميل…</main>;
  if (err)
    return (
      <main className="pd" dir="rtl">
        <div className="pd-err">{err}</div>
      </main>
    );
  if (!item) return <main className="pd" dir="rtl">غير موجود</main>;

  return (
    <main className="pd" dir="rtl">
      <header className="pd-head">
        <h1 className="pd-title">{item.title || "بدون عنوان"}</h1>
      </header>

      {/* ✅ نفس فكرة كامي: الكورسول تحت العنوان مباشرة */}
   

      <section className="pd-content">
        {content ? (
          isHtml ? (
            <div className="pd-html" dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <p className="pd-text">{content}</p>
          )
        ) : (
          <em className="pd-empty">لا يوجد محتوى.</em>
        )}
           {ProgramCarousel && (
        <section className="pd-carousel-wrap">
          {ProgramCarousel}
        </section>
      )}
      </section>
    </main>
  );
}
