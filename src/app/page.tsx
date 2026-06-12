'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Copy, Check, Trash2, Terminal, Loader2, Zap, Key, Clock, Shield, MessageCircle, ExternalLink, X, Eye, EyeOff, Plus, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useChatStore, Message } from '@/store/chat-store';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const SUGGESTIONS = [
  { icon: '🐍', text: 'اكتب سكربت بايثون لتحليل ملف CSV', label: 'تحليل بيانات' },
  { icon: '📊', text: 'ارسم رسماً بيانياً باستخدام matplotlib', label: 'رسم بياني' },
  { icon: '🤖', text: 'أنشئ بوت تليجرام بلغة بايثون', label: 'بوت تليجرام' },
  { icon: '🎮', text: 'اصنع لعبة Snake باستخدام Pygame', label: 'لعبة' },
  { icon: '📝', text: 'أنشئ REST API باستخدام FastAPI', label: 'API' },
  { icon: '🔐', text: 'اكتب مولّد كلمات مرور قوية', label: 'أمان' },
];

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent
    }
  };

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-border/50 bg-[#282c34]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#21252b] border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs text-gray-400 ml-2 font-mono">{language}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-white/10">
          {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
          {copied ? 'تم!' : 'نسخ'}
        </Button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '0.875rem', lineHeight: '1.6' }}
        showLineNumbers
        lineNumberStyle={{ color: '#4b5263', minWidth: '2.5em' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-1">
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).split('\n');
          return <CodeBlock key={i} code={lines.slice(1).join('\n').trim()} language={lines[0]?.trim() || 'python'} />;
        }
        return <span key={i} className="whitespace-pre-wrap leading-relaxed">{part}</span>;
      })}
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ${isUser ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-purple-500 to-pink-600'}`}>
        {isUser ? <User className="w-4.5 h-4.5 text-white" /> : <Bot className="w-4.5 h-4.5 text-white" />}
      </div>
      <div className="flex-1 max-w-[85%]">
        <div className={`rounded-2xl px-4 py-3 shadow-sm ${isUser ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-tr-sm' : 'bg-card border border-border/50 rounded-tl-sm'}`}>
          <MessageContent content={message.content} />
        </div>
        {!isUser && message.provider && (
          <div className="flex items-center gap-1.5 mt-1 ml-1">
            <Zap className="w-3 h-3 text-muted-foreground/60" />
            <span className="text-[10px] text-muted-foreground/60">{message.provider}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function LoadingDots() {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-purple-500 to-pink-600">
        <Bot className="w-4.5 h-4.5 text-white" />
      </div>
      <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (hours > 0) return `${hours}س ${mins}د`;
  return `${mins}د`;
}

// ─── شاشة إدخال المفتاح ───
function KeyEntryScreen({ onKeyValidated }: { onKeyValidated: (key: string, limit: number, used: number) => void }) {
  const [keyInput, setKeyInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleValidate = async () => {
    if (!keyInput.trim()) {
      setError('اكتب المفتاح أولاً');
      return;
    }
    setIsValidating(true);
    setError('');

    try {
      const res = await fetch('/api/key/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyInput.trim() }),
      });
      const data = await res.json();

      if (!data.valid) {
        setError(data.error || 'مفتاح غير صحيح');
        return;
      }

      toast({ title: 'تم الدخول بنجاح! 🎉', description: `عندك ${data.remaining} حرف متبقي` });
      onKeyValidated(data.key, data.characterLimit, data.usedCharacters);
    } catch {
      setError('خطأ في الاتصال');
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleValidate();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        {/* الشعار */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-5">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-500/20 mx-auto">
              <Terminal className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-1.5 -right-1.5 w-7 h-7 bg-emerald-400 rounded-xl flex items-center justify-center shadow-lg">
              <Key className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            PyGen AI
          </h1>
          <p className="text-muted-foreground">
            مولّد أكواد Python بالذكاء الاصطناعي
          </p>
        </div>

        {/* حقل المفتاح */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-lg mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-bold">أدخل مفتاح الدخول</h2>
          </div>

          <div className="flex gap-2">
            <Input
              value={keyInput}
              onChange={(e) => { setKeyInput(e.target.value.toUpperCase()); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="text-center font-mono text-lg tracking-widest h-12 bg-background border-border/50 focus:border-purple-500/50 focus:ring-purple-500/20"
              dir="ltr"
              disabled={isValidating}
            />
            <Button
              onClick={handleValidate}
              disabled={isValidating || !keyInput.trim()}
              className="h-12 px-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25 transition-all duration-200 disabled:opacity-50"
            >
              {isValidating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
            </Button>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-sm mt-2 text-center">
              ⚠️ {error}
            </motion.p>
          )}
        </div>

        {/* التعليمات */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold">كيف تحصل على مفتاح؟</h3>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground" dir="rtl">
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center text-xs font-bold">1</span>
              <p>ادخل سيرفر الديسكورد الخاص بنا</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center text-xs font-bold">2</span>
              <p>ادفع <span className="text-emerald-500 font-bold">5 مليون كرديت</span> لصاحب الموقع</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center text-xs font-bold">3</span>
              <p>افتح تذكرة (Ticket) في السيرفر واطلب مفتاح</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center text-xs font-bold">4</span>
              <p>ضع المفتاح هنا وابدأ المحادثة! 🎉</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/30 space-y-2">
            <p className="text-xs text-amber-500 flex items-center gap-1.5 font-bold">
              <Zap className="w-3.5 h-3.5" />
              جدول الأسعار — كل 100 حرف إضافي = 5 مليون كرديت
            </p>
            <div className="rounded-lg overflow-hidden border border-border/30 text-xs" dir="rtl">
              <div className="grid grid-cols-3 bg-purple-500/20 text-purple-300 font-bold px-3 py-1.5">
                <span>الحروف</span>
                <span className="text-center">الزيادة</span>
                <span className="text-left">السعر</span>
              </div>
              {[
                { chars: '700',  extra: 'أساسي',  price: '5 مليون' },
                { chars: '800',  extra: '+100',   price: '10 مليون' },
                { chars: '900',  extra: '+200',   price: '15 مليون' },
                { chars: '1000', extra: '+300',   price: '20 مليون' },
                { chars: '1500', extra: '+800',   price: '45 مليون' },
                { chars: '2000', extra: '+1300',  price: '70 مليون' },
              ].map((row, i) => (
                <div key={i} className={`grid grid-cols-3 px-3 py-1.5 ${i % 2 === 0 ? 'bg-card' : 'bg-background'}`}>
                  <span className="font-mono text-emerald-400">{row.chars} حرف</span>
                  <span className="text-center text-muted-foreground">{row.extra}</span>
                  <span className="text-left text-amber-400 font-bold">{row.price}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs border-purple-500/30 text-purple-500 hover:bg-purple-500/10"
              onClick={() => window.open('https://discord.gg/TkUWGVAK39', '_blank')}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              سيرفر الديسكورد
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── نافذة الأدمن ───
function AdminPanel({ onClose }: { onClose: () => void }) {
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [charLimit, setCharLimit] = useState(700);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [keys, setKeys] = useState<Array<{ id: string; key: string; characterLimit: number; usedCharacters: number; isActive: boolean; createdAt: string; _count: { messages: number } }>>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const { toast } = useToast();

  const handleAuthenticate = () => {
    // التحقق من كلمة السر عبر السيرفر دائماً (أمان أفضل)
    fetch('/api/admin/generate-key?adminPassword=' + encodeURIComponent(adminPassword))
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
        } else {
          setIsAuthenticated(true);
          setKeys(data.keys || []);
        }
      })
      .catch(() => toast({ title: 'خطأ', description: 'خطأ في الاتصال', variant: 'destructive' }));
  };

  const loadKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const res = await fetch('/api/admin/generate-key?adminPassword=' + encodeURIComponent(adminPassword));
      const data = await res.json();
      if (data.keys) setKeys(data.keys);
    } catch {
      // silent
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/generate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword, characterLimit: charLimit }),
      });
      const data = await res.json();
      if (data.error) {
        toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
      } else {
        setGeneratedKey(data.key);
        toast({ title: 'تم توليد المفتاح! ✅', description: `${data.key} — ${data.characterLimit} حرف` });
        loadKeys();
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل توليد المفتاح', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      await fetch('/api/admin/generate-key', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword, keyId }),
      });
      toast({ title: 'تم حذف المفتاح ✅' });
      loadKeys();
    } catch {
      toast({ title: 'خطأ', description: 'فشل حذف المفتاح', variant: 'destructive' });
    }
  };

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      toast({ title: 'تم النسخ! 📋' });
    } catch {
      // silent
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border/50 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-bold">لوحة تحكم الأدمن</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-5">
          {!isAuthenticated ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">اكتب كلمة سر الأدمن للوصول</p>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="كلمة سر الأدمن"
                  onKeyDown={(e) => e.key === 'Enter' && handleAuthenticate()}
                  dir="ltr"
                  className="pr-10"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <Button
                onClick={handleAuthenticate}
                disabled={!adminPassword}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                دخول
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* توليد مفتاح */}
              <div className="bg-background rounded-xl p-4 border border-border/30">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-500" />
                  توليد مفتاح جديد
                </h3>
                <div className="flex gap-2 mb-3">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">عدد الأحرف</label>
                    <Input
                      type="number"
                      value={charLimit}
                      onChange={(e) => setCharLimit(Number(e.target.value))}
                      min={100}
                      max={100000}
                      className="h-10"
                      dir="ltr"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="h-10 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                    >
                      {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                      توليد
                    </Button>
                  </div>
                </div>

                {generatedKey && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center"
                  >
                    <p className="text-xs text-emerald-600 mb-1">المفتاح الجديد:</p>
                    <p className="font-mono text-lg tracking-wider font-bold text-emerald-500" dir="ltr">{generatedKey}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyKey(generatedKey)}
                      className="mt-2 text-xs text-emerald-500 hover:bg-emerald-500/10"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" /> نسخ
                    </Button>
                  </motion.div>
                )}
              </div>

              {/* قائمة المفاتيح */}
              <div>
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Key className="w-4 h-4 text-purple-500" />
                  المفاتيح المفعّلة ({keys.length})
                </h3>
                {isLoadingKeys ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-purple-500" /></div>
                ) : keys.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد مفاتيح بعد</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {keys.map((k) => (
                      <div key={k.id} className="flex items-center justify-between bg-background rounded-lg p-3 border border-border/30">
                        <div>
                          <p className="font-mono text-sm" dir="ltr">{k.key}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {k.usedCharacters}/{k.characterLimit} حرف • {k._count.messages} رسالة
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => copyKey(k.key)}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteKey(k.id)}>
                            <Trash className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── الصفحة الرئيسية ───
export default function Home() {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const {
    messages, isLoading, addMessage, setLoading,
    remaining, characterLimit, usedCharacters, activeKey,
    chatId, setRemaining, setActiveKey, setChatId, clearMessages, logout,
    lastProvider, _hasHydrated,
  } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isLoading, scrollToBottom]);

  const handleKeyValidated = useCallback((key: string, limit: number, used: number) => {
    setActiveKey(key);
    setRemaining(limit - used, limit, used);
  }, [setActiveKey, setRemaining]);

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading || !activeKey) return;

    setInput('');
    addMessage('user', text);
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, apiKey: activeKey, chatId }),
      });

      // حماية: قراءة الرد كنص أولاً ثم تحويله
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error('خطأ في الاتصال بالخادم. حاول مرة أخرى.');
      }

      if (!response.ok) {
        if (response.status === 429 && data.remaining !== undefined) {
          setRemaining(data.remaining, data.characterLimit || characterLimit, data.usedCharacters || usedCharacters);
        }
        throw new Error(data.error || 'فشل الطلب');
      }

      addMessage('assistant', data.response, data.provider);
      if (data.chatId) setChatId(data.chatId);
      if (data.remaining !== undefined) {
        setRemaining(data.remaining, data.characterLimit || characterLimit, data.usedCharacters || usedCharacters);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
      addMessage('assistant', `⚠️ ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const charCount = input.length;
  const maxChar = Math.min(remaining, 2000);
  const isOverLimit = charCount > maxChar;
  const charPercent = characterLimit > 0 ? (remaining / characterLimit) * 100 : 0;

  // انتظر حتى يتم تحميل البيانات من localStorage
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // ─── شاشة إدخال المفتاح ───
  if (!activeKey) {
    return (
      <>
        <KeyEntryScreen onKeyValidated={handleKeyValidated} />
        {/* زر الأدمن ثابت في الزاوية */}
        <Button
          onClick={() => setShowAdmin(true)}
          className="fixed top-4 left-4 z-50 h-9 px-3 bg-card border border-border/50 hover:bg-accent/50 shadow-lg text-muted-foreground hover:text-purple-500 transition-all duration-200"
          variant="ghost"
          size="sm"
        >
          <Key className="w-4 h-4 mr-1.5" />
          Key
        </Button>
        <AnimatePresence>
          {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
        </AnimatePresence>
      </>
    );
  }

  // ─── شاشة المحادثة ───
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* الهيدر */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Terminal className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">PyGen AI</h1>
              <p className="text-xs text-muted-foreground">مجاني 100% • بدون تسجيل</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* مؤشر الأحرف */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border/50">
              <div className={`w-2 h-2 rounded-full ${charPercent > 50 ? 'bg-emerald-500' : charPercent > 20 ? 'bg-amber-500' : 'bg-red-500'}`} />
              <span className={`text-xs font-mono font-medium ${charPercent > 50 ? 'text-emerald-600 dark:text-emerald-400' : charPercent > 20 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                {remaining} حرف
              </span>
              {lastProvider && (
                <span className="text-[10px] text-muted-foreground/60 border-l border-border/40 pl-2 ml-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" />{lastProvider}
                </span>
              )}
            </div>
            {/* زر الأدمن */}
            <Button
              onClick={() => setShowAdmin(true)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-purple-500"
            >
              <Key className="w-4 h-4" />
            </Button>
            {/* خروج */}
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearMessages} className="text-muted-foreground hover:text-destructive h-8 w-8 p-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)]">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="text-center mb-10">
                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-500/20 mx-auto">
                    <Terminal className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-400 rounded-xl flex items-center justify-center shadow-lg">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
                  مرحباً بك في PyGen AI
                </h2>
                <p className="text-muted-foreground text-lg max-w-md mx-auto">
                  مولّد أكواد Python بالذكاء الاصطناعي — مجاني 100% بدون تسجيل!
                </p>
                <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-purple-500" />مجاني بالكامل</span>
                  <span className="flex items-center gap-1.5"><Key className="w-4 h-4 text-emerald-500" />{remaining}/{characterLimit} حرف</span>
                </div>
              </motion.div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.08 }}
                    onClick={() => handleSend(s.text)}
                    disabled={remaining === 0}
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-border/50 bg-card hover:bg-accent/50 hover:border-purple-500/30 transition-all duration-200 text-right group disabled:opacity-50 disabled:cursor-not-allowed"
                    dir="rtl"
                  >
                    <span className="text-xl flex-shrink-0">{s.icon}</span>
                    <div>
                      <span className="text-sm font-medium text-foreground group-hover:text-purple-600 transition-colors">{s.label}</span>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{s.text}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              <AnimatePresence>{messages.map(m => <ChatMessage key={m.id} message={m} />)}</AnimatePresence>
              {isLoading && <LoadingDots />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* شريط الإدخال */}
      <footer className="sticky bottom-0 border-t border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={remaining === 0 ? 'خلصت حروفك! تحتاج مفتاح جديد' : 'اكتب سؤالك عن بايثون هنا...'}
                className={`min-h-[52px] max-h-[200px] resize-none rounded-xl pr-4 ${isOverLimit ? 'border-red-500/50' : 'border-border/50 focus:border-purple-500/50 focus:ring-purple-500/20'} bg-card`}
                dir="rtl"
                rows={1}
                disabled={isLoading || remaining === 0}
              />
              <div className={`absolute bottom-1.5 left-3 text-[10px] font-mono ${isOverLimit ? 'text-red-500' : charCount > maxChar * 0.8 ? 'text-amber-500' : 'text-muted-foreground/50'}`}>
                {charCount}/{maxChar}
              </div>
            </div>
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading || isOverLimit || remaining === 0}
              className="h-[52px] w-[52px] rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25 transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
              size="icon"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {remaining > 0 ? `${remaining}/${characterLimit} حرف متبقي في المفتاح` : 'خلصت حروف المفتاح — تحتاج مفتاح جديد'}
          </p>
        </div>
      </footer>

      {/* نافذة الأدمن */}
      <AnimatePresence>
        {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      </AnimatePresence>
    </div>
  );
}
