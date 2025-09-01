import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function ProgramsPage() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/content/programs", { headers:{Accept:"application/json"} });
        const text = await res.text();
        let data = null; try { data = text ? JSON.parse(text) : null; } catch {}
        if (!res.ok) throw new Error(data?.error || data?.message || text || `HTTP ${res.status}`);

        const arr = Array.isArray(data?.programs) ? data.programs : Array.isArray(data) ? data : [];
        setList(arr);
      } catch (e) {
        setErr(e?.message || "خطأ غير معروف");
      }
    })();
  }, []);

  if (err) {
    return <main dir="rtl" style={{maxWidth:1000, margin:"2rem auto", padding:"0 1rem"}}>حدث خطأ: {err}</main>;
  }

  return (
    <main dir="rtl" style={{maxWidth:1000, margin:"2rem auto", padding:"0 1rem"}}>
      <h1>كل البرامج</h1>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:"1rem"}}>
        {list.map(p => {
          const slugOrId = p.slug || p.id || p.day;
          const img = p.cover_url || p.image_url || p.thumbnail || p.image;
          return (
            <Link key={slugOrId} to={`/programs/${encodeURIComponent(slugOrId)}`} style={{textDecoration:"none",color:"inherit"}}>
              <article style={{background:"#fff",border:"1px solid #eee",borderRadius:12,padding:12}}>
                {img && <img src={img} alt={p.title || p.name} style={{width:"100%",height:140,objectFit:"cover",borderRadius:8}}/>}
                <h3 style={{marginTop:".5rem"}}>{p.title || p.name || "— بدون عنوان —"}</h3>
              </article>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
