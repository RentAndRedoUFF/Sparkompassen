'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {calculateLoan}=require('./calculator');
const base={loanAmount:12000,interestRate:0,repaymentYears:1,paymentFrequency:'monthly'};
test('nollränta ger exakt lika stora betalningar',()=>{const a=calculateLoan(base);assert.equal(a.valid,true);assert.equal(a.result.payment,1000);assert.equal(a.result.total,12000)});
test('positiv ränta ger högre totalbelopp',()=>{const a=calculateLoan({...base,interestRate:3});assert(a.result.total>12000);assert(a.result.interest>0)});
test('betalningsintervall ändrar antal betalningar',()=>{const a=calculateLoan({...base,paymentFrequency:'quarterly'});assert.equal(a.result.periods,4)});
test('ogiltig indata avvisas',()=>assert.equal(calculateLoan({...base,loanAmount:-1}).valid,false));

test('extra betalningar kan korta tiden och ger samma totalsumma vid nollränta', () => {
  const answer = calculateLoan({ ...base, extraPayment: 500 });
  assert.equal(answer.result.payment, 1500);
  assert.equal(answer.result.periods, 8);
  assert.equal(answer.result.periodsSaved, 4);
  assert.equal(answer.result.total, 12000);
  assert.equal(answer.result.interestSaved, 0);
});

test('extra betalningar sparar ränta och sista betalningen begränsas till kvarvarande skuld', () => {
  const answer = calculateLoan({ ...base, interestRate: 6, extraPayment: 20000 });
  assert.equal(answer.result.periods, 1);
  assert.equal(answer.result.finalPayment, 12060);
  assert.equal(answer.result.total, 12060);
  assert.ok(answer.result.interestSaved > 0);
});

test('svenska decimaltal accepteras och ogiltiga extra betalningar avvisas', () => {
  assert.equal(calculateLoan({ ...base, extraPayment: '5,50' }).data.extraPayment, 5.5);
  assert.equal(calculateLoan({ ...base, extraPayment: -1 }).valid, false);
  assert.equal(calculateLoan({ ...base, extraPayment: [1] }).valid, false);
});
