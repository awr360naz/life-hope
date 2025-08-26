import React, { useEffect, useState } from "react";
import { ProgramsAPI } from "../lib/api";

export default function ProgramToday() {
  const [data, setData] = useState(null);
  const [state, setState] = useState({ loading: true, error: null });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, error: null });
    ProgramsAPI.getToday()
      .then((json) => { if (alive) setData(json.program); })
      .catch((err) => { if (alive) setState({ loading: false, error: err.message }); })
      .finally(() => { if (alive) setState((s) => ({ ...s, loading: false })); });
    return () => { alive = false; };
  }, []);

  if (state.loading) return <div className="prog-box">جاري التحميل…</div>;
  if (state.error)   return <div className="prog-box prog-error">خطأ: {state.error}</div>;
  if (!data)         return <div className="prog-box">لا يوجد برنامج لليوم.</div>;

  return (
    <section className="prog-box" dir="rtl">
      <h3 className="prog-title">{data.title}</h3>
      <ul className="prog-list">
        {(data.items || []).map((it, i) => <li key={i}>{it.t}</li>)}
      </ul>
      {data.notes ? <p className="prog-notes">{data.notes}</p> : null}
    </section>
  );
}
