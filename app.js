const DEFAULTS = {
  agreementValue: 15378378,
  loanAmount: 13000000,
  interestRate: 7.55,
  loanDuration: 20,
  startMonth: "2026-05",
  emiDay: 1,
  propertyStatus: "construction",
  moratorium: false,
  possessionMonth: 1,
  disbursements: [{ month: 1, percentage: 30, bankContribution: 2479989, ownContribution: 2364200, day: 31 }],
  rateChanges: [],
  extraPayments: [{ month: 3, amount: 105275, frequency: "monthly", endMonth: "", count: "", day: 1 }],
};

const elementIds = [
  "loan-form",
  "reset-button",
  "download-button",
  "summary-grid",
  "schedule-body",
  "form-error",
  "agreement-value",
  "loan-amount",
  "interest-rate",
  "loan-duration",
  "emi-day",
  "start-month",
  "property-status",
  "moratorium-field",
  "moratorium-option",
  "possession-month-field",
  "possession-month",
  "disbursement-section",
  "disbursement-body",
  "rate-change-body",
  "extra-payment-body",
  "add-disbursement-button",
  "add-rate-button",
  "add-extra-button",
];

const elements = {};
let latestSchedule = [];

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const percentFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

function getElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required page element: #${id}`);
  }
  return element;
}

function cacheElements() {
  elementIds.forEach((id) => {
    elements[id] = getElement(id);
  });
}

function setDefaultStartMonth() {
  elements["start-month"].value = DEFAULTS.startMonth;
}

function parseNumberInput(value) {
  const trimmedValue = String(value).trim();
  return trimmedValue === "" ? 0 : Number(trimmedValue);
}

function readNumber(id) {
  return parseNumberInput(elements[id].value);
}

function isWholeNumberInput(value) {
  const trimmedValue = String(value).trim();
  return /^\d+$/.test(trimmedValue) && Number.isFinite(Number(trimmedValue));
}

function formatCurrency(amount) {
  return currencyFormatter.format(Math.round(amount));
}

function formatPercent(percent) {
  return `${percentFormatter.format(percent)}%`;
}

function calculatePercentage(amount, baseAmount) {
  return baseAmount > 0 ? (amount / baseAmount) * 100 : 0;
}

function getDisbursementTotalAmount(agreementValue, percentage) {
  return Math.round(((agreementValue * percentage) / 100) * 1.05);
}

function getDisbursementBaseAmount(agreementValue, percentage) {
  return (agreementValue * percentage) / 100;
}

function addMonths(startMonth, monthsToAdd) {
  const [year, month] = startMonth.split("-").map(Number);
  return new Date(year, month - 1 + monthsToAdd, 1);
}

function getLastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function getLoanMonthDate(startMonth, monthsToAdd, dayOfMonth) {
  const [year, month] = startMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + monthsToAdd, 1);
  const lastDay = getLastDayOfMonth(date.getFullYear(), date.getMonth());
  date.setDate(Math.min(dayOfMonth, lastDay));
  return date;
}

function getDaysBetween(startDate, endDate) {
  return Math.max(Math.round((endDate - startDate) / 86400000), 0);
}

function addDays(date, daysToAdd) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  return nextDate;
}

function calculateDailyInterest(principal, annualRate, days) {
  return principal * (annualRate / 100) * (days / 365);
}

function calculateInterestThroughDate(principal, annualRate, startDate, paymentDate) {
  if (principal <= 0 || paymentDate < startDate) {
    return 0;
  }
  return calculateDailyInterest(principal, annualRate, getDaysBetween(startDate, paymentDate) + 1);
}

function calculateMonthlyPayment(principal, annualRate, months) {
  if (principal <= 0 || months <= 0) {
    return 0;
  }
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) {
    return principal / months;
  }
  return (principal * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
}

function applyInputOptions(input, options = {}) {
  if (options.min !== undefined) input.min = options.min;
  if (options.max !== undefined) input.max = options.max;
  if (options.step !== undefined) input.step = options.step;
  if (options.inputMode) input.inputMode = options.inputMode;
  if (options.placeholder) input.placeholder = options.placeholder;
}

function createInputCell(type, className, value, options = {}) {
  const cell = document.createElement("td");
  const input = document.createElement("input");
  input.type = type;
  input.className = className;
  applyInputOptions(input, options);
  input.value = value ?? "";
  cell.append(input);
  return cell;
}

function createSelectCell(className, value, options) {
  const cell = document.createElement("td");
  const select = document.createElement("select");
  select.className = className;
  options.forEach(({ value: optionValue, label }) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = label;
    select.append(option);
  });
  select.value = value;
  cell.append(select);
  return cell;
}

function createRemoveCell() {
  const cell = document.createElement("td");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "secondary small-button remove-row-button";
  button.textContent = "Remove";
  cell.append(button);
  return cell;
}

function createTextCell(className, text = "—") {
  const cell = document.createElement("td");
  cell.className = className;
  cell.textContent = text;
  return cell;
}

function addTableRow(body, rowClass, values) {
  const row = document.createElement("tr");
  row.className = rowClass;
  row.append(createInputCell("number", "month-input", values.month, { min: "0", step: "1" }));

  if (rowClass === "rate-row") {
    row.append(createInputCell("number", "rate-input", values.rate, { min: "0", step: "0.01" }));
  } else {
    if (rowClass === "disbursement-row") {
      row.append(createInputCell("number", "percentage-input", values.percentage, { min: "0", max: "100", step: "0.01" }));
      row.append(createTextCell("base-amount-cell"));
      row.append(createTextCell("gst-amount-cell"));
      row.append(createTextCell("derived-amount-cell"));
      row.append(createInputCell("text", "bank-contribution-input", values.bankContribution ?? "", { inputMode: "numeric", placeholder: "Bank paid" }));
      row.append(createInputCell("text", "own-contribution-input", values.ownContribution ?? 0, { inputMode: "numeric", placeholder: "Own paid" }));
      row.append(createInputCell("number", "day-input", values.day || "1", { min: "1", max: "31", step: "1" }));
    }

    if (rowClass === "extra-row") {
      row.append(
        createInputCell("text", "amount-input", values.amount, { inputMode: "numeric" }),
      );
      row.append(
        createSelectCell("frequency-input", values.frequency || "once", [
          { value: "once", label: "One-time" },
          { value: "monthly", label: "Every month" },
          { value: "range", label: "From A to B" },
          { value: "count", label: "For N months" },
        ]),
      );
      row.append(createInputCell("number", "end-month-input", values.endMonth || "", { min: "1", step: "1", placeholder: "B month" }));
      row.append(createInputCell("number", "count-input", values.count || "", { min: "1", step: "1", placeholder: "N" }));
      row.append(createInputCell("number", "day-input", values.day || elements["emi-day"].value, { min: "1", max: "31", step: "1" }));
    }
  }

  row.append(createRemoveCell());
  body.append(row);
}

function renderDisbursementDerivedAmounts(values) {
  elements["disbursement-body"].querySelectorAll("tr").forEach((row, index) => {
    const baseAmountCell = row.querySelector(".base-amount-cell");
    const gstAmountCell = row.querySelector(".gst-amount-cell");
    const amountCell = row.querySelector(".derived-amount-cell");
    if (!amountCell) return;

    const disbursement = values.disbursements[index];
    const baseAmount = getDisbursementBaseAmount(values.agreementValue, disbursement?.percentage || 0);
    const gstAmount = baseAmount * 0.05;
    const amount = getDisbursementTotalAmount(values.agreementValue, disbursement?.percentage || 0);
    if (baseAmountCell) baseAmountCell.textContent = Number.isFinite(baseAmount) && baseAmount > 0 ? formatCurrency(baseAmount) : "—";
    if (gstAmountCell) gstAmountCell.textContent = Number.isFinite(gstAmount) && gstAmount > 0 ? formatCurrency(gstAmount) : "—";
    amountCell.textContent = Number.isFinite(amount) && amount > 0 ? formatCurrency(amount) : "—";
  });
}

function populateRows(body, rowClass, rows) {
  body.innerHTML = "";
  rows.forEach((row) => addTableRow(body, rowClass, row));
}

function toggleConstructionOptions() {
  const isConstruction = elements["property-status"].value === "construction";
  elements["disbursement-section"].hidden = !isConstruction;
  elements["moratorium-field"].hidden = !isConstruction;
  elements["possession-month-field"].hidden = !isConstruction || !elements["moratorium-option"].checked;
}

function resetForm() {
  elements["agreement-value"].value = DEFAULTS.agreementValue;
  elements["loan-amount"].value = DEFAULTS.loanAmount;
  elements["interest-rate"].value = DEFAULTS.interestRate;
  elements["loan-duration"].value = DEFAULTS.loanDuration;
  elements["emi-day"].value = DEFAULTS.emiDay;
  elements["property-status"].value = DEFAULTS.propertyStatus;
  elements["moratorium-option"].checked = DEFAULTS.moratorium;
  elements["possession-month"].value = DEFAULTS.possessionMonth;
  populateRows(elements["disbursement-body"], "disbursement-row", DEFAULTS.disbursements);
  populateRows(elements["rate-change-body"], "rate-row", DEFAULTS.rateChanges);
  populateRows(elements["extra-payment-body"], "extra-row", DEFAULTS.extraPayments);
  setDefaultStartMonth();
  toggleConstructionOptions();
  calculateAndRender();
}

function readScheduleRows(body, valueKey) {
  return [...body.querySelectorAll("tr")]
    .map((row) => {
      const monthInput = row.querySelector(".month-input").value;
      const valueInput = row.querySelector(valueKey === "rate" ? ".rate-input" : ".amount-input").value;
      const month = parseNumberInput(monthInput);
      const value = parseNumberInput(valueInput);
      return { month, monthInput, [valueKey]: value, [`${valueKey}Input`]: valueInput };
    })
    .filter((row) => row.month > 0 || row[valueKey] > 0 || row[`${valueKey}Input`].trim() !== "");
}

function readDisbursementRows() {
  return [...elements["disbursement-body"].querySelectorAll("tr")]
    .map((row) => {
      const monthInput = row.querySelector(".month-input").value;
      const percentageInput = row.querySelector(".percentage-input").value;
      const bankContributionInput = row.querySelector(".bank-contribution-input").value;
      const ownContributionInput = row.querySelector(".own-contribution-input").value;
      const dayInput = row.querySelector(".day-input").value;
      return {
        month: parseNumberInput(monthInput),
        monthInput,
        percentage: parseNumberInput(percentageInput),
        percentageInput,
        bankContribution: parseNumberInput(bankContributionInput),
        bankContributionInput,
        ownContribution: parseNumberInput(ownContributionInput),
        ownContributionInput,
        day: parseNumberInput(dayInput),
        dayInput,
      };
    })
    .filter((row) => row.month > 0 || row.percentage > 0 || row.percentageInput.trim() !== "");
}

function readExtraPaymentRows() {
  return [...elements["extra-payment-body"].querySelectorAll("tr")]
    .map((row) => {
      const monthInput = row.querySelector(".month-input").value;
      const amountInput = row.querySelector(".amount-input").value;
      const endMonthInput = row.querySelector(".end-month-input").value;
      const countInput = row.querySelector(".count-input").value;
      const dayInput = row.querySelector(".day-input").value;
      return {
        month: parseNumberInput(monthInput),
        monthInput,
        amount: parseNumberInput(amountInput),
        amountInput,
        frequency: row.querySelector(".frequency-input").value,
        endMonth: parseNumberInput(endMonthInput),
        endMonthInput,
        count: parseNumberInput(countInput),
        countInput,
        day: parseNumberInput(dayInput),
        dayInput,
      };
    })
    .filter((row) => row.month > 0 || row.amount > 0 || row.amountInput.trim() !== "");
}

function readFormValues() {
  return {
    agreementValue: readNumber("agreement-value"),
    agreementValueInput: elements["agreement-value"].value,
    loanAmount: readNumber("loan-amount"),
    loanAmountInput: elements["loan-amount"].value,
    interestRate: readNumber("interest-rate"),
    loanDuration: readNumber("loan-duration"),
    emiDay: readNumber("emi-day"),
    startMonth: elements["start-month"].value,
    propertyStatus: elements["property-status"].value,
    moratorium: elements["moratorium-option"].checked,
    possessionMonth: readNumber("possession-month"),
    disbursements: readDisbursementRows(),
    rateChanges: readScheduleRows(elements["rate-change-body"], "rate"),
    extraPayments: readExtraPaymentRows(),
  };
}

function validateMonthRows(rows, label, maximumMonths) {
  for (const row of rows) {
    if (row.month < 1 || row.month > maximumMonths) {
      return `${label} month must be between 1 and ${maximumMonths}.`;
    }
  }
  return "";
}

function validateWholeNumberRows(rows, valueKey, label) {
  for (const row of rows) {
    if (!isWholeNumberInput(row[`${valueKey}Input`])) {
      return `${label} amount must be a whole number.`;
    }
  }
  return "";
}

function validateDisbursementSchedules(rows) {
  for (const row of rows) {
    if (!Number.isFinite(row.percentage) || row.percentage <= 0 || row.percentage > 100) {
      return "Disbursement percentage must be greater than 0 and no more than 100.";
    }
    if (row.day < 1 || row.day > 31) {
      return "Disbursement day must be between 1 and 31.";
    }
  }
  return "";
}


function validateDisbursementFunding(rows, agreementValue) {
  for (const row of rows) {
    if (!isWholeNumberInput(row.bankContributionInput || "0")) {
      return "Bank contribution must be a whole number.";
    }
    if (!isWholeNumberInput(row.ownContributionInput || "0")) {
      return "Own contribution must be a whole number.";
    }
    if (row.bankContribution < 0 || row.ownContribution < 0) {
      return "Disbursement contributions cannot be negative.";
    }

    const disbursementAmount = getDisbursementTotalAmount(agreementValue, row.percentage);
    if (row.bankContribution + row.ownContribution !== disbursementAmount) {
      return `Bank contribution plus own contribution must equal the GST-inclusive disbursement amount of ${formatCurrency(disbursementAmount)}.`;
    }
  }
  return "";
}

function validateExtraPaymentSchedules(rows, maximumMonths) {
  for (const row of rows) {
    if (row.day < 1 || row.day > 31) {
      return "Extra payment day must be between 1 and 31.";
    }
    if (row.frequency === "range" && (row.endMonth < row.month || row.endMonth > maximumMonths)) {
      return "Extra payment end month must be within the loan duration and not before the start month.";
    }
    if (row.frequency === "count" && row.count < 1) {
      return "Extra payment month count must be at least 1.";
    }
  }
  return "";
}

function validateInputs(values) {
  const maximumMonths = values.loanDuration * 12;

  if (!isWholeNumberInput(values.agreementValueInput)) {
    return "Agreement value must be a whole number.";
  }
  if (values.agreementValue <= 0) {
    return "Agreement value must be greater than zero.";
  }
  if (!isWholeNumberInput(values.loanAmountInput)) {
    return "Loan amount must be a whole number.";
  }
  if (values.loanAmount <= 0) {
    return "Loan amount must be greater than zero.";
  }
  if (values.loanAmount > values.agreementValue) {
    return "Loan amount cannot be greater than agreement value.";
  }
  if (values.interestRate < 0) {
    return "Borrowing interest rate cannot be negative.";
  }
  if (values.loanDuration < 1) {
    return "Loan duration must be at least one year.";
  }
  if (values.emiDay < 1 || values.emiDay > 31) {
    return "EMI day must be between 1 and 31.";
  }
  if (!values.startMonth) {
    return "Start month is required.";
  }

  const rateChangeError = validateMonthRows(values.rateChanges, "Rate change", maximumMonths);
  if (rateChangeError) return rateChangeError;

  const extraPaymentError = validateMonthRows(values.extraPayments, "Extra payment", maximumMonths);
  if (extraPaymentError) return extraPaymentError;

  if (values.rateChanges.some((row) => row.rate < 0)) {
    return "Rate change percentage cannot be negative.";
  }

  const extraPaymentAmountError = validateWholeNumberRows(values.extraPayments, "amount", "Extra payment");
  if (extraPaymentAmountError) return extraPaymentAmountError;

  const extraPaymentScheduleError = validateExtraPaymentSchedules(values.extraPayments, maximumMonths);
  if (extraPaymentScheduleError) return extraPaymentScheduleError;

  if (values.propertyStatus === "construction") {
    const disbursementError = validateMonthRows(values.disbursements, "Disbursement", maximumMonths);
    if (disbursementError) return disbursementError;

    if (!values.disbursements.length) {
      return "Add at least one disbursement for an under-construction property.";
    }

    const disbursementScheduleError = validateDisbursementSchedules(values.disbursements);
    if (disbursementScheduleError) return disbursementScheduleError;

    const disbursementFundingError = validateDisbursementFunding(values.disbursements, values.agreementValue);
    if (disbursementFundingError) return disbursementFundingError;

    const totalBankDisbursementAmount = values.disbursements.reduce((total, row) => total + row.bankContribution, 0);
    if (totalBankDisbursementAmount > values.loanAmount) {
      return "Total bank contribution cannot be greater than the loan amount.";
    }

    if (values.moratorium && (values.possessionMonth < 1 || values.possessionMonth > maximumMonths)) {
      return `Possession month must be between 1 and ${maximumMonths}.`;
    }
  }

  return "";
}

function expandExtraPayments(rows, maximumMonths, startMonth) {
  const payments = [];

  rows.forEach((row) => {
    let finalMonth = row.month;
    if (row.frequency === "monthly") {
      finalMonth = maximumMonths;
    } else if (row.frequency === "range") {
      finalMonth = row.endMonth;
    } else if (row.frequency === "count") {
      finalMonth = row.month + row.count - 1;
    }

    for (let month = row.month; month <= Math.min(finalMonth, maximumMonths); month += 1) {
      payments.push({
        month,
        amount: row.amount,
        day: row.day,
        date: getLoanMonthDate(startMonth, month - 1, row.day),
      });
    }
  });

  return payments.sort((a, b) => a.date - b.date);
}

function expandDisbursements(rows, startMonth, agreementValue) {
  return rows
    .map((row) => ({
      month: row.month,
      percentage: row.percentage,
      amount: row.bankContribution,
      totalAmount: getDisbursementTotalAmount(agreementValue, row.percentage),
      ownContribution: row.ownContribution,
      day: row.day,
      date: getLoanMonthDate(startMonth, row.month - 1, row.day),
    }))
    .sort((a, b) => a.date - b.date);
}

function getPaymentsForPeriod(payments, periodStart, periodEnd) {
  return payments.filter((payment) => payment.date > periodStart && payment.date <= periodEnd);
}

function getRateForMonth(baseRate, rateChanges, monthNumber) {
  let rate = baseRate;
  rateChanges.forEach((change) => {
    if (change.month <= monthNumber) {
      rate = change.rate;
    }
  });
  return rate;
}

function buildSchedule(values) {
  const maximumMonths = values.loanDuration * 12;
  const isConstruction = values.propertyStatus === "construction";
  const disbursements = isConstruction ? expandDisbursements(values.disbursements, values.startMonth, values.agreementValue) : [];
  const sortedRateChanges = [...values.rateChanges].sort((a, b) => a.month - b.month);
  const extraPayments = expandExtraPayments(values.extraPayments, maximumMonths, values.startMonth);
  const finalDisbursementDate = disbursements.length
    ? disbursements[disbursements.length - 1].date
    : getLoanMonthDate(values.startMonth, 0, values.emiDay);
  const moratoriumEndMonth = isConstruction && values.moratorium ? values.possessionMonth : 1;

  // --- FIX: compute a fixed EMI once per rate segment ---
  // We track the "current EMI" and only recompute it when the interest rate changes.
  // The EMI is always based on the ORIGINAL full loan amount and ORIGINAL full tenure,
  // so it stays constant within each rate segment.
  let currentRate = values.interestRate;
  let currentEmi = calculateMonthlyPayment(values.loanAmount, currentRate, maximumMonths);
  // Build a quick lookup: which months trigger a rate change?
  const rateChangeMonths = new Set(sortedRateChanges.map((c) => c.month));

  const rows = [];
  let balance = isConstruction ? 0 : values.loanAmount;
  let totalInterest = 0;
  let totalPrincipal = 0;
  let totalExtra = 0;
  let totalDisbursed = isConstruction ? 0 : values.loanAmount;
  let moratoriumInterest = 0;
  let firstEmi = 0;

  for (
    let monthNumber = 1;
    monthNumber <= maximumMonths &&
    (balance > 0.01 || getLoanMonthDate(values.startMonth, monthNumber - 2, values.emiDay) < finalDisbursementDate);
    monthNumber += 1
  ) {
    const date = getLoanMonthDate(values.startMonth, monthNumber - 1, values.emiDay);
    const periodStart = getLoanMonthDate(values.startMonth, monthNumber - 2, values.emiDay);
    const rate = getRateForMonth(values.interestRate, sortedRateChanges, monthNumber);

    // Recompute fixed EMI only when the rate has just changed this month
    if (rateChangeMonths.has(monthNumber)) {
      const newRate = sortedRateChanges.find((c) => c.month === monthNumber).rate;
      if (newRate !== currentRate) {
        currentRate = newRate;
        // Rebase EMI on current outstanding balance and remaining months at the new rate
        const remainingMonths = maximumMonths - monthNumber + 1;
        currentEmi = calculateMonthlyPayment(balance, currentRate, remainingMonths);
      }
    }

    const openingBalance = balance;
    const isMoratorium = isConstruction && values.moratorium && monthNumber < moratoriumEndMonth;

    const periodDisbursements = getPaymentsForPeriod(disbursements, periodStart, date);
    const periodPayments = getPaymentsForPeriod(extraPayments, periodStart, date);
    const periodEvents = [
      ...periodDisbursements.map((d) => ({ ...d, type: "disbursement" })),
      ...periodPayments.map((p) => ({ ...p, type: "prepayment" })),
    ].sort((a, b) => a.date - b.date || (a.type === "disbursement" ? -1 : 1));

    let interest = 0;
    let extraPaid = 0;
    let disbursed = 0;
    let interestBalance = balance;
    let lastInterestDate = addDays(periodStart, 1);

    periodEvents.forEach((event) => {
      if (event.type === "disbursement") {
        interest += calculateDailyInterest(interestBalance, rate, getDaysBetween(lastInterestDate, event.date));
        interestBalance += event.amount;
        disbursed += event.amount;
        totalDisbursed += event.amount;
        lastInterestDate = event.date;
      } else {
        interest += calculateInterestThroughDate(interestBalance, rate, lastInterestDate, event.date);
        const paymentAmount = Math.min(event.amount, interestBalance);
        interestBalance = Math.max(interestBalance - paymentAmount, 0);
        extraPaid += paymentAmount;
        lastInterestDate = addDays(event.date, 1);
      }
    });

    interest += calculateInterestThroughDate(interestBalance, rate, lastInterestDate, date);
    balance = interestBalance;

    let emi = 0;
    let principalComponent = 0;

    if (isMoratorium) {
      // Moratorium: show only the accrued interest, no principal reduction
      emi = interest;
      moratoriumInterest += interest;
    } else {
      // Normal EMI month: use the fixed EMI, derive principal from it
      emi = currentEmi;

      // On the very last month(s), emi might exceed the remaining balance + interest;
      // clamp so we never overpay.
      const totalOwed = balance + interest;
      if (emi > totalOwed) {
        emi = totalOwed;
      }

      principalComponent = Math.max(emi - interest, 0);
      principalComponent = Math.min(principalComponent, balance);

      if (!firstEmi && emi > 0) {
        firstEmi = emi;
      }
    }

    balance = Math.max(balance - principalComponent, 0);
    totalInterest += interest;
    totalPrincipal += principalComponent;
    totalExtra += extraPaid;

    rows.push({
      monthNumber,
      date,
      status: isMoratorium ? "Moratorium" : "EMI",
      rate,
      disbursed,
      openingBalance,
      emi,
      interest,
      principalComponent,
      extraPaid,
      closingBalance: balance,
    });
  }

  return {
    agreementValue: values.agreementValue,
    loanAmount: values.loanAmount,
    loanAmountPercentage: calculatePercentage(values.loanAmount, values.agreementValue),
    ownContribution: isConstruction
      ? values.disbursements.reduce((total, row) => total + row.ownContribution, 0)
      : Math.max(values.agreementValue - values.loanAmount, 0),
    ownContributionPercentage: calculatePercentage(
      isConstruction
        ? values.disbursements.reduce((total, row) => total + row.ownContribution, 0)
        : Math.max(values.agreementValue - values.loanAmount, 0),
      values.agreementValue,
    ),
    rows,
    firstEmi,
    totalDisbursed,
    totalInterest,
    totalPrincipal,
    totalExtra,
    moratoriumInterest,
    totalPaid: totalInterest + totalPrincipal + totalExtra,
    payoffDate: rows.length ? rows[rows.length - 1].date : addMonths(values.startMonth, 0),
    monthsSaved: maximumMonths - rows.length,
  };
}

function renderSummary(result) {
  const metrics = [
    ["Agreement value", formatCurrency(result.agreementValue)],
    ["Loan amount", `${formatCurrency(result.loanAmount)} (${formatPercent(result.loanAmountPercentage)})`],
    ["Own contribution", `${formatCurrency(result.ownContribution)} (${formatPercent(result.ownContributionPercentage)})`],
    ["Total disbursed", formatCurrency(result.totalDisbursed)],
    ["Starting EMI", formatCurrency(result.firstEmi)],
    ["Total interest", formatCurrency(result.totalInterest)],
    ["Moratorium interest", formatCurrency(result.moratoriumInterest)],
    ["Total extra paid", formatCurrency(result.totalExtra)],
    ["Total paid", formatCurrency(result.totalPaid)],
    ["Payoff date", dateFormatter.format(result.payoffDate)],
    ["Months saved", `${Math.max(result.monthsSaved, 0)} months`],
  ];

  elements["summary-grid"].innerHTML = metrics
    .map(([label, value]) => `<article class="metric-card"><span>${label}</span><strong>${value}</strong></article>`)
    .join("");
}

function renderSchedule(rows) {
  latestSchedule = rows;
  elements["schedule-body"].innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${dateFormatter.format(row.date)}<span class="month-number">Month ${row.monthNumber}</span></td>
          <td>${row.status}</td>
          <td>${row.rate.toFixed(2)}%</td>
          <td>${formatCurrency(row.disbursed)}</td>
          <td>${formatCurrency(row.openingBalance)}</td>
          <td>${formatCurrency(row.emi)}</td>
          <td>${formatCurrency(row.interest)}</td>
          <td>${formatCurrency(row.principalComponent)}</td>
          <td>${formatCurrency(row.extraPaid)}</td>
          <td>${formatCurrency(row.closingBalance)}</td>
        </tr>
      `,
    )
    .join("");
}

function showError(message) {
  elements["form-error"].textContent = message;
  elements["form-error"].hidden = !message;
}

function calculateAndRender() {
  const values = readFormValues();
  renderDisbursementDerivedAmounts(values);
  const validationError = validateInputs(values);

  if (validationError) {
    showError(validationError);
    return;
  }

  showError("");
  const result = buildSchedule(values);
  renderSummary(result);
  renderSchedule(result.rows);
}

function downloadCsv() {
  if (!latestSchedule.length) return;

  const header = [
    "EMI date",
    "Status",
    "Rate",
    "Disbursed",
    "Opening principal",
    "EMI / Interest-only",
    "Interest",
    "Principal",
    "Extra paid",
    "Remaining principal",
  ];
  const rows = latestSchedule.map((row) => [
    dateFormatter.format(row.date),
    row.status,
    row.rate.toFixed(2),
    row.disbursed.toFixed(2),
    row.openingBalance.toFixed(2),
    row.emi.toFixed(2),
    row.interest.toFixed(2),
    row.principalComponent.toFixed(2),
    row.extraPaid.toFixed(2),
    row.closingBalance.toFixed(2),
  ]);
  const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "home-loan-amortization.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function showStartupError(error) {
  const message = document.createElement("div");
  message.className = "startup-error";
  message.setAttribute("role", "alert");
  message.innerHTML = `
    <strong>The calculator could not start.</strong>
    <span>Refresh the page, make sure you are serving the project folder, and check the browser console for details.</span>
  `;
  document.body.prepend(message);
  console.error(error);
}

function handleRemoveRow(event) {
  if (!event.target.classList.contains("remove-row-button")) return;
  event.target.closest("tr").remove();
  calculateAndRender();
}

function initializeCalculator() {
  try {
    cacheElements();

    elements["loan-form"].addEventListener("submit", (event) => {
      event.preventDefault();
      calculateAndRender();
    });
    elements["loan-form"].addEventListener("input", calculateAndRender);
    elements["loan-form"].addEventListener("click", handleRemoveRow);
    elements["property-status"].addEventListener("change", () => {
      toggleConstructionOptions();
      calculateAndRender();
    });
    elements["moratorium-option"].addEventListener("change", () => {
      toggleConstructionOptions();
      calculateAndRender();
    });

    elements["reset-button"].addEventListener("click", resetForm);
    elements["download-button"].addEventListener("click", downloadCsv);
    elements["add-disbursement-button"].addEventListener("click", () => {
      addTableRow(elements["disbursement-body"], "disbursement-row", { month: 1, percentage: 0, bankContribution: 0, ownContribution: 0, day: 1 });
    });
    elements["add-rate-button"].addEventListener("click", () => {
      addTableRow(elements["rate-change-body"], "rate-row", { month: 1, rate: elements["interest-rate"].value });
    });
    elements["add-extra-button"].addEventListener("click", () => {
      addTableRow(elements["extra-payment-body"], "extra-row", { month: 1, amount: 0 });
    });

    resetForm();
  } catch (error) {
    showStartupError(error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeCalculator);
} else {
  initializeCalculator();
}
