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
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://x'),send=(c,b,t='application/json')=>{res.writeHead(c,{'Content-Type':t+'; charset=utf-8'});res.end(typeof b==='string'?b:JSON.stringify(b))};
  try{
    if(u.pathname==='/api/gems')return send(200,await gems());
    const m=u.pathname.match(/^\/api\/player\/(\d+)$/);if(m)return send(200,await player(m[1]));
    let f=path.join(__dirname,'public',u.pathname==='/'?'index.html':u.pathname);
    if(!f.startsWith(path.join(__dirname,'public'))||!fs.existsSync(f))return send(404,'Nije nađeno','text/plain');
    res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);
  }catch(e){send(502,{error:'FPL nedostupan: '+e.message})}
}).listen(process.env.PORT||3000,()=>console.log('Radi na portu',process.env.PORT||3000));
