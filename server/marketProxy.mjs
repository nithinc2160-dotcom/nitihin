// Server-side market proxy. Holds the private provider key; the browser never sees it.
// Run alongside the dev server (see README). Adapter is a single function so another
// provider can be swapped in without touching the UI.
import http from 'node:http';

const PORT = Number(process.env.MARKET_PROXY_PORT || 8787);
const API_KEY = process.env.MARKET_API_KEY || '';
const BASE_URL = process.env.MARKET_API_BASE || 'https://api.twelvedata.com';

const TF_MAP = {
  '1m': '1min', '3m': '3min', '5m': '5min', '15m': '15min', '30m': '30min',
  '1h': '1h', '4h': '4h', '1d': '1day', '1w': '1week',
};

function send(res, code, obj) {
  res.writeHead(code, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(obj));
}

async function fetchCandles(symbol, tf, limit) {
  if (!API_KEY)
    return { code: 503, body: { status: 'unconfigured', provider: 'Twelve Data', error: 'MARKET_API_KEY is not set on the server. Fresh signals are disabled.', candles: [] } };
  const interval = TF_MAP[tf];
  if (!interval) return { code: 400, body: { status: 'disconnected', error: `Timeframe ${tf} is not supported by this provider.`, candles: [] } };
  const url = `${BASE_URL}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${limit}&format=JSON&apikey=${API_KEY}`;
  try {
    const r = await fetch(url);
    const j = await r.json();
    if (j.status === 'error' || !Array.isArray(j.values))
      return { code: 502, body: { status: 'disconnected', provider: 'Twelve Data', error: j.message || 'Provider returned no candles.', candles: [] } };
    const candles = j.values
      .map((v) => ({
        time: Math.floor(new Date(v.datetime.replace(' ', 'T') + 'Z').getTime() / 1000),
        open: Number(v.open), high: Number(v.high), low: Number(v.low), close: Number(v.close),
        volume: v.volume !== undefined ? Number(v.volume) : undefined,
      }))
      .sort((a, b) => a.time - b.time);
    // Drop the still-forming candle so analysis only uses closed candles.
    const tfSec = { '1m': 60, '3m': 180, '5m': 300, '15m': 900, '30m': 1800, '1h': 3600, '4h': 14400, '1d': 86400, '1w': 604800 }[tf];
    const nowSec = Math.floor(Date.now() / 1000);
    const closed = candles.filter((c) => c.time + tfSec <= nowSec);
    return { code: 200, body: { status: 'delayed', provider: 'Twelve Data', candles: closed } };
  } catch (e) {
    return { code: 502, body: { status: 'disconnected', provider: 'Twelve Data', error: 'Provider unreachable.', candles: [] } };
  }
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (url.pathname === '/api/market/candles') {
      const symbol = url.searchParams.get('symbol') || '';
      const tf = url.searchParams.get('tf') || '15m';
      const limit = Math.min(Number(url.searchParams.get('limit') || 300), 1000);
      const { code, body } = await fetchCandles(symbol, tf, limit);
      return send(res, code, body);
    }
    send(res, 404, { error: 'Not found' });
  })
  .listen(PORT, () => console.log(`Market proxy on :${PORT} (key ${API_KEY ? 'set' : 'MISSING'})`));
