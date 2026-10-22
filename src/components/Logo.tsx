export default function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-violet-neon to-electric shadow-glow grid place-items-center">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M4 17 L10 11 L14 14 L20 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="leading-none">
        <div className="font-semibold tracking-tight text-white">ZORVEX</div>
        <div className="text-[10px] tracking-[0.25em] text-cyanx mt-0.5">PRO</div>
      </div>
    </div>
  );
}
