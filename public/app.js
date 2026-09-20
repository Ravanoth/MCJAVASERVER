(async () => {
  const el = id => document.getElementById(id);
  const regBox = el('registerBox'), loginBox = el('loginBox'), adminBox = el('admin');
  const consoleEl = el('console');

  // Defensive: ensure admin is hidden on initial load unless explicitly shown by login flow
  if (adminBox && !adminBox.classList.contains('hidden')) {
    adminBox.classList.add('hidden');
  }

  function addLine(s) { if (!consoleEl) return; consoleEl.textContent += s + '\n'; consoleEl.scrollTop = consoleEl.scrollHeight; }

  // Helper to safely show/hide elements
  function show(elm) { if (!elm) return; elm.classList.remove('hidden'); }
  function hide(elm) { if (!elm) return; elm.classList.add('hidden'); }

  // If the API check fails, default to showing the login box so users can still attempt to login
  try {
    const resp = await fetch('/api/first');
    const first = await resp.json();
    if (first && first.allowRegister) {
      show(regBox); hide(loginBox);
    } else {
      show(loginBox); hide(regBox);
    }
  } catch (e) {
    console.error('Failed to check registration status', e);
    show(loginBox);
    hide(regBox);
  }

  // Wire up buttons (guard if elements missing)
  const doRegisterBtn = el('doRegister');
  if (doRegisterBtn) doRegisterBtn.addEventListener('click', async () => {
    const u = el('regUser')?.value, p = el('regPass')?.value;
    try {
      const r = await fetch('/api/register', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({username:u,password:p})});
      if (r.ok) {
        el('regMsg').textContent = 'Created. Please log in.';
        hide(regBox); show(loginBox);
      } else {
        const j = await r.json().catch(()=>({error:'bad'}));
        el('regMsg').textContent = j.error || 'error';
      }
    } catch (err) { el('regMsg').textContent = 'network error'; }
  });

  const doLoginBtn = el('doLogin');
  if (doLoginBtn) doLoginBtn.addEventListener('click', async () => {
    const u = el('loginUser')?.value, p = el('loginPass')?.value;
    try {
      const r = await fetch('/api/login', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({username:u,password:p})});
      if (r.ok) {
        const j = await r.json();
        const token = j.token;
        if (token) localStorage.setItem('mc_token', token);
        hide(loginBox); hide(regBox);
        showAdmin(token);
      } else {
        el('loginMsg').textContent = 'Login failed';
      }
    } catch (err) { el('loginMsg').textContent = 'network error'; }
  });

  function authHeaders() {
    const t = localStorage.getItem('mc_token');
    return t ? { 'Authorization': 'Bearer ' + t } : {};
  }

  async function showAdmin(token) {
    if (!adminBox) return;

    // hide auth UI and show admin console explicitly
    try { hide(regBox); hide(loginBox); } catch(e){}

    show(adminBox);

    // Ensure any legacy overlay is hidden when admin is shown
    try {
      const overlay = document.getElementById('deploy-anim');
      if (overlay) overlay.style.display = 'none';
    } catch(e) {}

    // Setup websocket
    const t = token || localStorage.getItem('mc_token');
    try {
      const ws = new WebSocket((location.protocol==='https:'?'wss://':'ws://') + location.host + '/ws/console?token=' + encodeURIComponent(t));
      ws.onopen = () => addLine('[WS connected]');
      ws.onmessage = (ev) => {
        try {
          const obj = JSON.parse(ev.data);
          if (obj.type === 'console') addLine(obj.line);
          else if (obj.type === 'info') addLine('[info] ' + (obj.msg||''));
        } catch(e) { addLine(ev.data); }
      };
      ws.onclose = () => addLine('[WS closed]');

      const startBtn = el('startBtn');
      if (startBtn) startBtn.onclick = async () => {
        await fetch('/api/start', { method: 'POST', headers: { ...(authHeaders()), 'content-type':'application/json' }}).catch(e=>addLine('[start failed]'));
      };
      const stopBtn = el('stopBtn');
      if (stopBtn) stopBtn.onclick = async () => {
        await fetch('/api/stop', { method: 'POST', headers: { ...(authHeaders()), 'content-type':'application/json' }}).catch(e=>addLine('[stop failed]'));
      };
      const sendBtn = el('sendCmd');
      if (sendBtn) sendBtn.onclick = () => {
        const c = el('cmdInput')?.value;
        if (!c) return;
        ws.send(JSON.stringify({ type:'cmd', cmd: c }));
        el('cmdInput').value = '';
      };
      const seedBtn = el('seedBtn');
      if (seedBtn) seedBtn.onclick = async () => {
        addLine('[requesting seed]');
        try {
          const r = await fetch('/api/seed', { method:'POST', headers: { ...(authHeaders()), 'content-type':'application/json' }});
          const j = await r.json().catch(()=>null);
          if (j && j.seed) addLine('[seed] ' + j.seed);
          else addLine('[seed request failed]');
        } catch (e) { addLine('[seed request failed]'); }
      };
    } catch (e) {
      addLine('[ws error] ' + (e && e.message));
    }
  }

  // NOTE: Do NOT auto-open admin based solely based on localStorage token on page load.
})();

// Disable the old top-right deploy animation; the centered loading screen is handled by loading-blocks.js.
(function () {
  const legacy = document.getElementById('deploy-anim');
  if (legacy) legacy.remove();
})();
