'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {calculateLoan}=require('./calculator');
const base={loanAmount:12000,interestRate:0,repaymentYears:1,paymentFrequency:'monthly'};
test('nollränta ger exakt lika stora betalningar',()=>{const a=calculateLoan(base);assert.equal(a.valid,true);assert.equal(a.result.payment,1000);assert.equal(a.result.total,12000)});
test('positiv ränta ger högre totalbelopp',()=>{const a=calculateLoan({...base,interestRate:3});assert(a.result.total>12000);assert(a.result.interest>0)});
test('betalningsintervall ändrar antal betalningar',()=>{const a=calculateLoan({...base,paymentFrequency:'quarterly'});assert.equal(a.result.periods,4)});
test('ogiltig indata avvisas',()=>assert.equal(calculateLoan({...base,loanAmount:-1}).valid,false));
