// backend/src/routes/content.routes.js
import { Router } from "express";
import {
  getLive,
  getArticles,
  getPrograms,
  getProgramToday,   // جديد
  getProgramByDay,   // اختياري
  getHomeThirdFrame  // جديد
} from "../controllers/content.controller.js";

const r = Router();

r.get("/live", getLive);
r.get("/articles", getArticles);
r.get("/programs", getPrograms);

// مسارات إضافية للإطارين 2 و3
r.get("/programs/today", getProgramToday);
r.get("/programs/:day", getProgramByDay);
r.get("/home-third-frame", getHomeThirdFrame);

export default r;
