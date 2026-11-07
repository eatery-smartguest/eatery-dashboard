// Run: node tests/entry.test.js   (pasted daily message and form checks)
const fs=require('fs'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/../index.html','utf8');
const {parseDailyMessage,validateEntry}=new Function(src.match(/\/\*ENTRY\*\/([\s\S]*?)\/\*\/ENTRY\*\//)[1]+';return {parseDailyMessage,validateEntry}')();
let r=parseDailyMessage('October.       31/10/2026\n\nTotal.  368,581.73\nVisa.  350,450.35\nCash.  9,029.38\ninsta.  9,102.00\nGuest.  424');
assert.deepStrictEqual(r.values,{date:'2026-10-31',total:'368581.73',visa:'350450.35',cash:'9029.38',insta:'9102.00',guests:'424'});
r=parseDailyMessage('Guests: 300\nفيزا ١٢٠٠\nكاش: 800\n٠١/١١/٢٠٢٦\nالاجمالي 2,000');
assert.deepStrictEqual(r.values,{date:'2026-11-01',total:'2000',visa:'1200',cash:'800',insta:'',guests:'300'},'Arabic labels and digits');
assert.deepStrictEqual(parseDailyMessage('Total 1000\nTips 50').unknown,['Tips 50']);
const T='2026-11-07', ok={date:'2026-11-06',total:'1,000',guests:'10',visa:'600',cash:'400',insta:''};
let v=validateEntry(ok,T); assert.deepStrictEqual(v.errors,{}); assert.strictEqual(v.rec.total,1000); assert.strictEqual(v.rec.insta,null,'empty = not provided'); assert.strictEqual(v.warn,'');
assert.ok(validateEntry({...ok,cash:'300'},T).warn,'payments not matching total warns');
assert.ok(validateEntry({...ok,date:'2026-11-08'},T).errors.date,'future');
assert.ok(validateEntry({...ok,guests:'10.5'},T).errors.guests,'whole guests');
assert.ok(validateEntry({...ok,total:''},T).errors.total,'total required');
assert.ok(validateEntry({...ok,total:'-5'},T).errors.total,'negative');
assert.ok(validateEntry({...ok,visa:'abc'},T).errors.visa,'not a number');
assert.ok(validateEntry({...ok,total:'6000000'},T).errors.total,'typo guard');
console.log('ENTRY OK');
