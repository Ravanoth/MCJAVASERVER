/* Centered loading animation for future async views. Blocks are drawn procedurally. */
(function () {
  const oldDecor = document.getElementById('mc-js-decor');
  if (oldDecor) oldDecor.remove();
  if (document.getElementById('mc-loading-screen')) return;

  const screen = document.createElement('div');
  screen.id = 'mc-loading-screen';
  screen.setAttribute('aria-hidden', 'true');
  screen.innerHTML = '<div class="mc-loading-blocks"></div><div class="mc-loading-label">Loading</div>';
  document.body.appendChild(screen);

  const stage = screen.querySelector('.mc-loading-blocks');
  const palettes = [
    { name: 'creeper', colors: ['#929292', '#626262', '#bcbcbc'] },
    { name: 'grass', colors: ['#a5a5a5', '#777777', '#c5c5c5'] },
    { name: 'obsidian', colors: ['#686868', '#3e3e3e', '#888888'] },
    { name: 'redstone', colors: ['#999999', '#5a5a5a', '#c8c8c8'] },
    { name: 'dirt', colors: ['#858585', '#555555', '#a8a8a8'] }
  ];

  function texture(block, face) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const colors = block.colors;
    ctx.fillStyle = colors[face === 'top' ? 2 : face === 'bottom' ? 1 : 0];
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = 'rgba(255,255,255,.13)';
    ctx.fillRect(0, 0, 32, 3);
    ctx.fillStyle = 'rgba(0,0,0,.14)';
    ctx.fillRect(0, 29, 32, 3);

    if (block.name === 'creeper' && (face === 'front' || face === 'back')) {
      ctx.fillStyle = '#303030';
      ctx.fillRect(7, 8, 5, 5); ctx.fillRect(20, 8, 5, 5);
      ctx.fillRect(13, 13, 6, 8); ctx.fillRect(9, 19, 5, 6); ctx.fillRect(18, 19, 5, 6);
    } else if (block.name === 'redstone') {
      ctx.fillStyle = colors[2]; ctx.fillRect(10, 10, 12, 12);
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(12, 12, 8, 3);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.16)';
      for (let i = 0; i < 16; i++) ctx.fillRect((i * 13) % 32, (i * 7) % 28, 2, 2);
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
    #mc-loading-screen { position:fixed; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:24px; pointer-events:none; z-index:70; background:rgba(5,5,7,.16); transition:opacity .35s ease, visibility .35s ease; }
    #mc-loading-screen.mc-loading-hidden { opacity:0; visibility:hidden; }
    .mc-loading-blocks { height:90px; display:flex; align-items:center; justify-content:center; transform-style:preserve-3d; perspective:750px; }
    .mc-loading-cube { width:var(--cube-size); height:var(--cube-size); margin-left:var(--cube-offset); transform-style:preserve-3d; animation:mcLoadingSpin 3.8s cubic-bezier(.65,0,.35,1) infinite; animation-delay:var(--cube-delay); }
    .mc-loading-face { position:absolute; inset:0; box-sizing:border-box; border:1px solid rgba(205,205,205,.72); background-size:cover; backface-visibility:hidden; }
    .mc-loading-cube { position:relative; }
    .mc-loading-label { color:#a7a7a7; font:12px/1.2 monospace; letter-spacing:3px; text-transform:uppercase; animation:mcLoadingText 3.8s ease-in-out infinite; }
    @keyframes mcLoadingSpin { 0%,100% { transform:rotateX(-18deg) rotateY(0deg) rotateZ(0deg); filter:grayscale(1); } 20% { transform:rotateX(-8deg) rotateY(72deg) rotateZ(4deg); filter:grayscale(.15); } 40% { transform:rotateX(12deg) rotateY(144deg) rotateZ(-4deg); filter:grayscale(0); } 60% { transform:rotateX(-8deg) rotateY(216deg) rotateZ(4deg); filter:grayscale(.15); } 80% { transform:rotateX(12deg) rotateY(288deg) rotateZ(-4deg); filter:grayscale(.6); } }
    @keyframes mcLoadingText { 0%,100% { opacity:.45; } 45%,60% { opacity:1; } }
    @media (prefers-reduced-motion: reduce) { .mc-loading-cube, .mc-loading-label { animation-duration:12s; } }
  `;
  document.head.appendChild(style);

  function setLoading(isLoading) {
    screen.classList.toggle('mc-loading-hidden', !isLoading);
  }
  window.mcLoading = { start: () => setLoading(true), stop: () => setLoading(false) };
  // Initial page loading ends after the auth check has had time to render.
  window.addEventListener('load', () => setTimeout(() => setLoading(false), 900), { once: true });
})();
