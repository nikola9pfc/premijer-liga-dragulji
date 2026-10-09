const http=require('http'),fs=require('fs'),path=require('path');
const FPL='https://fantasy.premierleague.com/api/',cache=new Map();
async function get(p,ttl){const c=cache.get(p);if(c&&Date.now()-c.t<ttl)return c.d;
  try{const r=await fetch(FPL+p,{headers:{'User-Agent':'Mozilla/5.0'}});if(!r.ok)throw new Error(r.status);
    const d=await r.json();cache.set(p,{t:Date.now(),d});return d}catch(e){if(c)return c.d;throw e}}
const pctFn=a=>{const s=[...a].sort((x,y)=>x-y),n=s.length-1||1;return v=>{let i=0;while(i<s.length&&s[i]<v)i++;return i/n}};
async function gems(){
  const b=await get('bootstrap-static/',6e5);
  const gw=(b.events.find(e=>e.is_current)||b.events.find(e=>e.is_next)||{id:1}).id;
  const teams={};b.teams.forEach(t=>teams[t.id]={s:t.short_name,n:t.name,c:t.code});
  const P={1:'GK',2:'DEF',3:'MID',4:'FWD'};
  let ps=b.elements.filter(e=>e.minutes>=90).map(e=>{const n=e.minutes/90;
    return{id:e.id,code:e.code,name:e.web_name,full:e.first_name+' '+e.second_name,team:e.team,pos:P[e.element_type],g:e.element_type<3?'D':e.element_type,
    price:e.now_cost/10,own:+e.selected_by_percent,form:+e.form,min:e.minutes,starts:e.starts,goals:e.goals_scored,ast:e.assists,
    xg:+e.expected_goals,xa:+e.expected_assists,cs:e.clean_sheets,pts:e.total_points,status:e.status,news:e.news,
    age:e.birth_date?Math.floor((Date.now()-new Date(e.birth_date))/31557600000):null,
    xgi90:(+e.expected_goals+ +e.expected_assists)/n,thr90:+e.threat/n,cre90:+e.creativity/n,inf90:+e.influence/n,ict90:+e.ict_index/n,cs90:e.clean_sheets/n}});
  const minP=pctFn(ps.map(p=>p.min)),ownP=pctFn(ps.map(p=>p.own));
  const groups={};ps.forEach(p=>(groups[p.g]=groups[p.g]||[]).push(p));
  for(const g of Object.values(groups)){
    const f={};for(const k of['xgi90','thr90','cre90','inf90','ict90','cs90','form'])f[k]=pctFn(g.map(p=>p[k]));
    for(const p of g){
      p.bars={Napad:Math.round(f.thr90(p.thr90)*100),Kreativnost:Math.round(f.cre90(p.cre90)*100),Uticaj:Math.round(f.inf90(p.inf90)*100),Efikasnost:Math.round(f.xgi90(p.xgi90)*100)};
      const q=p.g==='D'?.35*f.xgi90(p.xgi90)+.3*f.inf90(p.inf90)+.2*f.cs90(p.cs90)+.15*f.form(p.form)
                      :.5*f.xgi90(p.xgi90)+.25*f.ict90(p.ict90)+.25*f.form(p.form);
      const obs=.65*(1-ownP(p.own))+.35*(1-minP(p.min));
      p.score=Math.round(100*(.62*q+.38*obs));
      p.tags=[];
      if(p.own<5)p.tags.push('Ispod radara');
      if(p.starts/gw<.5)p.tags.push('Klupa');
      if(p.age&&p.age<=21)p.tags.push('Mlad');
      if(p.form>=5)p.tags.push('U formi');
      p.why=`xG+xA ${(p.xgi90).toFixed(2)}/90 uz samo ${p.own}% vlasništva`+(p.starts/gw<.5?', ulazi sa klupe':'');
    }}
  ps.forEach(p=>{delete p.thr90;delete p.cre90;delete p.inf90;delete p.ict90;delete p.cs90});
  ps.sort((a,b)=>b.score-a.score);
  return{gw,teams,players:ps}}
async function player(id){
  const d=await get(`element-summary/${id}/`,6e5);
  return{history:d.history.slice(-5).map(h=>({r:h.round,o:h.opponent_team,h:h.was_home,m:h.minutes,p:h.total_points,g:h.goals_scored,a:h.assists})),
    fixtures:d.fixtures.slice(0,5).map(f=>({r:f.event,o:f.is_home?f.team_a:f.team_h,h:f.is_home,d:f.difficulty}))}}
const HTML=`<!DOCTYPE html><html lang="sr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Dragulji">
<meta name="theme-color" content="#0e1116"><link rel="manifest" href="/manifest.json"><link rel="apple-touch-icon" href="/icon-180.png">
<title>Premier Dragulji</title>
<style>
:root{--bg:#0e1116;--c:#171c24;--t:#eef1f5;--m:#8b95a5;--a:#3ddc97;--b:#2a3140}
@media(prefers-color-scheme:light){:root{--bg:#f4f6f9;--c:#fff;--t:#14181f;--m:#667085;--a:#0f9d63;--b:#dfe3ea}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--t);font:15px -apple-system,system-ui,sans-serif;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
header{padding:16px 16px 8px}h1{margin:0;font-size:24px}h1 span{color:var(--a)}.sub{color:var(--m);font-size:13px;margin-top:2px}
input{width:calc(100% - 32px);margin:8px 16px;padding:11px 14px;border-radius:12px;border:1px solid var(--b);background:var(--c);color:var(--t);font-size:16px}
.chips{display:flex;gap:8px;overflow-x:auto;padding:4px 16px 10px}.chip{flex:none;padding:7px 13px;border-radius:20px;border:1px solid var(--b);background:var(--c);color:var(--t);font-size:13px}
.chip.on{background:var(--a);color:#06281a;border-color:var(--a);font-weight:600}
.card{display:flex;gap:12px;align-items:center;margin:0 16px 10px;padding:12px;background:var(--c);border:1px solid var(--b);border-radius:16px}
.ph{width:52px;height:62px;border-radius:10px;background:var(--b) center/cover;flex:none}
.in{flex:1;min-width:0}.nm{font-weight:650;font-size:16px}.mt{color:var(--m);font-size:12.5px;margin:2px 0}
.tg{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}.tg i{font-style:normal;font-size:11px;padding:2px 8px;border-radius:10px;background:var(--b)}
.sc{width:46px;height:46px;border-radius:50%;border:3px solid var(--a);display:grid;place-items:center;font-weight:700;flex:none}
.st{background:none;border:0;font-size:22px;color:var(--m);padding:4px}.st.on{color:#f5b301}
#sh{position:fixed;inset:0;background:var(--bg);overflow:auto;padding:calc(env(safe-area-inset-top) + 12px) 16px 40px;transform:translateY(100%);transition:.25s;z-index:9}#sh.o{transform:none}
.bk{background:none;border:0;color:var(--a);font-size:16px;padding:6px 0}
.g{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.g div{background:var(--c);border:1px solid var(--b);border-radius:12px;padding:10px;text-align:center}.g b{display:block;font-size:18px}.g small{color:var(--m)}
.br{margin:8px 0}.br div{height:8px;background:var(--b);border-radius:4px;margin-top:4px}.br span{display:block;height:100%;background:var(--a);border-radius:4px}
h3{margin:18px 0 6px}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--b);font-size:14px}.d1,.d2{color:#3ddc97}.d3{color:#f5b301}.d4,.d5{color:#ff6b6b}
</style></head><body>
<header><h1>Premier <span>Dragulji</span></h1><div class="sub" id="gw">Učitavanje…</div></header>
<input id="q" placeholder="Traži igrača ili tim" type="search">
<div class="chips" id="ch"></div><div id="ls"></div><div id="sh"></div>
<script>
const $=s=>document.querySelector(s);let D=[],T={},F={pos:'ALL',tag:null,fav:false},Q='';
let W=[];try{W=JSON.parse(localStorage.w||'[]')}catch(e){}
const sv=()=>{try{localStorage.w=JSON.stringify(W)}catch(e){}};
const chips=[['ALL','Svi'],['FWD','Napad'],['MID','Sredina'],['DEF','Odbrana'],['GK','Golman'],['t:Ispod radara','Ispod radara'],['t:Klupa','Sa klupe'],['t:Mlad','Mladi'],['t:U formi','U formi'],['fav','★ Praćeni']];
function drawChips(){$('#ch').innerHTML=chips.map(([k,l])=>{const on=k==='fav'?F.fav:k.startsWith('t:')?F.tag===k.slice(2):F.pos===k&&!F.fav;return\`<button class="chip \${on?'on':''}" data-k="\${k}">\${l}</button>\`}).join('')}
$('#ch').onclick=e=>{const k=e.target.dataset.k;if(!k)return;
  if(k==='fav')F.fav=!F.fav;else if(k.startsWith('t:')){const t=k.slice(2);F.tag=F.tag===t?null:t}else{F.pos=k;F.fav=false}
  drawChips();draw()};
$('#q').oninput=e=>{Q=e.target.value.toLowerCase();draw()};
const ph=p=>\`https://resources.premierleague.com/premierleague/photos/players/110x140/p\${p.code}.png\`;
function draw(){
  let l=D.filter(p=>(F.pos==='ALL'||p.pos===F.pos)&&(!F.tag||p.tags.includes(F.tag))&&(!F.fav||W.includes(p.id))&&(!Q||(p.full+T[p.team].n).toLowerCase().includes(Q)));
  $('#ls').innerHTML=l.slice(0,60).map(p=>\`<div class="card" data-id="\${p.id}"><div class="ph" style="background-image:url(\${ph(p)})"></div>
  <div class="in"><div class="nm">\${p.name}</div><div class="mt">\${T[p.team].s} · \${p.pos} · £\${p.price}m\${p.age?' · '+p.age+' god.':''}</div>
  <div class="mt">\${p.why}</div><div class="tg">\${p.tags.map(t=>\`<i>\${t}</i>\`).join('')}</div></div>
  <button class="st \${W.includes(p.id)?'on':''}" data-s="\${p.id}">★</button><div class="sc">\${p.score}</div></div>\`).join('')||'<p class="sub" style="padding:16px">Nema rezultata.</p>'}
$('#ls').onclick=e=>{const s=e.target.dataset.s;if(s){e.stopPropagation();const id=+s;W=W.includes(id)?W.filter(x=>x!==id):[...W,id];sv();draw();return}
  const c=e.target.closest('.card');if(c)open(+c.dataset.id)};
async function open(id){
  const p=D.find(x=>x.id===id),sh=$('#sh');
  sh.innerHTML=\`<button class="bk" onclick="$('#sh').classList.remove('o')">‹ Nazad</button>
  <div style="display:flex;gap:14px;align-items:center"><div class="ph" style="width:80px;height:96px;background-image:url(\${ph(p)})"></div>
  <div><h2 style="margin:0">\${p.full}</h2><div class="mt">\${T[p.team].n} · \${p.pos} · £\${p.price}m</div><div class="mt">Impact skor: <b style="color:var(--a)">\${p.score}</b></div></div></div>
  \${p.news?\`<p class="mt">⚠ \${p.news}</p>\`:''}
  <div class="g"><div><b>\${p.form}</b><small>Forma</small></div><div><b>\${p.own}%</b><small>Vlasništvo</small></div><div><b>\${p.min}'</b><small>Minuti</small></div>
  <div><b>\${p.goals}</b><small>Golovi</small></div><div><b>\${p.ast}</b><small>Asist.</small></div><div><b>\${(p.xg+p.xa).toFixed(1)}</b><small>xG+xA</small></div></div>
  <h3>Karakteristike (u odnosu na istu ulogu)</h3>\${Object.entries(p.bars).map(([k,v])=>\`<div class="br">\${k} · \${v}<div><span style="width:\${v}%"></span></div></div>\`).join('')}
  <div id="x"><p class="sub">Učitavam utakmice…</p></div>\`;
  sh.classList.add('o');sh.scrollTop=0;
  try{const d=await(await fetch('/api/player/'+id)).json(),n=o=>T[o]?.s||'?';
    $('#x').innerHTML=\`<h3>Poslednjih 5 utakmica</h3>\${d.history.map(h=>\`<div class="row"><span>KL\${h.r} \${h.h?'vs':'@'} \${n(h.o)}</span><span>\${h.m}' · \${h.g}G \${h.a}A · <b>\${h.p} bod.</b></span></div>\`).join('')||'—'}
    <h3>Sledeći mečevi</h3>\${d.fixtures.map(f=>\`<div class="row"><span>KL\${f.r} \${f.h?'vs':'@'} \${n(f.o)}</span><span class="d\${f.d}">težina \${f.d}/5</span></div>\`).join('')||'—'}\`}
  catch(e){$('#x').innerHTML='<p class="sub">Detalji trenutno nisu dostupni.</p>'}}
(async()=>{try{const r=await(await fetch('/api/gems')).json();if(r.error)throw 0;D=r.players;T=r.teams;
  $('#gw').textContent=\`Kolo \${r.gw} · igrači ispod radara koji menjaju utakmice\`;drawChips();draw()}
 catch(e){$('#gw').textContent='Podaci trenutno nisu dostupni. Proveri konekciju.'}})();
if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
</script></body></html>\`;
http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://x'),send=(c,b,t='application/json')=>{res.writeHead(c,{'Content-Type':t+'; charset=utf-8'});res.end(typeof b==='string'?b:JSON.stringify(b))};
  try{
    if(u.pathname==='/api/gems')return send(200,await gems());
    const m=u.pathname.match(/^\/api\/player\/(\d+)$/);if(m)return send(200,await player(m[1]));
    if(u.pathname==='/'||u.pathname==='/index.html')return send(200,HTML,'text/html');
    if(u.pathname==='/manifest.json')return send(200,{name:'Premier Dragulji',short_name:'Dragulji',start_url:'/',display:'standalone',background_color:'#0e1116',theme_color:'#0e1116',icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icon-512.png',sizes:'512x512',type:'image/png'}]},'application/json');
    send(404,'','text/plain');
  }catch(e){send(502,{error:'FPL dostupnost: '+e.message})}
}).listen(process.env.PORT||3000,()=>console.log('Radi na portu',process.env.PORT||3000));
