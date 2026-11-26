'use strict';
const path=require('node:path');
const crypto=require('node:crypto');
const express=require('express');
const helmet=require('helmet');
const {calculateLoan}=require('./calculator');
const storage=require('./storage');
const app=express();
const frontendPath=path.join(__dirname,'..','frontend');
const sessions=new Map();
const attempts=new Map();
const SESSION_MS=24*60*60*1000;
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({limit:'10kb'}));
app.use((req,res,next)=>{ // Ta endast emot JSON från vår webbapp; försvårar CSRF via vanliga webbformulär.
  if (req.path.startsWith('/api/') && ['POST','PUT','PATCH','DELETE'].includes(req.method)) {
    const origin=req.get('origin');
    if(origin){try{if(new URL(origin).host!==req.get('host'))return res.status(403).json({error:'Förfrågan från annan webbplats avvisades.'})}catch{return res.status(403).json({error:'Ogiltigt ursprung.'})}}
    if(!req.is('application/json'))return res.status(415).json({error:'Skicka JSON-data.'});
  }
  next();
});
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(s=>s.trim().split('=').map(decodeURIComponent)).filter(x=>x.length===2))}
function currentUser(req){const sid=cookies(req).spark_session;if(!sid)return null;const s=sessions.get(sid);if(!s)return null;if(Date.now()>s.exp){sessions.delete(sid);return null}return s.userId}
function requireUser(req,res,next){const id=currentUser(req);if(!id)return res.status(401).json({error:'Logga in för att se dina sparade beräkningar.'});req.userId=id;next()}
function setSession(req,res,id){const sid=crypto.randomBytes(32).toString('hex');sessions.set(sid,{userId:id,exp:Date.now()+SESSION_MS});res.cookie('spark_session',sid,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',maxAge:SESSION_MS,path:'/'});}
function publicUser(user){return {id:user.id,name:user.name,email:user.email}}
function cleanLogin(data){const name=String(data?.name||'').trim().slice(0,70),email=String(data?.email||'').trim().toLowerCase(),password=data?.password;return {name,email,password}}
app.get('/api/health',(_req,res)=>res.status(200).json({status:'ok',application:'Sparkompassen'}));
app.post('/api/calculate',(req,res)=>{const answer=calculateLoan(req.body);res.status(answer.valid?200:400).json(answer)});
app.post('/api/auth/register',(req,res)=>{
  const {name,email,password}=cleanLogin(req.body);
  if(name.length<2||name.length>70)return res.status(400).json({error:'Ange ett namn med minst två tecken.'});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return res.status(400).json({error:'Ange en giltig e-postadress.'});
  if(typeof password!=='string'||password.length<12||password.length>128)return res.status(400).json({error:'Lösenordet måste vara 12–128 tecken.'});
  const db=storage.load();if(db.users.some(u=>u.email===email))return res.status(409).json({error:'E-postadressen används redan.'});
  const user={id:crypto.randomUUID(),name,email,password:storage.hashPassword(password),history:[],createdAt:new Date().toISOString()};db.users.push(user);storage.save(db);setSession(req,res,user.id);res.status(201).json({user:publicUser(user)});
});
app.post('/api/auth/login',(req,res)=>{
  const {email,password}=cleanLogin(req.body);const key=`${req.ip}:${email}`;const entry=attempts.get(key);
  if(entry&&entry.count>=8&&entry.until>Date.now())return res.status(429).json({error:'För många försök. Försök igen senare.'});
  const db=storage.load();const user=db.users.find(u=>u.email===email);
  if(!user||typeof password!=='string'||!storage.passwordMatches(password,user.password)){
    const count=entry&&entry.until>Date.now()?entry.count+1:1;attempts.set(key,{count,until:Date.now()+15*60*1000});return res.status(401).json({error:'Fel e-postadress eller lösenord.'});
  }
  attempts.delete(key);setSession(req,res,user.id);res.json({user:publicUser(user)});
});
app.get('/api/auth/me',(req,res)=>{const id=currentUser(req);if(!id)return res.json({user:null});const user=storage.load().users.find(u=>u.id===id);res.json({user:user?publicUser(user):null})});
app.post('/api/auth/logout',(req,res)=>{const sid=cookies(req).spark_session;if(sid)sessions.delete(sid);res.clearCookie('spark_session',{path:'/',sameSite:'strict',secure:process.env.NODE_ENV==='production'});res.json({ok:true})});
app.get('/api/history',requireUser,(req,res)=>{const user=storage.load().users.find(u=>u.id===req.userId);res.json({history:user?.history||[]})});
app.post('/api/history',requireUser,(req,res)=>{
 const answer=calculateLoan(req.body);if(!answer.valid)return res.status(400).json(answer);
 const db=storage.load(),user=db.users.find(u=>u.id===req.userId);if(!user)return res.status(401).json({error:'Sessionen finns inte längre.'});
 const item={id:crypto.randomUUID(),at:new Date().toISOString(),...answer.data,result:answer.result};user.history.unshift(item);user.history=user.history.slice(0,20);storage.save(db);res.status(201).json({saved:true,item});
});
app.delete('/api/history/:id',requireUser,(req,res)=>{
  const id=String(req.params.id||'');
  if(!/^[0-9a-f-]{36}$/i.test(id))return res.status(400).json({error:'Ogiltigt id för sparad beräkning.'});
  const db=storage.load(),user=db.users.find(u=>u.id===req.userId);
  if(!user)return res.status(401).json({error:'Sessionen finns inte längre.'});
  const index=user.history.findIndex(h=>h.id===id);
  if(index<0)return res.status(404).json({error:'Beräkningen hittades inte på ditt konto.'});
  user.history.splice(index,1);storage.save(db);
  res.json({deleted:true});
});
app.use('/api',(_req,res)=>res.status(404).json({error:'API-adressen finns inte.'}));
app.use(express.static(frontendPath,{extensions:['html']}));
app.use((_req,res)=>res.status(404).send('Sidan finns inte.'));
app.use((err,_req,res,_next)=>{if(err instanceof SyntaxError&&'body'in err)return res.status(400).json({error:'JSON-formatet är ogiltigt.'});console.error('Serverfel:',err);res.status(500).json({error:'Ett oväntat fel uppstod.'})});
module.exports=app;
