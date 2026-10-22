import { useEffect, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bot, X, Minus, Maximize2, Mic, MicOff, Send } from 'lucide-react';
import HoloAvatar, { type AvatarState } from './HoloAvatar';
import { useSettings } from '../../state/settings';
import { useMarketAnalysis } from '../../hooks/useMarketAnalysis';
import { answerFromAnalysis } from '../../lib/assistant';

type Mode = 'hidden' | 'compact' | 'full';

/**
 * Floating holographic assistant. Avatar state reflects REAL app state:
 * - listening only while the microphone recogniser is active
 * - thinking while a reply is being generated
 * - speaking only while speechSynthesis is actually playing
 * - warning when the signal is DATA UNAVAILABLE
 */
export default function HoloAssistant() {
  const { settings, update } = useSettings();
  const a = useMarketAnalysis();
  const [mode, setMode] = useState<Mode>(settings.assistantAutoOpen ? 'compact' : 'hidden');
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [listening, setListening] = useState(false);
  const [input, setInput] = useState('');
  const [log, setLog] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [muted, setMuted] = useState(false);
  const [voiceOk] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  // Derive the non-conversational avatar state from real app state.
  useEffect(() => {
    if (mode === 'hidden') return;
    if (listening) setAvatarState('listening');
    else if (a.decision?.state === 'DATA UNAVAILABLE') setAvatarState('warning');
    else setAvatarState((s) => (s === 'listening' || s === 'thinking' || s === 'speaking' ? 'idle' : s));
  }, [mode, listening, a.decision?.state]);

  const speak = (text: string) => {
    if (muted || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.onstart = () => setAvatarState('speaking');
    u.onend = () => setAvatarState('idle');
    u.onerror = () => setAvatarState('idle');
    window.speechSynthesis.speak(u);
  };

  const ask = (q: string) => {
    if (!q.trim()) return;
    setAvatarState('thinking');
    const answer = answerFromAnalysis(q, a);
    setLog((l) => [...l, { role: 'user', text: q }, { role: 'assistant', text: answer }]);
    setInput('');
    // Short deliberate delay so the thinking state is visible; the answer itself is computed synchronously.
    setTimeout(() => {
      setAvatarState('explaining');
      speak(answer);
      if (!('speechSynthesis' in window) || muted) setAvatarState('idle');
    }, 350);
  };

  const toggleMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput(text);
      setListening(false);
      ask(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
    (window as any).__zxRec = rec;
  };

  useEffect(() => {
    if (!listening && (window as any).__zxRec) {
      try { (window as any).__zxRec.stop(); } catch { /* already stopped */ }
    }
  }, [listening]);

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setAvatarState('idle');
  };

  if (mode === 'hidden') {
    return (
      <button
        onClick={() => setMode('compact')}
        className="fixed bottom-5 right-5 z-40 btn-primary !rounded-full !p-3.5 shadow-glow"
        aria-label="Open ZORVEX AI assistant"
      >
        <Bot size={18} />
      </button>
    );
  }

  const width = mode === 'full' ? 'w-[min(96vw,760px)] h-[min(88vh,640px)]' : 'w-[min(94vw,380px)]';

  return (
    <div className={`fixed bottom-4 right-4 z-40 ${width} glass flex flex-col overflow-hidden`} role="dialog" aria-label="ZORVEX AI">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
        <span className="text-sm font-medium text-white">ZORVEX AI</span>
        <div className="flex gap-1">
          <button className="btn-ghost !p-1.5" onClick={() => setMode(mode === 'full' ? 'compact' : 'full')} aria-label="Toggle full screen assistant"><Maximize2 size={14} /></button>
          <button className="btn-ghost !p-1.5" onClick={() => setMode('hidden')} aria-label="Minimise"><Minus size={14} /></button>
          <button className="btn-ghost !p-1.5" onClick={() => setMode('hidden')} aria-label="Close"><X size={14} /></button>
        </div>
      </div>

      <div className={`${mode === 'full' ? 'h-[42%]' : 'h-56'} relative`}>
        <Canvas camera={{ position: [0, 0.2, 3.2], fov: 35 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
          <Suspense fallback={null}>
            <HoloAvatar state={avatarState} style={settings.avatarStyle} reduced={settings.reducedEffects} />
          </Suspense>
        </Canvas>
        <span className="absolute bottom-2 left-3 text-[10px] uppercase tracking-widest text-cyanx/80">{avatarState}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-4 py-3 space-y-2 text-sm">
        {log.length === 0 && <p className="text-slate-500 text-xs">Ask about bias, levels, risk or the current setup.</p>}
        {log.map((m, i) => (
          <p key={i} className={m.role === 'user' ? 'text-white text-right' : 'text-slate-300 whitespace-pre-line'}>{m.text}</p>
        ))}
      </div>

      <form className="flex gap-2 px-3 py-3 border-t border-white/[0.06]" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
        <button type="button" className="btn-ghost !p-2" onClick={toggleMic} disabled={!voiceOk} aria-pressed={listening} aria-label={listening ? 'Stop listening' : 'Start voice input'}>
          {listening ? <MicOff size={14} className="text-bear" /> : <Mic size={14} />}
        </button>
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask ZORVEX AI…" aria-label="Message to assistant" />
        <button type="button" className="btn-ghost !p-2" onClick={() => { setMuted((m) => !m); if (!muted) stopSpeaking(); }} aria-label={muted ? 'Unmute voice' : 'Mute voice'}>
          {muted ? 'Unmute' : 'Mute'}
        </button>
        <button className="btn-primary !p-2" type="submit" aria-label="Send"><Send size={14} /></button>
      </form>
    </div>
  );
}
