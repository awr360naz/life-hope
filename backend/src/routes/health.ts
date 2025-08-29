// backend/src/routes/health.ts
import { Router } from "express";
const r = Router();

r.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "life-hope-backend",
    time: new Date().toISOString(),
  });
});

export default r;
