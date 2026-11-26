'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const dataFile=process.env.SPARK_DATA_FILE || path.join(__dirname,'data','accounts.json');
function load(){try{return JSON.parse(fs.readFileSync(dataFile,'utf8'))}catch(e){if(e.code==='ENOENT')return {users:[]};throw e}}
function save(db){fs.mkdirSync(path.dirname(dataFile),{recursive:true});const tmp=`${dataFile}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;fs.writeFileSync(tmp,JSON.stringify(db,null,2),{mode:0o600});fs.renameSync(tmp,dataFile)}
function hashPassword(password,salt=crypto.randomBytes(16).toString('hex')){const digest=crypto.scryptSync(password,salt,64).toString('hex');return `${salt}:${digest}`}
function passwordMatches(password,stored){if(typeof stored!=='string'||!stored.includes(':'))return false;const [salt,hash]=stored.split(':');const a=crypto.scryptSync(password,salt,64),b=Buffer.from(hash,'hex');return a.length===b.length&&crypto.timingSafeEqual(a,b)}
module.exports={load,save,hashPassword,passwordMatches};
