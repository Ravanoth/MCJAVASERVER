/* Centered loading animation for future async views. */
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
    { name: 'creeper', colors: ['#a0a0a0', '#646464', '#d4d4d4'] },
    { name: 'grass', colors: ['#9ac49d', '#5e8c53', '#d9f0c7'] },
    { name: 'obsidian', colors: ['#6e6e7c', '#3c3d4d', '#a2a8bb'] },
    { name: 'redstone', colors: ['#d77a7a', '#8a3030', '#ffd3d3'] },
    { name: 'dirt', colors: ['#a2714f', '#6a4328', '#dcc2a8'] }
  ];

  function texture(block, face) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const colors = block.colors;
    ctx.fillStyle = colors[face === 'top' ? 2 : face === 'bottom' ? 1 : 0];
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    ctx.fillRect(0, 0, 32, 3);
    ctx.fillStyle = 'rgba(0,0,0,.14)';
    ctx.fillRect(0, 29, 32, 3);

    if (block.name === 'creeper' && (face === 'front' || face === 'back')) {
      ctx.fillStyle = '#2f2f2f';
      ctx.fillRect(7, 8, 5, 5); ctx.fillRect(20, 8, 5, 5);
      ctx.fillRect(13, 13, 6, 8); ctx.fillRect(9, 19, 5, 6); ctx.fillRect(18, 19, 5, 6);
    } else if (block.name === 'redstone') {
      ctx.fillStyle = colors[2];
      ctx.fillRect(10, 10, 12, 12);
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      ctx.fillRect(12, 12, 8, 3);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      for (let i = 0; i < 16; i++) ctx.fillRect((i * 13) % 32, (i * 7) % 28, 2, 2);
    }
    return 'url(' + canvas.toDataURL('image/png') + ')';
  }

  function createCube(size, index) {
    const cube = document.createElement('div');
    cube.className = 'mc-loading-cube';
    cube.style.setProperty('--cube-size', size + 'px');
    cube.style.setProperty('--cube-delay', (-index * 0.3) + 's');
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
    #mc-loading-screen {
      position: fixed; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 22px; pointer-events: none; z-index: 70;
      background: rgba(5, 5, 7, 0.22);
      perspective: 1200px;
      transition: opacity .35s ease, visibility .35s ease;
    }
    #mc-loading-screen.mc-loading-hidden { opacity: 0; visibility: hidden; }
    .mc-loading-blocks {
      display: flex; align-items: center; justify-content: center;
      gap: 18px; transform-style: preserve-3d; perspective: 1200px;
      padding: 0 18px;
    }
    .mc-loading-cube {
      position: relative;
      width: var(--cube-size); height: var(--cube-size);
      transform-style: preserve-3d;
      animation: mcLoadingSpin 5s linear infinite;
      animation-delay: var(--cube-delay);
      filter: drop-shadow(0 18px 18px rgba(0,0,0,.28));
    }
    .mc-loading-face {
      position: absolute; inset: 0;
      box-sizing: border-box;
      border: 2px solid rgba(230, 230, 230, 0.75);
      background-size: cover;
      backface-visibility: visible;
    }
    .mc-loading-label {
      color: #dfe3e8;
      font: 12px/1.2 monospace; letter-spacing: 3px; text-transform: uppercase;
      animation: mcLoadingText 5s ease-in-out infinite;
    }
    @keyframes mcLoadingSpin {
      0% { transform: rotateX(-18deg) rotateY(0deg) rotateZ(0deg); }
      25% { transform: rotateX(12deg) rotateY(90deg) rotateZ(6deg); }
      50% { transform: rotateX(-10deg) rotateY(180deg) rotateZ(-6deg); }
      75% { transform: rotateX(12deg) rotateY(270deg) rotateZ(6deg); }
      100% { transform: rotateX(-18deg) rotateY(360deg) rotateZ(0deg); }
    }
    @keyframes mcLoadingText { 0%,100% { opacity:.45; } 45%,60% { opacity:1; } }
    @media (prefers-reduced-motion: reduce) { .mc-loading-cube, .mc-loading-label { animation-duration:12s; } }
  `;
  document.head.appendChild(style);

  function setLoading(isLoading) { screen.classList.toggle('mc-loading-hidden', !isLoading); }
  window.mcLoading = { start: () => setLoading(true), stop: () => setLoading(false) };
  window.addEventListener('load', () => setTimeout(() => setLoading(false), 5000), { once: true });
})();
