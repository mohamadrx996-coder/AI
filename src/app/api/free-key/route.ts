import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// فحص مفتاح Groq 100% دقيق
async function validateGroqKey(key: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 401) return { valid: false, error: 'المفتاح غير صحيح أو منتهي الصلاحية' };
    if (res.status === 429) return { valid: false, error: 'المفتاح صحيح لكن تجاوز الحد اليومي — جرب غداً' };
    if (res.status === 403) return { valid: false, error: 'المفتاح محظور' };
    if (!res.ok)            return { valid: false, error: `خطأ في Groq: ${res.status}` };

    return { valid: true };
  } catch (e) {
    if (e instanceof Error && e.name === 'TimeoutError')
      return { valid: false, error: 'انتهت مهلة الاتصال بـ Groq' };
    return { valid: false, error: 'تعذر التحقق من المفتاح' };
  }
}

function generateCode(length = 16): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const { groqKey } = await request.json();

    if (!groqKey || typeof groqKey !== 'string')
      return NextResponse.json({ error: 'أدخل مفتاح Groq' }, { status: 400 });

    const key = groqKey.trim();
    if (!key.startsWith('gsk_'))
      return NextResponse.json({ error: 'المفتاح يجب أن يبدأ بـ gsk_' }, { status: 400 });

    // تحقق من المفتاح
    const check = await validateGroqKey(key);
    if (!check.valid)
      return NextResponse.json({ error: check.error }, { status: 400 });

    // تحقق لو المفتاح استُخدم من قبل
    const existing = await db.apiKey.findFirst({
      where: { groqKeyHash: key.slice(-12) }
    });
    if (existing)
      return NextResponse.json({ error: 'هذا المفتاح استُخدم من قبل للحصول على كود' }, { status: 409 });

    // أنشئ كود خدمة للمستخدم (700 حرف)
    const serviceKey = generateCode();
    await db.apiKey.create({
      data: {
        key: serviceKey,
        characterLimit: 700,
        usedCharacters: 0,
        isActive: true,
        groqKeyHash: key.slice(-12),
        label: `free-tier-${Date.now()}`,
      },
    });

    return NextResponse.json({
      success: true,
      serviceKey,
      characterLimit: 700,
      message: 'تم التحقق! هذا كودك المجاني بـ 700 حرف',
    });

  } catch {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
