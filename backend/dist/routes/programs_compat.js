import express from "express";
import supabase from "../lib/supabase.js";
const DAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function normDay(input) {
    if (!input)
        return null;
    const d = (input[0].toUpperCase() + input.slice(1).toLowerCase());
    return DAY_ORDER.includes(d) ? d : null;
}
function getTodayName() {
    return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        timeZone: "Asia/Jerusalem",
    }).format(new Date());
}
const router = express.Router();
/**
 * GET /api/programs/today
 * يعيد برنامج اليوم (Asia/Jerusalem)
 */
router.get("/today", async (_req, res) => {
    const today = getTodayName();
    const { data, error } = await supabase
        .from("programs")
        .select("*")
        .eq("day", today)
        .single();
    if (error)
        return res.status(500).json({ error: error.message });
    res.json({ ok: true, program: data });
});
/**
 * GET /api/programs/week
 * يعيد جميع الأيام مرتبة من الأحد للسبت
 */
router.get("/week", async (_req, res) => {
    const { data, error } = await supabase.from("programs").select("*");
    if (error)
        return res.status(500).json({ error: error.message });
    const sorted = (data ?? []).sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));
    res.json({ ok: true, programs: sorted });
});
/**
 * PUT /api/programs/week
 * يستقبل مصفوفة برامج لتحديث الأسبوع دفعة واحدة (upsert حسب day)
 * الشكل المتوقع:
 * { programs: [{ day, title, items, notes? }, ...] }
 */
router.put("/week", async (req, res) => {
    const body = req.body ?? {};
    const programs = Array.isArray(body.programs) ? body.programs : [];
    if (!Array.isArray(programs) || programs.length === 0) {
        return res.status(400).json({ error: "Body must be { programs: Program[] }" });
    }
    // تحقّق بسيط وحوّل day للأسماء القياسية
    const payload = programs.map((p) => {
        const day = p.day ? normDay(String(p.day)) : null;
        if (!day)
            throw new Error("Invalid/missing day in one of programs");
        if (typeof p.title !== "string" || !Array.isArray(p.items)) {
            throw new Error("Each program needs title:string and items:array");
        }
        return {
            day,
            title: p.title,
            items: p.items,
            notes: p.notes ?? null,
            updated_at: new Date().toISOString(),
        };
    });
    try {
        const { data, error } = await supabase
            .from("programs")
            .upsert(payload, { onConflict: "day" }) // PK = day
            .select("*");
        if (error)
            return res.status(500).json({ error: error.message });
        const sorted = (data ?? []).sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));
        res.json({ ok: true, programs: sorted });
    }
    catch (e) {
        res.status(400).json({ error: e?.message || "Invalid payload" });
    }
});
/**
 * PATCH /api/programs/day/:day
 * تحديث جزئي ليوم واحد (title/items/notes)
 * body مثال: { title?: "...", items?: [{t:"..."}], notes?: "..." }
 */
router.patch("/day/:day", async (req, res) => {
    const day = normDay(String(req.params.day));
    if (!day)
        return res.status(400).json({ error: "Invalid day param" });
    const { title, items, notes } = req.body ?? {};
    const patch = { updated_at: new Date().toISOString() };
    if (typeof title !== "undefined") {
        if (typeof title !== "string" || !title.trim()) {
            return res.status(400).json({ error: "title must be a non-empty string" });
        }
        patch.title = title;
    }
    if (typeof items !== "undefined") {
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: "items must be an array" });
        }
        patch.items = items;
    }
    if (typeof notes !== "undefined") {
        patch.notes = notes ?? null;
    }
    const { data, error } = await supabase
        .from("programs")
        .update(patch)
        .eq("day", day)
        .select("*")
        .single();
    if (error)
        return res.status(500).json({ error: error.message });
    res.json({ ok: true, program: data });
});
export default router;
