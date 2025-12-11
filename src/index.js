import "./index.css";

import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// ==== Sentry بسيط للأخطاء فقط ====
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  // بنقدر نستخدم tracesSampleRate=0 أو نشيلها تمامًا
  // بس نخلي الإعداد بسيط وواضح
});
// =================================

function Root() {
  useEffect(() => {
    const lang = navigator.language || navigator.userLanguage || "en";
    const shortLang = lang.split("-")[0];

    const rtlLangs = ["ar", "he", "fa", "ur"];
    const dir = rtlLangs.includes(shortLang) ? "rtl" : "ltr";

    document.documentElement.setAttribute("lang", shortLang);
    document.documentElement.setAttribute("dir", dir);
  }, []);

  return <App />;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<Root />);
