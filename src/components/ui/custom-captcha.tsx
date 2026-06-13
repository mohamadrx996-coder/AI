'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function genCode(n = 6) {
  let s = '';
  for (let i = 0; i < n; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

export default function CustomCaptcha({ onVerified }: { onVerified: (v: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);

  const draw = useCallback((c: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 200, Math.random() * 60);
      ctx.lineTo(Math.random() * 200, Math.random() * 60);
      ctx.strokeStyle = `hsl(${Math.random()*360},40%,65%)`;
      ctx.lineWidth = 1.5; ctx.stroke();
    }
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 200, Math.random() * 60, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${Math.random()*360},40%,65%)`; ctx.fill();
    }
    c.split('').forEach((ch, i) => {
      ctx.save();
      ctx.translate(22 + i * 30, 38);
      ctx.rotate((Math.random() - 0.5) * 0.5);
      ctx.font = `bold ${24 + Math.random() * 8}px monospace`;
      ctx.fillStyle = `hsl(${Math.random()*360},60%,28%)`; ctx.fillText(ch, 0, 0);
      ctx.restore();
    });
  }, []);

  const refresh = useCallback(() => {
    const c = genCode(); setCode(c); setInput(''); setError(''); setOk(false); onVerified(false);
    setTimeout(() => draw(c), 0);
  }, [draw, onVerified]);

  useEffect(() => { refresh(); }, []);

  const handleChange = (v: string) => {
    setInput(v);
    if (v.toUpperCase() === code) { setOk(true); setError(''); onVerified(true); }
    else { setOk(false); onVerified(false); }
  };

  const handleBlur = () => {
    if (input && input.toUpperCase() !== code) { setError('الرمز غير صحيح، حاول مرة أخرى'); refresh(); }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <canvas ref={canvasRef} width={200} height={60} className="rounded-lg border border-border select-none" />
        <Button type="button" variant="ghost" size="icon" onClick={refresh} title="تجديد">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      <Input value={input} onChange={e => handleChange(e.target.value.toUpperCase())} onBlur={handleBlur}
        placeholder="اكتب الرمز..." maxLength={6}
        className={`font-mono tracking-widest text-center ${ok ? 'border-emerald-500' : error ? 'border-red-500' : ''}`}
        disabled={ok} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {ok && <p className="text-xs text-emerald-500">✓ تم التحقق</p>}
    </div>
  );
}
