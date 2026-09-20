(async () => {
  const el = id => document.getElementById(id);
  const regBox = el('registerBox'), loginBox = el('loginBox'), adminBox = el('admin');
  const consoleEl = el('console');
  if (adminBox) adminBox.classList.add('hidden');

  function addLine(s) { if (!consoleEl) return; consoleEl.textContent += s + '\n'; consoleEl.scrollTop = consoleEl.scrollHeight; }
  function show(node) { if (node) node.classList.remove('hidden'); }
  function hide(node) { if (node) node.classList.add('hidden'); }
  function authHeaders() { const token = localStorage.getItem('mc_token'); return token ? { Authorization: 'Bearer ' + token } : {}; }
  function loadingStart() { window.mcLoading?.start(); }
  function loadingStop() { window.mcLoading?.stop(); }
  async function transition(next) {
    loadingStart();
    await new Promise(resolve => setTimeout(resolve, 5000));
    hide(regBox); hide(loginBox); hide(adminBox); show(next); loadingStop();
  }

  try {
    const response = await fetch('/api/first');
    const first = await response.json();
    if (first && first.allowRegister) { show(regBox); hide(loginBox); } else { show(loginBox); hide(regBox); }
  } catch (error) { console.error('Failed to check registration status', error); show(loginBox); hide(regBox); }
  finally { loadingStop(); }

  const register = async () => {
    const username = el('regUser')?.value.trim(), password = el('regPass')?.value;
    el('regMsg').textContent = '';
    try {
      const response = await fetch('/api/register', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ username, password }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { el('regMsg').textContent = result.error || 'Registration failed'; return; }
      await transition(loginBox); el('loginMsg').textContent = 'Account created. Please log in.';
    } catch { el('regMsg').textContent = 'Network error'; }
  };
  el('doRegister')?.addEventListener('click', register);
  ['regUser','regPass'].forEach(id => el(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); register(); } }));

  const login = async () => {
    const username = el('loginUser')?.value.trim(), password = el('loginPass')?.value;
    el('loginMsg').textContent = '';
    try {
      const response = await fetch('/api/login', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ username, password }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { el('loginMsg').textContent = result.error || 'Login failed'; return; }
      if (result.token) localStorage.setItem('mc_token', result.token);
      await transition(adminBox); connectConsole(result.token);
    } catch { el('loginMsg').textContent = 'Network error'; }
  };
  el('doLogin')?.addEventListener('click', login);
  ['loginUser','loginPass'].forEach(id => el(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); login(); } }));

  function connectConsole(token) {
    const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws/console?token=' + encodeURIComponent(token || localStorage.getItem('mc_token') || ''));
    ws.onopen = () => addLine('[console connected]');
    ws.onmessage = e => { try { const m = JSON.parse(e.data); if (m.type === 'console') addLine(m.line); else if (m.type === 'info') addLine('[info] ' + (m.msg || '')); else if (m.type === 'error') addLine('[error] ' + (m.msg || '')); } catch { addLine(e.data); } };
    ws.onerror = () => addLine('[console connection error]');
    ws.onclose = () => addLine('[console disconnected]');

    el('startBtn')?.addEventListener('click', async () => {
      try { const r = await fetch('/api/start', { method:'POST', headers:{ ...authHeaders(), 'content-type':'application/json' } }); const j = await r.json().catch(() => ({})); if (!r.ok) addLine('[error] ' + (j.error || 'start failed')); } catch { addLine('[error] start request failed'); }
    });
    el('stopBtn')?.addEventListener('click', async () => {
      try { const r = await fetch('/api/stop', { method:'POST', headers:{ ...authHeaders(), 'content-type':'application/json' } }); const j = await r.json().catch(() => ({})); if (!r.ok) addLine('[error] ' + (j.error || 'stop failed')); } catch { addLine('[error] stop request failed'); }
    });
    const input = el('cmdInput'), send = el('sendCmd');
    const sendCommand = async () => {
      const command = input?.value.trim(); if (!command) return;
      send.disabled = true;
      try { const r = await fetch('/api/cmd', { method:'POST', headers:{ ...authHeaders(), 'content-type':'application/json' }, body:JSON.stringify({ cmd:command }) }); const j = await r.json().catch(() => ({})); if (!r.ok) addLine('[error] ' + (j.error || 'command failed')); else addLine('> ' + command); if (input) input.value = ''; } catch { addLine('[error] command request failed'); } finally { send.disabled = false; }
    };
    send?.addEventListener('click', sendCommand);
    input?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendCommand(); } });

    el('seedBtn')?.addEventListener('click', async () => {
      addLine('[requesting seed]');
      try { const r = await fetch('/api/seed', { method:'POST', headers:{ ...authHeaders(), 'content-type':'application/json' } }); const j = await r.json().catch(() => ({})); addLine(r.ok && j.seed ? '[seed] ' + j.seed : '[error] ' + (j.error || 'seed request failed')); } catch { addLine('[error] seed request failed'); }
    });
  }
})();
