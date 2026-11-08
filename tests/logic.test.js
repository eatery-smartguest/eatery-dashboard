// Run: node tests/logic.test.js   (alerts, month outlook, patterns, summary)
const fs=require('fs'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/../index.html','utf8');
const block=n=>src.match(new RegExp('/\\*'+n+'\\*/([\\s\\S]*?)/\\*/'+n+'\\*/'))[1];
const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],WK=['Sat','Sun','Mon','Tue','Wed','Thu','Fri'];
const f=n=>Math.round(n).toLocaleString('en-US'),pct=(a,b)=>b?a/b*100:0,short=v=>String(Math.round(v)),key=(y,m)=>y*100+m;
const mk=(months)=>{const idxOf={};months.forEach((r,i)=>idxOf[key(r.y,r.m)]=i);
  return new Function('MN','WK','wkIdx','f','pct','short','key','idxOf','lbl',block('INS')+block('LOGIC')+';return {insights,alerts,outlook,patterns,summary,yearOutlook,payChecks,topInsights,targetShare}')
   (MN,WK,w=>(w+1)%7,f,pct,short,key,idxOf,r=>MN[r.m-1]+' '+r.y);};
const wdOf=(y,m,d)=>new Date(Date.UTC(y,m-1,d)).getUTCDay()||7;
const run=(y,m,from,to,fn)=>{const o=[];for(let d=from;d<=to;d++)o.push({y,m,d,wd:wdOf(y,m,d),...fn(d)});return o};
const rec=(y,m,days)=>({y,m,total:days.reduce((s,x)=>s+x.total,0),guests:days.reduce((s,x)=>s+x.guests,0),visa:0,cash:0,insta:null,part:false});

// Oct 2026 flat 100/day, 10 guests. Nov: 100/day for days 1-2.
const oct=run(2026,10,1,31,()=>({total:100,guests:10}));
const nov=run(2026,11,1,2,()=>({total:100,guests:10}));
let months=[rec(2026,10,oct),{...rec(2026,11,nov),part:true}], days=[...oct,...nov], L=mk(months);

// forecast: 2 days done at 100, 28 left at the usual 100 => 3000; target 4000 => (4000-200)/28 a day
let o=L.outlook(months,days,{202611:4000});
assert.strictEqual(o.kind,'open'); assert.strictEqual(Math.round(o.forecast),3000); assert.strictEqual(o.hit,false);
assert(Math.abs(o.need-(4000-200)/28)<1e-9,'needed per day'); assert.strictEqual(L.outlook(months,days,{}).target,null);
// a finished month only reports when it has a target
const done=L.outlook([months[0]],oct,{202610:3000}); assert.strictEqual(done.kind,'done'); assert.strictEqual(Math.round(done.pct),103);
assert.strictEqual(L.outlook([months[0]],oct,{}),null);

// alerts: normal days are quiet; a collapsed latest day is flagged
assert.strictEqual(L.alerts(months,days)[0][1],'Nothing unusual');
const bad=[...oct.slice(0,-1),{...oct[30],total:30,guests:3}]; const a=L.alerts([months[0]],bad);
assert(a.some(x=>x[0]==='bad'&&/below a usual/.test(x[1])),'low day flagged'); assert(a.some(x=>/fewer guests/.test(x[1])),'low guests flagged');

// patterns: best/worst days, weekdays, no NaN anywhere
const mixed=run(2026,10,1,31,d=>({total:100+d,guests:10})); const P=mk([rec(2026,10,mixed)]).patterns([rec(2026,10,mixed)],mixed);
assert.strictEqual(P.top[0].total,131); assert.strictEqual(P.bottom[0].total,101); assert.strictEqual(P.wdAll.length,7);
assert(!/NaN|undefined/.test(JSON.stringify(P)),'no NaN');

// summary: readable text with the figures in it
const t=L.summary(months,days,0,o,L.alerts(months,days)); assert(/Sales 3,100 EGP/.test(t)&&/forecast 3,000 EGP/.test(t)&&/target 4,000 EGP/.test(t),t);
// year outlook: 2025 = 100/month; 2026 Jan-Oct = 110/month (+10%) => 1100 + 2 x 110 = 1320
const yr=[];for(let m=1;m<=12;m++)yr.push({y:2025,m,total:100,guests:10,visa:0,cash:0,insta:null,part:false});
for(let m=1;m<=10;m++)yr.push({y:2026,m,total:110,guests:10,visa:0,cash:0,insta:null,part:false});
const yo=mk(yr).yearOutlook(yr); assert.strictEqual(Math.round(yo.est),1320); assert.strictEqual(Math.round(yo.growth),10);
assert.strictEqual(mk(yr).yearOutlook(yr.slice(0,12)),null,'complete year has no outlook');
// payment checks: only meaningful gaps, biggest first; 2024-style days without Instapay only when payments exceed the total
const pd=[{y:2026,m:1,d:1,wd:4,total:1000,guests:1,visa:600,cash:400,insta:0},{y:2026,m:1,d:2,wd:5,total:100000,guests:1,visa:50000,cash:10000,insta:0},
  {y:2026,m:1,d:3,wd:6,total:10000,guests:1,visa:60000,cash:0,insta:0},{y:2024,m:1,d:4,wd:4,total:9000,guests:1,visa:5000,cash:2000,insta:null}];
assert.deepStrictEqual(L.payChecks(pd).map(x=>Math.round(x.gap)),[-50000,40000]);
const yd=[];yr.forEach(r=>{const n=new Date(Date.UTC(r.y,r.m,0)).getUTCDate();yd.push(...run(r.y,r.m,1,n,()=>({total:r.total/n,guests:1,visa:null,cash:null,insta:null})))});
const ti=mk(yr).topInsights(yr,yd); assert(ti.length>=3&&!/NaN|undefined/.test(JSON.stringify(ti)),JSON.stringify(ti));
assert(/2026 is heading for about 1320 EGP/.test(ti[0][1]),ti[0][1]);
// Targets: the month, and the year up to that month (a year target is month 0)
const tm=[{y:2026,m:1,total:100,guests:1,part:false},{y:2026,m:2,total:200,guests:1,part:false},{y:2026,m:3,total:50,guests:1,part:true}];
const ts=mk(tm).targetShare;
let T=ts(tm,{202603:200,202600:1000},2);
assert.strictEqual(T.month.achieved,50);assert.strictEqual(T.month.remaining,150);assert.strictEqual(Math.round(T.month.pct),25);assert.strictEqual(T.part,true);
assert.strictEqual(T.year.achieved,350);assert.strictEqual(T.year.remaining,650);assert.strictEqual(Math.round(T.year.pct),35);
T=ts(tm,{202602:150},1);assert.strictEqual(T.month.over,50);assert.strictEqual(T.month.remaining,0);assert.strictEqual(T.year,null,'no year target');
T=ts(tm,{},0);assert.strictEqual(T.month,null);assert.strictEqual(T.year,null);
T=ts(tm,{202600:1000},1);assert.strictEqual(T.year.achieved,300,'year counts only up to the selected month');
console.log('LOGIC OK');
