import express, { Request, Response } from 'express';
import supabase from '../lib/supabase.js';

const router = express.Router();

type ProgramItem = { t: string };
type Program = {
  day: 'Sunday'|'Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday';
  title: string;
  items: ProgramItem[];
  notes: string | null;
  updated_at: string;
};

// نحصل على اسم اليوم بحسب Asia/Jerusalem
function getTodayName(): Program['day'] {
  const day = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: 'Asia/Jerusalem'
  }).format(new Date()) as Program['day'];
  return day;
}

// ترتيب ثابت للأيام (مفيد للقوائم)
const DAY_ORDER: Program['day'][] = [
  'Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'
];

// GET /api/content/programs          → جميع الأيام
router.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .in('day', DAY_ORDER);

  if (error) return res.status(500).json({ error: error.message });

  // نرتّبها حسب الترتيب الثابت
  const sorted = (data ?? []).sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
  );

  res.json({ ok: true, programs: sorted });
});

// **مهم**: ضعي هذا قبل مسار :day حتى لا يلتهمه
// GET /api/content/programs/today    → برنامج اليوم (حسب Asia/Jerusalem)
router.get('/today', async (_req: Request, res: Response) => {
  const today = getTodayName();
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('day', today)
    .single(); // مضمونة صف واحد لأن day = PK

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, program: data });
});

// GET /api/content/programs/:day     → برنامج يوم معيّن
router.get('/:day', async (req: Request, res: Response) => {
  const dayParam = String(req.params.day);
  // نوحّد الحرف الأول كبير والباقي صغير ليتطابق مع القيم في الجدول
  const day = (dayParam[0].toUpperCase() + dayParam.slice(1).toLowerCase()) as Program['day'];

  if (!DAY_ORDER.includes(day)) {
    return res.status(400).json({ error: 'Invalid day. Use Sunday..Saturday' });
  }

  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('day', day)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, program: data });
});

// (اختياري) PUT /api/content/programs/:day  → تحديث نفس اليوم
router.put('/:day', async (req: Request, res: Response) => {
  const dayParam = String(req.params.day);
  const day = (dayParam[0].toUpperCase() + dayParam.slice(1).toLowerCase()) as Program['day'];

  const { title, items, notes } = req.body ?? {};
  if (!title || !Array.isArray(items)) {
    return res.status(400).json({ error: 'title (string) & items (array) are required' });
  }

  const payload: Partial<Program> = {
    title,
    items,
    notes: notes ?? null,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('programs')
    .update(payload)
    .eq('day', day)
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, program: data });
});

export default router;
