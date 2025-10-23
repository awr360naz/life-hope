import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchQuizBySlug } from "../lib/quizApi";  // ✅ أضف الاستيراد
import "../styles/quiz.css";                        // ✅ لا نستخدم quizCss بعد الآن

export function QuizPage() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [idx, setIdx] = useState(0);
  const [locked, setLocked] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetchQuizBySlug(slug).then(setData);
    setIdx(0);
    setLocked(false);
    setSelectedId(null);
    setScore(0);
    setDone(false);
  }, [slug]);

  const q = useMemo(() => data?.questions?.[idx], [data, idx]);
  const total = data?.questions?.length || 0;

  function handlePick(opt) {
    if (locked) return; // لا تغيّر بعد الاختيار
    setSelectedId(opt.id);
    setLocked(true);
    if (opt.is_correct) setScore((s) => s + 1);
  }

  function next() {
    if (idx + 1 < total) {
      setIdx(idx + 1);
      setLocked(false);
      setSelectedId(null);
    } else {
      setDone(true);
    }
  }

  if (!data) return <div className="quiz-page">جارِ التحميل…</div>;

  if (done) {
    const percent = total ? Math.round((score / total) * 100) : 0;
    let msg = "";
    if (percent >= 85) msg = "🎉 مبارك! أداء متميز — استمر هكذا!";
    else if (percent >= 60) msg = "👍 رائع! نتيجة جيدة — تابع تحسين معرفتك.";
    else msg = "🌱 بداية لطيفة — كل محاولة تزيد خبرتك!";

    return (
      <div className="quiz-page">
        <div className="quiz-hero" style={{ marginBottom: 8 }}>
          <h1>{data.title}</h1>
          {data.subtitle && <p>{data.subtitle}</p>}
        </div>

        <div className="result-card" role="status" aria-live="polite">
          <div className="result-score">
            علامتك: {score} / {total} ({percent}%)
          </div>
          <div className="result-msg">{msg}</div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="btn" onClick={() => nav("/quiz")}>
              اختبر معلوماتك باختبار آخر
            </button>
            <button className="btn is-ghost" onClick={() => nav(0)}>
             حاول مجددًا
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-page">
      <div className="quiz-head">
        <div className="quiz-title">{data.title}</div>
        <div className="quiz-progress">
          سؤال {idx + 1} من {total} — العلامة: {score}
        </div>
      </div>

      {q && (
        <article className="q-card">
          <div className="q-body">{q.body}</div>
          <div className="q-options" role="listbox" aria-label="اختر إجابة">
            {q.options.map((opt) => {
              const isPicked = selectedId === opt.id;
              const classes = ["q-option"];
              if (locked) classes.push("is-locked");
              if (locked && opt.is_correct) classes.push("is-correct");
              if (locked && isPicked && !opt.is_correct) classes.push("is-wrong");
              return (
                <div
                  key={opt.id}
                  className={classes.join(" ")}
                  onClick={() => handlePick(opt)}
                  role="option"
                  aria-selected={isPicked}
                >
                  {opt.label}
                </div>
              );
            })}
          </div>

          <div className="q-actions">
            <button className="btn is-ghost" onClick={() => nav("/quiz")}>
              رجوع للقائمة
            </button>
            <button className="btn" onClick={next} disabled={!locked}>
              {idx + 1 < total ? "التالي" : "إنهاء"}
            </button>
          </div>
        </article>
      )}
    </div>
  );
}

export default QuizPage;
