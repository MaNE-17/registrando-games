// Biblioteca completa da Steam lida dos arquivos locais do cliente Steam, sem API e sem depender da privacidade do perfil.
//  - config/loginusers.vdf ............ contas que ja entraram neste PC (qual foi a ultima)
//  - userdata/<conta>/config/licensecache  licencas da conta (protobuf CMsgClientLicenseList, cifrado com XOR
//                                          pelo gerador "RandomStream" da Valve, semente = id da conta)
//  - appcache/packageinfo.vdf ......... pacote -> lista de appids (KeyValues binario)
//  - appcache/appinfo.vdf ............. appid -> nome e tipo (KeyValues binario; v41 usa tabela de strings)
//  - userdata/<conta>/config/localconfig.vdf  tempo de jogo (minutos) e ultima vez jogado de cada app
'use strict';
const fs = require('fs'), path = require('path');

// ---------- VDF texto ----------
function vdfText(src) {
  let i = 0; const n = src.length;
  const ws = () => { for (;;) { while (i < n && /\s/.test(src[i])) i++; if (src[i] === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; } break; } };
  const tok = () => {
    ws(); if (i >= n) return null;
    const c = src[i];
    if (c === '{' || c === '}') { i++; return c; }
    if (c === '"') { let s = ''; i++; while (i < n && src[i] !== '"') { if (src[i] === '\\' && i + 1 < n) { const e = src[++i]; s += e === 'n' ? '\n' : e === 't' ? '\t' : e; } else s += src[i]; i++; } i++; return { s }; }
    let s = ''; while (i < n && !/[\s{}"]/.test(src[i])) s += src[i++]; return { s };
  };
  const obj = () => {
    const o = {};
    for (;;) {
      const k = tok(); if (k === null || k === '}') return o;
      if (k === '{') continue;
      const v = tok(); if (v === null) return o;
      const key = k.s.toLowerCase();
      o[key] = v === '{' ? obj() : v === '}' ? '' : v.s;
      if (v === '}') return o;
    }
  };
  return obj();
}

// ---------- licensecache ----------
function randomStream(seed) {
  let idum = seed < 0 ? seed : -seed, iy = 0; const iv = new Array(32).fill(0);
  const IA = 16807, IM = 2147483647, IQ = 127773, IR = 2836, NDIV = 1 + Math.floor((IM - 1) / 32);
  const next = () => {
    let j, k;
    if (idum <= 0 || iy === 0) {
      idum = -idum < 1 ? 1 : -idum;
      for (j = 39; j >= 0; j--) { k = Math.floor(idum / IQ); idum = IA * (idum - k * IQ) - IR * k; if (idum < 0) idum += IM; if (j < 32) iv[j] = idum; }
      iy = iv[0];
    }
    k = Math.floor(idum / IQ); idum = IA * (idum - k * IQ) - IR * k; if (idum < 0) idum += IM;
    j = Math.floor(iy / NDIV); if (j >= 32 || j < 0) j = (j % 32) & 0x7fffffff;
    iy = iv[j]; iv[j] = idum; return iy;
  };
  const range = 126 - 32 + 1, maxOk = 0x7fffffff - ((0x7fffffff + 1) % range);
  return () => { let v; do { v = next(); } while (v > maxOk); return 32 + (v % range); };
}
function licenseXor(buf, accountId) { const r = randomStream(accountId | 0), out = Buffer.allocUnsafe(buf.length); for (let k = 0; k < buf.length; k++) out[k] = buf[k] ^ r(); return out; }
function pb(buf, s = 0, e = buf.length) {
  const out = []; let i = s;
  const vi = () => { let r = 0n, sh = 0n; for (let k = 0; k < 10; k++) { if (i >= e) throw new Error('pb'); const b = buf[i++]; r |= BigInt(b & 127) << sh; if (!(b & 128)) return r; sh += 7n; } throw new Error('pb'); };
  while (i < e) {
    const t = vi(), f = Number(t >> 3n), w = Number(t & 7n);
    if (w === 0) out.push([f, vi()]);
    else if (w === 2) { const l = Number(vi()); if (i + l > e) throw new Error('pb'); out.push([f, [i, i + l]]); i += l; }
    else if (w === 5) { if (i + 4 > e) throw new Error('pb'); out.push([f, buf.readUInt32LE(i)]); i += 4; }
    else if (w === 1) { if (i + 8 > e) throw new Error('pb'); i += 8; }
    else throw new Error('pb');
  }
  return out;
}
const BAD_FLAGS = 2 | 4 | 8 | 16 | 32 | 1024 | 2048 | 8192 | 16384 | 262144 | 524288;
function readLicenses(file, accountId) {
  const raw = fs.readFileSync(file); if (raw.length < 5) return [];
  const dec = licenseXor(raw, accountId), body = dec.subarray(0, dec.length - 4), pkgs = [];
  for (const [f, v] of pb(body)) {
    if (f !== 2 || !Array.isArray(v)) continue;
    let pkg = 0, flags = 0, owner = 0, lim = 0, used = 0;
    for (const [g, x] of pb(body, v[0], v[1])) {
      if (g === 1) pkg = Number(BigInt.asUintN(32, x)); else if (g === 7) flags = Number(BigInt.asUintN(32, x)); else if (g === 12) owner = Number(BigInt.asUintN(32, x));
      else if (g === 4) lim = Number(BigInt.asIntN(32, x)); else if (g === 5) used = Number(BigInt.asIntN(32, x));
    }
    if (owner === accountId && !(flags & BAD_FLAGS) && !(lim > 0 && used >= lim)) pkgs.push(pkg);
  }
  return pkgs;
}

// ---------- KeyValues binario ----------
function kvBin(buf, st, stringTable) {
  let end = 8;
  if (st.i + 8 <= buf.length && buf.readUInt32LE(st.i) === 0x564b4256) { st.i += 8; end = 11; }
  const cstr = () => { const z = buf.indexOf(0, st.i); if (z < 0) throw new Error('kv'); const s = buf.toString('utf8', st.i, z); st.i = z + 1; return s; };
  const key = () => { if (stringTable) { const k = buf.readInt32LE(st.i); st.i += 4; return stringTable[k]; } return cstr(); };
  const obj = depth => {
    if (depth > 64) throw new Error('kv');
    const o = {};
    for (;;) {
      const t = buf[st.i++]; if (t === undefined) throw new Error('kv');
      if (t === end) return o;
      const k = String(key()).toLowerCase(); let v;
      if (t === 0) v = obj(depth + 1); else if (t === 1) v = cstr();
      else if (t === 2 || t === 4 || t === 6) { v = buf.readInt32LE(st.i); st.i += 4; } else if (t === 3) { v = buf.readFloatLE(st.i); st.i += 4; }
      else if (t === 7 || t === 10) { v = buf.readBigUInt64LE(st.i).toString(); st.i += 8; } else throw new Error('kv tipo ' + t);
      if (!(k in o)) o[k] = v;
    }
  };
  return obj(0);
}
function readPackages(file, wanted) {
  const buf = fs.readFileSync(file), magic = buf.readUInt32LE(0), ver = magic & 0xff;
  if ((magic & 0xffffff00) !== 0x06565500) throw new Error('packageinfo.vdf desconhecido');
  const st = { i: 8 }, map = new Map();
  while (st.i + 4 <= buf.length) {
    const id = buf.readUInt32LE(st.i); st.i += 4; if (id === 0xffffffff) break;
    st.i += 20 + 4; if (ver >= 40) st.i += 8;
    const d = kvBin(buf, st), root = Object.keys(d).length === 1 && typeof Object.values(d)[0] === 'object' ? Object.values(d)[0] : d;
    if (wanted.has(id) && root.appids && typeof root.appids === 'object') map.set(id, Object.values(root.appids).map(Number).filter(x => x > 0));
  }
  return map;
}
// Steam 2026+: o appinfo.vdf virou 256 arquivos appcache\appinfo\appinfo_XX.vdf (versao 42).
// Cabecalho (44 bytes): magic, universo, n do arquivo, total(256), qtd de apps, tam. do indice, qtd de strings, tam. das strings, tam. dos dados, 8 bytes.
// Indice: 80 bytes por app (appid, deslocamento, tamanho, ...). Cada registro: 20 bytes de hash + KeyValues binario usando a tabela de strings.
function readAppsShard(buf, wanted, out) {
  const magic = buf.readUInt32LE(0); if ((magic & 0xffffff00) !== 0x07564400 || (magic & 0xff) < 42) throw new Error('appinfo_XX desconhecido');
  const cnt = buf.readUInt32LE(16), idxSize = buf.readUInt32LE(20), nStr = buf.readUInt32LE(24), strSize = buf.readUInt32LE(28);
  const H = 44, entSize = cnt ? idxSize / cnt : 80, strStart = H + idxSize, dataStart = strStart + strSize;
  const table = new Array(nStr); let p = strStart;
  for (let k = 0; k < nStr; k++) { const z = buf.indexOf(0, p); table[k] = buf.toString('utf8', p, z); p = z + 1; }
  for (let k = 0; k < cnt; k++) {
    const e = H + k * entSize, id = buf.readUInt32LE(e); if (!wanted.has(id)) continue;
    const off = buf.readUInt32LE(e + 4);
    try {
      const st = { i: dataStart + off + 20 }, d = kvBin(buf, st, table), root = d.appinfo || d, c = root.common || {}, cf = root.config || {}, launch = [];
      for (const l of Object.values(cf.launch || {})) { if (!l || typeof l !== 'object') continue; const os = String(((l.config || {}).oslist) || ''); launch.push({ exe: String(l.executable || ''), args: String(l.arguments || ''), type: String(l.type || '').toLowerCase(), os, beta: !!(l.config || {}).betakey }); }
      out.set(id, { name: String(c.name || '').trim(), type: String(c.type || '').toLowerCase(), installdir: String(cf.installdir || ''), launch });
    } catch {}
  }
}
function appsAny(steamRoot, wanted) {
  const one = path.join(steamRoot, 'appcache', 'appinfo.vdf'), dir = path.join(steamRoot, 'appcache', 'appinfo');
  let shards = []; try { shards = fs.readdirSync(dir).filter(f => /^appinfo_[0-9a-f]{2}\.vdf$/i.test(f)); } catch {}
  if (shards.length) { const out = new Map(); for (const f of shards) { if (out.size >= wanted.size) break; try { readAppsShard(fs.readFileSync(path.join(dir, f)), wanted, out); } catch {} } if (out.size || !fs.existsSync(one)) return out; }
  return readApps(one, wanted);
}
const hasAppinfo = r => fs.existsSync(path.join(r, 'appcache', 'appinfo.vdf')) || fs.existsSync(path.join(r, 'appcache', 'appinfo'));
function readApps(file, wanted) {
  const buf = fs.readFileSync(file), magic = buf.readUInt32LE(0), ver = magic & 0xff;
  if ((magic & 0xffffff00) !== 0x07564400) throw new Error('appinfo.vdf desconhecido');
  let i = 8, end = buf.length, table = null;
  if (ver >= 41) {
    const off = Number(buf.readBigInt64LE(8)); i = 16; end = off;
    const st = { i: off + 4 }, cnt = buf.readUInt32LE(off); table = new Array(cnt);
    for (let k = 0; k < cnt; k++) { const z = buf.indexOf(0, st.i); table[k] = buf.toString('utf8', st.i, z); st.i = z + 1; }
  }
  const out = new Map();
  while (i + 8 <= end) {
    const id = buf.readUInt32LE(i); if (id === 0) break;
    const size = buf.readUInt32LE(i + 4), recEnd = i + 8 + size;
    if (wanted.has(id)) {
      try {
        const st = { i: i + 8 + 4 + 4 + 8 + 20 + 4 + (ver >= 40 ? 20 : 0) };
        const d = kvBin(buf, st, table), root = d.appinfo || d, c = root.common || {};
        const cf = root.config || {}, launch = [];
        for (const l of Object.values(cf.launch || {})) { if (!l || typeof l !== 'object') continue; const os = String(((l.config || {}).oslist) || ''); launch.push({ exe: String(l.executable || ''), args: String(l.arguments || ''), type: String(l.type || '').toLowerCase(), os, beta: !!(l.config || {}).betakey }); }
        out.set(id, { name: String(c.name || '').trim(), type: String(c.type || '').toLowerCase(), installdir: String(cf.installdir || ''), launch });
      } catch {}
    }
    i = recEnd;
  }
  return out;
}

// ---------- principal ----------
const ID0 = 76561197960265728n;
function steamOwnedLocal(steamRoot) {
  if (!steamRoot || !hasAppinfo(steamRoot)) return { games: [], why: 'Steam não encontrada neste PC.' };
  let users = {}; try { users = vdfText(fs.readFileSync(path.join(steamRoot, 'config', 'loginusers.vdf'), 'utf8')).users || {}; } catch {}
  const accs = [];
  let dirs = []; try { dirs = fs.readdirSync(path.join(steamRoot, 'userdata')).filter(d => /^\d+$/.test(d) && d !== '0'); } catch {}
  for (const d of dirs) {
    const lc = path.join(steamRoot, 'userdata', d, 'config', 'licensecache'); if (!fs.existsSync(lc)) continue;
    const sid = (BigInt(d) + ID0).toString(), u = users[sid] || {};
    accs.push({ acc: +d, sid, lc, recent: String(u.mostrecent || '') === '1', t: fs.statSync(lc).mtimeMs, dir: path.join(steamRoot, 'userdata', d) });
  }
  if (!accs.length) return { games: [], why: 'Nenhuma conta da Steam com licenças neste PC (entre na Steam pelo menos uma vez).' };
  accs.sort((a, b) => (b.recent - a.recent) || (b.t - a.t));
  const a = accs[0], pkgs = new Set(readLicenses(a.lc, a.acc));
  if (!pkgs.size) return { games: [], why: 'Não consegui ler as licenças da conta da Steam.', sid: a.sid };
  const pm = readPackages(path.join(steamRoot, 'appcache', 'packageinfo.vdf'), pkgs), apps = new Set();
  for (const ids of pm.values()) for (const x of ids) apps.add(x);
  const meta = appsAny(steamRoot, apps);
  let play = {}; try { const lc = vdfText(fs.readFileSync(path.join(a.dir, 'config', 'localconfig.vdf'), 'utf8')); play = ((((((lc.userlocalconfigstore || {}).software || {}).valve || {}).steam || {}).apps) || {}); } catch {}
  const games = [];
  for (const id of apps) {
    const m = meta.get(id); if (!m || m.type !== 'game' || !m.name) continue;
    const p = play[String(id)] || {};
    games.push({ appid: id, name: m.name, minutes: +p.playtime || 0, last: +p.lastplayed || 0 });
  }
  return { games, sid: a.sid, packages: pkgs.size };
}

// .exe principal de cada app instalado (opcao de inicializacao padrao para Windows), relativo a pasta do jogo
function steamLaunchInfo(steamRoot, appids) {
  const meta = appsAny(steamRoot, new Set(appids)), out = new Map();
  for (const [id, m] of meta) {
    const ok = m.launch.filter(l => /\.exe$/i.test(l.exe) && !l.beta && (!l.os || /windows/i.test(l.os)) && !/\b(server|editor|sdk|benchmark|config|setup|launcher_?config)\b/i.test(l.exe));
    const pick = ok.find(l => !l.type || l.type === 'default' || l.type === 'none') || ok[0];
    if (pick) out.set(id, { exe: pick.exe.replace(/\//g, '\\').replace(/^\.?\\/, ''), args: pick.args });
  }
  return out;
}
function steamLocalPlaytime(steamRoot) {
  let dirs = []; try { dirs = fs.readdirSync(path.join(steamRoot, 'userdata')).filter(d => /^\d+$/.test(d) && d !== '0'); } catch {}
  let best = null, bt = 0;
  for (const d of dirs) { const f = path.join(steamRoot, 'userdata', d, 'config', 'localconfig.vdf'); try { const t = fs.statSync(f).mtimeMs; if (t > bt) { bt = t; best = f; } } catch {} }
  if (!best) return {};
  try { const lc = vdfText(fs.readFileSync(best, 'utf8')); return ((((((lc.userlocalconfigstore || {}).software || {}).valve || {}).steam || {}).apps) || {}); } catch { return {}; }
}

module.exports = { steamOwnedLocal, steamLaunchInfo, steamLocalPlaytime, vdfText, licenseXor, kvBin };
