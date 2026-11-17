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
