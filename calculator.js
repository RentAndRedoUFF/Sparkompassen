'use strict';
const { validateLoan } = require('../frontend/validation');
const PERIODS = {monthly: 12, quarterly: 4, yearly: 1};
function calculateLoan(input) {
  const checked = validateLoan(input || {});
  if (!checked.valid) return {valid:false, errors:checked.errors};
  const {loanAmount, interestRate, repaymentYears, paymentFrequency}=checked.data;
  const perYear=PERIODS[paymentFrequency];
  const n=repaymentYears * perYear;
  const rate=interestRate/100/perYear;
  // Förenklad annuitetsmodell, ingen prognos över CSN:s årsbelopp eller ränteändringar.
  const payment=rate===0 ? loanAmount/n : loanAmount*rate/(1-Math.pow(1+rate,-n));
  const total=payment*n;
  const result={payment:Math.round(payment*100)/100,total:Math.round(total*100)/100,interest:Math.round((total-loanAmount)*100)/100, periods:n,perYear};
  return {valid:true, data:checked.data, result, model:'förenklad-annuitet', notice:'Illustrativ beräkning med fast ränta och lika stora betalningar. CSN beräknar årsbelopp enligt särskilda regler och räntan kan ändras.'};
}
module.exports={calculateLoan};
