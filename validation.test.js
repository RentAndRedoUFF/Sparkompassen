const test = require('node:test');
const assert = require('node:assert/strict');
const { validateLoan } = require('../frontend/validation');

const valid = { loanAmount: '250000', interestRate: '2.135', repaymentYears: '20', paymentFrequency: 'quarterly' };

test('giltiga uppgifter godkänns och omvandlas till tal', () => {
  const result = validateLoan(valid);
  assert.equal(result.valid, true);
  assert.equal(result.data.loanAmount, 250000);
  assert.equal(result.data.interestRate, 2.135);
});

test('tom studieskuld ger tydligt fel', () => {
  const result = validateLoan({ ...valid, loanAmount: ' ' });
  assert.equal(result.valid, false);
  assert.match(result.errors.loanAmount, /Ange studieskuld/);
});

test('negativ studieskuld stoppas', () => {
  const result = validateLoan({ ...valid, loanAmount: '-100' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.loanAmount);
});

test('bokstäver och Infinity stoppas som tal', () => {
  assert.equal(validateLoan({ ...valid, interestRate: 'abc' }).valid, false);
  assert.equal(validateLoan({ ...valid, interestRate: 'Infinity' }).valid, false);
});

test('ränta 0 procent är tillåten och ränta över 100 stoppas', () => {
  assert.equal(validateLoan({ ...valid, interestRate: '0' }).valid, true);
  assert.ok(validateLoan({ ...valid, interestRate: '100.1' }).errors.interestRate);
});

test('återbetalningstid ska vara heltal mellan 1 och 25 år', () => {
  for (const years of ['0', '26', '2.5']) {
    assert.ok(validateLoan({ ...valid, repaymentYears: years }).errors.repaymentYears);
  }
});

test('orimligt stort belopp och ogiltigt val av betalningsintervall stoppas', () => {
  assert.ok(validateLoan({ ...valid, loanAmount: '10000001' }).errors.loanAmount);
  assert.ok(validateLoan({ ...valid, paymentFrequency: 'daily' }).errors.paymentFrequency);
});

test('alla fält som är fel ger separata felmeddelanden', () => {
  const result = validateLoan({loanAmount: '', interestRate: '-1', repaymentYears: '0', paymentFrequency: ''});
  assert.deepEqual(Object.keys(result.errors), ['loanAmount','interestRate','repaymentYears','paymentFrequency']);
});
