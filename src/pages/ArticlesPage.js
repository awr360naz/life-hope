import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function ArticlesPage() {
  const [list, setList] = useState([]);
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/content/articles", { headers:{Accept:"application/json"} });
      const data = await res.json();
      setList(Array.isArray(data?.articles) ? data.articles : Array.isArray(data) ? data : []);
    })();
  }, []);
  return (
    <main dir="rtl" style={{maxWidth:1000, margin:"2rem auto", padding:"0 1rem"}}>
      <h1>كل المقالات</h1>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:"1rem"}}>
        {list.map(a => {
          const slug = a.slug || a.id;
          const img = a.cover_url || a.image_url;
          return (
            <Link key={slug} to={`/articles/${slug}`} style={{textDecoration:"none",color:"inherit"}}>
              <article style={{background:"#fff",border:"1px solid #eee",borderRadius:12,padding:12}}>
                {img && <img src={img} alt={a.title} style={{width:"100%",height:140,objectFit:"cover",borderRadius:8}}/>}
                <h3 style={{marginTop:".5rem"}}>{a.title}</h3>
              </article>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
