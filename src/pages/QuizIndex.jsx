import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchQuizzes } from "../lib/quizApi";   // ✅ صح
import "../styles/quiz.css";                      // ✅ نستورد CSS كملف

export function QuizIndex() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchQuizzes().then(setItems);
  }, []);

  return (
    <div className="quiz-wrap">
      <div className="quiz-hero">
        <h1>اختبر معلوماتك</h1>
        <p> مع إذاعة صوت الحياة والأمل — اختبارات ممتعة تُثري معرفتك المسيحيه والصحيه.</p>
      </div>

      <div className="quiz-grid">
        {items.map((q) => {
          const img = q.cover_url ? `${q.cover_url}?width=600&quality=70` : "";
          return (
            <Link
              key={q.slug}
              to={`/quiz/${q.slug}`}
              className="quiz-card__link"
              aria-label={`افتح اختبار ${q.title}`}
            >
              <article className="quiz-card">
                <div className="quiz-card__media">
                  {img ? <img src={img} alt="" /> : null}
                </div>
                <div className="quiz-card__body">
                  <div className="quiz-card__title">{q.title}</div>
                  {q.subtitle && <div className="quiz-card__sub">{q.subtitle}</div>}
                  <div className="quiz-card__meta">
                    
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default QuizIndex;
