import express from "express";
import { getSupabase } from "../supabaseClient.js";

const router = express.Router();

router.post("/visit", async (req, res) => {
  const supabase = getSupabase();

  // نجيب الرقم الحالي
  const { data: current, error: fetchError } = await supabase
    .from("site_counter")
    .select("count")
    .eq("id", 1)
    .single();

  if (fetchError) {
    return res.status(500).json({ error: fetchError.message });
  }

  const newCount = current.count + 1;

  // نحدث الرقم
  const { error: updateError } = await supabase
    .from("site_counter")
    .update({ count: newCount })
    .eq("id", 1);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  res.json({ count: newCount });
});

export default router;