import { useState } from 'react';
import { Send, Bot } from 'lucide-react';
import { Card } from '../components/ui';
import { useMarketAnalysis } from '../hooks/useMarketAnalysis';
import { answerFromAnalysis } from '../lib/assistant';

interface Msg { role: 'user' | 'assistant'; text: string }

export default function Assistant() {
  const a = useMarketAnalysis();
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', text: 'I explain only verified analysis from the engine. Ask about bias, conflicts, levels or risk.' },
  ]);
  const [input, setInput] = useState('');

  const send = () => {
    const q = input.trim();
    if (!q) return;
    const answer = answerFromAnalysis(q, a);
    setMessages((m) => [...m, { role: 'user', text: q }, { role: 'assistant', text: answer }]);
    setInput('');
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="label">ZORVEX AI</p>
        <h1 className="text-2xl font-semibold text-white tracking-tight mt-1">Assistant</h1>
        <p className="text-sm text-slate-500 mt-1">Answers are generated from the current analysis, not from invented data.</p>
      </header>
      <Card>
        <div className="space-y-3 min-h-[320px] max-h-[480px] overflow-auto pr-1" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && <div className="h-7 w-7 shrink-0 rounded-full bg-violet-neon/20 grid place-items-center"><Bot size={14} className="text-violet-300" /></div>}
              <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${m.role === 'user' ? 'bg-violet-neon/20 text-white' : 'bg-ink-950/60 text-slate-300 border border-white/[0.06]'}`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <form className="flex gap-2 mt-4" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input className="input" placeholder="e.g. Why is the bias bearish? What invalidates the setup?" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Message" />
          <button className="btn-primary" type="submit" aria-label="Send"><Send size={14} /></button>
        </form>
      </Card>
    </div>
  );
}
