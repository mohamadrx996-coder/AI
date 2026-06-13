import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

// دالة مساعدة لعمل تأخير زمني لمنع التعليق المستمر
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// ─── قراءة مجلد knowledge كذاكرة للـ AI ─────────────────────────────
function buildKnowledgeContext(): string {
  const knowledgeDir = join(process.cwd(), 'knowledge');
  if (!existsSync(knowledgeDir)) return '';

  let context = '=== ذاكرة الـ AI — اقرأ هذا جيداً وطبّقه ===\n\n';

  // قراءة ملفات .md (القواعد والأسلوب)
  const mdFiles = ['rules.md', 'style.md'];
  for (const file of mdFiles) {
    const path = join(knowledgeDir, file);
    if (existsSync(path)) {
      context += `── ${file} ──\n${readFileSync(path, 'utf-8')}\n\n`;
    }
  }

  // قراءة أمثلة الكود
  const examplesDir = join(knowledgeDir, 'examples');
  if (existsSync(examplesDir)) {
    context += '=== أمثلة أكواد مرجعية ===\n\n';
    const files = readdirSync(examplesDir).filter(f => f.endsWith('.py'));
    for (const file of files) {
      const content = readFileSync(join(examplesDir, file), 'utf-8');
      context += `── ${file} ──\n\`\`\`python\n${content}\n\`\`\`\n\n`;
    }
  }

  context += '=== نهاية الذاكرة — طبّق كل ما سبق في ردودك ===\n';
  return context;
}

// ─── قراءة كل مفاتيح Groq من groq-keys.json ─────────────────────────
function loadGroqKeys(): string[] {
  const keys: string[] = [];

  // من .env
  const envKey = process.env.GROQ_API_KEY;
  if (envKey?.startsWith('gsk_')) keys.push(envKey);

  // من groq-keys.json
  try {
    const path = join(process.cwd(), 'groq-keys.json');
    if (existsSync(path)) {
      const data = JSON.parse(readFileSync(path, 'utf-8'));
      for (const k of data.keys || []) {
        if (k?.startsWith('gsk_') && !keys.includes(k)) keys.push(k);
      }
    }
  } catch {}

  return keys;
}

type Msg = { role: string; content: string };

async function fetchAI(url: string, model: string, messages: Msg[], apiKey?: string, ms = 25000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    const res = await fetch(url, {
      method: 'POST', headers, signal: ctrl.signal,
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 4096 }),
    });
    const text = await res.text();
    if (text.trim().startsWith('<')) throw new Error(`HTML ${res.status}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = JSON.parse(text);
    const c = data.choices?.[0]?.message?.content;
    if (!c?.trim()) throw new Error('empty');
    return c;
  } finally { clearTimeout(t); }
}

// ─── Groq مع تناوب تلقائي على كل المفاتيح ───────────────────────────
async function withGroqRotation(messages: Msg[]): Promise<{ content: string; provider: string }> {
  const keys = loadGroqKeys();
  if (keys.length === 0) throw new Error('لا توجد مفاتيح Groq');
  
  // تم تغيير النموذج الافتراضي إلى الحجم الأخف والأسرع لتجنب حظر الـ Rate Limit والتعليق المتكرر
  const model = process.env.GROQ_MODEL || 'llama-3-8b-instruct';
  
  for (const key of keys) {
    try {
      const content = await fetchAI('https://api.groq.com/openai/v1/chat/completions', model, messages, key);
      return { content, provider: `Groq` };
    } catch (e) {
      console.log(`[Groq] مفتاح فشل: ${key.slice(-6)} — ${e instanceof Error ? e.message : e}`);
      // انتظر ثانيتين قبل تجربة المفتاح التالي لحماية الحساب من التجميد والتعليق المتتابع
      await delay(2000);
    }
  }
  throw new Error('كل مفاتيح Groq فشلت بسبب تخطي حد الطلبات أو انتهاء الصلاحية');
}

// ─── Pollinations fallback ────────────────────────────────────────────
async function withPollinations(messages: Msg[]): Promise<{ content: string; provider: string }> {
  const models = ['openai', 'mistral', 'llama', 'deepseek'];
  const attempts = models.map(model =>
    fetchAI(
      `https://text.pollinations.ai/openai/chat/completions?seed=${Math.floor(Math.random() * 999999)}`,
      model, messages, undefined, 40000
    ).then(c => ({ content: c, provider: `Pollinations(${model})` }))
  );
  return Promise.any(attempts);
}

async function generate(messages: Msg[]): Promise<{ content: string; provider: string }> {
  try { return await withGroqRotation(messages); } catch (e) {
    console.log('[AI] Groq failed, trying Pollinations...', e instanceof Error ? e.message : e);
  }
  try { return await withPollinations(messages); } catch (e) {
    console.log('[AI] Pollinations failed:', e instanceof Error ? e.message : e);
  }
  throw new Error('تعذر الوصول للذكاء الاصطناعي. تحقق من مفاتيح Groq في groq-keys.json');
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
    if (remaining === 0) return NextResponse.json({ error: 'خلصت حروفك!', remaining: 0 }, { status: 429 });
    if (message.length > remaining) return NextResponse.json({ error: `الرسالة طويلة. متبقي ${remaining} حرف.`, remaining }, { status: 429 });

    // بناء الرسائل مع الذاكرة
    const knowledge = buildKnowledgeContext();
    const systemContent = knowledge || '';

    const messages: Msg[] = [
      ...(systemContent ? [{ role: 'system', content: systemContent }] : []),
      ...history,
      { role: 'user', content: message },
    ];

    const { content, provider } = await generate(messages);
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
