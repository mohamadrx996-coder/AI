import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── قراءة مفاتيح Groq من .env ───────────────────────────────────────
function loadGroqKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`]?.trim();
    if (k?.startsWith('gsk_')) keys.push(k);
  }
  const single = process.env.GROQ_API_KEY?.trim();
  if (single?.startsWith('gsk_') && !keys.includes(single)) keys.push(single);
  return keys;
}

type Msg = { role: string; content: string };

// ─── أخف وأسرع نماذج Groq — مرتبة من الأسرع للأبطأ ─────────────────
// نموذج واحد ثابت — الأخف والأسرع المتاح على Groq
const GROQ_MODEL = 'llama-3.1-8b-instant';

async function callGroq(key: string, messages: Msg[]): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 28000);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.7, max_tokens: 1024 }),
      signal: ctrl.signal,
    });
    if (res.status === 429) throw new Error('RATE_LIMIT');
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`HTTP_${res.status}: ${txt.slice(0, 80)}`);
    }
    const data = await res.json();
    const c = data.choices?.[0]?.message?.content;
    if (!c?.trim()) throw new Error('EMPTY_RESPONSE');
    return c;
  } finally { clearTimeout(t); }
}

// ─── Pollinations fallback ────────────────────────────────────────────
async function callPollinations(messages: Msg[]): Promise<string> {
  const models = ['openai', 'mistral', 'llama'];
  const errors: string[] = [];

  for (const model of models) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 35000);
    try {
      const res = await fetch(
        `https://text.pollinations.ai/openai/chat/completions?seed=${Math.floor(Math.random() * 99999)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages, max_tokens: 1024 }),
          signal: ctrl.signal,
        }
      );
      const text = await res.text();
      if (!res.ok || text.trim().startsWith('<')) throw new Error(`HTTP_${res.status}`);
      const data = JSON.parse(text);
      const c = data.choices?.[0]?.message?.content;
      if (c?.trim()) return c;
      throw new Error('EMPTY');
    } catch (e) {
      errors.push(`${model}: ${e instanceof Error ? e.message : e}`);
    } finally {
      clearTimeout(t);
    }
  }
  throw new Error(`Pollinations failed: ${errors.join(' | ')}`);
}

// ─── الدالة الرئيسية ──────────────────────────────────────────────────
async function generate(messages: Msg[]): Promise<{ content: string; provider: string }> {
  const keys = loadGroqKeys();
  const errors: string[] = [];

  for (const key of keys) {
    try {
      const content = await callGroq(key, messages);
      return { content, provider: 'Groq' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Groq[...${key.slice(-4)}]: ${msg}`);
      console.log(`[Groq] ${msg}`);
    }
  }

  try {
    const content = await callPollinations(messages);
    return { content, provider: 'Pollinations' };
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  // إرجاع الأخطاء الحقيقية للمساعدة في التشخيص
  throw new Error(`فشل الاتصال — ${errors.join(' | ')}`);
}

export const maxDuration = 60;

export async function GET() {
  const keys = loadGroqKeys();
  return NextResponse.json({ activeKeys: keys.length });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });

    const { message, history, apiKey: key, chatId: existingChatId } = body;
    // آخر تبادل كامل (رسالة المستخدم + رد AI) — ثابت مهما طال الشات
  const safeHistory: Msg[] = (() => {
    if (!Array.isArray(history) || history.length === 0) return [];
    const last2 = history.slice(-2).map(m => ({
      role: m.role as string,
      content: String(m.content).slice(0, 200), // 200 حرف كحد أقصى لكل رسالة
    }));
    return last2;
  })();

    if (!key?.trim()) return NextResponse.json({ error: 'مفتاح الدخول مطلوب' }, { status: 401 });
    if (!message?.trim()) return NextResponse.json({ error: 'الرسالة مطلوبة' }, { status: 400 });

    const apiKey = await db.apiKey.findUnique({ where: { key: key.trim().toUpperCase() } });
    if (!apiKey) return NextResponse.json({ error: 'مفتاح غير صحيح' }, { status: 401 });
    if (!apiKey.isActive) return NextResponse.json({ error: 'المفتاح معطل' }, { status: 403 });

    const remaining = Math.max(0, apiKey.characterLimit - apiKey.usedCharacters);
    if (remaining === 0) return NextResponse.json({ error: 'خلصت حروفك!', remaining: 0 }, { status: 429 });
    if (message.length > remaining) return NextResponse.json({ error: `متبقي ${remaining} حرف فقط.`, remaining }, { status: 429 });

    // System prompt بسيط بدون قراءة ملفات
    const systemPrompt = process.env.SYSTEM_PROMPT || '';

    const msgs: Msg[] = [
      ...safeHistory,
      { role: 'user', content: message.trim().slice(0, 700) },
    ];

    const { content, provider } = await generate(msgs);
    const chatId = existingChatId || `c-${Date.now().toString(36)}`;

    await db.chatMessage.createMany({
      data: [
        { apiKeyId: apiKey.id, chatId, role: 'user', content: message.trim() },
        { apiKeyId: apiKey.id, chatId, role: 'assistant', content, provider },
      ],
    });

    const updated = await db.apiKey.update({
      where: { id: apiKey.id },
      data: { usedCharacters: { increment: message.length } },
    });

    return NextResponse.json({
      response: content,
      provider,
      chatId,
      remaining: Math.max(0, updated.characterLimit - updated.usedCharacters),
      characterLimit: updated.characterLimit,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'خطأ داخلي';
    console.error('[Generate Error]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
