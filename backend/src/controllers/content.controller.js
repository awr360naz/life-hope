import { supabase } from "../supabaseClient.js"; 
const PROGRAMS_TABLE    = process.env.PROGRAMS_TABLE    || "programs";
const THIRD_FRAME_TABLE = process.env.THIRD_FRAME_TABLE || "home_third_frame_items";

// ===== برنامج اليوم (الإطار 2)
export async function getProgramToday(req, res) {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: "Supabase not configured (env missing)" });

  const day = new Date().toLocaleString("en-US", { weekday: "long", timeZone: "Asia/Jerusalem" });
  try {
    const { data, error } = await sb
      .from(PROGRAMS_TABLE)
      .select("*")
      .eq("day", day)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data)  return res.status(404).json({ error: "Not found" });

    return res.json({ ok: true, program: data });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}

// ===== برنامج يوم معيّن (اختياري)
export async function getProgramByDay(req, res) {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: "Supabase not configured (env missing)" });

  const raw = String(req.params.day || "").toLowerCase();
  const map = { sun:"Sunday", sunday:"Sunday", mon:"Monday", monday:"Monday", tue:"Tuesday", tuesday:"Tuesday", wed:"Wednesday", wednesday:"Wednesday", thu:"Thursday", thursday:"Thursday", fri:"Friday", friday:"Friday", sat:"Saturday", saturday:"Saturday" };
  const Day = map[raw] || (raw ? raw[0].toUpperCase() + raw.slice(1) : "");
  if (!Day) return res.status(400).json({ error: "Bad day param" });

  try {
    const { data, error } = await sb
      .from(PROGRAMS_TABLE)
      .select("*")
      .eq("day", Day)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data)  return res.status(404).json({ error: "Not found" });

    return res.json({ ok: true, program: data });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}

// ===== الإطار الثالث (نص + صورة)
export async function getHomeThirdFrame(req, res) {
  const sb = getSupabase();
  if (!sb) return res.status(500).json({ error: "Supabase not configured (env missing)" });

  try {
    const { data, error } = await sb
      .from(THIRD_FRAME_TABLE)
      .select("*")
      .limit(1);

    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: "Not found" });

    const row = data[0];
    return res.json({
      ok: true,
      content: {
        title: row.title ?? "—",
        body: row.body ?? row.text ?? "",
        image_url: row.image_url ?? row.img ?? null,
        updated_at: row.updated_at ?? null,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
export const getLive = (_req, res) => {
  const live = {
    title: "البث المباشر",
    iframeSrc: "https://closeradio.tv/awrara/", // بدّليه إذا لزم
  };
  res.json(live);
};

export const getArticles = (_req, res) => {
  const items = [
    { id: 1, title: "مقال 1", slug: "article-1", summary: "ملخّص قصير", image: "/images/a1.jpg" },
    { id: 2, title: "مقال 2", slug: "article-2", summary: "ملخّص قصير", image: "/images/a2.jpg" },
  ];
  res.json(items);
};

export const getPrograms = (_req, res) => {
  const items = [
    { id: 1, title: "برنامج 1", time: "18:00", image: "/images/p1.jpg" },
    { id: 2, title: "برنامج 2", time: "19:00", image: "/images/p2.jpg" },
  ];
  res.json(items);
};
