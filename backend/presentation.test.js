const test = require('node:test');
const assert = require('node:assert/strict');
const {formatOverview} = require('../public/presentation');
const {validateLoan} = require('../public/validation');
const sample = {loanAmount:250000, interestRate:2.135, repaymentYears:20, paymentFrequency:'quarterly'};

test('svenskt beloppsformat används i resultatsidans kort', () => {
  const view = formatOverview(sample);
  assert.match(view.amount, /^250\s000 kr$/u);
  assert.equal(view.rate, '2,135 %');
  assert.equal(view.years, '20 år');
  assert.equal(view.frequency, 'Per kvartal');
});

test('betalningsintervall visas konsekvent för alla tre alternativ', () => {
  assert.equal(formatOverview({...sample,paymentFrequency:'monthly'}).frequency, 'Per månad');
  assert.equal(formatOverview({...sample,paymentFrequency:'yearly'}).frequency, 'Per år');
});

test('presentationen avvisar felaktiga eller saknade numeriska data', () => {
  assert.throws(() => formatOverview({...sample,loanAmount:Infinity}), TypeError);
  assert.throws(() => formatOverview({...sample,paymentFrequency:'daily'}), TypeError);
  assert.throws(() => formatOverview({}), TypeError);
});

test('gränsfel för studieskuld visas med tusentalsgruppering', () => {
  const outcome = validateLoan({...sample,loanAmount:'10000001'});
  assert.equal(outcome.valid,false);
  assert.match(outcome.errors.loanAmount, /10\s000\s000 kr/u);
});

test('ränta och återbetalningstid får begripliga enheter i felmeddelanden', () => {
  assert.match(validateLoan({...sample,interestRate:101}).errors.interestRate, /100 %/);
  assert.match(validateLoan({...sample,repaymentYears:26}).errors.repaymentYears, /25 år/);
});
