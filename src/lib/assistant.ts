import type { AnalysisState } from '../hooks/useMarketAnalysis';

/**
 * Deterministic answer builder. Only quotes values produced by the analysis engine, and states
 * explicitly when evidence is missing. Replace with a server-side LLM call (via a Supabase Edge
 * Function holding the key) to get free-form explanations; this keeps the grounding rule.
 */
export function answerFromAnalysis(question: string, a: AnalysisState): string {
  const q = question.toLowerCase();
  if (a.loading) return 'Analysis is still loading. I will answer once real candles are available.';
  if (!a.candles.length) return `I have no verified candles right now. ${a.error ?? 'Check the market proxy configuration.'}`;

  const d = a.decision;
  if (q.includes('bias') || q.includes('bullish') || q.includes('bearish') || q.includes('why')) {
    const lines = a.htf.map((h) => `${h.timeframe.toUpperCase()}: ${h.sufficient ? h.bias : 'insufficient data'} — ${h.summary}`);
    const conflict = new Set(a.htf.filter((h) => h.sufficient).map((h) => h.bias)).size > 1;
    return `${lines.join('\n')}\n${conflict ? 'Higher timeframes conflict, so there is no clear directional context.' : 'Higher timeframes are consistent or have insufficient data.'}`;
  }
  if (q.includes('risk') || q.includes('reward') || q.includes('stop') || q.includes('target') || q.includes('tp')) {
    const s = d?.setup;
    if (!s) return `No valid setup, so there are no levels to explain. ${d?.reason ?? ''}`;
    return `Entry ${s.entry}, stop ${s.stopLoss}. Targets ${s.takeProfits.join(' / ')} give ${s.riskReward.join('R / ')}R. ${s.invalidation.join(' ')}`;
  }
  if (q.includes('wait') || q.includes('enter') || q.includes('trade') || q.includes('setup')) {
    return `${d?.state ?? 'UNKNOWN'}: ${d?.reason ?? 'No decision yet.'} This is analysis, not financial advice.`;
  }
  return `Current signal: ${d?.state ?? 'UNKNOWN'}. ${d?.reason ?? ''} Ask about bias, levels, risk or the setup for detail.`;
}
