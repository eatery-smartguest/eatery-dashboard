// Eatery dashboard API. Paste into the Apps Script project, then Deploy > Manage deployments > edit > New version.
// The password lives in Project Settings > Script Properties as KEY. It is never stored in this file.
const SHEET_ID = '1qPpKOIFVAkeYUJ_DnMQ9FAcjLvHa7AWzLN1ma_T31Eo';
const DAILY = ['Date','Total_EGP','Visa_EGP','Cash_EGP','Instapay_EGP','Guests','RecordStatus'];
const MONTHLY = ['Year','MonthNumber','Total_EGP','Visa_EGP','Cash_EGP','Instapay_EGP','Guests','RecordStatus'];
const LOG_HEAD = ['When','Date','Old_Total','Old_Visa','Old_Cash','Old_Instapay','Old_Guests','New_Total','New_Visa','New_Cash','New_Instapay','New_Guests'];
const MAX_MONEY = 5000000, MAX_GUESTS = 5000;

// Read: all sales for the dashboard.
function doGet(e){
  if(!authorized(e && e.parameter && e.parameter.key)) return out({error:'unauthorized'});
  const ss = SpreadsheetApp.openById(SHEET_ID), tz = ss.getSpreadsheetTimeZone(), t = ss.getSheetByName('Targets');
  return out({
    daily: rows(ss.getSheetByName('Daily_Data'), DAILY, tz),
    monthly: rows(ss.getSheetByName('Monthly_Data'), MONTHLY, tz),
    targets: t ? rows(t, ['Year','MonthNumber','Target_EGP'], tz) : []
  });
}

// Write: one day into Daily_Data. Asks before replacing a saved day, and logs every write in Entry_Log.
function doPost(e){
  let b;
  try { b = JSON.parse(e.postData.contents); } catch(x) { return out({status:'error', message:'bad request'}); }
  if(!authorized(b.key)) return out({error:'unauthorized'});
  const r = check(b);
  if(r.error) return out({status:'error', message:r.error});
  const lock = LockService.getScriptLock();
  if(!lock.tryLock(10000)) return out({status:'error', message:'the sheet is busy, try again'});
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID), tz = ss.getSpreadsheetTimeZone(), sh = ss.getSheetByName('Daily_Data');
    const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], col = DAILY.map(c => head.indexOf(c));
    if(col.some(i => i < 0)) return out({status:'error', message:'Daily_Data columns are missing'});
    const n = sh.getLastRow() - 1, dates = n > 0 ? sh.getRange(2, col[0] + 1, n, 1).getValues() : [];
    let row = -1;
    for(let i = 0; i < n; i++) if(ymd(dates[i][0], tz) === r.date){ row = i + 2; break; }
    let old = null;
    if(row > 0){
      const cur = sh.getRange(row, 1, 1, head.length).getValues()[0];
      if(cur[col[1]] !== '' && String(cur[col[6]]).trim() !== 'Template'){
        old = [cur[col[1]], cur[col[2]], cur[col[3]], cur[col[4]], cur[col[5]]];
        if(b.overwrite !== true) return out({status:'exists', old:old});
      }
    } else {
      row = sh.getLastRow() + 1;
      sh.getRange(row, col[0] + 1).setValue(r.date);
    }
    const put = (i, v) => sh.getRange(row, col[i] + 1).setValue(v === null ? '' : v);
    put(1, r.total); put(2, r.visa); put(3, r.cash); put(4, r.insta); put(5, r.guests); put(6, 'Actual');
    let log = ss.getSheetByName('Entry_Log');
    if(!log){ log = ss.insertSheet('Entry_Log'); log.appendRow(LOG_HEAD); }
    const cells = a => a.map(v => v === null ? '' : v);
    log.appendRow([new Date(), r.date].concat(old ? cells(old) : ['', '', '', '', '']).concat(cells([r.total, r.visa, r.cash, r.insta, r.guests])));
    return out({status:'saved', replaced: !!old});
  } catch(err) {
    return out({status:'error', message:'script error: ' + err});
  } finally {
    lock.releaseLock();
  }
}

function check(b){
  const date = String(b.date || '');
  const d = new Date(date + 'T12:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(d) || d.toISOString().slice(0, 10) !== date) return {error:'the date is not valid'};
  if(date > Utilities.formatDate(new Date(), 'Africa/Cairo', 'yyyy-MM-dd')) return {error:'future dates are not allowed'};
  if(date < '2024-01-01') return {error:'dates start from 1 Jan 2024'};
  const num = (v, name, required, max, whole) => {
    if(v === null || v === undefined || v === ''){ if(required) throw name + ' is required'; return null; }
    const x = Number(v);
    if(!isFinite(x) || x < 0 || x > max || (whole && !Number.isInteger(x))) throw name + ' is not valid';
    return x;
  };
  try {
    return {date:date, total:num(b.total,'total',true,MAX_MONEY), visa:num(b.visa,'visa',false,MAX_MONEY),
      cash:num(b.cash,'cash',false,MAX_MONEY), insta:num(b.insta,'instapay',false,MAX_MONEY), guests:num(b.guests,'guests',true,MAX_GUESTS,true)};
  } catch(m) { return {error:String(m)}; }
}
function authorized(k){
  const key = PropertiesService.getScriptProperties().getProperty('KEY');
  return !!key && typeof k === 'string' && k === key;
}
function ymd(v, tz){
  return Object.prototype.toString.call(v) === '[object Date]' ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : String(v).slice(0, 10);
}
function rows(sh, cols, tz){
  const v = sh.getDataRange().getValues(), h = v[0], idx = cols.map(c => h.indexOf(c));
  return v.slice(1).map(r => idx.map(i => Object.prototype.toString.call(r[i]) === '[object Date]' ? ymd(r[i], tz) : r[i]));
}
function out(o){
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
