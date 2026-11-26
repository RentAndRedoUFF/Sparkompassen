'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {buildSchedule,compareTerms,csvYearly,paymentFor}=require('../public/insights');
test('nollränta betalas av jämnt utan restskuld',()=>{
  const data={loanAmount:12000,interestRate:0,repaymentYears:1,paymentFrequency:'monthly'};
  const s=buildSchedule(data);
  assert.equal(s.regular,1000);assert.equal(s.yearly.length,1);assert.equal(s.yearly[0].paid,12000);assert.equal(s.yearly[0].interest,0);assert.equal(s.yearly[0].balance,0);
});
test('årsfördelning följer löptid och avslutas på noll',()=>{
  const data={loanAmount:250000,interestRate:2.135,repaymentYears:20,paymentFrequency:'monthly'};
  const s=buildSchedule(data);assert.equal(s.yearly.length,20);assert.equal(s.points[0].balance,250000);
  assert.equal(s.points.at(-1).balance,0);assert(s.yearly[0].interest>0);
  assert(s.points[10].balance<s.points[1].balance);
});
test('längre återbetalningstid ger lägre betalning men större total räntekostnad',()=>{
  const data={loanAmount:250000,interestRate:2.135,repaymentYears:20,paymentFrequency:'monthly'};
  const rows=compareTerms(data);const shorter=rows.find(x=>x.years===10),longer=rows.find(x=>x.years===25);
  assert(shorter.payment>longer.payment);assert(shorter.interest<longer.interest);
  assert(rows.find(x=>x.years===20).selected);
});
test('alla intervall hanteras och avvisar ogiltiga värden',()=>{
  for(const freq of ['monthly','quarterly','yearly']){
    const s=buildSchedule({loanAmount:100000,interestRate:2,repaymentYears:25,paymentFrequency:freq});
    assert.equal(s.yearly.length,25);assert.equal(s.yearly.at(-1).balance,0);
  }
  assert.throws(()=>buildSchedule({loanAmount:-1,interestRate:0,repaymentYears:1,paymentFrequency:'monthly'}));
  assert.throws(()=>buildSchedule({loanAmount:12000,interestRate:0,repaymentYears:26,paymentFrequency:'monthly'}));
});
test('CSV innehåller svensk decimalavgränsning och är säkert numeriskt',()=>{
  const s=buildSchedule({loanAmount:10000,interestRate:2,repaymentYears:2,paymentFrequency:'yearly'});const csv=csvYearly(s);
  assert(csv.startsWith('\ufeffÅr;'));assert.equal(csv.trim().split('\r\n').length,3);
  assert.match(csv,/2;/);
});

test('räntejämförelsen håller övriga antaganden fasta och undviker dubblerade räntor', () => {
  const { compareRates } = require('../public/insights');
  const data = { loanAmount: 100000, interestRate: 0, repaymentYears: 20, paymentFrequency: 'monthly', extraPayment: 100 };
  const rows = compareRates(data);
  assert.deepEqual(rows.map(row => row.rate), [0, 1]);
  assert.equal(rows[0].selected, true);
  assert.ok(rows[1].interest > rows[0].interest);
});

test('årsöversikten och CSV tar med avgiften och räntejämförelsen kan byta steg', () => {
  const { compareRates } = require('../public/insights');
  const input = { loanAmount: 12000, interestRate: 0, repaymentYears: 2, paymentFrequency: 'monthly', annualFee: 150 };
  const plan = buildSchedule(input);
  assert.deepEqual(plan.yearly.map(row => [row.paid, row.fee]), [[6150, 150], [6150, 150]]);
  assert.match(csvYearly(plan), /1;6150,00;0,00;150,00;6000,00/);
  assert.deepEqual(compareRates(input, 0.5).map(row => row.rate), [0, 0.5]);
});
