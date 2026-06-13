"""
أداة: بوت تليجرام بسيط
الوظيفة: بوت تليجرام يرد على الأوامر
المتطلبات: pip install python-telegram-bot
"""
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

logging.basicConfig(format='%(asctime)s - %(levelname)s - %(message)s', level=logging.INFO)
BOT_TOKEN = 'YOUR_BOT_TOKEN'

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    name = update.effective_user.first_name
    await update.message.reply_text(
        f'مرحباً {name}! 👋\n\nالأوامر المتاحة:\n/start - البداية\n/help - المساعدة\n/info - معلوماتك'
    )

async def help_cmd(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text('📚 أرسل أي رسالة وسأردها إليك!')

async def info(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    await update.message.reply_text(
        f'👤 معلوماتك:\nالاسم: {user.full_name}\nID: {user.id}\nالمستخدم: @{user.username or "غير محدد"}'
    )

async def echo(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(f'🔁 قلت: {update.message.text}')

def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler('start', start))
    app.add_handler(CommandHandler('help', help_cmd))
    app.add_handler(CommandHandler('info', info))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))
    print('🤖 البوت يعمل...')
    app.run_polling()

if __name__ == '__main__':
    main()
