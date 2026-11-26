'use strict';
// Pedagogisk jämförelsemodell. Fast ränta/lika stora betalningar; inte CSN:s återbetalningsregler.
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  if(root)root.SparkompassenInsights=api;
})(typeof window!=='undefined'?window:globalThis,()=>{
  const rates={monthly:12,quarterly:4,yearly:1};
  const roundMoney=v=>Math.round((v+Number.EPSILON)*100)/100;
  function assertInput(data){
    const amount=Number(data.loanAmount),rate=Number(data.interestRate),years=Number(data.repaymentYears);
    if(!Number.isFinite(amount)||amount<=0||amount>1e7||!Number.isFinite(rate)||rate<0||rate>100||!Number.isInteger(years)||years<1||years>25||!Object.hasOwn(rates,data.paymentFrequency))throw new RangeError('Ogiltiga beräkningsvärden.');
    return {amount,rate,years,perYear:rates[data.paymentFrequency]};
  }
  function paymentFor(amount,annualRate,years,perYear){
    const rate=annualRate/100/perYear,n=years*perYear;
    return rate===0?amount/n:amount*rate/(-Math.expm1(-n*Math.log1p(rate)));
  }
  function buildSchedule(data){
    const {amount,rate,years,perYear}=assertInput(data);
    const count=years*perYear,periodRate=rate/100/perYear;
    const regular=paymentFor(amount,rate,years,perYear);
    let remaining=amount;
    const yearly=[];
    const points=[{year:0,balance:amount}];
    for(let year=1;year<=years;year++){
      let yearPaid=0,yearInterest=0;
      for(let part=0;part<perYear;part++){
        const index=(year-1)*perYear+part;
        const interest=remaining*periodRate;
        const payment=index===count-1?remaining+interest:Math.min(regular,remaining+interest);
        remaining=Math.max(0,remaining+interest-payment);
        yearPaid+=payment;yearInterest+=interest;
      }
      if(year===years)remaining=0;
      yearly.push({year,paid:roundMoney(yearPaid),interest:roundMoney(yearInterest),balance:roundMoney(remaining)});
      points.push({year,balance:roundMoney(remaining)});
    }
    return {years,perYear,regular:roundMoney(regular),points,yearly};
  }
  function compareTerms(data,yearsList=[10,15,20,25]){
    const {amount,rate,perYear}=assertInput(data);
    const years=[...new Set([...yearsList,Number(data.repaymentYears)])].filter(v=>Number.isInteger(v)&&v>=1&&v<=25).sort((a,b)=>a-b);
    return years.map(year=>{
      const payment=paymentFor(amount,rate,year,perYear);
      return {years:year,payment:roundMoney(payment),interest:roundMoney(payment*year*perYear-amount),selected:year===Number(data.repaymentYears)};
    });
  }
  function csvYearly(schedule){
    const lines=['År;Inbetalt under året (kr);Ränta under året (kr);Skuld kvar (kr)'];
    const cell=v=>Number(v).toFixed(2).replace('.',',');
    for(const row of schedule.yearly)lines.push([row.year,cell(row.paid),cell(row.interest),cell(row.balance)].join(';'));
    return '\ufeff'+lines.join('\r\n')+'\r\n';
  }
  return {buildSchedule,compareTerms,csvYearly,paymentFor};
});
