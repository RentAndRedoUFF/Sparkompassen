'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
// Eget testregister – påverkar inte riktiga konton eller andra tester.
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sparkompassen-test-'));
process.env.SPARK_DATA_FILE=path.join(dir,'accounts.json');
const app=require('./app');
async function withServer(run){const server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));try{await run(`http://127.0.0.1:${server.address().port}`)}finally{await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()))}}
async function post(base,endpoint,body,cookie){return fetch(base+endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)})}
test('kalkylator-API räknar och avvisar fel',async()=>withServer(async base=>{
 const good=await post(base,'/api/calculate',{loanAmount:12000,interestRate:0,repaymentYears:1,paymentFrequency:'monthly'});
 assert.equal(good.status,200);assert.equal((await good.json()).result.payment,1000);
 const bad=await post(base,'/api/calculate',{loanAmount:-1,interestRate:0,repaymentYears:1,paymentFrequency:'monthly'});
 assert.equal(bad.status,400);
}));
test('konto kan skapas, logga in, spara historik och logga ut',async()=>withServer(async base=>{
 const email=`test-${Date.now()}@example.com`,password='test-losenord-123456';
 const create=await post(base,'/api/auth/register',{name:'Testperson',email,password});assert.equal(create.status,201);
 const cookie=create.headers.get('set-cookie').split(';')[0];assert(cookie.includes('spark_session='));
 const me=await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}});assert.equal((await me.json()).user.email,email);
 const save=await post(base,'/api/history',{loanAmount:10000,interestRate:0,repaymentYears:1,paymentFrequency:'yearly'},cookie);assert.equal(save.status,201);
 const history=await fetch(base+'/api/history',{headers:{Cookie:cookie}});assert.equal((await history.json()).history.length,1);
 const logout=await post(base,'/api/auth/logout',{},cookie);assert.equal(logout.status,200);
 const after=await fetch(base+'/api/history',{headers:{Cookie:cookie}});assert.equal(after.status,401);
 const login=await post(base,'/api/auth/login',{email,password});assert.equal(login.status,200);
 const loginCookie=login.headers.get('set-cookie').split(';')[0];
 const history2=await fetch(base+'/api/history',{headers:{Cookie:loginCookie}});assert.equal((await history2.json()).history.length,1);
}));
test('startsida, kalkylator och konto levereras var för sig',async()=>withServer(async base=>{
 for(const p of ['/','/calculator.html','/account.html']){const r=await fetch(base+p);assert.equal(r.status,200);assert.match(await r.text(),/Sparkompassen|sparkompassen/)}
}));

test('historik är privat för varje konto och kan hämtas efter ny inloggning',async()=>withServer(async base=>{
 const suffix=Math.random().toString(36).slice(2);
 const aEmail=`konto-a-${suffix}@example.com`,bEmail=`konto-b-${suffix}@example.com`;
 const password='test-losenord-123456';
 const a=await post(base,'/api/auth/register',{name:'Testkonto A',email:aEmail,password});
 assert.equal(a.status,201);const aCookie=a.headers.get('set-cookie').split(';')[0];
 assert.match(a.headers.get('set-cookie'),/HttpOnly/i);
 const saved=await post(base,'/api/history',{loanAmount:20000,interestRate:0,repaymentYears:5,paymentFrequency:'monthly'},aCookie);
 assert.equal(saved.status,201);
 const b=await post(base,'/api/auth/register',{name:'Testkonto B',email:bEmail,password});
 assert.equal(b.status,201);const bCookie=b.headers.get('set-cookie').split(';')[0];
 const bHistory=await fetch(base+'/api/history',{headers:{Cookie:bCookie}});
 assert.equal((await bHistory.json()).history.length,0);
 const aHistory=await fetch(base+'/api/history',{headers:{Cookie:aCookie}});
 assert.equal((await aHistory.json()).history.length,1);
 const wrong=await post(base,'/api/auth/login',{email:aEmail,password:'felaktigt-losenord'});
 assert.equal(wrong.status,401);
 const good=await post(base,'/api/auth/login',{email:aEmail,password});
 assert.equal(good.status,200);
}));

test('användare kan ta bort sin egen beräkning men inte någon annans',async()=>withServer(async base=>{
  const suffix=Math.random().toString(36).slice(2),password='test-losenord-123456';
  const a=await post(base,'/api/auth/register',{name:'Konto A',email:`aaa-${suffix}@example.com`,password});
  const ca=a.headers.get('set-cookie').split(';')[0];
  const saved=await post(base,'/api/history',{loanAmount:9900,interestRate:1,repaymentYears:3,paymentFrequency:'monthly'},ca);
  const {item}=await saved.json();
  const b=await post(base,'/api/auth/register',{name:'Konto B',email:`bbb-${suffix}@example.com`,password});
  const cb=b.headers.get('set-cookie').split(';')[0];
  const deny=await fetch(base+'/api/history/'+item.id,{method:'DELETE',headers:{'Content-Type':'application/json',Cookie:cb},body:'{}'});
  assert.equal(deny.status,404);
  const deleted=await fetch(base+'/api/history/'+item.id,{method:'DELETE',headers:{'Content-Type':'application/json',Cookie:ca},body:'{}'});
  assert.equal(deleted.status,200);assert.deepEqual(await deleted.json(),{deleted:true});
  const history=await fetch(base+'/api/history',{headers:{Cookie:ca}});
  assert.equal((await history.json()).history.length,0);
  const again=await fetch(base+'/api/history/'+item.id,{method:'DELETE',headers:{'Content-Type':'application/json',Cookie:ca},body:'{}'});
  assert.equal(again.status,404);
}));
