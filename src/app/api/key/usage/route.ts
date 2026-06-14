import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'المفتاح مطلوب' },
        { status: 400 }
      );
    }

    const apiKey = await db.apiKey.findUnique({ where: { key: key.trim().toUpperCase() } });

    if (!apiKey) {
      return NextResponse.json(
        { error: 'مفتاح غير صحيح' },
        { status: 404 }
      );
    }

    const remaining = Math.max(0, apiKey.characterLimit - apiKey.usedCharacters);

    return NextResponse.json({
      key: apiKey.key,
      characterLimit: apiKey.characterLimit,
      usedCharacters: apiKey.usedCharacters,
      remaining,
      isActive: apiKey.isActive,
    });
  } catch (error) {
    console.error('[Key Usage Error]', error);
    return NextResponse.json(
      { error: 'خطأ في جلب بيانات الاستخدام' },
      { status: 500 }
    );
  }
}
