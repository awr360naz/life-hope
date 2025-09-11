import React from "react";
import "./ContactPage.css";

export default function ContactPage() {

  const links = {
    facebook: "https://www.facebook.com/AWR360Arabic",
    instagram: "https://www.instagram.com/awr_arabic/",
    tiktok: "https://www.tiktok.com/@awr_arabic",
    youtube: "https://www.youtube.com/channel/UCc6W4vs9rTKvl-5arOBs7WA",
   email: "mailto:hope@awr.org" ,

    whatsapp: "https://wa.me/12409009939?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D8%AA%D9%88%D8%A7%D8%B5%D9%84%20%D8%AD%D9%88%D9%84%20...",
  };

  const items = [
    {
      key: "facebook",
      label: "فيسبوك",
      href: links.facebook,
      svg: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22 12.06C22 6.48 17.52 2 11.94 2S2 6.48 2 12.06c0 5 3.66 9.16 8.44 9.94v-7.03H7.9v-2.9h2.54V9.83c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.9h-2.34V22c4.78-.78 8.44-4.94 8.44-9.94z" />
        </svg>
      ),
    },
    {
      key: "instagram",
      label: "إنستغرام",
      href: links.instagram,
      svg: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5zm6.25-3.25a1.25 1.25 0 1 1-1.25 1.25 1.25 1.25 0 0 1 1.25-1.25z" />
        </svg>
      ),
    },
    {
      key: "tiktok",
      label: "تيكتوك",
      href: links.tiktok,
      svg: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.5 3c.6 2.1 2.2 3.9 4.3 4.6a8 8 0 0 0 1.2.3v3a8.5 8.5 0 0 1-4.9-1.8v6.6a6.6 6.6 0 1 1-6.6-6.6c.4 0 .9 0 1.3.1v3.1c-.4-.1-.9-.1-1.3-.1a3.5 3.5 0 1 0 3.5 3.5V3h2.5z" />
        </svg>
      ),
    } ,
    {
      key: "youtube",
      label: "يوتيوب",
      href: links.youtube,
      svg: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M23 12c0-2.2-.2-3.7-.6-4.6-.3-.8-.9-1.4-1.7-1.7C19.1 5.2 12 5.2 12 5.2s-7.1 0-8.7.5c-.8.3-1.4.9-1.7 1.7C.2 8.3 0 9.8 0 12s.2 3.7.6 4.6c.3.8.9 1.4 1.7 1.7C4.9 18.8 12 18.8 12 18.8s7.1 0 8.7-.5c.8-.3 1.4-.9 1.7-1.7.4-.9.6-2.4.6-4.6zM9.6 15.3v-6l5.8 3-5.8 3z" />
        </svg>
      ),
    },
    {
      key: "email",
      label: "إيميل",
      href: links.email,
      svg: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v.4l-10 6.2L2 6.4V6zm0 2.8 9.3 5.7c.44.27.96.27 1.4 0L22 8.8V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.8z" />
        </svg>
      ),
    },
    {
      key: "whatsapp",
      label: "واتساب",
      href: links.whatsapp,
      svg: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 3.5A10.5 10.5 0 0 0 4.2 17.8L3 21l3.3-1.1A10.5 10.5 0 1 0 20.5 3.5zm-8.4 16.2a8.1 8.1 0 0 1-4.1-1.1l-.3-.2-2.4.8.8-2.3-.2-.3A8.2 8.2 0 1 1 20.2 12a8.2 8.2 0 0 1-8.1 7.7zm4.6-6.2c-.25-.12-1.48-.73-1.7-.82-.23-.08-.4-.12-.57.12-.17.23-.65.81-.8.98-.15.17-.3.18-.55.06-.25-.12-1.04-.38-1.98-1.21-.73-.65-1.23-1.45-1.37-1.7-.15-.25 0-.38.11-.5.1-.1.23-.26.35-.4.12-.13.17-.23.25-.38.08-.15.04-.29-.02-.41-.06-.12-.57-1.37-.78-1.87-.2-.48-.4-.42-.57-.43l-.49-.01c-.17 0-.43.06-.66.3-.23.23-.87.85-.87 2.07s.89 2.4 1.01 2.57c.12.17 1.75 2.66 4.24 3.73.59.25 1.05.4 1.4.51.59.19 1.13.16 1.56.1.48-.07 1.48-.6 1.69-1.18.21-.58.21-1.08.15-1.18-.06-.1-.21-.16-.46-.28z" />
        </svg>
      ),
    },
  ];

  return (
    <main className="contact-page" dir="rtl">
      <section className="contact-hero">
        <h1 className="contact-title">تواصل معنا</h1>
        <p className="contact-subtitle">
          يسعدنا تواصلكم عبر قنواتنا الرسمية. اختَر الوسيلة الأنسب لك:
        </p>
      </section>

      <section className="contact-grid" aria-label="روابط التواصل">
        {items.map((item) => (
          <a
            key={item.key}
            href={item.href}
            className={`contact-card contact-${item.key}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.label}
            title={item.label}
          >
            <span className="icon-wrap">{item.svg}</span>
            <span className="contact-label">{item.label}</span>
          </a>
        ))}
      </section>

      <footer className="contact-footer">
        <p>
          تفضّل بمراسلتنا في أي وقت، ونعود إليك بأقرب فرصة.
        </p>
      </footer>
    </main>
  );
}
