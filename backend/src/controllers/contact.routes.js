// src/routes/contact.routes.js
import { Router } from "express";
import { sendPrayer, sendContact } from "../controllers/contact.controller.js";
import { validate } from "../lib/validate.js";

const r = Router();

r.post("/prayer", validate("prayer"), sendPrayer);
r.post("/message", validate("contact"), sendContact);

export default r;
