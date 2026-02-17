import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import "./ProgramDetail.css";
import SabahElKheirCarousel from "../components/SbahAlkherCarousel";
import KolShahr4_7kayatCarousel from "../components/KolShahr4_7kayatCarousel";
import WamdatRaw7yeCarousel from "../components/WamdatRaw7yeCarousel";
import Al7yaWelamalCarousel from "../components/Al7yaWelamalCarousel";

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

  const normalizedTitle = useMemo(() => {
    const t = item?.title;
    if (typeof t !== "string") return "";

    return t
      .replace(/،/g, ",")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي");
  }, [item]);

  const programCarousels = useMemo(
    () => ({
      "برنامج فتح نبؤات": <CamiPropheciesCarousel />,
      "تحت سقف واحد": <ThtSaqfWahdCarousel />,
      "برنامج تحت سقف واحد": <ThtSaqfWahdCarousel />,

      "برنامج صحه افضل لحياه افضل": <SehaAfdalCarousel />,
      "صحه افضل لحياه افضل": <SehaAfdalCarousel />,
      "برنامج صحة افضل لحياة افضل": <SehaAfdalCarousel />,
      "صحة افضل لحياة افضل": <SehaAfdalCarousel />,

      "برنامج مرايا الروح": <MrayaAlrohCarousel />,
      "مرايا الروح": <MrayaAlrohCarousel />,

      "برنامج صباح الخير مع ايات": <SabahElKheirCarousel />,
      "صباح الخير مع ايات": <SabahElKheirCarousel />,
      "برنامج صباح الخير": <SabahElKheirCarousel />,
      "صباح الخير مع آيات": <SabahElKheirCarousel />,

      "برنامج كل شهر اربع حكايات": <KolShahr4_7kayatCarousel />,
      "كل شهر اربع حكايات": <KolShahr4_7kayatCarousel />,
      "برنامج كل شهر أربع حكايات": <KolShahr4_7kayatCarousel />,
      "كل شهر أربع حكايات": <KolShahr4_7kayatCarousel />,

      // ✅ ومضات روحية (أضفنا الشكل بعد normalization)
      "برنامج ومضات روحية": <WamdatRaw7yeCarousel />,
      "ومضات روحية": <WamdatRaw7yeCarousel />,
      "برنامج ومضات روحيه": <WamdatRaw7yeCarousel />,
      "ومضات روحيه": <WamdatRaw7yeCarousel />,

      // ✅ الحياة والأمل (أضفنا كل الاحتمالات)
      "برنامج الحياة والامل": <Al7yaWelamalCarousel />,
      "الحياة والامل": <Al7yaWelamalCarousel />,
      "برنامج الحياه والامل": <Al7yaWelamalCarousel />,
      "الحياه والامل": <Al7yaWelamalCarousel />,
    }),
    []
  );

  const ProgramCarousel = normalizedTitle
    ? programCarousels[normalizedTitle] || null
    : null;

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

      <section className="pd-content">
        {content ? (
          isHtml ? (
            <div
              className="pd-html"
              dangerouslySetInnerHTML={{ __html: content }}
            />
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
