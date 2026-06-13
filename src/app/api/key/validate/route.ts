import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key } = body;

    if (!key || typeof key !== 'string') {
      return NextResponse.json(
        { error: 'المفتاح مطلوب', valid: false },
        { status: 400 }
      );
    }

    const apiKey = await db.apiKey.findUnique({ where: { key: key.trim().toUpperCase() } });

    if (!apiKey) {
      return NextResponse.json(
        { error: 'مفتاح غير صحيح', valid: false },
        { status: 404 }
      );
    }

    if (!apiKey.isActive) {
      return NextResponse.json(
        { error: 'هذا المفتاح معطل', valid: false },
        { status: 403 }
      );
    }

    const remaining = Math.max(0, apiKey.characterLimit - apiKey.usedCharacters);

    return NextResponse.json({
      valid: true,
      key: apiKey.key,
      characterLimit: apiKey.characterLimit,
      usedCharacters: apiKey.usedCharacters,
      remaining,
      isActive: apiKey.isActive,
    });
  } catch (error) {
    console.error('[Key Validate Error]', error);
    return NextResponse.json(
      { error: 'خطأ في التحقق من المفتاح', valid: false },
      { status: 500 }
    );
  }
}
