(async () => {
  const el = id => document.getElementById(id);
  const regBox = el('registerBox'), loginBox = el('loginBox'), adminBox = el('admin');
  const consoleEl = el('console');

  if (adminBox && !adminBox.classList.contains('hidden')) adminBox.classList.add('hidden');
  function addLine(s) { if (!consoleEl) return; consoleEl.textContent += s + '\n'; consoleEl.scrollTop = consoleEl.scrollHeight; }
  function show(elm) { if (!elm) return; elm.classList.remove('hidden'); }
  function hide(elm) { if (!elm) return; elm.classList.add('hidden'); }

  try {
    const resp = await fetch('/api/first');
    const first = await resp.json();
    if (first && first.allowRegister) { show(regBox); hide(loginBox); }
    else { show(loginBox); hide(regBox); }
  } catch (e) {
    console.error('Failed to check registration status', e);
    show(loginBox); hide(regBox);
  }

  const doRegisterBtn = el('doRegister');
  if (doRegisterBtn) doRegisterBtn.addEventListener('click', async () => {
    const u = el('regUser')?.value, p = el('regPass')?.value;
    try {
      const r = await fetch('/api/register', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({username:u,password:p}) });
      if (r.ok) { el('regMsg').textContent = 'Created. Please log in.'; hide(regBox); show(loginBox); }
      else { const j = await r.json().catch(() => ({error:'bad'})); el('regMsg').textContent = j.error || 'error'; }
    } catch (err) { el('regMsg').textContent = 'network error'; }
  });

  const doLoginBtn = el('doLogin');
  if (doLoginBtn) doLoginBtn.addEventListener('click', async () => {
    const u = el('loginUser')?.value, p = el('loginPass')?.value;
    try {
      const r = await fetch('/api/login', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({username:u,password:p}) });
      if (r.ok) { const j = await r.json(); const token = j.token; if (token) localStorage.setItem('mc_token', token); hide(loginBox); hide(regBox); showAdmin(token); }
      else el('loginMsg').textContent = 'Login failed';
    } catch (err) { el('loginMsg').textContent = 'network error'; }
  });

  function authHeaders() {
    const t = localStorage.getItem('mc_token');
    return t ? { 'Authorization': 'Bearer ' + t } : {};
  }

  async function showAdmin(token) {
    if (!adminBox) return;
    hide(regBox); hide(loginBox); show(adminBox);
    const overlay = document.getElementById('deploy-anim');
    if (overlay) overlay.style.display = 'none';
    const t = token || localStorage.getItem('mc_token');
    try {
      const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws/console?token=' + encodeURIComponent(t));
      ws.onopen = () => addLine('[WS connected]');
      ws.onmessage = ev => { try { const obj = JSON.parse(ev.data); if (obj.type === 'console') addLine(obj.line); else if (obj.type === 'info') addLine('[info] ' + (obj.msg || '')); } catch (e) { addLine(ev.data); } };
      ws.onclose = () => addLine('[WS closed]');
      const startBtn = el('startBtn');
      if (startBtn) startBtn.onclick = async () => { await fetch('/api/start', { method:'POST', headers:{ ...authHeaders(), 'content-type':'application/json' } }).catch(() => addLine('[start failed]')); };
      const stopBtn = el('stopBtn');
      if (stopBtn) stopBtn.onclick = async () => { await fetch('/api/stop', { method:'POST', headers:{ ...authHeaders(), 'content-type':'application/json' } }).catch(() => addLine('[stop failed]')); };
      const sendBtn = el('sendCmd');
      if (sendBtn) sendBtn.onclick = () => { const c = el('cmdInput')?.value; if (!c) return; ws.send(JSON.stringify({ type:'cmd', cmd:c })); el('cmdInput').value = ''; };
      const seedBtn = el('seedBtn');
      if (seedBtn) seedBtn.onclick = async () => { addLine('[requesting seed]'); try { const r = await fetch('/api/seed', { method:'POST', headers:{ ...authHeaders(), 'content-type':'application/json' } }); const j = await r.json().catch(() => null); addLine(j && j.seed ? '[seed] ' + j.seed : '[seed request failed]'); } catch (e) { addLine('[seed request failed]'); } };
    } catch (e) { addLine('[ws error] ' + (e && e.message)); }
  }
})();

(function () {
  if (document.getElementById('mc-js-decor')) return;

  const container = document.createElement('div');
  container.id = 'mc-js-decor';
  container.setAttribute('aria-hidden', 'true');
  Object.assign(container.style, {
    position: 'fixed',
    top: '18px',
    right: '18px',
    width: '220px',
    height: '170px',
    pointerEvents: 'none',
    zIndex: '0',
    opacity: '0.72',
    perspective: '700px'
  });
  document.body.appendChild(container);

  const blocks = [
    { name: 'grass', colors: ['#a5a5a5', '#777', '#c5c5c5'] },
    { name: 'obsidian', colors: ['#686868', '#3e3e3e', '#888'] },
    { name: 'redstone', colors: ['#999', '#5a5a5a', '#c8c8c8'] },
    { name: 'dirt', colors: ['#858585', '#555', '#a8a8a8'] },
    { name: 'creeper', colors: ['#929292', '#626262', '#bcbcbc'] }
  ];

  function texture(block, face) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const colors = block.colors;

    ctx.fillStyle = colors[face === 'top' ? 2 : face === 'bottom' ? 1 : 0];
    ctx.fillRect(0, 0, 32, 32);

    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fillRect(0, 0, 32, 3);
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.fillRect(0, 29, 32, 3);

    if (block.name === 'grass') {
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      for (let i = 0; i < 18; i++) {
        ctx.fillRect((i * 13) % 32, (i * 7) % 28, 2, 2);
      }
    }
    if (block.name === 'obsidian') {
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      for (let i = 0; i < 12; i++) {
        ctx.fillRect((i * 9) % 32, (i * 5) % 32, 3, 2);
      }
    }
    if (block.name === 'redstone') {
      ctx.fillStyle = colors[2];
      ctx.fillRect(10, 10, 12, 12);
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.fillRect(12, 12, 8, 3);
    }
    if (block.name === 'dirt') {
      ctx.fillStyle = 'rgba(0,0,0,.14)';
      for (let i = 0; i < 20; i++) {
        ctx.fillRect((i * 11) % 32, (i * 17) % 32, 3, 3);
      }
    }
    if (block.name === 'creeper' && (face === 'front' || face === 'back')) {
      ctx.fillStyle = '#333';
      ctx.fillRect(7, 8, 5, 5);
      ctx.fillRect(20, 8, 5, 5);
      ctx.fillRect(13, 13, 6, 8);
      ctx.fillRect(9, 19, 5, 6);
      ctx.fillRect(18, 19, 5, 6);
    }

    return 'url(' + canvas.toDataURL() + ')';
  }

  function makeCube(x, y, size, delay, block) {
    const cube = document.createElement('div');
    Object.assign(cube.style, {
      position: 'absolute',
      left: x + 'px',
      top: y + 'px',
      width: size + 'px',
      height: size + 'px',
      transformStyle: 'preserve-3d',
      animation: 'mcBlockSpin ' + (8 + delay) + 's linear infinite',
      animationDelay: '-' + delay + 's'
    });

    const faces = [
      ['front', 'translateZ(' + (size / 2) + 'px)'],
      ['back', 'rotateY(180deg) translateZ(' + (size / 2) + 'px)'],
      ['right', 'rotateY(90deg) translateZ(' + (size / 2) + 'px)'],
      ['left', 'rotateY(-90deg) translateZ(' + (size / 2) + 'px)'],
      ['top', 'rotateX(90deg) translateZ(' + (size / 2) + 'px)'],
      ['bottom', 'rotateX(-90deg) translateZ(' + (size / 2) + 'px)']
    ];

    faces.forEach(([name, transform]) => {
      const face = document.createElement('div');
      Object.assign(face.style, {
        position: 'absolute',
        inset: '0',
        boxSizing: 'border-box',
        border: '1px solid rgba(190,190,190,.58)',
        backgroundImage: texture(block, name),
        backgroundSize: 'cover',
        transform: transform,
        backfaceVisibility: 'hidden'
      });
      cube.appendChild(face);
    });

    container.appendChild(cube);
  }

  makeCube(8, 12, 54, 0, blocks[4]);
  makeCube(76, 48, 42, 1.5, blocks[2]);
  makeCube(130, 14, 46, 2.7, blocks[0]);
  makeCube(154, 88, 38, 3.8, blocks[1]);
  makeCube(28, 102, 32, 4.8, blocks[3]);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes mcBlockSpin {
      0%   { transform: rotateX(-20deg) rotateY(0deg) rotateZ(0deg) }
      25%  { transform: rotateX(-12deg) rotateY(90deg) rotateZ(9deg) }
      50%  { transform: rotateX(18deg) rotateY(180deg) rotateZ(0deg) }
      75%  { transform: rotateX(-10deg) rotateY(270deg) rotateZ(-9deg) }
      100% { transform: rotateX(-20deg) rotateY(360deg) rotateZ(0deg) }
    }

    @media (max-width: 520px) {
      #mc-js-decor {
        transform: scale(.72);
        transform-origin: top right;
        right: 8px;
        top: 8px;
      }
    }
  `;
  document.head.appendChild(style);
})();
