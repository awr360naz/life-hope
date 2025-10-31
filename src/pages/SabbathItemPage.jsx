// src/pages/SabbathItemPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { fetchItem, fetchNeighborsInWeek } from "../lib/sabbathApi";   
import "./SabbathItemPage.css"; 

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

// خيار: صيغة كلمات تفتح بوب-أب داخل النص: [[كلمة|نص منبثق]]
function renderContentWithPopups(content, onOpen) {
  const parts = [];
  const re = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
  let lastIndex = 0;
  let m;
  while ((m = re.exec(content)) !== null) {
    if (m.index > lastIndex) parts.push(<span key={lastIndex}>{content.slice(lastIndex, m.index)}</span>);
    const word = m[1].trim();
    const tip = m[2].trim();
    parts.push(
      <button key={m.index} className="inline-pop" onClick={() => onOpen(word, tip)}>{word}</button>
    );
    lastIndex = re.lastIndex;
  }
  if (lastIndex < content.length) parts.push(<span key={lastIndex}>{content.slice(lastIndex)}</span>);
  return parts;
}

export default function SabbathItemPage() {
  const { itemSlug } = useParams();
  const q = useQuery();
  const weekSlug = q.get("week") || "";
  const [item, setItem] = useState(null);
  const [neighbors, setNeighbors] = useState({ prev: null, next: null });
  const [popup, setPopup] = useState(null);
  const [notes, setNotes] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const it = await fetchItem(itemSlug);
      if (!mounted) return;
      setItem(it);
      // استرجاع ملاحظات المستخدم (localStorage)
      const key = `SABBATH_NOTES:${itemSlug}`;
      setNotes(localStorage.getItem(key) || "");

      // prev/next
      if (weekSlug) {
        const nb = await fetchNeighborsInWeek(weekSlug, itemSlug);
        mounted && setNeighbors(nb);
      }
    })();
    return () => (mounted = false);
  }, [itemSlug, weekSlug]);

  function saveNotes(v) {
    setNotes(v);
    const key = `SABBATH_NOTES:${itemSlug}`;
    localStorage.setItem(key, v);
  }
useEffect(() => {
  window.__openPopup = (w, t) => setPopup({ w, t });
  return () => delete window.__openPopup;
}, []);

  return (
    <section className="sabbath-wrap" dir="rtl">
      {item?.image ? (
      <div className="sabbath-banner">
  <img src={item.image} alt={item.title || "cover"} />
  <div className="sabbath-banner-text">
    <div className="si-subtitle">{item.subtitle}</div>
    <div className="si-title">{item.title}</div>
  </div>
</div>

      ) : null}
    

      <article className="sabbath-item-body">
     <div
  className="si-content"
  dir="rtl"
  dangerouslySetInnerHTML={{
    __html: item?.content?.replace(
      /\[\[([^|\]]+)\|([^\]]+)\]\]/g,
      (_, word, tip) => `<button class="inline-pop" onclick="window.__openPopup('${word}','${tip}')">${word}</button>`
    ),
  }}
></div>



        <div className="si-nav">
          <div className="si-nav-right">
            {neighbors?.prev ? (
              <button
                className="btn"
                onClick={() => nav(`/sabbath-items/${neighbors.prev.slug}?week=${encodeURIComponent(weekSlug)}`)}
                title={neighbors.prev.title}
              >
                السابق
              </button>
            ) : <span />}
          </div>
          <div className="si-nav-left">
            {neighbors?.next ? (
              <button
                className="btn"
                onClick={() => nav(`/sabbath-items/${neighbors.next.slug}?week=${encodeURIComponent(weekSlug)}`)}
                title={neighbors.next.title}
              >
                التالي
              </button>
            ) : <span />}
          </div>
        </div>
      </article>

      {popup && (
        <div className="sabbath-modal" onClick={() => setPopup(null)}>
          <button className="sabbath-backdrop" aria-label="إغلاق" />
          <div className="sabbath-modal__card" role="dialog" onClick={(e) => e.stopPropagation()}>
            <button className="sabbath-modal__close" aria-label="إغلاق" onClick={() => setPopup(null)}>×</button>
            <h3 className="modal-title">{popup.w}</h3>
            <div className="modal-body"><p>{popup.t}</p></div>
          </div>
        </div>
      )}
    </section>
  );
}
