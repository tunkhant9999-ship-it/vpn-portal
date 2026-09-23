// index.js — VPN Portal (Login + Country + Connect)
require('dotenv').config();
const express = require('express');
const crypto  = require('crypto');
const app     = express();

app.use(express.json());

/* ========== 🔑 CONFIG (Token + Admin ID) ========== */
const BOT_TOKEN = process.env.BOT_TOKEN || '8504405930:AAgrgPuk5STxPpOOYC7YI1sP8k3pw3Gey30';
const ADMIN_ID  = process.env.ADMIN_ID  || '8572642793';
const PORT      = process.env.PORT      || 3000;

/* ========== In-memory Stores ========== */
const sessions = new Map();
const conns    = new Map();

/* ========== Country / Server List ========== */
const SERVERS = [
  { id:'sg', country:'Singapore',  flag:'🇸🇬', city:'Singapore',    ping:45,  load:32 },
  { id:'jp', country:'Japan',      flag:'🇯🇵', city:'Tokyo',        ping:72,  load:48 },
  { id:'kr', country:'S. Korea',   flag:'🇰🇷', city:'Seoul',        ping:68,  load:41 },
  { id:'us', country:'USA',        flag:'🇺🇸', city:'New York',     ping:210, load:55 },
  { id:'gb', country:'UK',         flag:'🇬🇧', city:'London',       ping:185, load:38 },
  { id:'de', country:'Germany',    flag:'🇩🇪', city:'Frankfurt',    ping:195, load:29 },
  { id:'fr', country:'France',     flag:'🇫🇷', city:'Paris',        ping:190, load:44 },
  { id:'in', country:'India',      flag:'🇮🇳', city:'Mumbai',       ping:88,  load:61 },
  { id:'th', country:'Thailand',   flag:'🇹🇭', city:'Bangkok',      ping:55,  load:35 },
  { id:'my', country:'Malaysia',   flag:'🇲🇾', city:'Kuala Lumpur', ping:60,  load:27 }
];

/* ========== Telegram Notify ========== */
async function notifyAdmin(text) {
  if (!BOT_TOKEN || !ADMIN_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ chat_id: ADMIN_ID, text, parse_mode:'HTML' })
    });
  } catch (e) { console.error('TG notify failed:', e.message); }
}

/* ========== HTML Page ========== */
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
  :root{
    --accent:#6366f1; --accent2:#a855f7; --accent3:#06b6d4;
    --glass: rgba(255,255,255,0.06);
    --glass-border: rgba(255,255,255,0.12);
    --text:#f1f5f9; --muted:#94a3b8;
    --ok:#10b981; --err:#f43f5e; --warn:#f59e0b;
  }
  html,body{ height:100%; overflow:hidden; }
  body{
    font-family:'Inter',sans-serif; color:var(--text); background:#050816;
    display:flex; justify-content:center; align-items:center; position:relative;
  }
  .bg-gradient{
    position:fixed; inset:0; z-index:0;
    background:
      radial-gradient(circle at 20% 20%, rgba(99,102,241,0.35), transparent 45%),
      radial-gradient(circle at 80% 80%, rgba(168,85,247,0.35), transparent 45%),
      radial-gradient(circle at 50% 50%, rgba(6,182,212,0.20), transparent 60%),
      linear-gradient(135deg, #0a0e27, #1a0b2e);
    animation: bgShift 18s ease-in-out infinite alternate;
  }
  @keyframes bgShift{
    0%{ filter:hue-rotate(0deg) saturate(1); transform:scale(1); }
    100%{ filter:hue-rotate(35deg) saturate(1.3); transform:scale(1.08); }
  }
  .particles{ position:fixed; inset:0; z-index:1; overflow:hidden; pointer-events:none; }
  .particle{
    position:absolute; border-radius:50%;
    background: radial-gradient(circle,#a5b4fc,transparent); opacity:.6;
    animation: floatUp linear infinite;
  }
  @keyframes floatUp{
    0%{ transform:translateY(100vh) scale(0); opacity:0; }
    10%{ opacity:.7; } 90%{ opacity:.7; }
    100%{ transform:translateY(-10vh) scale(1.2); opacity:0; }
  }
  .grid-overlay{
    position:fixed; inset:0; z-index:1; pointer-events:none;
    background-image:
      linear-gradient(rgba(99,102,241,0.06) 1px,transparent 1px),
      linear-gradient(90deg, rgba(99,102,241,0.06) 1px,transparent 1px);
    background-size:40px 40px;
    mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
  }

  .view{ position:relative; z-index:2; width:100%; max-width:440px; padding:16px; display:none; }
  .view.active{ display:block; animation: viewIn .5s cubic-bezier(0.16,1,0.3,1); }
  @keyframes viewIn{ from{ opacity:0; transform:translateY(20px); } to{ opacity:1; transform:translateY(0); } }

  .card{
    position:relative; padding:36px 30px 30px;
    border-radius:24px;
    background: var(--glass);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border:1px solid var(--glass-border);
    box-shadow: 0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08);
  }
  .card::before{
    content:''; position:absolute; inset:-1px; border-radius:24px; padding:1px;
    background: linear-gradient(135deg,var(--accent),var(--accent2),var(--accent3),var(--accent));
    background-size:300% 300%;
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor; mask-composite: exclude;
    opacity:.55; animation: ringSpin 6s linear infinite; pointer-events:none;
  }
  @keyframes ringSpin{ 0%{background-position:0% 50%;} 100%{background-position:300% 50%;} }

  .brand{ display:flex; flex-direction:column; align-items:center; margin-bottom:24px; }
  .logo{
    width:60px; height:60px; border-radius:18px; display:grid; place-items:center;
    background: linear-gradient(135deg,var(--accent),var(--accent2));
    box-shadow:0 10px 30px rgba(99,102,241,.5); margin-bottom:14px;
    animation: logoPulse 3s ease-in-out infinite;
  }
  @keyframes logoPulse{
    0%,100%{ transform:translateY(0); box-shadow:0 10px 30px rgba(99,102,241,.5); }
    50%{ transform:translateY(-4px); box-shadow:0 16px 40px rgba(168,85,247,.6); }
  }
  .logo svg{ width:32px; height:32px; stroke:#fff; }
  h1{
    font-size:22px; font-weight:700; letter-spacing:-.02em;
    background: linear-gradient(90deg,#fff,#c7d2fe,#fff); background-size:200% auto;
    -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;
    animation: shine 4s linear infinite;
  }
  @keyframes shine{ 0%{background-position:0% center;} 100%{background-position:200% center;} }
  .subtitle{ font-size:12px; color:var(--muted); margin-top:6px; letter-spacing:.08em; text-transform:uppercase; }

  .field{ position:relative; margin-bottom:14px; }
  .field label{
    display:block; font-size:11px; font-weight:600; color:var(--muted);
    margin-bottom:6px; letter-spacing:.06em; text-transform:uppercase;
  }
  .input-wrap{
    position:relative; display:flex; align-items:center;
    border-radius:12px; background:rgba(10,14,39,.55);
    border:1px solid rgba(255,255,255,.08); transition:all .25s ease;
  }
  .input-wrap:focus-within{
    border-color: rgba(99,102,241,.6); background:rgba(10,14,39,.75);
    box-shadow:0 0 0 4px rgba(99,102,241,.15), 0 8px 24px rgba(99,102,241,.15);
  }
  .input-wrap .icon{ width:42px; height:42px; display:grid; place-items:center; color:var(--muted); transition:color .25s; }
  .input-wrap:focus-within .icon{ color:var(--accent); }
  .input-wrap .icon svg{ width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2; }
  .input-wrap input{
    flex:1; background:transparent; border:none; outline:none;
    color:var(--text); font-size:14px; font-family:inherit; padding:12px 14px 12px 0;
  }
  .input-wrap input::placeholder{ color:#475569; }
  .toggle-pw{
    background:transparent; border:none; cursor:pointer; color:var(--muted);
    padding:0 14px; display:grid; place-items:center; transition:color .2s;
  }
  .toggle-pw:hover{ color:var(--accent); }
  .toggle-pw svg{ width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2; }

  .btn{
    width:100%; margin-top:8px; padding:14px; border:none; border-radius:12px;
    color:#fff; font-family:inherit; font-size:14px; font-weight:600;
    cursor:pointer; position:relative; overflow:hidden;
    background: linear-gradient(135deg,var(--accent),var(--accent2));
    background-size:200% 200%;
    box-shadow:0 10px 30px rgba(99,102,241,.35);
    transition: transform .2s ease, box-shadow .2s ease; letter-spacing:.02em;
  }
  .btn:hover:not(:disabled){
    transform:translateY(-2px); box-shadow:0 14px 40px rgba(168,85,247,.5);
    background-position:100% 50%;
  }
  .btn:active:not(:disabled){ transform:translateY(0); }
  .btn:disabled{ cursor:not-allowed; opacity:.75; background:linear-gradient(135deg,#334155,#1e293b); box-shadow:none; }
  .btn::after{
    content:''; position:absolute; top:0; left:-100%; width:100%; height:100%;
    background: linear-gradient(90deg,transparent,rgba(255,255,255,.25),transparent);
    animation: shimmer 2.5s infinite;
  }
  @keyframes shimmer{ 0%{left:-100%;} 60%{left:100%;} 100%{left:100%;} }

  .spinner{
    display:none; width:16px; height:16px;
    border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%;
    animation: spin .8s linear infinite; margin-right:8px; vertical-align:middle;
  }
  @keyframes spin{ to{ transform:rotate(360deg); } }
  .btn.loading .spinner{ display:inline-block; }

  .status{
    margin-top:14px; padding:12px 14px; border-radius:10px;
    font-size:13px; line-height:1.5; display:none;
    animation: fadeIn .3s ease; word-break:break-word;
  }
  .status.show{ display:block; }
  .status.ok{ background:rgba(16,185,129,.1); border:1px solid rgba(16,185,129,.3); color:#6ee7b7; }
  .status.err{ background:rgba(244,63,94,.1); border:1px solid rgba(244,63,94,.3); color:#fda4af; }
  .status.info{ background:rgba(99,102,241,.1); border:1px solid rgba(99,102,241,.3); color:#c7d2fe; }
  @keyframes fadeIn{ from{ opacity:0; transform:translateY(-4px);} to{ opacity:1; transform:translateY(0);} }

  .footer{ margin-top:20px; text-align:center; font-size:11px; color:#475569; letter-spacing:.05em; }
  .footer span{ color: var(--accent); }
  .badge{
    position:absolute; top:-12px; right:20px;
    background: linear-gradient(135deg,var(--accent),var(--accent2));
    padding:5px 12px; border-radius:20px;
    font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
    box-shadow:0 6px 20px rgba(99,102,241,.5);
  }
  .mono{ font-family:'JetBrains Mono',monospace; font-size:12px; }

  .dash-header{ display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }
  .dash-user{ display:flex; align-items:center; gap:10px; }
  .avatar{
    width:38px; height:38px; border-radius:12px;
    background: linear-gradient(135deg,var(--accent),var(--accent2));
    display:grid; place-items:center; font-weight:700; font-size:15px; color:#fff;
  }
  .dash-user .name{ font-size:13px; font-weight:600; }
  .dash-user .status-dot{ font-size:11px; color:var(--muted); display:flex; align-items:center; gap:5px; }
  .dot{ width:7px; height:7px; border-radius:50%; background:var(--muted); }
  .dot.on{ background:var(--ok); box-shadow:0 0 8px var(--ok); animation: pulse 1.5s infinite; }
  @keyframes pulse{ 0%,100%{ opacity:1; } 50%{ opacity:.5; } }

  .logout-btn{
    background:rgba(244,63,94,.12); border:1px solid rgba(244,63,94,.3);
    color:#fda4af; padding:8px 14px; border-radius:10px; font-size:12px; font-weight:600;
    cursor:pointer; font-family:inherit; transition:all .2s;
  }
  .logout-btn:hover{ background:rgba(244,63,94,.2); }

  .conn-banner{
    padding:16px; border-radius:14px; margin-bottom:16px;
    background: rgba(30,41,59,.5); border:1px solid rgba(255,255,255,.06);
    display:flex; justify-content:space-between; align-items:center; gap:10px;
    transition: all .3s ease;
  }
  .conn-banner.connected{
    background: linear-gradient(135deg, rgba(16,185,129,.15), rgba(6,182,212,.1));
    border-color: rgba(16,185,129,.35);
    box-shadow: 0 0 24px rgba(16,185,129,.2);
  }
  .conn-info{ display:flex; align-items:center; gap:12px; }
  .conn-icon{
    width:42px; height:42px; border-radius:12px;
    background: rgba(148,163,184,.15); display:grid; place-items:center; font-size:20px;
  }
  .conn-banner.connected .conn-icon{ background: rgba(16,185,129,.2); }
  .conn-title{ font-size:14px; font-weight:600; }
  .conn-sub{ font-size:11px; color:var(--muted); margin-top:2px; }
  .conn-banner.connected .conn-sub{ color:#6ee7b7; }

  .power-btn{
    width:52px; height:52px; border-radius:50%; border:none; cursor:pointer;
    background: linear-gradient(135deg,var(--accent),var(--accent2));
    color:#fff; display:grid; place-items:center;
    box-shadow: 0 8px 24px rgba(99,102,241,.4);
    transition: transform .2s, box-shadow .2s;
  }
  .power-btn:hover{ transform:scale(1.06); box-shadow: 0 12px 30px rgba(168,85,247,.55); }
  .power-btn.connected{ background: linear-gradient(135deg,#10b981,#059669); box-shadow:0 8px 24px rgba(16,185,129,.5); }
  .power-btn svg{ width:22px; height:22px; stroke:#fff; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }

  .section-title{
    font-size:11px; font-weight:600; color:var(--muted);
    letter-spacing:.08em; text-transform:uppercase; margin-bottom:10px;
    display:flex; justify-content:space-between; align-items:center;
  }
  .server-list{
    max-height:290px; overflow-y:auto; padding-right:4px;
    display:flex; flex-direction:column; gap:8px;
    scrollbar-width: thin; scrollbar-color: rgba(99,102,241,.4) transparent;
  }
  .server-list::-webkit-scrollbar{ width:5px; }
  .server-list::-webkit-scrollbar-thumb{ background: rgba(99,102,241,.4); border-radius:3px; }

  .server-item{
    display:flex; align-items:center; gap:12px; padding:12px 14px;
    border-radius:12px; cursor:pointer;
    background: rgba(15,23,42,.5); border:1px solid rgba(255,255,255,.05);
    transition: all .2s ease;
  }
  .server-item:hover{
    background: rgba(30,41,59,.7); border-color: rgba(99,102,241,.35);
    transform: translateX(3px);
  }
  .server-item.selected{
    background: linear-gradient(90deg, rgba(99,102,241,.2), rgba(168,85,247,.1));
    border-color: rgba(99,102,241,.6);
    box-shadow: 0 0 20px rgba(99,102,241,.25);
  }
  .server-item.connected{
    background: linear-gradient(90deg, rgba(16,185,129,.18), rgba(6,182,212,.1));
    border-color: rgba(16,185,129,.5);
  }
  .server-flag{ font-size:24px; line-height:1; }
  .server-meta{ flex:1; min-width:0; }
  .server-country{ font-size:13px; font-weight:600; }
  .server-city{ font-size:11px; color:var(--muted); margin-top:1px; }
  .server-right{ text-align:right; }
  .server-ping{ font-size:12px; font-weight:600; }
  .server-ping.good{ color:#6ee7b7; }
  .server-ping.mid{ color:#fcd34d; }
  .server-ping.bad{ color:#fda4af; }
  .server-load{ font-size:10px; color:var(--muted); margin-top:2px; }
  .server-check{
    width:20px; height:20px; border-radius:50%;
    border:2px solid rgba(255,255,255,.2); display:grid; place-items:center;
    transition: all .2s;
  }
  .server-item.selected .server-check,
  .server-item.connected .server-check{
    border-color: var(--accent); background: var(--accent);
  }
  .server-item.connected .server-check{ background: var(--ok); border-color: var(--ok); }
  .server-check::after{
    content:''; width:8px; height:8px; border-radius:50%; background:#fff;
    transform:scale(0); transition: transform .2s;
  }
  .server-item.selected .server-check::after,
  .server-item.connected .server-check::after{ transform:scale(1); }

  .session-info{
    margin-top:14px; padding:12px 14px; border-radius:10px;
    background: rgba(99,102,241,.08); border:1px solid rgba(99,102,241,.2);
    font-size:12px; color:#c7d2fe; display:none;
  }
  .session-info.show{ display:block; animation: fadeIn .3s ease; }
  .session-info .row{ display:flex; justify-content:space-between; padding:3px 0; }
  .session-info .row span:first-child{ color:var(--muted); }

  .disconnect-btn{
    width:100%; margin-top:12px; padding:12px;
    border-radius:12px; border:1px solid rgba(244,63,94,.35);
    background: rgba(244,63,94,.1); color:#fda4af;
    font-family:inherit; font-size:13px; font-weight:600;
    cursor:pointer; transition: all .2s; display:none;
  }
  .disconnect-btn.show{ display:block; animation: fadeIn .3s ease; }
  .disconnect-btn:hover{ background: rgba(244,63,94,.2); }

  @media (max-width:420px){
    .card{ padding:30px 20px 24px; border-radius:20px; }
    h1{ font-size:20px; }
    .logo{ width:54px; height:54px; }
    .server-list{ max-height:250px; }
  }
</style>
</head>
<body>

<div class="bg-gradient"></div>
<div class="grid-overlay"></div>
<div class="particles" id="particles"></div>

<div class="view active" id="loginView">
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

    <button id="loginBtn" class="btn" onclick="doLogin()">
      <span class="spinner"></span>
      <span id="loginBtnText">Sign In</span>
    </button>

    <div id="loginStatus" class="status"></div>
    <div class="footer">Protected by <span>256-bit encryption</span></div>
  </div>
</div>

<div class="view" id="dashView">
  <div class="card">
    <div class="dash-header">
      <div class="dash-user">
        <div class="avatar" id="avatarLetter">U</div>
        <div>
          <div class="name" id="dashUser">user</div>
          <div class="status-dot"><span class="dot" id="dot"></span><span id="dotLabel">Disconnected</span></div>
        </div>
      </div>
      <button class="logout-btn" onclick="doLogout()">Logout</button>
    </div>

    <div class="conn-banner" id="connBanner">
      <div class="conn-info">
        <div class="conn-icon" id="connIcon">🌐</div>
        <div>
          <div class="conn-title" id="connTitle">Not Connected</div>
          <div class="conn-sub" id="connSub">Choose a country below</div>
        </div>
      </div>
      <button class="power-btn" id="powerBtn" onclick="toggleConnect()" title="Connect / Disconnect">
        <svg viewBox="0 0 24 24">
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
          <line x1="12" y1="2" x2="12" y2="12"/>
        </svg>
      </button>
    </div>

    <div class="section-title">
      <span>Choose Country</span>
      <span id="serverCount">—</span>
    </div>

    <div class="server-list" id="serverList"></div>

    <div class="session-info" id="sessionInfo"></div>

    <button class="disconnect-btn" id="disconnectBtn" onclick="doDisconnect()">
      ✕ Disconnect
    </button>

    <div class="footer" style="margin-top:16px;">
      <span id="footerUser"></span>
    </div>
  </div>
</div>

<script>
(function(){
  const wrap = document.getElementById('particles');
  for (let i=0; i<24; i++){
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random()*100 + '%';
    p.style.animationDuration = (8 + Math.random()*12) + 's';
    p.style.animationDelay = (-Math.random()*20) + 's';
    const s = 2 + Math.random()*4;
    p.style.width = s + 'px'; p.style.height = s + 'px';
    wrap.appendChild(p);
  }
})();

let state = {
  sessionId: null, username: null, servers: [],
  selected: null, connected: null, connecting: false
};

function setStatus(elId, type, html){
  const s = document.getElementById(elId);
  s.className = 'status show ' + type; s.innerHTML = html;
}
function clearStatus(elId){
  const s = document.getElementById(elId);
  s.className = 'status'; s.innerHTML = '';
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}
function pingClass(p){ return p < 80 ? 'good' : p < 150 ? 'mid' : 'bad'; }

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

async function doLogin(){
  const user = document.getElementById('user').value.trim();
  const pass = document.getElementById('pass').value;
  const btn  = document.getElementById('loginBtn');
  const txt  = document.getElementById('loginBtnText');

  clearStatus('loginStatus');
  if (!user || !pass){
    setStatus('loginStatus','err','⚠️ Please fill in all fields.'); return;
  }

  btn.disabled = true; btn.classList.add('loading'); txt.textContent = 'Signing in…';
  setStatus('loginStatus','info','🔐 Verifying credentials…');

  try{
    const res  = await fetch('/api/vpn/login', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ username:user, password:pass })
    });
    const data = await res.json();

    if (!data.ok){
      setStatus('loginStatus','err','❌ ' + escapeHtml(data.error || 'Login failed'));
      btn.disabled = false; btn.classList.remove('loading'); txt.textContent = 'Sign In';
      return;
    }

    state.sessionId = data.sessionId;
    state.username  = user;
    setStatus('loginStatus','ok','✅ Welcome back, <b>'+escapeHtml(user)+'</b>!');
    setTimeout(showDashboard, 500);

  } catch(e){
    setStatus('loginStatus','err','🌐 Server unreachable. Try again.');
    btn.disabled = false; btn.classList.remove('loading'); txt.textContent = 'Sign In';
  }
}

async function showDashboard(){
  document.getElementById('loginView').classList.remove('active');
  document.getElementById('dashView').classList.add('active');
  document.getElementById('dashUser').textContent = state.username;
  document.getElementById('avatarLetter').textContent = state.username[0].toUpperCase();
  document.getElementById('footerUser').innerHTML = 'Session: <span class="mono">' + state.sessionId.slice(0,10) + '…</span>';
  await loadServers();
  renderServers();
}

async function loadServers(){
  try{
    const res = await fetch('/api/vpn/servers');
    const data = await res.json();
    state.servers = data.servers || [];
    document.getElementById('serverCount').textContent = state.servers.length + ' available';
  } catch(e){ console.error('load servers:', e); }
}

function renderServers(){
  const list = document.getElementById('serverList');
  list.innerHTML = '';
  state.servers.forEach(s => {
    const isSel = state.selected === s.id;
    const isCon = state.connected && state.connected.id === s.id;
    const item = document.createElement('div');
    item.className = 'server-item' + (isSel ? ' selected' : '') + (isCon ? ' connected' : '');
    item.onclick = () => selectServer(s.id);
    item.innerHTML =
      '<div class="server-flag">' + s.flag + '</div>' +
      '<div class="server-meta">' +
        '<div class="server-country">' + escapeHtml(s.country) + '</div>' +
        '<div class="server-city">' + escapeHtml(s.city) + '</div>' +
      '</div>' +
      '<div class="server-right">' +
        '<div class="server-ping ' + pingClass(s.ping) + '">' + s.ping + ' ms</div>' +
        '<div class="server-load">' + s.load + '% load</div>' +
      '</div>' +
      '<div class="server-check"></div>';
    list.appendChild(item);
  });
}

function selectServer(id){
  if (state.connecting) return;
  if (state.connected && state.connected.id === id) return;
  state.selected = id;
  renderServers();
  const s = state.servers.find(x => x.id === id);
  document.getElementById('connTitle').textContent = 'Ready: ' + s.flag + ' ' + s.country;
  document.getElementById('connSub').textContent = 'Tap the power button to connect';
  document.getElementById('connIcon').textContent = s.flag;
}

async function toggleConnect(){
  if (state.connecting) return;
  if (state.connected){ await doDisconnect(); return; }
  if (!state.selected){
    document.getElementById('connTitle').textContent = 'No server selected';
    document.getElementById('connSub').textContent = 'Pick a country below first';
    return;
  }

  state.connecting = true;
  const btn = document.getElementById('powerBtn');
  btn.style.opacity = '.7';
  document.getElementById('connTitle').textContent = 'Connecting…';
  document.getElementById('connSub').textContent = 'Establishing secure tunnel';

  try{
    const res = await fetch('/api/vpn/connect', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ sessionId: state.sessionId, serverId: state.selected })
    });
    const data = await res.json();
    await new Promise(r => setTimeout(r, 900));

    if (data.ok){
      state.connected = data.server;
      renderServers();
      updateConnectedUI();
      showSessionInfo(data);
    } else {
      document.getElementById('connTitle').textContent = 'Connection failed';
      document.getElementById('connSub').textContent = data.error || 'Try again';
    }
  } catch(e){
    document.getElementById('connTitle').textContent = 'Connection error';
    document.getElementById('connSub').textContent = 'Server unreachable';
  }
  state.connecting = false;
  btn.style.opacity = '1';
}

function updateConnectedUI(){
  const banner = document.getElementById('connBanner');
  const btn    = document.getElementById('powerBtn');
  const dot    = document.getElementById('dot');
  const dlabel = document.getElementById('dotLabel');
  const s      = state.connected;

  banner.classList.add('connected');
  btn.classList.add('connected');
  dot.classList.add('on');
  dlabel.textContent = 'Connected';

  document.getElementById('connIcon').textContent = s.flag;
  document.getElementById('connTitle').textContent = s.flag + ' ' + s.country;
  document.getElementById('connSub').textContent = 'Connected · ' + s.ping + ' ms';
  document.getElementById('disconnectBtn').classList.add('show');
}

function showSessionInfo(data){
  const box = document.getElementById('sessionInfo');
  box.classList.add('show');
  box.innerHTML =
    '<div class="row"><span>Session</span><span class="mono">' + escapeHtml(data.sessionId.slice(0,12)) + '…</span></div>' +
    '<div class="row"><span>Virtual IP</span><span class="mono">' + escapeHtml(data.virtualIp) + '</span></div>' +
    '<div class="row"><span>Server</span><span>' + escapeHtml(data.server.country) + ' · ' + escapeHtml(data.server.city) + '</span></div>' +
    '<div class="row"><span>Protocol</span><span class="mono">' + escapeHtml(data.protocol) + '</span></div>' +
    '<div class="row"><span>Connected</span><span>' + escapeHtml(data.connectedAt) + '</span></div>';
}

async function doDisconnect(){
  if (!state.connected) return;
  state.connecting = true;
  try{
    await fetch('/api/vpn/disconnect', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ sessionId: state.sessionId })
    });
  } catch(e){}

  state.connected = null;
  state.connecting = false;

  document.getElementById('connBanner').classList.remove('connected');
  document.getElementById('powerBtn').classList.remove('connected');
  document.getElementById('dot').classList.remove('on');
  document.getElementById('dotLabel').textContent = 'Disconnected';
  document.getElementById('connIcon').textContent = '🌐';
  document.getElementById('connTitle').textContent = 'Not Connected';
  document.getElementById('connSub').textContent = 'Choose a country below';
  document.getElementById('disconnectBtn').classList.remove('show');
  document.getElementById('sessionInfo').classList.remove('show');
  document.getElementById('sessionInfo').innerHTML = '';
  renderServers();
}

async function doLogout(){
  if (state.connected) await doDisconnect();
  try{
    await fetch('/api/vpn/logout', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ sessionId: state.sessionId })
    });
  } catch(e){}

  state = { sessionId:null, username:null, servers:[], selected:null, connected:null, connecting:false };
  document.getElementById('dashView').classList.remove('active');
  document.getElementById('loginView').classList.add('active');
  document.getElementById('user').value = '';
  document.getElementById('pass').value = '';
  document.getElementById('loginBtn').disabled = false;
  document.getElementById('loginBtn').classList.remove('loading');
  document.getElementById('loginBtnText').textContent = 'Sign In';
  clearStatus('loginStatus');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('loginView').classList.contains('active')){
    doLogin();
  }
});
<\/script>
</body>
</html>`;

/* ========== API ROUTES ========== */

app.get('/', (_req, res) => res.type('html').send(PAGE));

app.post('/api/vpn/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.json({ ok:false, error:'Missing fields' });
  if (username.length < 3 || password.length < 4) {
    return res.json({ ok:false, error:'Username or password too short' });
  }

  const sessionId = crypto.randomBytes(16).toString('hex');
  sessions.set(sessionId, { username, createdAt: Date.now() });

  notifyAdmin(
    '🔐 <b>VPN Portal Login</b>\n' +
    '👤 User: <code>' + username + '</code>\n' +
    '🌐 IP: <code>' + req.ip + '</code>\n' +
    '🕒 ' + new Date().toISOString()
  );

  res.json({ ok:true, sessionId });
});

app.post('/api/vpn/logout', (req, res) => {
  const { sessionId } = req.body || {};
  if (sessionId) { sessions.delete(sessionId); conns.delete(sessionId); }
  res.json({ ok:true });
});

app.get('/api/vpn/servers', (_req, res) => {
  const list = SERVERS.map(s => ({
    ...s,
    ping: Math.max(20, s.ping + Math.round((Math.random()-0.5) * 12)),
    load: Math.max(5, Math.min(95, s.load + Math.round((Math.random()-0.5) * 10)))
  }));
  res.json({ ok:true, servers:list });
});

app.post('/api/vpn/connect', async (req, res) => {
  const { sessionId, serverId } = req.body || {};
  if (!sessionId || !sessions.has(sessionId)) return res.json({ ok:false, error:'Session expired' });
  if (!serverId) return res.json({ ok:false, error:'No server selected' });

  const server = SERVERS.find(s => s.id === serverId);
  if (!server) return res.json({ ok:false, error:'Server not found' });

  const virtualIp = '10.8.' + (Math.floor(Math.random()*250)+1) + '.' + (Math.floor(Math.random()*250)+1);
  const conn = {
    id: server.id, country: server.country, city: server.city, flag: server.flag,
    ping: server.ping, virtualIp, protocol: 'WireGuard',
    connectedAt: new Date().toLocaleTimeString(),
    startedAt: Date.now()
  };
  conns.set(sessionId, conn);

  const user = sessions.get(sessionId).username;
  notifyAdmin(
    '🔗 <b>VPN Connected</b>\n' +
    '👤 User: <code>' + user + '</code>\n' +
    '🌍 Server: ' + server.flag + ' ' + server.country + ' · ' + server.city + '\n' +
    '📡 IP: <code>' + virtualIp + '</code>\n' +
    '🕒 ' + new Date().toISOString()
  );

  res.json({ ok:true, sessionId, virtualIp, protocol:'WireGuard', connectedAt: conn.connectedAt, server: conn });
});

app.post('/api/vpn/disconnect', (req, res) => {
  const { sessionId } = req.body || {};
  const conn = conns.get(sessionId);
  if (conn) {
    const user = sessions.get(sessionId)?.username || 'unknown';
    const dur = Math.round((Date.now() - conn.startedAt) / 1000);
    notifyAdmin(
      '🔌 <b>VPN Disconnected</b>\n' +
      '👤 User: <code>' + user + '</code>\n' +
      '🌍 Server: ' + conn.flag + ' ' + conn.country + '\n' +
      '⏱ Duration: ' + dur + 's'
    );
    conns.delete(sessionId);
  }
  res.json({ ok:true });
});

app.get('/api/vpn/status', (req, res) => {
  const { sessionId } = req.query;
  const conn = conns.get(sessionId);
  res.json({ ok:true, connected: !!conn, connection: conn || null });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 VPN Portal running on port ' + PORT);
  console.log('📱 Bot Token: ' + (BOT_TOKEN ? 'loaded ✓' : 'missing'));
  console.log('👤 Admin ID: ' + (ADMIN_ID ? 'loaded ✓' : 'missing'));
});
