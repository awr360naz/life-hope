import React, { useEffect, useMemo, useRef, useState } from "react";
import "./MiniScheduleWidget.css";

const ROW_H = 24; 

export default function MiniScheduleWidget({ className = "", paused = false }) {
  const rootRef = useRef(null);
  const headerRef = useRef(null);
  const onairRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [now, setNow] = useState(null);
  const [next, setNext] = useState(null);


  const [visibleRows, setVisibleRows] = useState(6);


  const [index, setIndex] = useState(0);
  const [resetting, setResetting] = useState(false);
  const timerRef = useRef(null);


  const WD_EN3 = ["sun","mon","tue","wed","thu","fri","sat"];
  const WD_EN_FULL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const WD_AR = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];

  function getTodayKeys(tz = "Asia/Jerusalem"){
    const d = new Date();
    const abbr = new Intl.DateTimeFormat("en-GB",{weekday:"short",timeZone:tz})
                   .format(d).toLowerCase().slice(0,3);
    const i = WD_EN3.indexOf(abbr);
    return {
      idxSun0: i,
      iso1to7: i === 0 ? 7 : i,
      en3: WD_EN3[i],
      enFull: WD_EN_FULL[i],
      ar: WD_AR[i],
    };
  }

  function hhmmToMinutes(s = ""){
    const m = /^(\d{1,2}):(\d{2})$/.exec((s || "").trim());
    if (!m) return -1;
    return (+m[1]) * 60 + (+m[2]);
  }


  function pickNowNext(list, tz = "Asia/Jerusalem"){
    const nowStr = new Intl.DateTimeFormat("en-GB",{
      hour:"2-digit", minute:"2-digit", hour12:false, timeZone:tz
    }).format(new Date());
    const nowMin = hhmmToMinutes(nowStr);

    let nowIdx = -1;
    let nextIdx = -1;

    for (let i = 0; i < list.length; i++){
      const t = hhmmToMinutes(list[i]?.time || "");
      if (t === -1) continue;
      if (t <= nowMin) nowIdx = i;            
      if (nextIdx === -1 && t > nowMin) nextIdx = i; 
    }

    return {
      now:  nowIdx  >= 0 ? list[nowIdx]  : null,
      next: nextIdx >= 0 ? list[nextIdx] : null,
    };
  }

  function normalizeItems(raw){
    if (Array.isArray(raw)) return raw.filter(it => it?.time && it?.title);
    if (typeof raw === "string"){
      try {
        const j = JSON.parse(raw);
        return Array.isArray(j) ? j.filter(it => it?.time && it?.title) : [];
      } catch { return []; }
    }
    return [];
  }

 
  function padHHMM(s=""){
    const m = /^(\d{1,2}):(\d{2})$/.exec((s || "").trim());
    if (!m) return (s || "");
    return `${String(+m[1]).padStart(2,"0")}:${m[2]}`;
  }
  function cleanAndSort(list){
    const clean = (list || [])
      .filter(it => it && typeof it.time === "string" && typeof it.title === "string")
      .map(it => ({ time: padHHMM(it.time), title: String(it.title).trim() }))
      .filter(it => hhmmToMinutes(it.time) >= 0);

    const seen = new Set();
    const dedup = [];
    for (const it of clean){
      const k = `${it.time}__${it.title}`;
      if (!seen.has(k)){ seen.add(k); dedup.push(it); }
    }
    dedup.sort((a,b) => hhmmToMinutes(a.time) - hhmmToMinutes(b.time));
    return dedup;
  }

  
  useEffect(() => {
    let stop = false;
    (async () => {
      setLoading(true); setErr("");
      try {
        const res = await fetch("/api/content/programs/weekly", { headers: { Accept: "application/json" } });
        const data = await res.json();
        if (!res.ok || !data?.ok) throw new Error(data?.error || "fetch_weekly_failed");

        const weekly = Array.isArray(data.weekly) ? data.weekly : [];
        const K = getTodayKeys();
        const keys = new Set([String(K.idxSun0), String(K.iso1to7), K.en3, K.enFull, K.ar]);

        let row = weekly.find(r => {
          const v = r?.day;
          if (v == null) return false;
          const s = String(v).trim();
          return keys.has(s);
        });
        if (!row) row = weekly.find(r => normalizeItems(r?.items).length > 0) || null;

        const its = row ? normalizeItems(row.items) : [];
        if (stop) return;

        const dedup = cleanAndSort(its);
        setItems(dedup);
        const picked = pickNowNext(dedup);
        setNow(picked.now);
        setNext(picked.next);
      } catch (e) {
      
        try {
          const res2 = await fetch("/api/content/programs/today", { headers: { Accept: "application/json" } });
          const d2 = await res2.json();
          if (res2.ok && d2?.ok) {
            const its =
              Array.isArray(d2.items) ? d2.items :
              Array.isArray(d2.program?.items) ? d2.program.items :
              normalizeItems(d2.items);

            if (!stop){
              const dedup = cleanAndSort(its);
              setItems(dedup);
              const picked = pickNowNext(dedup);
              setNow(picked.now);
              setNext(picked.next);
            }
            setLoading(false);
            return;
          }
          throw new Error(d2?.error || "fallback_today_failed");
        } catch(e2){
          if (!stop) setErr(String(e2?.message || e2 || e));
        }
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => { stop = true; };
  }, []);

 
  useEffect(() => {
    if (!rootRef.current) return;
    const ro = new ResizeObserver(() => {
      const root = rootRef.current;
      const headerH = headerRef.current?.offsetHeight || 0;
      const onairH  = onairRef.current?.offsetHeight || 0;
      const styles = window.getComputedStyle(root);
      const pt = parseFloat(styles.paddingTop) || 0;
      const pb = parseFloat(styles.paddingBottom) || 0;
      const available = root.clientHeight - headerH - onairH - pt - pb;
      const rows = Math.max(6, Math.floor(available / ROW_H));
      setVisibleRows(rows);
    });
    ro.observe(rootRef.current);
    return () => ro.disconnect();
  }, []);


  const items2 = useMemo(() => {
    if (!items || items.length === 0) return [];
    const bridge = items.slice(0, visibleRows);
    return items.concat(bridge);
  }, [items, visibleRows]);

 
  const maxIdx = Math.max(0, items.length);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (paused || loading || items.length <= visibleRows) return;

    timerRef.current = setInterval(() => {
      setIndex((prev) => {
        const nextIdx = prev + 1;
        return nextIdx > maxIdx ? maxIdx : nextIdx;
      });
    }, 1000); 
    return () => clearInterval(timerRef.current);
  }, [paused, loading, items, visibleRows, maxIdx]);

  function handleTransitionEnd() {
    if (index >= maxIdx) {
     
      setResetting(true);
      requestAnimationFrame(() => {
        setIndex(0);
        requestAnimationFrame(() => setResetting(false));
      });
    }
  }


  return (
    <div ref={rootRef} className={`mini-schedule ${className}`}>
    
      <div ref={headerRef} className="frame-header center">
        <span className="schedule-title">برنامج اليوم</span>
      </div>

  
      <div
        className="schedule-viewport"
        aria-busy={loading}
        style={{ height: `${visibleRows * ROW_H}px` }}
      >
        {err ? (
          <ul className="schedule-list">
            <li className="schedule-row">
              <span className="row-title">خطأ في الجلب: {err}</span>
              <time className="row-time">!</time>
            </li>
          </ul>
        ) : loading ? (
          <ul className="schedule-list">
            <li className="schedule-row">
              <span className="row-title">… جاري التحميل</span>
              <time className="row-time">…</time>
            </li>
          </ul>
        ) : items2.length === 0 ? (
          <ul className="schedule-list">
            <li className="schedule-row">
              <span className="row-title">لا يوجد فقرات مُسجّلة لليوم</span>
              <time className="row-time">—</time>
            </li>
          </ul>
        ) : (
          <ul
            className={`schedule-list ${resetting ? "no-anim" : ""}`}
            style={{ transform: `translateY(${-index * ROW_H}px)` }}
            onTransitionEnd={handleTransitionEnd}
          >
            {items2.map((it, i) => (
              <li key={i} className="schedule-row">
            
                <span className="row-title">{it.title}</span>
                <time className="row-time">{it.time}</time>
              </li>
            ))}
          </ul>
        )}
      </div>

    
      <div ref={onairRef} className="onair-box" aria-live="polite">
        <div className="onair-lines">
          <div className="onair-line">
            <span className="live-pill">
              <span className="dot" aria-hidden></span>
              مباشر
            </span>
            <span className="onair-text">
              {now?.title ? `${now.title}  ${now.time}` : "—"}
            </span>
          </div>
          <div className="next-line">
            <span className="next-label">التالي:</span>{" "}
            <span className="next-text">{next?.title ? `${next.title} : ${next.time}` : "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
