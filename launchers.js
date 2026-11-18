// Deteccao dos jogos instalados de outros launchers (Epic, Ubisoft Connect, EA app, Battle.net, Game Pass).
// Tudo e lido do proprio computador: nenhuma conta, chave ou login.
const fs = require('fs'), path = require('path'), cp = require('child_process');

const NAMES = ['Epic Games', 'GOG', 'Ubisoft Connect', 'EA app', 'Battle.net', 'Game Pass'];
// Todos os launchers de PC que podem ir para a barra lateral (os que nao tem deteccao so servem de filtro)
const CATALOG = ['Steam', 'Epic Games', 'GOG', 'Ubisoft Connect', 'EA app', 'Battle.net', 'Game Pass', 'itch.io', 'Amazon Games', 'Riot Games', 'Humble Bundle'];
const SIDE_DEF = ['Steam', 'Epic Games', 'Ubisoft Connect', 'EA app', 'Battle.net', 'Game Pass'];
const SKIP_EXE = /unins|setup|crash|report|redist|vcredist|dxsetup|dotnet|launcherhelper|gamelaunchhelper|easyanticheat|eac|battleye|cefsub|updater|support|prereq|install/i;

// Executavel mais provavel do jogo: o maior .exe da pasta (ou de uma subpasta rasa), ignorando instaladores e ajudantes
function guessExe(dir) {
  let best = '', size = -1;
  const look = (d, depth) => {
    let ents = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isFile() && /\.exe$/i.test(e.name) && !SKIP_EXE.test(e.name)) { try { const s = fs.statSync(p).size; if (s > size) { size = s; best = p; } } catch {} }
      else if (e.isDirectory() && depth < 1 && /^(bin|bin64|binaries|win64|x64|game|content)$/i.test(e.name)) look(p, depth + 1);
    }
  };
  look(dir, 0);
  return best;
}
const SEP = path.sep, PB = p => path.basename(p.replace(/[\\/]+/g, SEP));
const isDir = p => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const clean = s => String(s || '').replace(/[™®]/g, '').replace(/\s+/g, ' ').trim();

const reg = args => new Promise(res => cp.execFile('reg', ['query', ...args], { windowsHide: true, maxBuffer: 64e6 }, (e, out) => res(e ? '' : out)));
// Saida do "reg query /s": blocos que comecam em HKEY_..., com linhas "    Nome    REG_SZ    valor"
function regBlocks(out) {
  const blocks = []; let cur = null;
  for (const raw of out.split(/\r?\n/)) {
    if (/^HKEY_/i.test(raw)) { cur = { key: raw.trim(), v: {} }; blocks.push(cur); continue; }
    const m = cur && raw.match(/^\s+(.+?)\s+REG_(?:EXPAND_)?SZ\s+(.*)$/);
    if (m) cur.v[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return blocks;
}

// Procura arquivos .item (manifestos) em varias pastas do Epic, para funcionar tambem no launcher novo (Preview)
function epicItems() {
  const roots = [];
  const pd = process.env.ProgramData || 'C:\\ProgramData';
  roots.push(process.env.RG_EPIC || path.join(pd, 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests'));
  for (const b of [path.join(pd, 'Epic'), path.join(process.env.LOCALAPPDATA || '', 'EpicGamesLauncher'), path.join(process.env.LOCALAPPDATA || '', 'Epic'), path.join(process.env.APPDATA || '', 'Epic')]) if (b && isDir(b)) roots.push(b);
  const found = [], seen = new Set();
  const walk = (d, depth) => {
    if (seen.has(d) || depth > 5) return; seen.add(d);
    let ents = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) { const p = path.join(d, e.name); if (e.isFile() && /\.item$/i.test(e.name)) found.push(p); else if (e.isDirectory() && !/^(webcache|logs|cache|crashes|blobs)/i.test(e.name)) walk(p, depth + 1); }
  };
  for (const r of roots) walk(r, 0);
  return found;
}
// Pastas de instalacao dos jogos da Epic: .egstore dentro da pasta do jogo (existe nos dois launchers)
function epicDirs() {
  const bases = new Set();
  for (let c = 67; c <= 90; c++) { const d = String.fromCharCode(c) + ':\\'; for (const n of ['Epic Games', 'Program Files\\Epic Games', 'Program Files (x86)\\Epic Games', 'Games\\Epic Games', 'Games\\Epic', 'Jogos\\Epic Games']) { const p = d + n; if (isDir(p)) bases.add(p); } }
  // pastas extras citadas nos .ini do launcher
  for (const ini of [path.join(process.env.LOCALAPPDATA || '', 'EpicGamesLauncher', 'Saved', 'Config', 'Windows', 'GameUserSettings.ini'), path.join(process.env.LOCALAPPDATA || '', 'EpicGamesLauncher', 'Saved', 'Config', 'Windows', 'Engine.ini')]) {
    try { for (const m of fs.readFileSync(ini, 'utf8').matchAll(/^[^=\r\n]*(?:InstallLocation|InstallDir|InstallPath)[^=\r\n]*=\s*"?([^"\r\n]+)"?/gim)) if (isDir(m[1].trim())) bases.add(m[1].trim()); } catch {}
  }
  return [...bases];
}
function epic() {
  const out = [], keys = new Set();
  for (const f of epicItems()) {
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (!j.DisplayName || !j.InstallLocation || j.bIsIncompleteInstall) continue;
      if (Array.isArray(j.AppCategories) && j.AppCategories.length && !j.AppCategories.includes('games')) continue;
      if (!isDir(j.InstallLocation)) continue;
      let exe = j.LaunchExecutable ? path.join(j.InstallLocation, j.LaunchExecutable) : '';
      if (!exe || !fs.existsSync(exe)) exe = guessExe(j.InstallLocation);
      const id = [j.CatalogNamespace, j.CatalogItemId, j.AppName].filter(Boolean).map(encodeURIComponent).join('%3A');
      const key = 'epic:' + (j.AppName || j.DisplayName); if (keys.has(key)) continue; keys.add(key);
      out.push({ launcher: 'Epic Games', key, name: clean(j.DisplayName), exe, uri: j.AppName ? `com.epicgames.launcher://apps/${id}?action=launch&silent=true` : '' });
    } catch {}
  }
  // LauncherInstalled.dat: lista de jogos instalados que o launcher mantem (formato usado por varias ferramentas)
  for (const f of [path.join(process.env.ProgramData || 'C:\\ProgramData', 'Epic', 'UnrealEngineLauncher', 'LauncherInstalled.dat'), path.join(process.env.ProgramData || 'C:\\ProgramData', 'Epic', 'EpicGamesLauncher', 'LauncherInstalled.dat')]) {
    try {
      for (const it of (JSON.parse(fs.readFileSync(f, 'utf8')).InstallationList || [])) {
        const loc = it.InstallLocation; if (!loc || !isDir(loc) || /^UE_/i.test(it.AppName || '')) continue;
        const key = 'epic:' + (it.AppName || PB(loc)); if (keys.has(key)) continue; keys.add(key);
        const exe = guessExe(loc); if (!exe) continue;
        const id = [it.NamespaceId, it.ItemId, it.AppName].filter(Boolean).map(encodeURIComponent).join('%3A');
        out.push({ launcher: 'Epic Games', key, name: clean(PB(loc)), exe, uri: it.AppName ? `com.epicgames.launcher://apps/${id}?action=launch&silent=true` : '' });
      }
    } catch {}
  }
  // Reserva: le direto as pastas dos jogos (.egstore/*.mancpn), sem depender dos manifestos do launcher
  const have = new Set(out.map(o => o.name.toLowerCase()));
  for (const base of epicDirs()) {
    let ents = []; try { ents = fs.readdirSync(base, { withFileTypes: true }); } catch { continue; }
    for (const e of ents) {
      if (!e.isDirectory() || /^(launcher|directxredist|epic online services|epicgameslauncher)$/i.test(e.name)) continue;
      const dir = path.join(base, e.name), st = path.join(dir, '.egstore');
      if (!isDir(st)) continue;
      let app = '', ns = '', cat = '';
      try { for (const m of fs.readdirSync(st)) if (/\.mancpn$/i.test(m)) { const j = JSON.parse(fs.readFileSync(path.join(st, m), 'utf8')); app = j.AppName || app; ns = j.CatalogNamespace || ns; cat = j.CatalogItemId || cat; } } catch {}
      const key = 'epic:' + (app || e.name); if (keys.has(key) || have.has(clean(e.name).toLowerCase())) continue; keys.add(key);
      const exe = guessExe(dir); if (!exe) continue;
      const id = [ns, cat, app].filter(Boolean).map(encodeURIComponent).join('%3A');
      out.push({ launcher: 'Epic Games', key, name: clean(e.name), exe, uri: app ? `com.epicgames.launcher://apps/${id}?action=launch&silent=true` : '' });
    }
  }
  if (!out.length) epicDiag();
  return out;
}
// Quando nada e encontrado, grava um relatorio das pastas da Epic para eu conseguir ajustar a deteccao
function epicDiag() {
  const f = process.env.RG_DIAG; if (!f) return;
  const L = [], pd = process.env.ProgramData || 'C:\\ProgramData';
  const tree = (d, depth, ind) => { let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { L.push(ind + '(nao consegui ler)'); return; } for (const e of es.slice(0, 60)) { L.push(ind + e.name + (e.isDirectory() ? '\\' : '')); if (e.isDirectory() && depth < 3 && !/^(webcache|logs|cache|blobs|crashes)/i.test(e.name)) tree(path.join(d, e.name), depth + 1, ind + '  '); } };
  for (const d of [path.join(pd, 'Epic'), path.join(process.env.LOCALAPPDATA || '', 'EpicGamesLauncher'), path.join(process.env.APPDATA || '', 'Epic')]) { L.push('== ' + d + (isDir(d) ? '' : ' (nao existe)')); if (isDir(d)) tree(d, 0, '  '); }
  L.push('== pastas de jogos Epic encontradas: ' + JSON.stringify(epicDirs()));
  for (const k of ['HKLM\\SOFTWARE\\WOW6432Node\\Epic Games', 'HKCU\\SOFTWARE\\Epic Games']) { try { L.push('== reg ' + k + '\n' + cp.execFileSync('reg', ['query', k, '/s'], { windowsHide: true, timeout: 8000 }).toString().slice(0, 1500)); } catch { L.push('== reg ' + k + ' (nao existe)'); } }
  try { fs.writeFileSync(f, L.join('\n')); } catch {}
}

// Biblioteca completa da Ubisoft (cache local do Ubisoft Connect: ownership + configurations, ambos protobuf)
function pbParse(b) {
  const out = []; let i = 0;
  const vi = () => { let r = 0, m = 1, c; do { c = b[i++]; if (c === undefined) throw new Error('eof'); r += (c & 127) * m; m *= 128; } while (c & 128); return r; };
  while (i < b.length) {
    const k = vi(), f = Math.floor(k / 8), w = k & 7; let v;
    if (w === 0) v = vi(); else if (w === 2) { const l = vi(); if (i + l > b.length) throw new Error('len'); v = b.subarray(i, i + l); i += l; } else if (w === 5) { v = b.subarray(i, i + 4); i += 4; } else if (w === 1) { v = b.subarray(i, i + 8); i += 8; } else throw new Error('wire');
    out.push([f, v]);
  }
  return out;
}
function ubiName(y) {
  const g = re => (y.match(re) || [])[1];
  let n = (g(/^  name:\s*"?(.*?)"?\s*$/m) || '').trim();
  if (n && /^[A-Za-z_0-9]+$/.test(n) && /localizations/.test(y)) { const m = y.match(new RegExp('^\\s+' + n.replace(/[^\w]/g, '') + ':\\s*"?(.*?)"?\\s*$', 'm')); if (m) n = m[1]; }
  return n.replace(/^'(.*)'$/, '$1');
}
async function ubisoftLibrary() {
  const base = process.env.RG_UBI_DIR || path.join(process.env.LOCALAPPDATA || '', 'Ubisoft Game Launcher', 'cache');
  const od = path.join(base, 'ownership'), cf = path.join(base, 'configuration', 'configurations');
  if (!isDir(od) || !fs.existsSync(cf)) return [];
  const files = fs.readdirSync(od).map(f => path.join(od, f)).filter(f => fs.statSync(f).isFile()).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (!files.length) return [];
  const own = fs.readFileSync(files[0]), cfg = new Map();
  for (const [f, v] of pbParse(fs.readFileSync(cf))) { if (f !== 1 || typeof v === 'number') continue; try { const m = new Map(pbParse(v)); cfg.set(m.get(1), Buffer.from(m.get(3) || []).toString('utf8')); } catch {} }
  let items; for (const off of [260, 4 + (own.readUInt32BE(0) || 0), 0]) { try { items = pbParse(own.subarray(off)); if (items.length) break; } catch { items = null; } }
  if (!items) return [];
  const out = [], seen = new Map(), skip = /\b(demo|trial|beta|test)\b/i;
  for (const [f, v] of items) {
    if (f !== 1 || typeof v === 'number') continue;
    let m; try { m = new Map(pbParse(v)); } catch { continue; }
    const id = m.get(1); if (!id || (m.get(6) || 0) !== 0) continue;
    const y = cfg.get(id) || ''; if (!y || (y.length < 300 && /is_visible:\s*no/.test(y))) continue;
    const name = clean(ubiName(y)); if (!name || skip.test(name)) continue;
    const th = (y.match(/^\s*thumb_image:\s*(\S+)/m) || [])[1];
    const item = { launcher: 'Ubisoft Connect', key: 'ubi:' + id, name, exe: '', uri: `uplay://launch/${id}/0`, owned: true, installed: false, cover: th && /^[\w.]+$/.test(th) ? 'https://static3.cdn.ubi.com/orbit/uplay_launcher_3_0/assets/' + th : '', genres: [] };
    const nk = name.toLowerCase().replace(/[^a-z0-9]/g, ''); if (seen.has(nk)) { const p = seen.get(nk); (p.alt = p.alt || []).push(item.key); continue; } seen.set(nk, item); out.push(item);
  }
  return out;
}

async function ubisoft() {
  const out = [];
  const txt = process.env.RG_UBI_TEXT !== undefined ? process.env.RG_UBI_TEXT : await reg(['HKLM\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs', '/s']);
  for (const b of regBlocks(txt)) {
    const dir = (b.v['installdir'] || '').replace(/\//g, SEP).replace(/[\\/]+$/, ''), id = b.key.split('\\').pop();
    if (!dir || !/^\d+$/.test(id) || !isDir(dir)) continue;
    out.push({ launcher: 'Ubisoft Connect', key: 'ubi:' + id, name: clean(PB(dir)), exe: guessExe(dir), uri: `uplay://launch/${id}/0`, installed: true });
  }
  try {
    const nm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const l of await ubisoftLibrary()) { const i = out.find(o => o.key === l.key || (l.alt || []).includes(o.key) || nm(o.name) === nm(l.name)); if (i) { if (!i.cover) i.cover = l.cover; } else out.push(l); }
  } catch (e) { out.err = e.message; }
  return out;
}

async function ea() {
  const out = [], seen = new Set();
  const add = (name, dir) => {
    name = clean(name); if (!name || !dir || !isDir(dir) || seen.has(name.toLowerCase())) return;
    seen.add(name.toLowerCase()); out.push({ launcher: 'EA app', key: 'ea:' + name, name, exe: guessExe(dir), uri: '' });
  };
  for (const root of ['HKLM\\SOFTWARE\\WOW6432Node\\EA Games', 'HKLM\\SOFTWARE\\WOW6432Node\\Electronic Arts']) {
    const txt = process.env.RG_EA_TEXT !== undefined ? process.env.RG_EA_TEXT : await reg([root, '/s']);
    for (const b of regBlocks(txt)) {
      const title = b.key.split('\\').pop(), dir = (b.v['install dir'] || b.v['installdir'] || '').replace(/\//g, SEP).replace(/[\\/]+$/, '');
      if (/^(ea core|ea desktop|origin|ea games|electronic arts)$/i.test(title)) continue;
      add(title, dir);
    }
  }
  // pastas padrao de instalacao do app da EA / Origin
  for (const base of (process.env.RG_EA_DIRS ? process.env.RG_EA_DIRS.split(';') : ['C:\\Program Files\\EA Games', 'C:\\Program Files (x86)\\EA Games', 'C:\\Program Files (x86)\\Origin Games'])) {
    let ents = []; try { ents = fs.readdirSync(base, { withFileTypes: true }); } catch {}
    for (const e of ents) if (e.isDirectory()) add(e.name, path.join(base, e.name));
  }
  return out;
}

async function battlenet() {
  const out = [];
  const roots = ['HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall', 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall', 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'];
  for (const r of roots) {
    const txt = process.env.RG_BNET_TEXT !== undefined ? process.env.RG_BNET_TEXT : await reg([r, '/s']);
    for (const b of regBlocks(txt)) {
      const name = b.v['displayname'] || '', pub = b.v['publisher'] || '';
      if (!/blizzard/i.test(pub) || /battle\.net/i.test(name) || !name) continue;
      const dir = (b.v['installlocation'] || '').replace(/\//g, SEP).replace(/[\\/]+$/, '');
      if (!dir || !isDir(dir)) continue;
      let exe = (b.v['displayicon'] || '').replace(/^"|"$/g, '').replace(/,\d+$/, '');
      if (!/\.exe$/i.test(exe) || !fs.existsSync(exe) || SKIP_EXE.test(path.basename(exe))) exe = guessExe(dir);
      if (!out.some(x => x.key === 'bnet:' + name)) out.push({ launcher: 'Battle.net', key: 'bnet:' + name, name: clean(name), exe, uri: '' });
    }
  }
  return out;
}

// Game Pass (app Xbox): jogos ficam em <unidade>:\XboxGames\<Jogo>\Content. Se o Windows informar o pacote, abre pelo AppsFolder.
function psPackages() {
  return new Promise(res => {
    if (process.platform !== 'win32') return res([]);
    const cmd = "Get-AppxPackage | Where-Object { $_.InstallLocation -like '*\\XboxGames\\*' } | ForEach-Object { $id=''; try { $m=[xml](Get-Content -Raw (Join-Path $_.InstallLocation 'AppxManifest.xml')); $id=@($m.Package.Applications.Application)[0].Id } catch {}; [pscustomobject]@{ loc=$_.InstallLocation; pfn=$_.PackageFamilyName; id=$id } } | ConvertTo-Json -Compress";
    cp.execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { windowsHide: true, timeout: 25000, maxBuffer: 8e6 }, (e, o) => {
      if (e || !o.trim()) return res([]);
      try { const j = JSON.parse(o); res(Array.isArray(j) ? j : [j]); } catch { res([]); }
    });
  });
}
async function gamepass() {
  const out = [], roots = [];
  if (process.env.RG_XBOX) roots.push(...process.env.RG_XBOX.split(';'));
  else for (let c = 67; c <= 90; c++) roots.push(String.fromCharCode(c) + ':\\XboxGames');
  const present = roots.filter(isDir); if (!present.length) return out;
  const pk = process.env.RG_XBOX ? [] : await psPackages();
  for (const root of present) {
    let ents = []; try { ents = fs.readdirSync(root, { withFileTypes: true }); } catch {}
    for (const e of ents) {
      if (!e.isDirectory() || /^gamesave$/i.test(e.name)) continue;
      const dir = path.join(root, e.name), content = isDir(path.join(dir, 'Content')) ? path.join(dir, 'Content') : dir;
      const p = pk.find(x => x.loc && x.loc.toLowerCase().startsWith(dir.toLowerCase()));
      out.push({ launcher: 'Game Pass', key: 'xbox:' + e.name, name: clean(e.name), exe: guessExe(content), uri: p && p.pfn && p.id ? `shell:AppsFolder\\${p.pfn}!${p.id}` : '' });
    }
  }
  return out;
}

async function gog() {
  const out = [], txt = process.env.RG_GOG_TEXT !== undefined ? process.env.RG_GOG_TEXT : await reg(['HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games', '/s']);
  for (const b of regBlocks(txt)) {
    const id = b.key.split('\\').pop(), name = b.v['gamename'], dir = (b.v['path'] || '').replace(/\//g, SEP).replace(/[\\/]+$/, '');
    if (!/^\d+$/.test(id) || !name || !dir || !isDir(dir)) continue;
    let exe = (b.v['exe'] || '').replace(/\//g, SEP); if (!exe || !fs.existsSync(exe)) exe = guessExe(dir);
    out.push({ launcher: 'GOG', key: 'gog:' + id, name: clean(name), exe, uri: '', installed: true });
  }
  try {
    const nm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const l of await gogLibrary()) { const i = out.find(o => o.key === l.key || nm(o.name) === nm(l.name)); if (i) Object.assign(i, { minutes: l.minutes, last: l.last, cover: l.cover, genres: l.genres, year: l.year }); else out.push(l); }
  } catch (e) { out.err = e.message; }
  return out;
}

// Biblioteca completa do GOG (instalada ou nao), lida do banco local do GOG Galaxy
let _sql = null;
async function sqlOpen(file) {
  if (!_sql) { const init = require('sql.js'); _sql = await init({ wasmBinary: fs.readFileSync(require.resolve('sql.js/dist/sql-wasm.wasm')) }); }
  return new _sql.Database(fs.readFileSync(file));
}
async function gogLibrary() {
  const file = process.env.RG_GOG_DB || path.join(process.env.ProgramData || 'C:\\ProgramData', 'GOG.com', 'Galaxy', 'storage', 'galaxy-2.0.db');
  if (!fs.existsSync(file)) return [];
  const db = await sqlOpen(file), all = (q) => { const r = db.exec(q); return r.length ? r[0].values : []; }, out = [];
  try {
    const hid = new Set(all("SELECT releaseKey FROM UserReleaseProperties WHERE isHidden=1").map(r => r[0]));
    const mins = {}; for (const [k, m] of all("SELECT releaseKey,minutesInGame FROM GameTimes WHERE releaseKey LIKE 'gog\\_%' ESCAPE '\\'")) mins[k] = m || 0;
    const last = {}; for (const [k, d] of all("SELECT gameReleaseKey,lastPlayedDate FROM LastPlayedDates WHERE gameReleaseKey LIKE 'gog\\_%' ESCAPE '\\'")) { const t = Date.parse(String(d).replace(' ', 'T') + 'Z'); if (t) last[k] = Math.floor(t / 1000); }
    const pc = {};
    for (const [k, t, v] of all("SELECT releaseKey,gamePieceTypeId,value FROM GamePieces WHERE releaseKey LIKE 'gog\\_%' ESCAPE '\\' AND gamePieceTypeId IN (708,1114,1115)")) { try { (pc[k] = pc[k] || {})[t] = JSON.parse(v); } catch {} }
    const skip = /game overlay|welcome gift|digital goodies|soundtrack|artbook|wallpaper|manual$/i, byName = new Map();
    for (const [k, p] of Object.entries(pc)) {
      if (hid.has(k) || !p[708] || !p[708].title) continue;
      const name = clean(String(p[708].title).replace(/\s*-?\s*Amazon Prime$/i, '').trim());
      if (!name || skip.test(name)) continue;
      const id = k.slice(4), item = { launcher: 'GOG', key: 'gog:' + id, name, exe: '', uri: '', owned: true, installed: false, minutes: mins[k] || 0, last: last[k] || 0, cover: (p[1114] && p[1114].verticalCover) || '', genres: (p[1115] && p[1115].genres) || [], year: p[1115] && p[1115].releaseDate ? new Date(p[1115].releaseDate * 1000).getUTCFullYear() : 0 };
      const nk = name.toLowerCase(), prev = byName.get(nk);
      if (prev) { prev.minutes = Math.max(prev.minutes, item.minutes); prev.last = Math.max(prev.last, item.last); prev.cover = prev.cover || item.cover; if (!prev.genres.length) prev.genres = item.genres; continue; }
      byName.set(nk, item); out.push(item);
    }
  } finally { db.close(); }
  return out;
}

async function scanAll(only) {
  const res = {};
  for (const [n, f] of [['Epic Games', async () => epic()], ['GOG', gog], ['Ubisoft Connect', ubisoft], ['EA app', ea], ['Battle.net', battlenet], ['Game Pass', gamepass]]) {
    if (only && !only.includes(n)) continue;
    try { res[n] = await f(); } catch (e) { res[n] = []; res[n + '_err'] = e.message; }
  }
  return res;
}
module.exports = { NAMES, CATALOG, SIDE_DEF, scanAll, guessExe, regBlocks };
