'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,'../frontend',n),'utf8');
test('inget störande utvecklingsmeddelande eller generisk etikett visas',()=>{
  for(const name of ['index.html','calculator.html','account.html']){
    assert.doesNotMatch(read(name),/id="runtime-notice"/);
  }
  assert.doesNotMatch(read('app.js'),/Du öppnade HTML-filen direkt/);
  assert.doesNotMatch(read('index.html'),/EKONOMISK FÖRSTÅELSE FÖR STUDENTER/);
});
test('startsida och kalkylator har fungerande ankare, förklaringar och avancerade paneler',()=>{
  const home=read('index.html'),calc=read('calculator.html');
  assert.match(home,/href="calculator.html\?example=250000"/);
  assert.match(home,/id="fragor"/);
  assert.match(calc,/id="insights-panel"/);
  assert.match(calc,/id="debt-chart"/);
  assert.match(calc,/id="download-csv"/);
  assert.match(calc,/src="insights.js"/);
});
test('kontohistorik kan hanteras från Mina sidor',()=>{
  assert.match(read('app.js'),/\/api\/history\//);
  assert.match(read('account.html'),/id="history-message"/);
});
