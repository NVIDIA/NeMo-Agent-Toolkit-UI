#!/usr/bin/env node

require('dotenv').config();

const http = require('http');
const httpProxy = require('http-proxy');
const url = require('url');
const { detectPort } = require('detect-port');
const constants = require('../constants');

const {
  HTTP_PROXY_PATH,
  WEBSOCKET_PROXY_PATH,
  WEBSOCKET_BACKEND_PATH,
  CORE_ROUTES,
  EXTENDED_ROUTES,
  EXTENDED_BACKEND_TARGETS,
} = constants;

// SSRF validation
const {
  validateProxyHttpPath,
  validateProxyWebSocketPath,
} = require('../utils/security/url-validation');

// Response processors
const {
  processChatStream,
  processChat,
  processGenerateStream,
  processGenerate,
  processCaRag,
} = require('./response-processors');

// --- Configuration ---
const NAT_BACKEND_URL = process.env.NAT_BACKEND_URL;
if (!NAT_BACKEND_URL) {
  console.error('ERROR: NAT_BACKEND_URL environment variable is required');
  process.exit(1);
}

// Parse backend URL
let upstream;
try {
  const backendUrl =
    NAT_BACKEND_URL.startsWith('http://') ||
    NAT_BACKEND_URL.startsWith('https://')
      ? NAT_BACKEND_URL
      : `http://${NAT_BACKEND_URL}`;

  upstream = new URL(backendUrl);
  if (upstream.protocol !== 'http:' && upstream.protocol !== 'https:') {
    throw new Error('NAT_BACKEND_URL must start with http:// or https://');
  }
} catch (err) {
  console.error('ERROR: Invalid NAT_BACKEND_URL:', err.message);
  process.exit(1);
}

// Derive upstream origins from backend URL
const UPSTREAM_HTTP_ORIGIN = `${upstream.protocol}//${upstream.host}`;
const UPSTREAM_WS_SCHEME = upstream.protocol === 'https:' ? 'wss' : 'ws';
const UPSTREAM_WS_ORIGIN = `${UPSTREAM_WS_SCHEME}://${upstream.host}`;

// Gateway and Next.js configuration
const GATEWAY_PORT = parseInt(process.env.PORT || '3000', 10);
const NEXT_DEV_TARGET =
  process.env.NEXT_INTERNAL_URL || 'http://localhost:3099';

// Validate NEXT_INTERNAL_URL format
try {
  new URL(NEXT_DEV_TARGET);
} catch (err) {
  console.error('ERROR: Invalid NEXT_INTERNAL_URL format:', NEXT_DEV_TARGET);
  console.error(
    'Expected format: http://hostname:port or https://hostname:port',
  );
  console.error(
    'Example: http://localhost:3099 (internal port, not for browser access)',
  );
  process.exit(1);
}
// --- Context-Aware RAG Initialization Tracking ---
// Track initialized RAG conversations to avoid redundant /init calls.
// Key: "{ragUuid}-{conversationId}", once initialized, /init is skipped.
const initializedCaRagConversations = new Set();
const RAG_UUID = process.env.RAG_UUID || '123456';

// --- Create Proxy Instances ---

// Proxy for Next.js dev server
const nextProxy = httpProxy.createProxyServer({
  target: NEXT_DEV_TARGET,
  changeOrigin: true,
  ws: true, // Support WebSocket upgrades for HMR
  xfwd: true,
  preserveHeaderKeyCase: true,
});

// Proxy for backend
const backendProxy = httpProxy.createProxyServer({
  changeOrigin: true,
  ws: true,
  xfwd: true,
  preserveHeaderKeyCase: true,
});

// Error handling
nextProxy.on('error', (err, req, res) => {
  const where = req && req.url ? ` (${req.url})` : '';
  console.error(`[Next.js Proxy Error]${where}:`, err.message);
  if (res && res.writeHead && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
  }
  if (res && !res.writableEnded) {
    res.end(JSON.stringify({ error: 'Next.js dev server unavailable' }));
  }
});

backendProxy.on('error', (err, req, res) => {
  const where = req && req.url ? ` (${req.url})` : '';
  console.error(`[Backend Proxy Error]${where}:`, err.message);
  if (res && res.writeHead && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
  }
  if (res && !res.writableEnded) {
    res.end(JSON.stringify({ error: 'Backend unavailable' }));
  }
});

// Add CORS headers to backend responses
backendProxy.on('proxyRes', (proxyRes, req, res) => {
  res.setHeader('Access-Control-Allow-Origin', constants.CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
});

// Forward headers for backend WebSocket
backendProxy.on('proxyReqWs', (proxyReq, req) => {
  if (req.headers.origin) proxyReq.setHeader('Origin', req.headers.origin);
  if (req.headers['sec-websocket-protocol']) {
    proxyReq.setHeader(
      'Sec-WebSocket-Protocol',
      req.headers['sec-websocket-protocol'],
    );
  }
  if (req.headers.cookie) {
    proxyReq.setHeader('Cookie', req.headers.cookie);
  }
});

// WebSocket keep-alive
backendProxy.on('open', (proxySocket) => {
  try {
    proxySocket.setKeepAlive?.(true, 15000);
    proxySocket.on('error', (e) =>
      console.error('[WebSocket] upstream socket error:', e.message),
    );
  } catch {}
});

// Helper to read HTTP body
async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// --- HTTP Server ---
const server = http.createServer(async (req, res) => {
  // Keep sockets alive
  req.socket.setKeepAlive?.(true, 15000);
  req.socket.setTimeout?.(0);

  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname || '/';

  // Route 1: Backend API (under HTTP_PROXY_PATH)
  if (pathname.startsWith(HTTP_PROXY_PATH + '/')) {
    // CORS preflight
    if (req.method === constants.HTTP_METHOD_OPTIONS) {
      res.setHeader('Access-Control-Allow-Origin', constants.CORS_ORIGIN);
      res.setHeader('Access-Control-Allow-Methods', constants.CORS_METHODS);
      res.setHeader('Access-Control-Allow-Headers', constants.CORS_HEADERS);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.writeHead(204);
      return res.end();
    }

    // SSRF validation
    const pathValidation = validateProxyHttpPath(pathname);
    if (!pathValidation.isValid) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          error: 'Forbidden',
          message: pathValidation.error,
        }),
      );
    }

    // Strip proxy prefix to get backend path
    const backendPath = pathname.substring(HTTP_PROXY_PATH.length) || '/';
    const targetUrl = `${UPSTREAM_HTTP_ORIGIN}${backendPath}${
      parsedUrl.search || ''
    }`;

    // Determine endpoint type
    const isChatStream = backendPath === CORE_ROUTES.CHAT_STREAM;
    const isChat = backendPath === CORE_ROUTES.CHAT;
    const isGenerateStream = backendPath === CORE_ROUTES.GENERATE_STREAM;
    const isGenerate = backendPath === CORE_ROUTES.GENERATE;
    const isCaRag = backendPath === EXTENDED_ROUTES.CHAT_CA_RAG;

    // Helper for fetch + process
    const doFetchAndProcess = async (processor) => {
      try {
        const body =
          req.method !== 'GET' && req.method !== 'HEAD'
            ? await readRequestBody(req)
            : undefined;

        // Forward request to backend
        const backendRes = await fetch(targetUrl, {
          method: req.method,
          headers: req.headers,
          body,
        });

        // Process response using endpoint-specific processor
        await processor(backendRes, res);
      } catch (err) {
        console.error('[ERROR] Backend request failed:', err.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({ error: 'Bad Gateway', message: err.message }));
      }
    };

    // Context-Aware RAG: ensure /init is called before /call
    const doCaRagWithInit = async () => {
      try {
        const conversationId = req.headers['conversation-id'] || 'default';
        const initKey = `${RAG_UUID}-${conversationId}`;

        if (!initializedCaRagConversations.has(initKey)) {
          const initUrl = new URL(
            EXTENDED_ROUTES.CA_RAG_INIT,
            UPSTREAM_HTTP_ORIGIN,
          ).toString();

          const initRes = await fetch(initUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uuid: RAG_UUID }),
          });

          if (!initRes.ok) {
            const detail = await initRes.text();
            console.error(
              `[CA RAG] /init failed (${initRes.status}):`,
              detail,
            );
            if (!res.headersSent) {
              res.writeHead(initRes.status, {
                'Content-Type': 'application/json',
              });
            }
            res.end(
              JSON.stringify({
                error: 'CA RAG initialization failed',
                detail,
              }),
            );
            return;
          }

          initializedCaRagConversations.add(initKey);
          console.log(`[CA RAG] Initialized conversation ${initKey}`);
        }

        // Proceed with the /call request
        await doFetchAndProcess(processCaRag);
      } catch (err) {
        console.error('[CA RAG] Error:', err.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res.end(
          JSON.stringify({
            error: 'CA RAG request failed',
            message: err.message,
          }),
        );
      }
    };

    // Route to appropriate processor
    if (isChatStream) return void doFetchAndProcess(processChatStream);
    if (isChat) return void doFetchAndProcess(processChat);
    if (isGenerateStream) return void doFetchAndProcess(processGenerateStream);
    if (isGenerate) return void doFetchAndProcess(processGenerate);
    if (isCaRag) return void doCaRagWithInit();

    // Route extended endpoints by target
    const backendTarget = EXTENDED_BACKEND_TARGETS[backendPath];
    if (backendTarget === 'NEXTJS') {
      nextProxy.web(req, res, {
        target: NEXT_DEV_TARGET,
        changeOrigin: false,
      });
      return;
    }

    // Transparent proxy for remaining allowed endpoints
    req.url = backendPath + (parsedUrl.search || '');
    backendProxy.web(req, res, {
      target: UPSTREAM_HTTP_ORIGIN,
      changeOrigin: true,
      buffer: null,
    });
    return;
  }

  // Route 2: Everything else → Next.js dev server
  nextProxy.web(req, res, {
    target: NEXT_DEV_TARGET,
    changeOrigin: false, // Keep original host for Next.js
  });
});

// --- WebSocket Upgrade Handler ---
server.on('upgrade', (req, socket, head) => {
  // Keep sockets alive
  socket.setKeepAlive?.(true, 15000);
  socket.setTimeout?.(0);

  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname || '/';

  if (
    pathname === WEBSOCKET_PROXY_PATH ||
    pathname.startsWith(WEBSOCKET_PROXY_PATH + '?')
  ) {
    // Validate WS path
    const wsValidation = validateProxyWebSocketPath(pathname);
    if (!wsValidation.isValid) {
      console.warn(`[BLOCKED] ${wsValidation.error}`);
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    // Rewrite to backend WS path
    req.url = WEBSOCKET_BACKEND_PATH + (parsedUrl.search || '');

    backendProxy.ws(
      req,
      socket,
      head,
      {
        target: UPSTREAM_WS_ORIGIN,
        changeOrigin: true,
      },
      (err) => {
        if (err) {
          console.error('[WebSocket] Proxy error:', err.message);
          try {
            socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
          } catch {}
          socket.destroy();
        }
      },
    );
    return;
  }

  nextProxy.ws(
    req,
    socket,
    head,
    {
      target: NEXT_DEV_TARGET,
      changeOrigin: false,
    },
    (err) => {
      if (err) {
        console.error('[Next.js WS] Proxy error:', err.message);
        socket.destroy();
      }
    },
  );
});

// --- Server Configuration ---
server.keepAliveTimeout = 0;
server.headersTimeout = 65_000;
server.requestTimeout = 0;

// --- Start Server ---
detectPort(GATEWAY_PORT)
  .then((availablePort) => {
    const port = availablePort;
    if (port !== GATEWAY_PORT) {
      console.warn(
        '⚠️  Port conflict: requested %s, using %s',
        GATEWAY_PORT,
        port,
      );
    }

    server.listen(port, () => {
      console.log('\n' + '='.repeat(65));
      console.log('');
      console.log(' NeMo Agent Toolkit UI is ready!');
      console.log('');
      console.log(` Open in browser: http://localhost:${port}`);
      console.log('');
      console.log('='.repeat(65) + '\n');
    });

    // Graceful shutdown handler
    let isShuttingDown = false;
    const cleanExit = (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log(`\n\nShutting down gracefully (${signal})...`);

      // Force exit after 2 seconds if graceful shutdown fails
      const forceExit = setTimeout(() => {
        console.log('Force exiting...');
        process.exit(0);
      }, 2000);

      // Close server and exit
      server.close(() => {
        clearTimeout(forceExit);
        process.exit(0);
      });

      // Destroy all active connections to speed up shutdown
      server.getConnections((err, count) => {
        if (!err && count > 0) {
          // Destroy active sockets
          server.closeAllConnections?.();
        }
      });
    };

    process.once('SIGTERM', () => cleanExit('SIGTERM'));
    process.once('SIGINT', () => cleanExit('SIGINT'));
  })
  .catch((err) => {
    console.error('ERROR: Failed to start gateway');
    console.error(err);
    process.exit(1);
  });
