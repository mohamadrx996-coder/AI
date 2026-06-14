import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// جلب الرسائل حسب المفتاح
export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');
    const chatId = request.nextUrl.searchParams.get('chatId');

    if (!key) {
      return NextResponse.json({ error: 'المفتاح مطلوب' }, { status: 400 });
    }

    const apiKey = await db.apiKey.findUnique({ where: { key: key.trim().toUpperCase() } });

    if (!apiKey) {
      return NextResponse.json({ error: 'مفتاح غير صحيح' }, { status: 404 });
    }

    if (chatId) {
      const messages = await db.chatMessage.findMany({
        where: { apiKeyId: apiKey.id, chatId },
        orderBy: { createdAt: 'asc' },
      });
      return NextResponse.json({ messages });
    }

    // جلب كل معرفات المحادثات لهذا المفتاح
    const allMessages = await db.chatMessage.findMany({
      where: { apiKeyId: apiKey.id },
      orderBy: { createdAt: 'desc' },
      select: { chatId: true, createdAt: true },
      distinct: ['chatId'],
    });

    return NextResponse.json({
      chats: allMessages.map((m) => ({
        chatId: m.chatId,
        lastMessage: m.createdAt,
      })),
    });
  } catch (error) {
    console.error('Messages GET error:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

// حذف محادثة
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, chatId } = body;

    if (!key || !chatId) {
      return NextResponse.json({ error: 'المفتاح ومعرف المحادثة مطلوبان' }, { status: 400 });
    }

    const apiKey = await db.apiKey.findUnique({ where: { key: key.trim().toUpperCase() } });

    if (!apiKey) {
      return NextResponse.json({ error: 'مفتاح غير صحيح' }, { status: 404 });
    }

    await db.chatMessage.deleteMany({
      where: { apiKeyId: apiKey.id, chatId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Messages DELETE error:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
