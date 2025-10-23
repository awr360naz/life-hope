// src/lib/quizApi.js
export async function fetchQuizzes(category) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  const res = await fetch(`/api/content/quizzes?${params.toString()}`);
  const json = await res.json();
  if (json?.ok) return json.items;
  return []; // بلا أي بيانات هاردكود
}

export async function fetchQuizBySlug(slug) {
try {
const res = await fetch(`/api/content/quizzes/${slug}`);
const json = await res.json();
if (json?.ok) return json.quiz;
} catch (e) { /* noop */ }
// fallback quiz (12 Qs example)
return {
slug,
title: "اختبار تجريبي",
subtitle: "أسئلة متعددة الخيارات",
questions: Array.from({ length: 12 }).map((_, i) => ({
id: `q${i+1}`,
body: `سؤال رقم ${i + 1}: نص السؤال التجريبي؟`,
options: [
{ id: `o${i+1}a`, label: "خيار 1", is_correct: i % 4 === 0 },
{ id: `o${i+1}b`, label: "خيار 2", is_correct: i % 4 === 1 },
{ id: `o${i+1}c`, label: "خيار 3", is_correct: i % 4 === 2 },
{ id: `o${i+1}d`, label: "خيار 4", is_correct: i % 4 === 3 },
],
}))
};
}