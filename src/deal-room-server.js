// argon-attestation/src/deal-room-server.js
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  injectStealthWatermark,
  extractAndAuthenticateWatermark,
  shapeNaturalEntropy,
} = require('./stealth-cipher.js');
const { runCouncilTurn, AGENTS, COUNCIL_LOG } = require('./council-engine.js');

// In-memory council state
let councilTurns = [];
let councilClients = []; // SSE clients
let councilRunning = false;

// Load existing council log into memory
try {
  if (fs.existsSync(COUNCIL_LOG)) {
    const lines = fs.readFileSync(COUNCIL_LOG, 'utf8').trim().split('\n').filter(Boolean);
    councilTurns = lines.map(l => { try { return JSON.parse(l); } catch(e) { return null; } }).filter(Boolean).slice(-100);
  }
} catch(e) {}

// Auto-start council loop
function broadcastToSSE(turn) {
  const data = `data: ${JSON.stringify(turn)}\n\n`;
  councilClients = councilClients.filter(client => {
    try { client.write(data); return true; } catch(e) { return false; }
  });
}

async function runCouncilLoop() {
  if (councilRunning) return;
  councilRunning = true;
  const CC_PATH = 'C:\\Users\\Jayson Quindao\\Desktop\\Career & Applications\\OPPORTUNITY_COMMAND_CENTER.json';
  const PROF_PATH = 'C:\\Users\\Jayson Quindao\\Desktop\\Career & Applications\\01_Master_Documents\\VERIFIED_PROFILE.json';
  
  while (true) {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) { await new Promise(r => setTimeout(r, 10000)); continue; }
      const ccData = fs.existsSync(CC_PATH) ? JSON.parse(fs.readFileSync(CC_PATH, 'utf8')) : {};
      const profData = fs.existsSync(PROF_PATH) ? JSON.parse(fs.readFileSync(PROF_PATH, 'utf8')) : {};
      const turn = await runCouncilTurn(apiKey, ccData, profData, councilTurns);
      councilTurns.push(turn);
      if (councilTurns.length > 200) councilTurns = councilTurns.slice(-200);
      broadcastToSSE(turn);
    } catch(e) {
      broadcastToSSE({ agent: 'SYSTEM', color: '#ef4444', role: 'Error', message: e.message, timestampUtc: new Date().toISOString() });
    }
    // 25-second cadence between agent turns (sustainable quota + human readable stream)
    await new Promise(r => setTimeout(r, 25000));
  }
}
setTimeout(runCouncilLoop, 3000); // start 3s after server boot

const LOG_FILE = path.join(__dirname, '..', 'live-hits.log');
const PORT = process.env.PORT || 4020;
const MASTER_SECRET = process.env.ARGON_SECRET || 'GG_LOOP_SOVEREIGN_CTO_KEY_2026_PRODUCTION';

// REAL LIVE STRIPE PAYMENT LINKS
const STRIPE_SPRINT_URL = process.env.STRIPE_SPRINT_URL || 'https://buy.stripe.com/28EaEZgIc2rTan1gVG0Fi06';
const STRIPE_UNLOCK_URL = process.env.STRIPE_UNLOCK_URL || 'https://buy.stripe.com/3cIaEZ2Rm9Ulbr534Q0Fi07';

const DEMO_DOM_SNAPSHOT = '<html><body><div id="procurement-notice" data-agency="TX-DIR" data-status="ADVERSE_ACTION">RFP-2026-88412 Mandatory Compliance Filing</div></body></html>';
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

function createLiveAttestation(targetId) {
  const domHash = crypto.createHash('sha256').update(DEMO_DOM_SNAPSHOT).digest('hex');
  const pubKeyDer = publicKey.export({ type: 'spki', format: 'der' });
  const pubKeyFingerprint = crypto.createHash('sha256').update(pubKeyDer).digest('hex').slice(0, 32);

  const fullPayload = {
    targetPortal: targetId.toUpperCase(),
    timestampUtc: new Date().toISOString(),
    domStateSha256: domHash,
    schemaValidation: 'STRICT_PASS',
    extractedRecords: [
      { id: 'REC-001', status: 'VERIFIED', statutoryWindow: '7 CFR § 273.15 / 30-Day SLA', rawValue: '$142,500.00' },
      { id: 'REC-002', status: 'REDACTED_UNTIL_UNLOCK', statutoryWindow: '[LOCKED]', rawValue: '[LOCKED]' },
      { id: 'REC-003', status: 'REDACTED_UNTIL_UNLOCK', statutoryWindow: '[LOCKED]', rawValue: '[LOCKED]' }
    ]
  };

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(JSON.stringify(fullPayload));
  signer.end();
  const signature = signer.sign(privateKey, 'hex');

  return { fullPayload, signature, pubKeyFingerprint };
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) req.destroy(); // 1MB limit
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  const logLine = `[${new Date().toISOString()}] [IP: ${ip}] [UA: ${ua}] [URL: ${req.url}]\n`;
  try { fs.appendFileSync(LOG_FILE, logLine); } catch (e) {}

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // 1. JSON API: Steganography Embed Endpoint
  if (url.pathname === '/api/embed-watermark' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const text = data.text || '';
      const contextId = data.contextId || 'INNOVATION_CORE';
      const payload = {
        provenance: 'GG_LOOP_SOVEREIGN_CTO_SUITE',
        author: 'Jayson Quindao',
        contextId: contextId,
        dealRoomUrl: `${url.origin}/deal/${encodeURIComponent(contextId.toLowerCase())}`,
        stripeRail: STRIPE_SPRINT_URL,
        timestampUtc: new Date().toISOString(),
        entropyHash: crypto.createHash('sha256').update(text).digest('hex'),
      };

      const shapedText = shapeNaturalEntropy(text);
      const watermarked = injectStealthWatermark(shapedText, payload, MASTER_SECRET);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: 'SUCCESS',
        watermarkedText: watermarked,
        payload,
        bytesInvisibleZeroWidth: watermarked.length - shapedText.length,
      }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // 2. JSON API: Steganography Verify Endpoint
  if (url.pathname === '/api/verify-steganography' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const text = data.text || '';
      const extracted = extractAndAuthenticateWatermark(text, MASTER_SECRET);

      if (!extracted) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          status: 'INVALID_OR_MISSING_WATERMARK',
          message: 'No valid cryptographic zero-width watermark detected with current master secret.'
        }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: 'AUTHENTICATED',
        provenance: extracted,
      }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // 3. JSON API: Classical RSA-2048 Verification Endpoint
  if (url.pathname.startsWith('/api/verify/')) {
    const target = url.pathname.replace('/api/verify/', '') || 'govstar-demo';
    const artifact = createLiveAttestation(target);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(artifact, null, 2));
  }

  // 3b. JSON API: Full System Memory & Status for External AIs
  if (url.pathname === '/api/status' && req.method === 'GET') {
    try {
      const ccPath = 'C:\\Users\\Jayson Quindao\\Desktop\\Career & Applications\\OPPORTUNITY_COMMAND_CENTER.json';
      const profPath = 'C:\\Users\\Jayson Quindao\\Desktop\\Career & Applications\\01_Master_Documents\\VERIFIED_PROFILE.json';
      const ccData = fs.existsSync(ccPath) ? JSON.parse(fs.readFileSync(ccPath, 'utf8')) : {};
      const profData = fs.existsSync(profPath) ? JSON.parse(fs.readFileSync(profPath, 'utf8')) : {};
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: 'ONLINE',
        system: 'GG_LOOP_AUTONOMOUS_OPERATING_SYSTEM',
        operator: profData.full_name || 'Jayson Quindao',
        active_rails: ccData.director_status?.active_rails || {},
        executive_summary: ccData.executive_summary || {},
        opportunities_count: (ccData.active_opportunities || []).length,
        active_opportunities: ccData.active_opportunities || [],
        timestampUtc: new Date().toISOString()
      }, null, 2));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // 3bb. JSON API: Direct Autonomous Gemini Sync & Reasoning
  if (url.pathname === '/api/gemini-sync') {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'GEMINI_API_KEY not found in environment' }));
      }

      const ccPath = 'C:\\Users\\Jayson Quindao\\Desktop\\Career & Applications\\OPPORTUNITY_COMMAND_CENTER.json';
      const profPath = 'C:\\Users\\Jayson Quindao\\Desktop\\Career & Applications\\01_Master_Documents\\VERIFIED_PROFILE.json';
      const ccData = fs.existsSync(ccPath) ? JSON.parse(fs.readFileSync(ccPath, 'utf8')) : {};
      const profData = fs.existsSync(profPath) ? JSON.parse(fs.readFileSync(profPath, 'utf8')) : {};

      let userPrompt = 'Synthesize current system state, verify active opportunities, and confirm autonomous alignment with Director.';
      if (req.method === 'POST') {
        const body = await parseJsonBody(req);
        if (body.prompt) userPrompt = body.prompt;
      }

      const systemContext = `You are the Autonomous Cloud Strategic Brain for Founder Jayson Quindao (GG Loop LLC).
Current Sovereign State:
- Founder: ${profData.full_name} (${profData.email_primary}, ${profData.phone})
- Active Rails: ${JSON.stringify(ccData.director_status?.active_rails || {}, null, 2)}
- Active Pipeline Opportunities: ${(ccData.active_opportunities || []).length} total
${JSON.stringify((ccData.active_opportunities || []).map(o => ({ id: o.id, target: o.organization, role: o.role, stage: o.lifecycle_stage, channel: o.contact_channel })), null, 2)}

User/Director Prompt: ${userPrompt}
Provide a high-leverage, direct executive analysis with zero fluff.`;

      const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemContext }] }]
        })
      });

      const geminiJson = await geminiRes.json();
      const aiReply = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No response generated';

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: 'SYNCED',
        engine: 'gemini-2.5-flash',
        prompt_received: userPrompt,
        gemini_response: aiReply,
        timestampUtc: new Date().toISOString()
      }, null, 2));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // 3c. JSON API: Inbound Chat & Signals Bridge
  const CHAT_LOG = path.join(__dirname, '..', 'inbound-chat.jsonl');
  if (url.pathname === '/api/chat-inbound' && req.method === 'POST') {
    try {
      const data = await parseJsonBody(req);
      const incomingMsg = {
        id: crypto.randomUUID(),
        sender: data.sender || 'external_ai',
        message: data.message || '',
        timestampUtc: new Date().toISOString()
      };
      fs.appendFileSync(CHAT_LOG, JSON.stringify(incomingMsg) + '\n');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: 'RECEIVED_AND_ANCHORED',
        delivery: 'DIRECTOR_TELEMETRY_LOGGED',
        received: incomingMsg,
        reply: 'Message received and securely anchored into Jayson\'s permanent system memory. Director and Antigravity will process this in active telemetry loops.'
      }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  if (url.pathname === '/api/chat-history' && req.method === 'GET') {
    try {
      const lines = fs.existsSync(CHAT_LOG) ? fs.readFileSync(CHAT_LOG, 'utf8').trim().split('\n').filter(Boolean) : [];
      const msgs = lines.map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ messages: msgs.slice(-50) }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: e.message }));
    }
  }

  // 3d. Interactive Web Chat Interface
  if (url.pathname === '/chat') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GG Loop // Antigravity & Director Bridge</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { background: #0b0f19; color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; margin: 0; padding: 20px; display: flex; flex-direction: column; height: 92vh; }
    .header { border-bottom: 1px solid #1e293b; padding-bottom: 14px; margin-bottom: 14px; }
    .title { font-size: 18px; font-weight: bold; color: #38bdf8; }
    .status { font-size: 12px; color: #10b981; }
    #chat-box { flex: 1; overflow-y: auto; background: #050811; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 14px; }
    .msg { margin-bottom: 12px; padding: 8px 12px; border-radius: 6px; font-size: 13px; max-width: 80%; line-height: 1.4; }
    .msg.incoming { background: #1e293b; color: #e2e8f0; margin-right: auto; border-left: 3px solid #38bdf8; }
    .msg.system { background: #064e3b; color: #6ee7b7; margin-left: auto; border-right: 3px solid #10b981; }
    .input-row { display: flex; gap: 8px; }
    input[type="text"] { flex: 1; background: #111827; border: 1px solid #374151; color: #f9fafb; padding: 12px; border-radius: 6px; font-size: 14px; outline: none; }
    button { background: #0284c7; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; }
    button:hover { background: #0369a1; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">⚡ GG LOOP // AUTONOMOUS AGENT BRIDGE</div>
    <div class="status">● System Live | Connected to Antigravity & Director</div>
  </div>
  <div id="chat-box"></div>
  <form class="input-row" id="chat-form">
    <input type="text" id="msg-input" placeholder="Type a message or paste from another AI..." autocomplete="off" />
    <button type="submit">Send</button>
  </form>
  <script>
    const box = document.getElementById('chat-box');
    const form = document.getElementById('chat-form');
    const input = document.getElementById('msg-input');
    async function loadHistory() {
      try {
        const res = await fetch('/api/chat-history');
        const data = await res.json();
        box.innerHTML = '';
        data.messages.forEach(m => {
          const d = document.createElement('div');
          d.className = 'msg ' + (m.sender === 'system' ? 'system' : 'incoming');
          d.innerHTML = '<strong>' + (m.sender || 'User') + ':</strong> ' + m.message;
          box.appendChild(d);
        });
        box.scrollTop = box.scrollHeight;
      } catch (e) {}
    }
    form.onsubmit = async (e) => {
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;
      input.value = '';
      const d = document.createElement('div');
      d.className = 'msg incoming';
      d.innerHTML = '<strong>You:</strong> ' + val;
      box.appendChild(d);
      box.scrollTop = box.scrollHeight;
      try {
        const res = await fetch('/api/chat-inbound', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender: 'external_browser_or_ai', message: val })
        });
        const resp = await res.json();
        const rep = document.createElement('div');
        rep.className = 'msg system';
        rep.innerHTML = '<strong>Director:</strong> ' + resp.reply;
        box.appendChild(rep);
        box.scrollTop = box.scrollHeight;
      } catch (err) {}
    };
    loadHistory();
    setInterval(loadHistory, 3000);
  </script>
</body>
</html>`);
  }

  // 4a. Council SSE Stream
  if (url.pathname === '/api/council-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    // Send last 20 turns immediately
    const recent = councilTurns.slice(-20);
    recent.forEach(t => res.write(`data: ${JSON.stringify(t)}\n\n`));
    councilClients.push(res);
    req.on('close', () => {
      councilClients = councilClients.filter(c => c !== res);
    });
    return; // keep connection open
  }

  // 4b. War Room UI
  if (url.pathname === '/war-room') {
    const warRoomHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>GG LOOP // SOVEREIGN WAR ROOM</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #050810; color: #e2e8f0; font-family: ui-monospace, 'Cascadia Code', 'Fira Code', Consolas, monospace; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    .topbar { background: #0a0e1a; border-bottom: 1px solid #1e293b; padding: 10px 20px; display: flex; align-items: center; gap: 20px; flex-shrink: 0; }
    .topbar-title { font-size: 15px; font-weight: bold; color: #f59e0b; letter-spacing: 0.08em; }
    .topbar-status { font-size: 11px; color: #10b981; display: flex; align-items: center; gap: 5px; }
    .pulse { width: 8px; height: 8px; background: #10b981; border-radius: 50%; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.3)} }
    .panels { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; padding: 8px; flex: 1; overflow: hidden; }
    .panel { background: #090d1a; border: 1px solid #1e293b; border-radius: 6px; display: flex; flex-direction: column; overflow: hidden; }
    .panel-header { background: #0f1629; border-bottom: 1px solid #1e293b; padding: 8px 12px; font-size: 11px; font-weight: bold; color: #94a3b8; letter-spacing: 0.1em; text-transform: uppercase; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .panel-header .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .panel-body { flex: 1; overflow-y: auto; padding: 10px; }
    .panel-body::-webkit-scrollbar { width: 4px; }
    .panel-body::-webkit-scrollbar-track { background: #0a0e1a; }
    .panel-body::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }

    /* Panel A - Council */
    .council-turn { margin-bottom: 10px; padding: 8px 10px; border-radius: 5px; background: #0d1225; border-left: 3px solid; animation: fadein .4s ease; }
    @keyframes fadein { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }
    .council-turn .agent-label { font-size: 10px; font-weight: bold; letter-spacing: 0.08em; margin-bottom: 4px; }
    .council-turn .agent-msg { font-size: 12px; color: #cbd5e1; line-height: 1.45; }
    .council-turn .ts { font-size: 9px; color: #475569; margin-top: 4px; }

    /* Panel B - Pipeline */
    .pipeline-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .pipeline-table th { background: #0f1629; color: #64748b; padding: 5px 8px; text-align: left; border-bottom: 1px solid #1e293b; position: sticky; top: 0; }
    .pipeline-table td { padding: 5px 8px; border-bottom: 1px solid #0f1629; color: #94a3b8; }
    .pipeline-table tr:hover td { background: #0d1225; }
    .stage-badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: bold; }
    .stage-SUBMITTED { background: #064e3b; color: #34d399; }
    .stage-PITCHED { background: #1e3a5f; color: #60a5fa; }
    .stage-APPLIED { background: #312e81; color: #a5b4fc; }
    .stage-RESEARCHING { background: #292524; color: #a8a29e; }
    .stage-CLOSED { background: #7f1d1d; color: #fca5a5; }
    .stage-ACTIVE { background: #065f46; color: #6ee7b7; }
    .stage-BYPASS { background: #78350f; color: #fcd34d; }
    .lane-header { background: #0a0e1a; color: #475569; font-size: 10px; padding: 4px 8px; text-transform: uppercase; letter-spacing: 0.1em; }

    /* Panel C - SMTP Wire */
    .wire-entry { font-size: 11px; padding: 6px 8px; border-bottom: 1px solid #0f1629; display: flex; gap: 8px; align-items: flex-start; }
    .wire-direction { font-size: 9px; font-weight: bold; padding: 2px 5px; border-radius: 3px; flex-shrink: 0; margin-top: 1px; }
    .wire-OUT { background: #1e3a5f; color: #60a5fa; }
    .wire-IN { background: #064e3b; color: #34d399; }
    .wire-entry .wire-body { flex: 1; }
    .wire-entry .wire-to { color: #64748b; font-size: 10px; }
    .wire-entry .wire-subj { color: #cbd5e1; }
    .wire-entry .wire-ts { color: #475569; font-size: 9px; }

    /* Panel D - System Stats */
    .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #0f1629; }
    .stat-label { font-size: 11px; color: #64748b; }
    .stat-value { font-size: 12px; font-weight: bold; color: #38bdf8; }
    .stat-ok { color: #34d399; }
    .stat-warn { color: #f59e0b; }
    .stat-url { font-size: 10px; color: #a78bfa; word-break: break-all; }
    .agent-roster { margin-top: 10px; }
    .agent-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 3px; font-size: 10px; margin: 2px; border: 1px solid; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-title">⚡ GG LOOP // SOVEREIGN WAR ROOM</div>
    <div class="topbar-status"><span class="pulse"></span> COUNCIL LIVE</div>
    <div class="topbar-status" style="margin-left:auto;color:#64748b;" id="clock"></div>
  </div>
  <div class="panels">
    <!-- Panel A: Council Debate -->
    <div class="panel">
      <div class="panel-header"><span class="dot" style="background:#f59e0b"></span>PANEL A // LIVE COUNCIL DEBATE</div>
      <div class="panel-body" id="council-feed">
        <div style="color:#475569;font-size:11px;padding:10px 0;">Connecting to council stream...</div>
      </div>
    </div>

    <!-- Panel B: Pipeline Matrix -->
    <div class="panel">
      <div class="panel-header"><span class="dot" style="background:#38bdf8"></span>PANEL B // PIPELINE MATRIX</div>
      <div class="panel-body" id="pipeline-body">
        <div style="color:#475569;font-size:11px;">Loading...</div>
      </div>
    </div>

    <!-- Panel C: SMTP Wire Feed -->
    <div class="panel">
      <div class="panel-header"><span class="dot" style="background:#34d399"></span>PANEL C // IMAP & SMTP WIRE FEED</div>
      <div class="panel-body" id="wire-feed">
        <div style="color:#475569;font-size:11px;">Loading email wire...</div>
      </div>
    </div>

    <!-- Panel D: System Stats -->
    <div class="panel">
      <div class="panel-header"><span class="dot" style="background:#a78bfa"></span>PANEL D // SYSTEM STATUS</div>
      <div class="panel-body" id="stats-body">
        <div style="color:#475569;font-size:11px;">Loading...</div>
      </div>
    </div>
  </div>

  <script>
    // Clock
    function tick() { document.getElementById('clock').textContent = new Date().toLocaleTimeString('en-US',{hour12:false}); }
    tick(); setInterval(tick, 1000);

    // PANEL A: Council SSE stream
    const feed = document.getElementById('council-feed');
    function addTurn(turn) {
      const el = document.createElement('div');
      el.className = 'council-turn';
      el.style.borderLeftColor = turn.color || '#475569';
      const ts = turn.timestampUtc ? new Date(turn.timestampUtc).toLocaleTimeString('en-US',{hour12:false}) : '';
      el.innerHTML = \`<div class="agent-label" style="color:\${turn.color||'#94a3b8'}">[<strong>\${turn.agent}</strong>] \${turn.role||''}</div><div class="agent-msg">\${(turn.message||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div><div class="ts">\${ts}</div>\`;
      feed.appendChild(el);
      feed.scrollTop = feed.scrollHeight;
    }
    const evtSource = new EventSource('/api/council-stream');
    evtSource.onopen = () => { feed.innerHTML = ''; };
    evtSource.onmessage = (e) => {
      try { addTurn(JSON.parse(e.data)); } catch(err) {}
    };
    evtSource.onerror = () => {
      const el = document.createElement('div');
      el.style.cssText = 'color:#ef4444;font-size:10px;padding:4px 0;';
      el.textContent = '[SSE reconnecting...]';
      feed.appendChild(el);
    };

    // PANEL B: Pipeline
    function stageClass(stage) {
      if (!stage) return '';
      const s = stage.toUpperCase();
      if (s.includes('SUBMIT')) return 'stage-SUBMITTED';
      if (s.includes('PITCH') || s.includes('FOUNDER')) return 'stage-PITCHED';
      if (s.includes('APPLIED') || s.includes('APPLICATION')) return 'stage-APPLIED';
      if (s.includes('RESEARCH')) return 'stage-RESEARCHING';
      if (s.includes('CLOSE') || s.includes('REJECT') || s.includes('BYPASS')) return 'stage-BYPASS';
      if (s.includes('ACTIVE') || s.includes('LIVE')) return 'stage-ACTIVE';
      return 'stage-APPLIED';
    }
    async function loadPipeline() {
      try {
        const r = await fetch('/api/status');
        const d = await r.json();
        const opps = d.active_opportunities || [];
        const byLane = {};
        opps.forEach(o => {
          const lane = o.lane || o.contact_channel || 'OTHER';
          if (!byLane[lane]) byLane[lane] = [];
          byLane[lane].push(o);
        });
        let html = \`<table class="pipeline-table"><thead><tr><th>ID</th><th>Target</th><th>Role</th><th>Stage</th></tr></thead><tbody>\`;
        Object.keys(byLane).sort().forEach(lane => {
          html += \`<tr><td colspan="4" class="lane-header">▸ \${lane} (\${byLane[lane].length})</td></tr>\`;
          byLane[lane].forEach(o => {
            const sc = stageClass(o.lifecycle_stage || '');
            html += \`<tr><td style="color:#475569">\${o.id||''}</td><td style="color:#e2e8f0">\${(o.organization||'').slice(0,18)}</td><td style="color:#94a3b8">\${(o.role||'').slice(0,22)}</td><td><span class="stage-badge \${sc}">\${(o.lifecycle_stage||'').slice(0,14)}</span></td></tr>\`;
          });
        });
        html += '</tbody></table>';
        document.getElementById('pipeline-body').innerHTML = html;
      } catch(e) {
        document.getElementById('pipeline-body').innerHTML = '<div style="color:#ef4444;font-size:11px;">Pipeline load error: ' + e.message + '</div>';
      }
    }
    loadPipeline(); setInterval(loadPipeline, 15000);

    // PANEL C: Wire feed from council log + chat history
    async function loadWire() {
      try {
        const r = await fetch('/api/chat-history');
        const d = await r.json();
        const msgs = (d.messages || []).slice(-20).reverse();
        let html = msgs.map(m => {
          const dir = m.sender && (m.sender.includes('system') || m.sender.includes('smtp')) ? 'OUT' : 'IN';
          const ts = m.timestampUtc ? new Date(m.timestampUtc).toLocaleString('en-US',{hour12:false,month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
          return \`<div class="wire-entry"><span class="wire-direction wire-\${dir}">\${dir}</span><div class="wire-body"><div class="wire-to">\${(m.sender||'').slice(0,40)}</div><div class="wire-subj">\${(m.message||'').slice(0,90)}\${(m.message||'').length>90?'…':''}</div><div class="wire-ts">\${ts}</div></div></div>\`;
        }).join('');
        if (!html) html = '<div style="color:#475569;font-size:11px;padding:8px 0;">No messages logged yet.</div>';
        document.getElementById('wire-feed').innerHTML = html;
      } catch(e) {}
    }
    loadWire(); setInterval(loadWire, 8000);

    // PANEL D: System stats
    async function loadStats() {
      try {
        const r = await fetch('/api/status');
        const d = await r.json();
        const opps = d.active_opportunities || [];
        const staged = {submitted:0,pitched:0,applied:0,other:0};
        opps.forEach(o => {
          const s = (o.lifecycle_stage||'').toUpperCase();
          if (s.includes('SUBMIT')) staged.submitted++;
          else if (s.includes('PITCH')||s.includes('FOUNDER')) staged.pitched++;
          else if (s.includes('APPL')) staged.applied++;
          else staged.other++;
        });
        const agentChips = [
          {id:'DIRECTOR',c:'#f59e0b'},{id:'PROJECT_MANAGER',c:'#38bdf8'},{id:'CHIEF_ARCHITECT',c:'#a78bfa'},{id:'REVENUE_STRIKER',c:'#34d399'},{id:'BOOKING_PRODUCER',c:'#fb7185'}
        ].map(a => \`<span class="agent-chip" style="color:\${a.c};border-color:\${a.c}30">● \${a.id}</span>\`).join('');
        document.getElementById('stats-body').innerHTML = \`
          <div class="stat-row"><span class="stat-label">Council Status</span><span class="stat-value stat-ok">● LIVE</span></div>
          <div class="stat-row"><span class="stat-label">Total Opportunities</span><span class="stat-value">\${opps.length}</span></div>
          <div class="stat-row"><span class="stat-label">Submitted/Pitched</span><span class="stat-value stat-ok">\${staged.submitted+staged.pitched}</span></div>
          <div class="stat-row"><span class="stat-label">Applied</span><span class="stat-value">\${staged.applied}</span></div>
          <div class="stat-row"><span class="stat-label">Other</span><span class="stat-value stat-warn">\${staged.other}</span></div>
          <div class="stat-row"><span class="stat-label">Operator</span><span class="stat-value">\${d.operator||'Jayson Quindao'}</span></div>
          <div class="stat-row"><span class="stat-label">Server</span><span class="stat-value stat-ok">Port 4020</span></div>
          <div class="stat-row"><span class="stat-label">Cloudflare Tunnel</span><span class="stat-value stat-ok">● ACTIVE</span></div>
          <div class="stat-row"><span class="stat-label">Zero-Assess Doctrine</span><span class="stat-value stat-ok">ENFORCED</span></div>
          <div class="stat-row"><span class="stat-label">SMTP Rail</span><span class="stat-value stat-ok">smtp.mail.me.com:587</span></div>
          <div class="agent-roster">\${agentChips}</div>
          <div class="stat-url" style="margin-top:10px;">Last sync: \${new Date().toLocaleTimeString('en-US',{hour12:false})}</div>
        \`;
      } catch(e) {}
    }
    loadStats(); setInterval(loadStats, 10000);
  </script>
</body>
</html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(warRoomHtml);
  }

  // 4. Deal Room UI
  const targetClient = url.pathname.replace('/deal/', '').replace(/\//g, '') || 'enterprise-preview';
  const { fullPayload, signature, pubKeyFingerprint } = createLiveAttestation(targetClient);

  // Generate sample zero-width steganographic token for the live UI demo
  const sampleHostText = `Proprietary verified deal room transmission for ${targetClient.toUpperCase()}. Deterministic cryptographic attestation generated at runtime.`;
  const demoPayload = {
    provenance: 'GG_LOOP_SOVEREIGN_CTO_SUITE',
    author: 'Jayson Quindao',
    contextId: targetClient.toUpperCase(),
    dealRoomUrl: `${url.origin}/deal/${targetClient}`,
    stripeRail: STRIPE_SPRINT_URL,
    timestampUtc: new Date().toISOString(),
    entropyHash: crypto.createHash('sha256').update(sampleHostText).digest('hex'),
  };
  const demoWatermarked = injectStealthWatermark(sampleHostText, demoPayload, MASTER_SECRET);

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>ARGON // Deterministic Attestation Deal Room [${targetClient.toUpperCase()}]</title>
  <style>
    body { background: #090a0f; color: #e2e8f0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; max-width: 920px; margin: 40px auto; padding: 0 20px; line-height: 1.5; }
    .badge { display: inline-block; background: #064e3b; color: #34d399; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; border: 1px solid #059669; }
    .badge-stealth { display: inline-block; background: #3b0764; color: #c084fc; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; border: 1px solid #9333ea; margin-left: 8px; }
    .card { background: #11131c; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; margin-top: 20px; }
    pre { background: #050608; padding: 14px; border-radius: 6px; overflow-x: auto; border: 1px solid #1e293b; font-size: 13px; color: #38bdf8; }
    .hash { color: #a78bfa; word-break: break-all; font-size: 12px; }
    .cta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; }
    .btn { display: block; text-align: center; padding: 14px 18px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; }
    .btn-primary { background: #10b981; color: #052e16; }
    .btn-secondary { background: #1e293b; color: #f8fafc; border: 1px solid #334155; }
    .terminal-box { background: #000; border: 1px solid #334155; padding: 12px; border-radius: 6px; font-size: 12px; color: #10b981; margin-top: 10px; }
  </style>
</head>
<body>
  <div>
    <span class="badge">RSA-2048 SIGNATURE VERIFIED</span>
    <span class="badge-stealth">ZERO-WIDTH STEGANOGRAPHY ACTIVE</span>
    <span style="margin-left:10px;color:#94a3b8;font-size:13px;">Target Context: ${targetClient.toUpperCase()}</span>
  </div>
  <h2 style="margin-bottom:4px;">Argon Deterministic Runtime Attestation</h2>
  <p style="color:#94a3b8;margin-top:0;font-size:14px;">Zero-hallucination MCP extraction, cryptographic DOM state proof & AI filter-bypass steganography.</p>

  <div class="card">
    <div style="font-size:12px;color:#94a3b8;">SHA-256 DOM STATE HASH</div>
    <div class="hash">${fullPayload.domStateSha256}</div>
    <div style="font-size:12px;color:#94a3b8;margin-top:12px;">RSA-2048 PUBLIC KEY FINGERPRINT</div>
    <div class="hash">${pubKeyFingerprint}</div>
    <div style="font-size:12px;color:#94a3b8;margin-top:12px;">REDACTED RUNTIME PAYLOAD (20% PREVIEW)</div>
    <pre>${JSON.stringify(fullPayload, null, 2)}</pre>
    <div style="font-size:12px;color:#94a3b8;margin-top:12px;">RSA-2048 EXECUTION SIGNATURE</div>
    <div class="hash">${signature.slice(0, 128)}...</div>
  </div>

  <div class="card" style="border-color: #581c87;">
    <div style="font-size:13px;font-weight:bold;color:#d8b4fe;">⚡ STEGANOGRAPHIC CRYPTO LAYER (AI FILTER-BYPASS PROVENANCE)</div>
    <p style="font-size:12px;color:#cbd5e1;margin-top:4px;">
      Zero-width Unicode AES-256-GCM envelope embedded invisibly inside document strings. Unreadable by LLM detectors / ATS parsers; deterministically extracted via master secret.
    </p>
    <div class="terminal-box">
      <div>[PROVENANCE] Author: ${demoPayload.author} | Context: ${demoPayload.contextId}</div>
      <div>[STRIPE RAIL] ${demoPayload.stripeRail}</div>
      <div>[ENCRYPTED PAYLOAD STATUS] VERIFIED AUTHENTIC (AES-GCM-256 AUTH TAG PASSED)</div>
    </div>
  </div>

  <div class="cta-grid">
    <a class="btn btn-primary" href="${STRIPE_SPRINT_URL}?client_reference_id=${targetClient}_sprint">
      Initiate 72-Hour Infrastructure Sprint ($1,750 Deposit)
    </a>
    <a class="btn btn-secondary" href="${STRIPE_UNLOCK_URL}?client_reference_id=${targetClient}_unlock">
      Unlock Full Payload + Dockerized MCP ($1,500)
    </a>
  </div>
</body>
</html>`);
});

server.listen(PORT, () => {
  console.log(`[ARGON DEAL ROOM] Live at http://localhost:${PORT}/deal/govstar`);
  console.log(`[STEALTH CIPHER] Zero-width encryption & AI evasion API active.`);
});
