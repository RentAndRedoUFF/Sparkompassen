/* Sprint 3: endast presentation av verifierad indata, inga låneberäkningar. */
(function (root) {
  'use strict';
  const money = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 });
  const percent = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 3 });
  const frequencies = Object.freeze({monthly: 'Per månad', quarterly: 'Per kvartal', yearly: 'Per år'});

  function formatOverview(data) {
    if (!data || !Number.isFinite(data.loanAmount) || !Number.isFinite(data.interestRate) || !Number.isInteger(data.repaymentYears) || !Object.hasOwn(frequencies, data.paymentFrequency)) {
      throw new TypeError('Förhandsvisningen kräver giltiga uppgifter.');
    }
    return {
      amount: `${money.format(data.loanAmount)} kr`,
      rate: `${percent.format(data.interestRate)} %`,
      years: `${data.repaymentYears} år`,
      frequency: frequencies[data.paymentFrequency]
    };
  }
  const api = {formatOverview};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SparkompassenPresentation = api;
}(typeof window !== 'undefined' ? window : null));
