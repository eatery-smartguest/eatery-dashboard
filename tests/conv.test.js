// Run: node tests/conv.test.js   (checks how sheet rows become dashboard data)
const fs=require('fs'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/../index.html','utf8');
const toData=new Function(src.match(/\/\*CONV\*\/([\s\S]*?)\/\*\/CONV\*\//)[1]+';return toData')();
const d=toData({
 daily:[['2026-10-31',100,60,30,10,50,'Actual'],['2026-11-01',200,'','','',80,'Actual'],['2026-11-02','','','','','','Template']],
 monthly:[[2026,10,101,61,31,11,51,'Actual'],[2026,11,'','','','','','Template']]});
assert.deepStrictEqual(d.days.map(x=>x.join()),['2026,10,31,6,100,50','2026,11,1,7,200,80'],'weekday is Mon=1..Sun=7, Template days skipped');
const [oct,nov]=d.months;
assert.strictEqual(oct.total,101,'monthly sheet wins when it has a number'); assert.strictEqual(oct.insta,11); assert.strictEqual(oct.part,true,'1 of 31 days present = partial');
assert.strictEqual(nov.total,200,'month missing from Monthly_Data is rebuilt from daily'); assert.strictEqual(nov.part,true); assert.strictEqual(nov.insta,null,'blank is not provided, not zero');
// ISO timestamps of local midnight, from a zone west of UTC (08:00Z) and east of it (22:00Z the day before)
const iso=toData({daily:[['2024-01-01T08:00:00.000Z',5,'','','',1,'Actual'],['2023-12-31T22:00:00.000Z',7,'','','',1,'Actual']],monthly:[]});
assert.deepStrictEqual(iso.days.map(x=>x.slice(0,3).join('-')).sort(),['2024-1-1','2024-1-1'],'ISO timestamps map to the right calendar day');
console.log('CONV OK');
