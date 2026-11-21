// ===== Modo Big Picture (controle, teclado e mouse) =====
// Usa as funcoes e o estado do index.html (S, api, play, load, coverSrc, wallSrc...).
(()=>{
const BP={on:false,th:'orig',cat:0,cats:[],sel:{},list:[],idx:0,ov:null,style:'kb',rk:'',padOk:null};
try{const t=localStorage.getItem('bpth');if(t)BP.th=t}catch{}
const BPTH=[['orig','Registrando Games'],['steam','Steam'],['xbox','Xbox'],['ps','PlayStation']];
const BPI={
 play:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>',
 stop:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>',
 inst:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
 pad:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 11h4M8 9v4"/><path d="M15 12h.01M18 10h.01"/><path d="M17.3 5H6.7a4 4 0 0 0-4 3.6L2 15.6A3 3 0 0 0 5 19c1 0 1.9-.5 2.4-1.3L9 15h6l1.6 2.7A2.8 2.8 0 0 0 19 19a3 3 0 0 0 3-3.4l-.7-7A4 4 0 0 0 17.3 5z"/></svg>'};
const bpEl=document.createElement('div');bpEl.id='bp';bpEl.hidden=true;
bpEl.innerHTML=`<div class="bp-bg"><div class="bp-bgi"></div><div class="bp-bgi"></div></div><div class="bp-sh"></div>
<div class="bp-top"><div class="bp-av">${BPI.pad}</div><div class="bp-cw"><div class="bp-cats" id="bpcats"></div></div><div class="bp-clk" id="bpclk"></div></div>
<div class="bp-sec" id="bpsec"></div>
<div class="bp-row"><div class="bp-trk" id="bptrk"></div></div>
<div class="bp-info" id="bpinfo"></div>
<div class="bp-foot" id="bpfoot"></div>
<div class="bp-ov" id="bpov" hidden></div><div class="bp-toast" id="bptoast"></div>`;
document.body.appendChild(bpEl);
const bq=s=>bpEl.querySelector(s);

// ---- rotulos dos botoes conforme o controle ----
const BPGL={xbox:{a:'A',b:'B',x:'X',y:'Y',lb:'LB',rb:'RB',start:'☰',lt:'LT',rt:'RT'},ps:{a:'✕',b:'○',x:'□',y:'△',lb:'L1',rb:'R1',start:'☰',lt:'L2',rt:'R2'},
 nin:{a:'B',b:'A',x:'Y',y:'X',lb:'L',rb:'R',start:'+',lt:'ZL',rt:'ZR'},kb:{a:'Enter',b:'Esc',x:'F',y:'O',lb:'Q',rb:'E',start:'M',lt:'PgUp',rt:'PgDn'}};
const glyph=k=>{const t=(BPGL[BP.style]||BPGL.xbox)[k]||k;return `<i class="g g-${k}${t.length>2?' sh':''}">${t}</i>`};
function bpStyleFrom(m){const t=String(m.type||'').toLowerCase(),s=String(m.south||'').toLowerCase();
 const st=/ps3|ps4|ps5|playstation|dualsense|dualshock/.test(t)||s==='cross'?'ps':/nintendo|switch|joycon/.test(t)||s==='b'?'nin':'xbox';
 if(st!==BP.style){BP.style=st;bpClass();bpFoot();if(BP.on){bpInfo(BP.list[BP.idx]);if(BP.ov)ovRender()}}}
function bpClass(){bpEl.className='th-'+BP.th+' st-'+BP.style+(bpEl.classList.contains('nocur')?' nocur':'')}

// ---- categorias ----
const bpRec=l=>[...l].sort((a,b)=>(b.last_played||0)-(a.last_played||0)||NC(a,b));
function bpCats(){const vis=S.games.filter(g=>!g.hidden),c=[];
 c.push({k:'home',n:'Início',sec:'Jogados recentemente',g:bpRec(vis)});
 const inst=vis.filter(g=>(S.inst||[]).includes(g.id));if(inst.length)c.push({k:'inst',n:'Instalados',g:bpRec(inst)});
 const fav=vis.filter(g=>g.fav);if(fav.length)c.push({k:'fav',n:'Favoritos',g:bpRec(fav)});
 const pl=vis.filter(g=>g.status==='Jogando');if(pl.length)c.push({k:'st_j',n:stN('Jogando'),g:bpRec(pl)});
 const by=new Map();for(const g of vis){const p=canonP(g.platform)||'Outros';if(!by.has(p))by.set(p,[]);by.get(p).push(g)}
 [...by.entries()].sort((a,b)=>b[1].length-a[1].length).forEach(([p,l])=>c.push({k:'p:'+p,n:dispP(p),g:[...l].sort(NC)}));
 for(const L of S.lists||[]){const l=(L.ids||[]).map(id=>vis.find(g=>g.id===id)).filter(Boolean);if(l.length)c.push({k:'l:'+L.id,n:L.name||'Lista',g:l})}
 const fin=vis.filter(g=>g.status==='Zerado');if(fin.length)c.push({k:'st_z',n:stN('Zerado'),g:[...fin].sort((a,b)=>(b.finished||0)-(a.finished||0))});
 return c}

// ---- desenho ----
function bpTile(g,j){const cv=coverSrc(g),run=S.running.includes(g.id);
 return `<div class="bt" data-bi="${j}"><div class="bi">${cv?`<img src="${esc(cv)}" loading="lazy" decoding="async" alt="" onerror="this.remove()">`:''}<span class="bn">${esc(g.name)}</span></div>${run?'<i class="rn" title="Rodando"></i>':''}<span class="nm">${esc(g.name)}</span></div>`}
function bpRender(full){if(!BP.on)return;const cats=BP.cats=bpCats();if(BP.cat>=cats.length)BP.cat=0;const C=cats[BP.cat];
 bq('#bpcats').innerHTML=cats.map((c,i)=>`<span class="ct${i===BP.cat?' on':''}" data-bc="${i}">${esc(c.n)}</span>`).join('');
 const on=bq('#bpcats .on');if(on){const w=bq('.bp-cw').clientWidth,x=on.offsetLeft+on.offsetWidth;bq('#bpcats').style.transform=`translateX(${-Math.max(0,x-w*0.8)}px)`}
 bq('#bpsec').textContent=C.sec||C.n;
 const L=C.g,key=C.k+'|'+L.map(g=>g.id+(S.running.includes(g.id)?'r':'')+(g.cover||'')).join(',');BP.list=L;
 if(full||key!==BP.rk){BP.rk=key;bq('#bptrk').innerHTML=L.length?L.map(bpTile).join(''):'<div class="bp-empty">Nenhum jogo aqui.</div>'}
 const i=Math.max(0,L.findIndex(g=>g.id===BP.sel[C.k]));bpSel(i,true)}
function bpSel(i,force){const L=BP.list;if(!L.length){bpInfo(null);return}i=Math.max(0,Math.min(L.length-1,i));
 if(i===BP.idx&&!force&&BP.sel[BP.cats[BP.cat].k]===L[i].id)return;
 BP.idx=i;BP.sel[BP.cats[BP.cat].k]=L[i].id;
 const T=bq('#bptrk');T.querySelectorAll('.bt.on').forEach(x=>x.classList.remove('on'));const t=T.children[i];
 if(t){T.classList.add('nt');t.classList.add('on');T.style.transform=`translateX(${-t.offsetLeft+T.children[0].offsetLeft}px)`;requestAnimationFrame(()=>T.classList.remove('nt'))}
 bpInfo(L[i]);bpBg(L[i])}
function bpAct(g){const run=S.running.includes(g.id),ins=(S.inst||[]).includes(g.id),ok=(g.appid||g.lkey)?ins:!!(g.exe||g.rom);
 if(run&&(g.exe||g.proc))return ['stop','Parar',BPI.stop];if(run||LAUNCH[g.id]>Date.now()-60000)return ['playing','Jogando',BPI.play];
 if(!ok)return ['inst','Instalar',BPI.inst];return ['play','Jogar',BPI.play]}
function bpInfo(g){const el=bq('#bpinfo');if(!g){el.innerHTML='';return}
 const a=bpAct(g),lg=logoSrc(g),t=secs(g);
 const meta=[g.score!=null?`<span class="pi">Nota <b style="color:${scC(g.score)}">${scF(g.score)}</b></span>`:'',g.platform?`<span class="pi">${esc(dispP(canonP(g.platform)))}</span>`:'',`<span class="pi">${esc(stN(g.status||'Backlog'))}</span>`,t?`<span class="pi">${fmt(t)}</span>`:'',g.last_played?`<span class="pi">Último jogo: ${dpt(g.last_played)}</span>`:''].join('');
 el.innerHTML=`<div class="bi-t${lg&&!g.logoHide?' lg':''}">${lg&&!g.logoHide?`<img class="bi-lg" src="${esc(lg)}" alt="" onerror="this.parentElement.classList.remove('lg');this.remove()">`:''}<h1>${esc(g.name)}</h1></div><div class="bi-m">${meta}</div>
 <div class="bi-b"><button class="bb pri ${a[0]}" data-ba="a">${glyph('a')}${a[2]}${a[1]}</button><button class="bb" data-ba="x">${glyph('x')}${g.fav?'♥ Favorito':'♡ Favoritar'}</button><button class="bb" data-ba="y">${glyph('y')}Opções</button></div>`}
let BGT=0,BGF=0,BGK=0,BGL='';
function bpBg(g){const sig=g.id+'|'+wallSrc(g)+'|'+coverSrc(g);if(sig===BGL)return;BGL=sig;clearTimeout(BGT);const k=++BGK;BGT=setTimeout(()=>{const ws=wallSrc(g),cv=coverSrc(g),L=bpEl.querySelectorAll('.bp-bgi');
 const use=(u,blur)=>{if(k!==BGK)return;const nx=L[BGF^1];nx.style.backgroundImage=u?`url("${u.replace(/"/g,'%22')}")`:'none';nx.classList.toggle('blur',!!blur);L[BGF].classList.remove('on');nx.classList.add('on');BGF^=1};
 if(ws){const im=new Image();im.onload=()=>use(ws,false);im.onerror=()=>use(cv,true);im.src=ws}else use(cv,true)},140)}
function bpFoot(){const ov=BP.ov,h=[];
 if(ov){if(ov.type==='grid')h.push([glyph('lb')+glyph('rb'),'Página']);h.push([glyph('a'),ov.type==='text'?'':'Selecionar'],[glyph('b'),'Voltar'])}
 else{const g=BP.list[BP.idx];if(g)h.push([glyph('a'),bpAct(g)[1]]);h.push([glyph('y'),'Opções'],[glyph('x'),'Favoritar'],[glyph('lb')+glyph('rb'),'Categoria'],[glyph('start'),'Menu'])}
 bq('#bpfoot').innerHTML=h.filter(x=>x[1]).map(([g,t])=>`<span>${g}${t}</span>`).join('')}
function bpClock(){const d=new Date();bq('#bpclk').textContent=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
setInterval(()=>{if(BP.on)bpClock()},10000);
let BPTT=0;function bpToast(t){const e=bq('#bptoast');e.textContent=t;e.classList.add('on');clearTimeout(BPTT);BPTT=setTimeout(()=>e.classList.remove('on'),2600)}

// ---- liga / desliga ----
function bpSet(on){on=!!on;if(on===BP.on)return;BP.on=on;bpEl.hidden=!on;document.body.classList.toggle('bpon',on);api('bp_full',{on});
 if(on){document.querySelectorAll('dialog[open]').forEach(d=>{try{d.close()}catch{}});BP.ov=null;bq('#bpov').hidden=true;bpClass();bpClock();bpFoot();bpRender(true)}
 else{Object.keys(REP).forEach(padUp)}}
window.bpOnLoad=()=>{if(BP.on){bpRender(false);bpFoot();if(BP.ov&&BP.ov.type==='menu')ovRender()}};

// ---- acoes ----
const bpG=()=>BP.list[BP.idx];
function bpMove(d){bpSel(BP.idx+d);bpFoot()}
function bpCat(d){const n=BP.cats.length;if(!n)return;BP.cat=(BP.cat+d+n)%n;bpRender(true);bpFoot()}
async function bpA(){const g=bpG();if(!g)return;const a=bpAct(g)[0];
 if(a==='stop')return bpConfirmStop(g);
 if(a==='playing')return bpToast('O jogo já está abrindo.');
 if(a==='inst'){if(g.appid||g.lkey||g.uri){bpToast('Abrindo o launcher para instalar…');installGame(g)}else bpToast('Esse jogo não tem .exe. Adicione pela tela de editar, fora do Big Picture.');return}
 bpToast('Abrindo '+g.name+'…');await play(g.id)}
async function bpFav(){const g=bpG();if(!g)return;await api('save',{id:g.id,fav:!g.fav});bpToast(g.fav?'Removido dos favoritos':'Adicionado aos favoritos');await load()}
function bpConfirmStop(g){ovOpen({type:'menu',title:`Fechar "${g.name}"?`,sub:'O progresso que não foi salvo no jogo será perdido.',items:[{n:'Fechar o jogo',dl:1,fn:async()=>{ovClose();bpToast('Fechando…');const r=await api('stop',{id:g.id});if(r&&r.error)bpToast(r.error);delete LAUNCH[g.id];setTimeout(load,800)}},{n:'Cancelar',fn:ovClose}]})}
function bpOpts(){const g=bpG();if(!g)return;const a=bpAct(g),it=[];
 it.push({n:a[1],fn:()=>{ovClose();bpA()}});
 if(a[0]==='stop')it.push({n:'Fechar o jogo',dl:1,fn:()=>bpConfirmStop(g)});
 it.push({n:g.fav?'Remover dos favoritos':'Adicionar aos favoritos',fn:()=>{ovClose();bpFav()}});
 it.push({n:'Trocar capa',ar:1,fn:()=>bpCovers(g)});
 it.push({n:'Mudar status',ar:1,fn:()=>ovOpen({type:'menu',title:'Status',items:ST.map(s=>({n:stN(s),ck:g.status===s,fn:async()=>{const b={id:g.id,status:s};if(s==='Zerado'&&!g.finished)b.finished=Math.floor(Date.now()/1000);await api('save',b);ovClose(true);bpToast('Status: '+stN(s));await load()}}))},true)});
 if((g.review||'').trim())it.push({n:'Ler review',ar:1,fn:()=>ovOpen({type:'text',title:g.name,text:g.review},true)});
 ovOpen({type:'menu',title:g.name,items:it})}
function bpMenu(){ovOpen({type:'menu',title:'Menu',items:[{n:'Tema',ar:1,fn:()=>ovOpen({type:'menu',title:'Tema do Big Picture',items:BPTH.map(([k,n])=>({n,ck:BP.th===k,fn:()=>{BP.th=k;try{localStorage.setItem('bpth',k)}catch{}bpClass();ovClose(true);bpRender(true);bpToast('Tema: '+n)}}))},true)},{n:'Sair do Big Picture',fn:()=>{ovClose(true);bpSet(false)}}]})}
async function bpCovers(g){if(!S.config.sgdb){bpToast('Para trocar capas, coloque a chave do SteamGridDB nas Configurações.');return}
 const ov={type:'grid',title:'Trocar capa',sub:g.name,items:[],i:0,page:-1,more:true,loading:false,g};ovOpen(ov,true);await bpCovMore(ov)}
async function bpCovMore(ov){if(ov.loading||!ov.more)return;ov.loading=true;ovRender();
 try{const r=await api('sgdb',{id:ov.g.id,page:ov.page+1,kind:'cover'});if(r.error){bpToast(r.error);ov.more=false}else{ov.page++;ov.items.push(...(r.items||[]));ov.more=!!r.more}}catch{ov.more=false}
 ov.loading=false;if(BP.ov===ov)ovRender()}
async function bpCovApply(ov){const it=ov.items[ov.i];if(!it)return;bpToast('Aplicando a capa…');
 try{const f=await api('fetch_img',{url:it.url});if(!f.data)throw 0;await api('cover_data',{id:ov.g.id,data:await toCover(f.data)});ovClose(true);await load();bpRender(true);bpToast('Capa trocada!')}catch{bpToast('Não consegui usar essa capa. Tente outra.')}}

// ---- painel por cima ----
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

// ---- entrada ----
function bpIn(k){if(!BP.on)return;if(BP.ov)return ovIn(k);
 switch(k){case 'left':bpMove(-1);break;case 'right':bpMove(1);break;case 'lt':bpMove(-10);break;case 'rt':bpMove(10);break;
  case 'up':case 'lb':bpCat(-1);break;case 'down':case 'rb':bpCat(1);break;
  case 'a':bpA();break;case 'x':bpFav();break;case 'y':bpOpts();break;case 'start':case 'back':bpMenu();break}}
const BPMAP={dpadUp:'up',dpadDown:'down',dpadLeft:'left',dpadRight:'right',lsUp:'up',lsDown:'down',lsLeft:'left',lsRight:'right',south:'a',east:'b',west:'x',north:'y',
 leftShoulder:'lb',rightShoulder:'rb',lt:'lt',rt:'rt',start:'start',back:'back',guide:'guide',rsUp:'sup',rsDown:'sdown'};
const REP={},RPT=new Set(['up','down','left','right','sup','sdown','lt','rt']);
function padDown(k){bpIn(k);if(RPT.has(k)){clearTimeout(REP[k]);const r=()=>{bpIn(k);REP[k]=setTimeout(r,k==='lt'||k==='rt'?220:85)};REP[k]=setTimeout(r,380)}}
function padUp(k){clearTimeout(REP[k]);delete REP[k]}
function bpPad(m){
 if(m.t==='bp'){bpSet(true);return}
 if(m.t==='conn'){bpStyleFrom(m);if(BP.on)bpToast('Controle conectado: '+(m.name||''));return}
 if(m.t==='disc'){if(BP.on)bpToast('Controle desconectado');return}
 const k=BPMAP[m.b];if(!k)return;
 if(m.t==='down'){bpStyleFrom(m);bpEl.classList.add('nocur');if(k==='guide'){bpSet(!BP.on);return}if(!BP.on)return;padDown(k)}
 else if(m.t==='up')padUp(k)}
if(window.bridge&&bridge.onPad)bridge.onPad(bpPad);
bpEl.addEventListener('mousemove',()=>bpEl.classList.remove('nocur'));
const BPK={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Enter:'a',' ':'a',Escape:'b',Backspace:'b',f:'x',F:'x',o:'y',O:'y',q:'lb',Q:'lb',e:'rb',E:'rb',m:'start',M:'start',PageUp:'lt',PageDown:'rt'};
document.addEventListener('keydown',e=>{
 if(e.key==='F1'){e.preventDefault();e.stopPropagation();bpSet(!BP.on);return}
 if(!BP.on)return;const k=BPK[e.key];e.stopPropagation();if(!k)return;e.preventDefault();
 if(BP.style!=='kb'){BP.style='kb';bpClass();bpFoot();bpInfo(bpG())}bpIn(k)},true);
// mouse
bpEl.addEventListener('click',e=>{const c=e.target.closest('[data-bc]');if(c){BP.cat=+c.dataset.bc;bpRender(true);bpFoot();return}
 const t=e.target.closest('[data-bi]');if(t){const i=+t.dataset.bi;if(i===BP.idx)bpA();else{bpSel(i);bpFoot()}return}
 const b=e.target.closest('[data-ba]');if(b){bpIn(b.dataset.ba);return}
 const oi=e.target.closest('[data-oi]');if(oi&&BP.ov){BP.ov.i=+oi.dataset.oi;if(BP.ov.type==='grid'){ovRender();bpCovApply(BP.ov)}else ovIn('a');return}
 if(e.target.id==='bpov')ovClose()});
bpEl.addEventListener('wheel',e=>{if(BP.ov)return;e.preventDefault();bpMove(e.deltaY>0||e.deltaX>0?1:-1)},{passive:false});

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
