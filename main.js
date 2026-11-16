const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path'), fs = require('fs'), cp = require('child_process'), crypto = require('crypto');
const LCH = require('./launchers');

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

let win, tray, quitting = false, msg = '', busy = false, tick = 0;
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
async function updInstall() {
  if (!updInfo || !updInfo.asset) { const c = await updCheck(); if (!c.novo) return c; }
  const a = updInfo.asset;
  const r = await fetch(`https://api.github.com/repos/${ghRepo()}/releases/assets/${a.id}`, { headers: ghHead('application/octet-stream'), redirect: 'follow' });
  if (!r.ok) return { ok: false, msg: 'Falha ao baixar a atualização (HTTP ' + r.status + ').' };
  const dir = path.join(app.getPath('temp'), 'RegistrandoGamesUpdate'); fs.mkdirSync(dir, { recursive: true });
  const exe = path.join(dir, a.name.replace(/[^\w.\- ]/g, '_'));
  fs.writeFileSync(exe, Buffer.from(await r.arrayBuffer()));
  if (fs.statSync(exe).size !== a.size) return { ok: false, msg: 'Download incompleto. Tente de novo.' };
  // espera o app fechar, instala em silencio e abre de novo
  const bat = path.join(dir, 'atualizar.cmd');
  fs.writeFileSync(bat, `@echo off\r\ntimeout /t 2 /nobreak >nul\r\n"${exe}" /S\r\ntimeout /t 2 /nobreak >nul\r\nstart "" "${process.execPath}"\r\n`);
  cp.spawn('cmd.exe', ['/c', bat], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  setTimeout(() => { quitting = true; app.quit(); }, 400);
  return { ok: true, msg: 'Instalando... o programa vai fechar e abrir sozinho.' };
}
const running = new Set();
const U = p => path.join(app.getPath('userData'), p);
const COVERS = () => U('covers');
const now = () => Math.floor(Date.now() / 1000);
const rid = () => crypto.randomBytes(5).toString('hex');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const J = async u => { const r = await fetch(u); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
const find = id => data.games.find(x => x.id === id);
function load() { try { data = { ...data, ...JSON.parse(fs.readFileSync(U('backlog_data.json'), 'utf8')) }; } catch {} data.lists = data.lists || [];
  for (const g of data.games) if (!g.info4 && g.info3 && g.released) g.info4 = true; }
function save() { const f = U('backlog_data.json'); fs.writeFileSync(f + '.tmp', JSON.stringify(data, null, 1)); fs.renameSync(f + '.tmp', f); }
const rmCover = g => { if (g.cover) try { fs.unlinkSync(path.join(COVERS(), g.cover)); } catch {} g.cover = ''; };

// Rastreio: a cada 5s confere se o .exe de algum jogo esta aberto (Windows)
function track() {
  if (process.platform !== 'win32') return;
  cp.exec('tasklist /fo csv /nh', { windowsHide: true, maxBuffer: 8e6 }, (err, out) => {
    if (err) return;
    const names = new Set(out.split(/\r?\n/).map(l => (l.match(/^"([^"]+)"/) || [])[1]).filter(Boolean).map(s => s.toLowerCase()));
    running.clear();
    for (const g of data.games) {
      const pn = (g.proc || (g.exe && !/\.(bat|cmd)$/i.test(g.exe) ? path.win32.basename(g.exe) : '')).toLowerCase();
      if (pn && names.has(pn)) {
        g.tracked_s = (g.tracked_s || 0) + 5; g.last_played = now(); running.add(g.id);
        if (g.status === 'Backlog') g.status = 'Jogando';
      }
    }
    if (running.size && ++tick % 6 === 0) save();
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
  if (data.config.sgdb) { try { const p = await sgPage({ id: 'novo', name: t.name }, 0); if (p.items[0]) out.cover = p.items[0].url; } catch {} }
  return out;
}

// Dados da Steam de um jogo. So marca como "preenchido" (info4) quando a Steam respondeu;
// se falhar, o jogo volta a ser tentado na proxima atualizacao.
async function steamInfo(g) {
  try {
    const r = (await J(`https://store.steampowered.com/api/appdetails?appids=${g.appid}&l=portuguese`))[g.appid] || {};
    const d = r.data || {};
    if (d.metacritic) { g.meta = d.metacritic.score; g.meta_url = d.metacritic.url; }
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
  } finally { busy = false; }
  const warn = fails < 0 ? 'A Steam limitou as consultas; tente de novo em alguns minutos.' : fails ? `${fails} jogo(s) sem resposta; tente de novo.` : '';
  msg = (msg || '').split(' ‣ ')[0] + (warn ? ' ‣ ' + warn : '');
}

// Jogos da Familia Steam (API nao oficial; exige o token temporario da loja)
async function importFamily(c) {
  const t = encodeURIComponent(c.fam), sid = encodeURIComponent(c.steamid);
  const gid = ((await J(`https://api.steampowered.com/IFamilyGroupsService/GetFamilyGroupForUser/v1/?access_token=${t}&steamid=${sid}`)).response || {}).family_groupid;
  if (!gid) throw new Error('não encontrei uma Família Steam nessa conta');
  const apps = ((await J(`https://api.steampowered.com/IFamilyGroupsService/GetSharedLibraryApps/v1/?access_token=${t}&family_groupid=${gid}&steamid=${sid}&include_own=true&include_free=false&include_excluded=false&include_non_games=false`)).response || {}).apps || [];
  const have = new Set(data.games.filter(g => g.appid).map(g => g.appid));
  let n = 0;
  for (const a of apps) {
    if (!a.appid || have.has(a.appid)) continue;
    n++; have.add(a.appid);
    data.games.push({ id: rid(), name: a.name || ('App ' + a.appid), appid: a.appid, platform: 'Steam', family: true, genres: [], status: 'Backlog', rating: 0, review: '',
      exe: '', steam_min: 0, tracked_s: 0, manual_s: 0, last_played: 0, finished: null, added: now() });
  }
  save(); return n;
}

async function steamSync() {
  const c = data.config;
  try {
    const q = new URLSearchParams({ key: c.key, steamid: c.steamid, include_appinfo: 1, include_played_free_games: 1 });
    const games = (await J('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?' + q)).response.games || [];
    const by = new Map(data.games.filter(g => g.appid).map(g => [g.appid, g]));
    let added = 0;
    for (const s of games) {
      const g = by.get(s.appid);
      if (g) {
        g.steam_min = s.playtime_forever || 0;
        if (s.rtime_last_played) g.last_played = Math.max(g.last_played || 0, s.rtime_last_played);
      } else {
        added++;
        data.games.push({ id: rid(), name: s.name, appid: s.appid, platform: 'Steam', genres: [], status: 'Backlog', rating: 0, review: '',
          exe: '', steam_min: s.playtime_forever || 0, tracked_s: 0, manual_s: 0, last_played: s.rtime_last_played || 0, finished: null, added: now() });
      }
    }
    save();
    msg = `Biblioteca: ${games.length} jogos, ${added} novos.`;
  } catch (e) { msg = 'Erro: confira a chave, o SteamID e se o perfil está público (' + e.message + ')'; return; }
  if (c.famOn && c.fam) {
    try { msg += ` Família Steam: ${await importFamily(c)} novos.`; }
    catch (e) { msg += ` Família Steam falhou: ${e.message}. O token vale ~24 h, gere outro se precisar.`; }
  }
  msg += ' Gêneros, notas e datas chegam aos poucos.';
  fillInfo();
}

// Jogos da Steam instalados: le libraryfolders.vdf e os appmanifest (StateFlags com bit 4 = instalado)
let steamApps = new Set();
function scanSteam() {
  if (process.platform !== 'win32') return;
  cp.exec('reg query "HKCU\\Software\\Valve\\Steam" /v SteamPath', { windowsHide: true }, (err, out) => {
    const m = !err && out.match(/SteamPath\s+REG_SZ\s+(.+)/);
    const root = m ? m[1].trim() : 'C:\\Program Files (x86)\\Steam';
    const libs = new Set([root]);
    try {
      const v = fs.readFileSync(path.join(root, 'steamapps', 'libraryfolders.vdf'), 'utf8');
      for (const x of v.matchAll(/"path"\s+"([^"]+)"/g)) libs.add(x[1].replace(/\\\\/g, '\\'));
      for (const x of v.matchAll(/"\d+"\s+"([A-Za-z]:[^"]+)"/g)) libs.add(x[1].replace(/\\\\/g, '\\'));
    } catch {}
    const s = new Set();
    for (const l of libs) {
      const dir = path.join(l, 'steamapps');
      let files = []; try { files = fs.readdirSync(dir); } catch {}
      for (const f of files) {
        const a = f.match(/^appmanifest_(\d+)\.acf$/); if (!a) continue;
        try { const fl = fs.readFileSync(path.join(dir, f), 'utf8').match(/"StateFlags"\s+"(\d+)"/); if (fl && (+fl[1] & 4)) s.add(+a[1]); } catch {}
      }
    }
    steamApps = s;
  });
}

// Outros launchers: importa os jogos instalados (sem duplicar) e guarda quais estao instalados agora
let launcherInst = new Set(), lchBusy = false;
async function launchersImport() {
  if (lchBusy) return { counts: {}, msg: 'Já estou procurando...' };
  lchBusy = true;
  try {
    const found = await LCH.scanAll(), counts = {}, inst = new Set(), ign = new Set(data.lIgnored || []);
    const nzk = s => nzn(s);
    for (const n of LCH.NAMES) {
      let novos = 0;
      for (const f of found[n] || []) {
        inst.add(f.key);
        let g = data.games.find(x => x.lkey === f.key) || data.games.find(x => !x.lkey && !x.appid && x.platform === n && nzk(x.name) === nzk(f.name));
        if (!g) {
          if (ign.has(f.key)) continue;
          g = { id: rid(), name: f.name, platform: n, genres: [], status: 'Backlog', rating: 0, review: '', exe: '', steam_min: 0, tracked_s: 0, manual_s: 0, last_played: 0, finished: null, added: now() };
          data.games.push(g); novos++;
        }
        g.lkey = f.key; if (f.uri) g.uri = f.uri;
        if (f.exe && (!g.exe || !fs.existsSync(g.exe))) g.exe = f.exe;
      }
      counts[n] = { total: (found[n] || []).length, novos };
    }
    launcherInst = inst; save();
    const novos = Object.values(counts).reduce((a, c) => a + c.novos, 0), total = Object.values(counts).reduce((a, c) => a + c.total, 0);
    return { counts, msg: total ? `Encontrei ${total} jogo(s) instalado(s) nos launchers; ${novos} novo(s) na biblioteca.` : 'Não encontrei jogos instalados nesses launchers.' };
  } finally { lchBusy = false; }
}

const sgRaw = async p => {
  const r = await fetch('https://www.steamgriddb.com/api/v2' + p, { headers: { Authorization: 'Bearer ' + data.config.sgdb } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
};
const sg = async p => (await sgRaw(p)).data || [];
const sgBase = {};
// Uma pagina de capas 600x900 do SteamGridDB (50 por pagina)
async function sgPage(g, page) {
  const key = g.id + '|' + g.name + '|' + (g.appid || '');
  // capas verticais: 600x900 e tambem 342x482 / 660x930 (o site mostra todas); humor e epilepsia incluidos, NSFW fica de fora
  const get = b => sgRaw(`${b}?dimensions=600x900,342x482,660x930&humor=any&epilepsy=any&nsfw=false&page=${page}`);
  let base = sgBase[key], j = null;
  if (base === undefined) {
    base = null;
    if (g.appid) { try { const x = await get('/grids/steam/' + g.appid); if ((x.data || []).length) { base = '/grids/steam/' + g.appid; j = x; } } catch {} }
    if (!base) { const s = await sg('/search/autocomplete/' + encodeURIComponent(g.name)); if (s.length) { const hit = s.find(x => nzn(x.name || '') === nzn(g.name)) || s[0]; base = '/grids/game/' + hit.id; j = await get(base); } }
    sgBase[key] = base;
  }
  if (!base) return { items: [], page, total: 0, pages: 0, more: false };
  if (!j) j = await get(base);
  const d = j.data || [], limit = j.limit || 50, total = typeof j.total === 'number' ? j.total : null, pages = total != null ? Math.ceil(total / limit) : null;
  return { items: d.map(x => ({ url: x.url, thumb: x.thumb || x.url })), page, total, pages, more: pages != null ? page + 1 < pages : d.length >= limit };
}
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp' };

ipcMain.handle('api', async (_e, p, b) => {
  const g = find(b.id);
  switch (p) {
    case 'state': return { version: app.getVersion(), games: data.games, lists: data.lists, running: [...running], inst: data.games.filter(g => (g.appid && steamApps.has(g.appid)) || (g.lkey && launcherInst.has(g.lkey)) || (g.exe && fs.existsSync(g.exe))).map(g => g.id), coversDir: COVERS(),
      config: { key: data.config.key || '', steamid: data.config.steamid || '', sgdb: data.config.sgdb || '', fam: data.config.fam || '', famOn: !!data.config.famOn, gh: data.config.gh || '', ghRepo: data.config.ghRepo || '' }, dataDir: app.getPath('userData'), platforms: data.platforms || [], plHidden: data.plHidden || [], gHidden: data.gHidden || [], gExtra: data.gExtra || [], pending: busy ? data.games.filter(needInfo).length : 0, msg };
    case 'save': {
      let x = g;
      if (!x) { x = { id: rid(), steam_min: 0, tracked_s: 0, manual_s: 0, last_played: 0, finished: null, added: now() }; data.games.push(x); }
      for (const k of ['name', 'platform', 'genres', 'status', 'rating', 'review', 'exe', 'meta', 'meta_url', 'tracked_s', 'manual_s', 'hidden', 'finished', 'released', 'sortname', 'fav', 'proc']) if (k in b) x[k] = b[k];
      if ('released' in b) x.rel_manual = b.released != null;
      if (data.gHidden && b.genres) data.gHidden = data.gHidden.filter(n => !b.genres.includes(n));
      if (x.meta == null) { delete x.meta; delete x.meta_url; }
      if (x.status === 'Zerado' && !x.finished) x.finished = now(); else if (x.status !== 'Zerado') x.finished = null;
      save(); return { ok: true, id: x.id };
    }
    case 'delete': if (g) { rmCover(g); if (g.lkey) data.lIgnored = [...new Set([...(data.lIgnored || []), g.lkey])]; } data.games = data.games.filter(x => x.id !== b.id); data.lists.forEach(l => l.ids = l.ids.filter(i => i !== b.id)); save(); return { ok: true };
    case 'config': data.config = { key: b.key || '', steamid: b.steamid || '', sgdb: b.sgdb || '', fam: b.fam || '', famOn: !!b.famOn, gh: b.gh || '', ghRepo: (b.ghRepo || '').trim() }; save(); return { ok: true };
    case 'sync': msg = 'Sincronizando...'; steamSync(); return { ok: true };
    case 'refresh': { if (b.full) for (const x of data.games) x.info4 = false; save(); msg = 'Atualizando...'; steamSync().finally(() => fillInfo()); return { ok: true }; }
    case 'launch_scan': try { return await launchersImport(); } catch (e) { return { counts: {}, msg: 'Erro ao procurar: ' + e.message }; }
    case 'upd_check': try { return await updCheck(); } catch (e) { return { ok: false, msg: 'Sem conexão com o GitHub: ' + e.message }; }
    case 'upd_install': try { return await updInstall(); } catch (e) { return { ok: false, msg: 'Erro: ' + e.message }; }
    case 'open_data': shell.openPath(app.getPath('userData')); return { ok: true };
    case 'pick': {
      const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Executável ou script', extensions: ['exe', 'bat', 'cmd'] }, { name: 'Todos', extensions: ['*'] }] });
      return { path: r.canceled ? '' : r.filePaths[0] };
    }
    case 'play': {
      if (!g) return {};
      if (g.uri && g.lkey && (launcherInst.has(g.lkey) || !g.exe || !fs.existsSync(g.exe))) {
        if (/^shell:/i.test(g.uri)) cp.spawn('explorer.exe', [g.uri], { detached: true, stdio: 'ignore' }).unref(); else await shell.openExternal(g.uri);
      }
      else if (g.exe && fs.existsSync(g.exe)) { const e = await shell.openPath(g.exe); if (e) return { error: e }; }
      else if (g.appid) await shell.openExternal('steam://rungameid/' + g.appid);
      else return { error: 'Vincule o executável (.exe) do jogo para poder jogar por aqui.' };
      if (g.status === 'Backlog' || g.status === 'Pausado') g.status = 'Jogando';
      g.last_played = now(); save(); setTimeout(track, 4000); return { ok: true };
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
    case 'pick_img': {
      const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Imagens', extensions: Object.keys(MIME) }] });
      if (r.canceled) return {};
      const f = r.filePaths[0];
      return { data: `data:${MIME[path.extname(f).slice(1).toLowerCase()] || 'image/png'};base64,${fs.readFileSync(f).toString('base64')}` };
    }
    case 'fetch_img': {
      try { const r = await fetch(b.url); if (!r.ok) throw 0; return { data: `data:${r.headers.get('content-type') || 'image/jpeg'};base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}` }; }
      catch { return { error: 'Falha ao baixar a imagem.' }; }
    }
    case 'cover_data': {
      if (!g) return {};
      fs.mkdirSync(COVERS(), { recursive: true }); rmCover(g);
      g.cover = `${g.id}-${Date.now()}.jpg`;
      fs.writeFileSync(path.join(COVERS(), g.cover), Buffer.from(b.data.split(',')[1], 'base64')); save(); return { ok: true };
    }
    case 'cover_clear': if (g) { rmCover(g); save(); } return { ok: true };
    case 'sgdb': {
      if (!g) return {};
      if (!data.config.sgdb) return { error: 'Cole sua chave do SteamGridDB em Configurações.' };
      try {
        let t = g; const q = (b.q || '').trim();
        if (q && nzn(q) !== nzn(g.name)) { t = { ...g, name: q, appid: null }; if (!b.page) { g.sgname = q; save(); } }
        else if (!b.page && g.sgname) { delete g.sgname; save(); }
        return await sgPage(t, b.page || 0);
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

function show() { if (win) { win.show(); win.focus(); } }
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', show);
app.whenReady().then(() => {
  load();
  win = new BrowserWindow({ width: 1240, height: 800, minWidth: 760, minHeight: 520, title: 'Registrando Games',
    icon: path.join(__dirname, 'icon.png'), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true } });
  win.setMenu(null);
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.on('close', e => { if (!quitting) { e.preventDefault(); win.hide(); } });
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'icon.png')).resize({ width: 16, height: 16 }));
  tray.setToolTip('Registrando Games');
  tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Abrir', click: show }, { label: 'Sair', click: () => { quitting = true; save(); app.quit(); } }]));
  tray.on('click', show);
  setInterval(track, 5000);
  scanSteam(); setInterval(scanSteam, 60000);
  launchersImport().catch(() => {}); setInterval(() => launchersImport().catch(() => {}), 120000);
  fillInfo();
});
app.on('before-quit', () => { quitting = true; try { save(); } catch {} });
