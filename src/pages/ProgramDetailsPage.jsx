// src/pages/ProgramDetailsPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import "./ProgramDetailsPage.css";
import ProgramsCarousel from "../components/ProgramsCarousel";

export default function ProgramDetailsPage() {
  const { id } = useParams();
  const [program, setProgram] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        // 1) جرّب نداء التفاصيل مباشرة
        let prog = null;

        // نقرأ كنص أولًا ثم JSON عشان نتجنّب كراش لو رجع HTML/نص
        const r1 = await fetch(`/api/content/programs/${id}`, { headers: { Accept: "application/json" } });
        const t1 = await r1.text();
        let d1 = null; try { d1 = t1 ? JSON.parse(t1) : null; } catch {}
        if (r1.ok && d1) prog = d1;

        // 2) إن فشل، نجيب القائمة ونبحث بالـ id/slug
        if (!prog) {
          const rList = await fetch(`/api/content/programs?limit=50`, { headers: { Accept: "application/json" } });
          const tList = await rList.text();
          let arr = null; try { arr = tList ? JSON.parse(tList) : null; } catch {}
          const list = Array.isArray(arr) ? arr : [];
          prog =
            list.find(x => String(x.id) === String(id)) ||
            list.find(x => String(x.slug) === String(id)) ||
            null;
          // related = بقية العناصر بدون الحالي
          setRelated(list.filter(x =>
            String(x.id) !== String(prog?.id) && String(x.slug) !== String(id)
          ));
        } else {
          // حتى لو جبنا التفاصيل مباشرة، نجيب related من قائمة عامة ونشيل الحالي
          const r2 = await fetch(`/api/content/programs?limit=12`, { headers: { Accept: "application/json" } });
          const t2 = await r2.text();
          let d2 = null; try { d2 = t2 ? JSON.parse(t2) : null; } catch {}
          const list2 = Array.isArray(d2) ? d2 : [];
          setRelated(list2.filter(x => String(x.id) !== String(prog?.id)));
        }

        setProgram(prog);
      } catch (e) {
        setError(e?.message || "حدث خطأ");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <p>جاري التحميل...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!program) return <p>البرنامج غير موجود</p>;

  // توحيد الحقول: أحيانًا بيكون title/description أو name/content
  const title = program.title || program.name || program.program_title || "برنامج";
  const descRaw = program.description || program.text || program.content || "";

  // إذا الوصف فيه HTML نخليه كـ innerHTML، غير هيك نص عادي
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(String(descRaw));

  return (
    <div className="program-details-page">
      <h1 className="program-title">{title}</h1>

      {isHtml ? (
        <div
          className="program-text"
          dangerouslySetInnerHTML={{ __html: String(descRaw) }}
        />
      ) : (
        <p className="program-text">{String(descRaw)}</p>
      )}

      {/* الكاروسول يظهر فقط إذا في عناصر (وما نبعثلُه query-string داخل apiUrl) */}
      {related.length > 0 && (
        <div className="related-carousel">
          <h2>برامج أخرى</h2>
          {/* خليه يستخدم apiUrl الافتراضي تبعه حتى ما نخرب الاستعلام الداخلي */}
          <ProgramsCarousel perView={3} step={1} />
        </div>
      )}
    </div>
  );
} 