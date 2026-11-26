'use strict';
const $=id=>document.getElementById(id);
const fmtMoney=new Intl.NumberFormat('sv-SE',{style:'currency',currency:'SEK',maximumFractionDigits:2});
const fmtNumber=new Intl.NumberFormat('sv-SE',{maximumFractionDigits:0});
let lastCalculation=null;
function initializeNavigation(){
  const button=$('menu-toggle'),menu=$('main-nav');
  if(button&&menu){
    button.addEventListener('click',()=>{const open=!menu.classList.contains('is-open');menu.classList.toggle('is-open',open);button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Stäng menyn':'Öppna menyn');});
    menu.addEventListener('click',event=>{if(event.target.closest('a')){menu.classList.remove('is-open');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Öppna menyn');}});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.classList.remove('is-open');button.setAttribute('aria-expanded','false');}});
  }
  // Låt webbplatsen visa normalt innehåll även i en förhandsvisning.
  // API-beroende funktioner ger en kort återkoppling om servern inte är tillgänglig.
  const active=menu?.querySelector('.nav-active');if(active)active.setAttribute('aria-current','page');
  document.addEventListener('click',event=>{
    if(menu?.classList.contains('is-open') && !menu.contains(event.target) && !button.contains(event.target)){
      menu.classList.remove('is-open');button.setAttribute('aria-expanded','false');
    }
  });
}

async function api(url,options={}){
  let response;
  try{response=await fetch(url,{credentials:'same-origin',...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}})}catch{throw new Error('Kan inte nå servern. Kontrollera din anslutning.')}
  let result;try{result=await response.json()}catch{throw new Error('Servern skickade ett oväntat svar.')}
  if(!response.ok){const error=new Error(result.error||'Något gick fel.');error.status=response.status;throw error;}
  return result;
}
async function updateNavigation(){try{const {user}=await api('/api/auth/me');const el=$('account-link');if(el)el.textContent=user?'Mina sidor':'Logga in';return user}catch{return null}}
function renderInsights(data){
  const insights=window.SparkompassenInsights;
  if(!insights)return;
  const input=data.data, result=data.result;
  const schedule=insights.buildSchedule(input), comparisons=insights.compareTerms(input);
  const money=v=>fmtMoney.format(v);
  const table=$('schedule-body'),compare=$('comparison-body');
  table.replaceChildren();compare.replaceChildren();
  for(const row of comparisons){
    const tr=document.createElement('tr');if(row.selected)tr.className='comparison-selected';
    for(const value of [row.years+' år',money(row.payment),money(row.interest)]){const td=document.createElement('td');td.textContent=value;tr.append(td)}
    compare.append(tr);
  }
  const years=schedule.yearly;
  const visible=years.length<=8?years:[...years.slice(0,4),null,...years.slice(-3)];
  for(const row of visible){
    const tr=document.createElement('tr');
    if(!row){const td=document.createElement('td');td.colSpan=4;td.className='schedule-ellipsis';td.textContent='⋯ Fler år finns i CSV-filen';tr.append(td)}
    else for(const val of [String(row.year),money(row.paid),money(row.interest),money(row.balance)]){const td=document.createElement('td');td.textContent=val;tr.append(td)}
    table.append(tr);
  }
  $('chart-end-label').textContent='År '+schedule.years;
  const svg=$('debt-chart');
  svg.replaceChildren();const ns='http://www.w3.org/2000/svg';
  const add=(tag,attrs,txt)=>{const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));if(txt!==undefined)node.textContent=txt;svg.append(node);return node;};
  const max=Math.max(1,Number(input.loanAmount)),pad=24,w=575,h=184,baseline=216;
  for(let i=0;i<=4;i++){
    const y=baseline-i*h/4;add('line',{x1:pad,y1:y,x2:pad+w,y2:y,stroke:'#dbe6e1','stroke-width':1,'stroke-dasharray':i?'4 5':'0'});
    add('text',{x:pad+3,y:y-6,fill:'#698077','font-size':11},new Intl.NumberFormat('sv-SE',{maximumFractionDigits:0}).format(max*i/4)+' kr');
  }
  const pts=schedule.points.map(pt=>[pad+w*(pt.year/schedule.years),baseline-h*pt.balance/max]);
  const line=pts.map(([x,y],i)=>(i?'L':'M')+x.toFixed(2)+','+y.toFixed(2)).join(' ');
  add('path',{d:line+` L${pad+w},${baseline} L${pad},${baseline} Z`,fill:'#d9f4e6'});
  add('path',{d:line,stroke:'#168b72','stroke-width':3.5,fill:'none','stroke-linecap':'round','stroke-linejoin':'round'});
  add('circle',{cx:pts[0][0],cy:pts[0][1],r:5.5,fill:'#168b72',stroke:'white','stroke-width':2});
  add('circle',{cx:pts.at(-1)[0],cy:pts.at(-1)[1],r:5.5,fill:'#168b72',stroke:'white','stroke-width':2});
  const total=Math.max(.01,result.total),principal=Number(input.loanAmount),interest=Math.max(0,result.interest);
  $('payment-breakdown').setAttribute('aria-label','Studieskuld '+money(principal)+' och ränta '+money(interest));
  const part=Math.min(100,Math.max(0,principal/total*100));
  $('payment-breakdown').querySelector('.breakdown-principal').style.width=part+'%';
  $('payment-breakdown').querySelector('.breakdown-interest').style.width=(100-part)+'%';
  $('breakdown-principal-value').textContent=money(principal);
  $('breakdown-interest-value').textContent=money(interest);
  $('insights-panel').hidden=false;
  $('insights-status').textContent='';
  $('download-csv').onclick=()=>{
    const content=insights.csvYearly(schedule),blob=new Blob([content],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mittcsn-arsoversikt.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
    $('insights-status').textContent='Årsöversikten har exporterats till CSV.';
  };
  $('copy-summary').onclick=async()=>{
    const description=`MittCSN – pedagogiskt exempel\nStudieskuld: ${money(principal)}\nRänta: ${Number(input.interestRate)} %\nTid: ${input.repaymentYears} år\nBetalning: ${money(result.payment)} per ${ {monthly:'månad',quarterly:'kvartal',yearly:'år'}[input.paymentFrequency]}\nTotal ränta: ${money(result.interest)}\nEj officiell CSN-beräkning.`;
    try{await navigator.clipboard.writeText(description);$('insights-status').textContent='Sammanfattningen har kopierats.'}
    catch{$('insights-status').textContent='Kunde inte kopiera automatiskt. Du kan läsa uppgifterna i resultatkortet.'}
  };
}
function initializeCalculator(){
  const form=$('csn-form');if(!form)return;
  const fields=['loanAmount','interestRate','repaymentYears','paymentFrequency'];
  function applyPreset(amount){
    form.elements.loanAmount.value=String(amount);
    if(!form.elements.repaymentYears.value)form.elements.repaymentYears.value='20';
    form.dispatchEvent(new Event('input',{bubbles:true}));
    form.elements.loanAmount.focus();
  }
  for(const button of document.querySelectorAll('[data-loan-preset]'))button.addEventListener('click',()=>applyPreset(Number(button.dataset.loanPreset)));
  const example=new URLSearchParams(location.search).get('example');
  if(['100000','250000','400000'].includes(example)){
    form.elements.loanAmount.value=example;
    form.elements.repaymentYears.value='20';
  }
  try{
    const reuse=sessionStorage.getItem('spark_reuse');
    if(reuse){const input=JSON.parse(reuse);sessionStorage.removeItem('spark_reuse');for(const field of fields){if(input[field]!==undefined)form.elements[field].value=String(input[field]);}}
  }catch{}
  function values(){return Object.fromEntries(fields.map(k=>[k,form.elements[k].value]))}
  function errors(map={}){for(const k of fields){const el=form.elements[k],err=$(`${k}-error`);if(err)err.textContent=map[k]||'';el.setAttribute('aria-invalid',map[k]?'true':'false')}}
  function clear(){if($('insights-panel'))$('insights-panel').hidden=true;lastCalculation=null;$('calculation').hidden=true;$('result-placeholder').hidden=false;$('result-label').textContent='VÄNTAR PÅ INDATA';$('result-label').classList.remove('ready');$('form-status').hidden=true;$('save-status').textContent=''}
  form.addEventListener('input',()=>{clear();errors()});form.addEventListener('change',()=>{clear();errors()});form.addEventListener('reset',()=>{setTimeout(()=>{clear();errors()},0)});
  form.addEventListener('submit',async event=>{
    event.preventDefault();const input=values();const check=window.SparkompassenValidation.validateLoan(input);errors(check.errors);const alert=$('form-status');clear();
    if(!check.valid){alert.textContent='Kontrollera de markerade fälten.';alert.hidden=false;form.elements[fields.find(k=>check.errors[k])].focus();return}
    const button=form.querySelector('button[type=submit]');button.disabled=true;
    try{
      const data=await api('/api/calculate',{method:'POST',body:JSON.stringify(check.data)});
      lastCalculation=data.data;
      $('payment-value').textContent=fmtMoney.format(data.result.payment);
      $('payment-frequency').textContent=({monthly:'Per månad',quarterly:'Per kvartal',yearly:'Per år'})[data.data.paymentFrequency];
      $('principal-value').textContent=fmtMoney.format(data.data.loanAmount);
      $('interest-value').textContent=fmtMoney.format(data.result.interest);
      $('total-value').textContent=fmtMoney.format(data.result.total);
      $('periods-value').textContent=fmtNumber.format(data.result.periods);
      $('result-label').textContent='BERÄKNING KLAR';$('result-label').classList.add('ready');
      $('result-placeholder').hidden=true;$('calculation').hidden=false;renderInsights(data);
      if(window.innerWidth<950)$('result-panel').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    }catch(err){alert.textContent=err.message;alert.hidden=false}
    finally{button.disabled=false}
  });
  $('save-calculation').addEventListener('click',async()=>{
    if(!lastCalculation)return;const status=$('save-status');status.textContent='Sparar…';
    try{await api('/api/history',{method:'POST',body:JSON.stringify(lastCalculation)});status.textContent='Sparad! Du hittar beräkningen under Mina sidor.'}
    catch(err){
      if(err.status===401){try{sessionStorage.setItem('spark_pending_save',JSON.stringify(lastCalculation));}catch{}
        status.textContent='Logga in för att spara din beräkning. Du skickas vidare till Mina sidor.';
        window.location.href='account.html?save=1';return;
      }
      status.textContent=err.message;
    }
  });
}
function initializeAccount(){
  const login=$('login-form');if(!login)return;
  const register=$('register-form'),auth=$('auth-area'),dashboard=$('dashboard'),message=$('auth-message');
  let activeUser=null;
  function showMessage(text,success=false){message.textContent=text||'';message.classList.toggle('success',success);}
  function setTab(which){
    const isLogin=which==='login';login.hidden=!isLogin;register.hidden=isLogin;
    $('tab-login').classList.toggle('active',isLogin);$('tab-register').classList.toggle('active',!isLogin);
    $('tab-login').setAttribute('aria-selected',String(isLogin));$('tab-register').setAttribute('aria-selected',String(!isLogin));showMessage('');
  }
  $('tab-login').addEventListener('click',()=>{setTab('login');$('login-email').focus()});
  $('tab-register').addEventListener('click',()=>{setTab('register');$('register-name').focus()});
  for(const toggle of document.querySelectorAll('[data-toggle-password]')){
    toggle.addEventListener('click',()=>{
      const target=$(toggle.dataset.togglePassword),show=target.type==='password';target.type=show?'text':'password';
      toggle.textContent=show?'Dölj':'Visa';toggle.setAttribute('aria-label',show?'Dölj lösenord':'Visa lösenord');
    });
  }
  async function listHistory(){
    const target=$('history');target.textContent='Laddar sparade beräkningar…';
    try{
      const {history}=await api('/api/history');target.replaceChildren();
      $('history-count').textContent=String(history.length);
      $('last-activity').textContent=history.length?new Date(history[0].at).toLocaleDateString('sv-SE'):'Inga sparade ännu';
      if(!history.length){const x=document.createElement('div');x.className='empty-history';x.textContent='Inga sparade beräkningar ännu. Prova kalkylatorn och välj ”Spara i Mina sidor”.';target.append(x);return;}
      for(const item of history){
        const row=document.createElement('article');row.className='history-item';const left=document.createElement('div'),right=document.createElement('div');right.className='history-meta';
        const title=document.createElement('strong');title.textContent=fmtMoney.format(item.loanAmount);
        const date=document.createElement('span');date.textContent=new Date(item.at).toLocaleString('sv-SE');left.append(title,date);
        const payment=document.createElement('strong');payment.textContent=fmtMoney.format(item.result.payment);
        const interval=document.createElement('span');interval.textContent=({monthly:'Per månad',quarterly:'Per kvartal',yearly:'Per år'})[item.paymentFrequency]+' · förenklad modell';right.append(payment,interval);
        const actions=document.createElement('div');actions.className='history-actions';
        const reuse=document.createElement('button');reuse.type='button';reuse.className='history-action';reuse.textContent='Använd igen ↗';
        reuse.addEventListener('click',()=>{
          try{sessionStorage.setItem('spark_reuse',JSON.stringify({loanAmount:item.loanAmount,interestRate:item.interestRate,repaymentYears:item.repaymentYears,paymentFrequency:item.paymentFrequency}));
            location.href='calculator.html';}
          catch{$('history-message').textContent='Det gick inte att öppna exemplet.';}
        });
        const del=document.createElement('button');del.type='button';del.className='history-action danger';del.textContent='Ta bort';del.setAttribute('aria-label','Ta bort sparad beräkning från '+date.textContent);
        del.addEventListener('click',async()=>{
          if(!confirm('Vill du ta bort den här sparade beräkningen?'))return;
          del.disabled=true;
          try{await api('/api/history/'+encodeURIComponent(item.id),{method:'DELETE',body:'{}'});await listHistory();$('history-message').textContent='Beräkningen har tagits bort.';}
          catch(err){del.disabled=false;$('history-message').textContent=err.message;}
        });
        actions.append(reuse,del);row.append(left,right,actions);target.append(row);
      }
    }catch(err){target.textContent=err.message;}
  }
  async function savePending(){
    let raw;try{raw=sessionStorage.getItem('spark_pending_save');}catch{return;}
    if(!raw)return;
    try{
      const data=JSON.parse(raw);await api('/api/history',{method:'POST',body:JSON.stringify(data)});
      sessionStorage.removeItem('spark_pending_save');
      const banner=$('auth-banner');if(banner){banner.hidden=false;banner.textContent='✓ Din tidigare beräkning har sparats på kontot.';}
    }catch(err){const banner=$('auth-banner');if(banner){banner.hidden=false;banner.textContent='Kunde inte spara den tidigare beräkningen: '+err.message;}}
  }
  async function showDashboard(user){
    activeUser=user;auth.hidden=true;dashboard.hidden=false;$('user-name').textContent=user.name;$('user-email').textContent=user.email;
    await savePending();await listHistory();await updateNavigation();
  }
  function working(form,yes){const button=form.querySelector('[type=submit]');button.disabled=yes;button.textContent=yes?'Arbetar…':(form===login?'Logga in ↗':'Skapa konto ↗');}
  login.addEventListener('submit',async event=>{
    event.preventDefault();showMessage('');working(login,true);
    try{
      const {user}=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:$('login-email').value.trim(),password:$('login-password').value})});
      login.reset();await showDashboard(user);
    }catch(err){showMessage(err.message);}
    finally{working(login,false);}
  });
  register.addEventListener('submit',async event=>{
    event.preventDefault();showMessage('');
    if($('register-password').value!==$('register-confirm').value){showMessage('Lösenorden matchar inte. Försök igen.');$('register-confirm').focus();return;}
    working(register,true);
    try{
      const {user}=await api('/api/auth/register',{method:'POST',body:JSON.stringify({name:$('register-name').value.trim(),email:$('register-email').value.trim(),password:$('register-password').value})});
      register.reset();await showDashboard(user);
    }catch(err){showMessage(err.message);}
    finally{working(register,false);}
  });
  $('logout').addEventListener('click',async()=>{
    const button=$('logout');button.disabled=true;
    try{
      await api('/api/auth/logout',{method:'POST',body:'{}'});
      activeUser=null;dashboard.hidden=true;auth.hidden=false;setTab('login');showMessage('Du har loggat ut.',true);
      await updateNavigation();
    }catch(err){showMessage(err.message);}
    finally{button.disabled=false;}
  });
  if(location.search.includes('save=1') && $('auth-banner'))$('auth-banner').hidden=false;
  updateNavigation().then(user=>{if(user)showDashboard(user)});
}
function initializeChat(){
  const root=$('chat-root');if(!root)return;
  root.innerHTML='<button id="chat-launch" class="chat-launch" aria-controls="chat-panel" aria-expanded="false" type="button">✧ Fråga guiden</button><section class="chat-panel" id="chat-panel" aria-label="Hjälpguide" hidden><div class="chat-head"><div><strong>✧ MittCSN:s guide</strong><small>Enkel frågor-och-svar-guide · AI kommer senare</small></div><button type="button" class="chat-close" id="chat-close" aria-label="Stäng guiden">×</button></div><div class="chat-messages" id="chat-messages" aria-live="polite"><div class="chat-bubble">Hej! Jag kan svara på vanliga frågor om studieskuld, ränta, kalkylatorn och hur du sparar exempel. Jag är ännu inte en AI-chatt.</div></div><form class="chat-input" id="chat-form"><input id="chat-question" aria-label="Din fråga" maxlength="300" placeholder="Fråga om CSN eller kalkylatorn…" required><button type="submit">Skicka</button></form><p class="chat-hint">Skriv inga personnummer eller andra känsliga uppgifter.</p></section>';
  const quick=document.createElement('div');quick.className='chat-suggestions';
  for(const text of ['Hur räknar ni?','Behöver jag konto?','Vad är CSN-räntan?']){
    const b=document.createElement('button');b.type='button';b.textContent=text;
    b.addEventListener('click',()=>{const input=$('chat-question');input.value=text;$('chat-form').requestSubmit()});quick.append(b);
  }
  $('chat-messages').after(quick);
  const panel=$('chat-panel'),launch=$('chat-launch');function toggle(show){panel.hidden=!show;launch.setAttribute('aria-expanded',String(show));if(show)$('chat-question').focus()}
  launch.addEventListener('click',()=>toggle(panel.hidden));$('chat-close').addEventListener('click',()=>toggle(false));
  $('chat-form').addEventListener('submit',event=>{event.preventDefault();const input=$('chat-question'),question=input.value.trim();if(!question)return;const messages=$('chat-messages');function bubble(t,mine=false){const d=document.createElement('div');d.className='chat-bubble'+(mine?' mine':'');d.textContent=t;messages.append(d)}bubble(question,true);
    const q=question.toLocaleLowerCase('sv-SE');let answer;
    if(/ränta|ranta/.test(q))answer='CSN:s ränta för 2026 är 2,135 %. Den kan ändras från år till år. Källa: csn.se.';
    else if(/spara|konto|logga|inlogg/.test(q))answer='Öppna Mina sidor och skapa ett konto eller logga in. Efter en beräkning kan du välja ”Spara i Mina sidor”.';
    else if(/beräk|berak|kalkyl|betal|annuitet/.test(q))answer='Kalkylatorn använder en förenklad annuitetsmodell med fast ränta och lika stora betalningar. Det är inte CSN:s officiella årsbelopp.';
    else if(/csn|studie|skuld/.test(q))answer='CSN erbjuder studiestöd. Återbetalningen styrs av särskilda regler och kan skilja sig från en vanlig banklånekalkyl. Läs mer på csn.se.';
    else answer='Jag kan än så länge hjälpa dig med CSN, ränta, kalkylatorn och hur sparade beräkningar fungerar. Den framtida AI-funktionen är inte ansluten.';
    bubble(answer);input.value='';messages.scrollTop=messages.scrollHeight;
  });
}
initializeNavigation();updateNavigation();initializeCalculator();initializeAccount();initializeChat();
