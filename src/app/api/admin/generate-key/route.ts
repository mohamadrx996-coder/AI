import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

// توليد مفتاح عشوائي
function generateRandomKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segments: string[] = [];
  for (let s = 0; s < 4; s++) {
    let seg = '';
    for (let i = 0; i < 4; i++) {
      seg += chars[randomBytes(1)[0] % chars.length];
    }
    segments.push(seg);
  }
  return segments.join('-');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminPassword, characterLimit } = body;

    // التحقق من كلمة سر الأدمن
    const correctPassword = process.env.ADMIN_PASSWORD || 'PyGen2025Admin';
    if (adminPassword !== correctPassword) {
      return NextResponse.json(
        { error: 'كلمة سر الأدمن غير صحيحة' },
        { status: 403 }
      );
    }

    // الحد الأدنى والأقصى للأحرف
    const limit = Math.max(100, Math.min(100000, characterLimit || 700));

    // توليد مفتاح فريد
    let key = generateRandomKey();
    let exists = await db.apiKey.findUnique({ where: { key } });
    while (exists) {
      key = generateRandomKey();
      exists = await db.apiKey.findUnique({ where: { key } });
    }

    const apiKey = await db.apiKey.create({
      data: {
        key,
        characterLimit: limit,
        usedCharacters: 0,
        isActive: true,
      },
    });

    return NextResponse.json({
      key: apiKey.key,
      characterLimit: apiKey.characterLimit,
      usedCharacters: apiKey.usedCharacters,
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt,
    });
  } catch (error) {
    console.error('[Admin Generate Key Error]', error);
    return NextResponse.json(
      { error: 'خطأ في توليد المفتاح' },
      { status: 500 }
    );
  }
}

// عرض كل المفاتيح (للأدمن)
export async function GET(request: NextRequest) {
  try {
    const adminPassword = request.nextUrl.searchParams.get('adminPassword');
    const correctPassword = process.env.ADMIN_PASSWORD || 'PyGen2025Admin';

    if (adminPassword !== correctPassword) {
      return NextResponse.json(
        { error: 'كلمة سر الأدمن غير صحيحة' },
        { status: 403 }
      );
    }

    const keys = await db.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('[Admin List Keys Error]', error);
    return NextResponse.json(
      { error: 'خطأ في جلب المفاتيح' },
      { status: 500 }
    );
  }
}

// حذف/تعطيل مفتاح
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminPassword, keyId } = body;
    const correctPassword = process.env.ADMIN_PASSWORD || 'PyGen2025Admin';

    if (adminPassword !== correctPassword) {
      return NextResponse.json(
        { error: 'كلمة سر الأدمن غير صحيحة' },
        { status: 403 }
      );
    }

    await db.apiKey.delete({ where: { id: keyId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Delete Key Error]', error);
    return NextResponse.json(
      { error: 'خطأ في حذف المفتاح' },
      { status: 500 }
    );
  }
}
