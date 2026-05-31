const DEFAULTS = {
  loanAmount: 4500000,
  interestRate: 8.5,
  loanDuration: 20,
  propertyStatus: "ready",
  disbursements: [
    { month: 1, amount: 1500000 },
    { month: 7, amount: 1500000 },
    { month: 13, amount: 1500000 },
  ],
  rateChanges: [{ month: 61, rate: 9.25 }],
  extraPayments: [{ month: 24, amount: 100000 }],
};

const elementIds = [
  "loan-form",
  "reset-button",
  "download-button",
  "summary-grid",
  "schedule-body",
  "form-error",
  "loan-amount",
  "interest-rate",
  "loan-duration",
  "start-month",
  "property-status",
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

const monthFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "numeric",
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
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  elements["start-month"].value = `${today.getFullYear()}-${month}`;
}

function readNumber(id) {
  return Number(elements[id].value || 0);
}

function formatCurrency(amount) {
  return currencyFormatter.format(Math.round(amount));
}

function addMonths(startMonth, monthsToAdd) {
  const [year, month] = startMonth.split("-").map(Number);
  return new Date(year, month - 1 + monthsToAdd, 1);
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

function createInputCell(type, className, value, step) {
  const cell = document.createElement("td");
  const input = document.createElement("input");
  input.type = type;
  input.className = className;
  input.min = "0";
  input.step = step;
  input.value = value;
  cell.append(input);
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

function addTableRow(body, rowClass, values) {
  const row = document.createElement("tr");
  row.className = rowClass;
  row.append(createInputCell("number", "month-input", values.month, "1"));

  if (rowClass === "rate-row") {
    row.append(createInputCell("number", "rate-input", values.rate, "0.01"));
  } else {
    row.append(createInputCell("number", "amount-input", values.amount, "1000"));
  }

  row.append(createRemoveCell());
  body.append(row);
}

function populateRows(body, rowClass, rows) {
  body.innerHTML = "";
  rows.forEach((row) => addTableRow(body, rowClass, row));
}

function toggleDisbursements() {
  elements["disbursement-section"].hidden = elements["property-status"].value !== "construction";
}

function resetForm() {
  elements["loan-amount"].value = DEFAULTS.loanAmount;
  elements["interest-rate"].value = DEFAULTS.interestRate;
  elements["loan-duration"].value = DEFAULTS.loanDuration;
  elements["property-status"].value = DEFAULTS.propertyStatus;
  populateRows(elements["disbursement-body"], "disbursement-row", DEFAULTS.disbursements);
  populateRows(elements["rate-change-body"], "rate-row", DEFAULTS.rateChanges);
  populateRows(elements["extra-payment-body"], "extra-row", DEFAULTS.extraPayments);
  setDefaultStartMonth();
  toggleDisbursements();
  calculateAndRender();
}

function readScheduleRows(body, valueKey) {
  return [...body.querySelectorAll("tr")]
    .map((row) => {
      const month = Number(row.querySelector(".month-input").value || 0);
      const value = Number(row.querySelector(valueKey === "rate" ? ".rate-input" : ".amount-input").value || 0);
      return { month, [valueKey]: value };
    })
    .filter((row) => row.month > 0 || row[valueKey] > 0);
}

function readFormValues() {
  return {
    loanAmount: readNumber("loan-amount"),
    interestRate: readNumber("interest-rate"),
    loanDuration: readNumber("loan-duration"),
    startMonth: elements["start-month"].value,
    propertyStatus: elements["property-status"].value,
    disbursements: readScheduleRows(elements["disbursement-body"], "amount"),
    rateChanges: readScheduleRows(elements["rate-change-body"], "rate"),
    extraPayments: readScheduleRows(elements["extra-payment-body"], "amount"),
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

function validateInputs(values) {
  const maximumMonths = values.loanDuration * 12;

  if (values.loanAmount <= 0) {
    return "Loan amount must be greater than zero.";
  }

  if (values.interestRate < 0) {
    return "Borrowing interest rate cannot be negative.";
  }

  if (values.loanDuration < 1) {
    return "Loan duration must be at least one year.";
  }

  if (!values.startMonth) {
    return "Start month is required.";
  }

  const rateChangeError = validateMonthRows(values.rateChanges, "Rate change", maximumMonths);
  if (rateChangeError) {
    return rateChangeError;
  }

  const extraPaymentError = validateMonthRows(values.extraPayments, "Extra payment", maximumMonths);
  if (extraPaymentError) {
    return extraPaymentError;
  }

  if (values.rateChanges.some((row) => row.rate < 0)) {
    return "Rate change percentage cannot be negative.";
  }

  if (values.extraPayments.some((row) => row.amount < 0)) {
    return "Extra payment amount cannot be negative.";
  }

  if (values.propertyStatus === "construction") {
    const disbursementError = validateMonthRows(values.disbursements, "Disbursement", maximumMonths);
    if (disbursementError) {
      return disbursementError;
    }

    if (!values.disbursements.length) {
      return "Add at least one disbursement for an under-construction property.";
    }

    if (values.disbursements.some((row) => row.amount <= 0)) {
      return "Every disbursement amount must be greater than zero.";
    }

    const finalDisbursementMonth = Math.max(...values.disbursements.map((row) => row.month));
    if (finalDisbursementMonth >= maximumMonths) {
      return "Final disbursement must leave at least one month for EMI repayment.";
    }

    const totalDisbursed = values.disbursements.reduce((sum, row) => sum + row.amount, 0);
    if (Math.abs(totalDisbursed - values.loanAmount) > 0.01) {
      return "Total disbursement amount must match the loan amount.";
    }
  }

  return "";
}

function groupByMonth(rows, valueKey) {
  return rows.reduce((grouped, row) => {
    grouped[row.month] = (grouped[row.month] || 0) + row[valueKey];
    return grouped;
  }, {});
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
  const disbursements =
    values.propertyStatus === "ready" ? [{ month: 1, amount: values.loanAmount }] : values.disbursements;
  const sortedRateChanges = [...values.rateChanges].sort((a, b) => a.month - b.month);
  const disbursementByMonth = groupByMonth(disbursements, "amount");
  const extraByMonth = groupByMonth(values.extraPayments, "amount");
  const finalDisbursementMonth = Math.max(...disbursements.map((row) => row.month));
  const repaymentStartMonth = values.propertyStatus === "construction" ? finalDisbursementMonth + 1 : 1;
  const rows = [];
  let balance = 0;
  let totalInterest = 0;
  let totalPrincipal = 0;
  let totalExtra = 0;
  let totalDisbursed = 0;
  let preEmiInterest = 0;
  let firstEmi = 0;

  for (let monthNumber = 1; monthNumber <= maximumMonths && (balance > 0.01 || monthNumber <= finalDisbursementMonth); monthNumber += 1) {
    const date = addMonths(values.startMonth, monthNumber - 1);
    const rate = getRateForMonth(values.interestRate, sortedRateChanges, monthNumber);
    const monthlyRate = rate / 100 / 12;
    const openingBalance = balance;
    const disbursed = disbursementByMonth[monthNumber] || 0;
    balance += disbursed;
    totalDisbursed += disbursed;

    const isPreEmi = values.propertyStatus === "construction" && monthNumber < repaymentStartMonth;
    const interest = balance * monthlyRate;
    const requestedExtra = extraByMonth[monthNumber] || 0;
    let emi = interest;
    let principalComponent = 0;

    if (!isPreEmi) {
      const remainingMonths = maximumMonths - monthNumber + 1;
      emi = calculateMonthlyPayment(balance, rate, remainingMonths);
      principalComponent = Math.min(Math.max(emi - interest, 0), balance);
      if (!firstEmi && emi > 0) {
        firstEmi = emi;
      }
    } else {
      preEmiInterest += interest;
    }

    const extraPaid = Math.min(requestedExtra, Math.max(balance - principalComponent, 0));
    balance = Math.max(balance - principalComponent - extraPaid, 0);
    totalInterest += interest;
    totalPrincipal += principalComponent;
    totalExtra += extraPaid;

    rows.push({
      monthNumber,
      date,
      status: isPreEmi ? "Pre-EMI" : "EMI",
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
    rows,
    firstEmi,
    totalDisbursed,
    totalInterest,
    totalPrincipal,
    totalExtra,
    preEmiInterest,
    totalPaid: totalInterest + totalPrincipal + totalExtra,
    payoffDate: rows.length ? rows[rows.length - 1].date : addMonths(values.startMonth, 0),
    monthsSaved: maximumMonths - rows.length,
  };
}

function renderSummary(result) {
  const metrics = [
    ["Loan amount", formatCurrency(result.totalDisbursed)],
    ["Starting EMI", formatCurrency(result.firstEmi)],
    ["Total interest", formatCurrency(result.totalInterest)],
    ["Pre-EMI interest", formatCurrency(result.preEmiInterest)],
    ["Total extra paid", formatCurrency(result.totalExtra)],
    ["Total paid", formatCurrency(result.totalPaid)],
    ["Payoff date", monthFormatter.format(result.payoffDate)],
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
          <td>${monthFormatter.format(row.date)}<span class="month-number">Month ${row.monthNumber}</span></td>
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
  if (!latestSchedule.length) {
    return;
  }

  const header = [
    "Month",
    "Status",
    "Rate",
    "Disbursed",
    "Opening principal",
    "EMI / Pre-EMI",
    "Interest",
    "Principal",
    "Extra paid",
    "Remaining principal",
  ];
  const rows = latestSchedule.map((row) => [
    monthFormatter.format(row.date),
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
  if (!event.target.classList.contains("remove-row-button")) {
    return;
  }

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
      toggleDisbursements();
      calculateAndRender();
    });

    elements["reset-button"].addEventListener("click", resetForm);
    elements["download-button"].addEventListener("click", downloadCsv);
    elements["add-disbursement-button"].addEventListener("click", () => {
      addTableRow(elements["disbursement-body"], "disbursement-row", { month: 1, amount: 0 });
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
