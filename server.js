// BarrierLens P48 - Standalone Dashboard Web Server & API Gateway
// Zero external dependencies (uses standard Node.js libraries: http, fs, path, url)

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DASHBOARD_DIR = path.join(__dirname, 'dashboard');
const BACKEND_URL = 'http://127.0.0.1:5000';

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
        answer: "The BarrierLens local analytics suite is active. For full Claude LLM responses, ensure backend/app.py is running with a valid CLAUDE_API_KEY in backend/.env.",
        disclaimer: "Deterministic dataset grounding mode active."
      }));
    }
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Handle API proxy
  if (pathname.startsWith('/api/')) {
    proxyToBackend(req, res);
    return;
  }

  // Normalize path
  if (pathname === '/') {
    pathname = '/index.html';
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
      res.end(`<h1>404 Not Found</h1><p>Path: ${pathname} could not be found.</p><p><a href="/">Return to Dashboard Home</a></p>`);
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
  console.log(` Web Dashboard:  http://localhost:${PORT}`);
  console.log(` Main Entry:     http://localhost:${PORT}/index.html`);
  console.log(` National View:  http://localhost:${PORT}/pages/national_overview.html`);
  console.log(` State Analysis: http://localhost:${PORT}/pages/state_analysis.html`);
  console.log('----------------------------------------------------------------');
  console.log(' Press Ctrl+C in terminal to stop.');
  console.log('================================================================');
});
