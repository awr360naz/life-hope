// backend/src/routes/programs.ts
import { Router } from "express";
import { supabase } from "../supabaseClient.js";
const router = Router();
// اسم جدولك في Supabase: غيّريه لو مختلف
const TABLE = "programs";
function tzWeekday(tz = "Asia/Jerusalem") {
    return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: tz }).format(new Date());
}
// GET /api/content/programs/today
router.get("/today", async (_req, res) => {
    const day = tzWeekday("Asia/Jerusalem"); // Sunday..Saturday
    try {
        const { data, error, status } = await supabase
            .from(TABLE)
            .select("day,title,items,notes,updated_at")
            .eq("day", day)
            .maybeSingle(); // ✅ يمنع خطأ "Cannot coerce..."
        if (error) {
            console.error("Supabase error (today):", status, error.message);
            return res.status(500).json({ error: error.message });
        }
        if (!data) {
            return res.status(404).json({ error: `No program for ${day}` });
        }
        // items قد تكون jsonb أو نص JSON — نحاول نفكّها
        let items = data.items;
        if (typeof items === "string") {
            try {
                items = JSON.parse(items);
            }
            catch { }
        }
        return res.json({ ok: true, program: { ...data, items } });
    }
    catch (e) {
        console.error("programs/today error:", e);
        return res.status(500).json({ error: e?.message || String(e) });
    }
});
// GET /api/content/programs/:day  (مثلاً Monday)
router.get("/:day", async (req, res) => {
    const day = String(req.params.day || "").trim();
    try {
        const { data, error, status } = await supabase
            .from(TABLE)
            .select("day,title,items,notes,updated_at")
            .eq("day", day)
            .maybeSingle();
        if (error) {
            console.error("Supabase error (by day):", status, error.message);
            return res.status(500).json({ error: error.message });
        }
        if (!data) {
            return res.status(404).json({ error: `No program for ${day}` });
        }
        let items = data.items;
        if (typeof items === "string") {
            try {
                items = JSON.parse(items);
            }
            catch { }
        }
        return res.json({ ok: true, program: { ...data, items } });
    }
    catch (e) {
        console.error("programs/:day error:", e);
        return res.status(500).json({ error: e?.message || String(e) });
    }
});
export default router;
