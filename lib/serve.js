/**
 * BB Atlas — serve subcommand
 *
 * Regenerates the atlas on every change to the input JSON, hosts it on
 * a tiny localhost server, and live-reloads any open browser tab via
 * Server-Sent Events. Zero deps. Best for iterating on a JSON.
 *
 * The generated HTML gets a small <script> appended that opens an
 * EventSource to /events and reloads on the next message.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const { generateString } = require('./generate');

const LIVE_RELOAD_SNIPPET = `
<script>
(function(){
  try {
    var es = new EventSource('/__bbatlas/events');
    es.addEventListener('reload', function(){ location.reload(); });
  } catch(e){}
})();
</script>
`;

function injectLiveReload(html) {
  if (html.includes('</body>')) return html.replace('</body>', LIVE_RELOAD_SNIPPET + '</body>');
  return html + LIVE_RELOAD_SNIPPET;
}

function serve(dataPath, { port = 4321, openBrowser = true } = {}) {
  const absInput = path.resolve(dataPath);
  if (!fs.existsSync(absInput)) throw new Error(`input not found: ${absInput}`);

  let currentHtml = '';
  const subscribers = new Set();

  const renderNow = () => {
    try {
      const D = JSON.parse(fs.readFileSync(absInput, 'utf8'));
      const { html, viewCount } = generateString(D, absInput);
      currentHtml = injectLiveReload(html);
      const ts = new Date().toLocaleTimeString();
      process.stdout.write(`[${ts}] ✓ regenerated · ${viewCount} views\n`);
      for (const res of subscribers) {
        res.write('event: reload\ndata: {}\n\n');
      }
    } catch (e) {
      process.stderr.write(`[${new Date().toLocaleTimeString()}] ✗ ${e.message}\n`);
    }
  };

  renderNow();

  let pendingTimer = null;
  fs.watch(absInput, { persistent: true }, () => {
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(renderNow, 80);
  });

  const server = http.createServer((req, res) => {
    if (req.url === '/__bbatlas/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write(': connected\n\n');
      subscribers.add(res);
      req.on('close', () => subscribers.delete(res));
      return;
    }
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(currentHtml);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found — only / and /__bbatlas/events are served');
  });

  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}/`;
    process.stdout.write(`bb-atlas serve → ${url}  (watching ${absInput})\n`);
    if (openBrowser) {
      try {
        if (process.platform === 'darwin') spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
        else if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
        else spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
      } catch (e) { /* non-fatal */ }
    }
  });

  return { server, stop: () => server.close() };
}

module.exports = { serve };
