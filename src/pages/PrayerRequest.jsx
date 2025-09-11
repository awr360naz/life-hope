import React, { useState } from "react";
import "./PrayerRequest.css";

export default function PrayerRequest() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
    topic: "شفاء",
    canContact: false,
  });
  const [status, setStatus] = useState("");

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  function isEmail(x = "") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.trim());
  }

  function buildBody() {
    return [
      `موضوع الطلب: ${form.topic}`,
      `الاسم: ${form.name}`,
      `البريد: ${form.email}`,
      `يسمح بالتواصل؟ ${form.canContact ? "نعم" : "لا"}`,
      "",
      "نص الطلب:",
      form.message,
      "",
      "— أُرسلت من نموذج طلب الصلاة على الموقع —",
    ].join("\n");
  }

  function openGmailCompose(to, subject, body) {
    const url =
      "https://mail.google.com/mail/?view=cm&fs=1" +
      `&to=${encodeURIComponent(to)}` +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
    const w = window.open(url, "_blank", "noopener,noreferrer");
    return !!w;
  }

  function openMailto(to, subject, body) {
    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("");

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setStatus("رجاءً املأ الاسم والبريد وطلب الصلاة.");
      return;
    }
    if (!isEmail(form.email)) {
      setStatus("رجاءً أدخل بريدًا إلكترونيًا صالحًا.");
      return;
    }

    const to = "hope@awr.org";
    const subject = `طلب صلاة — ${form.topic} — ${form.name}`;
    const body = buildBody();

    // نحاول فتح Gmail (ويب). إن تعذر (حظر popup) نستخدم mailto.
    const opened = openGmailCompose(to, subject, body);
    if (!opened) openMailto(to, subject, body);

    setStatus("تم ارسال الطلب");
  }

  return (
    <main className="prayer-page" dir="rtl">
      <section className="prayer-hero">
        <h1 className="prayer-title">اطلب صلاة</h1>
        <p className="prayer-subtitle">لن نخزّن بياناتك. سيتم فتح رسالة بريد جاهزة للإرسال.</p>
      </section>

      <section className="prayer-card">
        <form className="prayer-form" onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="name">الاسم الكامل<span className="req">*</span></label>
              <input id="name" name="name" type="text" placeholder="اكتب اسمك"
                value={form.name} onChange={onChange} autoComplete="name" required />
            </div>

            <div className="form-field">
              <label htmlFor="email">البريد الإلكتروني<span className="req">*</span></label>
              <input id="email" name="email" type="email" placeholder="your@email.com"
                value={form.email} onChange={onChange} autoComplete="email" required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="topic">موضوع الطلب (اختياري)</label>
              <select id="topic" name="topic" value={form.topic} onChange={onChange}>
                <option value="شفاء">شفاء</option>
                <option value="تعزية">تعزية</option>
                <option value="هداية">هداية</option>
                <option value="شكر">شكر</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>

            <div className="form-field checkbox-field">
              <label className="checkbox-label">
                <input type="checkbox" name="canContact"
                  checked={form.canContact} onChange={onChange} />
                يمكن التواصل معي للمتابعة
              </label>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="message">طلب الصلاة<span className="req">*</span></label>
            <textarea id="message" name="message" rows={8} placeholder="اكتب طلبك هنا..."
              value={form.message} onChange={onChange} required />
            <div className="hint">عند الإرسال سيفتح Gmail (ويب) أو برنامج البريد لديك، دون أي تخزين.</div>
          </div>

          {status && <div className="form-status info" role="status">{status}</div>}

          <div className="actions">
            <button type="submit" className="btn-primary">أرسِل الطلب</button>
          </div>
        </form>
      </section>
    </main>
  );
}
