// ===== Modo Big Picture (controle, teclado e mouse) =====
// Usa as funcoes e o estado do index.html (S, api, play, load, coverSrc, wallSrc...).
(()=>{
let HOLD=false;
const BP={on:false,th:'orig',scr:'home',hist:[],style:'kb',padOk:null,
 home:{list:[],idx:0,sel:null,rk:''},lib:{tab:0,tabs:[],idx:0,sel:{},rk:'',sort:'name',f:{}},det:{g:null,f:0},cfg:{i:0},ed:{i:1},dev:{i:0,bt:null,t:0},srch:{q:'',list:[],idx:0},topF:false,side:{open:false,i:0},ov:null,kb:null};
try{const t=localStorage.getItem('bpth');if(t==='ps')BP.th=t}catch{}
const BPTH=[['orig','Registrando Games'],['ps','PlayStation']];
BP.pads={};BP.cz=100;BP.sq=false;try{BP.sq=localStorage.getItem('bpsq')==='1'}catch{}try{const o=JSON.parse(localStorage.getItem('bplib')||'{}');if(o.sort)BP.lib.sort=o.sort;if(o.f)BP.lib.f=o.f}catch{}try{BP.cz=Math.max(70,Math.min(160,+localStorage.getItem('bpcz')||100))}catch{}
const SV=(d,f)=>`<svg viewBox="0 0 24 24" ${f?'fill="currentColor"':'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true">${d}</svg>`;
const BPI={
 play:SV('<path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z"/>',1),
 stop:SV('<rect x="5" y="5" width="14" height="14" rx="2"/>',1),
 inst:SV('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>'),
 fav:SV('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>'),
 favOn:SV('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',1),
 edit:SV('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/>'),
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
<div class="bp-top"><div class="bp-av">${BPI.pad}</div><div class="bp-cw"><div class="bp-cats" id="bpcats"></div></div><button class="bp-sr" id="bpsr" title="Pesquisar jogo" aria-label="Pesquisar jogo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span>Pesquisar</span></button><div class="bp-bat" id="bpbat"></div><div class="bp-clk" id="bpclk"></div></div>
<div class="bp-sb" id="bpsb"><div class="sb-in"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span id="bpsbt"></span></div></div>
<section class="bp-scr" id="bps-home"><div class="bp-sec" id="bpsec">Jogados recentemente</div><div class="bp-row"><div class="bp-trk" id="bptrk"></div></div><div class="bp-info" id="bpinfo"></div></section>
<section class="bp-scr" id="bps-lib" hidden><div class="bl-tabs" id="bltabs"></div><div class="bl-g" id="blg"></div></section>
<section class="bp-scr" id="bps-det" hidden></section>
<section class="bp-scr" id="bps-srch" hidden><div class="sr-q" id="srq"></div><div class="bl-g" id="srg"></div></section>
<section class="bp-scr" id="bps-edit" hidden><div class="bc-l" id="bel"></div></section>
<section class="bp-scr" id="bps-dev" hidden><div class="bc-l" id="bdl"></div></section>
<section class="bp-scr" id="bps-cfg" hidden><div class="bc-l" id="bcl"></div></section>
<div class="bp-foot" id="bpfoot"></div>
<div class="bp-side" id="bpside"></div>
<div class="bp-ov" id="bpov" hidden></div><div class="bp-kb" id="bpkb" hidden></div><div class="bp-toast" id="bptoast"></div>`;
document.body.appendChild(bpEl);
const bq=s=>bpEl.querySelector(s);
// rola so o container (scrollIntoView rolaria a tela inteira do Big Picture)
// rolagem propria (rAF): segue o alvo mesmo quando ele muda a cada passo do d-pad segurado
function scrollAnim(c,y){c._tgt=y;if(c._raf)return;const st=()=>{const cur=c.scrollTop,d=c._tgt-cur;if(Math.abs(d)<1){c.scrollTop=c._tgt;c._raf=0;return}c.scrollTop=cur+d*(HOLD?0.42:0.26);c._raf=requestAnimationFrame(st)};c._raf=requestAnimationFrame(st)}
function scrV(c,el,smooth){if(!c||!el)return;let t=0,e=el;while(e&&e!==c){t+=e.offsetTop;e=e.offsetParent}if(e!==c){const r=el.getBoundingClientRect(),cr=c.getBoundingClientRect();t=r.top-cr.top+c.scrollTop}
 const p=Math.round(c.clientHeight*.12),b=t+el.offsetHeight;let y=c._raf?c._tgt:c.scrollTop;const y0=y;if(t-p<y)y=t-p;else if(b+p>y+c.clientHeight)y=b+p-c.clientHeight;y=Math.max(0,Math.min(y,c.scrollHeight-c.clientHeight));
 if(y===y0&&y===c.scrollTop)return;if(!smooth){if(c._raf){cancelAnimationFrame(c._raf);c._raf=0}c.scrollTop=y;c._tgt=y;return}scrollAnim(c,y)}
function scrH(c,el){if(!c||!el)return;c.scrollTo({left:Math.max(0,el.offsetLeft-c.clientWidth/2+el.offsetWidth/2),behavior:'smooth'})}
const lgStyle=g=>{const s=(g.bpLogoSize||120)/120,x=g.bpLogoX||0,y=g.bpLogoY||0;return `height:${(13*s).toFixed(2)}vh;width:auto;max-height:none;max-width:none;transform:translate(${x}vw,${-y}vh)`};

// ---- rotulos dos botoes conforme o controle ----
const BPGL={xbox:{a:'A',b:'B',x:'X',y:'Y',lb:'LB',rb:'RB',start:'☰',lt:'LT',rt:'RT'},ps5:{lb:'L1',rb:'R1',lt:'L2',rt:'R2'},ps4:{lb:'L1',rb:'R1',lt:'L2',rt:'R2'},
 nin:{a:'B',b:'A',x:'Y',y:'X',lb:'L',rb:'R',start:'+',lt:'ZL',rt:'ZR'},kb:{a:'Enter',b:'Esc',x:'F',y:'R',lb:'Q',rb:'E',start:'O',lt:'PgUp',rt:'PgDn'}};
const PSY={a:'<path d="M7.5 7.5l9 9M16.5 7.5l-9 9"/>',b:'<circle cx="12" cy="12" r="5.2"/>',x:'<rect x="7.3" y="7.3" width="9.4" height="9.4" rx=".6"/>',y:'<path d="M12 6.6l5.6 9.8H6.4z"/>'};
const PSV=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${d}</svg>`;
const glyph=k=>{const P=BP.style==='ps5'||BP.style==='ps4';
 if(P&&PSY[k])return `<i class="g g-${k} gp">${PSV(PSY[k])}</i>`;
 if(BP.style==='ps5'&&k==='start')return `<i class="g g-start gp5o"><svg viewBox="0 0 14 26" fill="currentColor" aria-hidden="true"><rect x="2" y="1" width="10" height="2" rx="1"/><rect x="2" y="4.6" width="10" height="2" rx="1"/><rect x="2" y="8.2" width="10" height="2" rx="1"/><path d="M3.2 12h7.6l1 11.2a2.6 2.6 0 0 1-2.6 2.8H4.8a2.6 2.6 0 0 1-2.6-2.8z"/></svg></i>`;
 if(BP.style==='ps4'&&k==='start')return `<i class="g g-start gp4o">OPTIONS</i>`;
 const t=(BPGL[BP.style]||BPGL.xbox)[k]||k;return `<i class="g g-${k}${t.length>2?' sh':''}">${t}</i>`};
function bpStyleFrom(m){const t=String(m.type||'').toLowerCase(),s=String(m.south||'').toLowerCase();
 const st=/ps3|ps4|dualshock/.test(t)?'ps4':/ps5|playstation|dualsense/.test(t)||s==='cross'?'ps5':/nintendo|switch|joycon/.test(t)||s==='b'?'nin':'xbox';
 if(st!==BP.style){BP.style=st;bpClass();bpFoot();if(BP.ov)ovRender();if(BP.kb)kbRender()}}
function bpClass(){bpEl.className='th-'+BP.th+' st-'+BP.style+' scr-'+BP.scr+(BP.side.open?' side-on':'')+(BP.kb?' kb-on':'')+(bpEl.classList.contains('nocur')?' nocur':'')+(BP.sq?' sqm':'')+(bpEl.classList.contains('ov-light')?' ov-light':'')+(bpEl.classList.contains('tab-f')?' tab-f':'')+(bpEl.classList.contains('top-f')?' top-f':'')}

// ---- utilidades de jogo ----
const vis=()=>S.games.filter(g=>!g.hidden);
const bpRec=l=>[...l].sort((a,b)=>(b.last_played||0)-(a.last_played||0)||NC(a,b));
function bpAct(g){const run=S.running.includes(g.id),ins=(S.inst||[]).includes(g.id),ok=(g.appid||g.lkey)?ins:!!(g.exe||g.rom);
 if(run&&(g.exe||g.proc))return ['stop','Parar',BPI.stop];if(run||LAUNCH[g.id]>Date.now()-60000)return ['playing','Jogando',BPI.play];
 if(!ok)return ['inst','Instalar',BPI.inst];return ['play','Jogar',BPI.play]}
const sqSrc=g=>g.sq?encodeURI('file:///'+S.coversDir.replace(/\\/g,'/')+'/'+g.sq):'';
function bpTile(g,j,home){const cv=(home&&(BP.sq||BP.th==='ps')&&sqSrc(g))||coverSrc(g),run=S.running.includes(g.id);
 return `<div class="bt" data-bi="${j}"><div class="bi">${cv?`<img src="${esc(cv)}" loading="lazy" decoding="async" alt="" onerror="this.remove()">`:''}<span class="bn">${esc(g.name)}</span></div>${run?'<i class="rn" title="Rodando"></i>':''}<span class="nm">${home?plIco(g):''}<b>${esc(g.name)}</b></span></div>`}
let BGT=0,BGF=0,BGK=0,BGL='';
function bpBg(g){const sig=g?g.id+'|'+wallSrc(g)+'|'+coverSrc(g):'';if(sig===BGL)return;BGL=sig;clearTimeout(BGT);const k=++BGK;
 BGT=setTimeout(()=>{const L=bpEl.querySelectorAll('.bp-bgi');
  const use=(u,blur)=>{if(k!==BGK)return;const nx=L[BGF^1];nx.style.backgroundImage=u?`url("${u.replace(/"/g,'%22')}")`:'none';nx.classList.toggle('blur',!!blur);L[BGF].classList.remove('on');nx.classList.add('on');BGF^=1};
  if(!g)return use('',false);const ws=wallSrc(g),cv=coverSrc(g);
  if(ws){const im=new Image();im.onload=()=>use(ws,false);im.onerror=()=>use(cv,true);im.src=ws}else use(cv,true)},140)}
let BPTT=0;function bpToast(t){const e=bq('#bptoast');e.textContent=t;e.classList.add('on');clearTimeout(BPTT);BPTT=setTimeout(()=>e.classList.remove('on'),2600)}
function bpClock(){bq('#bpclk').textContent=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
setInterval(()=>{if(BP.on)bpClock()},10000);
const SCRN={home:'Início',lib:'Biblioteca',cfg:'Configurações',det:'',srch:'Pesquisar',edit:'Editar jogo',dev:'Controles e fones'};
function bpTop(){const nf=Object.keys(BP.lib.f).length,ex=BP.scr==='lib'?`<span class="ct sub">${esc((SORTS.find(x=>x[0]===BP.lib.sort)||SORTS[0])[1])}${nf?` · ${nf} filtro${nf>1?'s':''}`:''}</span>`:'';bq('#bpcats').innerHTML=BP.scr==='det'?'':`<span class="ct on">${SCRN[BP.scr]}</span>`+ex;bq('#bpcats').style.transform=''}
function bpFoot(){let h;
 if(BP.kb&&BP.style==='kb')h=[['<i class="g sh">Enter</i>','Confirmar'],['<i class="g sh">⌫</i>','Apagar'],['<i class="g sh">Esc</i>','Cancelar']];
 else if(BP.kb)h=[[glyph('a'),'Digitar'],[glyph('x'),'Apagar'],[glyph('y'),'Espaço'],[glyph('start'),'Confirmar'],[glyph('b'),'Cancelar']];
 else if(BP.scr==='lib'&&BP.lib.mv)h=[['<i class="g sh">←→</i>','Mover aba'],[glyph('a'),'Pronto']];
 else if(BP.scr==='lib')h=[[glyph('start'),BP.lib.tf?'Alterar abas':((C=>C&&C.grp&&C.base==='col')(BP.lib.tabs[BP.lib.tab])?'Trocar ícone':'Opções')],[glyph('y'),'Ordenar'],[glyph('x'),'Filtrar'],[glyph('a'),'Selecionar'],[glyph('b'),'Voltar']];
 else h=[[glyph('start'),'Opções'],[glyph('a'),'Selecionar'],[glyph('b'),'Voltar']];
 const KS=['a','x','y','start','b'];bq('#bpfoot').innerHTML=h.map(([g,t])=>{const k=(g.match(/g-(\w+)/)||[])[1]||'';return `<span data-fk="${k}">${g}${t}</span>`}).join('')}

// ---- telas ----
function bpGo(scr,push=true){BP.topF=false;BP.lib.tf=false;bpEl.classList.remove('tab-f');if(push&&BP.scr!==scr)BP.hist.push(BP.scr);BP.scr=scr;
 bpEl.querySelectorAll('.bp-scr').forEach(s=>s.hidden=s.id!=='bps-'+scr);bpClass();bpTop();bpFoot();bpPaint(true)}
function bpBack(){if(BP.scr==='home')return;const p=BP.hist.pop()||'home';bpGo(p,false)}
function bpPaint(full){if(!BP.on)return;({home:homeRender,lib:libRender,det:detRender,cfg:cfgRender,srch:srchRender,edit:edRender,dev:devRender})[BP.scr](full);topUi()}

// Inicio: so jogos instalados ou jogados recentemente
function homeRender(full){const H=BP.home,A=bpRec(vis().filter(g=>g.last_played)),L=A.slice(0,20);if(A.length>20)L.push({id:'__more',more:true,name:'Veja mais na sua biblioteca'});H.list=L;
 const key=BP.th+(BP.sq?'q':'')+L.map(g=>g.id+(S.running.includes(g.id)?'r':'')+(g.cover||'')+(g.sq||'')).join(',');
 if(full||key!==H.rk){H.rk=key;bq('#bptrk').innerHTML=L.length?L.map((g,j)=>g.more?`<div class="bt bmore" data-bi="${j}"><div class="bi"><span class="mr">${BPI.lib}<b>Veja mais na sua biblioteca</b></span></div></div>`:bpTile(g,j,1)).join(''):'<div class="bp-empty">Nenhum jogo jogado recentemente.<br>Aperte o botão Home para abrir a Biblioteca.</div>'}
 homeSel(Math.max(0,L.findIndex(g=>g.id===H.sel)),true)}
const TG={orig:{w:15,ws:18,g:1.4},ps:{w:11,ws:15.5,g:1.1},sq:{w:20,ws:24,g:1.4}};
function homeGeo(){const t=(BP.sq&&BP.th==='orig'?TG.sq:TG[BP.th])||TG.orig,vh=innerHeight/100,vw=innerWidth/100,z=BP.cz/100;return{w:t.w*vh*z,ws:t.ws*vh*z,g:t.g*vw,pad:4*vw}}
function homeTx(i,mouse){const H=BP.home,G=homeGeo(),st=G.w+G.g;if(!mouse){H.tx=-i*st}else{const x=G.pad+i*st+(H.tx||0),R=innerWidth-G.pad*0.5,Lm=G.pad*0.5;if(x+G.ws>R)H.tx=(H.tx||0)-(x+G.ws-R);else if(x<Lm)H.tx=(H.tx||0)+(Lm-x);H.tx=Math.min(0,H.tx||0)}bq('#bptrk').style.transform=`translateX(${H.tx}px)`}
function homeSel(i,force,mouse){const H=BP.home,L=H.list;if(!L.length){bq('#bpinfo').innerHTML='';bpBg(null);return}i=Math.max(0,Math.min(L.length-1,i));
 if(i===H.idx&&!force&&H.sel===L[i].id)return;H.idx=i;H.sel=L[i].id;
 const T=bq('#bptrk'),K=T.children;for(let q=0;q<K.length;q++){const c=K[q];c.classList.toggle('on',q===i);c.classList.toggle('aft',q>i)}const t=K[i];
 if(t)homeTx(i,mouse)
 const g=L[i];if(g.more){const IE=bq('#bpinfo');if(IE._id!=='__more'){IE._id='__more';IE._k='';IE.innerHTML=`<div class="bi-t"><h1>Biblioteca</h1></div>`}return}const lg=logoSrc(g)&&!g.logoHide?logoSrc(g):'';
 const IE=bq('#bpinfo'),IK=g.id+'|'+lg+'|'+lgStyle(g)+'|'+g.name;if(IE._k===IK)return;const nw=IE._id!==g.id;IE._k=IK;IE._id=g.id;if(nw){IE.classList.remove('fi');void IE.offsetWidth;IE.classList.add('fi')}IE.innerHTML=`<div class="bi-t${lg?' lg':''}">${lg?`<img class="bi-lg" style="${lgStyle(g)}" src="${esc(lg)}" alt="" onerror="this.parentElement.classList.remove('lg');this.remove()">`:''}<h1>${esc(g.name)}</h1></div>`;bpBg(g)}

// Biblioteca: abas como na Steam (Todos, Instalados, Favoritos, launchers/plataformas, listas)
const libSave=()=>{try{localStorage.setItem('bplib',JSON.stringify({sort:BP.lib.sort,f:BP.lib.f}))}catch{}};
const yr=g=>g.released?new Date(g.released*1000).getFullYear():0;
function libPass(g){const f=BP.lib.f;if(f.status&&g.status!==f.status)return false;if(f.platform&&canonP(g.platform)!==f.platform)return false;if(f.genre&&!(g.genres||[]).includes(f.genre))return false;if(f.year&&yr(g)!==f.year)return false;return true}
const libSort=l=>{const fn=SORT[BP.lib.sort]||NC;return [...l].sort((a,b)=>fn(a,b)||NC(a,b))};
const LTABS=[['all','Todos'],['inst','Instalados'],['col','Coleções'],['lists','Listas'],['fav','Favoritos'],['rec','Recentes']];
BP.ltab={all:1,inst:1,col:1,fav:0,rec:0,lists:0};try{Object.assign(BP.ltab,JSON.parse(localStorage.getItem('bptabs')||'{}'))}catch{}
BP.tord=[];try{BP.tord=JSON.parse(localStorage.getItem('bptord')||'[]')}catch{}
BP.colIco={};try{BP.colIco=JSON.parse(localStorage.getItem('bpcolico')||'{}')}catch{}
const isManual=g=>!g.appid&&!g.lkey;
const byPlat=v=>{const by=new Map();for(const g of v){const p=canonP(g.platform)||'Outros';if(!by.has(p))by.set(p,[]);by.get(p).push(g)}return by};
// aba com grupos (Colecoes e Listas): mostra os cartoes; A abre o grupo e mostra os jogos
function grpTab(k,n,groups){const op=BP.lib.open&&BP.lib.open.k===k&&groups.find(x=>x.id===BP.lib.open.id);
 if(op)return{k:k+':'+op.id,base:k,n,cnt:groups.length,sub:op,g:k==='lists'?op.games:libSort(op.games)};
 return{k,base:k,n,cnt:groups.length,grp:true,g:groups}}
function libTabs(){const v=vis().filter(libPass),T=BP.ltab,t=[],by=byPlat(v);
 if(T.all)t.push({k:'all',n:'Todos',g:libSort(v)});
 if(T.inst)t.push({k:'inst',n:'Instalados',g:libSort(v.filter(g=>!g.cat&&((S.inst||[]).includes(g.id)||(canonP(g.platform)==='PC'&&isManual(g)&&(g.exe||g.proc)))))});
 if(T.col)t.push(grpTab('col','Coleções',[...by.entries()].sort((a,b)=>dispP(a[0]).localeCompare(dispP(b[0]))).map(([p,l])=>({id:p,kind:'col',name:dispP(p),games:l}))));
 if(T.lists)t.push(grpTab('lists','Listas',(S.lists||[]).map(L=>({id:L.id,kind:'list',name:L.name||'Lista',games:(L.ids||[]).map(id=>v.find(g=>g.id===id)).filter(Boolean)})).filter(x=>x.games.length)));
 if(T.fav){const fav=v.filter(g=>g.fav);t.push({k:'fav',n:'Favoritos',g:libSort(fav)})}
 if(T.rec){const rec=v.filter(g=>g.last_played);t.push({k:'rec',n:'Recentes',g:bpRec(rec)})}
 for(const[p,l]of[...by.entries()].sort((a,b)=>dispP(a[0]).localeCompare(dispP(b[0]))))if(T['p:'+p])t.push({k:'p:'+p,n:dispP(p),g:libSort(l)});
 if(!t.length)t.push({k:'all',n:'Todos',g:libSort(v)});
 const O=BP.tord,ix=x=>{const i=O.indexOf(x.base||x.k);return i<0?999:i};return t.map((x,i)=>[x,i]).sort((a,b)=>ix(a[0])-ix(b[0])||a[1]-b[1]).map(x=>x[0])}
function colIcon(p){const c=BP.colIco[p];if(c&&c.startsWith('data:'))return `<img class="cli" src="${esc(c)}" alt="">`;const k=c||(BRAND[p]||(CONSOLES.some(x=>x.n===p)?CSLUG(p):null));return (k&&ICO[k])||BPI.lib}
function grpTile(c,j){if(c.kind==='list'){const cv=c.games.slice(0,4).map(g=>coverSrc(g)).filter(Boolean);
  return `<div class="bt bcol blst" data-bi="${j}"><div class="bi"><span class="mos n${cv.length}">${cv.map(u=>`<img src="${esc(u)}" alt="" loading="lazy">`).join('')}</span><span class="cl"><b>${esc(c.name)}</b><em>${c.games.length} jogo${c.games.length===1?'':'s'}</em></span></div></div>`}
 return `<div class="bt bcol" data-bi="${j}"><div class="bi"><span class="cl"><span class="ci">${colIcon(c.id)}</span><b>${esc(c.name)}</b><em>${c.games.length} jogo${c.games.length===1?'':'s'}</em></span></div></div>`}
const tabSave=()=>{try{localStorage.setItem('bptabs',JSON.stringify(BP.ltab))}catch{}};
function tabMove(d){const B=BP.lib,T=B.tabs,ks=T.map(x=>x.base||x.k),i=B.tab,j=i+d;if(j<0||j>=ks.length)return;[ks[i],ks[j]]=[ks[j],ks[i]];
 BP.tord=[...ks,...BP.tord.filter(k=>!ks.includes(k))];try{localStorage.setItem('bptord',JSON.stringify(BP.tord))}catch{}B.tab=j;libRender(true);tabFocus(true)}
function tabsMenu(){const plats=[...byPlat(vis()).keys()].sort((a,b)=>dispP(a).localeCompare(dispP(b)));
 const all=[...LTABS.map(([k,n])=>[k,n]),...plats.map(p=>['p:'+p,dispP(p)])];
 const o={type:'menu',title:'Alterar abas',sub:'A mostra ou esconde cada aba',items:[{n:'Mudar a posição das abas',ar:1,fn:()=>{ovClose(true);BP.lib.mv=true;bpEl.classList.add('tab-mv');bpFoot();bpToast('←/→ move a aba · A ou B termina')}},...all.map(([k,n],i)=>({n,ck:!!BP.ltab[k],fn:()=>{BP.ltab[k]=BP.ltab[k]?0:1;if(!all.some(([x])=>BP.ltab[x]))BP.ltab.all=1;tabSave();o.items.forEach((it,j)=>{if(j)it.ck=!!BP.ltab[all[j-1][0]]});ovRender();BP.lib.open=null;BP.lib.rk='';libRender(true);tabFocus(true)}}))]};ovOpen(o)}
// trocar o icone de uma colecao
function colIconMenu(c){const opts=[...CATALOG.map(n=>[BRAND[n],n]),...CONSOLES.map(x=>[CSLUG(x.n),x.n])].filter(([k])=>ICO[k]);
 const cur=BP.colIco[c.id];const ov={type:'ico',title:'Ícone da coleção',sub:c.name,items:[['','Padrão'],...opts,['__pc','Imagem do PC…']],i:0,c};
 ov.i=Math.max(0,ov.items.findIndex(x=>x[0]===(cur&&!cur.startsWith('data:')?cur:'')));ovOpen(ov)}
async function colIcoSet(ov){const [k]=ov.items[ov.i],id=ov.c.id;
 if(k==='__pc'){const r=await api('pick_img');if(!r||!r.data)return;try{BP.colIco[id]=await new Promise((ok,no)=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),m=128,s=Math.min(1,m/Math.max(im.width,im.height));c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);ok(c.toDataURL('image/png'))};im.onerror=no;im.src=r.data})}catch{return bpToast('Não consegui usar essa imagem.')}}
 else if(!k)delete BP.colIco[id];else BP.colIco[id]=k;
 try{localStorage.setItem('bpcolico',JSON.stringify(BP.colIco))}catch{}ovClose(true);BP.lib.rk='';libRender(true);bpToast('Ícone trocado')}
function libRender(full){const B=BP.lib,T=B.tabs=libTabs();if(B.tab>=T.length)B.tab=0;const C=T[B.tab];
 bq('#bltabs').innerHTML=`<span class="tg">${glyph('lb')}</span>`+T.map((t,i)=>`<span class="tb${i===B.tab?' on':''}" data-lt="${i}">${esc(t.n)}${t.sub?`<b class="tsub">› ${esc(t.sub.name)}</b>`:''}<em>${t.sub?t.g.length:t.cnt!=null?t.cnt:t.g.length}</em></span>`).join('')+`<span class="tg">${glyph('rb')}</span>`;
 scrH(bq('#bltabs'),bq('#bltabs .tb.on'));if(B.tf){const t=bq('#bltabs .tb.on');t&&t.classList.add('f')}
 const key=C.k+'|'+C.g.map(g=>g.id+(g.cover||'')).join(',');
 if(full||key!==B.rk){B.rk=key;const G=bq('#blg');G.classList.toggle('cols',!!C.grp);G.innerHTML=(C.grp?C.g.map(grpTile):C.g.map(bpTile)).join('')||'<div class="bp-empty">Nenhum jogo aqui.</div>';if(B.lastK!==C.k){G.scrollTop=0;G._ty=null;B.lastK=C.k}}
 libSel(Math.max(0,C.g.findIndex(g=>g.id===B.sel[C.k])),true)}
function libSel(i,force,mouse){const B=BP.lib,C=B.tabs[B.tab];if(!C||!C.g.length){bpBg(null);return}i=Math.max(0,Math.min(C.g.length-1,i));
 B.idx=i;B.sel[C.k]=C.g[i].id;const G=bq('#blg');G.querySelectorAll('.bt.on').forEach(x=>x.classList.remove('on'));const t=G.children[i];if(C.grp){if(t){t.classList.add('on');if(!mouse)scrV(G,t,!force)}bpBg(null);return}
 if(t){t.classList.add('on');if(!mouse)scrV(G,t,!force)}bpBg(C.g[i])}
function tabFocus(on){BP.lib.tf=on;setTimeout(bpFoot);bpEl.classList.toggle('tab-f',on);const t=bq('#bltabs .tb.on');if(t)t.classList.toggle('f',on)}
function libCols(){const G=bq('#blg'),c=G.children;if(c.length<2)return 1;const y=c[0].offsetTop;let n=0;for(const e of c){if(e.offsetTop!==y)break;n++}return n||1}

// Detalhes do jogo (parecido com o modo tela cheia do launcher)
function detOpen(g){BP.det.g=g.id;BP.det.f=0;bpGo('det')}
function detGame(){return S.games.find(x=>x.id===BP.det.g)}
function detBtns(g){const a=bpAct(g),b=[{k:'a',n:a[1],ic:a[2],cls:'pri a-'+a[0]},{k:'fav',n:g.fav?'Favorito':'Favoritar',ic:g.fav?BPI.favOn:BPI.fav,cls:g.fav?'on':''}];
 if((g.review||'').trim())b.push({k:'rev',n:'Ler review',ic:BPI.book,cls:''});b.push({k:'edit',n:'Editar',ic:BPI.edit,cls:''});return b}
function detRender(){const g=detGame(),el=bq('#bps-det');if(!g){bpBack();return}
 const t=secs(g),lg=logoSrc(g)&&!g.logoHide?logoSrc(g):'',rp=(g.replays||[]).length,btn=detBtns(g);BP.det.f=Math.min(BP.det.f,btn.length-1);
 const row=(k,v)=>v?`<div class="dr"><span>${k}</span><b>${v}</b></div>`:'';
 const h=`<div class="dt-c"><div class="bi-t${lg?' lg':''}">${lg?`<img class="bi-lg" style="${lgStyle(g)}" src="${esc(lg)}" alt="" onerror="this.parentElement.classList.remove('lg');this.remove()">`:''}<h1>${esc(g.name)}</h1></div>
 <div class="dt-p">${g.score!=null?`<span class="pi">Nota: <b style="color:${scC(g.score)}">${scF(g.score)}</b></span>`:''}${g.platform?`<span class="pi">${esc(dispP(canonP(g.platform)))}</span>`:''}${g.released?`<span class="pi">${dpt(g.released)}</span>`:''}${(g.genres||[]).map(x=>`<span class="pi">${esc(x)}</span>`).join('')}</div>
 <div class="dt-g">${row('Status',`${esc(stN(g.status||'Backlog'))}<i class="sd" style="background:${COL[g.status||'Backlog']}"></i>`)}${row('Finalizado em',g.status==='Zerado'&&g.finished?dpt(g.finished):'')}${row('Replays',rp?rp+'×':'')}${row('Tempo de jogo',t?fmt(t):'')}${row('Último jogo',g.last_played?dpt(g.last_played):'')}</div>
 ${(g.review||'').trim()?`<p class="dt-r">${esc(g.review)}</p>`:''}
 <div class="dt-b">${btn.map((b,i)=>`<button class="db ${b.cls}${i===BP.det.f?' f':''}" data-db="${i}">${b.ic}${esc(b.n)}</button>`).join('')}</div></div>`;if(el._h!==h){el._h=h;el.innerHTML=h}
 bpBg(g)}
function detPress(){const g=detGame();if(!g)return;const b=detBtns(g)[BP.det.f];if(!b)return;
 if(b.k==='a')return bpPlay(g);if(b.k==='fav')return bpFav(g);if(b.k==='rev')ovOpen({type:'text',title:g.name,text:g.review});if(b.k==='edit')edOpen(g)}

// Configuracoes
function cfgRows(){const c=S.config,mask=v=>v?(v.length>8?v.slice(0,4)+'••••'+v.slice(-4):'••••'):'Não preenchido';
 const txt=(n,k,ph,sec)=>({t:'txt',n,v:c[k]||'',show:sec?mask(c[k]):(c[k]||'Não preenchido'),fn:()=>kbOpen(n,c[k]||'',ph,async v=>{c[k]=v;await saveCfgBP();bpToast('Salvo')})});
 const tog=(n,on,fn)=>({t:'tog',n,on,fn});
 return [{t:'h',n:'Dispositivos'},{t:'act',n:'Controles e fones de ouvido',show:'Ver bateria',fn:()=>{BP.dev.i=0;bpGo('dev');devLoad(true)}},{t:'h',n:'Big Picture'},{t:'ch',n:'Tema',show:(BPTH.find(x=>x[0]===BP.th)||BPTH[0])[1],fn:themeMenu},{t:'act',n:'Capas no Início (tamanho e formato)',show:BP.cz+'% · '+(BP.sq?'Quadrado 1:1':'Vertical 2:3'),fn:czOpen},
  {t:'h',n:'Sons da interface'},{t:'tog',n:'Sons da interface',on:BP.snd.on,fn:v=>{BP.snd.on=v;sndSave();cfgRender()},local:1},{t:'num',n:'Volume dos sons',show:BP.snd.vol+'%',fn:d=>{BP.snd.vol=Math.max(0,Math.min(100,BP.snd.vol+10*d));sndSave();cfgRender();sndPreset('tick')}},
  {t:'ch',n:'Som de cada ação',show:SNDE.length+' ações',fn:sndList},
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
 bq('#bcl').innerHTML=R.map((r,i)=>r.t==='h'?`<div class="bc-h">${esc(r.n)}</div>`:`<div class="bc-r${i===C.i?' f':''}" data-ci="${i}"><span class="bc-n">${esc(r.n)}</span><span class="bc-v">${r.t==='tog'?`<i class="bsw${r.on?' on':''}"><i></i></i>`:r.t==='num'?`<b class="bc-go">‹</b><b class="sc">${esc(r.show)}</b><b class="bc-go">›</b>`:r.t==='act'?`${r.show?`<small>${esc(r.show)}</small>`:''}<b class="bc-go">›</b>`:`${esc(r.show)}<b class="bc-go">›</b>`}</span></div>`).join('');
 scrV(bq('#bcl'),bq('#bcl .bc-r.f'),true);bpBg(null)}
async function cfgPress(d=0){const r=cfgRows()[BP.cfg.i];if(!r||r.t==='h')return;if(r.t==='num'){r.fn(d||1);return}if(d)return;if(r.t==='tog'){snd('toggle');await r.fn(!r.on);if(!r.local)await load();return}r.fn()}
function czOpen(){bpGo('home',false);const o={type:'cz',title:'Capas no Início',v:BP.cz,v0:BP.cz,q0:BP.sq};ovOpen(o);bpEl.classList.add('ov-light')}
function bpSq(){bpEl.classList.toggle('sqm',BP.sq);BP.home.rk='';if(BP.on&&BP.scr==='home')homeRender(true)}
function bpZoom(){bpEl.style.setProperty('--bpz',BP.cz/100);if(BP.on&&BP.scr==='home')homeTx(BP.home.idx)}
function cfgMove(d){const R=cfgRows();let i=BP.cfg.i;do{i+=d}while(R[i]&&R[i].t==='h');if(i<0||i>=R.length)return;BP.cfg.i=i;cfgRender()}

// ---- liga / desliga ----
function bpSet(on){on=!!on;if(on===BP.on)return;BP.on=on;bpEl.hidden=!on;document.body.classList.toggle('bpon',on);api('bp_full',{on});
 if(on){document.querySelectorAll('dialog[open]').forEach(d=>{try{d.close()}catch{}});BP.ov=null;BP.kb=null;BP.side.open=false;bq('#bpov').hidden=true;bq('#bpkb').hidden=true;BP.hist=[];bpClock();bpGo('home',false);sideRender()}
 else{Object.keys(REP).forEach(padUp);if(render._dirty){render._dirty=0;render()}}}
let LIN=0,LSIG='';window.bpBusy=()=>BP.on&&(HOLD||performance.now()-LIN<2500);
function stSig(){let h=S.games.length+'|'+S.running.join()+'|'+(S.inst||[]).length+'|'+(S.lists||[]).map(l=>l.id+(l.ids||[]).length).join();const G=S.games;for(let i=0;i<G.length;i++){const g=G[i];h+=(g.cover||'')+(g.sq||'')+(g.fav?1:0)+(g.hidden?1:0)+(g.cat?1:0)+(g.status||'')[0]+(g.last_played||0)%9973+(g.score??'')+(g.logo||'')+(g.wall||'')+(g.name||'').length}return h}
window.bpOnLoad=()=>{if(BP.on){const sg=stSig();if(sg===LSIG&&!BP.ov&&!BP.kb)return;LSIG=sg;bpPaint(false);if(BP.ov&&BP.ov.type==='logo')logoLive(BP.ov);if(BP.side.open)sideRender();if(BP.ov&&BP.ov.type==='menu')ovRender()}};

// ---- acoes ----
const curGame=()=>BP.scr==='home'?((x=>x&&!x.more?x:null)(BP.home.list[BP.home.idx])):BP.scr==='srch'?BP.srch.list[BP.srch.idx]:BP.scr==='edit'?detGame():BP.scr==='lib'?((x=>x&&!x.kind?x:null)((BP.lib.tabs[BP.lib.tab]||{g:[]}).g[BP.lib.idx])):BP.scr==='det'?detGame():null;
async function bpPlay(g){const a=bpAct(g)[0];if(a==='play')setTimeout(()=>snd('launch'),60);
 if(a==='stop')return bpConfirmStop(g);
 if(a==='playing')return bpToast('O jogo já está abrindo.');
 if(a==='inst'){if(g.appid||g.lkey||g.uri){bpToast('Abrindo o launcher para instalar…');installGame(g)}else bpToast('Esse jogo não tem .exe. Adicione pela tela de editar, fora do Big Picture.');return}
 bpToast('Abrindo '+g.name+'…');await play(g.id)}
async function bpFav(g){await api('save',{id:g.id,fav:!g.fav});bpToast(g.fav?'Removido dos favoritos':'Adicionado aos favoritos');await load()}
function bpConfirmStop(g){ovOpen({type:'menu',title:`Fechar "${g.name}"?`,sub:'O progresso que não foi salvo no jogo será perdido.',items:[{n:'Fechar o jogo',dl:1,fn:async()=>{ovClose(true);bpToast('Fechando…');const r=await api('stop',{id:g.id});if(r&&r.error)bpToast(r.error);delete LAUNCH[g.id];setTimeout(load,800)}},{n:'Cancelar',fn:()=>ovClose(true)}]})}
function bpOpts(){const g=curGame();if(!g)return;const a=bpAct(g),it=[];
 it.push({n:a[1],fn:()=>{ovClose(true);bpPlay(g)}});
 if(BP.scr!=='det')it.push({n:'Ver detalhes',fn:()=>{ovClose(true);detOpen(g)}});
 if(BP.scr!=='edit')it.push({n:'Editar jogo',fn:()=>{ovClose(true);edOpen(g)}});
 if(a[0]==='stop')it.push({n:'Fechar o jogo',dl:1,fn:()=>bpConfirmStop(g)});
 it.push({n:g.fav?'Remover dos favoritos':'Adicionar aos favoritos',fn:()=>{ovClose(true);bpFav(g)}});
 it.push({n:'Trocar capa',ar:1,fn:()=>ovOpen({type:'menu',title:'Trocar capa',sub:g.name,items:[{n:'Capa vertical',ar:1,fn:()=>bpCovers(g,'cover')},{n:'Capa quadrada (1:1)',ar:1,fn:()=>bpCovers(g,'square')},...(g.sq?[{n:'Remover a capa quadrada',dl:1,fn:async()=>{await api('sq_clear',{id:g.id});ovClose(true);await load();bpPaint(true);bpToast('Capa quadrada removida')}}]:[])]},true)});
 it.push({n:'Logo',ar:1,fn:()=>bpLogoMenu(g)});
 it.push({n:'Papel de parede',ar:1,fn:()=>ovOpen({type:'menu',title:'Papel de parede',sub:g.name,items:[{n:'Buscar no SteamGridDB',ar:1,fn:()=>bpCovers(g,'hero')},{n:'Buscar no Wallpaper Abyss',ar:1,fn:()=>bpCovers(g,'abyss')},...(g.wall?[{n:'Remover o papel de parede',dl:1,fn:async()=>{await api('wall_clear',{id:g.id});ovClose(true);BGL='';await load();bpPaint(true);bpToast('Papel de parede removido')}}]:[])]},true)});
 it.push({n:'Mudar status',ar:1,fn:()=>ovOpen({type:'menu',title:'Status',items:ST.map(s=>({n:stN(s),ck:g.status===s,fn:async()=>{const b={id:g.id,status:s};if(s==='Zerado'&&!g.finished)b.finished=Math.floor(Date.now()/1000);await api('save',b);ovClose(true);bpToast('Status: '+stN(s));await load()}}))},true)});
 if((g.review||'').trim())it.push({n:'Ler review',ar:1,fn:()=>ovOpen({type:'text',title:g.name,text:g.review},true)});
 ovOpen({type:'menu',title:g.name,items:it})}
function themeMenu(){ovOpen({type:'menu',title:'Tema do Big Picture',items:BPTH.map(([k,n])=>({n,ck:BP.th===k,fn:()=>{BP.th=k;try{localStorage.setItem('bpth',k)}catch{}bpClass();ovClose(true);bpPaint(true);bpToast('Tema: '+n)}}))},!!BP.ov)}
const KTIT={abyss:'Wallpaper Abyss',square:'Capa quadrada (1:1)',cover:'Trocar capa',logo:'Trocar logo',hero:'Trocar papel de parede'};
async function bpCovers(g,kind='cover'){if(kind!=='abyss'&&!S.config.sgdb){bpToast('Para trocar imagens, coloque a chave do SteamGridDB nas Configurações.');return}
 const ov={type:'grid',kind,title:KTIT[kind],sub:(kind==='abyss'?g.wpname:g.sgname)||g.name,q:(kind==='abyss'?g.wpname:g.sgname)||g.name,items:[],i:0,page:-1,more:true,loading:false,g};ovOpen(ov,true);await bpCovMore(ov)}
function covRename(ov){kbOpen('Nome usado na busca do SteamGridDB',ov.q,'Ex.: o nome em inglês',v=>{v=v.trim();if(!v)return;ov.q=v;ov.sub=v;ov.items=[];ov.i=0;ov.page=-1;ov.more=true;ovRender();bpCovMore(ov)})}
async function covPc(ov){const r=await api('pick_img');if(!r||!r.data)return;bpToast('Aplicando a imagem…');
 try{const g=ov.g;if(ov.kind==='cover'){await api('cover_data',{id:g.id,data:await toCover(r.data)})}
  else if(ov.kind==='square'){const d=await new Promise((ok,no)=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),z=Math.min(im.width,im.height),o=Math.min(1024,z);c.width=c.height=o;c.getContext('2d').drawImage(im,(im.width-z)/2,(im.height-z)/2,z,z,0,0,o,o);ok(c.toDataURL('image/jpeg',.92))};im.onerror=no;im.src=r.data});const x=await api('img_local',{id:g.id,kind:'sq',data:d});if(x&&x.error)throw 0}
  else{const x=await api('img_local',{id:g.id,kind:ov.kind==='hero'||ov.kind==='abyss'?'wall':'logo',data:r.data});if(x&&x.error)throw 0}
  ovClose(true);BGL='';await load();bpPaint(true);bpToast('Imagem aplicada!')}catch{bpToast('Não consegui usar essa imagem.')}}
function bpLogoMenu(g){g=S.games.find(x=>x.id===g.id)||g;ovOpen({type:'menu',title:'Logo',sub:g.name,items:[
  {n:'Ajustar tamanho e posição',ar:1,fn:()=>bpLogoSize(g)},{n:'Trocar logo',ar:1,fn:()=>bpCovers(g,'logo')},
  {n:g.logoHide?'Mostrar a logo':'Ocultar a logo (mostrar o nome)',fn:async()=>{await api('save',{id:g.id,logoHide:!g.logoHide});ovClose(true);await load();bpPaint(true)}},
  {n:'Restaurar tamanho e posição',fn:async()=>{await api('save',{id:g.id,bpLogoSize:120,bpLogoX:0,bpLogoY:0});ovClose(true);await load();bpPaint(true);bpToast('Logo restaurada')}},
  ...(g.logo?[{n:'Remover a logo',dl:1,fn:async()=>{await api('logo_clear',{id:g.id});ovClose(true);await load();bpPaint(true);bpToast('Logo removida')}}]:[])]},true)}
function bpLogoSizeOld(g){ovOpen({type:'size',g,v:g.logoSize||120,g0:g.logoSize||120,title:'Tamanho da logo'},true);if(BP.scr==='home'||BP.scr==='det')bpEl.classList.add('ov-light')}
function bpLogoSize(g){if(!(BP.scr==='home'||BP.scr==='det'))detOpen(g);const v=[g.bpLogoSize||120,g.bpLogoX||0,g.bpLogoY||0];ovOpen({type:'logo',g,v:[...v],v0:v,f:0,title:'Logo no Big Picture'},true);bpEl.classList.add('ov-light');logoLive(BP.ov)}
const LGR=[{n:'Tamanho',min:40,max:260,st:5,u:'%'},{n:'Horizontal',min:0,max:50,st:1,u:''},{n:'Vertical',min:-20,max:30,st:1,u:''}];
function logoLive(o){const L={bpLogoSize:o.v[0],bpLogoX:o.v[1],bpLogoY:o.v[2]};bpEl.querySelectorAll('.bi-lg').forEach(im=>im.style.cssText=lgStyle(L))}
async function bpCovMore(ov){if(ov.loading||!ov.more)return;ov.loading=true;ovRender();
 try{const r=ov.kind==='abyss'?await api('abyss',{id:ov.g.id,page:ov.page+1,q:ov.q}):await api('sgdb',{id:ov.g.id,page:ov.page+1,kind:ov.kind||'cover',q:ov.q});if(r.error){bpToast(r.error);ov.more=false}else{ov.page++;ov.items.push(...(r.items||[]));ov.more=!!r.more}}catch{ov.more=false}
 ov.loading=false;if(BP.ov===ov)ovRender()}
async function bpCovApply(ov){const it=ov.items[ov.i];if(!it)return;bpToast('Aplicando a capa…');
 try{if(ov.kind==='logo'||ov.kind==='hero'||ov.kind==='square'||ov.kind==='abyss'){const r=await api(ov.kind==='logo'?'logo_set':ov.kind==='square'?'sq_sgdb':'wall_url',{id:ov.g.id,url:it.url});if(!r||r.error)throw 0}else{const f=await api('fetch_img',{url:it.url});if(!f.data)throw 0;await api('cover_data',{id:ov.g.id,data:await toCover(f.data)})}ovClose(true);BGL='';await load();bpPaint(true);bpToast(ov.kind==='abyss'?'Papel de parede trocado!':ov.kind==='square'?'Capa quadrada trocada!':ov.kind==='logo'?'Logo trocada!':ov.kind==='hero'?'Papel de parede trocado!':'Capa trocada!')}catch{bpToast('Não consegui usar essa imagem. Tente outra.')}}

// ---- barra lateral (botao Home) ----
const SIDE=()=>[{k:'home',n:'Início',ic:BPI.home,fn:()=>{BP.hist=[];BP.home.sel=null;BP.home.idx=-1;bpGo('home',false)}},{k:'lib',n:'Biblioteca',ic:BPI.lib,fn:()=>{BP.hist=['home'];bpGo('lib',false)}},
 {k:'theme',n:'Tema',ic:BPI.theme,fn:themeMenu},{k:'sync',n:'Atualizar e sincronizar',ic:BPI.sync,fn:()=>{refreshAll();bpToast('Atualizando a biblioteca…')}},
 {k:'cfg',n:'Configurações',ic:BPI.cfg,fn:()=>{BP.hist=['home'];BP.cfg.i=1;bpGo('cfg',false)}},{k:'exit',n:'Sair do Big Picture',ic:BPI.exit,fn:()=>bpSet(false)}];
function sideRender(){const L=SIDE();bq('#bpside').innerHTML=`<div class="sd-h">${BPI.pad}<b>Registrando Games</b></div>`+L.map((x,i)=>`<div class="sd-i${i===BP.side.i?' f':''}${x.k===BP.scr?' cur':''}" data-si="${i}">${x.ic}<span>${x.n}</span></div>`).join('')}
function sideToggle(on){BP.side.open=on===undefined?!BP.side.open:on;if(BP.side.open){const L=SIDE();BP.side.i=Math.max(0,L.findIndex(x=>x.k===BP.scr))}sideRender();bpClass()}
function sideIn(k){const L=SIDE(),n=L.length;if(k==='up')BP.side.i=(BP.side.i-1+n)%n;else if(k==='down')BP.side.i=(BP.side.i+1)%n;
 else if(k==='a'){const x=L[BP.side.i];sideToggle(false);x.fn();return}else if(k==='b'||k==='right'){sideToggle(false);return}else return;sideRender()}

// ---- painel por cima (menus, capas, review) ----
function ovOpen(o,stack){o.i=o.i||0;o.prev=stack?BP.ov:null;BP.ov=o;o.anim=1;ovRender()}
function ovClose(all){BP.ov=all?null:(BP.ov&&BP.ov.prev)||null;ovRender()}
function ovCols(){const g=bq('.bo-g');if(!g)return 6;return getComputedStyle(g).gridTemplateColumns.split(' ').length||6}
function ovRender(){const el=bq('#bpov'),o=BP.ov;bpFoot();el.classList.toggle('anim',!!(o&&o.anim));if(o)o.anim=0;if(!o||(o.type!=='size'&&o.type!=='logo'&&o.type!=='cz'))bpEl.classList.remove('ov-light');if(!o){el.hidden=true;el.innerHTML='';return}el.hidden=false;
 const ft=`<div class="bo-f">${o.type==='grid'?`<span data-fk="y">${glyph('y')}Renomear busca</span><span data-fk="x">${glyph('x')}Do PC</span>`:''}${o.type==='grid'?`<span>${glyph('lb')}${glyph('rb')}Página</span>`:''}${o.type!=='text'?`<span data-fk="a">${glyph('a')}Selecionar</span>`:''}<span data-fk="b">${glyph('b')}Voltar</span></div>`;
 if(o.type==='menu'){el.innerHTML=`<div class="bo-p"><div class="bo-h">${esc(o.title)}</div>${o.sub?`<div class="bo-m">${esc(o.sub)}</div>`:''}<div class="bo-l">${o.items.map((it,j)=>`<div class="bo-i${j===o.i?' on':''}${it.dl?' dl':''}" data-oi="${j}"><span class="ck">${it.ck?'✓':''}</span>${esc(it.n)}${it.ar?'<span class="ar">›</span>':''}</div>`).join('')}</div>${ft}</div>`;scrV(el.querySelector('.bo-l'),el.querySelector('.bo-i.on'),false)}
 else if(o.type==='ico'){el.innerHTML=`<div class="bo-p"><div class="bo-h">${esc(o.title)}<small>${esc(o.sub||'')}</small></div><div class="bo-g bo-ic">${o.items.map(([k,n],j)=>`<div class="gc${j===o.i?' on':''}" data-oi="${j}"><span>${k===''?((d=>(d&&ICO[d])||BPI.lib)(BRAND[o.c.id]||(CONSOLES.some(x=>x.n===o.c.id)?CSLUG(o.c.id):null))):k==='__pc'?SV('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>'):ICO[k]}</span><b>${esc(n)}</b></div>`).join('')}</div>${ft}</div>`;scrV(el.querySelector('.bo-g'),el.querySelector('.gc.on'))}
 else if(o.type==='cz')el.innerHTML=`<div class="bo-p bo-sz"><div class="bo-h">${esc(o.title)}<small>${o.v}%</small></div><div class="szb"><span>${glyph('lb')}</span><div class="szt"><i style="width:${(o.v-70)/90*100}%"></i></div><span>${glyph('rb')}</span></div><div class="czf" data-fk="x"><span>Formato</span><b class="${BP.sq?'':'on'}">Vertical 2:3</b><b class="${BP.sq?'on':''}">Quadrado 1:1</b></div><div class="bo-f"><span>←/→ Ajustar</span><span data-fk="x">${glyph('x')}Formato</span><span>${glyph('y')}Padrão</span><span data-fk="a">${glyph('a')}Salvar</span><span data-fk="b">${glyph('b')}Cancelar</span></div></div>`;
 else if(o.type==='logo')el.innerHTML=`<div class="bo-p bo-sz"><div class="bo-h">${esc(o.title)}</div>${LGR.map((r,i)=>`<div class="lgr${i===o.f?' f':''}" data-lf="${i}"><span>${r.n}</span><div class="szt"><i style="width:${(o.v[i]-r.min)/(r.max-r.min)*100}%"></i></div><b>${o.v[i]}${r.u}</b></div>`).join('')}<div class="bo-f"><span>↑/↓ Escolher · ←/→ Ajustar</span><span>${glyph('y')}Padrão</span><span data-fk="a">${glyph('a')}Salvar</span><span data-fk="b">${glyph('b')}Cancelar</span></div></div>`;
 else if(o.type==='size')el.innerHTML=`<div class="bo-p bo-sz"><div class="bo-h">${esc(o.title)}<small>${o.v}%</small></div><div class="szb"><span>${glyph('lb')}</span><div class="szt"><i style="width:${(o.v-40)/220*100}%"></i></div><span>${glyph('rb')}</span></div><div class="bo-f"><span>←/→ Ajustar</span><span>${glyph('a')}Salvar</span><span>${glyph('b')}Cancelar</span></div></div>`;
 else if(o.type==='date'||o.type==='hm'){const lab=o.type==='date'?['Dia','Mês','Ano']:['Horas','Minutos'],val=o.type==='date'?[String(o.v[0]).padStart(2,'0'),String(o.v[1]).padStart(2,'0'),o.v[2]]:[o.v[0],String(o.v[1]).padStart(2,'0')];
  el.innerHTML=`<div class="bo-p bo-dt"><div class="bo-h">${esc(o.title)}</div><div class="dtf">${val.map((v,i)=>`<div class="dc${i===o.f?' f':''}" data-df="${i}"><span>${lab[i]}</span><b>▲</b><strong>${v}</strong><b>▼</b></div>`).join('')}</div><div class="bo-f">${o.type==='date'?`<span>${glyph('x')}Limpar</span>`:`<span>${glyph('lb')}${glyph('rb')}±10 h</span>`}<span>${glyph('a')}Salvar</span><span>${glyph('b')}Cancelar</span></div></div>`}
 else if(o.type==='text')el.innerHTML=`<div class="bo-p"><div class="bo-h">${esc(o.title)}</div><div class="bo-tx" id="botx">${esc(o.text)}</div>${ft}</div>`;
 else{el.innerHTML=`<div class="bo-p"><div class="bo-h">${esc(o.title)}<small>${esc(o.sub||'')}</small></div><div class="bo-g k-${o.kind||'cover'}">${o.items.map((it,j)=>`<div class="gc${j===o.i?' on':''}" data-oi="${j}"><img src="${esc(it.thumb)}" loading="lazy" alt=""></div>`).join('')}</div>${o.loading?'<div class="bo-m">Carregando capas…</div>':!o.items.length?'<div class="bo-m">Nenhuma capa encontrada.</div>':''}${ft}</div>`;
  scrV(el.querySelector('.bo-g'),el.querySelector('.gc.on'))}}
function ovIn(k){const o=BP.ov;
 if(o.type==='cz'){if(k==='b'||k==='back'){BP.cz=o.v0;BP.sq=o.q0;bpSq();bpZoom();ovClose();BP.hist=['home'];bpGo('cfg',false);return}
  if(k==='left'||k==='lb')o.v=Math.max(70,o.v-5);else if(k==='right'||k==='rb')o.v=Math.min(160,o.v+5);else if(k==='y')o.v=100;else if(k==='x'){BP.sq=!BP.sq;bpSq();ovRender();return}
  else if(k==='a'){try{localStorage.setItem('bpcz',BP.cz);localStorage.setItem('bpsq',BP.sq?'1':'0')}catch{}ovClose();bpToast('Tamanho salvo: '+BP.cz+'%');BP.hist=['home'];bpGo('cfg',false);return}else return;BP.cz=o.v;bpZoom();ovRender();return}
 if(o.type==='logo'){if(k==='b'||k==='back'){o.v=[...o.v0];logoLive(o);ovClose();return}
  const r=LGR[o.f];if(k==='up')o.f=(o.f+2)%3;else if(k==='down')o.f=(o.f+1)%3;else if(k==='left'||k==='lb')o.v[o.f]=Math.max(r.min,o.v[o.f]-r.st);else if(k==='right'||k==='rb')o.v[o.f]=Math.min(r.max,o.v[o.f]+r.st);
  else if(k==='y'){o.v=[120,0,0]}else if(k==='a'){api('save',{id:o.g.id,bpLogoSize:o.v[0],bpLogoX:o.v[1],bpLogoY:o.v[2]}).then(load);ovClose(true);bpToast('Logo salva');return}else return;logoLive(o);ovRender();return}
 if(o.type==='date'||o.type==='hm'){const D=o.type==='date';if(k==='b'||k==='back'){ovClose();return}
  if(k==='left')o.f=Math.max(0,o.f-1);else if(k==='right')o.f=Math.min(o.v.length-1,o.f+1);
  else if(k==='up'||k==='down'||k==='lb'||k==='rb'){let d=k==='up'?1:k==='down'?-1:0;if(!D&&(k==='lb'||k==='rb')){o.v[0]=Math.max(0,o.v[0]+(k==='rb'?10:-10))}else if(d){
   if(D){if(o.f===0){const m=new Date(o.v[2],o.v[1],0).getDate();o.v[0]=(o.v[0]-1+d+m)%m+1}else if(o.f===1){o.v[1]=(o.v[1]-1+d+12)%12+1;o.v[0]=Math.min(o.v[0],new Date(o.v[2],o.v[1],0).getDate())}else o.v[2]=Math.max(1970,Math.min(2100,o.v[2]+d))}
   else if(o.f===0)o.v[0]=Math.max(0,o.v[0]+d);else o.v[1]=(o.v[1]+d+60)%60}}
  else if(k==='x'&&D){const f=o.done;ovClose();f&&f('');return}
  else if(k==='a'){const f=o.done,v=D?`${o.v[2]}-${String(o.v[1]).padStart(2,'0')}-${String(o.v[0]).padStart(2,'0')}`:o.v[0]*3600+o.v[1]*60;ovClose();f&&f(v);return}else return;ovRender();return}
 if(o.type==='size'){if(k==='b'||k==='back'){const g=S.games.find(x=>x.id===o.g.id);if(g)g.logoSize=o.g0;sizeLive({g:o.g,v:o.g0||120});ovClose();return}
  if(k==='left'||k==='lb')o.v=Math.max(40,o.v-5);else if(k==='right'||k==='rb')o.v=Math.min(260,o.v+5);else if(k==='a'){api('save',{id:o.g.id,logoSize:o.v}).then(load);ovClose(true);bpToast('Tamanho salvo');return}else return;sizeLive(o);ovRender();return}
 if(k==='b'||k==='back'){ovClose();return}
 if(o.type==='text'){const t=bq('#botx');if(!t)return;if(k==='down'||k==='sdown')t.scrollBy({top:120,behavior:'smooth'});if(k==='up'||k==='sup')t.scrollBy({top:-120,behavior:'smooth'});return}
 if(o.type==='menu'){const n=o.items.length;if(k==='up'||k==='down'){o.i=(o.i+(k==='up'?-1:1)+n)%n;const it=o.items[o.i];if(it&&it.pv){it.pv();ovRender();return}}else if(k==='a'){const it=o.items[o.i];it&&it.fn();return}else return;ovRender();return}
 if(o.type==='grid'&&(k==='y'||k==='x')){k==='y'?covRename(o):covPc(o);return}
 const c=ovCols(),n=o.items.length;if(!n)return;
 if(k==='left')o.i=Math.max(0,o.i-1);else if(k==='right')o.i=Math.min(n-1,o.i+1);else if(k==='up')o.i=Math.max(0,o.i-c);else if(k==='down')o.i=Math.min(n-1,o.i+c);
 else if(k==='rb'||k==='rt')o.i=Math.min(n-1,o.i+c*3);else if(k==='lb'||k==='lt')o.i=Math.max(0,o.i-c*3);else if(k==='a'){if(o.type==='ico')colIcoSet(o);else bpCovApply(o);return}else return;
 if(o.i>=n-c*2)bpCovMore(o);
 bq('.bo-g .gc.on')?.classList.remove('on');const e=bq(`.bo-g .gc[data-oi="${o.i}"]`);if(e){e.classList.add('on');scrV(bq('.bo-g'),e,true)}}

// ---- teclado virtual (para digitar com o controle) ----
const KBL={abc:[['1','2','3','4','5','6','7','8','9','0'],['q','w','e','r','t','y','u','i','o','p'],['a','s','d','f','g','h','j','k','l','ç'],['z','x','c','v','b','n','m',',','.','-'],['⇧','?123','espaço','⌫','Colar','OK']],
 sym:[['1','2','3','4','5','6','7','8','9','0'],['!','@','#','$','%','&','*','(',')','='],['/',':',';','_','+','?','\'','"','[',']'],['<','>','{','}','|','\\','~','^','`','.'],['⇧','abc','espaço','⌫','Colar','OK']]};
function kbOpen(title,val,ph,done,live){BP.kb={title,v:val||'',ph:ph||'',done,live,lay:'abc',up:false,r:1,c:0};bpClass();kbRender()}
function kbClose(){BP.kb=null;bq('#bpkb').hidden=true;bpClass();bpFoot()}
function kbRender(){const K=BP.kb,el=bq('#bpkb');bpFoot();if(BP.scr==='srch')sbText();if(!K){el.hidden=true;return}el.hidden=false;const L=KBL[K.lay];
 el.innerHTML=`<div class="kb-p"><div class="kb-t">${esc(K.title)}</div><div class="kb-v">${K.v?esc(K.v):`<span class="ph">${esc(K.ph)}</span>`}<i class="kb-cur"></i></div><div class="kb-k">${L.map((row,r)=>`<div class="kb-row">${row.map((k,c)=>`<span class="kk${r===K.r&&c===K.c?' f':''}${k.length>1&&k!=='⌫'&&k!=='⇧'?' w':''}${k==='espaço'?' sp':''}${k==='OK'?' ok':''}${k==='⇧'&&K.up?' on':''}" data-kr="${r}" data-kc="${c}">${esc(K.up&&k.length===1?k.toUpperCase():k)}</span>`).join('')}</div>`).join('')}</div></div>`}
async function kbKey(k){const K=BP.kb;if(!K)return;
 if(k==='⌫')K.v=K.v.slice(0,-1);else if(k==='espaço')K.v+=' ';else if(k==='⇧')K.up=!K.up;else if(k==='?123'){K.lay='sym';K.c=Math.min(K.c,KBL.sym[K.r].length-1)}else if(k==='abc')K.lay='abc';
 else if(k==='Colar'){try{K.v+=(await navigator.clipboard.readText()).trim()}catch{bpToast('Não consegui colar.')}}
 else if(k==='OK'){const d=K.done,v=K.v;kbClose();d&&d(v);return}
 else{K.v+=K.up?k.toUpperCase():k;if(K.up)K.up=false}kbRender();K.live&&K.live(K.v)}
function kbIn(k){const K=BP.kb,L=KBL[K.lay];
 if(k==='b'){const c=K.cancel;kbClose();c&&c();return}if(k==='x'){kbKey('⌫');return}if(k==='y'){kbKey('espaço');return}if(k==='start'){kbKey('OK');return}
 if(k==='a'){kbKey(L[K.r][K.c]);return}
 if(k==='left')K.c=(K.c-1+L[K.r].length)%L[K.r].length;else if(k==='right')K.c=(K.c+1)%L[K.r].length;
 else if(k==='up'||k==='down'){const fr=K.c/L[K.r].length;K.r=(K.r+(k==='up'?-1:1)+L.length)%L.length;K.c=Math.min(L[K.r].length-1,Math.floor(fr*L[K.r].length))}else return;kbRender()}

// ---- ordenar e filtrar (Biblioteca) ----
function libRefresh(msg){libSave();BP.lib.rk='';BP.lib.sel={};BP.lib.idx=0;const G=bq('#blg');G.scrollTop=0;G._ty=null;libRender(true);bpTop();if(msg)bpToast(msg)}
function sortMenu(){ovOpen({type:'menu',title:'Ordenar por',items:SORTS.filter(x=>x[0]!=='bylist').map(([k,n])=>({n,ck:BP.lib.sort===k,fn:()=>{BP.lib.sort=k;ovClose(true);libRefresh('Ordenado por: '+n)}}))})}
function filtMenu(){const f=BP.lib.f,all=vis(),cnt=fn=>all.filter(fn).length;
 const sub=(title,key,opts)=>()=>ovOpen({type:'menu',title,items:[{n:'Todos',ck:!f[key],fn:()=>{delete f[key];ovClose(true);libRefresh()}},...opts.map(([v,n,c])=>({n:`${n}  (${c})`,ck:f[key]===v,fn:()=>{f[key]=v;ovClose(true);libRefresh(title+': '+n)}}))]},true);
 const years=[...new Set(all.map(yr).filter(Boolean))].sort((a,b)=>b-a);
 const lab=(k,fmt)=>f[k]!=null&&f[k]!==''?fmt(f[k]):'Todos';
 ovOpen({type:'menu',title:'Filtrar',items:[
  {n:'Status: '+lab('status',stN),ar:1,fn:sub('Status','status',ST.map(s=>[s,stN(s),cnt(g=>g.status===s)]).filter(x=>x[2]))},
  {n:'Plataforma: '+lab('platform',dispP),ar:1,fn:sub('Plataforma','platform',[...new Set(all.map(g=>canonP(g.platform)).filter(Boolean))].sort((a,b)=>dispP(a).localeCompare(dispP(b))).map(p=>[p,dispP(p),cnt(g=>canonP(g.platform)===p)]))},
  {n:'Gênero: '+lab('genre',x=>x),ar:1,fn:sub('Gênero','genre',genList().map(x=>[x,x,cnt(g=>(g.genres||[]).includes(x))]).filter(x=>x[2]))},
  {n:'Ano de lançamento: '+lab('year',x=>x),ar:1,fn:sub('Ano de lançamento','year',years.map(y=>[y,String(y),cnt(g=>yr(g)===y)]))},
  ...(Object.keys(f).length?[{n:'Limpar filtros',dl:1,fn:()=>{BP.lib.f={};ovClose(true);libRefresh('Filtros limpos')}}]:[])]})}

// ---- sons da interface (sintetizados, sem arquivos) ----
const SNDP={tick:'Tique',soft:'Suave',bubble:'Bolha',digital:'Digital',pop:'Pop',chime:'Sino',swoosh:'Sopro',low:'Grave',glass:'Vidro',none:'Nenhum'};
const SNDE=[['move','Ao mudar de jogo/opção','tick'],['select','Ao selecionar','bubble'],['back','Ao voltar','low'],['menu','Ao abrir menus','swoosh'],['tab','Ao trocar de aba','digital'],['launch','Ao abrir um jogo','chime'],['toggle','Ao ligar/desligar opções','pop']];
BP.snd={on:true,vol:60,map:{}};try{Object.assign(BP.snd,JSON.parse(localStorage.getItem('bpsnd')||'{}'))}catch{}
const sndSave=()=>{try{localStorage.setItem('bpsnd',JSON.stringify(BP.snd))}catch{}};
let AC=null,SNL={};
function tone(t0,{type='sine',f=800,f2,dur=.06,vol=.25,att=.004}){const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t0);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t0+dur);
 g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+att);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);o.connect(g).connect(AC._m);o.start(t0);o.stop(t0+dur+.02)}
function noise(t0,{dur=.12,vol=.2,f=1200,f2=4000,q=1}){const n=Math.floor(AC.sampleRate*dur),b=AC.createBuffer(1,n,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
 const src=AC.createBufferSource(),bf=AC.createBiquadFilter(),g=AC.createGain();src.buffer=b;bf.type='bandpass';bf.Q.value=q;bf.frequency.setValueAtTime(f,t0);bf.frequency.exponentialRampToValueAtTime(f2,t0+dur);
 g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+dur*.3);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);src.connect(bf).connect(g).connect(AC._m);src.start(t0);src.stop(t0+dur)}
const SYN={tick:t=>tone(t,{type:'sine',f:2100,dur:.03,vol:.18}),soft:t=>tone(t,{type:'triangle',f:700,f2:520,dur:.07,vol:.3}),bubble:t=>tone(t,{type:'sine',f:420,f2:980,dur:.09,vol:.3}),
 digital:t=>tone(t,{type:'square',f:1250,dur:.035,vol:.07}),pop:t=>{tone(t,{type:'sine',f:300,f2:120,dur:.06,vol:.35});noise(t,{dur:.03,vol:.08,f:2500,f2:2500})},
 chime:t=>{tone(t,{type:'sine',f:880,dur:.18,vol:.22});tone(t+.09,{type:'sine',f:1320,dur:.26,vol:.2})},swoosh:t=>noise(t,{dur:.18,vol:.22,f:500,f2:3800,q:.8}),
 low:t=>tone(t,{type:'triangle',f:360,f2:180,dur:.1,vol:.3}),glass:t=>{tone(t,{type:'sine',f:2600,dur:.12,vol:.12});tone(t,{type:'sine',f:3900,dur:.08,vol:.06})},none:()=>{}};
function sndPreset(p){if(!p||p==='none')return;if(String(p).startsWith('file:')){try{const a=new Audio(p);a.volume=BP.snd.vol/100;a.play().catch(()=>{})}catch{}return}try{if(!AC){AC=new AudioContext();AC._m=AC.createGain();AC._m.connect(AC.destination)}if(AC.state==='suspended')AC.resume();AC._m.gain.value=BP.snd.vol/100;(SYN[p]||SYN.tick)(AC.currentTime+.005)}catch{}}
function snd(ev){if(!BP.on||!BP.snd.on)return;const now=performance.now();if(now-(SNL[ev]||0)<(ev==='move'?45:80))return;SNL[ev]=now;sndPreset(BP.snd.map[ev]||(SNDE.find(x=>x[0]===ev)||[])[2])}
const sndName=v=>String(v||'').startsWith('file:')?'Arquivo: '+decodeURIComponent(String(v).split('/').pop()).replace(/^[a-z]+-\d+-/,''):SNDP[v]||'';
function sndList(){ovOpen({type:'menu',title:'Som de cada ação',items:SNDE.map(([k,n,df])=>({n:`${n}  ·  ${sndName(BP.snd.map[k]||df)}`,ar:1,fn:()=>sndMenu(k,n)}))},true)}
function sndMenu(ev,name){const cur=BP.snd.map[ev]||(SNDE.find(x=>x[0]===ev)||[])[2],cust=String(cur).startsWith('file:');
 const set=v=>{BP.snd.map[ev]=v;sndSave();ovClose();if(BP.ov&&BP.ov.title==='Som de cada ação'){BP.ov.items=SNDE.map(([k,n,df])=>({n:`${n}  ·  ${sndName(BP.snd.map[k]||df)}`,ar:1,fn:()=>sndMenu(k,n)}));ovRender()}cfgRender();bpToast('Som: '+sndName(v))};
 ovOpen({type:'menu',title:name,sub:'O som toca ao passar por cada opção',items:[...Object.keys(SNDP).map(k=>({n:SNDP[k],ck:cur===k,pv:()=>sndPreset(k),fn:()=>set(k)})),
  ...(cust?[{n:sndName(cur),ck:true,pv:()=>sndPreset(cur),fn:()=>ovClose()}]:[]),
  {n:'Escolher arquivo do PC…',pv:()=>{},fn:async()=>{const r=await api('snd_pick',{ev});if(r&&r.url){sndPreset(r.url);set(r.url)}else if(r&&r.error)bpToast(r.error)}}]},true)}

// ---- tela: controles e fones de ouvido (bateria) ----
const AUD=/fone|head|buds|airpods|earbud|earphone|wh-|wf-|jbl|soundcore|galaxy buds|hands-?free|headset|audio|speaker|caixa|beats|sony wh|bose|edifier|qcy|haylou|redmi buds|freebuds/i,PADN=/controller|gamepad|dualsense|dualshock|xbox|pro controller|joy-?con|8bitdo|gamesir/i;
async function devLoad(force){try{const r=await api('bt_batt',{force:!!force});BP.dev.bt=r.list||[]}catch{BP.dev.bt=[]}BP.dev.t=Date.now();if(BP.scr==='dev')devRender()}
setInterval(()=>{if(BP.on&&BP.scr==='dev')devLoad(true)},30000);
function batBar(pc,st){const wired=st==='wired'||st==='noBattery',chg=st==='charging',lv=pc!=null?pc:st==='full'?100:st==='medium'?60:st==='low'?20:st==='empty'?5:null,col=lv==null?'#9aa3b2':lv>50?'#3fd16f':lv>20?'#f5b301':'#e5484d';
 if(wired)return '<span class="dv-v">Com fio (sem bateria)</span>';
 return `<span class="dv-v"><span class="dv-bar"><i style="width:${lv||0}%;background:${col}"></i></span><b>${lv!=null?lv+'%':'—'}</b>${chg?'<em>Carregando</em>':''}</span>`}
function devRender(){const P=Object.values(BP.pads),bt=BP.dev.bt;
 const padNames=new Set(P.map(p=>String(p.name||'').toLowerCase()));
 const btPads=(bt||[]).filter(x=>PADN.test(x.name)&&!padNames.has(x.name.toLowerCase())),aud=(bt||[]).filter(x=>!PADN.test(x.name)&&(AUD.test(x.name)||/audio|media/i.test(x.cls||''))),oth=(bt||[]).filter(x=>!PADN.test(x.name)&&!aud.includes(x));
 const IC={pad:BPI.pad,aud:SV('<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 15a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3z"/><path d="M3 15a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1H3z"/>'),bt:SV('<path d="m7 7 10 10-5 5V2l5 5L7 17"/>')};
 const row=(ic,n,sub,bar)=>`<div class="bc-r dv"><span class="bc-n dv-n">${ic}<span>${esc(n)}${sub?`<small>${esc(sub)}</small>`:''}</span></span>${bar}</div>`;
 let h=`<div class="bc-h">Controles</div>`;
 h+=P.length||btPads.length?P.map(p=>row(IC.pad,p.name||'Controle',({ps5:'DualSense',ps4:'DualShock 4',xboxOne:'Xbox',xbox360:'Xbox 360',xbox:'Xbox'})[p.type]||'',batBar(p.power&&p.power.percent,p.power&&p.power.state))).join('')+btPads.map(x=>row(IC.pad,x.name,'Bluetooth',batBar(x.battery))).join(''):'<div class="dv-e">Nenhum controle conectado.</div>';
 h+=`<div class="bc-h">Fones de ouvido</div>`+(bt==null?'<div class="dv-e">Procurando…</div>':aud.length?aud.map(x=>row(IC.aud,x.name,'Bluetooth',batBar(x.battery))).join(''):'<div class="dv-e">Nenhum fone Bluetooth conectado que informe a bateria.</div>');
 if(oth.length)h+=`<div class="bc-h">Outros dispositivos Bluetooth</div>`+oth.map(x=>row(IC.bt,x.name,'Bluetooth',batBar(x.battery))).join('');
 h+=`<div class="dv-note">A bateria aparece quando o dispositivo informa ao Windows. Fones com receptor USB próprio (2,4 GHz) normalmente não informam. Atualiza a cada 30 segundos.</div>`;
 const el=bq('#bdl');if(el._h!==h){el._h=h;el.innerHTML=h}bpBg(null)}

// ---- bateria dos controles ----
function batRender(){const L=Object.values(BP.pads),h=L.map(p=>{const pw=p.power||{},st=pw.state,pc=pw.percent;
  const wired=st==='wired'||st==='noBattery',chg=st==='charging',lv=pc!=null?pc:st==='full'?100:st==='medium'?60:st==='low'?20:st==='empty'?5:null;
  const col=lv==null?'#9aa3b2':lv>50?'#3fd16f':lv>20?'#f5b301':'#e5484d';
  const bat=wired?`<svg class="bt-pl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v6M15 2v6M7 8h10v4a5 5 0 0 1-10 0z"/><path d="M12 17v5"/></svg>`:
   `<span class="btb"><i style="height:${lv==null?0:Math.max(6,lv)}%;background:${col}"></i>${chg?'<b>⚡</b>':''}</span>`;
  return `<span class="bt-c" title="${esc(p.name||'Controle')}${lv!=null&&!wired?' · '+lv+'%':''}">${BPI.pad}${bat}${lv!=null&&!wired?`<small>${lv}%</small>`:''}</span>`}).join('');
 bq('#bpbat').innerHTML=h;bpEl.classList.toggle('has-bat',!!L.length);if(BP.on&&BP.scr==='dev')devRender()}

// ---- pesquisa (lupa ao lado do relogio, como na Steam) ----
function sbGeo(){const b=bq('#bpsr'),r=b.getBoundingClientRect();if(!r.width)return;const sb=bq('#bpsb');sb.style.right=(innerWidth-r.right-r.width*0.35)+'px';sb.style.top='0px';sb.style.height=Math.round(r.bottom+r.height*0.18)+'px'}
let SBT=0;function sbShow(on){const sb=bq('#bpsb');clearTimeout(SBT);if(on){sbGeo();sb.classList.remove('out');sb.classList.add('show')}else if(sb.classList.contains('show')){sb.classList.add('out');SBT=setTimeout(()=>sb.classList.remove('show','out'),260)}}
function topUi(){const on=BP.topF&&(BP.scr==='home'||BP.scr==='lib');bpEl.classList.toggle('top-f',on);bq('#bpsr').hidden=!(BP.scr==='home'||BP.scr==='lib'||BP.scr==='srch');sbShow(on||BP.scr==='srch');sbText()}
function sbText(){const q=BP.scr==='srch'?BP.srch.q:'';bq('#bpsbt').innerHTML=q?esc(q)+(BP.kb?'<i class="kb-cur"></i>':''):`<em>Busque jogos…</em>`}
function srchOpen(){BP.topF=false;BP.srch.idx=0;bpGo('srch');srchKb()}
function srchKb(){kbOpen('Pesquisar jogo',BP.srch.q,'Digite o nome do jogo',v=>{BP.srch.q=v;srchRender(true)},v=>{BP.srch.q=v;srchRender(true)});BP.kb.cancel=()=>{if(!BP.srch.q)bpBack()}}
function srchRender(full){const q=nz(BP.srch.q).trim(),W=q.split(/\s+/).filter(Boolean);
 const L=W.length?vis().filter(g=>{const n=nz(g.name)+' '+nz(g.sortname||'');return W.every(w=>n.includes(w))}).sort((a,b)=>(nz(b.name).startsWith(q)-nz(a.name).startsWith(q))||NC(a,b)):[];
 BP.srch.list=L;sbText();bq('#srq').innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span>${BP.srch.q?esc(BP.srch.q):'<i>Digite o nome do jogo</i>'}</span><em>${W.length?L.length+' jogo'+(L.length===1?'':'s'):''}</em>`;
 bq('#srg').innerHTML=L.map(bpTile).join('')||(W.length?'<div class="bp-empty">Nenhum jogo encontrado.</div>':'');srchSel(Math.min(BP.srch.idx,Math.max(0,L.length-1)),true)}
function srchSel(i,force,mouse){const L=BP.srch.list;if(!L.length)return;i=Math.max(0,Math.min(L.length-1,i));BP.srch.idx=i;const G=bq('#srg');G.querySelectorAll('.bt.on').forEach(x=>x.classList.remove('on'));const t=G.children[i];if(t){if(!BP.kb)t.classList.add('on');if(!mouse)scrV(G,t,!force)}bpBg(L[i])}
const gridCols=G=>{const c=G.children;if(c.length<2)return 1;const y=c[0].offsetTop;let n=0;for(const e of c){if(e.offsetTop!==y)break;n++}return n||1};

// ---- papel de parede pelo Google Imagens (com controle) ----
function wallGoogle(g){const R=[['1080','1080p · 1920×1080'],['1440','1440p · 2560×1440'],['2160','4K · 3840×2160'],['uw1080','Ultrawide 2560×1080'],['uw1440','Ultrawide 3440×1440']];
 ovOpen({type:'menu',title:'Resolução do papel de parede',sub:g.name,items:R.map(([k,n])=>({n,fn:async()=>{ovClose(true);const r=await api('wall_open',{id:g.id,q:g.wpname||g.name,res:k,bp:1});if(r&&r.error)return bpToast(r.error);bpToast('Na janela do Google: A abre a imagem, ☰ usa como papel de parede, B volta.')}}))},true)}

// ---- editar jogo (com controle) ----
function edOpen(g){BP.det.g=g.id;BP.ed.i=1;bpGo('edit')}
const dIso=ts=>ts?new Date(ts*1000).toLocaleDateString('sv-SE'):'';
const isoTs=v=>v?Math.floor(new Date(v+'T12:00:00').getTime()/1000):null;
async function edSave(b,msg){const g=detGame();if(!g)return;await api('save',{id:g.id,...b});await load();if(msg)bpToast(msg)}
function edRows(){const g=detGame();if(!g)return[];const hm=s=>`${Math.floor(s/3600)} h ${Math.floor(s%3600/60)} m`,rp=g.replays||[];
 const txt=(n,k,ph)=>({t:'txt',n,show:g[k]||'—',fn:()=>kbOpen(n,g[k]||'',ph,v=>edSave({[k]:k==='name'?(v.trim()||g.name):v.trim()},'Salvo'))});
 const tog=(n,k)=>({t:'tog',n,on:!!g[k],fn:v=>edSave({[k]:v})});
 const rows=[{t:'h',n:g.name},txt('Título','name','Nome do jogo'),txt('Nome para ordenação','sortname','Ex.: Yakuza 01'),
  {t:'ch',n:'Plataforma',show:dispP(canonP(g.platform))||'—',fn:()=>{const P=[...new Set([canonP(g.platform),...plList()])].filter(Boolean);ovOpen({type:'menu',title:'Plataforma',items:P.map(p=>({n:dispP(p),ck:canonP(g.platform)===p,fn:()=>{ovClose(true);edSave({platform:p},'Plataforma: '+dispP(p))}}))})}},
  {t:'h',n:'Progresso'},
  {t:'ch',n:'Status',show:stN(g.status||'Backlog'),fn:()=>ovOpen({type:'menu',title:'Status',items:ST.map(s=>({n:stN(s),ck:g.status===s,fn:()=>{ovClose(true);const b={status:s};if(s==='Zerado'&&!g.finished)b.finished=Math.floor(Date.now()/1000);edSave(b,'Status: '+stN(s))}}))})},
  {t:'num',n:'Nota',show:g.score!=null?scF(g.score):'Sem nota',col:g.score!=null?scC(g.score):'',fn:d=>{let v=g.score==null?(d>0?0:null):Math.round((g.score+d*0.5)*10)/10;if(v!=null&&v<0)v=null;if(v!=null)v=Math.min(10,v);g.score=v;clearTimeout(edSave.t);edSave.t=setTimeout(()=>edSave({score:v}),500);edRender()}},
  {t:'date',n:'Data de lançamento',show:g.released?dpt(g.released):'—',fn:()=>dateOpen('Data de lançamento',dIso(g.released),v=>edSave({released:isoTs(v)},'Salvo'))}];
 if(g.status==='Zerado')rows.push({t:'date',n:'Finalizado em',show:g.finished?dpt(g.finished):'—',fn:()=>dateOpen('Finalizado em',dIso(g.finished),v=>edSave({finished:isoTs(v)},'Salvo'))});
 rows.push({t:'ch',n:'Replays',show:rp.length?rp.length+'×':'Nenhum',fn:repMenu},
  {t:'hm',n:'Tempo trackeado',show:hm((g.tracked_s||0)+(g.manual_s||0)),fn:()=>hmOpen((g.tracked_s||0)+(g.manual_s||0),v=>edSave({tracked_s:v,manual_s:0},'Tempo salvo'))});
 if(g.steam_min)rows.push({t:'info',n:'Tempo na Steam',show:hm(g.steam_min*60)});
 rows.push({t:'h',n:'Detalhes'},{t:'ch',n:'Gêneros',show:(g.genres||[]).join(', ')||'Nenhum',fn:genreMenu},txt('Comentário / review','review','O que achou do jogo?'),
  {t:'h',n:'Outros'},tog('Favorito','fav'),tog('Ocultar este jogo','hidden'),tog('Catalogar (tirar da barra lateral)','cat'));
 return rows}
function repMenu(){const g=detGame();if(!g)return;const rp=[...(g.replays||[])];
 const set=l=>edSave({replays:l.filter(x=>x!=null).sort((a,b)=>(a||9e12)-(b||9e12))},'Replays salvos');
 ovOpen({type:'menu',title:'Replays',sub:'Vezes que você zerou de novo',items:[{n:'Adicionar replay',fn:()=>{ovClose(true);dateOpen('Data do replay',new Date().toLocaleDateString('sv-SE'),v=>set([...rp,isoTs(v)||0]))}},
  ...rp.map((t,i)=>({n:`#${i+2} · ${t?dpt(t):'sem data'}`,ar:1,fn:()=>ovOpen({type:'menu',title:`Replay #${i+2}`,items:[{n:'Mudar a data',fn:()=>{ovClose(true);dateOpen('Data do replay',dIso(t),v=>{rp[i]=isoTs(v)||0;set(rp)})}},{n:'Remover',dl:1,fn:()=>{ovClose(true);rp.splice(i,1);set(rp)}}]},true)}))]})}
function genreMenu(){const g=detGame();if(!g)return;const sel=new Set(g.genres||[]),all=[...new Set([...sel,...genList()])].sort((a,b)=>a.localeCompare(b));
 const o={type:'menu',title:'Gêneros',sub:'A marca e desmarca',items:[...all.map(x=>({n:x,ck:sel.has(x),fn:()=>{sel.has(x)?sel.delete(x):sel.add(x);o.items.find(i=>i.n===x).ck=sel.has(x);ovRender();clearTimeout(genreMenu.t);genreMenu.t=setTimeout(()=>edSave({genres:[...sel]}),400)}})),
  {n:'+ Novo gênero',fn:()=>{ovClose(true);kbOpen('Novo gênero','','Ex.: Ritmo',async v=>{v=v.trim();if(!v)return;await api('genre_add',{name:v});sel.add(v);await edSave({genres:[...sel]},'Gênero criado')})}}]};ovOpen(o)}
// seletor de data e de horas no controle
function dateOpen(title,iso,done){const d=iso?new Date(iso+'T12:00:00'):new Date();ovOpen({type:'date',title,v:[d.getDate(),d.getMonth()+1,d.getFullYear()],f:0,done,empty:!iso},true)}
function hmOpen(secs,done){ovOpen({type:'hm',title:'Tempo trackeado',v:[Math.floor(secs/3600),Math.floor(secs%3600/60)],f:0,done},true)}
function edRender(){const R=edRows(),C=BP.ed;if(R[C.i]&&R[C.i].t==='h')C.i++;if(C.i>=R.length)C.i=1;
 bq('#bel').innerHTML=R.map((r,i)=>r.t==='h'?`<div class="bc-h">${esc(r.n)}</div>`:`<div class="bc-r${i===C.i?' f':''}${r.t==='info'?' ro':''}" data-ei="${i}"><span class="bc-n">${esc(r.n)}</span><span class="bc-v">${r.t==='tog'?`<i class="bsw${r.on?' on':''}"><i></i></i>`:r.t==='num'?`<b class="bc-go">‹</b><b class="sc"${r.col?` style="color:${r.col}"`:''}>${esc(r.show)}</b><b class="bc-go">›</b>`:r.t==='info'?esc(r.show):`${esc(r.show)}<b class="bc-go">›</b>`}</span></div>`).join('');
 scrV(bq('#bel'),bq('#bel .bc-r.f'),true);const g=detGame();bpBg(g||null)}
async function edPress(d){const r=edRows()[BP.ed.i];if(!r||r.t==='h'||r.t==='info')return;if(r.t==='tog'){if(d)return;await r.fn(!r.on);return}if(r.t==='num'){r.fn(d||1);return}if(!d)r.fn()}
function edMove(d){const R=edRows();let i=BP.ed.i;do{i+=d}while(R[i]&&R[i].t==='h');if(i<0||i>=R.length)return;BP.ed.i=i;edRender()}

// ---- entrada ----
function bpIn(k){if(!BP.on)return;LIN=performance.now();if(!(BP.ov&&BP.ov.type==='menu'&&BP.ov.items[0]&&BP.ov.items[0].pv&&(k==='up'||k==='down')))snd(k==='a'?'select':k==='b'||k==='back'?'back':k==='lb'||k==='rb'?'tab':k==='start'||k==='y'||k==='x'||k==='guide'?'menu':'move');
 if(k==='guide'){if(BP.kb)return;if(BP.ov)BP.ov=null,ovRender();sideToggle();return}
 if(BP.kb)return kbIn(k);if(BP.ov)return ovIn(k);if(BP.side.open)return sideIn(k);
 if(BP.topF){if(k==='a'){srchOpen();return}if(k==='down'||k==='b'){BP.topF=false;topUi();return}return}
 if(BP.scr==='lib'&&BP.lib.mv){if(k==='left'||k==='lb')tabMove(-1);else if(k==='right'||k==='rb')tabMove(1);else if(k==='a'||k==='b'){BP.lib.mv=false;bpEl.classList.remove('tab-mv');bpFoot();bpToast('Posição das abas salva')}return}
 if(k==='start'){if(BP.scr==='lib'){if(BP.lib.tf){tabsMenu();return}const C=BP.lib.tabs[BP.lib.tab],x=C&&C.g[BP.lib.idx];if(x&&x.kind==='col'){colIconMenu(x);return}if(x&&x.kind)return}if(BP.scr!=='cfg'&&BP.scr!=='edit')bpOpts();return}
 if(k==='b'){if(BP.scr==='home')sideToggle(true);else if(BP.scr==='lib'&&BP.lib.open){const o=BP.lib.open;BP.lib.open=null;BP.lib.sel[o.k]=o.id;BP.lib.rk='';libRender(true)}else bpBack();return}
 if(BP.scr==='home'){if(k==='up'){BP.topF=true;topUi();return}if(k==='left')homeSel(BP.home.idx-1);else if(k==='right')homeSel(BP.home.idx+1);else if(k==='lt')homeSel(BP.home.idx-10);else if(k==='rt')homeSel(BP.home.idx+10);
  else if(k==='a'){const x=BP.home.list[BP.home.idx];if(x&&x.more){BP.hist=['home'];bpGo('lib',false)}else if(x)detOpen(x)}return}
 if(BP.scr==='lib'&&BP.lib.tf&&(k==='x'||k==='y')){k==='y'?sortMenu():filtMenu();return}
 if(BP.scr==='lib'&&BP.lib.tf){const B=BP.lib,n=B.tabs.length;if(k==='left'||k==='right'||k==='lb'||k==='rb'){B.open=null;B.tab=(B.tab+(k==='left'||k==='lb'?-1:1)+n)%n;libRender(true);tabFocus(true)}else if(k==='up'){tabFocus(false);BP.topF=true;topUi()}else if(k==='down'||k==='a'){tabFocus(false)}return}
 if(BP.scr==='lib'){const B=BP.lib,c=libCols();if(k==='left')libSel(B.idx-1);else if(k==='right')libSel(B.idx+1);else if(k==='up'){if(B.idx<c)tabFocus(true);else libSel(B.idx-c)}else if(k==='down')libSel(B.idx+c);
  else if(k==='lt')libSel(B.idx-c*3);else if(k==='rt')libSel(B.idx+c*3);
  else if(k==='lb'||k==='rb'){const n=B.tabs.length;B.open=null;B.tab=(B.tab+(k==='lb'?-1:1)+n)%n;libRender(true)}
  else if(k==='y')sortMenu();else if(k==='x')filtMenu()
  else if(k==='a'){const C=B.tabs[B.tab],x=C&&C.g[B.idx];if(x&&x.kind){B.open={k:B.tabs[B.tab].base,id:x.id};B.rk='';libRender(true)}else{const g=curGame();g&&detOpen(g)}}return}
 if(BP.scr==='det'){const n=detBtns(detGame()||{}).length;if(k==='left')BP.det.f=Math.max(0,BP.det.f-1);else if(k==='right')BP.det.f=Math.min(n-1,BP.det.f+1);
  else if(k==='a'){detPress();return}else if(k==='down'||k==='sdown'){bq('.dt-r')?.scrollBy({top:90,behavior:'smooth'});return}else if(k==='up'||k==='sup'){bq('.dt-r')?.scrollBy({top:-90,behavior:'smooth'});return}else return;
  bpEl.querySelectorAll('.db').forEach((b,i)=>b.classList.toggle('f',i===BP.det.f));return}
 if(BP.scr==='cfg'){if(k==='up')cfgMove(-1);else if(k==='down')cfgMove(1);else if(k==='a')cfgPress();else if(k==='left')cfgPress(-1);else if(k==='right')cfgPress(1)}
 if(BP.scr==='dev'){const L=bq('#bdl');if(k==='down'||k==='sdown')L.scrollBy({top:120,behavior:'smooth'});else if(k==='up'||k==='sup')L.scrollBy({top:-120,behavior:'smooth'});else if(k==='a')devLoad(true);return}
 if(BP.scr==='edit'){if(k==='up')edMove(-1);else if(k==='down')edMove(1);else if(k==='a')edPress(0);else if(k==='left')edPress(-1);else if(k==='right')edPress(1)}
 if(BP.scr==='srch'){const S2=BP.srch,c=gridCols(bq('#srg'));if(k==='left')srchSel(S2.idx-1);else if(k==='right')srchSel(S2.idx+1);else if(k==='down')srchSel(S2.idx+c);
  else if(k==='up'){if(S2.idx<c)srchKb();else srchSel(S2.idx-c)}else if(k==='a'){const g=curGame();g&&detOpen(g)}}}
const BPMAP={dpadUp:'up',dpadDown:'down',dpadLeft:'left',dpadRight:'right',lsUp:'up',lsDown:'down',lsLeft:'left',lsRight:'right',south:'a',east:'b',west:'x',north:'y',
 leftShoulder:'lb',rightShoulder:'rb',lt:'lt',rt:'rt',start:'start',back:'back',guide:'guide',rsUp:'sup',rsDown:'sdown'};
const REP={},RPT=new Set(['up','down','left','right','sup','sdown','lt','rt']);
function padDown(k){bpIn(k);if(!RPT.has(k))return;clearTimeout(REP[k]);let n=0;const slow=k==='lt'||k==='rt';
 const r=()=>{n++;HOLD=true;bpIn(k);REP[k]=setTimeout(r,slow?200:Math.max(55,110-n*6))};REP[k]=setTimeout(r,slow?340:300)}
function padUp(k){clearTimeout(REP[k]);delete REP[k];if(!Object.keys(REP).length)HOLD=false}
function bpPad(m){
 if(m.t==='conn'){BP.pads[m.id]={name:m.name,type:m.type,power:m.power};batRender();bpStyleFrom(m);if(BP.on)bpToast('Controle conectado: '+(m.name||''));return}
 if(m.t==='disc'){delete BP.pads[m.id];batRender();if(BP.on)bpToast('Controle desconectado');return}
 if(m.t==='pow'){if(BP.pads[m.id]){BP.pads[m.id].power=m.power;batRender()}return}
 const k=BPMAP[m.b];if(!k)return;
 if(m.t==='down'){bpStyleFrom(m);bpEl.classList.add('nocur');if(k==='guide'&&!BP.on){bpSet(true);return}if(!BP.on)return;padDown(k)}
 else if(m.t==='up')padUp(k)}
if(window.bridge&&bridge.onPad)bridge.onPad(bpPad);
bpEl.addEventListener('mousemove',()=>bpEl.classList.remove('nocur'));
const BPK={f:'x',F:'x',r:'y',R:'y',ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Enter:'a',Escape:'b',Backspace:'b',q:'lb',Q:'lb',e:'rb',E:'rb',o:'start',O:'start',PageUp:'lt',PageDown:'rt',Home:'guide',Tab:'guide'};
document.addEventListener('keydown',e=>{
 if(e.key==='F11'){e.preventDefault();e.stopPropagation();bpSet(!BP.on);return}
 if(!BP.on)return;e.stopPropagation();
 if(BP.kb&&!e.ctrlKey&&!e.altKey){ // teclado fisico tambem digita
  if(e.key.length===1){e.preventDefault();BP.kb.v+=e.key;kbRender();BP.kb.live&&BP.kb.live(BP.kb.v);return}
  if(e.key==='Backspace'){e.preventDefault();kbKey('⌫');return}if(e.key==='Enter'){e.preventDefault();kbKey('OK');return}}
 if(BP.kb&&e.ctrlKey&&(e.key==='v'||e.key==='V')){e.preventDefault();kbKey('Colar');return}
 const k=BPK[e.key];if(!k)return;e.preventDefault();HOLD=e.repeat;
 if(BP.style!=='kb'){BP.style='kb';bpClass();bpFoot()}bpIn(k)},true);
// mouse
bpEl.addEventListener('click',e=>{
 const fk0=e.target.closest('[data-fk]');if(fk0&&fk0.dataset.fk){bpIn(fk0.dataset.fk);return}
 const kk=e.target.closest('[data-kr]');if(kk&&BP.kb){BP.kb.r=+kk.dataset.kr;BP.kb.c=+kk.dataset.kc;kbKey(KBL[BP.kb.lay][BP.kb.r][BP.kb.c]);return}
 if(BP.kb){if(e.target.id==='bpkb')kbClose();return}
 const oi=e.target.closest('[data-oi]');if(oi&&BP.ov){BP.ov.i=+oi.dataset.oi;if(BP.ov.type==='ico'){colIcoSet(BP.ov);return}if(BP.ov.type==='grid'){ovRender();bpCovApply(BP.ov)}else ovIn('a');return}
 if(BP.ov){if(e.target.id==='bpov')ovClose();return}
 const si=e.target.closest('[data-si]');if(si){BP.side.i=+si.dataset.si;sideIn('a');return}
 if(BP.side.open){if(!e.target.closest('#bpside'))sideToggle(false);return}
 const lt=e.target.closest('[data-lt]');if(lt){BP.lib.open=null;BP.lib.tab=+lt.dataset.lt;libRender(true);return}
 const t=e.target.closest('[data-bi]');if(t){const i=+t.dataset.bi;if(BP.scr==='home'){if(i===BP.home.idx)bpIn('a');else homeSel(i)}else if(BP.scr==='lib'){if(i===BP.lib.idx)bpIn('a');else libSel(i)}return}
 const db=e.target.closest('[data-db]');if(db){BP.det.f=+db.dataset.db;detPress();return}
 const ci=e.target.closest('[data-ci]');if(ci){BP.cfg.i=+ci.dataset.ci;cfgRender();cfgPress();return}
 const ei=e.target.closest('[data-ei]');if(ei){BP.ed.i=+ei.dataset.ei;edRender();edPress(0);return}
 const df=e.target.closest('[data-df]');if(df&&BP.ov){BP.ov.f=+df.dataset.df;ovRender();return}
 if(e.target.closest('#bpsr')||(e.target.closest('#bpsb')&&BP.scr!=='srch')){srchOpen();return}if(e.target.closest('#bpsb')&&BP.scr==='srch'){srchKb();return}
 const fk=e.target.closest('[data-fk]');if(fk&&fk.dataset.fk){bpIn(fk.dataset.fk);return}});
// mouse: passar por cima ja seleciona (sem rolar a tela)
let MMX=-1,MMY=-1,EDT=0,EDD=0;
function edgeStop(){clearInterval(EDT);EDT=0;EDD=0}
function edgeCheck(x,y){const d=BP.on&&BP.scr==='home'&&!BP.ov&&!BP.kb&&!BP.side.open&&y>innerHeight*0.55?(x>innerWidth*0.95?1:x<innerWidth*0.03?-1:0):0;
 if(d===EDD)return;edgeStop();if(!d)return;EDD=d;const st=()=>{const H=BP.home;if((d>0&&H.idx>=H.list.length-1)||(d<0&&H.idx<=0)){edgeStop();return}homeSel(H.idx+d,false,true)};st();EDT=setInterval(st,320)}
bpEl.addEventListener('mouseleave',edgeStop);
bpEl.addEventListener('mousemove',e=>{if(e.clientX===MMX&&e.clientY===MMY)return;MMX=e.clientX;MMY=e.clientY;if(!BP.on)return;
 if(BP.style!=='kb'){BP.style='kb';bpClass();bpFoot();if(BP.ov)ovRender();if(BP.kb)kbRender();if(BP.scr==='det')detRender()}
 edgeCheck(e.clientX,e.clientY);if(EDD)return;if(BP.ov||BP.kb)return;
 const si=e.target.closest('[data-si]');if(si&&BP.side.open){const i=+si.dataset.si;if(i!==BP.side.i){BP.side.i=i;sideRender()}return}if(BP.side.open)return;
 const t=e.target.closest('[data-bi]');if(t){const i=+t.dataset.bi;BP.topF=false;topUi();if((BP.scr==='home'&&i!==BP.home.idx)||(BP.scr==='lib'&&i!==BP.lib.idx)||(BP.scr==='srch'&&i!==BP.srch.idx))snd('move');if(BP.scr==='home'&&i!==BP.home.idx)homeSel(i,false,true);else if(BP.scr==='lib'&&i!==BP.lib.idx)libSel(i,false,true);else if(BP.scr==='srch'&&i!==BP.srch.idx)srchSel(i,false,true);return}
 const db=e.target.closest('[data-db]');if(db&&+db.dataset.db!==BP.det.f){BP.det.f=+db.dataset.db;bpEl.querySelectorAll('.db').forEach((b,i)=>b.classList.toggle('f',i===BP.det.f));return}
 const ci=e.target.closest('[data-ci]');if(ci&&+ci.dataset.ci!==BP.cfg.i){BP.cfg.i=+ci.dataset.ci;bpEl.querySelectorAll('#bcl .bc-r').forEach(r=>r.classList.toggle('f',r===ci));return}
 const ei=e.target.closest('[data-ei]');if(ei&&+ei.dataset.ei!==BP.ed.i){BP.ed.i=+ei.dataset.ei;bpEl.querySelectorAll('#bel .bc-r').forEach(r=>r.classList.toggle('f',r===ei))}});
bpEl.addEventListener('contextmenu',e=>{e.preventDefault();if(BP.on&&!BP.ov&&!BP.kb)bpIn('guide')});
bpEl.addEventListener('wheel',e=>{if(BP.ov||BP.kb||BP.side.open)return;if(BP.scr==='home'&&BP.topF){BP.topF=false;topUi()}if(BP.scr==='home'){e.preventDefault();homeSel(BP.home.idx+(e.deltaY>0||e.deltaX>0?1:-1))}},{passive:false});

// ---- reserva: Gamepad API do navegador, se o SDL nao carregar ----
(function(){const NAMES=['south','east','west','north','leftShoulder','rightShoulder','lt','rt','back','start','leftStick','rightStick','dpadUp','dpadDown','dpadLeft','dpadRight','guide'];
 const prev={};let on=false;
 function loop(){if(!on)return;requestAnimationFrame(loop);if(!document.hasFocus())return;
  for(const gp of navigator.getGamepads?navigator.getGamepads():[]){if(!gp||gp.mapping!=='standard')continue;
   const st={};NAMES.forEach((n,i)=>{const b=gp.buttons[i];st[n]=!!(b&&(b.pressed||b.value>.55))});
   const [x,y]=gp.axes;st.lsLeft=x<-.55;st.lsRight=x>.55;st.lsUp=y<-.55;st.lsDown=y>.55;st.rsUp=gp.axes[3]<-.55;st.rsDown=gp.axes[3]>.55;
   const p=prev[gp.index]||{},type=/09cc|05c4|dualshock|wireless controller/i.test(gp.id)?'ps4':/054c|dualsense|playstation/i.test(gp.id)?'ps5':/057e|nintendo|pro controller/i.test(gp.id)?'nintendo':'xbox';
   for(const n in st)if(st[n]!==!!p[n])bpPad({t:st[n]?'down':'up',b:n,type});prev[gp.index]=st}}
 setTimeout(async()=>{try{const r=await api('pad_info');BP.padOk=!!r.ok;for(const p of r.pads||[])BP.pads[p.id]=p;batRender()}catch{BP.padOk=false}if(!BP.padOk){on=true;requestAnimationFrame(loop)}},2500)})();
bpZoom();bpEl.classList.toggle('sqm',BP.sq);
window.bpSet=bpSet;
})();
