import { Router } from "express";
import { getSupabase } from "../supabaseClient.js";

const router = Router();


// GET /api/content/search?q=term&limit=20
router.get("/search", async (req, res) => {
const qRaw = (req.query.q as string) || "";
const q = qRaw.trim();
const limit = Math.min(parseInt(String(req.query.limit || 20), 10) || 20, 50);


if (!q) return res.json([]);


const term = `%${q}%`;


try {
const supabase = getSupabase();


// 1) Articles
const { data: arts, error: e1 } = await supabase
.from("articles")
.select("id, title, content, cover_url")
.or(`title.ilike.${term},content.ilike.${term}`)
.limit(limit);


if (e1) throw e1;


// 2) Programs
const { data: progs, error: e2 } = await supabase
.from("programs_catalog")
.select("id, title, content, cover_url")
.or(`title.ilike.${term},content.ilike.${term}`)
.limit(limit);


if (e2) throw e2;


// Normalize results to a single array
const results = [
...(arts || []).map((r) => ({
type: "article" as const,
id: r.id,
title: r.title,
snippet: (r.content || "").slice(0, 180),
cover_url: r.cover_url || null,
})),
...(progs || []).map((r) => ({
type: "program" as const,
id: r.id,
title: r.title,
snippet: (r.content || "").slice(0, 180),
cover_url: r.cover_url || null,
})),
]
// simple relevance sort: title hit first
.sort((a, b) => {
const at = a.title.toLowerCase().includes(q.toLowerCase()) ? 0 : 1;
const bt = b.title.toLowerCase().includes(q.toLowerCase()) ? 0 : 1;
if (at !== bt) return at - bt;
return a.title.localeCompare(b.title, "ar");
})
.slice(0, limit);


res.json(results);
} catch (err: any) {
res.status(500).json({ error: err?.message || "Server error" });
}
});


export default router;