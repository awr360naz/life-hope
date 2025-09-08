// src/lib/api.js
const raw = process.env.REACT_APP_API_URL;
const envUrl = raw && raw !== 'undefined' && raw !== 'null' && raw.trim() !== '' ? raw : null;

const isDevCRA = window.location.port === '3000';
const API_URL = envUrl || (isDevCRA ? '/api' : `${window.location.protocol}//${window.location.hostname}:4000/api`);
console.log('API_URL ->', API_URL);

async function http(method, path, data) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  });
  const type = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0,200)}`);
  if (type.includes('application/json')) return JSON.parse(text);
  throw new Error(`Expected JSON, got ${type}. Snippet: ${text.slice(0,200)}`);
}

export const api = {
  health:   () => http('GET',  '/health'),
  live:     () => http('GET',  '/content/live'),
  articles: () => http('GET',  '/content/articles'),

  getProgramToday: () => http('GET',  '/content/programs/today'),
  getProgramsWeek: () => http('GET',  '/content/programs'),

  patchProgramsDay: (dayKey, patch) => http('PUT', `/content/programs/${dayKey}`, patch),

  sendPrayer:  (payload) => http('POST', '/contact/prayer', payload),
  sendContact: (payload) => http('POST', '/contact/message', payload),
};

export default api;
