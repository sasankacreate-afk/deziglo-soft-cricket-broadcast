import express from "express";
import http from "http";
import path from "path";
import os from "os";
import { WebSocketServer, WebSocket } from "ws";

const app = express();
const PORT = 3000;
const server = http.createServer(app);

app.use(express.json({ limit: "15mb" }));

// Enable unrestricted CORS for OBS Studio, vMix, local browser tabs, and remote mobile clients
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// In-memory synced state for multi-device real-time scoring (Mobile phone -> OBS/vMix overlay)
let globalBroadcastState: any = null;
let lastUpdateTimestamp = Date.now();
let stateSequence = 0;
const sseClients = new Set<express.Response>();
const pollWaiters: Array<{ res: express.Response; sinceSeq: number; timer: NodeJS.Timeout }> = [];

// Initialize WebSocket Server on same HTTP port
const wss = new WebSocketServer({ server, perMessageDeflate: false });

function broadcastToWs(senderWs: WebSocket | null, message: string) {
  wss.clients.forEach((client) => {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch {
        // ignore send error
      }
    }
  });
}

function buildStateMessage() {
  return JSON.stringify({
    type: "STATE_UPDATE",
    state: globalBroadcastState,
    seq: stateSequence,
    timestamp: lastUpdateTimestamp,
  });
}

function commitState(payload: any, senderWs: WebSocket | null = null) {
  stateSequence++;
  globalBroadcastState = {
    ...payload,
    seq: stateSequence,
    serverTimestamp: Date.now(),
  };
  lastUpdateTimestamp = payload?.timestamp || Date.now();

  const message = buildStateMessage();
  broadcastToWs(senderWs, message);
  notifySseClients();
  resolvePollWaiters();
  return { seq: stateSequence, timestamp: lastUpdateTimestamp };
}

function resolvePollWaiters() {
  const currentSeq = stateSequence;
  const currentPayload = {
    state: globalBroadcastState,
    timestamp: lastUpdateTimestamp,
    seq: stateSequence,
  };

  while (pollWaiters.length > 0) {
    const waiter = pollWaiters.shift();
    if (waiter) {
      clearTimeout(waiter.timer);
      try {
        waiter.res.json(currentPayload);
      } catch {
        // ignore client closed
      }
    }
  }
}

function notifySseClients() {
  const payload = `data: ${JSON.stringify({
    state: globalBroadcastState,
    timestamp: lastUpdateTimestamp,
    seq: stateSequence,
  })}\n\n`;

  for (const client of sseClients) {
    try {
      client.write(payload);
      if (typeof (client as any).flush === "function") {
        (client as any).flush();
      }
    } catch {
      sseClients.delete(client);
    }
  }
}

// WebSocket Connection Handler
wss.on("connection", (ws, req) => {
  // Disable idle disconnects on LAN/mobile networks.
  const wsState = ws as WebSocket & { isAlive?: boolean };
  wsState.isAlive = true;
  ws.on("pong", () => { wsState.isAlive = true; });

  // Send current state immediately on connection.
  if (globalBroadcastState) {
    ws.send(JSON.stringify({
      type: "INIT_STATE",
      state: globalBroadcastState,
      seq: stateSequence,
      timestamp: lastUpdateTimestamp,
    }));
  }

  ws.on("message", (rawMessage) => {
    try {
      const parsed = JSON.parse(rawMessage.toString());
      if (parsed?.type === "UPDATE_STATE" && parsed.payload) {
        commitState(parsed.payload, ws);
      }
    } catch (err) {
      console.error("WS message parse error:", err);
    }
  });

  ws.on("error", () => {});
  ws.on("close", () => {});
});

// Keep WebSocket connections alive across mobile Wi-Fi power-saving / NAT timeouts.
const wsHeartbeat = setInterval(() => {
  wss.clients.forEach((client) => {
    const ws = client as WebSocket & { isAlive?: boolean };
    if (ws.isAlive === false) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  });
}, 10000);

// API routes
// LAN connection information for phones/tablets/other PCs.
app.get("/api/connect-info", (_req, res) => {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) {
        const ip = entry.address;
        // Prefer normal private LAN addresses; ignore VPN/public adapters when possible.
        const privateLan =
          ip.startsWith("192.168.") ||
          ip.startsWith("10.") ||
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);
        if (privateLan) addresses.push(ip);
      }
    }
  }
  const uniqueAddresses = [...new Set(addresses)];
  res.setHeader("Cache-Control", "no-store");
  res.json({
    port: PORT,
    addresses: uniqueAddresses,
    urls: uniqueAddresses.map((ip) => `http://${ip}:${PORT}/`),
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "DEZIGLO SOFT Cricket Broadcast",
    timestamp: Date.now(),
    seq: stateSequence,
    hasState: !!globalBroadcastState,
    wsClients: wss.clients.size,
  });
});

app.get("/api/state", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({
    state: globalBroadcastState,
    timestamp: lastUpdateTimestamp,
    seq: stateSequence,
  });
});

// Real-time Long-polling endpoint for guaranteed immediate push when WebSockets unavailable
app.get("/api/poll", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  const sinceSeq = parseInt(String(req.query.sinceSeq || "0"), 10);

  if (stateSequence > sinceSeq && globalBroadcastState) {
    return res.json({
      state: globalBroadcastState,
      timestamp: lastUpdateTimestamp,
      seq: stateSequence,
    });
  }

  // Hold connection until state updates or timeout after 25 seconds
  const timer = setTimeout(() => {
    const idx = pollWaiters.findIndex((w) => w.res === res);
    if (idx !== -1) {
      pollWaiters.splice(idx, 1);
      res.json({
        state: globalBroadcastState,
        timestamp: lastUpdateTimestamp,
        seq: stateSequence,
      });
    }
  }, 25000);

  pollWaiters.push({ res, sinceSeq, timer });

  req.on("close", () => {
    clearTimeout(timer);
    const idx = pollWaiters.findIndex((w) => w.res === res);
    if (idx !== -1) {
      pollWaiters.splice(idx, 1);
    }
  });
});

app.post("/api/state", (req, res) => {
  if (!req.body) return res.status(400).json({ success: false });
  const result = commitState(req.body);
  res.json({ success: true, ...result });
});

// Server-Sent Events (SSE) for zero-delay live overlay stream
app.get("/api/stream", (req, res) => {
  // Disable Nagle's algorithm on TCP socket for instant packet transmission
  req.socket.setNoDelay(true);
  req.socket.setKeepAlive(true);

  // Critical headers for Nginx, Cloud Run, and proxies to completely disable buffering
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders?.();

  // Add client to active SSE subscribers
  sseClients.add(res);

  // Send initial state immediately
  res.write(`: connected\n\n`);
  res.write(`data: ${JSON.stringify({ state: globalBroadcastState, timestamp: lastUpdateTimestamp, seq: stateSequence })}\n\n`);
  if (typeof (res as any).flush === "function") {
    (res as any).flush();
  }

  // Keep-alive heartbeat every 15 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(": keep-alive\n\n");
      if (typeof (res as any).flush === "function") {
        (res as any).flush();
      }
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

process.on("exit", () => clearInterval(wsHeartbeat));

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In the packaged Electron app, server.cjs itself lives inside dist/
    // (and may be inside app.asar), so never depend on process.cwd().
    const distPath = __dirname;
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`DEZIGLO SOFT Cricket Server running on http://0.0.0.0:${PORT} (HTTP + WebSocket)`);
  });
}

start();
