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
// Novo launcher da Epic (beta "eglv2"): %LOCALAPPDATA%\com.epicgames.eglv2
//  - installations.jsonl: jogos instalados (ultimo registro de cada installationId)
//  - cache\prod\account\<conta>\library-cache.json: biblioteca da conta; catalog-cache.json: nomes, categorias e capas
//  - playtime-cache.json: tempo de jogo (segundos) por appName
function epicV2(opt = {}) {
  const base = process.env.RG_EGL2 || path.join(process.env.LOCALAPPDATA || '', 'com.epicgames.eglv2');
  if (!isDir(base)) return [];
  const rd = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
  const cat = ((rd(path.join(base, 'cache', 'prod', 'catalog-cache.json')) || {}).items) || {};
  const uriOf = (ns, item, app) => app ? `com.epicgames.launcher://apps/${[ns, item, app].filter(Boolean).map(encodeURIComponent).join('%3A')}?action=launch&silent=true` : '';
  const cover = it => { const k = (it && it.keyImages) || []; const t = k.find(x => x.type === 'DieselGameBoxTall') || k.find(x => x.type === 'OfferImageTall'); return t && /^https:/.test(t.url || '') ? t.url : ''; };
  let lib = [], play = {};
  const accRoot = path.join(base, 'cache', 'prod', 'account');
  try {
    const accs = fs.readdirSync(accRoot).map(a => path.join(accRoot, a)).filter(isDir).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    if (accs[0]) { lib = ((rd(path.join(accs[0], 'library-cache.json')) || {}).items) || []; for (const p of ((rd(path.join(accs[0], 'playtime-cache.json')) || {}).items) || []) if (p.artifactId) play[p.artifactId] = Math.round((+p.totalTime || 0) / 60); }
  } catch {}
  const titleOf = (itemId, app) => { const l = lib.find(x => x.appId && (x.appId.itemId === itemId || x.appId.appName === app)); return (l && l.title) || ((cat[itemId] || {}).item || {}).title || ''; };
  // instalados
  const inst = new Map();
  try { for (const line of fs.readFileSync(path.join(base, 'installations.jsonl'), 'utf8').split(/\r?\n/)) { if (!line.trim()) continue; try { const j = JSON.parse(line); if (j.installationId) inst.set(j.installationId, j); } catch {} } } catch {}
  const out = [], keys = new Set();
  for (const j of inst.values()) {
    if (!j.complete || !j.dir || !isDir(j.dir)) continue;
    const app = j.artifactId || PB(j.dir), key = 'epic:' + app; if (keys.has(key)) continue; keys.add(key);
    let exe = j.launchExecutable ? path.join(j.dir, j.launchExecutable) : ''; if (!exe || !fs.existsSync(exe)) exe = guessExe(j.dir);
    const it = (cat[j.itemId] || {}).item;
    out.push({ launcher: 'Epic Games', key, name: clean(titleOf(j.itemId, app) || PB(j.dir)), exe, uri: uriOf(j.namespace, j.itemId, app), installed: true, minutes: play[app] || 0, cover: cover(it) });
  }
  if (opt.light) return out;
  // biblioteca (instalada ou nao)
  for (const l of lib) {
    const a = l.appId || {}; if (l.owned === false || !a.appName) continue;
    const key = 'epic:' + a.appName; if (keys.has(key)) continue;
    const it = (cat[a.itemId] || {}).item; if (!it) continue;
    const cats = (it.categories || []).map(c => c.path);
    if (!cats.includes('games') || it.mainGameItem || /^ue$/i.test(a.namespaceId || '')) continue;
    const name = clean(l.title || it.title); if (!name) continue;
    keys.add(key);
    out.push({ launcher: 'Epic Games', key, name, exe: '', uri: uriOf(a.namespaceId, a.itemId, a.appName), owned: true, installed: false, minutes: play[a.appName] || 0, cover: cover(it), genres: [] });
  }
  return out;
}

function epic(opt = {}) {
  const out = [], keys = new Set();
  for (const v of epicV2(opt)) { keys.add(v.key); out.push(v); }
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

async function ubisoft(opt = {}) {
  const out = [];
  const txt = process.env.RG_UBI_TEXT !== undefined ? process.env.RG_UBI_TEXT : await reg(['HKLM\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs', '/s']);
  for (const b of regBlocks(txt)) {
    const dir = (b.v['installdir'] || '').replace(/\//g, SEP).replace(/[\\/]+$/, ''), id = b.key.split('\\').pop();
    if (!dir || !/^\d+$/.test(id) || !isDir(dir)) continue;
    out.push({ launcher: 'Ubisoft Connect', key: 'ubi:' + id, name: clean(PB(dir)), exe: guessExe(dir), uri: `uplay://launch/${id}/0`, installed: true });
  }
  try {
    const nm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const l of (opt.light ? [] : await ubisoftLibrary())) { const i = out.find(o => o.key === l.key || (l.alt || []).includes(o.key) || nm(o.name) === nm(l.name)); if (i) { if (!i.cover) i.cover = l.cover; } else out.push(l); }
  } catch (e) { out.err = e.message; }
  return out;
}

// Biblioteca completa do EA app: le os caches criptografados do proprio app (CATS2 = catalogo, NS = direitos da conta).
// Chave: SHA3-256 de (usuario + categoria + sufixo); IV: primeiros 16 bytes de SHA3-256(usuario + categoria); AES-256-CBC.
// O catalogo usa um usuario generico; o NS usa o id da conta (user_*.ini) e o hash do hardware deste PC (o mesmo que o app da EA calcula).
const EA_ALL = 'allUsersGenericId', EA_SUFFIX = 'l)%ge7fomILhfj*Qfi+,';
// SHA3-256 em JS puro (o Electron usa BoringSSL, que nao tem SHA3)
const KRC = [1n, 0x8082n, 0x800000000000808an, 0x8000000080008000n, 0x808bn, 0x80000001n, 0x8000000080008081n, 0x8000000000008009n, 0x8an, 0x88n, 0x80008009n, 0x8000000an, 0x8000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n, 0x8000000000008002n, 0x8000000000000080n, 0x800an, 0x800000008000000an, 0x8000000080008081n, 0x8000000000008080n, 0x80000001n, 0x8000000080008008n];
const KRO = [0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14], M64 = (1n << 64n) - 1n;
const rotl = (x, n) => n ? ((x << BigInt(n)) | (x >> BigInt(64 - n))) & M64 : x;
function keccakF(A) {
  for (let r = 0; r < 24; r++) {
    const C = [0, 1, 2, 3, 4].map(x => A[x] ^ A[x + 5] ^ A[x + 10] ^ A[x + 15] ^ A[x + 20]);
    for (let x = 0; x < 5; x++) { const D = C[(x + 4) % 5] ^ rotl(C[(x + 1) % 5], 1); for (let y = 0; y < 25; y += 5) A[x + y] ^= D; }
    const B = new Array(25);
    for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) B[y + 5 * ((2 * x + 3 * y) % 5)] = rotl(A[x + 5 * y], KRO[x + 5 * y]);
    for (let x = 0; x < 5; x++) for (let y = 0; y < 25; y += 5) A[x + y] = B[x + y] ^ ((~B[(x + 1) % 5 + y] & M64) & B[(x + 2) % 5 + y]);
    A[0] ^= KRC[r];
  }
}
function sha3(s) {
  const rate = 136, msg = Buffer.from(s, 'ascii'), len = Math.ceil((msg.length + 1) / rate) * rate, p = Buffer.alloc(len);
  msg.copy(p); p[msg.length] ^= 0x06; p[len - 1] ^= 0x80;
  const A = new Array(25).fill(0n);
  for (let o = 0; o < len; o += rate) { for (let i = 0; i < rate / 8; i++) A[i] ^= p.readBigUInt64LE(o + i * 8); keccakF(A); }
  const out = Buffer.alloc(32); for (let i = 0; i < 4; i++) out.writeBigUInt64LE(A[i], i * 8); return out;
}
function eaDecrypt(buf, user, cat, suffix) {
  const head = buf.subarray(0, 64).toString('ascii'), enc = buf.subarray(64);
  if (!/^[a-f0-9]{64}$/i.test(head) || !enc.length || enc.length % 16) throw new Error('formato');
  const d = require('crypto').createDecipheriv('aes-256-cbc', sha3(user + cat + suffix), sha3(user + cat).subarray(0, 16));
  return JSON.parse(Buffer.concat([d.update(enc), d.final()]).toString('utf8'));
}
const EA_HW_PS = "$ErrorActionPreference='Stop';function V($c,$p){[string]((Get-CimInstance -ClassName $c|Select-Object -First 1).$p)};$sd=if($env:SystemDrive){$env:SystemDrive}else{'C:'};$d=Get-CimInstance -ClassName Win32_LogicalDisk -Filter \"DeviceID='$sd'\"|Select-Object -First 1;$s=(V Win32_BaseBoard Manufacturer)+';'+(V Win32_BaseBoard SerialNumber)+';'+(V Win32_BIOS Manufacturer)+';'+(V Win32_BIOS SerialNumber)+';'+([string]$d.VolumeSerialNumber).Replace('-','')+';'+(V Win32_VideoController PNPDeviceID)+';'+(V Win32_Processor Manufacturer)+';'+(V Win32_Processor ProcessorId)+';'+(V Win32_Processor Name)+';';$h=[Security.Cryptography.SHA1]::Create().ComputeHash([Text.Encoding]::ASCII.GetBytes($s));[Console]::Write(([BitConverter]::ToString($h)).Replace('-','').ToLower())";
let eaHw = null;
const eaHardware = () => process.env.RG_EA_HW ? Promise.resolve(process.env.RG_EA_HW) : eaHw || (eaHw = new Promise(res => cp.execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(EA_HW_PS, 'utf16le').toString('base64')], { windowsHide: true, timeout: 20000, maxBuffer: 1 << 16 }, (e, out) => { const h = String(out || '').trim().toLowerCase(); res(!e && /^[a-f0-9]{40}$/.test(h) ? h : ''); })));
async function eaLibrary() {
  const pd = process.env.RG_EA_PD || path.join(process.env.ProgramData || 'C:\\ProgramData', 'EA Desktop');
  const loc = process.env.RG_EA_LOCAL || path.join(process.env.LOCALAPPDATA || '', 'Electronic Arts', 'EA Desktop');
  let ids = new Set();
  try { for (const f of fs.readdirSync(loc)) if (/^user(?:_.+)?\.ini$/i.test(f)) { let t = fs.readFileSync(path.join(loc, f)); t = t[0] === 0xff && t[1] === 0xfe ? t.subarray(2).toString('utf16le') : t.toString('utf8'); for (const m of t.matchAll(/^\s*user\.userid\s*=\s*"?(\d{1,32})"?/gmi)) ids.add(m[1]); } } catch {}
  if (process.env.RG_EA_USER) ids = new Set([process.env.RG_EA_USER]);
  const ns = [...ids].map(u => [u, path.join(pd, sha3(u).toString('hex'), 'NS')]).filter(x => fs.existsSync(x[1]));
  if (!ns.length) return [];
  const cats = path.join(pd, sha3(EA_ALL).toString('hex'), 'CATS2');
  const cat = fs.existsSync(cats) ? (eaDecrypt(fs.readFileSync(cats), EA_ALL, 'CATS2', EA_SUFFIX).data || {}) : {};
  const hw = await eaHardware(); if (!hw) throw new Error('EA app: não consegui ler a identificação do hardware deste PC.');
  const now = Date.now(), groups = new Map();
  for (const [u, f] of ns) {
    let store; try { store = eaDecrypt(fs.readFileSync(f), u, 'NS', hw); } catch { throw new Error('EA app: não consegui abrir a lista de jogos da conta (abra o EA app logado e tente de novo).'); }
    for (const e of store.entitlements || []) {
      if (Number(e.status) !== 1 || e.isEntitledFromSubscription === true) continue;
      const t = e.terminationDate; if (t !== undefined && t !== null && t !== '' && /^\d+$/.test(String(t)) && +t > 0) { const ms = +t < 1e10 ? +t * 1000 : +t; if (ms < 8.64e15 && ms <= now) continue; }
      const c = cat[e.offerId]; if (!c) continue;
      const d = c.catalogDef || {}, ci = c.catalogIds || {};
      if (d.isBaseGame !== true || d.isPDLC === true || d.isPULC === true || d.isFreeTrial === true || d.isTimedTrial === true || Number(d.itemSubType) !== 0 || !ci.softwareId) continue;
      const mt = String(ci.masterTitleId || ''), title = clean(d.gameTitle || d.displayName || d.unmaskedDisplayName || '');
      if (!/^\d+$/.test(mt) || !title || groups.has(mt)) continue;
      groups.set(mt, { launcher: 'EA app', key: 'ea:' + title, eaid: mt, name: title, exe: '', uri: e.offerId ? 'origin2://game/launch?offerIds=' + encodeURIComponent(e.offerId) : '', owned: true, installed: false, cover: '', genres: [] });
    }
  }
  return [...groups.values()];
}

async function ea(opt = {}) {
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
  for (const o of out) o.installed = true;
  try {
    const nm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const l of (opt.light ? [] : await eaLibrary())) { const i = out.find(o => nm(o.name) === nm(l.name)); if (!i) out.push(l); else if (!i.uri) i.uri = ''; }
  } catch (e) { out.err = e.message; }
  return out;
}

// Biblioteca completa da Battle.net: o app grava nos logs os produtos "retail" ligados a conta (ciclo GameProvider)
// e guarda o catalogo (nomes) em %LOCALAPPDATA%\Battle.net\Cache\xx\yy\<hash>. Produtos so do Game Pass ficam de fora.
async function battlenetLibrary() {
  const base = process.env.RG_BNET_LOCAL || path.join(process.env.LOCALAPPDATA || '', 'Battle.net');
  const logs = path.join(base, 'Logs'), cache = path.join(base, 'Cache');
  let files = []; try { files = fs.readdirSync(logs).filter(f => /^battle\.net-.*\.log$/i.test(f)).map(f => path.join(logs, f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs).slice(0, 8); } catch { return []; }
  const S = 'Beginning GameProvider initialization.', E = 'Game provider is now initialized';
  let codes = null, hash = null;
  for (const f of files) {
    let t; try { t = fs.readFileSync(f, 'utf8'); } catch { continue; }
    const st = t.lastIndexOf(S); if (st < 0) continue; const en = t.indexOf(E, st); if (en < 0) continue;
    const cyc = t.slice(st, en), pre = t.slice(0, st), set = new Set();
    for (const m of cyc.matchAll(/Binding account info to available unbound entity\.\s+productCode=([a-z0-9]+)_retail\b[^\r\n]*accountInfo=\[[^\]\r\n]*:retail\]/gi)) set.add(m[1].toUpperCase());
    for (const m of cyc.matchAll(/Inserting new bound entity because no suitable match was found\.\s+accountInfo=\[[^\]\r\n]*:retail\][^\r\n]*productId=([a-z0-9]+)\s+productType=retail\b/gi)) set.add(m[1].toUpperCase());
    const hs = [...pre.matchAll(/\[CatalogManager\][^\r\n]*\bhash=([a-f0-9]{32})\b/gi)], hc = [...pre.matchAll(/Context\((?:Local|Remote)CAS:\s*([a-f0-9]{32})\b/gi)];
    hash = ((hs.pop() || hc.pop() || [])[1] || '').toLowerCase(); codes = set; break;
  }
  if (!codes) throw new Error('Battle.net: abra o app da Battle.net (logado) uma vez para a lista de jogos aparecer.');
  if (!codes.size || !hash) return [];
  const obj = h => { h = String(h || '').toLowerCase(); if (!/^[a-f0-9]{32}$/.test(h)) return null; try { return JSON.parse(fs.readFileSync(path.join(cache, h.slice(0, 2), h.slice(2, 4), h), 'utf8')); } catch { return null; } };
  const root = obj(hash); if (!root || !Array.isArray(root.fragments)) return [];
  const virt = new Set();
  for (const r of root.fragments) if (/_gamepass$/i.test(r.name || '')) for (const p of (obj(r.hash) || {}).products || []) { const c = String(p.id || p.uid || '').toUpperCase(); if (c) virt.add(c); }
  const want = [...codes].filter(c => !virt.has(c)), names = new Map();
  for (const r of root.fragments) {
    if (/_gamepass$/i.test(r.name || '') || want.every(c => names.has(c))) continue;
    const fr = obj(r.hash); if (!fr) continue;
    for (const p of fr.products || []) { const c = String(p.id || '').toUpperCase(), n = ((fr.strings || {}).default || {})[(p.base || {}).name]; if (want.includes(c) && n && !names.has(c)) names.set(c, clean(n)); }
  }
  return want.filter(c => names.has(c)).map(c => ({ launcher: 'Battle.net', key: 'bnet:' + names.get(c), bnet: c, name: names.get(c), exe: '', uri: 'battlenet://' + c, owned: true, installed: false, cover: '', genres: [] }));
}

async function battlenet(opt = {}) {
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
      if (!out.some(x => x.key === 'bnet:' + name)) out.push({ launcher: 'Battle.net', key: 'bnet:' + name, name: clean(name), exe, uri: '', installed: true });
    }
  }
  try {
    const nm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const l of (opt.light ? [] : await battlenetLibrary())) if (!out.some(o => nm(o.name) === nm(l.name))) out.push(l);
  } catch (e) { out.err = e.message; }
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

async function gog(opt = {}) {
  const out = [], txt = process.env.RG_GOG_TEXT !== undefined ? process.env.RG_GOG_TEXT : await reg(['HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games', '/s']);
  for (const b of regBlocks(txt)) {
    const id = b.key.split('\\').pop(), name = b.v['gamename'], dir = (b.v['path'] || '').replace(/\//g, SEP).replace(/[\\/]+$/, '');
    if (!/^\d+$/.test(id) || !name || !dir || !isDir(dir)) continue;
    let exe = (b.v['exe'] || '').replace(/\//g, SEP); if (!exe || !fs.existsSync(exe)) exe = guessExe(dir);
    out.push({ launcher: 'GOG', key: 'gog:' + id, name: clean(name), exe, uri: '', installed: true });
  }
  try {
    const nm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const l of (opt.light ? [] : await gogLibrary())) { const i = out.find(o => o.key === l.key || nm(o.name) === nm(l.name)); if (i) Object.assign(i, { minutes: l.minutes, last: l.last, cover: l.cover, genres: l.genres, year: l.year }); else out.push(l); }
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

async function scanAll(only, opt = {}) {
  const res = {};
  for (const [n, f] of [['Epic Games', async o => epic(o)], ['GOG', gog], ['Ubisoft Connect', ubisoft], ['EA app', ea], ['Battle.net', battlenet], ['Game Pass', gamepass]]) {
    if (only && !only.includes(n)) continue;
    if (opt.light && n === 'Game Pass') continue;
    try { res[n] = await f(opt); } catch (e) { res[n] = []; res[n + '_err'] = e.message; }
  }
  return res;
}
module.exports = { NAMES, CATALOG, SIDE_DEF, scanAll, guessExe, regBlocks };
