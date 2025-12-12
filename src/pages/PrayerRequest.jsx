import React, { useState } from "react";
import "./PrayerRequest.css";

export default function PrayerRequest() {
  const [form, setForm] = useState({
    name: "",
    country: "",   // ⭐ تمت الإضافة
    message: "",
    topic: "شفاء",
    canContact: false,
    contactInfo: "",
  });

  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("");

    if (!form.message.trim()) {
      setStatus("رجاءً اكتب طلب الصلاة.");
      return;
    }

    setIsSubmitting(true);
    setStatus("جاري إرسال طلبك...");

    try {
      const res = await fetch("/api/contact/prayer-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        throw new Error("Bad status");
      }

      setStatus("شكرًا لك، تم استلام طلب الصلاة وسنرفعه أمام الرب.");

      setForm({
        name: "",
        country: "",  // ⭐ يعاد ضبطه
        message: "",
        topic: "شفاء",
        canContact: false,
        contactInfo: "",
      });
    } catch (err) {
      console.error(err);
      setStatus("حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى لاحقًا.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="prayer-page" dir="rtl">
      <section className="prayer-hero">
        <h1 className="prayer-title">اطلب صلاة</h1>
        <p className="prayer-subtitle">
          يمكنك إرسال طلب الصلاة بدون إدخال بريد إلكتروني. سيتم إرسال الطلب مباشرةً لفريق الصلاة.
        </p>
      </section>

      <section className="prayer-card">
        <form className="prayer-form" onSubmit={handleSubmit} noValidate>

         
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="name">الاسم (اختياري)</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="يمكنك تركه فارغًا"
                value={form.name}
                onChange={onChange}
                autoComplete="name"
              />
            </div>

            <div className="form-field">
              <label htmlFor="country">البلد (اختياري)</label>
              <input
                id="country"
                name="country"
                type="text"
                placeholder=""
                value={form.country}
                onChange={onChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="topic">موضوع الطلب (اختياري)</label>
              <select
                id="topic"
                name="topic"
                value={form.topic}
                onChange={onChange}
              >
                <option value="شفاء">شفاء</option>
                <option value="تعزية">تعزية</option>
                <option value="توبة">توبة</option>
                <option value="شكر">شكر</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field checkbox-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="canContact"
                  checked={form.canContact}
                  onChange={onChange}
                />
                يمكن التواصل معي للمتابعة
              </label>
              <div className="hint">
                إذا رغبت بالتواصل، رجاءً اكتب طريقة مناسبة للتواصل معك.
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="contactInfo">طريقة التواصل (اختياري)</label>
              <input
                id="contactInfo"
                name="contactInfo"
                type="text"
                placeholder="إيميل، رقم هاتف، واتساب..."
                value={form.contactInfo}
                onChange={onChange}
                disabled={!form.canContact}
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="message">
              طلب الصلاة<span className="req">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              rows={8}
              placeholder="اكتب طلبك هنا..."
              value={form.message}
              onChange={onChange}
              required
            />
            <div className="hint">
             سيُرسل طلبك بشكل آمن إلى فريق الصلاة في الإذاعة، وسيتم رفعه في برنامج “نصلّي معًا” على قناتنا للصلاة من أجلك.
            </div>
          </div>

          {status && (
            <div className="form-status info" role="status">
              {status}
            </div>
          )}

          <div className="actions">
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "جارٍ الإرسال..." : "أرسِل الطلب"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
