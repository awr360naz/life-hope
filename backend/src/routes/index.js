import { Router } from "express";
import contentRoutes from "./content.routes.js";
import contactRoutes from "./contact.routes.js";


const router = Router();

router.use("/content", contentRoutes);
router.use("/contact", contactRoutes);

export default router;
