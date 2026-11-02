import http from 'http';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Port Configuration
const PROXY_PORT = parseInt(process.env.PROXY_PORT || process.argv[2] || '5397', 10); // Default port rFactor 2 UI expects
const TARGET_PORT = parseInt(process.env.TARGET_PORT || process.argv[3] || '5396', 10); // The game's actual API port (configured in player.JSON)
const VITE_DEV_PORT = parseInt(process.env.VITE_DEV_PORT || '3000', 10);               // Vite development server port
const API_SPEC_DIR = path.join(__dirname, '..', 'api-spec');

// MIME types for static asset serving
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// Keep track of logged endpoints to avoid duplicate files
const loggedEndpoints = new Set();

// Ensure the api-spec directory exists
if (!fs.existsSync(API_SPEC_DIR)) {
  fs.mkdirSync(API_SPEC_DIR, { recursive: true });
}

console.log(`[PROXY] Initializing API Intercepting Proxy...`);
console.log(`[PROXY] Listening Port: ${PROXY_PORT}`);
console.log(`[PROXY] Target Game Port: ${TARGET_PORT}`);
console.log(`[PROXY] API Specifications Directory: ${API_SPEC_DIR}\n`);

// Helper to clean path names for filenames (replacing IDs with _ID_ placeholders)
function getCleanFileName(method, urlPath) {
  let pathname = urlPath.split('?')[0];
  
  // Replace numeric IDs (e.g. /rest/sessions/ai/kick/11 -> /rest/sessions/ai/kick/_ID_)
  pathname = pathname.replace(/\/\d+(?=\/|$)/g, '/_ID_');
  // Replace opponents IDs or other string filters (e.g. /rest/sessions/opponents/some-opponent -> /_ID_)
  pathname = pathname.replace(/\/opponents\/[a-zA-Z0-9_%-]+/g, '/opponents/_ID_');
  
  const cleanPath = pathname
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
  
  return `${method.toUpperCase()}_${cleanPath}.json`;
}

// Helper to safely parse JSON
function safeParseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
}

// Helper to log and write API specifications to disk
function dumpApiSpec(method, urlPath, query, requestHeaders, requestBody, responseStatus, responseHeaders, responseBody) {
  const specKey = `${method.toUpperCase()}:${urlPath.split('?')[0].replace(/\/\d+(?=\/|$)/g, '/_ID_')}`;
  
  if (loggedEndpoints.has(specKey)) {
    return; // Already logged this endpoint
  }
  
  loggedEndpoints.add(specKey);
  const filename = getCleanFileName(method, urlPath);
  const filePath = path.join(API_SPEC_DIR, filename);

  const specData = {
    endpoint: `${method.toUpperCase()} ${urlPath.split('?')[0]}`,
    url: urlPath,
    method: method.toUpperCase(),
    recordedAt: new Date().toISOString(),
    query: query || {},
    request: {
      headers: requestHeaders,
      body: safeParseJSON(requestBody)
    },
    response: {
      status: responseStatus,
      headers: responseHeaders,
      body: safeParseJSON(responseBody)
    }
  };

  fs.writeFile(filePath, JSON.stringify(specData, null, 2), 'utf8', (err) => {
    if (err) {
      console.error(`[PROXY] [ERROR] Failed to save spec for ${specKey}:`, err.message);
    } else {
      console.log(`[PROXY] [SPEC CAPTURED] Saved API definition to: api-spec/${filename}`);
    }
  });
}

// Check if Vite Dev Server is running
function checkViteDevServer() {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(200);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(VITE_DEV_PORT, 'localhost');
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const isApiRequest = req.url.startsWith('/rest/') || req.url.startsWith('/navigation/') || req.url.startsWith('/framework/json/');

  // 1. Handle CORS Preflight request
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  // 2. Handle HTTP API proxying to rFactor 2 game
  if (isApiRequest) {
    let reqBody = '';
    req.on('data', chunk => {
      reqBody += chunk;
    });

    req.on('end', () => {
      // Setup proxy request options
      const headers = { ...req.headers };
      
      // Critical: Disable compression by stripping accept-encoding.
      // This ensures the game returns plain-text JSON we can parse and dump easily.
      delete headers['accept-encoding'];
      
      // Point Host header to the game target
      headers['host'] = `localhost:${TARGET_PORT}`;

      const proxyReq = http.request({
        host: 'localhost',
        port: TARGET_PORT,
        path: req.url,
        method: req.method,
        headers: headers
      }, (proxyRes) => {
        let resBody = '';
        const responseHeaders = { ...proxyRes.headers };
        
        // Inject CORS headers
        responseHeaders['Access-Control-Allow-Origin'] = '*';
        responseHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        responseHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With';

        // Write response headers
        res.writeHead(proxyRes.statusCode, responseHeaders);

        proxyRes.on('data', chunk => {
          resBody += chunk;
          res.write(chunk);
        });

        proxyRes.on('end', () => {
          res.end();
          
          // Dump API Specification if it was successful and returned JSON or structured text
          const contentType = proxyRes.headers['content-type'] || '';
          if (proxyRes.statusCode >= 200 && proxyRes.statusCode < 300) {
            const queryParams = Object.fromEntries(url.searchParams.entries());
            dumpApiSpec(
              req.method,
              req.url,
              queryParams,
              req.headers,
              reqBody,
              proxyRes.statusCode,
              proxyRes.headers,
              resBody
            );
          }
        });
      });

      proxyReq.on('error', (err) => {
        console.error(`[PROXY] [ERROR] API Proxy request failed:`, err.message);
        res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Bad Gateway', message: 'Could not connect to rFactor 2 API. Is the game running?' }));
      });

      if (reqBody) {
        proxyReq.write(reqBody);
      }
      proxyReq.end();
    });
    return;
  }

  // 3. Handle Static UI Assets
  const isViteActive = await checkViteDevServer();
  const reqPath = url.pathname === '/' ? '/index.html' : url.pathname;

  // Option A: Try to serve static file from local "dist" folder (production/fallback)
  const distFilePath = path.join(__dirname, '..', 'dist', reqPath);
  if (fs.existsSync(distFilePath) && fs.statSync(distFilePath).isFile()) {
    const ext = path.extname(distFilePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(distFilePath).pipe(res);
    return;
  }

  // Option B: If in DEV mode and Vite is active, proxy to Vite (port 3000)
  if (isViteActive) {
    const proxyReq = http.request({
      host: 'localhost',
      port: VITE_DEV_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', () => {
      // If Vite fails midway, fall back to game Jetty server assets
      proxyToGame(req, res);
    });
    proxyReq.end();
    return;
  }

  // Option C: Fallback - Proxy static request to original game Jetty server (serves original UI / framework assets)
  proxyToGame(req, res);
});

// Helper to proxy static content directly to the game Jetty server
function proxyToGame(req, res) {
  const headers = { ...req.headers };
  headers['host'] = `localhost:${TARGET_PORT}`;

  const proxyReq = http.request({
    host: 'localhost',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: headers
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`File not found: ${req.url} (Game API server offline)`);
  });
  proxyReq.end();
}

// 4. Implement TCP-level WebSocket upgrade proxying
server.on('upgrade', (req, socket, head) => {
  console.log(`[PROXY] [WEBSOCKET] Intercepted connection upgrade request: ${req.url}`);

  const targetSocket = net.connect(TARGET_PORT, 'localhost', () => {
    // Reconstruct raw HTTP Upgrade request
    let rawRequest = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
    for (const [key, value] of Object.entries(req.headers)) {
      rawRequest += `${key}: ${value}\r\n`;
    }
    rawRequest += '\r\n';
    
    targetSocket.write(rawRequest);
    if (head && head.length > 0) {
      targetSocket.write(head);
    }

    // Connect both ends bi-directionally
    socket.pipe(targetSocket);
    targetSocket.pipe(socket);
  });

  targetSocket.on('error', (err) => {
    console.error('[PROXY] [WEBSOCKET] [ERROR] Target socket error:', err.message);
    socket.destroy();
  });

  socket.on('error', (err) => {
    console.error('[PROXY] [WEBSOCKET] [ERROR] Client socket error:', err.message);
    targetSocket.destroy();
  });
});

// Start the server
server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`\n[PROXY] [SUCCESS] Proxy server running at http://localhost:${PROXY_PORT}`);
  console.log(`[PROXY] Ready to log API requests and serve React UI!\n`);
});
