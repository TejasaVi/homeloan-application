import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

/**
 * Pure EMI calculator (no hooks allowed here)
 */
function calculateEMI(P, annualRate, months) {
  const r = annualRate / 12 / 100;

  if (months <= 0) return 0;

  if (r === 0) return P / months;

  return (
    (P * r * Math.pow(1 + r, months)) /
    (Math.pow(1 + r, months) - 1)
  );
}

export default function HomeLoanAmortizationUI() {
  const [loanAmount, setLoanAmount] = useState(14600000);
  const [interestRate, setInterestRate] = useState(7.5);
  const [tenureYears, setTenureYears] = useState(20);

  const [errors, setErrors] = useState({});

  const [isUnderConstruction, setIsUnderConstruction] = useState(false);
  const [isPreEMIMode, setIsPreEMIMode] = useState(true);

  const [defaultExtraPayment, setDefaultExtraPayment] = useState(210000);

  const [extraPayments, setExtraPayments] = useState({});
  const [rateChanges, setRateChanges] = useState({});

  const [disbursements] = useState([
    { month: 1, amount: 2000000 },
  ]);

  const [schedule, setSchedule] = useState([]);

  const [hasGeneratedSchedule, setHasGeneratedSchedule] = useState(false);

  const totalInterestPaid = schedule.reduce(
    (sum, row) => sum + row.interest,
    0
  );
  const totalEmiPaid = schedule.reduce((sum, row) => sum + row.emi, 0);
  const totalExtraPaid = schedule.reduce(
    (sum, row) => sum + (row.extraApplied ?? 0),
    0
  );
  const totalOutflow = totalEmiPaid + totalExtraPaid;
  const totalMonths = schedule.length;
  const repaymentYears = Math.floor(totalMonths / 12);
  const repaymentRemainingMonths = totalMonths % 12;

  /**
   * Validation
   */
  const validateInputs = () => {
    const newErrors = {};

    if (!loanAmount || Number(loanAmount) <= 0)
      newErrors.loanAmount = "Loan amount must be greater than 0";

    if (
      !interestRate ||
      Number(interestRate) <= 0 ||
      Number(interestRate) > 20
    )
      newErrors.interestRate =
        "Interest rate must be between 0 and 20%";

    if (
      !tenureYears ||
      Number(tenureYears) <= 0 ||
      Number(tenureYears) > 40
    )
      newErrors.tenureYears =
        "Tenure must be between 1 and 40 years";

    if (defaultExtraPayment < 0)
      newErrors.extra = "Extra payment cannot be negative";

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  /**
   * Schedule generator
   */
  const generateSchedule = () => {
    if (!validateInputs()) return;

    const P = Number(loanAmount);
    const R = Number(interestRate);
    const Y = Number(tenureYears);

    let balance = isUnderConstruction ? 0 : P;

    const months = Y * 12;
    let scheduleTemp = [];

    for (let m = 1; m <= months; m++) {
      const disbursed = isUnderConstruction
        ? disbursements
            .filter((d) => d.month === m)
            .reduce((sum, d) => sum + d.amount, 0)
        : m === 1
        ? P
        : 0;

      balance += disbursed;

      const applicableRate = rateChanges[m] ?? R;
      const monthlyRate = applicableRate / 12 / 100;

      let emi = 0;
      let interest = balance * monthlyRate;
      let principal = 0;

      if (
        isUnderConstruction &&
        isPreEMIMode &&
        disbursed > 0
      ) {
        emi = interest;
        principal = 0;
      } else {
        emi = calculateEMI(
          balance,
          applicableRate,
          months - m + 1
        );

        const extra =
          extraPayments[m] !== undefined
            ? extraPayments[m]
            : defaultExtraPayment;

        principal = emi - interest + extra;

        balance -= principal;

        if (balance < 0) balance = 0;

        scheduleTemp.push({
          month: m,
          disbursed,
          emi: Math.round(emi),
          interest: Math.round(interest),
          principal: Math.round(principal),
          balance: Math.round(balance),
          extraApplied: extra,
        });

        if (balance === 0) break;

        continue;
      }

      scheduleTemp.push({
        month: m,
        disbursed,
        emi: Math.round(emi),
        interest: Math.round(interest),
        principal: Math.round(principal),
        balance: Math.round(balance),
        extraApplied: 0,
      });
    }

    setSchedule(scheduleTemp);
  };

  /**
   * AUTO‑RECALC when user edits rate / extra values
   */
  useEffect(() => {
    if (hasGeneratedSchedule) {
      generateSchedule();
    }
  }, [
    extraPayments,
    rateChanges,
    defaultExtraPayment,
    interestRate,
    hasGeneratedSchedule,
  ]);

  /**
   * UI
   */
  return (
    <div className="p-6 grid gap-6">
      <Card className="rounded-2xl shadow-lg">
        <CardContent className="p-4 grid gap-4">
          <h2 className="text-xl font-bold">Loan Inputs</h2>

          <div className="flex items-center gap-3">
            <Switch
              checked={isUnderConstruction}
              onCheckedChange={setIsUnderConstruction}
            />
            <Label>
              {isUnderConstruction
                ? "Under Construction Property"
                : "Ready Possession Property"}
            </Label>
          </div>

          {isUnderConstruction && (
            <div className="flex items-center gap-3">
              <Switch
                checked={isPreEMIMode}
                onCheckedChange={setIsPreEMIMode}
              />
              <Label>
                {isPreEMIMode
                  ? "Pre‑EMI (interest only till possession)"
                  : "Full EMI during construction"}
              </Label>
            </div>
          )}

          <div>
            <Label>Loan Amount (₹)</Label>
            <Input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              placeholder="Example: 5000000"
            />
            {errors.loanAmount && (
              <p className="text-red-500 text-sm">
                {errors.loanAmount}
              </p>
            )}
          </div>

          <div>
            <Label>Interest Rate (%)</Label>
            <Input
              type="number"
              value={interestRate}
              onChange={(e) =>
                setInterestRate(Number(e.target.value))
              }
              placeholder="Typical range: 7% – 10%"
            />
            {errors.interestRate && (
              <p className="text-red-500 text-sm">
                {errors.interestRate}
              </p>
            )}
          </div>

          <div>
            <Label>Loan Tenure (Years)</Label>
            <Input
              type="number"
              value={tenureYears}
              onChange={(e) =>
                setTenureYears(Number(e.target.value))
              }
              placeholder="Typical range: 15 – 30 years"
            />
            {errors.tenureYears && (
              <p className="text-red-500 text-sm">
                {errors.tenureYears}
              </p>
            )}
          </div>

          <div>
            <Label>Default Monthly Prepayment (Optional)</Label>
            <Input
              type="number"
              value={defaultExtraPayment}
              onChange={(e) =>
                setDefaultExtraPayment(Number(e.target.value))
              }
              placeholder="Example: 5000"
            />
            {errors.extra && (
              <p className="text-red-500 text-sm">
                {errors.extra}
              </p>
            )}
          </div>

          <Button
            onClick={() => {
              setHasGeneratedSchedule(true);
              generateSchedule();
            }}
          >
            Generate Amortization Schedule
          </Button>
        </CardContent>
      </Card>

      {schedule.length > 0 && (
        <>
          <Card className="rounded-2xl shadow-lg">
            <CardContent className="p-4 overflow-auto">
              <h2 className="text-xl font-bold mb-3">
                Amortization Schedule
              </h2>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Disbursed</TableHead>
                    <TableHead>EMI</TableHead>
                    <TableHead>Interest</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Interest Rate (%)</TableHead>
                    <TableHead>Extra</TableHead>
                    <TableHead>Balance</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {schedule.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell>{row.month}</TableCell>
                      <TableCell>{row.disbursed}</TableCell>
                      <TableCell>{row.emi}</TableCell>
                      <TableCell>{row.interest}</TableCell>
                      <TableCell>{row.principal}</TableCell>

                      <TableCell>
                        <Input
                          type="number"
                          value={
                            rateChanges[row.month] ?? interestRate
                          }
                          onChange={(e) => {
                            const val = Number(e.target.value);

                            setRateChanges((prev) => ({
                              ...prev,
                              [row.month]: val,
                            }));
                          }}
                          className="w-24"
                        />
                      </TableCell>

                      <TableCell>
                        <Input
                          type="number"
                          value={
                            extraPayments[row.month] ??
                            row.extraApplied
                          }
                          onChange={(e) => {
                            const val = Number(e.target.value);

                            setExtraPayments((prev) => ({
                              ...prev,
                              [row.month]: val,
                            }));
                          }}
                          className="w-24"
                        />
                      </TableCell>

                      <TableCell>{row.balance}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-lg">
            <CardContent className="p-4 grid gap-3">
              <h2 className="text-xl font-bold">Loan Summary</h2>
              <p>
                <strong>Estimated Repayment Time:</strong>{" "}
                {repaymentYears} year(s) {repaymentRemainingMonths} month(s)
              </p>
              <p>
                <strong>Total Expected Interest Payment:</strong> ₹
                {Math.round(totalInterestPaid).toLocaleString("en-IN")}
              </p>
              <p>
                <strong>Total EMI Paid:</strong> ₹
                {Math.round(totalEmiPaid).toLocaleString("en-IN")}
              </p>
              <p>
                <strong>Total Extra Prepayment:</strong> ₹
                {Math.round(totalExtraPaid).toLocaleString("en-IN")}
              </p>
              <p>
                <strong>Total Expected Outflow:</strong> ₹
                {Math.round(totalOutflow).toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/**
 * BASIC SELF‑TESTS (sanity checks for EMI math)
 */
if (typeof window !== "undefined") {
  console.assert(
    Math.round(calculateEMI(1000000, 10, 240)) > 9000,
    "EMI sanity test failed"
  );

  console.assert(
    calculateEMI(1000000, 0, 240) === 1000000 / 240,
    "Zero interest EMI test failed"
  );
}
