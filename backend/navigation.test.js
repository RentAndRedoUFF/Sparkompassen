'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..','public');
const pages=['index.html','calculator.html','account.html'];
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('alla menylänkar öppnar befintliga projektsidor också i undermappar',()=>{
  for(const page of pages){
    const content=read(page);
    const nav=content.match(/<nav id="main-nav"[\s\S]*?<\/nav>/)?.[0];
    assert.ok(nav,`${page}: navigering saknas`);
    for(const href of nav.matchAll(/href="([^"]+)"/g)){
      assert.ok(!href[1].startsWith('/'),`${page}: absolut länk ${href[1]}`);
      const [filename,fragment]=href[1].split('#');
      assert.ok(fs.existsSync(path.join(root,filename)),`${page}: saknar länkad fil ${filename}`);
      if(fragment)assert.match(read(filename),new RegExp(`id="${fragment}"`));
    }
  }
});

test('varje sida har en tillgänglig mobilmeny',()=>{
  for(const page of pages){const html=read(page);assert.match(html,/id="menu-toggle"[^>]*aria-expanded="false"/);assert.match(html,/id="main-nav"/);assert.match(html,/src="app.js" defer/)}
});

test('kontosidan innehåller verkliga formulär och säker lösenordsbekräftelse',()=>{
  const html=read('account.html');
  for(const id of ['login-form','register-form','login-email','login-password','register-name','register-email','register-password','register-confirm','logout','dashboard','history'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/autocomplete="new-password"/);
  assert.match(read('app.js'),/Lösenorden matchar inte/);
});

test('kalkylatorn och Mina sidor länkar till varandra',()=>{
  assert.match(read('calculator.html'),/href="account\.html"/);
  assert.match(read('account.html'),/href="calculator\.html"/);
  assert.match(read('app.js'),/spark_pending_save/);
});
