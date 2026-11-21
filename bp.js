// ===== Modo Big Picture (controle, teclado e mouse) =====
// Usa as funcoes e o estado do index.html (S, api, play, load, coverSrc, wallSrc...).
(()=>{
const BP={on:false,th:'orig',scr:'home',hist:[],style:'kb',padOk:null,
 home:{list:[],idx:0,sel:null,rk:''},lib:{tab:0,tabs:[],idx:0,sel:{},rk:''},det:{g:null,f:0},cfg:{i:0},side:{open:false,i:0},ov:null,kb:null};
try{const t=localStorage.getItem('bpth');if(t)BP.th=t}catch{}
const BPTH=[['orig','Registrando Games'],['steam','Steam'],['xbox','Xbox'],['ps','PlayStation']];
const SV=(d,f)=>`<svg viewBox="0 0 24 24" ${f?'fill="currentColor"':'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true">${d}</svg>`;
const BPI={
 play:SV('<path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z"/>',1),
 stop:SV('<rect x="5" y="5" width="14" height="14" rx="2"/>',1),
 inst:SV('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>'),
 fav:SV('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>'),
 favOn:SV('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',1),
 book:SV('<path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/>'),
 home:SV('<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>'),
 lib:SV('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
 cfg:SV('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
 theme:SV('<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20c.9 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7h2A5.6 5.6 0 0 0 22 11c0-5-4.5-9-10-9z"/>'),
 sync:SV('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'),
 exit:SV('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>'),
 pad:SV('<path d="M6 11h4M8 9v4"/><path d="M15 12h.01M18 10h.01"/><path d="M17.3 5H6.7a4 4 0 0 0-4 3.6L2 15.6A3 3 0 0 0 5 19c1 0 1.9-.5 2.4-1.3L9 15h6l1.6 2.7A2.8 2.8 0 0 0 19 19a3 3 0 0 0 3-3.4l-.7-7A4 4 0 0 0 17.3 5z"/>')};
const bpEl=document.createElement('div');bpEl.id='bp';bpEl.hidden=true;
bpEl.innerHTML=`<div class="bp-bg"><div class="bp-bgi"></div><div class="bp-bgi"></div></div><div class="bp-sh"></div>
<div class="bp-top"><div class="bp-av">${BPI.pad}</div><div class="bp-cw"><div class="bp-cats" id="bpcats"></div></div><div class="bp-clk" id="bpclk"></div></div>
<section class="bp-scr" id="bps-home"><div class="bp-sec" id="bpsec">Jogados recentemente</div><div class="bp-row"><div class="bp-trk" id="bptrk"></div></div><div class="bp-info" id="bpinfo"></div></section>
<section class="bp-scr" id="bps-lib" hidden><div class="bl-tabs" id="bltabs"></div><div class="bl-g" id="blg"></div></section>
<section class="bp-scr" id="bps-det" hidden></section>
<section class="bp-scr" id="bps-cfg" hidden><div class="bc-l" id="bcl"></div></section>
<div class="bp-foot" id="bpfoot"></div>
<aside class="bp-side" id="bpside"></aside>
<div class="bp-ov" id="bpov" hidden></div><div class="bp-kb" id="bpkb" hidden></div><div class="bp-toast" id="bptoast"></div>`;
document.body.appendChild(bpEl);
const bq=s=>bpEl.querySelector(s);

// ---- rotulos dos botoes conforme o controle ----
const BPGL={xbox:{a:'A',b:'B',x:'X',y:'Y',lb:'LB',rb:'RB',start:'☰',lt:'LT',rt:'RT'},ps:{a:'✕',b:'○',x:'□',y:'△',lb:'L1',rb:'R1',start:'☰',lt:'L2',rt:'R2'},
 nin:{a:'B',b:'A',x:'Y',y:'X',lb:'L',rb:'R',start:'+',lt:'ZL',rt:'ZR'},kb:{a:'Enter',b:'Esc',x:'Del',y:'Espaço',lb:'Q',rb:'E',start:'O',lt:'PgUp',rt:'PgDn'}};
const glyph=k=>{const t=(BPGL[BP.style]||BPGL.xbox)[k]||k;return `<i class="g g-${k}${t.length>2?' sh':''}">${t}</i>`};
function bpStyleFrom(m){const t=String(m.type||'').toLowerCase(),s=String(m.south||'').toLowerCase();
 const st=/ps3|ps4|ps5|playstation|dualsense|dualshock/.test(t)||s==='cross'?'ps':/nintendo|switch|joycon/.test(t)||s==='b'?'nin':'xbox';
 if(st!==BP.style){BP.style=st;bpClass();bpFoot();if(BP.ov)ovRender();if(BP.kb)kbRender()}}
function bpClass(){bpEl.className='th-'+BP.th+' st-'+BP.style+' scr-'+BP.scr+(BP.side.open?' side-on':'')+(BP.kb?' kb-on':'')+(bpEl.classList.contains('nocur')?' nocur':'')}

// ---- utilidades de jogo ----
const vis=()=>S.games.filter(g=>!g.hidden);
const bpRec=l=>[...l].sort((a,b)=>(b.last_played||0)-(a.last_played||0)||NC(a,b));
function bpAct(g){const run=S.running.includes(g.id),ins=(S.inst||[]).includes(g.id),ok=(g.appid||g.lkey)?ins:!!(g.exe||g.rom);
 if(run&&(g.exe||g.proc))return ['stop','Parar',BPI.stop];if(run||LAUNCH[g.id]>Date.now()-60000)return ['playing','Jogando',BPI.play];
 if(!ok)return ['inst','Instalar',BPI.inst];return ['play','Jogar',BPI.play]}
function bpTile(g,j){const cv=coverSrc(g),run=S.running.includes(g.id);
 return `<div class="bt" data-bi="${j}"><div class="bi">${cv?`<img src="${esc(cv)}" loading="lazy" decoding="async" alt="" onerror="this.remove()">`:''}<span class="bn">${esc(g.name)}</span></div>${run?'<i class="rn" title="Rodando"></i>':''}<span class="nm">${esc(g.name)}</span></div>`}
let BGT=0,BGF=0,BGK=0,BGL='';
function bpBg(g){const sig=g?g.id+'|'+wallSrc(g)+'|'+coverSrc(g):'';if(sig===BGL)return;BGL=sig;clearTimeout(BGT);const k=++BGK;
 BGT=setTimeout(()=>{const L=bpEl.querySelectorAll('.bp-bgi');
  const use=(u,blur)=>{if(k!==BGK)return;const nx=L[BGF^1];nx.style.backgroundImage=u?`url("${u.replace(/"/g,'%22')}")`:'none';nx.classList.toggle('blur',!!blur);L[BGF].classList.remove('on');nx.classList.add('on');BGF^=1};
  if(!g)return use('',false);const ws=wallSrc(g),cv=coverSrc(g);
  if(ws){const im=new Image();im.onload=()=>use(ws,false);im.onerror=()=>use(cv,true);im.src=ws}else use(cv,true)},140)}
let BPTT=0;function bpToast(t){const e=bq('#bptoast');e.textContent=t;e.classList.add('on');clearTimeout(BPTT);BPTT=setTimeout(()=>e.classList.remove('on'),2600)}
function bpClock(){bq('#bpclk').textContent=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
setInterval(()=>{if(BP.on)bpClock()},10000);
const SCRN={home:'Início',lib:'Biblioteca',cfg:'Configurações',det:''};
function bpTop(){bq('#bpcats').innerHTML=BP.scr==='det'?'':`<span class="ct on">${SCRN[BP.scr]}</span>`;bq('#bpcats').style.transform=''}
function bpFoot(){let h;
 if(BP.kb)h=[[glyph('a'),'Digitar'],[glyph('x'),'Apagar'],[glyph('y'),'Espaço'],[glyph('start'),'Confirmar'],[glyph('b'),'Cancelar']];
 else h=[[glyph('start'),'Opções'],[glyph('a'),'Selecionar'],[glyph('b'),'Voltar']];
 bq('#bpfoot').innerHTML=h.map(([g,t])=>`<span>${g}${t}</span>`).join('')}

// ---- telas ----
function bpGo(scr,push=true){if(push&&BP.scr!==scr)BP.hist.push(BP.scr);BP.scr=scr;
 bpEl.querySelectorAll('.bp-scr').forEach(s=>s.hidden=s.id!=='bps-'+scr);bpClass();bpTop();bpFoot();bpPaint(true)}
function bpBack(){if(BP.scr==='home')return;const p=BP.hist.pop()||'home';bpGo(p,false)}
function bpPaint(full){if(!BP.on)return;({home:homeRender,lib:libRender,det:detRender,cfg:cfgRender})[BP.scr](full)}

// Inicio: so jogos instalados ou jogados recentemente
function homeRender(full){const H=BP.home,L=bpRec(vis().filter(g=>(S.inst||[]).includes(g.id)||g.last_played));H.list=L;
 const key=L.map(g=>g.id+(S.running.includes(g.id)?'r':'')+(g.cover||'')).join(',');
 if(full||key!==H.rk){H.rk=key;bq('#bptrk').innerHTML=L.length?L.map(bpTile).join(''):'<div class="bp-empty">Nenhum jogo instalado ou jogado recentemente.<br>Aperte o botão Home para abrir a Biblioteca.</div>'}
 homeSel(Math.max(0,L.findIndex(g=>g.id===H.sel)),true)}
function homeSel(i,force){const H=BP.home,L=H.list;if(!L.length){bq('#bpinfo').innerHTML='';bpBg(null);return}i=Math.max(0,Math.min(L.length-1,i));
 if(i===H.idx&&!force&&H.sel===L[i].id)return;H.idx=i;H.sel=L[i].id;
 const T=bq('#bptrk');T.querySelectorAll('.bt.on').forEach(x=>x.classList.remove('on'));const t=T.children[i];
 if(t){T.classList.add('nt');t.classList.add('on');T.style.transform=`translateX(${-t.offsetLeft+T.children[0].offsetLeft}px)`;requestAnimationFrame(()=>T.classList.remove('nt'))}
 const g=L[i],lg=logoSrc(g)&&!g.logoHide?logoSrc(g):'';
 bq('#bpinfo').innerHTML=`<div class="bi-t${lg?' lg':''}">${lg?`<img class="bi-lg" src="${esc(lg)}" alt="" onerror="this.parentElement.classList.remove('lg');this.remove()">`:''}<h1>${esc(g.name)}</h1></div>`;bpBg(g)}

// Biblioteca: abas como na Steam (Todos, Instalados, Favoritos, launchers/plataformas, listas)
function libTabs(){const v=vis(),t=[{k:'all',n:'Todos',g:[...v].sort(NC)}];
 const inst=v.filter(g=>(S.inst||[]).includes(g.id));if(inst.length)t.push({k:'inst',n:'Instalados',g:[...inst].sort(NC)});
 const fav=v.filter(g=>g.fav);if(fav.length)t.push({k:'fav',n:'Favoritos',g:[...fav].sort(NC)});
 const rec=v.filter(g=>g.last_played);if(rec.length)t.push({k:'rec',n:'Recentes',g:bpRec(rec)});
 const by=new Map();for(const g of v){const p=canonP(g.platform)||'Outros';if(!by.has(p))by.set(p,[]);by.get(p).push(g)}
 [...by.entries()].sort((a,b)=>b[1].length-a[1].length).forEach(([p,l])=>t.push({k:'p:'+p,n:dispP(p),g:[...l].sort(NC)}));
 for(const L of S.lists||[]){const l=(L.ids||[]).map(id=>v.find(g=>g.id===id)).filter(Boolean);if(l.length)t.push({k:'l:'+L.id,n:L.name||'Lista',g:l})}
 return t}
function libRender(full){const B=BP.lib,T=B.tabs=libTabs();if(B.tab>=T.length)B.tab=0;const C=T[B.tab];
 bq('#bltabs').innerHTML=`<span class="tg">${glyph('lb')}</span>`+T.map((t,i)=>`<span class="tb${i===B.tab?' on':''}" data-lt="${i}">${esc(t.n)}<em>${t.g.length}</em></span>`).join('')+`<span class="tg">${glyph('rb')}</span>`;
 const on=bq('#bltabs .tb.on');on&&on.scrollIntoView({block:'nearest',inline:'center'});
 const key=C.k+'|'+C.g.map(g=>g.id+(g.cover||'')).join(',');
 if(full||key!==B.rk){B.rk=key;bq('#blg').innerHTML=C.g.map(bpTile).join('')||'<div class="bp-empty">Nenhum jogo aqui.</div>'}
 libSel(Math.max(0,C.g.findIndex(g=>g.id===B.sel[C.k])),true)}
function libSel(i,force){const B=BP.lib,C=B.tabs[B.tab];if(!C||!C.g.length){bpBg(null);return}i=Math.max(0,Math.min(C.g.length-1,i));
 B.idx=i;B.sel[C.k]=C.g[i].id;const G=bq('#blg');G.querySelectorAll('.bt.on').forEach(x=>x.classList.remove('on'));const t=G.children[i];
 if(t){t.classList.add('on');t.scrollIntoView({block:force?'center':'nearest',behavior:force?'auto':'smooth'})}bpBg(C.g[i])}
function libCols(){const G=bq('#blg'),c=G.children;if(c.length<2)return 1;const y=c[0].offsetTop;let n=0;for(const e of c){if(e.offsetTop!==y)break;n++}return n||1}

// Detalhes do jogo (parecido com o modo tela cheia do launcher)
function detOpen(g){BP.det.g=g.id;BP.det.f=0;bpGo('det')}
function detGame(){return S.games.find(x=>x.id===BP.det.g)}
function detBtns(g){const a=bpAct(g),b=[{k:'a',n:a[1],ic:a[2],cls:'pri '+a[0]},{k:'fav',n:g.fav?'Favorito':'Favoritar',ic:g.fav?BPI.favOn:BPI.fav,cls:g.fav?'on':''}];
 if((g.review||'').trim())b.push({k:'rev',n:'Ler review',ic:BPI.book,cls:''});return b}
function detRender(){const g=detGame(),el=bq('#bps-det');if(!g){bpBack();return}
 const t=secs(g),lg=logoSrc(g)&&!g.logoHide?logoSrc(g):'',rp=(g.replays||[]).length,btn=detBtns(g);BP.det.f=Math.min(BP.det.f,btn.length-1);
 const row=(k,v)=>v?`<div class="dr"><span>${k}</span><b>${v}</b></div>`:'';
 el.innerHTML=`<div class="dt-c"><div class="bi-t${lg?' lg':''}">${lg?`<img class="bi-lg" src="${esc(lg)}" alt="" onerror="this.parentElement.classList.remove('lg');this.remove()">`:''}<h1>${esc(g.name)}</h1></div>
 <div class="dt-p">${g.score!=null?`<span class="pi">Nota: <b style="color:${scC(g.score)}">${scF(g.score)}</b></span>`:''}${g.platform?`<span class="pi">${esc(dispP(canonP(g.platform)))}</span>`:''}${g.released?`<span class="pi">${dpt(g.released)}</span>`:''}${(g.genres||[]).map(x=>`<span class="pi">${esc(x)}</span>`).join('')}</div>
 <div class="dt-g">${row('Status',`${esc(stN(g.status||'Backlog'))}<i class="sd" style="background:${COL[g.status||'Backlog']}"></i>`)}${row('Finalizado em',g.status==='Zerado'&&g.finished?dpt(g.finished):'')}${row('Replays',rp?rp+'×':'')}${row('Tempo de jogo',t?fmt(t):'')}${row('Último jogo',g.last_played?dpt(g.last_played):'')}</div>
 ${(g.review||'').trim()?`<p class="dt-r">${esc(g.review)}</p>`:''}
 <div class="dt-b">${btn.map((b,i)=>`<button class="db ${b.cls}${i===BP.det.f?' f':''}" data-db="${i}">${b.ic}${esc(b.n)}</button>`).join('')}</div></div>`;
 bpBg(g)}
function detPress(){const g=detGame();if(!g)return;const b=detBtns(g)[BP.det.f];if(!b)return;
 if(b.k==='a')return bpPlay(g);if(b.k==='fav')return bpFav(g);if(b.k==='rev')ovOpen({type:'text',title:g.name,text:g.review})}

// Configuracoes
function cfgRows(){const c=S.config,mask=v=>v?(v.length>8?v.slice(0,4)+'••••'+v.slice(-4):'••••'):'Não preenchido';
 const txt=(n,k,ph,sec)=>({t:'txt',n,v:c[k]||'',show:sec?mask(c[k]):(c[k]||'Não preenchido'),fn:()=>kbOpen(n,c[k]||'',ph,async v=>{c[k]=v;await saveCfgBP();bpToast('Salvo')})});
 const tog=(n,on,fn)=>({t:'tog',n,on,fn});
 return [{t:'h',n:'Big Picture'},{t:'ch',n:'Tema',show:(BPTH.find(x=>x[0]===BP.th)||BPTH[0])[1],fn:themeMenu},
  {t:'h',n:'Geral'},tog('Iniciar com o Windows',!!c.startup,v=>api('startup_set',{on:v,min:c.startMin!==false})),tog('Abrir minimizado ao iniciar com o Windows',c.startMin!==false,v=>api('startup_set',{on:!!c.startup,min:v})),
  tog('Atualizar e sincronizar automaticamente ao abrir o app',c.autoRefresh!==false,v=>api('auto_refresh_set',{on:v})),tog('Avisar quando tiver versão nova',c.updNotify!==false,v=>api('upd_notify_set',{on:v})),
  {t:'h',n:'Steam'},txt('Chave da API da Steam','key','Cole ou digite a chave',1),txt('SteamID ou link do perfil','steamid','Ex.: 7656119… ou o link do perfil'),
  {t:'h',n:'SteamGridDB'},txt('Chave do SteamGridDB','sgdb','Cole ou digite a chave',1),
  {t:'h',n:'Biblioteca'},{t:'act',n:'Atualizar e sincronizar agora',fn:()=>{refreshAll();bpToast('Atualizando a biblioteca…')}},
  {t:'h',n:'Atualizações'},{t:'act',n:'Procurar atualização',show:'Versão '+(S.version||''),fn:bpUpd}]}
const saveCfgBP=()=>{const c=S.config;return api('config',{key:(c.key||'').trim(),steamid:(c.steamid||'').trim(),sgdb:(c.sgdb||'').trim(),fam:(c.fam||'').trim(),famOn:!!c.famOn,gh:c.gh||'',ghRepo:c.ghRepo||''}).then(load)};
async function bpUpd(){bpToast('Procurando atualização…');const r=await api('upd_check');if(!r.novo){bpToast(r.msg||'Você já está na versão mais nova.');return}
 ovOpen({type:'menu',title:'Versão nova disponível',sub:r.msg||'',items:[{n:'Instalar agora',fn:async()=>{ovClose(true);bpToast('Baixando a atualização… o app vai reiniciar sozinho.');const x=await api('upd_install');if(x&&x.msg&&!x.ok)bpToast(x.msg)}},{n:'Depois',fn:()=>ovClose(true)}]})}
function cfgRender(){const R=cfgRows(),C=BP.cfg;if(R[C.i]&&R[C.i].t==='h')C.i++;if(C.i>=R.length)C.i=1;
 bq('#bcl').innerHTML=R.map((r,i)=>r.t==='h'?`<div class="bc-h">${esc(r.n)}</div>`:`<div class="bc-r${i===C.i?' f':''}" data-ci="${i}"><span class="bc-n">${esc(r.n)}</span><span class="bc-v">${r.t==='tog'?`<i class="bsw${r.on?' on':''}"><i></i></i>`:r.t==='act'?`${r.show?`<small>${esc(r.show)}</small>`:''}<b class="bc-go">›</b>`:`${esc(r.show)}<b class="bc-go">›</b>`}</span></div>`).join('');
 const f=bq('.bc-r.f');f&&f.scrollIntoView({block:'nearest'});bpBg(null)}
async function cfgPress(){const r=cfgRows()[BP.cfg.i];if(!r||r.t==='h')return;if(r.t==='tog'){await r.fn(!r.on);await load();return}r.fn()}
function cfgMove(d){const R=cfgRows();let i=BP.cfg.i;do{i+=d}while(R[i]&&R[i].t==='h');if(i<0||i>=R.length)return;BP.cfg.i=i;cfgRender()}

// ---- liga / desliga ----
function bpSet(on){on=!!on;if(on===BP.on)return;BP.on=on;bpEl.hidden=!on;document.body.classList.toggle('bpon',on);api('bp_full',{on});
 if(on){document.querySelectorAll('dialog[open]').forEach(d=>{try{d.close()}catch{}});BP.ov=null;BP.kb=null;BP.side.open=false;bq('#bpov').hidden=true;bq('#bpkb').hidden=true;BP.hist=[];bpClock();bpGo('home',false);sideRender()}
 else{Object.keys(REP).forEach(padUp)}}
window.bpOnLoad=()=>{if(BP.on){bpPaint(false);if(BP.side.open)sideRender();if(BP.ov&&BP.ov.type==='menu')ovRender()}};

// ---- acoes ----
const curGame=()=>BP.scr==='home'?BP.home.list[BP.home.idx]:BP.scr==='lib'?(BP.lib.tabs[BP.lib.tab]||{g:[]}).g[BP.lib.idx]:BP.scr==='det'?detGame():null;
async function bpPlay(g){const a=bpAct(g)[0];
 if(a==='stop')return bpConfirmStop(g);
 if(a==='playing')return bpToast('O jogo já está abrindo.');
 if(a==='inst'){if(g.appid||g.lkey||g.uri){bpToast('Abrindo o launcher para instalar…');installGame(g)}else bpToast('Esse jogo não tem .exe. Adicione pela tela de editar, fora do Big Picture.');return}
 bpToast('Abrindo '+g.name+'…');await play(g.id)}
async function bpFav(g){await api('save',{id:g.id,fav:!g.fav});bpToast(g.fav?'Removido dos favoritos':'Adicionado aos favoritos');await load()}
function bpConfirmStop(g){ovOpen({type:'menu',title:`Fechar "${g.name}"?`,sub:'O progresso que não foi salvo no jogo será perdido.',items:[{n:'Fechar o jogo',dl:1,fn:async()=>{ovClose(true);bpToast('Fechando…');const r=await api('stop',{id:g.id});if(r&&r.error)bpToast(r.error);delete LAUNCH[g.id];setTimeout(load,800)}},{n:'Cancelar',fn:()=>ovClose(true)}]})}
function bpOpts(){const g=curGame();if(!g)return;const a=bpAct(g),it=[];
 it.push({n:a[1],fn:()=>{ovClose(true);bpPlay(g)}});
 if(BP.scr!=='det')it.push({n:'Ver detalhes',fn:()=>{ovClose(true);detOpen(g)}});
 if(a[0]==='stop')it.push({n:'Fechar o jogo',dl:1,fn:()=>bpConfirmStop(g)});
 it.push({n:g.fav?'Remover dos favoritos':'Adicionar aos favoritos',fn:()=>{ovClose(true);bpFav(g)}});
 it.push({n:'Trocar capa',ar:1,fn:()=>bpCovers(g)});
 it.push({n:'Mudar status',ar:1,fn:()=>ovOpen({type:'menu',title:'Status',items:ST.map(s=>({n:stN(s),ck:g.status===s,fn:async()=>{const b={id:g.id,status:s};if(s==='Zerado'&&!g.finished)b.finished=Math.floor(Date.now()/1000);await api('save',b);ovClose(true);bpToast('Status: '+stN(s));await load()}}))},true)});
 if((g.review||'').trim())it.push({n:'Ler review',ar:1,fn:()=>ovOpen({type:'text',title:g.name,text:g.review},true)});
 ovOpen({type:'menu',title:g.name,items:it})}
function themeMenu(){ovOpen({type:'menu',title:'Tema do Big Picture',items:BPTH.map(([k,n])=>({n,ck:BP.th===k,fn:()=>{BP.th=k;try{localStorage.setItem('bpth',k)}catch{}bpClass();ovClose(true);bpPaint(true);bpToast('Tema: '+n)}}))},!!BP.ov)}
async function bpCovers(g){if(!S.config.sgdb){bpToast('Para trocar capas, coloque a chave do SteamGridDB nas Configurações.');return}
 const ov={type:'grid',title:'Trocar capa',sub:g.name,items:[],i:0,page:-1,more:true,loading:false,g};ovOpen(ov,true);await bpCovMore(ov)}
async function bpCovMore(ov){if(ov.loading||!ov.more)return;ov.loading=true;ovRender();
 try{const r=await api('sgdb',{id:ov.g.id,page:ov.page+1,kind:'cover'});if(r.error){bpToast(r.error);ov.more=false}else{ov.page++;ov.items.push(...(r.items||[]));ov.more=!!r.more}}catch{ov.more=false}
 ov.loading=false;if(BP.ov===ov)ovRender()}
async function bpCovApply(ov){const it=ov.items[ov.i];if(!it)return;bpToast('Aplicando a capa…');
 try{const f=await api('fetch_img',{url:it.url});if(!f.data)throw 0;await api('cover_data',{id:ov.g.id,data:await toCover(f.data)});ovClose(true);await load();bpPaint(true);bpToast('Capa trocada!')}catch{bpToast('Não consegui usar essa capa. Tente outra.')}}

// ---- barra lateral (botao Home) ----
const SIDE=()=>[{k:'home',n:'Início',ic:BPI.home,fn:()=>{BP.hist=[];bpGo('home',false)}},{k:'lib',n:'Biblioteca',ic:BPI.lib,fn:()=>{BP.hist=['home'];bpGo('lib',false)}},
 {k:'theme',n:'Tema',ic:BPI.theme,fn:themeMenu},{k:'sync',n:'Atualizar e sincronizar',ic:BPI.sync,fn:()=>{refreshAll();bpToast('Atualizando a biblioteca…')}},
 {k:'cfg',n:'Configurações',ic:BPI.cfg,fn:()=>{BP.hist=['home'];BP.cfg.i=1;bpGo('cfg',false)}},{k:'exit',n:'Sair do Big Picture',ic:BPI.exit,fn:()=>bpSet(false)}];
function sideRender(){const L=SIDE();bq('#bpside').innerHTML=`<div class="sd-h">${BPI.pad}<b>Registrando Games</b></div>`+L.map((x,i)=>`<div class="sd-i${i===BP.side.i?' f':''}${x.k===BP.scr?' cur':''}" data-si="${i}">${x.ic}<span>${x.n}</span></div>`).join('')}
function sideToggle(on){BP.side.open=on===undefined?!BP.side.open:on;if(BP.side.open){const L=SIDE();BP.side.i=Math.max(0,L.findIndex(x=>x.k===BP.scr))}sideRender();bpClass()}
function sideIn(k){const L=SIDE(),n=L.length;if(k==='up')BP.side.i=(BP.side.i-1+n)%n;else if(k==='down')BP.side.i=(BP.side.i+1)%n;
 else if(k==='a'){const x=L[BP.side.i];sideToggle(false);x.fn();return}else if(k==='b'||k==='right'){sideToggle(false);return}else return;sideRender()}

// ---- painel por cima (menus, capas, review) ----
function ovOpen(o,stack){o.i=o.i||0;o.prev=stack?BP.ov:null;BP.ov=o;ovRender()}
function ovClose(all){BP.ov=all?null:(BP.ov&&BP.ov.prev)||null;ovRender()}
function ovCols(){const g=bq('.bo-g');if(!g)return 6;return getComputedStyle(g).gridTemplateColumns.split(' ').length||6}
function ovRender(){const el=bq('#bpov'),o=BP.ov;bpFoot();if(!o){el.hidden=true;el.innerHTML='';return}el.hidden=false;
 const ft=`<div class="bo-f">${o.type==='grid'?`<span>${glyph('lb')}${glyph('rb')}Página</span>`:''}${o.type!=='text'?`<span>${glyph('a')}Selecionar</span>`:''}<span>${glyph('b')}Voltar</span></div>`;
 if(o.type==='menu')el.innerHTML=`<div class="bo-p"><div class="bo-h">${esc(o.title)}</div>${o.sub?`<div class="bo-m">${esc(o.sub)}</div>`:''}<div class="bo-l">${o.items.map((it,j)=>`<div class="bo-i${j===o.i?' on':''}${it.dl?' dl':''}" data-oi="${j}"><span class="ck">${it.ck?'✓':''}</span>${esc(it.n)}${it.ar?'<span class="ar">›</span>':''}</div>`).join('')}</div>${ft}</div>`;
 else if(o.type==='text')el.innerHTML=`<div class="bo-p"><div class="bo-h">${esc(o.title)}</div><div class="bo-tx" id="botx">${esc(o.text)}</div>${ft}</div>`;
 else{el.innerHTML=`<div class="bo-p"><div class="bo-h">${esc(o.title)}<small>${esc(o.sub||'')}</small></div><div class="bo-g">${o.items.map((it,j)=>`<div class="gc${j===o.i?' on':''}" data-oi="${j}"><img src="${esc(it.thumb)}" loading="lazy" alt=""></div>`).join('')}</div>${o.loading?'<div class="bo-m">Carregando capas…</div>':!o.items.length?'<div class="bo-m">Nenhuma capa encontrada.</div>':''}${ft}</div>`;
  const on=el.querySelector('.gc.on');on&&on.scrollIntoView({block:'nearest'})}}
function ovIn(k){const o=BP.ov;
 if(k==='b'||k==='back'){ovClose();return}
 if(o.type==='text'){const t=bq('#botx');if(!t)return;if(k==='down'||k==='sdown')t.scrollBy({top:120,behavior:'smooth'});if(k==='up'||k==='sup')t.scrollBy({top:-120,behavior:'smooth'});return}
 if(o.type==='menu'){const n=o.items.length;if(k==='up')o.i=(o.i-1+n)%n;else if(k==='down')o.i=(o.i+1)%n;else if(k==='a'){const it=o.items[o.i];it&&it.fn();return}else return;ovRender();return}
 const c=ovCols(),n=o.items.length;if(!n)return;
 if(k==='left')o.i=Math.max(0,o.i-1);else if(k==='right')o.i=Math.min(n-1,o.i+1);else if(k==='up')o.i=Math.max(0,o.i-c);else if(k==='down')o.i=Math.min(n-1,o.i+c);
 else if(k==='rb'||k==='rt')o.i=Math.min(n-1,o.i+c*3);else if(k==='lb'||k==='lt')o.i=Math.max(0,o.i-c*3);else if(k==='a'){bpCovApply(o);return}else return;
 if(o.i>=n-c*2)bpCovMore(o);
 bq('.bo-g .gc.on')?.classList.remove('on');const e=bq(`.bo-g .gc[data-oi="${o.i}"]`);if(e){e.classList.add('on');e.scrollIntoView({block:'nearest'})}}

// ---- teclado virtual (para digitar com o controle) ----
const KBL={abc:[['1','2','3','4','5','6','7','8','9','0'],['q','w','e','r','t','y','u','i','o','p'],['a','s','d','f','g','h','j','k','l','ç'],['z','x','c','v','b','n','m',',','.','-'],['⇧','?123','espaço','⌫','Colar','OK']],
 sym:[['1','2','3','4','5','6','7','8','9','0'],['!','@','#','$','%','&','*','(',')','='],['/',':',';','_','+','?','\'','"','[',']'],['<','>','{','}','|','\\','~','^','`','.'],['⇧','abc','espaço','⌫','Colar','OK']]};
function kbOpen(title,val,ph,done){BP.kb={title,v:val||'',ph:ph||'',done,lay:'abc',up:false,r:1,c:0};bpClass();kbRender()}
function kbClose(){BP.kb=null;bq('#bpkb').hidden=true;bpClass();bpFoot()}
function kbRender(){const K=BP.kb,el=bq('#bpkb');bpFoot();if(!K){el.hidden=true;return}el.hidden=false;const L=KBL[K.lay];
 el.innerHTML=`<div class="kb-p"><div class="kb-t">${esc(K.title)}</div><div class="kb-v">${K.v?esc(K.v):`<span class="ph">${esc(K.ph)}</span>`}<i class="kb-cur"></i></div><div class="kb-k">${L.map((row,r)=>`<div class="kb-row">${row.map((k,c)=>`<span class="kk${r===K.r&&c===K.c?' f':''}${k.length>1&&k!=='⌫'&&k!=='⇧'?' w':''}${k==='espaço'?' sp':''}${k==='OK'?' ok':''}${k==='⇧'&&K.up?' on':''}" data-kr="${r}" data-kc="${c}">${esc(K.up&&k.length===1?k.toUpperCase():k)}</span>`).join('')}</div>`).join('')}</div></div>`}
async function kbKey(k){const K=BP.kb;if(!K)return;
 if(k==='⌫')K.v=K.v.slice(0,-1);else if(k==='espaço')K.v+=' ';else if(k==='⇧')K.up=!K.up;else if(k==='?123'){K.lay='sym';K.c=Math.min(K.c,KBL.sym[K.r].length-1)}else if(k==='abc')K.lay='abc';
 else if(k==='Colar'){try{K.v+=(await navigator.clipboard.readText()).trim()}catch{bpToast('Não consegui colar.')}}
 else if(k==='OK'){const d=K.done,v=K.v;kbClose();d&&d(v);return}
 else{K.v+=K.up?k.toUpperCase():k;if(K.up)K.up=false}kbRender()}
function kbIn(k){const K=BP.kb,L=KBL[K.lay];
 if(k==='b'){kbClose();return}if(k==='x'){kbKey('⌫');return}if(k==='y'){kbKey('espaço');return}if(k==='start'){kbKey('OK');return}
 if(k==='a'){kbKey(L[K.r][K.c]);return}
 if(k==='left')K.c=(K.c-1+L[K.r].length)%L[K.r].length;else if(k==='right')K.c=(K.c+1)%L[K.r].length;
 else if(k==='up'||k==='down'){const fr=K.c/L[K.r].length;K.r=(K.r+(k==='up'?-1:1)+L.length)%L.length;K.c=Math.min(L[K.r].length-1,Math.floor(fr*L[K.r].length))}else return;kbRender()}

// ---- entrada ----
function bpIn(k){if(!BP.on)return;
 if(k==='guide'){if(BP.kb)return;if(BP.ov)BP.ov=null,ovRender();sideToggle();return}
 if(BP.kb)return kbIn(k);if(BP.ov)return ovIn(k);if(BP.side.open)return sideIn(k);
 if(k==='start'){if(BP.scr!=='cfg')bpOpts();return}
 if(k==='b'){bpBack();return}
 if(BP.scr==='home'){if(k==='left')homeSel(BP.home.idx-1);else if(k==='right')homeSel(BP.home.idx+1);else if(k==='lt')homeSel(BP.home.idx-10);else if(k==='rt')homeSel(BP.home.idx+10);
  else if(k==='a'){const g=curGame();g&&detOpen(g)}return}
 if(BP.scr==='lib'){const B=BP.lib,c=libCols();if(k==='left')libSel(B.idx-1);else if(k==='right')libSel(B.idx+1);else if(k==='up')libSel(B.idx-c);else if(k==='down')libSel(B.idx+c);
  else if(k==='lt')libSel(B.idx-c*3);else if(k==='rt')libSel(B.idx+c*3);
  else if(k==='lb'||k==='rb'){const n=B.tabs.length;B.tab=(B.tab+(k==='lb'?-1:1)+n)%n;libRender(true)}
  else if(k==='a'){const g=curGame();g&&detOpen(g)}return}
 if(BP.scr==='det'){const n=detBtns(detGame()||{}).length;if(k==='left')BP.det.f=Math.max(0,BP.det.f-1);else if(k==='right')BP.det.f=Math.min(n-1,BP.det.f+1);
  else if(k==='a'){detPress();return}else if(k==='down'||k==='sdown'){bq('.dt-r')?.scrollBy({top:90,behavior:'smooth'});return}else if(k==='up'||k==='sup'){bq('.dt-r')?.scrollBy({top:-90,behavior:'smooth'});return}else return;
  bpEl.querySelectorAll('.db').forEach((b,i)=>b.classList.toggle('f',i===BP.det.f));return}
 if(BP.scr==='cfg'){if(k==='up')cfgMove(-1);else if(k==='down')cfgMove(1);else if(k==='a')cfgPress()}}
const BPMAP={dpadUp:'up',dpadDown:'down',dpadLeft:'left',dpadRight:'right',lsUp:'up',lsDown:'down',lsLeft:'left',lsRight:'right',south:'a',east:'b',west:'x',north:'y',
 leftShoulder:'lb',rightShoulder:'rb',lt:'lt',rt:'rt',start:'start',back:'back',guide:'guide',rsUp:'sup',rsDown:'sdown'};
const REP={},RPT=new Set(['up','down','left','right','sup','sdown','lt','rt']);
function padDown(k){bpIn(k);if(RPT.has(k)){clearTimeout(REP[k]);const r=()=>{bpIn(k);REP[k]=setTimeout(r,k==='lt'||k==='rt'?220:85)};REP[k]=setTimeout(r,380)}}
function padUp(k){clearTimeout(REP[k]);delete REP[k]}
function bpPad(m){
 if(m.t==='conn'){bpStyleFrom(m);if(BP.on)bpToast('Controle conectado: '+(m.name||''));return}
 if(m.t==='disc'){if(BP.on)bpToast('Controle desconectado');return}
 const k=BPMAP[m.b];if(!k)return;
 if(m.t==='down'){bpStyleFrom(m);bpEl.classList.add('nocur');if(k==='guide'&&!BP.on){bpSet(true);return}if(!BP.on)return;padDown(k)}
 else if(m.t==='up')padUp(k)}
if(window.bridge&&bridge.onPad)bridge.onPad(bpPad);
bpEl.addEventListener('mousemove',()=>bpEl.classList.remove('nocur'));
const BPK={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Enter:'a',Escape:'b',Backspace:'b',q:'lb',Q:'lb',e:'rb',E:'rb',o:'start',O:'start',PageUp:'lt',PageDown:'rt',Home:'guide',Tab:'guide'};
document.addEventListener('keydown',e=>{
 if(e.key==='F11'){e.preventDefault();e.stopPropagation();bpSet(!BP.on);return}
 if(!BP.on)return;e.stopPropagation();
 if(BP.kb&&!e.ctrlKey&&!e.altKey){ // teclado fisico tambem digita
  if(e.key.length===1){e.preventDefault();BP.kb.v+=e.key;kbRender();return}
  if(e.key==='Backspace'){e.preventDefault();kbKey('⌫');return}if(e.key==='Enter'){e.preventDefault();kbKey('OK');return}}
 if(BP.kb&&e.ctrlKey&&(e.key==='v'||e.key==='V')){e.preventDefault();kbKey('Colar');return}
 const k=BPK[e.key];if(!k)return;e.preventDefault();
 if(BP.style!=='kb'){BP.style='kb';bpClass();bpFoot()}bpIn(k)},true);
// mouse
bpEl.addEventListener('click',e=>{
 const kk=e.target.closest('[data-kr]');if(kk&&BP.kb){BP.kb.r=+kk.dataset.kr;BP.kb.c=+kk.dataset.kc;kbKey(KBL[BP.kb.lay][BP.kb.r][BP.kb.c]);return}
 if(BP.kb){if(e.target.id==='bpkb')kbClose();return}
 const oi=e.target.closest('[data-oi]');if(oi&&BP.ov){BP.ov.i=+oi.dataset.oi;if(BP.ov.type==='grid'){ovRender();bpCovApply(BP.ov)}else ovIn('a');return}
 if(BP.ov){if(e.target.id==='bpov')ovClose();return}
 const si=e.target.closest('[data-si]');if(si){BP.side.i=+si.dataset.si;sideIn('a');return}
 if(BP.side.open){if(!e.target.closest('#bpside'))sideToggle(false);return}
 const lt=e.target.closest('[data-lt]');if(lt){BP.lib.tab=+lt.dataset.lt;libRender(true);return}
 const t=e.target.closest('[data-bi]');if(t){const i=+t.dataset.bi;if(BP.scr==='home'){if(i===BP.home.idx)bpIn('a');else homeSel(i)}else if(BP.scr==='lib'){if(i===BP.lib.idx)bpIn('a');else libSel(i)}return}
 const db=e.target.closest('[data-db]');if(db){BP.det.f=+db.dataset.db;detPress();return}
 const ci=e.target.closest('[data-ci]');if(ci){BP.cfg.i=+ci.dataset.ci;cfgRender();cfgPress();return}});
bpEl.addEventListener('contextmenu',e=>{e.preventDefault();if(BP.on&&!BP.ov&&!BP.kb)bpIn('guide')});
bpEl.addEventListener('wheel',e=>{if(BP.ov||BP.kb||BP.side.open)return;if(BP.scr==='home'){e.preventDefault();homeSel(BP.home.idx+(e.deltaY>0||e.deltaX>0?1:-1))}},{passive:false});

// ---- reserva: Gamepad API do navegador, se o SDL nao carregar ----
(function(){const NAMES=['south','east','west','north','leftShoulder','rightShoulder','lt','rt','back','start','leftStick','rightStick','dpadUp','dpadDown','dpadLeft','dpadRight','guide'];
 const prev={};let on=false;
 function loop(){if(!on)return;requestAnimationFrame(loop);if(!document.hasFocus())return;
  for(const gp of navigator.getGamepads?navigator.getGamepads():[]){if(!gp||gp.mapping!=='standard')continue;
   const st={};NAMES.forEach((n,i)=>{const b=gp.buttons[i];st[n]=!!(b&&(b.pressed||b.value>.55))});
   const [x,y]=gp.axes;st.lsLeft=x<-.55;st.lsRight=x>.55;st.lsUp=y<-.55;st.lsDown=y>.55;st.rsUp=gp.axes[3]<-.55;st.rsDown=gp.axes[3]>.55;
   const p=prev[gp.index]||{},type=/054c|dualsense|dualshock|playstation/i.test(gp.id)?'ps5':/057e|nintendo|pro controller/i.test(gp.id)?'nintendo':'xbox';
   for(const n in st)if(st[n]!==!!p[n])bpPad({t:st[n]?'down':'up',b:n,type});prev[gp.index]=st}}
 setTimeout(async()=>{try{const r=await api('pad_info');BP.padOk=!!r.ok}catch{BP.padOk=false}if(!BP.padOk){on=true;requestAnimationFrame(loop)}},2500)})();
window.bpSet=bpSet;
})();
