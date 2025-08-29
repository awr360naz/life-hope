// backend/src/supabaseClient.ts
import "dotenv/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Lazy-init Supabase client.
 * يرجّع null إذا كانت متغيّرات البيئة ناقصة (السيرفر يبقى شغّال).
 */
export function getSupabase(): SupabaseClient | null {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("⚠️ Supabase env vars missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE/ANON_KEY in backend/.env");
    }
    return null; // لا نرمي خطأ — نخلي الـ endpoints تتصرف وتعيد رسالة واضحة
  }

  client = createClient(url, key);
  return client;
}

/**
 * تصدير توافقي — قد يكون null إذا .env ناقص.
 * يفضَّل استخدام getSupabase() في الكود الجديد.
 */
export const supabase = getSupabase();
