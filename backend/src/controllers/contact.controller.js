import { getSupabase } from "../supabaseClient.js";

// اتركي بقية الدوال كما هي: getLive, getArticles, getPrograms ...

export async function getHomeThirdFrame(req, res) {
  const sb = getSupabase();
  if (!sb) {
    return res.status(500).json({ error: "Supabase not configured (env missing)" });
  }

  try {
    const { data, error } = await sb
      .from("home_third_frame_items")
      .select("*")
      .limit(1);

    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: "Not found" });

    const row = data[0];
    res.json({
      ok: true,
      content: {
        title: row.title ?? "—",
        body: row.body ?? row.text ?? "",
        image_url: row.image_url ?? row.img ?? null,
      },
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
