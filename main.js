const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, shell, utilityProcess } = require('electron');
const path = require('path'), fs = require('fs'), cp = require('child_process'), crypto = require('crypto');
const LCH = require('./launchers'), STL = require('./steamlib');
process.env.RG_DIAG = ''; app.whenReady().then(() => { process.env.RG_DIAG = path.join(app.getPath('userData'), 'epic-diagnostico.txt'); });

// ---------- Pastas ----------
// Tudo fica em uma pasta so:  ...\Registrando Games\Programa (app)  e  ...\Registrando Games\Dados (jogos, capas, preferencias)
const DATA_DIR = (() => {
  if (process.env.RG_DADOS) return process.env.RG_DADOS;
  if (!app.isPackaged) return path.join(app.getPath('appData'), 'registrando-games-dev');
  const dir = path.dirname(process.execPath);
  if (path.basename(dir).toLowerCase() === 'programa') return path.join(dir, '..', 'Dados');
  return path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'Registrando Games', 'Dados');
})();
const OLD_DIR = process.env.RG_ANTIGO || path.join(app.getPath('appData'), 'backlog-de-jogos');
// Primeira abertura: traz os dados do antigo "Backlog de Jogos" (a pasta antiga fica intacta, como backup)
(function migrate() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(path.join(DATA_DIR, 'backlog_data.json')) || !fs.existsSync(path.join(OLD_DIR, 'backlog_data.json'))) return;
    const skip = new Set(['Cache', 'Code Cache', 'GPUCache', 'DawnCache', 'DawnGraphiteCache', 'DawnWebGPUCache', 'blob_storage', 'Crashpad', 'Network', 'lockfile', 'SingletonLock', 'SingletonCookie', 'SingletonSocket']);
    for (const n of fs.readdirSync(OLD_DIR)) {
      if (skip.has(n)) continue;
      try { fs.cpSync(path.join(OLD_DIR, n), path.join(DATA_DIR, n), { recursive: true, force: false }); } catch {}
    }
  } catch {}
})();
app.setPath('userData', DATA_DIR);
app.setAppUserModelId('com.local.registrandogames');

let wpWin = null, wpGame = null;
let stopRefresh = false, refreshing = false, win, tray, quitting = false, msg = '', busy = false, tick = 0;
let data = { games: [], config: {}, lists: [] };

// ---------- Atualizacao pelo GitHub (Releases) ----------
const GH_REPO_PADRAO = 'MaNE-17/registrando-games';
const ghRepo = () => (data.config.ghRepo || GH_REPO_PADRAO).replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/+$/, '');
const ghHead = (accept) => ({ 'Accept': accept || 'application/vnd.github+json', 'User-Agent': 'RegistrandoGames', ...(data.config.gh ? { Authorization: 'Bearer ' + data.config.gh } : {}) });
const verNum = v => String(v || '').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
const verGt = (a, b) => { const x = verNum(a), y = verNum(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
let updInfo = null;
async function updCheck() {
  const r = await fetch(`https://api.github.com/repos/${ghRepo()}/releases/latest`, { headers: ghHead() });
  if (r.status === 404) return { ok: false, msg: data.config.gh ? 'Nenhuma versão publicada ainda (ou o token não tem acesso ao repositório).' : 'Nenhuma versão publicada ainda.' };
  if (r.status === 401 || r.status === 403) return { ok: false, msg: 'O GitHub recusou o token. Confira se ele está certo e não expirou.' };
  if (!r.ok) return { ok: false, msg: 'Erro ao consultar o GitHub (HTTP ' + r.status + ').' };
  const j = await r.json();
  const asset = (j.assets || []).find(a => /\.exe$/i.test(a.name));
  const tag = j.tag_name || '';
  updInfo = { tag, asset, notes: j.body || '' };
  if (!verGt(tag, app.getVersion())) return { ok: true, novo: false, msg: 'Você já está na versão mais recente (' + app.getVersion() + ').' };
  if (!asset) return { ok: false, msg: 'A versão ' + tag + ' não tem instalador (.exe) anexado.' };
  return { ok: true, novo: true, tag, notes: updInfo.notes, size: asset.size, msg: 'Nova versão disponível: ' + tag };
}
let UPD = { phase: '', got: 0, total: 0 }, UPDNEW = null;
// aviso de versao nova: confere ao abrir e a cada 6 horas (se a opcao estiver ligada)
async function updWatch() {
  try {
    if (data.updNotify === false || UPD.phase) return;
    const c = await updCheck();
    if (c && c.ok && c.novo) {
      UPDNEW = { tag: c.tag, notes: c.notes || '' };
    } else if (c && c.ok) UPDNEW = null;
  } catch {}
}
async function updInstall() {
  if (UPD.phase === 'down') return { ok: false, msg: 'Já está baixando...' };
  if (!updInfo || !updInfo.asset) { const c = await updCheck(); if (!c.novo) return c; }
  const a = updInfo.asset;
  UPD = { phase: 'down', got: 0, total: a.size || 0 };
  try {
    const url = `https://api.github.com/repos/${ghRepo()}/releases/assets/${a.id}`, opt = { headers: ghHead('application/octet-stream'), redirect: 'follow' };
    let r; try { r = await require('electron').net.fetch(url, opt); } catch { r = await fetch(url, opt); } // net.fetch usa a rede do Chromium (HTTP/2, proxy do sistema): bem mais rapido
    if (!r.ok) { UPD.phase = ''; return { ok: false, msg: 'Falha ao baixar a atualização (HTTP ' + r.status + ').' }; }
    const dir = path.join(app.getPath('temp'), 'RegistrandoGamesUpdate'); fs.mkdirSync(dir, { recursive: true });
    const exe = path.join(dir, a.name.replace(/[^\w.\- ]/g, '_'));
    const ws = fs.createWriteStream(exe), rd = r.body.getReader();
    for (;;) { const { done, value } = await rd.read(); if (done) break; UPD.got += value.length; if (!ws.write(value)) await new Promise(res => ws.once('drain', res)); }
    await new Promise((res, rej) => { ws.on('error', rej); ws.end(res); });
    if (fs.statSync(exe).size !== a.size) { UPD.phase = ''; return { ok: false, msg: 'Download incompleto. Tente de novo.' }; }
    UPD.phase = 'inst';
    // instalador silencioso direto (sem janela de prompt); ele fecha este app, instala e reabre
    cp.spawn(exe, ['/S', '--force-run'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    setTimeout(() => { quitting = true; app.quit(); }, 1200);
    return { ok: true, msg: 'Instalando... o programa vai fechar e abrir sozinho.' };
  } catch (e) { UPD.phase = ''; return { ok: false, msg: 'Erro: ' + e.message }; }
}
const running = new Set();
const U = p => path.join(app.getPath('userData'), p);
const COVERS = () => U('covers');
const now = () => Math.floor(Date.now() / 1000);
const rid = () => crypto.randomBytes(5).toString('hex');
const isDirP = p => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const parseArgs = s => { const o = []; String(s || '').replace(/"([^"]*)"|(\S+)/g, (_, a, b) => { o.push(a !== undefined ? a : b); return ''; }); return o; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// SteamID: aceita o SteamID64, o link do perfil (/profiles/... ou /id/...) ou o nome personalizado
async function steamId64(key, raw) {
  const s = String(raw || '').trim().replace(/\/+$/, '');
  let m = s.match(/(?:^|\/profiles\/)(7656\d{13})$/); if (m) return m[1];
  m = s.match(/\/id\/([^/?#]+)/); const vanity = m ? m[1] : (/^[\w-]{2,32}$/.test(s) ? s : '');
  if (!vanity || !key) return '';
  const r = await J('https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?' + new URLSearchParams({ key, vanityurl: vanity }));
  return r && r.response && r.response.success === 1 ? String(r.response.steamid) : '';
}
async function steamTest(key, raw) {
  key = String(key || '').trim();
  const out = [];
  if (!/^[0-9A-Fa-f]{32}$/.test(key)) return { ok: false, lines: ['✗ Chave da API: deve ter 32 caracteres (letras A–F e números). Confira se copiou inteira.'] };
  let id;
  try { id = await steamId64(key, raw); }
  catch (e) { return { ok: false, lines: [/40[13]/.test(e.message) ? '✗ Chave da API recusada pela Steam (inválida ou revogada).' : '✗ Não consegui falar com a Steam (' + e.message + '). Confira a internet.'] }; }
  if (!id) return { ok: false, lines: ['✗ SteamID: não reconheci. Use o SteamID64 (17 dígitos que começam com 7656), o link do seu perfil ou o nome personalizado do link.'] };
  let pl;
  try { pl = ((await J('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?' + new URLSearchParams({ key, steamids: id }))).response.players || [])[0]; }
  catch (e) { return { ok: false, lines: [/40[13]/.test(e.message) ? '✗ Chave da API recusada pela Steam (inválida ou revogada).' : '✗ Não consegui falar com a Steam (' + e.message + ').'] }; }
  out.push('✓ Chave da API aceita pela Steam.');
  if (!pl) return { ok: false, lines: [...out, '✗ Nenhum perfil encontrado com esse SteamID.'] };
  out.push(`✓ Perfil encontrado: ${pl.personaname} (${id}).`);
  if (pl.communityvisibilitystate !== 3) out.push('✗ O perfil está privado. Deixe o perfil e os detalhes dos jogos como Públicos (Steam → Perfil → Editar perfil → Privacidade).');
  try {
    const r = (await J('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?' + new URLSearchParams({ key, steamid: id, include_appinfo: 0 }))).response || {};
    if (typeof r.game_count !== 'number') out.push('✗ A Steam não devolveu seus jogos: os "Detalhes dos jogos" do perfil estão privados. Mude para Público em Steam → Perfil → Editar perfil → Privacidade.');
    else out.push(`✓ Biblioteca liberada: ${r.game_count} jogo(s).`);
  } catch (e) { out.push('✗ Erro ao ler a biblioteca (' + e.message + ').'); }
  return { ok: !out.some(l => l.startsWith('✗')), id, lines: out };
}
// Relatorio para descobrir por que um PC nao achou jogos (sem chaves nem tokens)
async function diagReport() {
  const L = [], ex = p => { try { return fs.existsSync(p) ? 'existe' : 'não existe'; } catch { return 'erro'; } };
  const la = process.env.LOCALAPPDATA || '', pd = process.env.ProgramData || 'C:\\ProgramData', ad = process.env.APPDATA || '';
  L.push('Registrando Games ' + app.getVersion() + ' | Windows ' + require('os').release() + ' | ' + new Date().toISOString());
  L.push('Pasta de dados: ' + DATA_DIR + ' | jogos: ' + data.games.length + ' | barra lateral: ' + JSON.stringify(data.sidePlats || 'padrão'));
  L.push('Auto atualizar ao abrir: ' + (data.autoRefresh !== false) + ' | Steam API: chave ' + (data.config.key ? 'preenchida' : 'vazia') + ', SteamID ' + (data.config.steamid ? 'preenchido' : 'vazio'));
  L.push('', '== Pastas dos launchers');
  for (const [n, p] of [['GOG Galaxy', path.join(pd, 'GOG.com', 'Galaxy', 'storage', 'galaxy-2.0.db')], ['Epic (novo)', path.join(la, 'com.epicgames.eglv2')], ['Epic (antigo)', path.join(pd, 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests')], ['Ubisoft cache', path.join(la, 'Ubisoft Game Launcher', 'cache')], ['EA ProgramData', path.join(pd, 'EA Desktop')], ['EA conta', path.join(la, 'Electronic Arts', 'EA Desktop')], ['Battle.net logs', path.join(la, 'Battle.net', 'Logs')], ['Battle.net cache', path.join(la, 'Battle.net', 'Cache')], ['Amazon Games', path.join(la, 'Amazon Games', 'Data', 'Games', 'Sql')]]) L.push(n + ': ' + ex(p) + '  (' + p + ')');
  L.push('', '== Steam');
  try { await scanSteam(); L.push('Pasta da Steam: ' + steamRoot + ' (' + (fs.existsSync(steamRoot) ? 'existe' : 'não existe') + ') | instalados lidos: ' + steamNames.size); } catch (e) { L.push('Steam: erro ' + e.message); }
  try { steamExeFill(); L.push('Pasta/.exe dos instalados: ' + steamExeInfo + ' | pastas lidas: ' + steamDirs.size); } catch (e) { L.push('Pasta/.exe: ERRO ' + e.message); }
  try { const r = STL.steamOwnedLocal(steamRoot); L.push('Biblioteca pelo cache local: ' + (r.why || r.games.length + ' jogo(s), ' + r.packages + ' licença(s)')); } catch (e) { L.push('Biblioteca pelo cache local: ERRO ' + e.message); }
  L.push('', '== Busca nos launchers');
  for (const n of LCH.NAMES) {
    const t0 = Date.now();
    try { const r = await LCH.scanAll([n]), f = r[n] || []; L.push(`${n}: ${f.length} jogo(s), ${f.filter(x => x.installed !== false).length} instalado(s), ${Date.now() - t0} ms` + (f.err || r[n + '_err'] ? ' | aviso: ' + (f.err || r[n + '_err']) : '')); }
    catch (e) { L.push(`${n}: ERRO ${e.message} (${Date.now() - t0} ms)`); }
  }
  L.push('', '== Última mensagem do app', msg || '(nenhuma)');
  const file = path.join(app.getPath('desktop'), 'registrando-games-diagnostico.txt');
  fs.writeFileSync(file, L.join('\r\n'), 'utf8');
  return file;
}
const J = async u => { const r = await fetch(u); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
const find = id => data.games.find(x => x.id === id);
function load() { try { data = { ...data, ...JSON.parse(fs.readFileSync(U('backlog_data.json'), 'utf8')) }; } catch {} data.lists = data.lists || [];
  // Barra lateral: instalacao nova comeca sem launchers (eles entram quando algum jogo for encontrado).
  // Uma vez so: tira os launchers padrao que nunca tiveram jogo.
  if (!data.sideMig1) {
    if (data.sidePlats === undefined) data.sidePlats = data.games.length ? [...LCH.SIDE_DEF] : [];
    const has = new Set(data.games.map(g => String(g.platform || '').toLowerCase()));
    data.sidePlats = data.sidePlats.filter(n => has.has(n.toLowerCase()));
    data.sideMig1 = 1;
  }
  data.sideOff = data.sideOff || [];
  if (!data.manMig1) { data.manMig1 = 1; for (const g of data.games || []) if (g.manual_s > 0) { g.tracked_s = (g.tracked_s || 0) + g.manual_s; g.manual_s = 0; } }
  if (!data.scoreMig1) { data.scoreMig1 = 1; for (const g of data.games || []) { if (g.rating > 0 && g.score == null) g.score = Math.min(10, g.rating * 2); delete g.rating; delete g.meta; delete g.meta_url; } }
  try { emuMigrate(); } catch {}
  if (!data.clearLP1) { data.clearLP1 = 1; for (const g of data.games || []) g.last_played = 0; }
  if (!data.fixRomTrack) { data.fixRomTrack = 1; for (const g of data.games || []) if (g.rom) { g.last_played = 0; g.tracked_s = 0; if (g.status === 'Jogando') g.status = 'Backlog'; } }
  for (const g of data.games) if (!g.info4 && g.info3 && g.released) g.info4 = true; }
function save() { const f = U('backlog_data.json'); fs.writeFileSync(f + '.tmp', JSON.stringify(data, null, 1)); fs.renameSync(f + '.tmp', f); }
const rmLogo = g => { if (g.logo) try { fs.unlinkSync(path.join(COVERS(), g.logo)); } catch {} g.logo = ''; };
const rmWall = g => { if (g.wall) try { fs.unlinkSync(path.join(COVERS(), g.wall)); } catch {} g.wall = ''; };
const rmSq = g => { if (g.sq) try { fs.unlinkSync(path.join(COVERS(), g.sq)); } catch {} g.sq = ''; };
const rmCover = g => { if (g.cover) try { fs.unlinkSync(path.join(COVERS(), g.cover)); } catch {} g.cover = ''; };

// Rastreio: a cada 5s confere se o .exe de algum jogo esta aberto (Windows)
function track() {
  if (process.platform !== 'win32') return;
  cp.exec('tasklist /fo csv /nh', { windowsHide: true, maxBuffer: 8e6 }, (err, out) => {
    if (err) return;
    const names = new Set(out.split(/\r?\n/).map(l => (l.match(/^"([^"]+)"/) || [])[1]).filter(Boolean).map(s => s.toLowerCase()));
    const emu = [], hit = [];
    for (const g of data.games) {
      const pn = (g.proc || (g.exe && !/\.(bat|cmd)$/i.test(g.exe) ? path.win32.basename(g.exe) : '')).toLowerCase();
      if (pn && names.has(pn)) (g.rom ? emu : hit).push(g.rom ? [g, pn] : g);
    }
    const done = extra => {
      const prev = new Set(running); running.clear();
      for (const g of [...hit, ...extra]) {
        if (!g.appid) g.tracked_s = (g.tracked_s || 0) + 5; // Steam ja conta as horas dela
        g.last_played = now(); running.add(g.id);
        if (g.status === 'Backlog' || (g.status === 'Pausado' && !prev.has(g.id))) g.status = 'Jogando';
      }
      if (running.size && ++tick % 6 === 0) save();
      const fechou = [...prev].filter(id => !running.has(id) && (data.games.find(x => x.id === id) || {}).appid);
      if (fechou.length) { setTimeout(() => steamPlayRefresh(fechou), 15000); setTimeout(() => steamPlayRefresh(fechou), 60000); }
    };
    if (!emu.length) return done([]);
    // Jogos de emulador dividem o mesmo .exe: so conta o que tem a ROM na linha de comando do processo aberto
    const filt = [...new Set(emu.map(x => x[1]))].map(n => `Name='${n.replace(/'/g, "''")}'`).join(' OR ');
    cp.execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Get-CimInstance Win32_Process -Filter "${filt}" | ForEach-Object { $_.CommandLine }`], { windowsHide: true, timeout: 8000, maxBuffer: 4e6 }, (e, o) => {
      if (e) return done([]);
      const lines = String(o).toLowerCase().replace(/\//g, '\\');
      done(emu.filter(([g]) => lines.includes(g.rom.toLowerCase().replace(/\//g, '\\'))).map(x => x[0]));
    });
  });
}

// Generos + nota do Metacritic (a Steam entrega a nota quando existe)
const MES = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
// Data de lancamento da Steam ("12 de nov. de 2020", "nov. de 2020", "2020" ou formato em ingles) -> timestamp (meio-dia UTC)
function parseRel(s) {
  if (!s) return null;
  const mo = x => MES[x.slice(0, 3).toLowerCase()];
  let a = s.match(/(\d{1,2})\s+de\s+([a-zç]+)\.?\s+de\s+(\d{4})/i);
  if (a && mo(a[2]) != null) return Math.floor(Date.UTC(+a[3], mo(a[2]), +a[1], 12) / 1000);
  a = s.match(/([a-zç]+)\.?\s+de\s+(\d{4})/i);
  if (a && mo(a[1]) != null) return Math.floor(Date.UTC(+a[2], mo(a[1]), 1, 12) / 1000);
  a = s.match(/^\s*(\d{4})\s*$/);
  if (a) return Math.floor(Date.UTC(+a[1], 0, 1, 12) / 1000);
  const t = Date.parse(s);
  return isNaN(t) ? null : Math.floor(t / 1000) + 43200;
}
// ---------- Datas, notas do Metacritic e generos ----------
const nzn = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const isPC = p => { const s = (p || '').toLowerCase(); return !s || s === 'pc' || s.includes('steam') || s.includes('windows'); };
const normDay = t => { const d = new Date(t * 1000); return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12) / 1000); };
const dateEn = s => { const t = Date.parse(/^\d{4}-/.test(s) ? s : s.replace(/\./g, '') + ' UTC'); return isNaN(t) ? null : normDay(t / 1000); };
const steamDetails = async id => ((await J(`https://store.steampowered.com/api/appdetails?appids=${id}&l=portuguese`))[id] || {});
async function steamSearchId(name, loose) {
  const items = (await J('https://store.steampowered.com/api/storesearch/?cc=br&l=portuguese&term=' + encodeURIComponent(name))).items || [];
  const n = nzn(name), hit = items.find(x => nzn(x.name) === n) || (loose ? items[0] : null);
  return hit && hit.id;
}
const steamMeta = async id => { const d = (await steamDetails(id)).data || {}; return d.metacritic ? { score: d.metacritic.score, url: d.metacritic.url } : {}; };

// --- Metacritic direto (paginas publicas, sem chave) ---
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' };
async function pageText(u) {
  const r = await fetch(u, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(15000) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}
const slugify = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
// Plataformas do Metacritic que correspondem a plataforma do jogo
function mcPlats(p) {
  const s = (p || '').toLowerCase();
  if (isPC(p)) return ['pc'];
  const m = s.match(/(?:playstation|ps)\s*(\d)/);
  if (m) return [m[1] === '1' ? 'playstation' : 'playstation-' + m[1]];
  if (s.includes('vita')) return ['playstation-vita'];
  if (s.includes('psp')) return ['psp'];
  if (s.includes('playstation') || /^ps\b/.test(s)) return ['playstation-5', 'playstation-4', 'playstation-3'];
  if (s.includes('xbox')) {
    if (s.includes('360')) return ['xbox-360'];
    if (s.includes('one')) return ['xbox-one'];
    if (s.includes('series')) return ['xbox-series-x'];
    return ['xbox-series-x', 'xbox-one', 'xbox-360', 'xbox'];
  }
  if (s.includes('switch')) return ['switch'];
  if (s.includes('wii u')) return ['wii-u'];
  if (s.includes('wii')) return ['wii'];
  if (s.includes('3ds')) return ['3ds'];
  if (/\bds\b/.test(s)) return ['ds'];
  if (s.includes('gamecube')) return ['gamecube'];
  return ['pc', 'playstation-5', 'playstation-4', 'switch', 'xbox-one'];
}
const MCG = { Action: 'Ação', Adventure: 'Aventura', 'Action Adventure': 'Ação', 'Role-Playing': 'RPG', Strategy: 'Estratégia', Shooter: 'Tiro', Simulation: 'Simulação', Sports: 'Esportes', Racing: 'Corrida', Fighting: 'Luta', Puzzle: 'Quebra-cabeça', Platformer: 'Plataforma', Horror: 'Terror', Survival: 'Sobrevivência', Stealth: 'Furtividade', Music: 'Música', Party: 'Festa', Card: 'Cartas', 'Open-World': 'Mundo aberto', Sandbox: 'Mundo aberto', 'Action RPG': 'RPG de ação', 'Action Adventure': 'Ação e aventura' };
const MCDROP = new Set(['General', 'Linear', 'Modern', 'Miscellaneous', 'Other', 'Compilation', 'Fantasy', 'Real-Time', 'Turn-Based']);
const mapGenres = l => [...new Set(l.map(x => x.trim()).filter(x => x && !MCDROP.has(x)).map(x => MCG[x] || x))].slice(0, 4);
const toText = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const GENRE_RE = /Genre\(s\):\s*(.+?)(?=\s+(?:Number of Online Players|Developer|Publisher|Rating|Summary|Official Site|Release Date|Other Platforms|Also On|Cheats)\b|$)/;
function mcParse(h) {
  const t = toText(h);
  const sc = (t.match(/Metascore\s+(\d{1,3}|tbd)\b/i) || [])[1];
  const rd = (t.match(/Release Date:?\s+([A-Z][a-z]{2,8}\.? \d{1,2}, \d{4})/) || [])[1];
  const ti = (h.match(/<title>\s*([^<]+?)\s*<\/title>/i) || [])[1] || '';
  return { score: sc && /^\d+$/.test(sc) ? +sc : null, released: rd ? dateEn(rd) : null, has: !!sc || !!rd, title: (ti.match(/^(.*?)\s+(?:for|Reviews)\b/i) || [])[1] || '' };
}
const ALLP = ['pc', 'playstation-5', 'playstation-4', 'playstation-3', 'xbox-series-x', 'xbox-one', 'xbox-360', 'switch', 'wii-u', 'wii', '3ds', 'playstation-vita', 'playstation-2'];
const PLAB = { pc: 'PC', 'playstation-5': 'PlayStation 5', 'playstation-4': 'PlayStation 4', 'playstation-3': 'PlayStation 3', 'playstation-2': 'PlayStation 2', playstation: 'PlayStation', 'playstation-vita': 'PS Vita', psp: 'PSP', 'xbox-series-x': 'Xbox Series X|S', 'xbox-one': 'Xbox One', 'xbox-360': 'Xbox 360', xbox: 'Xbox', switch: 'Switch', 'wii-u': 'Wii U', wii: 'Wii', '3ds': '3DS', ds: 'DS', gamecube: 'GameCube' };
// Parecido entre dois nomes (tolera erros de digitacao): 0 a 1
function dice(a, b) {
  a = nzn(a); b = nzn(b); if (a === b) return 1; if (a.length < 2 || b.length < 2) return 0;
  const bg = s => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); } return m; };
  const A = bg(a), B = bg(b); let n = 0; for (const [k, v] of A) n += Math.min(v, B.get(k) || 0);
  return 2 * n / (a.length + b.length - 2);
}
// Corrige o nome (ex.: "Secon Son") usando a busca da Wikipedia
async function wikiTitle(name) {
  try {
    const r = await (await fetch('https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=6&srprop=&format=json&srsearch=' + encodeURIComponent(name + ' video game'), { headers: { 'User-Agent': 'RegistrandoGames/1.0 (app local de backlog)' }, signal: AbortSignal.timeout(10000) })).json();
    const c = ((r.query || {}).search || []).map(x => x.title.replace(/\s*\(.*?\)\s*$/, '')).map(t => [t, dice(t, name)]).sort((a, b) => b[1] - a[1])[0];
    return c && c[1] >= 0.6 ? c[0] : null;
  } catch { return null; }
}
async function mcLegacy(plat, slug) {
  const url = `https://legacy.prod.metacritic.com/game/${plat}/${slug}`;
  const h = await pageText(url); if (!h) return null;
  const p = mcParse(h); if (!p.has) return null;
  let genres = [];
  try { const d = await pageText(url + '/details'), g = d && toText(d).match(GENRE_RE); if (g) genres = g[1].split(/\s*,\s*/); } catch {}
  return { url, score: p.score, released: p.released, genres: mapGenres(genres), title: p.title, platSlug: plat };
}
async function mcNew(slug) {
  const url = `https://www.metacritic.com/game/${slug}/`;
  const h = await pageText(url); if (!h) return null;
  const sc = (h.match(/"aggregateRating"[\s\S]{0,300}?"ratingValue"\s*:\s*"?(\d{1,3})/) || [])[1];
  const rd = (h.match(/"datePublished"\s*:\s*"([^"]+)"/) || [])[1];
  const gm = (h.match(/"genre"\s*:\s*\[([^\]]*)\]/) || [])[1];
  if (sc == null && !rd) return null;
  return { url, score: sc != null ? +sc : null, released: rd ? dateEn(rd) : null, genres: mapGenres(gm ? [...gm.matchAll(/"([^"]+)"/g)].map(x => x[1]) : []), plat: false };
}
// Nota, data e generos do Metacritic. Corrige erros de digitacao no nome e,
// se o jogo nao estiver na plataforma escolhida, usa a primeira plataforma em que ele existir.
async function mcInfo(g) {
  const w = await wikiTitle(g.name), slugs = [];
  for (const n of [w, g.name]) { const s = slugify(n); if (s && !slugs.includes(s)) slugs.push(s); }
  if (!slugs.length) return null;
  const first = mcPlats(g.platform), plats = [...first, ...ALLP.filter(p => !first.includes(p))];
  let errs = 0;
  for (const slug of slugs) {
    for (let i = 0; i < plats.length; i += 4) {
      const batch = plats.slice(i, i + 4);
      const rs = await Promise.all(batch.map(p => mcLegacy(p, slug).catch(() => { errs++; return null; })));
      const k = rs.findIndex(Boolean);
      if (k >= 0) { const r = rs[k]; r.plat = first.includes(batch[k]); return r; }
    }
  }
  for (const slug of slugs) { try { const r = await mcNew(slug); if (r) return r; } catch { errs++; } }
  if (errs) throw new Error('não consegui acessar o Metacritic agora');
  return null;
}
// Botao "Buscar nota": so a nota do Metacritic
async function scoreFor(g) {
  if (g.appid) { const m = await steamMeta(g.appid); if (m.score != null) return m; }
  const r = await mcInfo(g);
  if (r && r.score != null) return { score: r.score, url: r.url, note: r.plat ? '' : 'Não achei a página dessa plataforma; usei a nota principal do jogo no Metacritic.' };
  if (!g.appid && isPC(g.platform)) { const id = await steamSearchId(g.name, true); if (id) return steamMeta(id); }
  return {};
}
// Lupa do jogo novo: nota, data, generos e capa
async function lookup(t) {
  const out = {}; let found = null;
  try { found = await mcInfo(t); if (!found) out.mcErr = 'Não achei esse jogo no Metacritic (confira o nome).'; } catch (e) { out.mcErr = e.message; }
  if (found) Object.assign(out, { meta: found.score, url: found.url, released: found.released, title: found.title, platFound: PLAB[found.platSlug] || '' });
  if ((out.meta == null || !out.released) && isPC(t.platform)) {
    try {
      const id = await steamSearchId(t.name, !found);
      if (id) {
        const d = (await steamDetails(id)).data || {};
        if (out.meta == null && d.metacritic) { out.meta = d.metacritic.score; out.url = d.metacritic.url; }
        if (!out.released && d.release_date) out.released = parseRel(d.release_date.date);
        out.title = d.name;
      }
    } catch {}
  }
  if (data.config.sgdb) { try { const p = await sgPage({ id: 'novo', name: t.name }, 0); if (p.items[0]) out.cover = p.items[0].url; } catch {}
    try { const pl = await sgPage({ id: 'novo', name: t.name }, 0, 'logo'); if (pl.items[0]) out.logo = pl.items[0].url; } catch {} }
  return out;
}

// Dados da Steam de um jogo. So marca como "preenchido" (info4) quando a Steam respondeu;
// se falhar, o jogo volta a ser tentado na proxima atualizacao.
async function steamInfo(g) {
  try {
    const r = (await J(`https://store.steampowered.com/api/appdetails?appids=${g.appid}&l=portuguese`))[g.appid] || {};
    const d = r.data || {};
    if (!g.rel_manual && !g.released && d.release_date) { const t = parseRel(d.release_date.date); if (t) g.released = t; }
    if (g.released) delete g.rel_why;
    else g.rel_why = r.success === false ? 'A Steam não tem página para esse jogo (removido ou restrito na sua região).'
      : !d.release_date ? 'A Steam não informou data de lançamento.'
      : d.release_date.coming_soon ? 'Jogo ainda não lançado.' : `Data em formato não reconhecido: "${d.release_date.date}".`;
    g.info4 = true;
    return true;
  } catch (e) { return /HTTP (429|403)/.test(e.message) ? 'rate' : false; }
}
// Datas em lote (100 jogos por consulta): evita o limite de consultas da loja
async function batchRelease(list) {
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    const input = { ids: chunk.map(g => ({ appid: g.appid })), context: { language: 'portuguese', country_code: 'BR', steam_realm: 1 }, data_request: { include_release: true, include_assets: true } };
    try {
      const r = await J('https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=' + encodeURIComponent(JSON.stringify(input)));
      for (const it of (r.response || {}).store_items || []) {
        const g = chunk.find(x => x.appid === it.appid), rel = it.release || {}, t = rel.original_release_date || rel.steam_release_date;
        if (g && t && !g.rel_manual) { g.released = normDay(t); delete g.rel_why; }
        // Capa vertical pelo endereco oficial da loja (jogos novos usam um caminho com codigo)
        const as = it.assets || {}, fmt = as.asset_url_format, file = as.library_capsule || as.library_capsule_2x || as.header;
        if (g) { if (fmt && file) g.capsule = 'https://shared.akamai.steamstatic.com/store_item_assets/' + fmt.replace('${FILENAME}', file); g.cap1 = true; }
      }
      save();
    } catch {}
    await sleep(600);
  }
}
let tried = new Set(), fails = 0;
const needInfo = x => x.appid && !x.info4 && !tried.has(x.id);
async function fillInfo() {
  if (busy) return; busy = true; tried = new Set(); fails = 0; let rate = 0;
  try {
    await batchRelease(data.games.filter(x => x.appid && (!x.info4 || !x.cap1)));
    for (;;) {
      if (stopRefresh) break;
      const g = data.games.find(needInfo); if (!g) break;
      tried.add(g.id);
      const ok = await steamInfo(g);
      if (ok === 'rate') {
        tried.delete(g.id);
        if (++rate > 4) break;
        msg = 'A Steam limitou as consultas; aguardando 1 minuto...'; await sleep(65000); continue;
      }
      rate = 0; if (!ok) fails++;
      save(); await sleep(1800);
    }
    if (rate > 4) fails = -1;
  } finally { busy = false; if (!refreshing) stopRefresh = false; }
  const warn = fails < 0 ? 'A Steam limitou as consultas; tente de novo em alguns minutos.' : fails ? `${fails} jogo(s) sem resposta; tente de novo.` : '';
  msg = (msg || '').split(' ‣ ')[0] + (warn ? ' ‣ ' + warn : '');
}

// Jogos da Familia Steam (API nao oficial; exige o token temporario da loja)
async function importFamily(c) {
  const t = encodeURIComponent(c.fam), sid = encodeURIComponent((await steamId64(c.key, c.steamid).catch(() => '')) || c.steamid);
  const gid = ((await J(`https://api.steampowered.com/IFamilyGroupsService/GetFamilyGroupForUser/v1/?access_token=${t}&steamid=${sid}`)).response || {}).family_groupid;
  if (!gid) throw new Error('não encontrei uma Família Steam nessa conta');
  const apps = ((await J(`https://api.steampowered.com/IFamilyGroupsService/GetSharedLibraryApps/v1/?access_token=${t}&family_groupid=${gid}&steamid=${sid}&include_own=true&include_free=false&include_excluded=false&include_non_games=false`)).response || {}).apps || [];
  const by = new Map(data.games.filter(g => g.appid).map(g => [g.appid, g]));
  let n = 0;
  for (const a of apps) {
    if (!a.appid) continue;
    const pm = Number(a.rt_playtime || a.playtime_forever || 0) || 0, lp = Number(a.rt_last_played || a.rtime_last_played || 0) || 0;
    const ex = by.get(a.appid);
    if (ex) {
      if (pm > (ex.steam_min || 0)) ex.steam_min = pm;
      if (lp) ex.last_played = Math.max(ex.last_played || 0, lp);
      continue;
    }
    n++;
    const g = { id: rid(), name: a.name || ('App ' + a.appid), appid: a.appid, platform: 'Steam', family: true, genres: [], status: 'Backlog', review: '',
      exe: '', steam_min: pm, tracked_s: 0, manual_s: 0, last_played: lp, finished: null, added: now() };
    by.set(a.appid, g); data.games.push(g);
  }
  save(); return n;
}

async function steamSync() {
  const c = data.config;
  if (!c.key || !c.steamid) return; // sem API: so os instalados (steamLocalImport)
  try {
    const sid = await steamId64(c.key, c.steamid); if (!sid) throw new Error('SteamID não reconhecido');
    const q = new URLSearchParams({ key: c.key, steamid: sid, include_appinfo: 1, include_played_free_games: 1 });
    const rsp = (await J('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?' + q)).response || {};
    if (typeof rsp.game_count !== 'number') { msg = 'Steam API: a biblioteca veio vazia ("Detalhes dos jogos" do perfil não estão Públicos). Os jogos vêm do cache local da Steam; as horas da API ficam de fora até liberar.'; return; }
    const games = rsp.games || [];
    const by = new Map(data.games.filter(g => g.appid).map(g => [g.appid, g]));
    let added = 0;
    for (const s of games) {
      const g = by.get(s.appid);
      if (g) {
        g.steam_min = s.playtime_forever || 0;
        if (s.rtime_last_played) g.last_played = Math.max(g.last_played || 0, s.rtime_last_played);
      } else {
        added++;
        data.games.push({ id: rid(), name: s.name, appid: s.appid, platform: 'Steam', genres: [], status: 'Backlog', review: '',
          exe: '', steam_min: s.playtime_forever || 0, tracked_s: 0, manual_s: 0, last_played: s.rtime_last_played || 0, finished: null, added: now() });
      }
    }
    if (games.length && !(data.sidePlats || []).includes('Steam') && !(data.sideOff || []).includes('Steam')) data.sidePlats = [...(data.sidePlats || []), 'Steam'];
    save();
    msg = `Biblioteca: ${games.length} jogos, ${added} novos.`;
  } catch (e) { msg = 'Erro: confira a chave, o SteamID e se o perfil está público (' + e.message + ')'; return; }
  if (c.famOn && c.fam) {
    try { msg += ` Família Steam: ${await importFamily(c)} novos.`; }
    catch {} // token da Familia Steam vence em ~24 h: ignora em silencio
  }
  msg += ' Gêneros, notas e datas chegam aos poucos.';
  fillInfo();
}

// Jogos da Steam instalados: le libraryfolders.vdf e os appmanifest (StateFlags com bit 4 = instalado)
let steamApps = new Set(), steamNames = new Map(), steamRoot = '', steamDirs = new Map();
function scanSteam() {
  if (process.platform !== 'win32') return Promise.resolve();
  return new Promise(done => cp.exec('reg query "HKCU\\Software\\Valve\\Steam" /v SteamPath', { windowsHide: true }, (err, out) => {
    const m = !err && out.match(/SteamPath\s+REG_SZ\s+(.+)/);
    const root = m ? m[1].trim().replace(/\//g, '\\') : 'C:\\Program Files (x86)\\Steam'; steamRoot = root;
    const libs = new Set([root]);
    try {
      const v = fs.readFileSync(path.join(root, 'steamapps', 'libraryfolders.vdf'), 'utf8');
      for (const x of v.matchAll(/"path"\s+"([^"]+)"/g)) libs.add(x[1].replace(/\\\\/g, '\\'));
      for (const x of v.matchAll(/"\d+"\s+"([A-Za-z]:[^"]+)"/g)) libs.add(x[1].replace(/\\\\/g, '\\'));
    } catch {}
    const s = new Set(), names = new Map(), dirs = new Map();
    for (const l of libs) {
      const dir = path.join(l, 'steamapps');
      let files = []; try { files = fs.readdirSync(dir); } catch {}
      for (const f of files) {
        const a = f.match(/^appmanifest_(\d+)\.acf$/); if (!a) continue;
        try { const t = fs.readFileSync(path.join(dir, f), 'utf8'), fl = t.match(/"StateFlags"\s+"(\d+)"/), nm = t.match(/"name"\s+"([^"]+)"/), idr = t.match(/"installdir"\s+"([^"]+)"/); if (fl && (+fl[1] & 4)) { s.add(+a[1]); if (nm) names.set(+a[1], nm[1]); if (idr) dirs.set(+a[1], path.join(dir, 'common', idr[1])); } } catch {}
      }
    }
    const novos = [...s].filter(x => !steamApps.has(x)); steamApps = s; steamNames = names; steamDirs = dirs; done();
    if (novos.length && data.games.some(g => g.appid && novos.includes(g.appid) && !g.exe)) setTimeout(() => steamExeFill(), 3000);
  }));
}
// Steam sem chave da API: importa os jogos instalados (lidos dos appmanifest). Com a API configurada, o steamSync completa o resto.
// Preenche pasta e .exe dos jogos da Steam instalados (a partir das opcoes de inicializacao do cache da Steam).
// O .exe serve para reconhecer o jogo rodando e para o botao Parar; o jogo continua abrindo pela Steam.
let steamExeInfo = '';
function steamExeFill() {
  const st = { comAppid: 0, instalados: 0, semInfo: [], semArq: [], ok: 0 };
  try {
    st.comAppid = data.games.filter(g => g.appid).length; st.instalados = data.games.filter(g => g.appid && steamDirs.has(g.appid)).length;
    const want = data.games.filter(g => g.appid && steamDirs.has(g.appid) && (!g.exe || g.exeAuto)).map(g => g.appid);
    if (!want.length || !steamRoot) { steamExeInfo = `jogos com appid: ${st.comAppid}, instalados (com pasta): ${st.instalados}, para preencher: 0, pasta da Steam: ${steamRoot || '(não achei)'}`; return 0; }
    const info = STL.steamLaunchInfo(steamRoot, want); let n = 0;
    for (const g of data.games) {
      if (!g.appid || !want.includes(g.appid)) continue;
      const dir = steamDirs.get(g.appid), li = info.get(g.appid); if (!dir || !li) { st.semInfo.push(g.name); continue; }
      const exe = path.join(dir, li.exe); if (!fs.existsSync(exe)) { st.semArq.push(g.name + ' -> ' + exe); continue; }
      st.ok++;
      if (g.exe !== exe) { g.exe = exe; g.exeAuto = 1; g.instDir = dir; n++; }
    }
    if (n) save();
    steamExeInfo = `jogos com appid: ${st.comAppid}, instalados: ${st.instalados}, .exe ok: ${st.ok}, sem opção de inicialização: ${st.semInfo.length} ${st.semInfo.slice(0, 5).join('; ')}, .exe não encontrado: ${st.semArq.length} ${st.semArq.slice(0, 5).join('; ')}`;
    return n;
  } catch (e) { steamExeInfo = 'ERRO ' + (e && e.stack || e); return 0; }
}
// Depois que um jogo da Steam fecha, a Steam grava o tempo novo no localconfig.vdf: puxa de la (sem contar em dobro)
function steamPlayRefresh(ids) {
  try {
    const pt = STL.steamLocalPlaytime(steamRoot); let ch = 0;
    for (const g of data.games) { if (!ids.includes(g.id) || !g.appid) continue; const p = pt[String(g.appid)] || {}; const mm = +p.playtime || 0, lp = +p.lastplayed || 0;
      if (mm > (g.steam_min || 0)) { g.steam_min = mm; ch++; } if (lp > (g.last_played || 0)) { g.last_played = lp; ch++; } }
    if (ch) save();
  } catch {}
}
let steamLocalInfo = '';
async function steamLocalImport() {
  await scanSteam();
  const have = new Set(data.games.filter(g => g.appid).map(g => g.appid)), ign = new Set(data.lIgnored || []);
  let novos = 0;
  for (const [appid, name] of steamNames) {
    if (have.has(appid) || ign.has('steam:' + appid) || appid === 228980 || /redistributable|steamworks common|steamvr|proton|steam linux runtime|dedicated server|sdk$/i.test(name)) continue;
    data.games.push({ id: rid(), name, appid, platform: 'Steam', genres: [], status: 'Backlog', review: '', exe: '', steam_min: 0, tracked_s: 0, manual_s: 0, last_played: 0, finished: null, added: now() });
    novos++;
  }
  // biblioteca completa (instalada ou nao) pelo cache local da Steam: nao depende da API nem da privacidade do perfil
  try {
    const r = STL.steamOwnedLocal(steamRoot); steamLocalInfo = r.why || `${r.games.length} jogo(s) na conta ${r.sid || ''}`;
    const by = new Map(data.games.filter(g => g.appid).map(g => [g.appid, g]));
    for (const s of r.games) {
      const g = by.get(s.appid);
      if (g) { if (!data.config.key && s.minutes > (g.steam_min || 0)) g.steam_min = s.minutes; if (s.last > (g.last_played || 0)) g.last_played = s.last; continue; }
      if (ign.has('steam:' + s.appid)) continue;
      const ng = { id: rid(), name: s.name, appid: s.appid, platform: 'Steam', genres: [], status: 'Backlog', review: '', exe: '', steam_min: s.minutes || 0, tracked_s: 0, manual_s: 0, last_played: s.last || 0, finished: null, added: now() };
      data.games.push(ng); by.set(s.appid, ng); novos++;
    }
    if (r.games.length && !(data.sidePlats || []).includes('Steam') && !(data.sideOff || []).includes('Steam')) data.sidePlats = [...(data.sidePlats || []), 'Steam'];
    save();
  } catch (e) { steamLocalInfo = 'erro ao ler o cache da Steam: ' + e.message; }
  if (steamNames.size && !(data.sidePlats || []).includes('Steam') && !(data.sideOff || []).includes('Steam')) data.sidePlats = [...(data.sidePlats || []), 'Steam'];
  if (novos) save();
  steamExeFill(); // de novo: inclui os jogos que acabaram de entrar (instalacao limpa)
  return novos;
}

// Outros launchers: importa os jogos instalados (sem duplicar) e guarda quais estao instalados agora
let launcherInst = new Set(), lchBusy = false; const coverQ = [];
async function launchersImport(opt = {}) {
  if (lchBusy) return { counts: {}, msg: 'Já estou procurando...' };
  lchBusy = true;
  try {
    const force = !!opt.force, side = data.sidePlats || LCH.SIDE_DEF;
    const want = opt.only ? LCH.NAMES.filter(x => x === opt.only) : (force || opt.discover) ? LCH.NAMES : side;
    const found = await LCH.scanAll(want), counts = {}, inst = new Set();
    if (force) { const ks = new Set(); for (const n of want) for (const f of found[n] || []) ks.add(f.key); data.lIgnored = (data.lIgnored || []).filter(k => !ks.has(k)); }
    const ign = new Set(data.lIgnored || []);
    const nzk = s => nzn(s);
    for (const n of LCH.NAMES.filter(x => want.includes(x))) {
      let novos = 0;
      for (const f of found[n] || []) {
        if (f.installed !== false) inst.add(f.key);
        let g = data.games.find(x => x.lkey === f.key) || data.games.find(x => !x.lkey && !x.appid && x.platform === n && nzk(x.name) === nzk(f.name));
        if (!g) {
          if (ign.has(f.key)) continue;
          g = { id: rid(), name: f.name, platform: n, genres: [], status: 'Backlog', review: '', exe: '', steam_min: 0, tracked_s: 0, manual_s: 0, last_played: 0, finished: null, added: now() };
          if (f.cover) coverQ.push([g.id, f.cover]);
          data.games.push(g); novos++;
        }
        if (f.minutes && f.minutes > (g.steam_min || 0)) g.steam_min = f.minutes;
        if (f.last && f.last > (g.last_played || 0)) g.last_played = f.last;
        g.lkey = f.key; if (f.uri) g.uri = f.uri;
        if (f.installed !== false && g.cat) delete g.cat; // reinstalou: volta para a barra lateral
        if (f.exe && (!g.exe || !fs.existsSync(g.exe))) g.exe = f.exe;
      }
      if ((force || (opt.discover && !(data.sideOff || []).includes(n))) && data.games.some(g => g.platform === n && !g.hidden) && !(data.sidePlats || []).includes(n)) data.sidePlats = [...(data.sidePlats || []), n];
      counts[n] = { total: (found[n] || []).length, novos, err: (found[n] && found[n].err) || found[n + '_err'] || '' };
    }
    launcherInst = inst; save();
    (async () => { while (coverQ.length) { const [id, u] = coverQ.shift(), g = data.games.find(x => x.id === id); if (g && !g.cover) { try { await wallSave(g, u, 'cover'); if (g.cover) g.sgc = 1; save(); } catch {} } } })();
    const novos = Object.values(counts).reduce((a, c) => a + c.novos, 0), total = Object.values(counts).reduce((a, c) => a + c.total, 0);
    const errs = Object.values(counts).map(c => c.err).filter(Boolean).join(' ');
    return { counts, msg: (total ? `Encontrei ${total} jogo(s) nos launchers (instalados ou não); ${novos} novo(s) na biblioteca.` : 'Não encontrei jogos nesses launchers.') + (errs ? ' ' + errs : '') };
  } finally { lchBusy = false; }
}

// Verificacao leve (a cada 90 s): so atualiza quais jogos ja cadastrados estao instalados. Sem biblioteca, sem PowerShell,
// sem Game Pass; so salva/avisa a tela quando algo realmente mudou.
async function launcherInstCheck() {
  if (lchBusy || refreshing) return;
  lchBusy = true;
  try {
    const want = (data.sidePlats || LCH.SIDE_DEF).filter(n => LCH.NAMES.includes(n) && n !== 'Game Pass');
    const found = await LCH.scanAll(want, { light: true }), inst = new Set([...launcherInst].filter(k => /^xbox:/.test(k)));
    let changed = false;
    for (const n of want) for (const f of found[n] || []) {
      if (f.installed === false) continue;
      const g = data.games.find(x => x.lkey === f.key); if (!g) continue;
      inst.add(f.key);
      if (f.exe && (!g.exe || !fs.existsSync(g.exe))) { g.exe = f.exe; changed = true; }
      if (f.uri && !g.uri) { g.uri = f.uri; changed = true; }
      if (g.cat) { delete g.cat; changed = true; }
    }
    const same = inst.size === launcherInst.size && [...inst].every(k => launcherInst.has(k));
    if (!same) launcherInst = inst;
    if (changed) save();
  } catch {} finally { lchBusy = false; }
}

const sgRaw = async p => {
  const r = await fetch('https://www.steamgriddb.com/api/v2' + p, { headers: { Authorization: 'Bearer ' + data.config.sgdb } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
};
const sg = async p => (await sgRaw(p)).data || [];
const sgBase = {};
// Uma pagina de capas 600x900 do SteamGridDB (50 por pagina)
async function sgPage(g, page, kind) {
  const L = kind === 'logo', H = kind === 'hero', Q = kind === 'square', pre = L ? '/logos' : H ? '/heroes' : '/grids';
  const key = g.id + '|' + g.name + '|' + (g.appid || '') + '|' + (L ? 'L' : H ? 'H' : 'G');
  // capas verticais: 600x900 e tambem 342x482 / 660x930 (o site mostra todas); humor e epilepsia incluidos, NSFW fica de fora
  const get = b => sgRaw(`${b}?${L || H ? '' : Q ? 'dimensions=512x512,1024x1024&' : 'dimensions=600x900,342x482,660x930&'}humor=any&epilepsy=any&nsfw=false&page=${page}`);
  let base = sgBase[key], j = null;
  if (base === undefined) {
    base = null;
    if (g.appid) { try { const x = await get(pre + '/steam/' + g.appid); if ((x.data || []).length) { base = pre + '/steam/' + g.appid; j = x; } } catch {} }
    if (!base) { const s = await sg('/search/autocomplete/' + encodeURIComponent(g.name)); if (s.length) { const hit = s.find(x => nzn(x.name || '') === nzn(g.name)) || s[0]; base = pre + '/game/' + hit.id; j = await get(base); } }
    sgBase[key] = base;
  }
  if (!base) return { items: [], page, total: 0, pages: 0, more: false };
  if (!j) j = await get(base);
  const d = j.data || [], limit = j.limit || 50, total = typeof j.total === 'number' ? j.total : null, pages = total != null ? Math.ceil(total / limit) : null;
  return { items: d.map(x => ({ url: x.url, thumb: x.thumb || x.url })), page, total, pages, more: pages != null ? page + 1 < pages : d.length >= limit };
}
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp' };


// Wallpaper escolhido na janela do Google Imagens
async function wallSave(g, src, kind = 'wall') {
  let buf, ext = '.jpg';
  if (src.startsWith('data:image')) { buf = Buffer.from(src.split(',')[1] || '', 'base64'); if (/^data:image\/png/.test(src)) ext = '.png'; }
  else {
    let u; try { u = new URL(src); } catch { return { error: 'Link inválido.' }; }
    const hn = u.hostname.toLowerCase();
    if (u.protocol !== 'https:' && u.protocol !== 'http:' || hn === 'localhost' || hn.includes(':') || /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hn)) return { error: 'Link não permitido.' };
    try {
      const r = await fetch(u.href, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', Referer: u.origin + '/', Accept: 'image/*' }, signal: AbortSignal.timeout(45000) });
      if (!r.ok) return { error: 'Esse site não deixou baixar a imagem (' + r.status + '). Tente outra.' };
      const ct = (r.headers.get('content-type') || '').toLowerCase(); if (!ct.startsWith('image/')) return { error: 'Esse link não é uma imagem. Tente outra.' };
      buf = Buffer.from(await r.arrayBuffer()); ext = ct.includes('png') ? '.png' : ct.includes('webp') ? '.webp' : '.jpg';
    } catch { return { error: 'Não consegui baixar essa imagem. Tente outra.' }; }
  }
  if (!buf || buf.length < (kind === 'logo' ? 800 : 5000) || buf.length > 60e6) return { error: 'Imagem inválida ou grande demais.' };
  fs.mkdirSync(COVERS(), { recursive: true });
  if (kind === 'cover') { rmCover(g); g.cover = `${g.id}-${Date.now()}${ext}`; fs.writeFileSync(path.join(COVERS(), g.cover), buf); }
  else if (kind === 'sq') { rmSq(g); g.sq = `${g.id}-sq-${Date.now()}${ext}`; fs.writeFileSync(path.join(COVERS(), g.sq), buf); }
  else if (kind === 'logo') { rmLogo(g); g.logo = `${g.id}-lg-${Date.now()}${ext}`; fs.writeFileSync(path.join(COVERS(), g.logo), buf); }
  else { rmWall(g); g.wall = `${g.id}-wp-${Date.now()}${ext}`; fs.writeFileSync(path.join(COVERS(), g.wall), buf); }
  save(); return { ok: true, file: kind === 'sq' ? g.sq : kind === 'logo' ? g.logo : kind === 'cover' ? g.cover : g.wall };
}


// "Atualizar": datas de todos os jogos da Steam (em lote); jogos manuais, de outros launchers ou removidos da Steam (sem data) buscam data/nota pelo nome no Metacritic.
// Datas editadas a mao (rel_manual) nunca sao trocadas; jogo sem resposta so e tentado de novo depois de 7 dias.
async function refreshAllInfo() {
  await batchRelease(data.games.filter(x => x.appid));
  const wk = 7 * 864e5, list = data.games.filter(g => g.name && (g.appid ? g.info4 && !g.released && !g.rel_manual : !g.released && !g.rel_manual) && !(g.mtry && Date.now() - g.mtry < wk));
  let n = 0;
  for (const g of list) {
    if (stopRefresh) break;
    msg = `Buscando datas de lançamento dos jogos adicionados... (${++n}/${list.length})`;
    try {
      let r = null; try { r = await mcInfo(g); } catch {}
      let rel = r && r.released;
      if (!rel && isPC(g.platform)) { try { const id = await steamSearchId(g.name, true); if (id) { const d = (await steamDetails(id)).data || {}; if (d.release_date) rel = parseRel(d.release_date.date); } } catch {} }
      if (rel && !g.released && !g.rel_manual) { g.released = rel; delete g.rel_why; }
      if (!(rel || g.released)) g.mtry = Date.now(); else delete g.mtry;
      save();
    } catch {}
    await sleep(500);
  }
}


// ---------- Emuladores (PCSX2) ----------
let emuBusy = false;
const PS2 = 'PlayStation 2';
const EMU_DEF_FLAGS = ['-batch', '-fullscreen', '-nogui'], EMU_DEF_EXTS = ['.iso', '.chd'];
const emuOf = id => (data.emus || []).find(x => x.id === id);
const emuArgs = (rom, flags, pos) => pos === 'before' && flags.length ? `${flags.join(' ')} "${rom}"` : `"${rom}"${flags.length ? ' ' + flags.join(' ') : ''}`;
const normExts = a => [...new Set((a || []).map(x => '.' + String(x).trim().toLowerCase().replace(/^\.+/, '').replace(/[^a-z0-9]/g, '')).filter(x => x.length > 1))];
function emuMigrate() {
  if (data.emu && !data.emus) data.emus = [{ id: 'pcsx2', name: 'PCSX2', platform: PS2, exe: data.emu.pcsx2 || '', roms: data.emu.roms || '', flags: Array.isArray(data.emu.flags) ? data.emu.flags : EMU_DEF_FLAGS, exts: Array.isArray(data.emu.exts) && data.emu.exts.length ? data.emu.exts : EMU_DEF_EXTS }];
  if (data.emus) for (const g of data.games || []) if (g.rom && !g.emu) g.emu = (data.emus[0] || {}).id || '';
}
const romTitle = f => { const n = path.basename(f).replace(new RegExp(path.extname(f).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'), '').replace(/[\[(][^\])]*[\])]/g, ' ').replace(/_+/g, ' ').replace(/\s+/g, ' ').replace(/\s*-\s*$/, '').trim(); return n || path.basename(f).replace(/\.(iso|chd)$/i, ''); };
function walkRoms(dir, depth, out, exts) {
  let es = []; try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of es) { const p = path.join(dir, e.name); if (e.isFile() && exts.includes(path.extname(e.name).toLowerCase())) out.push(p); else if (e.isDirectory() && depth < 4 && !/^(\$recycle\.bin|system volume information)$/i.test(e.name)) walkRoms(p, depth + 1, out, exts); }
  return out;
}
async function emuEnrich(g) {
  try { const r = await mcInfo(g); if (r) { if (r.released && !g.rel_manual) g.released = r.released; } } catch {}
  if (data.config.sgdb) {
    try { if (!g.cover) { const p = await sgPage(g, 0, 'cover'); if (p.items[0]) await wallSave(g, p.items[0].url, 'cover'); g.sgc = 1; } } catch {}
    try { if (!g.logo) { const p = await sgPage(g, 0, 'logo'); if (p.items[0]) await wallSave(g, p.items[0].url, 'logo'); g.sgl = 1; } } catch {}
  }
}
async function emuImport(id) {
  const c = emuOf(id);
  if (!c) return;
  if (!c.exe || !fs.existsSync(c.exe)) { msg = `${c.name}: escolha o executável do emulador primeiro.`; return; }
  if (!c.roms || !isDirP(c.roms)) { msg = `${c.name}: escolha a pasta das ROMs primeiro.`; return; }
  if (!c.exts || !c.exts.length) { msg = `${c.name}: adicione pelo menos um formato de ROM.`; return; }
  emuBusy = true;
  try {
    const have = new Set(data.games.filter(g => g.rom).map(g => g.rom.toLowerCase()));
    const files = walkRoms(c.roms, 0, [], c.exts).filter(f => !have.has(f.toLowerCase()));
    const fresh = [];
    for (const f of files) {
      const g = { id: rid(), name: romTitle(f), platform: c.platform, genres: [], status: 'Backlog', review: '', exe: c.exe, cwd: path.dirname(c.exe) + path.sep, args: emuArgs(f, c.flags || [], c.pos), rom: f, emu: c.id, steam_min: 0, tracked_s: 0, manual_s: 0, last_played: 0, finished: null, added: now() };
      data.games.push(g); fresh.push(g);
    }
    if (fresh.length) { data.sideCons = data.sideCons || []; if (!data.sideCons.includes(c.platform)) data.sideCons.push(c.platform); }
    save();
    let n = 0;
    for (const g of fresh) { msg = `${c.name}: buscando dados dos jogos... (${++n}/${fresh.length}) ${g.name}`; await emuEnrich(g); save(); await sleep(400); }
    msg = fresh.length ? `${c.name}: ${fresh.length} jogo(s) importado(s).` : `${c.name}: nenhum jogo novo encontrado na pasta.`;
  } catch (e) { msg = `${c.name}: erro ao importar (${e.message})`; }
  finally { emuBusy = false; }
}

// Preenche capa e logo do SteamGridDB so nos jogos que ainda nao tem (nao mexe nos ja definidos nem refaz os ja tentados)
async function sgFill() {
  if (!data.config.sgdb) return;
  const todo = data.games.filter(g => (!g.cover && !g.sgc) || (!g.logo && !g.sgl));
  let n = 0;
  for (const g of todo) {
    if (stopRefresh) break;
    try {
      msg = `Buscando capas e logos no SteamGridDB... (${++n}/${todo.length})`;
      if (!g.cover && !g.sgc) { const r = await sgPage(g, 0, 'cover'); if (r.items[0]) await wallSave(g, r.items[0].url, 'cover'); g.sgc = 1; }
      if (!g.logo && !g.sgl) { const r = await sgPage(g, 0, 'logo'); if (r.items[0]) await wallSave(g, r.items[0].url, 'logo'); g.sgl = 1; }
      save(); await sleep(250);
    } catch (e) { if (/401|403/.test(e.message || '')) break; }
  }
  save();
}
ipcMain.on('wall-close', () => { if (wpWin && !wpWin.isDestroyed()) wpWin.close(); if (win && !win.isDestroyed()) { win.show(); win.focus(); } });
ipcMain.on('wall-pick', async (e, p) => {
  const g = data.games.find(x => x.id === wpGame) || (wpGame === 'novo' ? { id: 'tmp' } : null); if (!g || !p || typeof p.src !== 'string') return;
  const r = await wallSave(g, p.src);
  if (r.error) { dialog.showMessageBox(wpWin && !wpWin.isDestroyed() ? wpWin : win, { type: 'warning', message: r.error }); return; }
  if (wpWin && !wpWin.isDestroyed()) wpWin.close();
  if (win && !win.isDestroyed()) { win.webContents.executeJavaScript('wallDone(' + JSON.stringify(wpGame === 'novo' ? (r.file || '') : '') + ')').catch(() => {}); win.show(); win.focus(); }
});

ipcMain.handle('api', async (_e, p, b) => {
  const g = find(b.id);
  switch (p) {
    case 'state': return { version: app.getVersion(), games: data.games, lists: data.lists, running: [...running], inst: data.games.filter(g => (g.appid && steamApps.has(g.appid)) || (g.lkey && launcherInst.has(g.lkey))).map(g => g.id), coversDir: COVERS(), updNew: data.updNotify === false ? null : UPDNEW, top5: (data.top5 || []).filter(id => data.games.some(g => g.id === id)).slice(0, 5),
      config: { stNames: data.stNames || {}, updNotify: data.updNotify !== false, autoRefresh: data.autoRefresh !== false, key: data.config.key || '', steamid: data.config.steamid || '', sgdb: data.config.sgdb || '', fam: data.config.fam || '', famOn: !!data.config.famOn, gh: data.config.gh || '', emus: data.emus || [], emuBusy, startup: (() => { try { return !!app.getLoginItemSettings({ args: ['--startup'] }).openAtLogin; } catch { return false; } })(), startMin: data.startMin !== false, ghRepo: data.config.ghRepo || '' }, dataDir: app.getPath('userData'), platforms: data.platforms || [], plHidden: data.plHidden || [], gHidden: data.gHidden || [], sidePlats: data.sidePlats || LCH.SIDE_DEF, sideCons: data.sideCons || [], plNames: data.plNames || {}, gExtra: data.gExtra || [], pending: busy ? data.games.filter(needInfo).length : 0, refreshing, msg };
    case 'save': {
      let x = g;
      if (x && 'exe' in b && b.exe !== x.exe) delete x.exeAuto; // .exe escolhido a mao: o app nao mexe mais
      if (!x) { x = { id: rid(), steam_min: 0, tracked_s: 0, manual_s: 0, last_played: 0, finished: null, added: now() }; data.games.push(x); }
      for (const k of ['name', 'platform', 'genres', 'status', 'score', 'replays', 'review', 'exe', 'meta', 'meta_url', 'tracked_s', 'manual_s', 'hidden', 'cat', 'finished', 'released', 'sortname', 'fav', 'proc', 'cwd', 'args', 'rom', 'emu', 'logoSize', 'logoX', 'logoY', 'logoHide', 'bpLogoSize', 'bpLogoX', 'bpLogoY']) if (k in b) x[k] = b[k];
      if ('released' in b) x.rel_manual = b.released != null;
      if (data.gHidden && b.genres) data.gHidden = data.gHidden.filter(n => !b.genres.includes(n));
      if (x.score == null) delete x.score; if (!Array.isArray(x.replays) || !x.replays.length) delete x.replays;
      if (x.status === 'Zerado' && !x.finished) x.finished = now(); else if (x.status !== 'Zerado') x.finished = null;
      save(); return { ok: true, id: x.id };
    }
    case 'games_del': {
      const ids = new Set((b.ids || []).map(String));
      for (const x of data.games) if (ids.has(x.id)) { rmCover(x); rmWall(x); rmLogo(x); rmSq(x); if (x.lkey) data.lIgnored = [...new Set([...(data.lIgnored || []), x.lkey])]; if (x.appid) data.lIgnored = [...new Set([...(data.lIgnored || []), 'steam:' + x.appid])]; }
      data.games = data.games.filter(x => !ids.has(x.id)); data.lists.forEach(l => l.ids = l.ids.filter(i => !ids.has(i))); save(); return { ok: true, n: ids.size };
    }
    case 'delete': if (g) { rmCover(g); rmWall(g); rmLogo(g); rmSq(g); if (g.lkey) data.lIgnored = [...new Set([...(data.lIgnored || []), g.lkey])]; if (g.appid) data.lIgnored = [...new Set([...(data.lIgnored || []), 'steam:' + g.appid])]; } data.games = data.games.filter(x => x.id !== b.id); data.lists.forEach(l => l.ids = l.ids.filter(i => i !== b.id)); save(); return { ok: true };
    case 'config': data.config = { key: String(b.key || '').trim(), steamid: String(b.steamid || '').trim(), sgdb: b.sgdb || '', fam: b.fam || '', famOn: !!b.famOn, gh: b.gh || '', ghRepo: (b.ghRepo || '').trim() }; save(); return { ok: true };
    case 'sync': if (!data.config.key || !data.config.steamid) { msg = 'Preencha a chave da API e o SteamID da Steam.'; return { ok: true }; } msg = 'Sincronizando...'; steamSync(); return { ok: true };
    case 'refresh_stop': if (refreshing || busy) { stopRefresh = true; msg = 'Parando...'; } return { ok: true };
    case 'refresh': { stopRefresh = false; if (b.full) for (const x of data.games) x.info4 = false; save(); msg = 'Atualizando...'; refreshing = true; steamSync().finally(async () => { try { msg = 'Procurando jogos nos launchers...'; const lr = await launchersImport({ discover: true }); if (lr && lr.msg) msg = lr.msg; } catch {} try { const sn = await steamLocalImport(); if (sn) msg += ` Steam: ${sn} jogo(s) instalado(s) novo(s).`; } catch {} try { await sgFill(); } catch {} try { await fillInfo(); } catch {} try { await refreshAllInfo(); } catch {} refreshing = false; if (stopRefresh) msg = 'Atualização interrompida.'; stopRefresh = false; }); return { ok: true }; }
    case 'side_set': {
      const ok = new Set(LCH.CATALOG), prev = data.sidePlats || []; data.sidePlats = [...new Set((b.list || []).filter(x => ok.has(x)))];
      const off = new Set(data.sideOff || []); for (const x of prev) if (!data.sidePlats.includes(x)) off.add(x); for (const x of data.sidePlats) off.delete(x); data.sideOff = [...off]; save(); return { ok: true };
    }
    case 'pl_rename': {
      const n = String(b.name || '').slice(0, 60), l = String(b.label || '').trim().slice(0, 40); if (!n) return { ok: false };
      data.plNames = data.plNames || {};
      if (!l || l === n) delete data.plNames[n]; else data.plNames[n] = l;
      save(); return { ok: true };
    }
    case 'side_set2': {
      data.sideCons = [...new Set((b.list || []).filter(x => typeof x === 'string' && x.length && x.length < 40))]; save(); return { ok: true };
    }
    case 'steam_test': try { return await steamTest(b.key, b.steamid); } catch (e) { return { ok: false, lines: ['✗ ' + e.message] }; }
    case 'diag': try { const f = await diagReport(); shell.showItemInFolder(f); return { ok: true, file: f }; } catch (e) { return { error: e.message }; }
    case 'launch_scan': try { return await launchersImport({ force: !!b.force, only: b.only || null }); } catch (e) { return { counts: {}, msg: 'Erro ao procurar: ' + e.message }; }
    case 'upd_check': try { return await updCheck(); } catch (e) { return { ok: false, msg: 'Sem conexão com o GitHub: ' + e.message }; }
    case 'upd_prog': return UPD;
    case 'upd_install': try { return await updInstall(); } catch (e) { return { ok: false, msg: 'Erro: ' + e.message }; }
    case 'open_data': shell.openPath(app.getPath('userData')); return { ok: true };
    case 'pick': {
      const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Executável ou script', extensions: ['exe', 'bat', 'cmd'] }, { name: 'Todos', extensions: ['*'] }] });
      return { path: r.canceled ? '' : r.filePaths[0] };
    }
    case 'emu_save': {
      data.emus = data.emus || [];
      let c = emuOf(b.id), old = null, oldPos = null;
      if (!c) { c = { id: rid(), name: 'Novo emulador', platform: PS2, exe: '', roms: '', flags: [], exts: [] }; data.emus.push(c); }
      else { old = [...(c.flags || [])]; oldPos = c.pos; }
      const q = v => String(v || '').replace(/^"+|"+$/g, '').trim();
      if ('name' in b) c.name = String(b.name || '').trim() || c.name;
      if ('platform' in b && b.platform) c.platform = String(b.platform);
      if ('exe' in b) c.exe = q(b.exe);
      if ('roms' in b) c.roms = q(b.roms);
      if (b.pos === 'before' || b.pos === 'after') c.pos = b.pos;
      if (Array.isArray(b.flags)) c.flags = b.flags.map(x => String(x).trim()).filter(Boolean);
      if (Array.isArray(b.exts)) c.exts = normExts(b.exts);
      // jogos importados que ainda usam o comando padrao antigo acompanham a mudanca
      if (old && (JSON.stringify(old) !== JSON.stringify(c.flags) || oldPos !== c.pos)) for (const g of data.games) if (g.rom && g.emu === c.id && g.args === emuArgs(g.rom, old, oldPos)) g.args = emuArgs(g.rom, c.flags, c.pos);
      save(); return { ok: true, id: c.id };
    }
    case 'top5_set': { const ok = new Set(data.games.map(g => g.id)); data.top5 = [...new Set((b.ids || []).filter(id => ok.has(id)))].slice(0, 5); save(); return { ok: true }; }
    case 'emu_del': { data.emus = (data.emus || []).filter(x => x.id !== b.id); save(); return { ok: true }; }
    case 'emu_import': { if (emuBusy) return { ok: true }; const c = emuOf(b.id); msg = (c ? c.name : 'Emulador') + ': procurando ROMs...'; emuImport(b.id); return { ok: true }; }
    case 'pick_rom': { const c = emuOf(b.id) || {}; const r = await dialog.showOpenDialog(win, { properties: ['openFile'], defaultPath: c.roms && isDirP(c.roms) ? c.roms : undefined, filters: [{ name: 'ROM', extensions: (c.exts && c.exts.length ? c.exts : EMU_DEF_EXTS).map(x => x.slice(1)) }, { name: 'Todos', extensions: ['*'] }] }); return { path: r.canceled ? '' : r.filePaths[0] }; }
    case 'st_names': { const o = {}; for (const [k, v] of Object.entries(b.names || {})) if (['Backlog', 'Jogando', 'Zerado', 'Pausado', 'Abandonado'].includes(k) && typeof v === 'string' && v.trim()) o[k] = v.trim().slice(0, 24); data.stNames = o; save(); return { ok: true }; }
    case 'auto_refresh_set': data.autoRefresh = !!b.on; save(); return { ok: true };
    case 'upd_notify_set': data.updNotify = !!b.on; if (!b.on) UPDNEW = null; save(); if (b.on) updWatch(); return { ok: true };
    case 'startup_set': {
      data.startMin = b.min !== false; save();
      try { app.setLoginItemSettings({ openAtLogin: !!b.on, args: ['--startup'] }); } catch {}
      return { ok: true };
    }
    case 'pick_dir': {
      const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'], defaultPath: b.start && fs.existsSync(b.start) ? b.start : undefined });
      return { path: r.canceled ? '' : r.filePaths[0] };
    }
    case 'play': {
      if (!g) return {};
      if (b.install && g.appid && !steamApps.has(g.appid)) { await shell.openExternal('steam://install/' + g.appid); return { ok: true }; }
      if (b.install && g.lkey && !launcherInst.has(g.lkey)) { const id = g.lkey.split(':')[1] || ''; if (g.platform === 'GOG' && /^\d+$/.test(id)) { await shell.openExternal('goggalaxy://openGameView/' + id); return { ok: true }; } if (g.uri) { if (/^shell:/i.test(g.uri)) cp.spawn('explorer.exe', [g.uri], { detached: true, stdio: 'ignore' }).unref(); else await shell.openExternal(g.uri); return { ok: true }; } return { error: 'Abra o launcher dele para instalar.' }; }
      if (g.lkey && !g.appid && !launcherInst.has(g.lkey) && !(g.exe && fs.existsSync(g.exe)) && !g.uri) {
        const id = g.lkey.split(':')[1] || '';
        if (g.platform === 'GOG' && /^\d+$/.test(id)) { try { await shell.openExternal('goggalaxy://openGameView/' + id); } catch {} return { ok: true }; }
        return { error: 'Instale o jogo antes de jogar (ele ainda não está instalado no launcher).' };
      }
      if (g.uri && g.lkey && (launcherInst.has(g.lkey) || !g.exe || !fs.existsSync(g.exe))) {
        if (/^shell:/i.test(g.uri)) cp.spawn('explorer.exe', [g.uri], { detached: true, stdio: 'ignore' }).unref(); else await shell.openExternal(g.uri);
      }
      else if (g.appid && (g.exeAuto || !g.exe)) {
        const a = String(g.args || '').trim();
        await shell.openExternal(a ? `steam://run/${g.appid}//${encodeURIComponent(a)}/` : 'steam://rungameid/' + g.appid);
      }
      else if (g.exe && fs.existsSync(g.exe)) {
        const cwd = g.cwd && isDirP(g.cwd) ? g.cwd : '', args = parseArgs(g.args);
        if (args.length || (cwd && cwd.replace(/[\\/]+$/, '').toLowerCase() !== path.dirname(g.exe).toLowerCase())) {
          const ok = await new Promise(res => {
            try {
              const bat = /\.(bat|cmd)$/i.test(g.exe);
              const c = bat ? cp.spawn('cmd.exe', ['/c', '"' + g.exe + '"', ...args.map(a => /\s/.test(a) ? '"' + a + '"' : a)], { cwd: cwd || path.dirname(g.exe), detached: true, stdio: 'ignore', windowsVerbatimArguments: true })
                : cp.spawn(g.exe, args, { cwd: cwd || path.dirname(g.exe), detached: true, stdio: 'ignore' });
              c.once('error', () => res(false)); c.once('spawn', () => { c.unref(); res(true); });
            } catch { res(false); }
          });
          if (!ok) { const e = await shell.openPath(g.exe); if (e) return { error: e }; }
        } else { const e = await shell.openPath(g.exe); if (e) return { error: e }; }
      }
      else if (g.appid) await shell.openExternal('steam://rungameid/' + g.appid);
      else return { error: 'Vincule o executável (.exe) do jogo para poder jogar por aqui.' };
      // Com .exe/processo vinculado, 'Ultimo jogo' e o status so mudam quando o jogo realmente abrir (o track() detecta)
      if (!(g.proc || (g.exe && !/\.(bat|cmd)$/i.test(g.exe)))) { if (g.status === 'Backlog' || g.status === 'Pausado') g.status = 'Jogando'; g.last_played = now(); }
      save(); setTimeout(track, 4000); return { ok: true };
    }
    case 'bp_full': if (win) { win.setFullScreen(!!b.on); } return { ok: true };
    case 'pad_info': return { ok: PAD.ok, err: PAD.err, sdl: PAD.sdl, pads: PAD.pads };
    case 'stop': {
      if (!g || !g.exe) return { error: 'Esse jogo não tem .exe vinculado.' };
      const pn = (g.proc || path.win32.basename(g.exe)).replace(/"/g, '');
      const vivo = () => new Promise(r => cp.execFile('tasklist', ['/fi', `IMAGENAME eq ${pn}`, '/fo', 'csv', '/nh'], { windowsHide: true }, (e, o) => r(!e && String(o).toLowerCase().includes('"' + pn.toLowerCase() + '"'))));
      const kill = f => new Promise(r => cp.execFile('taskkill', [...(f ? ['/F'] : []), '/T', '/IM', pn], { windowsHide: true }, () => r()));
      await kill(false);
      for (let i = 0; i < 10 && await vivo(); i++) await new Promise(r => setTimeout(r, 500));
      if (await vivo()) { await kill(true); await new Promise(r => setTimeout(r, 1200)); }
      if (await vivo()) return { error: 'Não consegui fechar o jogo (ele pode estar protegido por anticheat).' };
      setTimeout(track, 500); return { ok: true };
    }
    case 'list_save': {
      const l = data.lists.find(x => x.id === b.id);
      if (l) { if (b.name) l.name = b.name; if ('ranked' in b) l.ranked = !!b.ranked; } else data.lists.push({ id: rid(), name: b.name, ids: b.ids || [], ranked: true });
      save(); return { ok: true };
    }
    case 'list_delete': data.lists = data.lists.filter(x => x.id !== b.id); save(); return { ok: true };
    case 'list_order': {
      const l = data.lists.find(x => x.id === b.id); if (!l) return {};
      const set = new Set(l.ids), ord = (b.ids || []).filter(i => set.has(i));
      l.ids = [...ord, ...l.ids.filter(i => !ord.includes(i))]; save(); return { ok: true };
    }
    case 'list_toggle': {
      const l = data.lists.find(x => x.id === b.list); if (!l) return {};
      l.ids = l.ids.includes(b.game) ? l.ids.filter(i => i !== b.game) : [...l.ids, b.game]; save(); return { ok: true };
    }
    case 'bt_batt': {
      if (process.platform !== 'win32') return { list: [] };
      if (BTB.t && Date.now() - BTB.t < 20000 && !b.force) return { list: BTB.list };
      if (!BTB.p) BTB.p = new Promise(res => {
        const ps = "$k='{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2';$o=@();Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object { $_.InstanceId -match '^(BTHENUM|BTHLE|BTHLEDEVICE|BTHHFENUM)' } | ForEach-Object { $d=$_; $b=(Get-PnpDeviceProperty -InstanceId $d.InstanceId -KeyName $k -ErrorAction SilentlyContinue).Data; if ($b -ne $null) { $o += [pscustomobject]@{n=$d.FriendlyName;b=[int]$b;c=[string]$d.Class;s=[string]$d.Status} } }; ConvertTo-Json -Compress -InputObject @($o)";
        cp.execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { windowsHide: true, timeout: 25000, maxBuffer: 4e6 }, (e, out) => {
          let list = []; try { const j = JSON.parse(String(out || '').trim() || '[]'); list = (Array.isArray(j) ? j : [j]).filter(x => x && x.n && x.s === 'OK'); } catch {}
          const clean = n => String(n).replace(/\s+(Hands-?Free( AG)?( Audio)?|Stereo|Avrcp Transport|A2DP|LE|AG Audio)\s*$/i, '').trim();
          const by = new Map(); for (const x of list) { const n = clean(x.n), k = n.toLowerCase(); const cur = by.get(k); if (!cur || (x.b > 0 && cur.b === 0)) by.set(k, { name: n, battery: x.b, cls: x.c }); }
          BTB.list = [...by.values()]; BTB.t = Date.now(); BTB.p = null; res();
        });
      });
      await BTB.p; return { list: BTB.list };
    }
    case 'snd_pick': {
      const ev = String(b.ev || '').replace(/[^a-z]/g, '').slice(0, 12) || 'som';
      const r = await dialog.showOpenDialog(win, { title: 'Escolher som', properties: ['openFile'], filters: [{ name: 'Áudio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'opus', 'webm'] }] });
      if (r.canceled || !r.filePaths[0]) return {};
      const src = r.filePaths[0]; if (fs.statSync(src).size > 15e6) return { error: 'Arquivo grande demais (máx. 15 MB).' };
      const dir = path.join(app.getPath('userData'), 'sons'); fs.mkdirSync(dir, { recursive: true });
      for (const f of fs.readdirSync(dir)) if (f.startsWith(ev + '-')) try { fs.unlinkSync(path.join(dir, f)); } catch {}
      const dst = path.join(dir, `${ev}-${Date.now()}-${path.basename(src).replace(/[^\w.\- ]+/g, '_')}`); fs.copyFileSync(src, dst);
      return { url: require('url').pathToFileURL(dst).href };
    }
    case 'pick_img': {
      const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Imagens', extensions: Object.keys(MIME) }] });
      if (r.canceled) return {};
      const f = r.filePaths[0];
      return { data: `data:${MIME[path.extname(f).slice(1).toLowerCase()] || 'image/png'};base64,${fs.readFileSync(f).toString('base64')}` };
    }
    case 'img_b64': {
      try {
        const u = String(b.url || ''); let buf, ct = 'image/jpeg';
        if (/^file:/i.test(u)) { const p = require('url').fileURLToPath(u); if (path.dirname(p).toLowerCase() !== COVERS().toLowerCase()) return { error: 'x' }; buf = fs.readFileSync(p); ct = /\.png$/i.test(p) ? 'image/png' : /\.webp$/i.test(p) ? 'image/webp' : 'image/jpeg'; }
        else { const r = await fetch(u); if (!r.ok) throw 0; ct = r.headers.get('content-type') || ct; buf = Buffer.from(await r.arrayBuffer()); }
        return { data: `data:${ct};base64,${buf.toString('base64')}` };
      } catch { return { error: 'img' }; }
    }
    case 'save_img': {
      const ext = b.ext === 'jpg' ? 'jpg' : 'png', nm = String(b.name || 'lista').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || 'lista';
      const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('pictures'), nm + '.' + ext), filters: [{ name: ext === 'jpg' ? 'JPEG' : 'PNG', extensions: [ext] }] });
      if (r.canceled || !r.filePath) return { canceled: true };
      fs.writeFileSync(r.filePath, Buffer.from(String(b.data).split(',')[1] || '', 'base64')); shell.showItemInFolder(r.filePath); return { ok: true, path: r.filePath };
    }
    case 'fetch_img': {
      try { const r = await fetch(b.url); if (!r.ok) throw 0; return { data: `data:${r.headers.get('content-type') || 'image/jpeg'};base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}` }; }
      catch { return { error: 'Falha ao baixar a imagem.' }; }
    }
    case 'cover_data': {
      if (!g) return {};
      fs.mkdirSync(COVERS(), { recursive: true }); rmCover(g);
      g.cover = `${g.id}-${Date.now()}.jpg`;
      fs.writeFileSync(path.join(COVERS(), g.cover), Buffer.from(b.data.split(',')[1], 'base64')); g.sgc = 1; save(); return { ok: true };
    }
    case 'wall_open': {
      if (!g && b.id !== 'novo') return { error: 'Salve o jogo primeiro.' };
      const R = { '1080': '1920x1080', '1440': '2560x1440', '2160': '3840x2160', 'uw1080': '2560x1080', 'uw1440': '3440x1440', 'uw2160': '5120x2160' };
      const q = String(b.q || (g && g.name) || '').trim() + ' wallpaper imagesize:' + (R[b.res] || R['1080']);
      wpGame = g ? g.id : 'novo';
      if (!wpWin || wpWin.isDestroyed()) {
        wpWin = new BrowserWindow({ width: 1280, height: 860, title: 'Google Imagens - escolha o wallpaper', autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'wallpre.js'), contextIsolation: false, sandbox: false, partition: 'persist:google' } });
        wpWin.webContents.setUserAgent(wpWin.webContents.getUserAgent().replace(/\s?(Electron|registrando-games)\/\S+/gi, ''));
        wpWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        wpWin.on('closed', () => { wpWin = null; });
      }
      wpWin.loadURL('https://www.google.com/search?tbm=isch&hl=pt-BR&q=' + encodeURIComponent(q));
      if (b.bp) wpWin.setFullScreen(true);
      wpWin.show(); wpWin.focus(); return { ok: true };
    }
    case 'logo_set': { if (!g) return { error: 'Salve o jogo primeiro.' }; try { if (!/^https:\/\/[a-z0-9.-]*steamgriddb\.com\//i.test(String(b.url))) return { error: 'Link não permitido.' }; } catch {} return await wallSave(g, b.url, 'logo'); }
    case 'wall_attach': { if (!g || !/^tmp-wp-\d+\.\w+$/.test(String(b.file || ''))) return { ok: false }; const src = path.join(COVERS(), b.file); if (!fs.existsSync(src)) return { ok: false }; rmWall(g); g.wall = `${g.id}-wp-${Date.now()}${path.extname(b.file)}`; fs.renameSync(src, path.join(COVERS(), g.wall)); save(); return { ok: true }; }
    case 'img_local': { if (!g) return { error: 'Salve o jogo primeiro.' }; if (!/^data:image\//.test(String(b.data || '')) || !['logo', 'wall'].includes(b.kind)) return { error: 'Imagem inválida.' }; return await wallSave(g, b.data, b.kind); }
    case 'sq_sgdb': { if (!g) return { error: 'Jogo não encontrado.' }; if (!/^https:\/\/[a-z0-9.-]*steamgriddb\.com\//i.test(String(b.url))) return { error: 'Link não permitido.' }; return await wallSave(g, b.url, 'sq'); }
    case 'sq_clear': if (g) { rmSq(g); save(); } return { ok: true };
    case 'wall_sgdb': { if (!g) return { error: 'Jogo não encontrado.' }; if (!/^https:\/\/[a-z0-9.-]*steamgriddb\.com\//i.test(String(b.url))) return { error: 'Link não permitido.' }; return await wallSave(g, b.url, 'wall'); }
    case 'logo_clear': if (g) { rmLogo(g); g.sgl = 1; save(); } return { ok: true };
    case 'wall_clear': if (g) { rmWall(g); save(); } return { ok: true };
    case 'cover_clear': if (g) { rmCover(g); g.sgc = 1; save(); } return { ok: true };
    case 'sgdb': {
      if (!g && !(b.id === 'novo' && (b.q || '').trim())) return {};
      if (!data.config.sgdb) return { error: 'Cole sua chave do SteamGridDB em Configurações.' };
      try {
        if (!g) { if (!data.config.sgdb) return { error: 'Cole sua chave do SteamGridDB em Configurações.' }; return await sgPage({ id: 'novo', name: (b.q || '').trim() }, b.page || 0, b.kind); }
        let t = g; const q = (b.q || '').trim();
        if (q && nzn(q) !== nzn(g.name)) { t = { ...g, name: q, appid: null }; if (!b.page) { g.sgname = q; save(); } }
        else if (!b.page && g.sgname) { delete g.sgname; save(); }
        return await sgPage(t, b.page || 0, b.kind);
      }
      catch (e) { return { error: e.message.includes('401') ? 'Chave do SteamGridDB inválida. Confira em Configurações.' : 'SteamGridDB: ' + e.message }; }
    }
    case 'platform_add': {
      const n = (b.name || '').trim(); data.platforms = data.platforms || [];
      if (n && !data.platforms.some(p => p.toLowerCase() === n.toLowerCase())) data.platforms.push(n);
      data.plHidden = (data.plHidden || []).filter(p => p.toLowerCase() !== n.toLowerCase());
      save(); return { ok: true };
    }
    case 'genre_add': {
      const n = (b.name || '').trim(); if (!n) return { ok: false };
      data.gExtra = data.gExtra || [];
      if (!data.gExtra.some(x => x.toLowerCase() === n.toLowerCase())) data.gExtra.push(n);
      data.gHidden = (data.gHidden || []).filter(x => x.toLowerCase() !== n.toLowerCase());
      save(); return { ok: true };
    }
    case 'genre_del': {
      const n = (b.name || '').trim(); if (!n) return { ok: false };
      data.gHidden = [...new Set([...(data.gHidden || []), n])]; data.gExtra = (data.gExtra || []).filter(x => x !== n);
      for (const g of data.games) if ((g.genres || []).includes(n)) g.genres = g.genres.filter(x => x !== n);
      save(); return { ok: true };
    }
    case 'platform_del': {
      const n = (b.name || '').trim(); if (!n) return { ok: false };
      data.platforms = (data.platforms || []).filter(p => p !== n);
      data.plHidden = [...new Set([...(data.plHidden || []), n])];
      save(); return { ok: true };
    }
    case 'sgdb_test': {
      if (!data.config.sgdb) return { msg: 'Cole a chave primeiro.' };
      try { await sg('/search/autocomplete/zelda'); return { msg: 'Chave válida ✔' }; }
      catch (e) { return { msg: e.message.includes('401') ? 'Chave inválida.' : 'Falha ao testar: ' + e.message }; }
    }
    case 'meta': {
      try {
        const r = await scoreFor({ ...(g || {}), name: b.name || (g || {}).name, platform: b.platform || (g || {}).platform });
        if (r.score != null) return { meta: r.score, url: r.url, note: r.note };
        return { error: 'Não achei a nota do Metacritic para esse jogo. Você pode digitar manualmente.' };
      } catch (e) { return { error: 'Falha ao buscar: ' + e.message }; }
    }
    case 'reldate': {
      try {
        const t = { ...(g || {}), name: b.name || (g || {}).name, platform: b.platform || (g || {}).platform };
        let r = null; try { r = await mcInfo(t); } catch {}
        if (r && r.released) return { released: r.released, from: 'Metacritic' };
        let id = t.appid; if (!id && isPC(t.platform)) id = await steamSearchId(t.name, true);
        if (id) { const d = (await steamDetails(id)).data || {}, x = d.release_date && parseRel(d.release_date.date); if (x) return { released: x, from: 'loja Steam (o Metacritic não respondeu)' }; }
        return { error: 'Não achei a data de lançamento para esse jogo.' };
      } catch (e) { return { error: 'Falha ao buscar: ' + e.message }; }
    }
    case 'lookup': {
      try {
        const o = await lookup({ name: b.name, platform: b.platform });
        return (o.meta != null || o.released || o.cover) ? o : { error: 'Não encontrei dados para esse nome.' };
      } catch (e) { return { error: 'Falha ao buscar: ' + e.message }; }
    }
    case 'list_add': {
      const l = data.lists.find(x => x.id === b.id); if (!l) return {};
      for (const i of b.ids || []) if (!l.ids.includes(i)) l.ids.push(i);
      save(); return { ok: true };
    }
  }
});

// ---- Controles (SDL3 num processo separado) ----
const BTB = { t: 0, list: [], p: null };
const PAD = { ok: false, err: '', sdl: '', pads: [], proc: null, tries: 0 };
function padStart() {
  try {
    const pr = utilityProcess.fork(path.join(__dirname, 'pad.js'), [], { serviceName: 'Registrando Games - Controles', stdio: 'ignore' });
    PAD.proc = pr;
    pr.on('message', m => {
      if (!m || !m.t) return;
      if (m.t === 'ok') { PAD.ok = true; PAD.sdl = m.sdl || ''; return; }
      if (m.t === 'fail') { PAD.ok = false; PAD.err = m.err || 'falhou'; PAD.tries = 99; return; }
      if (m.t === 'conn') { PAD.pads = PAD.pads.filter(x => x.id !== m.id).concat({ id: m.id, name: m.name, type: m.type, south: m.south, power: m.power || null }); }
      if (m.t === 'pow') { const x = PAD.pads.find(y => y.id === m.id); if (x) x.power = m.power; }
      if (m.t === 'disc') { PAD.pads = PAD.pads.filter(x => x.id !== m.id); }
      if (!win || win.isDestroyed()) return;
      // Janela do Google Imagens (wallpaper) aberta pelo Big Picture: o controle navega nela
      if ((m.t === 'down' || m.t === 'up') && wpWin && !wpWin.isDestroyed() && wpWin.isFocused()) { wpWin.webContents.send('pad', m); return; }
      // So repassa os botoes (inclusive o Home) quando o app esta em primeiro plano
      if ((m.t === 'down' || m.t === 'up') && !win.isFocused()) return;
      win.webContents.send('pad', m);
    });
    pr.on('exit', () => { PAD.ok = false; PAD.proc = null; PAD.pads = []; if (++PAD.tries <= 3 && !quitting) setTimeout(padStart, 3000); });
  } catch (e) { PAD.err = String((e && e.message) || e); }
}

function show() { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } }
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', show);
app.whenReady().then(() => {
  load();
  win = new BrowserWindow({ width: 1240, height: 800, minWidth: 760, minHeight: 520, title: 'Registrando Games',
    icon: path.join(__dirname, 'icon.png'), autoHideMenuBar: true, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true } });
  win.setMenu(null);
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.loadFile(path.join(__dirname, 'index.html'));
  setTimeout(updWatch, 8000); setInterval(updWatch, 30 * 60 * 1000);
  const fromStartup = process.argv.includes('--startup');
  win.once('ready-to-show', () => { if (fromStartup && data.startMin !== false) { win.showInactive(); win.minimize(); } else win.show(); });
  win.on('close', e => { if (!quitting) { e.preventDefault(); win.minimize(); } });
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'icon.png')).resize({ width: 16, height: 16 }));
  tray.setToolTip('Registrando Games');
  tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Abrir', click: show }, { label: 'Sair', click: () => { quitting = true; save(); app.quit(); } }]));
  tray.on('click', show);
  setInterval(track, 5000);
  padStart();
  scanSteam(); setInterval(scanSteam, 60000); setInterval(launcherInstCheck, 90000);

  fillInfo();
});
app.on('before-quit', () => { quitting = true; try { if (PAD.proc) PAD.proc.kill(); } catch {} try { save(); } catch {} });
