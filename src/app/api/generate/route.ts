import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

// ─── قراءة مجلد knowledge كذاكرة للـ AI ─────────────────────────────
function buildKnowledge(): string {
  const dir = join(process.cwd(), 'knowledge');
  if (!existsSync(dir)) return '';

  let ctx = '# ذاكرتك — طبّق هذا في كل ردودك:\n\n';

  for (const file of ['rules.md', 'style.md']) {
    const p = join(dir, file);
    if (existsSync(p)) ctx += readFileSync(p, 'utf-8') + '\n\n';
  }

  const exDir = join(dir, 'examples');
  if (existsSync(exDir)) {
    const files = readdirSync(exDir).filter(f => f.endsWith('.py'));
    if (files.length > 0) {
      ctx += '# أمثلة كود مرجعية — اصنع أدوات مشابهة أو أقوى:\n\n';
      for (const f of files) {
        ctx += `## ${f}\n\`\`\`python\n${readFileSync(join(exDir, f), 'utf-8')}\n\`\`\`\n\n`;
      }
    }
  }
  return ctx;
}

// ─── تحميل مفاتيح Groq من .env (GROQ_API_KEY_1 حتى _10) ──────────────
function loadGroqKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`];
    if (k?.trim().startsWith('gsk_')) keys.push(k.trim());
  }
  // دعم GROQ_API_KEY بدون رقم أيضاً
  const single = process.env.GROQ_API_KEY?.trim();
  if (single?.startsWith('gsk_') && !keys.includes(single)) keys.push(single);
  return keys;
}

type Msg = { role: string; content: string };

async function callGroq(key: string, messages: Msg[], ms = 25000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
      signal: ctrl.signal,
    });
    if (res.status === 429) throw new Error('RATE_LIMIT');
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    const data = await res.json();
    const c = data.choices?.[0]?.message?.content;
    if (!c?.trim()) throw new Error('EMPTY');
    return c;
  } finally { clearTimeout(t); }
}

async function callPollinations(messages: Msg[]): Promise<string> {
  const models = ['openai', 'mistral', 'llama'];
  const attempts = models.map(model =>
    (async () => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 40000);
      try {
        const res = await fetch(
          `https://text.pollinations.ai/openai/chat/completions?seed=${Math.floor(Math.random() * 999999)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages, max_tokens: 4096 }),
            signal: ctrl.signal,
          }
        );
        const text = await res.text();
        if (!res.ok || text.startsWith('<')) throw new Error('FAIL');
        const c = JSON.parse(text).choices?.[0]?.message?.content;
        if (!c?.trim()) throw new Error('EMPTY');
        return c;
      } finally { clearTimeout(t); }
    })()
  );
  return Promise.any(attempts);
}

// ─── تناوب تلقائي — يجرب كل مفتاح، لو 429 ينتقل للتالي ───────────────
async function generate(messages: Msg[]): Promise<{ content: string; provider: string }> {
  const keys = loadGroqKeys();

  for (const key of keys) {
    try {
      const content = await callGroq(key, messages);
      return { content, provider: 'Groq' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'RATE_LIMIT') {
        console.log(`[Groq] Rate limit — next key...`);
        continue; // جرّب المفتاح التالي
      }
      console.log(`[Groq] Error: ${msg}`);
    }
  }

  // Pollinations كـ fallback نهائي
  try {
    const content = await callPollinations(messages);
    return { content, provider: 'Pollinations' };
  } catch {
    throw new Error('تعذر الوصول للذكاء الاصطناعي. تأكد من مفاتيح Groq في الإعدادات.');
  }
}

export const maxDuration = 60;

export async function GET() {
  try {
    const keys = loadGroqKeys();
    return NextResponse.json({ activeKeys: keys.length });
  } catch { return NextResponse.json({ activeKeys: 0 }); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });

    const { message, history, apiKey: key, chatId: existingChatId } = body;
    const safeHistory: Msg[] = Array.isArray(history) ? history.slice(-20) : [];

    if (!key?.trim()) return NextResponse.json({ error: 'مفتاح الدخول مطلوب' }, { status: 401 });
    if (!message?.trim()) return NextResponse.json({ error: 'الرسالة مطلوبة' }, { status: 400 });

    const apiKey = await db.apiKey.findUnique({ where: { key: key.trim().toUpperCase() } });
    if (!apiKey) return NextResponse.json({ error: 'مفتاح غير صحيح' }, { status: 401 });
    if (!apiKey.isActive) return NextResponse.json({ error: 'المفتاح معطل' }, { status: 403 });

    const remaining = Math.max(0, apiKey.characterLimit - apiKey.usedCharacters);
    if (remaining === 0) return NextResponse.json({ error: 'خلصت حروفك!', remaining: 0 }, { status: 429 });
    if (message.length > remaining) return NextResponse.json({ error: `الرسالة طويلة. متبقي ${remaining} حرف.`, remaining }, { status: 429 });

    // بناء الرسائل — بدون قطع المحادثة
    const knowledge = buildKnowledge();
    const msgs: Msg[] = [
      ...(knowledge ? [{ role: 'system', content: knowledge }] : []),
      ...safeHistory,
      { role: 'user', content: message.trim() },
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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
