import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function getSystemPrompt(): string {
  try { 
    const path = join(process.cwd(), 'system-prompt.txt');
    if (!existsSync(path)) return '';
    // تقليم حجم الملف البرمجي لمنع انفجار الـ Context Window وخطأ الـ 413
    return readFileSync(path, 'utf-8').trim().slice(0, 2000); 
  }
  catch { return ''; }
}

type Msg = { role: string; content: string };

// ─── OpenAI-compatible helper ─────────────────────────────────────────
async function fetchAI(url: string, model: string, messages: Msg[], apiKey?: string, ms = 20000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    
    // ضبط وتثبيت الـ max_tokens لمنع تعليق السيرفرات والـ Timeout على Vercel
    const res = await fetch(url, {
      method: 'POST', headers, signal: ctrl.signal,
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 2048 }),
    });
    const text = await res.text();
    if (text.trim().startsWith('<')) throw new Error(`HTML (${res.status})`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 100)}`);
    
    const data = JSON.parse(text);
    const c = data?.choices?.[0]?.message?.content;
    if (!c?.trim()) throw new Error('empty response');
    return c;
  } finally { clearTimeout(t); }
}

// ─── Providers ────────────────────────────────────────────────────────

// Groq — نظام التدوين والتبديل التلقائي بين 3 مفاتيح
async function withGroq(msgs: Msg[]) {
  const keys = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter(Boolean);

  if (keys.length === 0) throw new Error('لا توجد مفاتيح لموقع Groq في ملف الإعدادات');

  const shuffledKeys = [...keys].sort(() => Math.random() - 0.5);
  let lastError: any = null;

  // التحويل للموديل الخفيف والموفر للاستهلاك لتجنب الحظر المتكرر بالدقيقة
  const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

  for (const key of shuffledKeys) {
    try {
      return await fetchAI(
        'https://groq.com',
        model,
        msgs,
        key
      );
    } catch (e) {
      lastError = e;
      console.warn(`[Groq] فشل أحد المفاتيح، جاري الانتقال للمفتاح البديل تلقائياً...`);
    }
  }

  throw lastError || new Error('فشلت جميع مفاتيح Groq المتاحة');
}

// Together AI — مجاني بمفتاح
async function withTogether(msgs: Msg[]) {
  const key = process.env.TOGETHER_API_KEY;
  if (!key) throw new Error('no key');
  return fetchAI('https://together.xyz',
    process.env.TOGETHER_MODEL || 'meta-llama/Meta-Llama-3-8B-Instruct-Turbo', msgs, key);
}

// OpenRouter — مجاني بمفتاح
async function withOpenRouter(msgs: Msg[]) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('no key');
  return fetchAI('https://openrouter.ai',
    process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free', msgs, key);
}

// Cerebras — مجاني بمفتاح
async function withCerebras(msgs: Msg[]) {
  const key = process.env.CEREBRAS_API_KEY;
  if (!key) throw new Error('no key');
  return fetchAI('https://cerebras.ai',
    process.env.CEREBRAS_MODEL || 'llama3.1-8b', msgs, key);
}

// Pollinations — بدون مفتاح (fallback)
async function withPollinations(msgs: Msg[]) {
  const models = ['openai', 'mistral', 'llama', 'deepseek'];
  const attempts = models.map(model =>
    fetchAI(
      `https://pollinations.ai{Math.floor(Math.random()*999999)}`,
      model, msgs, undefined, 25000
    ).then(c => ({ c, p: `Pollinations(${model})` }))
  );
  const r = await Promise.any(attempts);
  return r;
}

// ─── Auto rotate ──────────────────────────────────────────────────────
async function generate(messages: Msg[]): Promise<{ content: string; provider: string }> {
  const providers = [
    { name: 'Groq',       fn: withGroq,        active: !!(process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY_2 || process.env.GROQ_API_KEY_3) },
    { name: 'Cerebras',   fn: withCerebras,    active: !!process.env.CEREBRAS_API_KEY },
    { name: 'Together',   fn: withTogether,    active: !!process.env.TOGETHER_API_KEY },
    { name: 'OpenRouter', fn: withOpenRouter,  active: !!process.env.OPENROUTER_API_KEY },
  ];

  const errors: string[] = [];

  for (const p of providers) {
    if (!p.active) continue;
    try {
      console.log(`[AI] Trying ${p.name}...`);
      const content = await p.fn(messages);
      console.log(`[AI] ✓ ${p.name}`);
      return { content, provider: p.name };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${p.name}: ${msg}`);
      console.log(`[AI] ✗ ${p.name}: ${msg}`);
    }
  }

  try {
    console.log('[AI] Trying Pollinations...');
    const r = await withPollinations(messages);
    console.log(`[AI] ✓ ${r.p}`);
    return { content: r.c, provider: r.p };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`Pollinations: ${msg}`);
    console.log(`[AI] ✗ Pollinations: ${msg}`);
  }

  const hasNoKeys = providers.every(p => !p.active);
  if (hasNoKeys) {
    throw new Error('لا يوجد مفتاح API. أضف GROQ_API_KEY_1 في ملف .env');
  }
  throw new Error(`فشل الاتصال بالذكاء الاصطناعي. الأخطاء: ${errors.join(' | ')}`);
}

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    let body: { message?: string; history?: Msg[]; apiKey?: string; chatId?: string };
    try { body = JSON.parse(await request.text()); }
    catch { return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 }); }

    const { message, history = [], apiKey: key, chatId: existingChatId } = body;

    if (!key) return NextResponse.json({ error: 'مفتاح الدخول مطلوب' }, { status: 401 });
    if (!message) return NextResponse.json({ error: 'الرسالة مطلوبة' }, { status: 400 });

    const apiKey = await db.apiKey.findUnique({ where: { key: key.trim().toUpperCase() } });
    if (!apiKey) return NextResponse.json({ error: 'مفتاح غير صحيح' }, { status: 401 });
    if (!apiKey.isActive) return NextResponse.json({ error: 'المفتاح معطل' }, { status: 403 });

    const remaining = Math.max(0, apiKey.characterLimit - apiKey.usedCharacters);
    if (remaining === 0)
      return NextResponse.json({ error: 'خلصت حروفك! تحتاج مفتاح جديد.', remaining: 0 }, { status: 429 });
    if (message.length > remaining)
      return NextResponse.json({ error: `الرسالة طويلة. متبقي ${remaining} حرف.`, remaining }, { status: 429 });

    const systemPrompt = getSystemPrompt();
    const msgs: Msg[] = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...history,
      { role: 'user', content: message },
    ];

    const { content, provider } = await generate(msgs);

    const chatId = existingChatId || `chat-${apiKey.id.slice(0, 8)}-${Date.now().toString(36)}`;

    await db.chatMessage.createMany({
      data: [
        { apiKeyId: apiKey.id, chatId, role: 'user', content: message },
        { apiKeyId: apiKey.id, chatId, role: 'assistant', content, provider },
      ],
    });

    const updated = await db.apiKey.update({
      where: { id: apiKey.id },
      data: { usedCharacters: { increment: message.length } },
    });

    return NextResponse.json({
      response: content, provider, chatId,
      remaining: Math.max(0, updated.characterLimit - updated.usedCharacters),
      characterLimit: updated.characterLimit,
      usedCharacters: updated.usedCharacters,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'خطأ داخلي';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
