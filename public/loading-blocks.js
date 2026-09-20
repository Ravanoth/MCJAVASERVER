/* Centered loading animation for future async views. Blocks are drawn procedurally. */
(function () {
  const oldDecor = document.getElementById('mc-js-decor');
  const oldDeploy = document.getElementById('deploy-anim');
  if (oldDecor) oldDecor.remove();
  if (oldDeploy) oldDeploy.remove();
  if (document.getElementById('mc-loading-screen')) return;

  const screen = document.createElement('div');
  screen.id = 'mc-loading-screen';
  screen.setAttribute('aria-hidden', 'true');
  screen.innerHTML = '<div class="mc-loading-blocks"></div><div class="mc-loading-label">Loading</div>';
  document.body.appendChild(screen);

  const stage = screen.querySelector('.mc-loading-blocks');
  const palettes = [
    { name: 'magenta', colors: ['#ff7ad9', '#d84dff', '#f7c3ff'] },
    { name: 'purple', colors: ['#8d5eff', '#5f2bd1', '#d5c0ff'] },
    { name: 'teal', colors: ['#85f4d7', '#2ec4b6', '#dffef5'] },
    { name: 'blue', colors: ['#7bc8ff', '#3f7bdc', '#d6f0ff'] },
    { name: 'iron', colors: ['#a7a7a7', '#5c5c5c', '#dfe3e8'] }
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
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    for (let i = 0; i < 16; i++) ctx.fillRect((i * 13) % 32, (i * 7) % 28, 2, 2);
    if (block.name === 'teal' && (face === 'front' || face === 'back')) {
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      ctx.fillRect(8, 8, 6, 6); ctx.fillRect(18, 8, 6, 6); ctx.fillRect(12, 14, 8, 10);
    }
    if (block.name === 'purple' && (face === 'front' || face === 'back')) {
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.fillRect(7, 7, 18, 4); ctx.fillRect(10, 14, 12, 5);
    }
    if (block.name === 'blue' && (face === 'front' || face === 'back')) {
      ctx.fillStyle = 'rgba(255,255,255,.13)';
      ctx.fillRect(6, 8, 4, 16); ctx.fillRect(12, 8, 4, 16); ctx.fillRect(18, 8, 4, 16);
    }
    return 'url(' + canvas.toDataURL('image/png') + ')';
  }

  function createCube(size, index) {
    const cube = document.createElement('div');
    cube.className = 'mc-loading-cube';
    cube.style.setProperty('--cube-size', size + 'px');
    cube.style.setProperty('--cube-delay', (-index * 0.75) + 's');
    cube.style.setProperty('--cube-offset', (index * 7 - 14) + 'px');
    const faces = [
      ['front', 'translateZ(' + size / 2 + 'px)'],
      ['back', 'rotateY(180deg) translateZ(' + size / 2 + 'px)'],
      ['right', 'rotateY(90deg) translateZ(' + size / 2 + 'px)'],
      ['left', 'rotateY(-90deg) translateZ(' + size / 2 + 'px)'],
      ['top', 'rotateX(90deg) translateZ(' + size / 2 + 'px)'],
      ['bottom', 'rotateX(-90deg) translateZ(' + size / 2 + 'px)']
    ];
    faces.forEach(([name, transform]) => {
      const face = document.createElement('div');
      face.className = 'mc-loading-face';
      face.style.transform = transform;
      face.style.backgroundImage = texture(palettes[index % palettes.length], name);
      cube.appendChild(face);
    });
    stage.appendChild(cube);
  }

  [42, 50, 58, 50, 42].forEach(createCube);

  const style = document.createElement('style');
  style.textContent = `
    #mc-loading-screen { position:fixed; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:24px; pointer-events:none; z-index:70; background:rgba(5,5,7,.18); backdrop-filter:blur(1px); transition:opacity .35s ease,visibility .35s ease; }
    #mc-loading-screen.mc-loading-hidden { opacity:0; visibility:hidden; }
    .mc-loading-blocks { height:90px; display:flex; align-items:center; justify-content:center; transform-style:preserve-3d; perspective:750px; }
    .mc-loading-cube { width:var(--cube-size); height:var(--cube-size); margin-left:var(--cube-offset); position:relative; transform-style:preserve-3d; animation:mcLoadingSpin 3.8s cubic-bezier(.65,0,.35,1) infinite; animation-delay:var(--cube-delay); filter:saturate(1.25); }
    .mc-loading-face { position:absolute; inset:0; box-sizing:border-box; border:1px solid rgba(205,205,205,.72); background-size:cover; backface-visibility:hidden; box-shadow:inset 0 0 10px rgba(255,255,255,.08); }
    .mc-loading-label { color:#dfe3e8; font:12px/1.2 monospace; letter-spacing:3px; text-transform:uppercase; animation:mcLoadingText 3.8s ease-in-out infinite; }
    @keyframes mcLoadingSpin { 0%,100% { transform:rotateX(-18deg) rotateY(0deg) rotateZ(0deg); filter:saturate(.25) brightness(.82); } 20% { transform:rotateX(-8deg) rotateY(72deg) rotateZ(4deg); filter:saturate(1.2) brightness(1.1); } 40% { transform:rotateX(12deg) rotateY(144deg) rotateZ(-4deg); filter:saturate(1.7) brightness(1.25); } 60% { transform:rotateX(-8deg) rotateY(216deg) rotateZ(4deg); filter:saturate(1.4) brightness(1.18); } 80% { transform:rotateX(12deg) rotateY(288deg) rotateZ(-4deg); filter:saturate(.8) brightness(.9); } }
    @keyframes mcLoadingText { 0%,100% { opacity:.45; } 45%,60% { opacity:1; } }
    @media (prefers-reduced-motion:reduce) { .mc-loading-cube,.mc-loading-label { animation-duration:12s; } }
  `;
  document.head.appendChild(style);

  function setLoading(isLoading) { screen.classList.toggle('mc-loading-hidden', !isLoading); }
  window.mcLoading = { start: () => setLoading(true), stop: () => setLoading(false) };
  window.addEventListener('load', () => setTimeout(() => setLoading(false), 900), { once: true });
})();
