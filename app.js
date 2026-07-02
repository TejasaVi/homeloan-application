const DEFAULTS = {
  agreementValue: 15378378,
  loanAmount: 13000000,
  eligibilityPercentage: 95,
  interestRate: 7.55,
  loanDuration: 20,
  startMonth: "2026-05",
  emiDay: 1,
  propertyStatus: "construction",
  moratorium: false,
  possessionMonth: 1,
  disbursements: [
    { month: 1, percentage: 30, bankContribution: 2479989, ownContribution: 2364200, day: 31 },
    ...[
      { month: 4, percentage: 15 },
      { month: 4, percentage: 4 },
      { month: 5, percentage: 4 },
      { month: 6, percentage: 4 },
      { month: 7, percentage: 4 },
      { month: 8, percentage: 4 },
      { month: 9, percentage: 4 },
      { month: 10, percentage: 4 },
      { month: 11, percentage: 4 },
      { month: 12, percentage: 4 },
      { month: 13, percentage: 4 },
      { month: 14, percentage: 5 },
      { month: 15, percentage: 5 },
    ].map(({ month, percentage }) => ({
      month,
      percentage,
      bankContribution: "",
      ownContribution: 0,
      day: 1,
    })),
  ],
  rateChanges: [],
  extraPayments: [
    { month: 3, amount: 105275, frequency: "monthly", count: "", dayMode: "last", day: "" },
    { month: 2, amount: 325, frequency: "once", count: "", dayMode: "emi", day: "" },
    { month: 2, amount: 16, frequency: "once", count: "", dayMode: "specific", day: 27 },
    { month: 3, amount: 149277, frequency: "once", count: "", dayMode: "emi", day: "" },
    { month: 3, amount: 630000, frequency: "once", count: "", dayMode: "specific", day: 2 },
  ],
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
  "eligibility-percentage",
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

function roundCurrencyAmount(amount) {
  return Math.round(amount);
}

function formatCurrency(amount) {
  return currencyFormatter.format(roundCurrencyAmount(amount));
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

function getEligibleLoanAmount(agreementValue, eligibilityPercentage) {
  return Math.round((agreementValue * eligibilityPercentage) / 100);
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
  const normalizedDay = dayOfMonth === "last" ? lastDay : Number(dayOfMonth);
  date.setDate(Math.min(normalizedDay, lastDay));
  return date;
}

function formatMonthInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDateInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getLoanMonthInputValue(monthNumber) {
  return formatMonthInputValue(addMonths(elements["start-month"].value || DEFAULTS.startMonth, Math.max(monthNumber - 1, 0)));
}

function getLoanMonthNumberFromInput(monthInput) {
  if (!monthInput) return 0;
  const [startYear, startMonth] = (elements["start-month"].value || DEFAULTS.startMonth).split("-").map(Number);
  const [inputYear, inputMonth] = monthInput.split("-").map(Number);
  if (!startYear || !startMonth || !inputYear || !inputMonth) return 0;
  return (inputYear - startYear) * 12 + (inputMonth - startMonth) + 1;
}

function getLoanMonthNumberFromDateInput(dateInput) {
  if (!dateInput) return 0;
  return getLoanMonthNumberFromInput(dateInput.slice(0, 7));
}

function addDays(date, daysToAdd) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  return nextDate;
}

function getDateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getLastDateOfCalendarMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getInclusiveDayCount(startDate, endDate) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.max(Math.floor((getDateOnly(endDate) - getDateOnly(startDate)) / millisecondsPerDay) + 1, 0);
}

function getCurrentLoanSnapshot(values, rows, disbursements, extraPayments, today = new Date()) {
  const currentDate = getDateOnly(today);
  let previousRowIndex = -1;
  rows.forEach((row, index) => {
    const completedDate = getDateOnly(row.periodEnd || row.date);
    if (completedDate < currentDate) {
      previousRowIndex = index;
    }
  });
  const previousRow = previousRowIndex >= 0 ? rows[previousRowIndex] : null;
  const activeRow = previousRowIndex + 1 < rows.length ? rows[previousRowIndex + 1] : null;
  const nextRow = activeRow || previousRow;
  const baselineDate = previousRow
    ? getDateOnly(previousRow.periodEnd || previousRow.date)
    : activeRow
      ? getDateOnly(activeRow.periodStart || activeRow.date)
      : addDays(getLoanMonthDate(values.startMonth, 0, values.emiDay), -1);
  const baselinePrincipal = previousRow
    ? previousRow.closingBalance
    : activeRow
      ? activeRow.openingBalance
      : values.propertyStatus === "construction"
        ? 0
        : values.loanAmount;
  // This is principal-only. Interest accrued since the last EMI boundary is
  // shown separately as an estimate and is not added back into outstanding
  // principal, so we do not calculate interest on interest.
  let outstandingPrincipal = baselinePrincipal;

  const currentEvents = [
    ...disbursements.map((disbursement) => ({ ...disbursement, type: "disbursement" })),
    ...extraPayments.map((payment) => ({ ...payment, type: "prepayment" })),
  ]
    .filter((event) => {
      const eventDate = getDateOnly(event.date);
      const isSameDayAsBaseline = eventDate.getTime() === baselineDate.getTime();

      return (
        (eventDate > baselineDate || (isSameDayAsBaseline && event.frequency !== "once")) &&
        eventDate <= currentDate
      );
    })
    .sort((a, b) => a.date - b.date || (a.type === "disbursement" ? -1 : 1));

  currentEvents.forEach((event) => {
    if (event.type === "disbursement") {
      outstandingPrincipal += event.amount;
    } else {
      outstandingPrincipal = Math.max(outstandingPrincipal - event.amount, 0);
    }
  });

  const currentRate = nextRow?.rate ?? previousRow?.rate ?? values.interestRate;
  const monthEndDate = getLastDateOfCalendarMonth(currentDate);
  const estimatedInterestDays = getInclusiveDayCount(currentDate, monthEndDate);
  const estimatedInterest = calculateDailyInterest(outstandingPrincipal, currentRate, estimatedInterestDays);

  return {
    currentOutstandingPrincipal: Math.max(outstandingPrincipal, 0),
    currentMonthEstimatedInterest: roundInterestAmount(estimatedInterest),
    currentOutstandingDate: currentDate,
  };
}

function calculateDailyInterest(principal, annualRate, days) {
  return principal * (annualRate / 100) * (days / 365);
}

function calculateDailyInterestForPeriod(openingBalance, annualRate, periodStart, paymentDate, periodEvents, includePaymentDateInterest = false) {
  let interest = 0;
  let interestBalance = openingBalance;
  let extraPaid = 0;
  let disbursed = 0;
  let totalDisbursed = 0;
  let eventIndex = 0;
  let currentDate = addDays(periodStart, 1);

  function applyEvent(event) {
    if (event.type === "disbursement") {
      interestBalance += event.amount;
      disbursed += event.amount;
      totalDisbursed += event.amount;
    } else {
      const paymentAmount = Math.min(event.amount, interestBalance);
      interestBalance = Math.max(interestBalance - paymentAmount, 0);
      if (event.countInExtra !== false) {
        extraPaid += paymentAmount;
      }
    }
  }

  // Accrue interest for completed days only. The payment/EMI date itself should
  // update the balance, but it should not add another day of interest.
  while (currentDate < paymentDate) {
    while (eventIndex < periodEvents.length && periodEvents[eventIndex].date <= currentDate) {
      applyEvent(periodEvents[eventIndex]);
      eventIndex += 1;
    }

    interest += calculateDailyInterest(interestBalance, annualRate, 1);
    currentDate = addDays(currentDate, 1);
  }

  while (eventIndex < periodEvents.length && periodEvents[eventIndex].date <= paymentDate) {
    applyEvent(periodEvents[eventIndex]);
    eventIndex += 1;
  }

  if (includePaymentDateInterest) {
    // When explicitly requested, accrue one boundary day of interest after any
    // same-day balance changes have been applied.
    interest += calculateDailyInterest(interestBalance, annualRate, 1);
  }

  return {
    balance: interestBalance,
    disbursed,
    extraPaid,
    interest,
    totalDisbursed,
  };
}

function getBalanceAfterEventsThroughDate(openingBalance, events, throughDate) {
  return events.reduce((balance, event) => {
    if (event.date > throughDate) {
      return balance;
    }

    if (event.type === "disbursement") {
      return balance + event.amount;
    }

    return Math.max(balance - event.amount, 0);
  }, openingBalance);
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
  if (options.readOnly !== undefined) input.readOnly = options.readOnly;
  if (options.disabled !== undefined) input.disabled = options.disabled;
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

function createClassedInputCell(type, className, value, cellClassName, options = {}) {
  const cell = createInputCell(type, className, value, options);
  cell.classList.add(cellClassName);
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

function getExtraPaymentDateInputValue(values) {
  if (values.paymentDateInput) return values.paymentDateInput;
  const month = values.month || getLoanMonthNumberFromInput(values.monthInput) || 1;
  const dayMode = values.dayMode || getExtraPaymentDayMode(values.day);
  const day = dayMode === "specific" ? values.day || 1 : getExtraPaymentDay({ dayMode, day: values.day }, readNumber("emi-day") || DEFAULTS.emiDay);
  return formatDateInputValue(getLoanMonthDate(elements["start-month"].value || DEFAULTS.startMonth, month - 1, day));
}

function getExtraPaymentDateInputType(dayMode) {
  return dayMode === "specific" ? "date" : "month";
}

function getExtraPaymentDateInputDisplayValue(value, dayMode) {
  const fallbackMonth = elements["start-month"]?.value || DEFAULTS.startMonth;
  const normalizedValue = value || fallbackMonth;
  return getExtraPaymentDateInputType(dayMode) === "month"
    ? normalizedValue.slice(0, 7)
    : normalizedValue.length === 7
      ? `${normalizedValue}-01`
      : normalizedValue;
}

function addTableRow(body, rowClass, values) {
  const row = document.createElement("tr");
  row.className = rowClass;
  if (rowClass === "rate-row") {
    row.append(createInputCell("month", "month-input", values.monthInput || getLoanMonthInputValue(values.month || 1)));
  } else if (rowClass === "extra-row") {
    row.dataset.monthInput = values.monthInput || getLoanMonthInputValue(values.month || 1);
  } else {
    row.append(createInputCell("number", "month-input", values.month, { min: "0", step: "1" }));
  }

  if (rowClass === "rate-row") {
    row.append(createInputCell("number", "rate-input", values.rate, { min: "0", step: "0.01" }));
  } else {
    if (rowClass === "disbursement-row") {
      row.append(createInputCell("number", "percentage-input", values.percentage, { min: "0", max: "100", step: "0.01" }));
      row.append(createTextCell("base-amount-cell"));
      row.append(createTextCell("gst-amount-cell"));
      row.append(createTextCell("derived-amount-cell"));
      row.append(createInputCell("text", "bank-contribution-input", values.bankContribution ?? "", { inputMode: "numeric", placeholder: "Bank paid", readOnly: true }));
      row.append(createInputCell("text", "own-contribution-input", values.ownContribution ?? 0, { inputMode: "numeric", placeholder: "Auto own paid", readOnly: true }));
      row.append(createInputCell("number", "day-input", values.day || "1", { min: "1", max: "31", step: "1" }));
    }

    if (rowClass === "extra-row") {
      const dayMode = values.dayMode || getExtraPaymentDayMode(values.day);
      const paymentDate = getExtraPaymentDateInputValue(values);
      row.append(
        createSelectCell("day-mode-input", dayMode, [
          { value: "emi", label: "Same as EMI day" },
          { value: "last", label: "Last day of month" },
          { value: "specific", label: "Specific date" },
        ]),
      );
      row.append(
        createInputCell(
          getExtraPaymentDateInputType(dayMode),
          "payment-date-input",
          getExtraPaymentDateInputDisplayValue(paymentDate, dayMode),
        ),
      );
      row.append(
        createInputCell("text", "amount-input", values.amount, { inputMode: "numeric" }),
      );
      row.append(
        createSelectCell("frequency-input", values.frequency || "once", [
          { value: "once", label: "Single time" },
          { value: "monthly", label: "Each month" },
          { value: "alternate", label: "Every 2 months" },
        ]),
      );
      row.append(createClassedInputCell("date", "end-date-input", values.endDateInput || (values.endMonth ? formatDateInputValue(getLoanMonthDate(elements["start-month"].value || DEFAULTS.startMonth, values.endMonth - 1, values.day || 1)) : ""), "recurring-cell"));
      row.append(createClassedInputCell("number", "count-input", values.count || "", "recurring-cell", { min: "1", step: "1", placeholder: "N" }));
      updateExtraPaymentRowControls(row);
    }
  }

  row.append(createRemoveCell());
  body.append(row);
}

function syncDisbursementBankContributions(values) {
  let remainingLoanAmount = Math.max(values.loanAmount, 0);
  const rows = [...elements["disbursement-body"].querySelectorAll("tr")];
  const calculatedContributions = new Map();

  values.disbursements
    .map((disbursement, index) => ({ ...disbursement, index }))
    .forEach((disbursement) => {
      const disbursementAmount = getDisbursementTotalAmount(values.agreementValue, disbursement.percentage || 0);
      const hasExistingContribution =
        disbursement.bankContributionInput.trim() !== "" || disbursement.ownContributionInput.trim() !== "";
      const existingContributionTotal = disbursement.bankContribution + disbursement.ownContribution;
      const canKeepExistingContribution =
        hasExistingContribution &&
        existingContributionTotal === disbursementAmount &&
        disbursement.bankContribution <= remainingLoanAmount;
      const bankContribution = canKeepExistingContribution
        ? disbursement.bankContribution
        : Math.min(disbursementAmount, remainingLoanAmount);
      const ownContribution = canKeepExistingContribution
        ? disbursement.ownContribution
        : Math.max(disbursementAmount - bankContribution, 0);

      remainingLoanAmount = Math.max(remainingLoanAmount - bankContribution, 0);
      calculatedContributions.set(disbursement.index, { bankContribution, ownContribution });
    });

  rows.forEach((row, index) => {
    const bankContributionInput = row.querySelector(".bank-contribution-input");
    const ownContributionInput = row.querySelector(".own-contribution-input");
    const contribution = calculatedContributions.get(index);
    if (!bankContributionInput || !ownContributionInput || !contribution) return;

    bankContributionInput.value = String(contribution.bankContribution);
    ownContributionInput.value = String(contribution.ownContribution);
  });
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

function updateExtraPaymentRowControls(row) {
  const dayModeInput = row.querySelector(".day-mode-input");
  const paymentDateInput = row.querySelector(".payment-date-input");
  const frequencyInput = row.querySelector(".frequency-input");
  if (!dayModeInput || !paymentDateInput || !frequencyInput) return;

  const paymentDateValue = paymentDateInput.value;
  paymentDateInput.type = getExtraPaymentDateInputType(dayModeInput.value);
  paymentDateInput.value = getExtraPaymentDateInputDisplayValue(paymentDateValue, dayModeInput.value);
  paymentDateInput.disabled = false;

  const showRecurringFields = frequencyInput.value !== "once";
  row.querySelectorAll(".recurring-cell").forEach((cell) => {
    cell.hidden = !showRecurringFields;
  });
}

function updateExtraPaymentControls() {
  elements["extra-payment-body"].querySelectorAll(".extra-row").forEach(updateExtraPaymentRowControls);
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
  elements["eligibility-percentage"].value = DEFAULTS.eligibilityPercentage;
  elements["interest-rate"].value = DEFAULTS.interestRate;
  elements["loan-duration"].value = DEFAULTS.loanDuration;
  elements["emi-day"].value = DEFAULTS.emiDay;
  elements["property-status"].value = DEFAULTS.propertyStatus;
  elements["moratorium-option"].checked = DEFAULTS.moratorium;
  elements["possession-month"].value = DEFAULTS.possessionMonth;
  setDefaultStartMonth();
  populateRows(elements["disbursement-body"], "disbursement-row", DEFAULTS.disbursements);
  populateRows(elements["rate-change-body"], "rate-row", DEFAULTS.rateChanges);
  populateRows(elements["extra-payment-body"], "extra-row", DEFAULTS.extraPayments);
  toggleConstructionOptions();
  calculateAndRender();
}

function readScheduleRows(body, valueKey) {
  return [...body.querySelectorAll("tr")]
    .map((row) => {
      const monthInput = row.querySelector(".month-input").value;
      const valueInput = row.querySelector(valueKey === "rate" ? ".rate-input" : ".amount-input").value;
      const month = valueKey === "rate" ? getLoanMonthNumberFromInput(monthInput) : parseNumberInput(monthInput);
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

function getExtraPaymentDayMode(day) {
  if (day === "last") return "last";
  return day ? "specific" : "emi";
}

function normalizeExtraPaymentDayMode(value) {
  return ["emi", "last", "specific"].includes(value) ? value : "emi";
}

function readExtraPaymentRows() {
  return [...elements["extra-payment-body"].querySelectorAll("tr")]
    .map((row) => {
      const paymentDateInput = row.querySelector(".payment-date-input").value;
      const amountInput = row.querySelector(".amount-input").value;
      const endDateInput = row.querySelector(".end-date-input")?.value || "";
      const countInput = row.querySelector(".count-input").value;
      const dayMode = normalizeExtraPaymentDayMode(row.querySelector(".day-mode-input").value);
      const month = getLoanMonthNumberFromDateInput(paymentDateInput);
      const paymentDate = paymentDateInput ? new Date(`${paymentDateInput}T00:00:00`) : null;
      return {
        month,
        monthInput: paymentDateInput ? paymentDateInput.slice(0, 7) : "",
        paymentDateInput,
        amount: parseNumberInput(amountInput),
        amountInput,
        frequency: row.querySelector(".frequency-input").value,
        endMonth: getLoanMonthNumberFromDateInput(endDateInput),
        endDateInput,
        count: parseNumberInput(countInput),
        countInput,
        dayMode,
        day: dayMode === "specific" && paymentDate ? paymentDate.getDate() : 0,
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
    eligibilityPercentage: readNumber("eligibility-percentage"),
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
  const allowedFrequencies = new Set(["once", "monthly", "alternate"]);
  for (const row of rows) {
    if (!allowedFrequencies.has(row.frequency)) {
      return "Extra payment frequency must be single time, each month, or alternate month.";
    }
    if (row.endMonth && row.endMonth < row.month) {
      return "Extra payment end month cannot be before the start month.";
    }
    if (row.endMonth > maximumMonths) {
      return "Extra payment end month must be within the loan duration.";
    }
    if (row.count < 0 || row.count > maximumMonths) {
      return "Extra payment month count must be within the loan duration.";
    }
    if (row.frequency !== "once" && row.endMonth && row.count) {
      return "Use either an extra payment end month or an N-month count, not both.";
    }
    if (row.dayMode === "specific" && (row.day < 1 || row.day > 31)) {
      return "Specific extra payment day must be between 1 and 31.";
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
  if (!Number.isFinite(values.eligibilityPercentage) || values.eligibilityPercentage <= 0) {
    return "Bank eligibility percentage must be greater than zero.";
  }
  const eligibleLoanAmount = getEligibleLoanAmount(values.agreementValue, values.eligibilityPercentage);
  if (values.loanAmount > eligibleLoanAmount) {
    return `Loan amount opted cannot be greater than the bank eligibility cap of ${formatCurrency(eligibleLoanAmount)}.`;
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

    const totalDisbursementPercentage = values.disbursements.reduce((total, row) => total + row.percentage, 0);
    if (totalDisbursementPercentage > 100.000001) {
      return `Total disbursement percentage cannot be greater than 100% of the agreement value (currently ${formatPercent(totalDisbursementPercentage)}).`;
    }

    if (values.moratorium && (values.possessionMonth < 1 || values.possessionMonth > maximumMonths)) {
      return `Possession month must be between 1 and ${maximumMonths}.`;
    }
  }

  return "";
}

function getExtraPaymentDay(row, emiDay) {
  if (row.dayMode === "last") return "last";
  if (row.dayMode === "specific") return row.day;
  return emiDay;
}

function expandExtraPayments(rows, maximumMonths, startMonth, emiDay) {
  const payments = [];

  rows.forEach((row) => {
    const scheduleLength = row.frequency === "once" ? 1 : row.count || maximumMonths;
    const requestedFinalMonth = row.frequency === "once" ? row.month : row.endMonth || row.month + scheduleLength - 1;
    const finalMonth = Math.min(requestedFinalMonth, maximumMonths);
    const monthStep = row.frequency === "alternate" ? 2 : 1;
    const paymentDay = getExtraPaymentDay(row, emiDay);

    for (let month = row.month; month <= finalMonth; month += monthStep) {
      payments.push({
        month,
        amount: row.amount,
        day: paymentDay,
        dayMode: row.dayMode,
        frequency: row.frequency,
        date: getLoanMonthDate(startMonth, month - 1, paymentDay),
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

function getPaymentsForPeriod(payments, periodStart, periodEnd, includeEndDate = false) {
  return payments.filter((payment) => {
    const isAfterPeriodStart = payment.date > periodStart;
    const isBeforePeriodEnd = includeEndDate ? payment.date <= periodEnd : payment.date < periodEnd;
    return isAfterPeriodStart && isBeforePeriodEnd;
  });
}

function getPaymentsForMonth(payments, monthNumber) {
  return payments.filter((payment) => payment.month === monthNumber);
}

function calculateDailyInterestForCalendarMonth(openingBalance, annualRate, periodStart, periodEnd, periodEvents) {
  let interest = 0;
  let interestBalance = openingBalance;
  let extraPaid = 0;
  let disbursed = 0;
  let totalDisbursed = 0;
  let eventIndex = 0;
  let currentDate = getDateOnly(periodStart);
  const endDate = getDateOnly(periodEnd);

  function applyEvent(event) {
    if (event.type === "disbursement") {
      interestBalance += event.amount;
      disbursed += event.amount;
      totalDisbursed += event.amount;
    } else {
      const paymentAmount = Math.min(event.amount, interestBalance);
      interestBalance = Math.max(interestBalance - paymentAmount, 0);
      if (event.countInExtra !== false) {
        extraPaid += paymentAmount;
      }
    }
  }

  while (currentDate <= endDate) {
    while (eventIndex < periodEvents.length && getDateOnly(periodEvents[eventIndex].date) <= currentDate) {
      applyEvent(periodEvents[eventIndex]);
      eventIndex += 1;
    }

    interest += calculateDailyInterest(interestBalance, annualRate, 1);
    currentDate = addDays(currentDate, 1);
  }

  return {
    balance: interestBalance,
    disbursed,
    extraPaid,
    interest,
    totalDisbursed,
  };
}

function getRemainingDaysInMonth(paymentDate, periodEnd) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.max(Math.floor((getDateOnly(periodEnd) - getDateOnly(paymentDate)) / millisecondsPerDay) + 1, 0);
}


function roundInterestAmount(amount, useBoundaryDayRounding = false) {
  return useBoundaryDayRounding ? Math.floor(amount) : Math.round(amount);
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
  const extraPayments = expandExtraPayments(values.extraPayments, maximumMonths, values.startMonth, values.emiDay);
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
    (balance > 0.01 || getLoanMonthDate(values.startMonth, monthNumber - 1, 1) <= finalDisbursementDate);
    monthNumber += 1
  ) {
    const periodStart = getLoanMonthDate(values.startMonth, monthNumber - 1, 1);
    const periodEnd = getLastDateOfCalendarMonth(periodStart);
    const date = periodEnd;
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

    const periodDisbursements = getPaymentsForMonth(disbursements, monthNumber);
    const periodPayments = getPaymentsForMonth(extraPayments, monthNumber);
    const balanceEvents = [
      ...periodDisbursements.map((d) => ({ ...d, type: "disbursement" })),
      ...periodPayments.map((p) => ({ ...p, type: "prepayment" })),
    ].sort((a, b) => a.date - b.date || (a.type === "disbursement" ? -1 : 1));

    const baseInterestResult = calculateDailyInterestForCalendarMonth(
      balance,
      rate,
      periodStart,
      periodEnd,
      balanceEvents
    );

    let emi = 0;
    let interest = roundInterestAmount(baseInterestResult.interest);
    let principalComponent = 0;
    let interestResult = baseInterestResult;

    if (isMoratorium) {
      // Moratorium: show only the accrued interest, no principal reduction
      emi = interest;
      moratoriumInterest += interest;
    } else {
      // Normal EMI month: use the fixed EMI, derive principal from daily interest.
      // EMI principal is applied on the EMI date itself, before that day's
      // interest, so same-month interest is reduced from the payment day onward.
      const emiDate = getLoanMonthDate(values.startMonth, monthNumber - 1, values.emiDay);
      const balanceOnEmiDate = getBalanceAfterEventsThroughDate(balance, balanceEvents, emiDate);

      if (balanceOnEmiDate > 0.01) {
        emi = currentEmi;
        const dailyRate = rate / 100 / 365;
        const emiInterestDays = getRemainingDaysInMonth(emiDate, periodEnd);
        const emiInterestFactor = dailyRate * emiInterestDays;
        const estimatedInterest = Math.max(
          (baseInterestResult.interest - emiInterestFactor * emi) / Math.max(1 - emiInterestFactor, Number.EPSILON),
          0
        );
        principalComponent = Math.max(emi - roundInterestAmount(estimatedInterest), 0);

        const eventsWithEmi = [
          ...balanceEvents,
          {
            amount: principalComponent,
            countInExtra: false,
            date: emiDate,
            type: "prepayment",
          },
        ].sort((a, b) => a.date - b.date || (a.countInExtra === false ? -1 : 1));

        interestResult = calculateDailyInterestForCalendarMonth(
          balance,
          rate,
          periodStart,
          periodEnd,
          eventsWithEmi
        );
        interest = roundInterestAmount(interestResult.interest);

        emi = Math.min(currentEmi, interestResult.balance + interest);
        principalComponent = Math.max(emi - interest, 0);

        if (!firstEmi && emi > 0) {
          firstEmi = emi;
        }
      }
    }

    const extraPaid = interestResult.extraPaid;
    const disbursed = interestResult.disbursed;
    totalDisbursed += interestResult.totalDisbursed;
    balance = interestResult.balance;
    totalInterest += interest;
    totalPrincipal += principalComponent;
    totalExtra += extraPaid;

    rows.push({
      monthNumber,
      date,
      periodStart,
      periodEnd,
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

  const currentLoanSnapshot = getCurrentLoanSnapshot(values, rows, disbursements, extraPayments);

  return {
    agreementValue: values.agreementValue,
    loanAmount: values.loanAmount,
    loanAmountPercentage: calculatePercentage(values.loanAmount, values.agreementValue),
    eligibilityPercentage: values.eligibilityPercentage,
    eligibleLoanAmount: getEligibleLoanAmount(values.agreementValue, values.eligibilityPercentage),
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
    ...currentLoanSnapshot,
    payoffDate: rows.length ? rows[rows.length - 1].date : addMonths(values.startMonth, 0),
    monthsSaved: maximumMonths - rows.length,
  };
}

function renderSummary(result) {
  const metrics = [
    ["Agreement value", formatCurrency(result.agreementValue)],
    ["Loan amount opted", `${formatCurrency(result.loanAmount)} (${formatPercent(result.loanAmountPercentage)})`],
    ["Bank eligibility cap", `${formatCurrency(result.eligibleLoanAmount)} (${formatPercent(result.eligibilityPercentage)})`],
    ["Own contribution", `${formatCurrency(result.ownContribution)} (${formatPercent(result.ownContributionPercentage)})`],
    ["Total disbursed", formatCurrency(result.totalDisbursed)],
    [`Current outstanding principal (${dateFormatter.format(result.currentOutstandingDate)})`, formatCurrency(result.currentOutstandingPrincipal)],
    [`Estimated remaining month interest (${dateFormatter.format(result.currentOutstandingDate)})`, formatCurrency(result.currentMonthEstimatedInterest)],
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
  let values = readFormValues();
  syncDisbursementBankContributions(values);
  values = readFormValues();
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
    "Remaining principal End of Month",
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
    elements["loan-form"].addEventListener("change", (event) => {
      if (event.target.classList.contains("day-mode-input") || event.target.classList.contains("frequency-input")) {
        updateExtraPaymentRowControls(event.target.closest(".extra-row"));
      }
      calculateAndRender();
    });
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
      addTableRow(elements["disbursement-body"], "disbursement-row", { month: 1, percentage: 0, bankContribution: "", ownContribution: 0, day: 1 });
      calculateAndRender();
    });
    elements["add-rate-button"].addEventListener("click", () => {
      addTableRow(elements["rate-change-body"], "rate-row", { month: 1, rate: elements["interest-rate"].value });
    });
    elements["add-extra-button"].addEventListener("click", () => {
      addTableRow(elements["extra-payment-body"], "extra-row", { month: 1, amount: 0, frequency: "once", endMonth: "", count: "", dayMode: "emi" });
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
