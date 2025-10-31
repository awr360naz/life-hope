

// src/lib/sabbathApi.js
export async function fetchLessons() {
  const res = await fetch("/api/content/sabbath-lessons");
  const js = await res.json();
  return js?.items || [];
}
// يجلب ملاحظات الأسبوع (note) عبر weekSlug
export async function fetchWeekMeta(weekSlug) {
  const res = await fetch(`/api/content/sabbath-weeks/${encodeURIComponent(weekSlug)}/meta`);
  const js = await res.json();
  return js?.item || { note: "" };
}

export async function fetchLessonBySlug(slug) {
  const res = await fetch(`/api/content/sabbath-lessons/${encodeURIComponent(slug)}`);
  const js = await res.json();
  return js?.item || null;
}

export async function fetchWeeksForLesson(lessonSlug) {
  const res = await fetch(`/api/content/sabbath-lessons/${encodeURIComponent(lessonSlug)}/weeks`);
  const js = await res.json();
  return js?.items || [];
}

export async function fetchWeekItems(weekSlug) {
  const res = await fetch(`/api/content/sabbath-weeks/${encodeURIComponent(weekSlug)}/items`);
  const js = await res.json();
  return js?.items || [];
}

export async function fetchItem(itemSlug) {
  const res = await fetch(`/api/content/sabbath-items/${encodeURIComponent(itemSlug)}`);
  const js = await res.json();
  return js?.item || null;
}

// يعيد Prev/Next داخل نفس الأسبوع
export async function fetchNeighborsInWeek(weekSlug, itemSlug) {
  const res = await fetch(
    `/api/content/sabbath-weeks/${encodeURIComponent(weekSlug)}/neighbors?item=${encodeURIComponent(itemSlug)}`
  );
  const js = await res.json();
  // { prev: {slug,title} | null, next: {slug,title} | null }
  return js || { prev: null, next: null };
}
