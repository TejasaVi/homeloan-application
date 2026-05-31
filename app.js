const DEFAULTS = {
  homePrice: 450000,
  downPayment: 90000,
  interestRate: 6.75,
  loanTerm: 30,
  extraPayment: 0,
};

const elementIds = [
  "loan-form",
  "reset-button",
  "download-button",
  "summary-grid",
  "schedule-body",
  "form-error",
  "home-price",
  "down-payment",
  "interest-rate",
  "loan-term",
  "extra-payment",
  "start-month",
];

const elements = {};
let latestSchedule = [];

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

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

function setDefaultStartMonth() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  elements["start-month"].value = `${today.getFullYear()}-${month}`;
}

function readNumber(id) {
  return Number(elements[id].value || 0);
}

function readFormValues() {
  return {
    homePrice: readNumber("home-price"),
    downPayment: readNumber("down-payment"),
    interestRate: readNumber("interest-rate"),
    loanTerm: readNumber("loan-term"),
    extraPayment: readNumber("extra-payment"),
    startMonth: elements["start-month"].value,
  };
}

function validateInputs(values) {
  if (values.homePrice <= 0) {
    return "Home price must be greater than zero.";
  }

  if (values.downPayment < 0 || values.downPayment >= values.homePrice) {
    return "Down payment must be zero or more and less than the home price.";
  }

  if (values.interestRate < 0) {
    return "Interest rate cannot be negative.";
  }

  if (values.loanTerm < 1) {
    return "Loan term must be at least one year.";
  }

  if (values.extraPayment < 0) {
    return "Extra monthly payment cannot be negative.";
  }

  if (!values.startMonth) {
    return "Start month is required.";
  }

  return "";
}

function calculateMonthlyPayment(principal, annualRate, years) {
  const months = years * 12;
  const monthlyRate = annualRate / 100 / 12;

  if (monthlyRate === 0) {
    return principal / months;
  }

  return principal * (monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
}

function addMonths(startMonth, monthsToAdd) {
  const [year, month] = startMonth.split("-").map(Number);
  return new Date(year, month - 1 + monthsToAdd, 1);
}

function buildSchedule(values) {
  const principal = values.homePrice - values.downPayment;
  const monthlyPayment = calculateMonthlyPayment(principal, values.interestRate, values.loanTerm);
  const monthlyRate = values.interestRate / 100 / 12;
  const maximumMonths = values.loanTerm * 12;
  let balance = principal;
  let totalInterest = 0;
  let totalPrincipal = 0;
  let totalExtra = 0;
  const monthlyRows = [];
  const yearlyRows = [];

  for (let monthIndex = 0; monthIndex < maximumMonths && balance > 0.01; monthIndex += 1) {
    const interest = balance * monthlyRate;
    const scheduledPrincipal = Math.min(monthlyPayment - interest, balance);
    const extraPrincipal = Math.min(values.extraPayment, Math.max(balance - scheduledPrincipal, 0));
    const principalPaid = scheduledPrincipal + extraPrincipal;
    balance = Math.max(balance - principalPaid, 0);
    totalInterest += interest;
    totalPrincipal += scheduledPrincipal;
    totalExtra += extraPrincipal;

    monthlyRows.push({
      monthNumber: monthIndex + 1,
      date: addMonths(values.startMonth, monthIndex),
      principalPaid: scheduledPrincipal,
      interestPaid: interest,
      extraPaid: extraPrincipal,
      balance,
    });
  }

  monthlyRows.forEach((row) => {
    const year = row.date.getFullYear();
    let yearlyRow = yearlyRows.find((item) => item.year === year);

    if (!yearlyRow) {
      yearlyRow = {
        year,
        principalPaid: 0,
        interestPaid: 0,
        extraPaid: 0,
        endingBalance: row.balance,
      };
      yearlyRows.push(yearlyRow);
    }

    yearlyRow.principalPaid += row.principalPaid;
    yearlyRow.interestPaid += row.interestPaid;
    yearlyRow.extraPaid += row.extraPaid;
    yearlyRow.endingBalance = row.balance;
  });

  return {
    principal,
    monthlyPayment,
    payoffDate: monthlyRows.length ? monthlyRows[monthlyRows.length - 1].date : addMonths(values.startMonth, 0),
    totalInterest,
    totalPrincipal,
    totalExtra,
    totalPaid: totalPrincipal + totalExtra + totalInterest,
    monthsSaved: maximumMonths - monthlyRows.length,
    yearlyRows,
  };
}

function renderSummary(result) {
  const metrics = [
    ["Loan amount", currencyFormatter.format(result.principal)],
    ["Monthly payment", currencyFormatter.format(result.monthlyPayment)],
    ["Total interest", currencyFormatter.format(result.totalInterest)],
    ["Total paid", currencyFormatter.format(result.totalPaid)],
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
          <td>${row.year}</td>
          <td>${currencyFormatter.format(row.principalPaid)}</td>
          <td>${currencyFormatter.format(row.interestPaid)}</td>
          <td>${currencyFormatter.format(row.extraPaid)}</td>
          <td>${currencyFormatter.format(row.endingBalance)}</td>
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
  renderSchedule(result.yearlyRows);
}

function resetForm() {
  document.querySelector("#home-price").value = DEFAULTS.homePrice;
  document.querySelector("#down-payment").value = DEFAULTS.downPayment;
  document.querySelector("#interest-rate").value = DEFAULTS.interestRate;
  document.querySelector("#loan-term").value = DEFAULTS.loanTerm;
  document.querySelector("#extra-payment").value = DEFAULTS.extraPayment;
  setDefaultStartMonth();
  calculateAndRender();
}

function downloadCsv() {
  if (!latestSchedule.length) {
    return;
  }

  const header = ["Year", "Principal paid", "Interest paid", "Extra paid", "Ending balance"];
  const rows = latestSchedule.map((row) => [
    row.year,
    row.principalPaid.toFixed(2),
    row.interestPaid.toFixed(2),
    row.extraPaid.toFixed(2),
    row.endingBalance.toFixed(2),
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

function initializeCalculator() {
  try {
    cacheElements();

    elements["loan-form"].addEventListener("submit", (event) => {
      event.preventDefault();
      calculateAndRender();
    });

    elements["reset-button"].addEventListener("click", resetForm);
    elements["download-button"].addEventListener("click", downloadCsv);

    setDefaultStartMonth();
    calculateAndRender();
  } catch (error) {
    showStartupError(error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeCalculator);
} else {
  initializeCalculator();
}
