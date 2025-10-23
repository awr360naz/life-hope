// src/pages/QuizCategory.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchQuizzes } from "../lib/quizApi";   // نفس دالة الجلب اللي عندك
import "../styles/quiz.css";                          // نفس ملف الستايل اللي شغّال عندك

const LABELS = {
  health: "اختبارات صحّية",
  christian: "اختبارات مسيحيّة",
};

export default function QuizCategory({ category }) {
  const [items, setItems] = useState([]);
  const title = LABELS[category] || "اختبارات";

  useEffect(() => {
    fetchQuizzes(category).then(setItems).catch(() => setItems([]));
  }, [category]);

  return (
    <div className="quiz-wrap">
      <div className="quiz-hero">
        <h1>{title}</h1>
        <p>اختر اختبارًا للبدء</p>
      </div>

      <div className="quiz-grid">
        {items.map((q) => (
          <a key={q.slug} href={`/quiz/${q.slug}`} className="quiz-card__link">
            <div className="quiz-card">
              <div className="quiz-card__media">
                {q.cover_url ? (
                  <img src={q.cover_url} alt={q.title} loading="lazy" />
                ) : (
                  <div style={{background:"#f2f2f2",width:"100%",height:"100%"}} />
                )}
              </div>
              <div className="quiz-card__body">
                <div className="quiz-card__title">{q.title}</div>
                {q.subtitle ? <div className="quiz-card__sub">{q.subtitle}</div> : null}
              </div>
            </div>
          </a>
        ))}

        {items.length === 0 && (
          <div className="muted" style={{ textAlign: "center", gridColumn: "1 / -1" }}>
            لا توجد اختبارات ضمن هذا التصنيف الآن.
          </div>
        )}
      </div>
    </div>
  );
}
