// Run: node tests/apps-script.test.js   (the Apps Script against a fake spreadsheet: read, save, ask before replace, log)
const fs=require('fs'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/../apps-script/Code.gs','utf8');
function Sheet(rows){this.v=rows}
Sheet.prototype={
  getLastRow(){return this.v.length}, getLastColumn(){return Math.max(...this.v.map(r=>r.length))},
  getDataRange(){return this.getRange(1,1,this.v.length,this.getLastColumn())},
  appendRow(r){this.v.push(r.slice())},
  getRange(r,c,nr=1,nc=1){const S=this;return{
    getValues(){return Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>{const row=S.v[r-1+i]||[];return row[c-1+j]===undefined?'':row[c-1+j]}))},
    setValue(x){while(S.v.length<r)S.v.push([]);S.v[r-1][c-1]=x}}}};
const D=s=>new Date(s+'T00:00:00Z');
const daily=new Sheet([['Date','Total_EGP','Visa_EGP','Cash_EGP','Instapay_EGP','Guests','RecordStatus'],
  [D('2026-11-01'),100,60,40,'',10,'Actual'],[D('2026-11-02'),'','','','','','Template']]);
const sheets={Daily_Data:daily,Monthly_Data:new Sheet([['Year','MonthNumber','Total_EGP','Visa_EGP','Cash_EGP','Instapay_EGP','Guests','RecordStatus']])};
const ss={getSpreadsheetTimeZone:()=>'UTC',getSheetByName:n=>sheets[n]||null,insertSheet:n=>(sheets[n]=new Sheet([]))};
const env={
  SpreadsheetApp:{openById:()=>ss},
  PropertiesService:{getScriptProperties:()=>({getProperty:()=>'pw'})},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
  Utilities:{formatDate:(d,tz,f)=>f==='yyyy-MM-dd'&&tz==='Africa/Cairo'?'2026-11-07':d.toISOString().slice(0,10)},
  ContentService:{MimeType:{JSON:1},createTextOutput:t=>({setMimeType(){return JSON.parse(t)}})}};
const api=new Function(...Object.keys(env),src+';return {doGet,doPost}')(...Object.values(env));
const post=b=>api.doPost({postData:{contents:JSON.stringify(b)}});

assert.deepStrictEqual(api.doGet({parameter:{key:'nope'}}),{error:'unauthorized'});
assert.strictEqual(api.doGet({parameter:{key:'pw'}}).daily[0][0],'2026-11-01','dates come back as yyyy-MM-dd');
assert.deepStrictEqual(post({key:'x',date:'2026-11-02',total:1,guests:1}),{error:'unauthorized'});
assert.strictEqual(post({key:'pw',date:'2026-11-09',total:1,guests:1}).status,'error','future date refused');
// Template row gets filled without asking
assert.deepStrictEqual(post({key:'pw',date:'2026-11-02',total:200,visa:150,cash:null,insta:50,guests:20}),{status:'saved',replaced:false});
assert.deepStrictEqual(daily.v[2].slice(1),[200,150,'',50,20,'Actual']);
// A saved day is not replaced until confirmed
const ex=post({key:'pw',date:'2026-11-01',total:111,guests:11});
assert.strictEqual(ex.status,'exists'); assert.deepStrictEqual(ex.old,[100,60,40,'',10]); assert.strictEqual(daily.v[1][1],100,'unchanged before confirm');
assert.deepStrictEqual(post({key:'pw',date:'2026-11-01',total:111,guests:11,overwrite:true}),{status:'saved',replaced:true});
assert.deepStrictEqual(daily.v[1].slice(1),[111,'','','',11,'Actual']);
// A date not in the sheet is added at the end
post({key:'pw',date:'2026-11-05',total:5,guests:1}); assert.strictEqual(daily.v[3][0],'2026-11-05');
// Every write is logged, with the old values when replacing
const log=sheets.Entry_Log.v; assert.strictEqual(log.length,4); assert.strictEqual(log[2][2],'100 | 60 | 40 |  | 10');
console.log('APPS SCRIPT OK');
