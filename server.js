// Simple Express server with first-visitor registration and websocket console
const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_PATH = path.join(__dirname, 'data', 'db.sqlite');
if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new sqlite3.Database(DB_PATH);

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-to-secure-secret';
const JWT_COOKIE_NAME = 'mcjsess';

let serverProcess = null;
let wsServer; // set later
const clients = new Set();

function dbRun(sql, params=[]) {
  return new Promise((res, rej) => db.run(sql, params, function(err) {
    if (err) rej(err); else res(this);
  }));
}
function dbGet(sql, params=[]) {
  return new Promise((res, rej) => db.get(sql, params, (err,row)=> err?rej(err):res(row)));
}
function dbAll(sql, params=[]) {
  return new Promise((res, rej) => db.all(sql, params, (err,rows)=> err?rej(err):res(rows)));
}

async function initDb() {
  await dbRun(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    password_hash TEXT
  )`);
}
initDb().catch(console.error);

app.get('/api/first', async (req, res) => {
  const row = await dbGet('SELECT COUNT(1) AS c FROM users');
  res.json({ allowRegister: (row && row.c === 0) });
});

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username+password required' });
    const row = await dbGet('SELECT COUNT(1) AS c FROM users');
    if (row && row.c > 0) return res.status(403).json({ error: 'Registration closed' });
    const hash = await bcrypt.hash(password, 10);
    await dbRun('INSERT INTO users(username,password_hash) VALUES(?,?)', [username, hash]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'server error' }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) return res.status(401).json({ error: 'invalid' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid' });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie = (() => {}); // placeholder for frameworks that set cookies; we'll set header
    // set cookie in header
    res.setHeader('Set-Cookie', `${JWT_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${7*24*3600}`);
    res.json({ ok: true, username: user.username, token });
  } catch (err) { console.error(err); res.status(500).json({ error: 'server error' }); }
});

function authenticateFromReq(req) {
  // Try Authorization header first, then cookie
  const auth = req.headers['authorization'];
  let token = null;
  if (auth && auth.startsWith('Bearer ')) token = auth.slice('Bearer '.length);
  else if (req.headers.cookie) {
    const m = req.headers.cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(JWT_COOKIE_NAME+'='));
    if (m) token = m.split('=')[1];
  }
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

app.get('/api/me', (req, res) => {
  const user = authenticateFromReq(req);
  if (!user) return res.status(401).json({ error: 'unauth' });
  res.json({ username: user.username, id: user.id });
});

app.post('/api/start', async (req, res) => {
  const user = authenticateFromReq(req);
  if (!user) return res.status(401).json({ error: 'unauth' });
  try {
    startServer();
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'start failed' }); }
});

app.post('/api/stop', async (req, res) => {
  const user = authenticateFromReq(req);
  if (!user) return res.status(401).json({ error: 'unauth' });
  try {
    stopServer();
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'stop failed' }); }
});

app.post('/api/cmd', async (req, res) => {
  const user = authenticateFromReq(req);
  if (!user) return res.status(401).json({ error: 'unauth' });
  const { cmd } = req.body;
  if (!cmd) return res.status(400).json({ error: 'cmd required' });
  if (!serverProcess) return res.status(400).json({ error: 'server not running' });
  serverProcess.stdin.write(cmd + '\n');
  res.json({ ok: true });
});

app.post('/api/seed', async (req, res) => {
  const user = authenticateFromReq(req);
  if (!user) return res.status(401).json({ error: 'unauth' });
  if (!serverProcess) return res.status(400).json({ error: 'server not running' });
  // We'll send "seed" command and listen for a response line that contains the seed
  const token = Math.random().toString(36).slice(2, 9);
  const marker = `[SEED-${token}]`;
  // implementation omitted for brevity
  res.status(501).json({ error: 'not implemented' });
});

// New endpoint: reset users (requires auth)
app.post('/api/reset', async (req, res) => {
  const user = authenticateFromReq(req);
  if (!user) return res.status(401).json({ error: 'unauth' });
  try {
    await dbRun('DELETE FROM users');
    res.json({ ok: true });
  } catch (e) {
    console.error('reset failed', e);
    res.status(500).json({ error: 'reset failed' });
  }
});

// --- server process control and websockets ---
function startServer() {
  if (serverProcess) return;
  const serverJar = path.join(__dirname, 'minecraft', 'server.jar');
  if (!fs.existsSync(serverJar)) {
    throw new Error('server.jar not found at ' + serverJar);
  }
  // Spawn Java process with the Minecraft server
  serverProcess = spawn('java', ['-Xmx1G', '-jar', serverJar, 'nogui'], {
    cwd: path.join(__dirname, 'minecraft'),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  serverProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) broadcast({ type: 'console', line });
    });
  });

  serverProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) broadcast({ type: 'console', line: '[ERR] ' + line });
    });
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start Minecraft server:', err);
    broadcast({ type: 'info', msg: 'Failed to start server: ' + err.message });
    serverProcess = null;
  });

  serverProcess.on('exit', (code) => {
    console.log('Server process exited with code', code);
    serverProcess = null;
    broadcast({ type: 'info', msg: 'Server stopped' });
  });

  console.log('Minecraft server process started');
  broadcast({ type: 'info', msg: 'Server started' });
}

function stopServer() {
  if (!serverProcess) return;
  console.log('Stopping server...');
  serverProcess.stdin.write('stop\n');
  // Give it a few seconds to shut down gracefully
  setTimeout(() => {
    if (serverProcess) serverProcess.kill();
  }, 5000);
}

function broadcast(message) {
  const data = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  });
}

// Websocket server for console
const server = require('http').createServer(app);
wsServer = new WebSocket.Server({ server });
wsServer.on('connection', ws => {
  clients.add(ws);
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'cmd' && msg.cmd && serverProcess) {
        serverProcess.stdin.write(msg.cmd + '\n');
      }
    } catch (e) {
      console.error('WS message error', e);
    }
  });
  ws.on('close', () => clients.delete(ws));
});

server.listen(process.env.PORT || 3000, () => console.log('server listening at port 3000'));
