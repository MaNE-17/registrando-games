// Deteccao dos jogos instalados de outros launchers (Epic, Ubisoft Connect, EA app, Battle.net, Game Pass).
// Tudo e lido do proprio computador: nenhuma conta, chave ou login.
const fs = require('fs'), path = require('path'), cp = require('child_process');

const NAMES = ['Epic Games', 'GOG', 'Ubisoft Connect', 'EA app', 'Battle.net', 'Game Pass', 'Rockstar Games'];
// Todos os launchers de PC que podem ir para a barra lateral (os que nao tem deteccao so servem de filtro)
const CATALOG = ['Steam', 'Epic Games', 'GOG', 'Ubisoft Connect', 'EA app', 'Battle.net', 'Game Pass', 'Rockstar Games', 'itch.io', 'Amazon Games', 'Riot Games', 'Humble Bundle'];
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

function epic() {
  const dir = process.env.RG_EPIC || path.join(process.env.ProgramData || 'C:\\ProgramData', 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests');
  const out = []; let files = []; try { files = fs.readdirSync(dir); } catch { return out; }
  for (const f of files) {
    if (!/\.item$/i.test(f)) continue;
    try {
      const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (!j.DisplayName || !j.InstallLocation || j.bIsIncompleteInstall) continue;
      if (Array.isArray(j.AppCategories) && j.AppCategories.length && !j.AppCategories.includes('games')) continue;
      if (!isDir(j.InstallLocation)) continue;
      let exe = j.LaunchExecutable ? path.join(j.InstallLocation, j.LaunchExecutable) : '';
      if (!exe || !fs.existsSync(exe)) exe = guessExe(j.InstallLocation);
      const id = [j.CatalogNamespace, j.CatalogItemId, j.AppName].filter(Boolean).map(encodeURIComponent).join('%3A');
      out.push({ launcher: 'Epic Games', key: 'epic:' + (j.AppName || j.DisplayName), name: clean(j.DisplayName), exe, uri: j.AppName ? `com.epicgames.launcher://apps/${id}?action=launch&silent=true` : '' });
    } catch {}
  }
  return out;
}

async function ubisoft() {
  const out = [];
  const txt = process.env.RG_UBI_TEXT !== undefined ? process.env.RG_UBI_TEXT : await reg(['HKLM\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs', '/s']);
  for (const b of regBlocks(txt)) {
    const dir = (b.v['installdir'] || '').replace(/\//g, SEP).replace(/[\\/]+$/, ''), id = b.key.split('\\').pop();
    if (!dir || !/^\d+$/.test(id) || !isDir(dir)) continue;
    out.push({ launcher: 'Ubisoft Connect', key: 'ubi:' + id, name: clean(PB(dir)), exe: guessExe(dir), uri: `uplay://launch/${id}/0` });
  }
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
    out.push({ launcher: 'GOG', key: 'gog:' + id, name: clean(name), exe, uri: '' });
  }
  return out;
}
async function rockstar() {
  const out = [], txt = process.env.RG_ROCK_TEXT !== undefined ? process.env.RG_ROCK_TEXT : await reg(['HKLM\\SOFTWARE\\WOW6432Node\\Rockstar Games', '/s']);
  for (const b of regBlocks(txt)) {
    const name = b.key.split('\\').pop(), dir = (b.v['installfolder'] || '').replace(/\//g, SEP).replace(/[\\/]+$/, '');
    if (/^(rockstar games|launcher|social club|rockstar games launcher)$/i.test(name) || !dir || !isDir(dir)) continue;
    out.push({ launcher: 'Rockstar Games', key: 'rockstar:' + name, name: clean(name), exe: guessExe(dir), uri: '' });
  }
  return out;
}

async function scanAll(only) {
  const res = {};
  for (const [n, f] of [['Epic Games', async () => epic()], ['GOG', gog], ['Ubisoft Connect', ubisoft], ['EA app', ea], ['Battle.net', battlenet], ['Game Pass', gamepass], ['Rockstar Games', rockstar]]) {
    if (only && !only.includes(n)) continue;
    try { res[n] = await f(); } catch (e) { res[n] = []; res[n + '_err'] = e.message; }
  }
  return res;
}
module.exports = { NAMES, CATALOG, SIDE_DEF, scanAll, guessExe, regBlocks };
