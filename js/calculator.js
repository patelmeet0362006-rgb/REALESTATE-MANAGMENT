/* calculator.js - Interactive mortgage calculator script */

function initCalculatorApp() {
  try {
    initMortgageCalculator();
  } catch (err) {
    console.error("Initialization error in mortgage calculator:", err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCalculatorApp);
} else {
  initCalculatorApp();
}

function initMortgageCalculator() {
  const calcContainer = document.querySelector('.calc-container');
  if (!calcContainer) return;

  // Grab UI slider elements
  const homePriceSlider = document.getElementById('calc-home-price');
  const downPaymentSlider = document.getElementById('calc-down-payment');
  const interestRateSlider = document.getElementById('calc-interest');
  const loanTermSlider = document.getElementById('calc-term');

  // Grab UI text displays
  const homePriceVal = document.getElementById('calc-home-price-val');
  const downPaymentVal = document.getElementById('calc-down-payment-val');
  const interestRateVal = document.getElementById('calc-interest-val');
  const loanTermVal = document.getElementById('calc-term-val');

  if (!homePriceSlider || !downPaymentSlider || !interestRateSlider || !loanTermSlider) return;

  // Add event listeners to all sliders
  const sliders = [homePriceSlider, downPaymentSlider, interestRateSlider, loanTermSlider];
  
  sliders.forEach(slider => {
    slider.addEventListener('input', () => {
      // Limit down payment to never exceed the home price
      const price = parseInt(homePriceSlider.value);
      let downPayment = parseInt(downPaymentSlider.value);

      if (downPayment > price) {
        downPaymentSlider.value = price;
        downPayment = price;
      }

      // Update text labels
      homePriceVal.textContent = `₹${price.toLocaleString('en-IN')}`;
      downPaymentVal.textContent = `₹${downPayment.toLocaleString('en-IN')}`;
      interestRateVal.textContent = `${parseFloat(interestRateSlider.value).toFixed(1)}%`;
      loanTermVal.textContent = `${loanTermSlider.value} Years`;

      // Update down payment slider max dynamically
      downPaymentSlider.max = price;

      calculatePayments();
    });
  });

  // Run initial calculation
  calculatePayments();
}

/**
 * Calculates monthly mortgage payment details and updates the DOM
 */
function calculatePayments() {
  const homePrice = parseInt(document.getElementById('calc-home-price').value);
  const downPayment = parseInt(document.getElementById('calc-down-payment').value);
  const annualInterest = parseFloat(document.getElementById('calc-interest').value);
  const termYears = parseInt(document.getElementById('calc-term').value);

  // Math variables
  const loanAmount = homePrice - downPayment;
  const monthlyInterest = annualInterest / 12 / 100;
  const totalMonths = termYears * 12;

  let principalAndInterest = 0;

  // Avoid divide-by-zero if interest rate is 0
  if (monthlyInterest === 0) {
    principalAndInterest = loanAmount / totalMonths;
  } else {
    principalAndInterest = loanAmount * (monthlyInterest * Math.pow(1 + monthlyInterest, totalMonths)) / (Math.pow(1 + monthlyInterest, totalMonths) - 1);
  }

  // If price matches down payment exactly
  if (loanAmount <= 0) {
    principalAndInterest = 0;
  }

  // Estimated Property Taxes (approx 1.2% annually of Home Price)
  const monthlyTaxes = (homePrice * 0.012) / 12;

  // Estimated Home Insurance (approx 0.35% annually of Home Price)
  const monthlyInsurance = (homePrice * 0.0035) / 12;

  const totalMonthlyPayment = principalAndInterest + monthlyTaxes + monthlyInsurance;

  // Update monthly payment display
  const monthlyPaymentText = document.getElementById('calc-monthly-val');
  if (monthlyPaymentText) {
    monthlyPaymentText.textContent = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(totalMonthlyPayment);
  }

  // Update sub-item numbers in breakdown
  const piVal = document.getElementById('breakdown-pi-val');
  const taxVal = document.getElementById('breakdown-tax-val');
  const insVal = document.getElementById('breakdown-ins-val');

  if (piVal) piVal.textContent = `₹${Math.round(principalAndInterest).toLocaleString('en-IN')}`;
  if (taxVal) taxVal.textContent = `₹${Math.round(monthlyTaxes).toLocaleString('en-IN')}`;
  if (insVal) insVal.textContent = `₹${Math.round(monthlyInsurance).toLocaleString('en-IN')}`;

  // Update progress bar percentages
  const piFill = document.getElementById('fill-pi');
  const taxFill = document.getElementById('fill-tax');
  const insFill = document.getElementById('fill-ins');

  if (piFill && taxFill && insFill) {
    // Prevent Division by Zero if all values are 0
    const totalSum = totalMonthlyPayment || 1; 
    const piPct = (principalAndInterest / totalSum) * 100;
    const taxPct = (monthlyTaxes / totalSum) * 100;
    const insPct = (monthlyInsurance / totalSum) * 100;

    piFill.style.width = `${piPct}%`;
    taxFill.style.width = `${taxPct}%`;
    insFill.style.width = `${insPct}%`;
  }
}
