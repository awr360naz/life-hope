// src/routes/content.routes.js
import { Router } from "express";
import { getLive, getArticles, getPrograms } from "../controllers/content.controller.js";

const r = Router();

r.get("/live", getLive);          // معلومات البث
r.get("/articles", getArticles);  // قائمة المقالات
r.get("/programs", getPrograms);  // قائمة البرامج

export default r;
