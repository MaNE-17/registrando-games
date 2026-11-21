// Preload da janela do Google Imagens: coloca uma barra "Usar como wallpaper" na pagina.
const { ipcRenderer } = require('electron');
function best() {
  let b = null;
  for (const i of document.querySelectorAll('img')) {
    const r = i.getBoundingClientRect(), s = i.currentSrc || i.src || '';
    if (r.width < 160 || r.height < 90 || r.bottom < 0 || r.top > innerHeight || !/^(https?:|data:image)/.test(s)) continue;
    const a = i.naturalWidth * i.naturalHeight;
    if (!b || a > b.a) b = { a, w: i.naturalWidth, h: i.naturalHeight, src: s };
  }
  return b;
}
function mount() {
  if (document.getElementById('rg-bar') || !document.documentElement) return;
  const bar = document.createElement('div'); bar.id = 'rg-bar';
  bar.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483647;display:flex;align-items:center;gap:14px;background:#161a23;color:#e9e7e1;border:1px solid #52c889;border-radius:14px;padding:10px 14px;font:14px system-ui,sans-serif;box-shadow:0 10px 30px #0009';
  const t = document.createElement('span'), btn = document.createElement('button');
  btn.textContent = 'Usar como wallpaper';
  btn.style.cssText = 'background:#52c889;color:#0b1a12;border:0;border-radius:9px;padding:9px 16px;font:600 14px system-ui,sans-serif;cursor:pointer';
  bar.append(t, btn); document.documentElement.appendChild(bar);
  const upd = () => { const b = best(); t.textContent = b && b.w >= 1000 ? `Imagem aberta: ${b.w}×${b.h}` : 'Clique numa imagem para abri-la e espere carregar'; btn.disabled = !(b && b.w >= 1000); btn.style.opacity = btn.disabled ? '.45' : '1'; return b; };
  setInterval(upd, 600); upd();
  btn.onclick = () => { const b = upd(); if (b && b.w >= 1000) ipcRenderer.send('wall-pick', { src: b.src, w: b.w, h: b.h }); };
}
window.addEventListener('DOMContentLoaded', () => { mount(); new MutationObserver(mount).observe(document.documentElement, { childList: true }); });

// ---- Controle (quando aberto pelo modo Big Picture) ----
(() => {
  let cur = null, box = null, padOn = false; const REP = {};
  const imgs = () => [...document.querySelectorAll('img')].filter(i => { if (i.closest('#rg-bar')) return false; const r = i.getBoundingClientRect(); return r.width >= 70 && r.height >= 50 && getComputedStyle(i).visibility !== 'hidden'; });
  const vis = i => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
  function draw() {
    if (!box) { box = document.createElement('div'); box.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border:4px solid #52c889;border-radius:10px;box-shadow:0 0 0 3px #fff,0 0 24px #52c889;transition:all .12s'; document.documentElement.appendChild(box); }
    if (!cur || !cur.isConnected) { box.style.display = 'none'; return; }
    const r = cur.getBoundingClientRect(); box.style.display = 'block'; Object.assign(box.style, { left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 4 + 'px', height: r.height + 4 + 'px' });
  }
  const loop = () => { if (padOn) draw(); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  function pick(dir) {
    const L = imgs(); if (!L.length) return;
    if (!cur || !cur.isConnected || !vis(cur)) { cur = L.filter(vis)[0] || L[0]; cur.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2; let best = null, bs = Infinity;
    for (const i of L) {
      if (i === cur) continue; const r = i.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, dx = x - ax, dy = y - ay;
      const ok = dir === 'right' ? dx > 8 : dir === 'left' ? dx < -8 : dir === 'down' ? dy > 8 : dy < -8; if (!ok) continue;
      const main = dir === 'left' || dir === 'right' ? Math.abs(dx) : Math.abs(dy), side = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
      const sc = main + side * 2.5; if (sc < bs) { bs = sc; best = i; }
    }
    if (best) { cur = best; if (!vis(cur) || cur.getBoundingClientRect().bottom > innerHeight - 90) cur.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }
  function click() {
    if (!cur) return; const r = cur.getBoundingClientRect(), o = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0 };
    for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) cur.dispatchEvent(new (t.startsWith('pointer') ? PointerEvent : MouseEvent)(t, o));
  }
  function act(k) {
    if (k === 'up' || k === 'down' || k === 'left' || k === 'right') pick(k);
    else if (k === 'a') click();
    else if (k === 'use') { const b = document.querySelector('#rg-bar button'); if (b && !b.disabled) b.click(); }
    else if (k === 'b') ipcRenderer.send('wall-close');
    else if (k === 'pgdn') scrollBy({ top: innerHeight * .8, behavior: 'smooth' });
    else if (k === 'pgup') scrollBy({ top: -innerHeight * .8, behavior: 'smooth' });
  }
  const MAP = { dpadUp: 'up', dpadDown: 'down', dpadLeft: 'left', dpadRight: 'right', lsUp: 'up', lsDown: 'down', lsLeft: 'left', lsRight: 'right', south: 'a', east: 'b', guide: 'b', start: 'use', west: 'use', north: 'use', rightShoulder: 'pgdn', leftShoulder: 'pgup', rsDown: 'pgdn', rsUp: 'pgup', rt: 'pgdn', lt: 'pgup' };
  ipcRenderer.on('pad', (e, m) => {
    const k = MAP[m && m.b]; if (!k) return;
    if (m.t === 'up') { clearTimeout(REP[k]); delete REP[k]; return; }
    if (!padOn) { padOn = true; const t = document.querySelector('#rg-bar span'); if (t) t.dataset.pad = '1'; }
    act(k); if (/^(up|down|left|right)$/.test(k)) { clearTimeout(REP[k]); const r = () => { act(k); REP[k] = setTimeout(r, 120); }; REP[k] = setTimeout(r, 420); }
  });
  // dica dos botoes na barra verde
  setInterval(() => { if (!padOn) return; const bar = document.getElementById('rg-bar'); if (!bar || bar.querySelector('.rg-h')) return; const h = document.createElement('span'); h.className = 'rg-h'; h.style.cssText = 'opacity:.75;font-size:13px'; h.textContent = 'A: abrir imagem · ☰/X: usar como wallpaper · B: voltar'; bar.appendChild(h); }, 500);
})();
