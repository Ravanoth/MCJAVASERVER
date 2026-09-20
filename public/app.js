(async () => {
  const el = id => document.getElementById(id);
  const regBox = el('registerBox'), loginBox = el('loginBox'), adminBox = el('admin');
  const consoleEl = el('console');
  if (adminBox) adminBox.classList.add('hidden');

  function addLine(s) { if (!consoleEl) return; consoleEl.textContent += s + '\n'; consoleEl.scrollTop = consoleEl.scrollHeight; }
  function show(node) { if (node) node.classList.remove('hidden'); }
  function hide(node) { if (node) node.classList.add('hidden'); }
  function authHeaders() { const token = localStorage.getItem('mc_token'); return token ? { Authorization: 'Bearer ' + token } : {}; }
  function setMessage(id, text, success = false) {
    const node = el(id);
    if (!node) return;
    node.textContent = text;
    node.classList.toggle('success', success);
    node.classList.toggle('error', !success && !!text);
  }

  function loadingStart() { window.mcLoading?.start(); }
  function loadingStop() { window.mcLoading?.stop(); }
  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  async function transition(next) {
    loadingStart();
    hide(regBox); hide(loginBox); hide(adminBox);
    await sleep(5000);
    show(next);
    loadingStop();
  }

  try {
    const response = await fetch('/api/first');
    const first = await response.json();
    if (first && first.allowRegister) { show(regBox); hide(loginBox); }
    else { show(loginBox); hide(regBox); }
  } catch (error) {
    console.error('Failed to check registration status', error);
    show(loginBox);
    hide(regBox);
  }

  const register = async () => {
    const username = el('regUser')?.value.trim();
    const password = el('regPass')?.value;
    setMessage('regMsg', '');
    if (!username || !password) {
      setMessage('regMsg', 'Username and password are required');
      return;
    }

    const button = el('doRegister');
    if (button) button.disabled = true;
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage('regMsg', result.error || 'Registration failed');
        return;
      }

      hide(regBox);
      show(loginBox);
      setMessage('loginMsg', 'Account created. Please log in.', true);
      el('loginUser').value = username;
      el('loginPass').value = '';
    } catch {
      setMessage('regMsg', 'Network error');
    } finally {
      if (button) button.disabled = false;
    }
  };

  el('doRegister')?.addEventListener('click', register);
  ['regUser', 'regPass'].forEach(id => el(id)?.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); register(); }
  }));

  const login = async () => {
    const username = el('loginUser')?.value.trim();
    const password = el('loginPass')?.value;
    setMessage('loginMsg', '');
    if (!username || !password) {
      setMessage('loginMsg', 'Username and password are required');
      return;
    }

    const button = el('doLogin');
    if (button) button.disabled = true;
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage('loginMsg', result.error || 'Login failed');
        return;
      }
      if (result.token) localStorage.setItem('mc_token', result.token);
      hide(regBox); hide(loginBox); show(adminBox);
      connectConsole(result.token);
    } catch {
      setMessage('loginMsg', 'Network error');
    } finally {
      if (button) button.disabled = false;
    }
  };

  el('doLogin')?.addEventListener('click', login);
  ['loginUser', 'loginPass'].forEach(id => el(id)?.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); login(); }
  }));

  function connectConsole(token) {
    const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws/console?token=' + encodeURIComponent(token || localStorage.getItem('mc_token') || ''));
    ws.onopen = () => addLine('[console connected]');
    ws.onmessage = event => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'console') addLine(message.line);
        else if (message.type === 'info') addLine('[info] ' + (message.msg || ''));
        else if (message.type === 'error') addLine('[error] ' + (message.msg || ''));
      } catch {
        addLine(event.data);
      }
    };
    ws.onerror = () => addLine('[console connection error]');
    ws.onclose = () => addLine('[console disconnected]');

    const startBtn = el('startBtn');
    if (startBtn) startBtn.onclick = async () => {
      try {
        const response = await fetch('/api/start', { method: 'POST', headers: { ...authHeaders(), 'content-type': 'application/json' } });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) addLine('[error] ' + (result.error || 'start failed'));
      } catch {
        addLine('[error] start request failed');
      }
    };

    const stopBtn = el('stopBtn');
    if (stopBtn) stopBtn.onclick = async () => {
      try {
        const response = await fetch('/api/stop', { method: 'POST', headers: { ...authHeaders(), 'content-type': 'application/json' } });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) addLine('[error] ' + (result.error || 'stop failed'));
      } catch {
        addLine('[error] stop request failed');
      }
    };

    const input = el('cmdInput');
    const sendBtn = el('sendCmd');
    async function sendCommand() {
      const command = input?.value.trim();
      if (!command) return;
      if (sendBtn) sendBtn.disabled = true;
      try {
        const response = await fetch('/api/cmd', {
          method: 'POST',
          headers: { ...authHeaders(), 'content-type': 'application/json' },
          body: JSON.stringify({ cmd: command })
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok) {
          addLine('> ' + command);
          if (input) input.value = '';
        } else {
          addLine('[error] ' + (result.error || 'command failed'));
        }
      } catch {
        addLine('[error] command request failed');
      } finally {
        if (sendBtn) sendBtn.disabled = false;
      }
    }

    if (sendBtn) sendBtn.onclick = sendCommand;
    if (input) input.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); sendCommand(); }
    });

    const seedBtn = el('seedBtn');
    if (seedBtn) seedBtn.onclick = async () => {
      addLine('[requesting seed]');
      try {
        const response = await fetch('/api/seed', { method: 'POST', headers: { ...authHeaders(), 'content-type': 'application/json' } });
        const result = await response.json().catch(() => ({}));
        addLine(response.ok && result.seed ? '[seed] ' + result.seed : '[error] ' + (result.error || 'seed request failed'));
      } catch {
        addLine('[error] seed request failed');
      }
    };
  }
})();
