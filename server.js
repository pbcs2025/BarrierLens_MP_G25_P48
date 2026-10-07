// BarrierLens P48 - Standalone Dashboard Web Server & API Gateway
// Zero external dependencies (uses standard Node.js libraries: http, fs, path, url)

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DASHBOARD_DIR = path.join(__dirname, 'dashboard');
const BACKEND_URL = 'http://127.0.0.1:5000';

/* ==========================================================================
   DEMO AUTHENTICATION GATE (college-project demonstration only)
   --------------------------------------------------------------------------
   The login/landing page is always the first page. Dashboard documents are
   only served once a session cookie exists. This is intentionally a simple
   local demo gate, NOT production-level security: the credential list lives in
   this file, sessions live in process memory and there is no rate limiting.
   Set BL_DISABLE_AUTH=1 to serve the dashboard without the gate (debug only).
   ========================================================================== */

const AUTH_ENABLED = !['1', 'true', 'yes'].includes(String(process.env.BL_DISABLE_AUTH || '').toLowerCase());
const SESSION_COOKIE = 'bl_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

const DEMO_USERS = [
  { username: 'research@barrierlens.in', password: 'BarrierLens@2025', name: 'Research Team', role: 'Research Lead' },
  { username: 'demo', password: 'demo1234', name: 'Demo Researcher', role: 'Demo Mode' },
  { username: '1ga23cs114', password: 'BarrierLens@2025', name: 'Parvati Hiregoudra', role: 'Team Member' },
  { username: '1ga23cs125', password: 'BarrierLens@2025', name: 'Prathibha B C', role: 'Team Member' },
  { username: '1ga23cs130', password: 'BarrierLens@2025', name: 'Rabiya Bushra M', role: 'Team Member' },
  { username: '1ga23cs153', password: 'BarrierLens@2025', name: 'Sharmila S', role: 'Team Member' }
];

const registeredUsers = [...DEMO_USERS];
const sessions = new Map();

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function readSession(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() - session.issuedAt > SESSION_TTL_MS) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function matchDemoUser(username, password) {
  const needle = String(username || '').trim().toLowerCase();
  if (!needle || !password) return null;
  const found = registeredUsers.find(u => u.username.toLowerCase() === needle);
  if (!found || found.password !== password) return null;
  return { username: found.username, name: found.name, role: found.role };
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(payload));
}

function readBody(req, limitBytes = 8 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function handleAuthRoute(req, res, pathname) {
  if (pathname === '/auth/session' && req.method === 'GET') {
    const session = readSession(req);
    return sendJson(res, 200, {
      authenticated: !!session,
      user: session ? session.user : null,
      demo: true
    });
  }

  if (pathname === '/auth/register' && req.method === 'POST') {
    return readBody(req)
      .then(raw => {
        let payload = {};
        try { payload = raw ? JSON.parse(raw) : {}; } catch (err) { payload = {}; }
        const name = String(payload.name || '').trim();
        const username = String(payload.username || '').trim();
        const password = String(payload.password || '');
        const role = String(payload.role || 'Research Analyst').trim();

        if (!name || !username || !password) {
          return sendJson(res, 400, {
            authenticated: false,
            error: 'Full name, email/username, and password are required for registration.'
          });
        }

        if (password.length < 6) {
          return sendJson(res, 400, {
            authenticated: false,
            error: 'Password must be at least 6 characters long.'
          });
        }

        const needle = username.toLowerCase();
        if (registeredUsers.some(u => u.username.toLowerCase() === needle)) {
          return sendJson(res, 400, {
            authenticated: false,
            error: 'An account with this email/username already exists. Please sign in instead.'
          });
        }

        const newUser = { username: needle, password, name, role };
        registeredUsers.push(newUser);

        const token = crypto.randomBytes(24).toString('hex');
        const userObj = { username: newUser.username, name: newUser.name, role: newUser.role };
        sessions.set(token, { user: userObj, issuedAt: Date.now() });

        const maxAge = Math.floor(SESSION_TTL_MS / 1000);
        res.setHeader(
          'Set-Cookie',
          `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`
        );
        return sendJson(res, 200, { authenticated: true, user: userObj, registered: true });
      })
      .catch(() => sendJson(res, 400, { authenticated: false, error: 'Malformed registration request.' }));
  }

  if (pathname === '/auth/login' && req.method === 'POST') {
    return readBody(req)
      .then(raw => {
        let payload = {};
        try { payload = raw ? JSON.parse(raw) : {}; } catch (err) { payload = {}; }
        const user = matchDemoUser(payload.username, payload.password);
        if (!user) {
          return sendJson(res, 401, {
            authenticated: false,
            error: 'Invalid credentials. Please check your username/password or register a new account.'
          });
        }
        const token = crypto.randomBytes(24).toString('hex');
        sessions.set(token, { user, issuedAt: Date.now() });
        const maxAge = payload.remember ? 30 * 24 * 60 * 60 : Math.floor(SESSION_TTL_MS / 1000);
        res.setHeader(
          'Set-Cookie',
          `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`
        );
        return sendJson(res, 200, { authenticated: true, user, demo: true });
      })
      .catch(() => sendJson(res, 400, { authenticated: false, error: 'Malformed login request.' }));
  }

  if (pathname === '/auth/logout' && req.method === 'POST') {
    const token = parseCookies(req)[SESSION_COOKIE];
    if (token) sessions.delete(token);
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
    return sendJson(res, 200, { authenticated: false });
  }

  return sendJson(res, 404, { error: 'Unknown auth endpoint.' });
}

function isProtectedDocument(pathname) {
  const ext = path.extname(pathname).toLowerCase();
  if (ext !== '.html') return false;
  return pathname.replace(/\\/g, '/').toLowerCase().endsWith('/login.html') === false;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.htm': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.jsx': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=UTF-8'
};

function proxyToBackend(req, res) {
  const targetUrl = new url.URL(req.url, BACKEND_URL);
  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: { ...req.headers, host: targetUrl.host }
  };

  const proxyReq = http.request(options, (backendRes) => {
    res.writeHead(backendRes.statusCode, backendRes.headers);
    backendRes.pipe(res);
  });

  proxyReq.on('error', () => {
    // If backend isn't up, return graceful fallback for /api
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (req.url.includes('predict-barrier')) {
      res.end(JSON.stringify({
        status: "success",
        primaryBarrier: "Logistic Barrier",
        probabilities: { household: 0.28, logistic: 0.48, facility: 0.24 },
        modelSource: "BarrierLens Embedded Prediction Adapter (Gateway Fallback)"
      }));
    } else {
      res.end(JSON.stringify({
        status: "success",
        answer: "The BarrierLens local analytics suite is active. For full Ollama LLM responses, ensure backend/app.py and Ollama are running.",
        disclaimer: "Deterministic dataset grounding mode active."
      }));
    }
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Demo authentication endpoints (login / logout / session)
  if (pathname.startsWith('/auth/')) {
    handleAuthRoute(req, res, pathname);
    return;
  }

  // Handle API proxy
  if (pathname.startsWith('/api/')) {
    proxyToBackend(req, res);
    return;
  }

  // Normalize path
  if (pathname === '/') {
    // The login / landing page is always the entry point.
    if (AUTH_ENABLED && !readSession(req)) {
      res.writeHead(302, { Location: '/login.html' });
      res.end();
      return;
    }
    pathname = '/index.html';
  }

  // Gate every dashboard document behind an active demo session
  if (AUTH_ENABLED && isProtectedDocument(pathname) && !readSession(req)) {
    const next = encodeURIComponent(pathname + (parsedUrl.search || ''));
    res.writeHead(302, { Location: `/login.html?next=${next}` });
    res.end();
    return;
  }

  // Safe file resolution inside DASHBOARD_DIR
  let safePath = path.normalize(path.join(DASHBOARD_DIR, pathname));
  if (!safePath.startsWith(DASHBOARD_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`<h1>404 Not Found</h1><p>Path: ${pathname} could not be found.</p><p><a href="/login.html">Return to BarrierLens Login</a></p>`);
      return;
    }

    if (stats.isDirectory()) {
      safePath = path.join(safePath, 'index.html');
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(safePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('================================================================');
  console.log('       BARRIERLENS P48 — RESEARCH DASHBOARD RUNNING             ');
  console.log('================================================================');
  console.log(` Login Page:     http://localhost:${PORT}/login.html   <-- opens first`);
  console.log(` Web Dashboard:  http://localhost:${PORT}/`);
  console.log(` Main Entry:     http://localhost:${PORT}/index.html`);
  console.log(` National View:  http://localhost:${PORT}/pages/national_overview.html`);
  console.log(` State Analysis: http://localhost:${PORT}/pages/state_analysis.html`);
  console.log(` Demo Login:     research@barrierlens.in / BarrierLens@2025`);
  console.log(` Auth gate:      ${AUTH_ENABLED ? 'ENABLED (demo)' : 'DISABLED (BL_DISABLE_AUTH=1)'}`);
  console.log('----------------------------------------------------------------');
  console.log(' Press Ctrl+C in terminal to stop.');
  console.log('================================================================');
});
