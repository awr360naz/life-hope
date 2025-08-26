// backend/src/server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import programsRouter from "./routes/programs.js"; // صح مع ESM/NodeNext
import programsCompat from "./routes/programs_compat.js";

const app = express();

// CORS + JSON
app.use(cors()); // تقدري تضيفي origin مخصص لاحقًا
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "life-hope-backend", time: new Date().toISOString() });
});

// برامج الأسبوع (كلها تحت هذا المسار)
app.use("/api/content/programs", programsRouter);

// (اختياري) 404 بسيط
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`life-hope backend on http://127.0.0.1:${PORT}`);
});
