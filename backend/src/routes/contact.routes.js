import { Router } from "express";

const router = Router();

router.get("/__ping", (_req, res) => {
  res.json({ ok: true });
});

router.post("/prayer", (req, res) => {
  res.json({ ok: true, echo: req.body });
});

export default router;
