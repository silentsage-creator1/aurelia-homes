import React, { useState, useMemo } from 'react';
import { Property } from '../types';
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Percent,
  Calendar,
  Building,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

interface MortgageCalculatorProps {
  initialProperty?: Property | null;
  onConsultAdvisor?: () => void;
}

export const MortgageCalculator: React.FC<MortgageCalculatorProps> = ({
  initialProperty,
  onConsultAdvisor,
}) => {
  const [activeTool, setActiveTool] = useState<'mortgage' | 'valuation'>('mortgage');

  // Mortgage State
  const [homePrice, setHomePrice] = useState<number>(initialProperty ? initialProperty.price : 4850000);
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(20);
  const [interestRate, setInterestRate] = useState<number>(5.65);
  const [loanTermYears, setLoanTermYears] = useState<number>(30);
  const [propertyTaxAnnual, setPropertyTaxAnnual] = useState<number>(
    initialProperty?.propertyTaxAnnual || Math.round(homePrice * 0.006)
  );
  const [homeInsuranceAnnual, setHomeInsuranceAnnual] = useState<number>(Math.round(homePrice * 0.0035));
  const [hoaMonthly, setHoaMonthly] = useState<number>(initialProperty?.hoaFeeMonthly || 450);

  // Valuation Tool State
  const [valAddress, setValAddress] = useState('18 Cheyne Walk, Chelsea, London');
  const [valType, setValType] = useState('Townhouse');
  const [valSqft, setValSqft] = useState(3800);
  const [valBeds, setValBeds] = useState(4);
  const [valCondition, setValCondition] = useState('Restored / Turnkey');
  const [valReportRequested, setValReportRequested] = useState(false);

  // Mortgage calculations
  const downPaymentAmount = useMemo(() => {
    return (homePrice * downPaymentPercent) / 100;
  }, [homePrice, downPaymentPercent]);

  const loanAmount = useMemo(() => {
    return Math.max(0, homePrice - downPaymentAmount);
  }, [homePrice, downPaymentAmount]);

  const monthlyPrincipalAndInterest = useMemo(() => {
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = loanTermYears * 12;
    if (monthlyRate === 0) return loanAmount / numberOfPayments;
    const payment =
      (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments))) /
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    return isNaN(payment) ? 0 : Math.round(payment);
  }, [loanAmount, interestRate, loanTermYears]);

  const monthlyTax = Math.round(propertyTaxAnnual / 12);
  const monthlyInsurance = Math.round(homeInsuranceAnnual / 12);
  const totalMonthlyPayment = monthlyPrincipalAndInterest + monthlyTax + monthlyInsurance + hoaMonthly;

  const totalLoanRepayment = monthlyPrincipalAndInterest * (loanTermYears * 12);
  const totalInterestPaid = Math.max(0, totalLoanRepayment - loanAmount);

  // Valuation calculation simulation
  const valuationResult = useMemo(() => {
    const basePpsqft = valType === 'Penthouse' ? 1850 : valType === 'Townhouse' ? 1450 : 1250;
    const conditionMultiplier =
      valCondition === 'Turnkey' || valCondition === 'Restored / Turnkey' ? 1.15 : 0.95;
    const estimatedValue = Math.round(valSqft * basePpsqft * conditionMultiplier);
    const lowRange = Math.round(estimatedValue * 0.94);
    const highRange = Math.round(estimatedValue * 1.06);
    const monthlyRentalEstimate = Math.round((estimatedValue * 0.042) / 12);

    return {
      estimatedValue,
      lowRange,
      highRange,
      monthlyRentalEstimate,
      yieldPercent: 4.2,
      confidence: 96,
    };
  }, [valSqft, valType, valCondition]);

  return (
    <div className="bg-white rounded-3xl border border-[#E4DFD3] shadow-md overflow-hidden max-w-6xl mx-auto">
      {/* Header Tabs */}
      <div className="bg-[#142D4E] text-white p-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#263445]">
        <div>
          <span className="text-xs uppercase tracking-wider text-[#C5A46D] font-bold">
            Aurelia Private Wealth Advisory
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold mt-1">
            Financial & Valuation Intelligence
          </h2>
        </div>

        {/* Segmented Switcher */}
        <div className="flex items-center p-1 bg-[#0D1E35] rounded-xl border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTool('mortgage')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTool === 'mortgage'
                ? 'bg-[#C5A46D] text-[#142D4E] shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Mortgage Planner</span>
          </button>
          <button
            onClick={() => setActiveTool('valuation')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTool === 'valuation'
                ? 'bg-[#C5A46D] text-[#142D4E] shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Property Valuation</span>
          </button>
        </div>
      </div>

      {activeTool === 'mortgage' ? (
        /* MORTGAGE CALCULATOR */
        <div className="p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Property Purchase Price
                </label>
                <span className="font-serif text-xl font-bold text-[#142D4E] tabular-nums">
                  ${homePrice.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="500000"
                max="25000000"
                step="50000"
                value={homePrice}
                onChange={(e) => setHomePrice(Number(e.target.value))}
                className="w-full accent-[#C5A46D]"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>$500k</span>
                <span>$10M</span>
                <span>$25M</span>
              </div>
            </div>

            {/* Down Payment Split */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Down Payment (%)
                </label>
                <div className="relative">
                  <Percent className="w-4 h-4 text-[#C5A46D] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="10"
                    max="90"
                    value={downPaymentPercent}
                    onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs font-semibold text-[#142D4E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Down Payment Amount ($)
                </label>
                <div className="py-2 px-3 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs font-bold text-[#142D4E] tabular-nums">
                  ${Math.round(downPaymentAmount).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Interest Rate & Term */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Interest Rate (% p.a.)
                </label>
                <div className="relative">
                  <Percent className="w-4 h-4 text-[#C5A46D] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.05"
                    min="2"
                    max="15"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs font-semibold text-[#142D4E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Loan Duration
                </label>
                <div className="flex gap-2">
                  {[15, 20, 30].map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setLoanTermYears(term)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                        loanTermYears === term
                          ? 'bg-[#142D4E] text-white border-[#142D4E]'
                          : 'bg-[#F7F5F0] text-slate-700 border-[#E4DFD3]'
                      }`}
                    >
                      {term} Yrs
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Taxes & HOA */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E4DFD3]">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Annual Tax ($)</label>
                <input
                  type="number"
                  step="500"
                  value={propertyTaxAnnual}
                  onChange={(e) => setPropertyTaxAnnual(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Annual Insurance ($)</label>
                <input
                  type="number"
                  step="250"
                  value={homeInsuranceAnnual}
                  onChange={(e) => setHomeInsuranceAnnual(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Monthly HOA/Dues ($)</label>
                <input
                  type="number"
                  step="50"
                  value={hoaMonthly}
                  onChange={(e) => setHoaMonthly(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Results Summary & Visual Breakdown Column */}
          <div className="lg:col-span-5 bg-[#F7F5F0] rounded-2xl p-6 border border-[#E4DFD3] space-y-6">
            <div className="text-center pb-5 border-b border-[#E4DFD3]">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                Estimated Monthly Outlay
              </span>
              <p className="font-serif text-3xl sm:text-4xl font-bold text-[#142D4E] tracking-tight tabular-nums mt-1">
                ${totalMonthlyPayment.toLocaleString()}
                <span className="text-xs text-slate-500 font-normal"> / month</span>
              </p>
            </div>

            {/* Visual Bar Breakdown */}
            <div className="space-y-3">
              <div className="h-4 w-full rounded-full overflow-hidden flex shadow-inner bg-slate-200">
                <div
                  style={{ width: `${(monthlyPrincipalAndInterest / totalMonthlyPayment) * 100}%` }}
                  className="bg-[#142D4E]"
                  title="Principal & Interest"
                />
                <div
                  style={{ width: `${(monthlyTax / totalMonthlyPayment) * 100}%` }}
                  className="bg-[#C5A46D]"
                  title="Property Tax"
                />
                <div
                  style={{ width: `${(monthlyInsurance / totalMonthlyPayment) * 100}%` }}
                  className="bg-[#9C7C3E]"
                  title="Homeowners Insurance"
                />
                <div
                  style={{ width: `${(hoaMonthly / totalMonthlyPayment) * 100}%` }}
                  className="bg-[#2E7D5B]"
                  title="HOA & Service Charge"
                />
              </div>

              {/* Legend */}
              <div className="space-y-2 text-xs pt-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#142D4E]" />
                    <span className="text-slate-600">Principal & Interest</span>
                  </span>
                  <span className="font-semibold text-[#142D4E] tabular-nums">
                    ${monthlyPrincipalAndInterest.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#C5A46D]" />
                    <span className="text-slate-600">Property Taxes</span>
                  </span>
                  <span className="font-semibold text-[#142D4E] tabular-nums">
                    ${monthlyTax.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#9C7C3E]" />
                    <span className="text-slate-600">Homeowners Insurance</span>
                  </span>
                  <span className="font-semibold text-[#142D4E] tabular-nums">
                    ${monthlyInsurance.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#2E7D5B]" />
                    <span className="text-slate-600">HOA & Maintenance</span>
                  </span>
                  <span className="font-semibold text-[#142D4E] tabular-nums">
                    ${hoaMonthly.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Loan Lifecycle Summary */}
            <div className="pt-4 border-t border-[#E4DFD3] space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Principal Borrowed:</span>
                <span className="font-semibold text-[#142D4E]">${loanAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Interest over {loanTermYears} Yrs:</span>
                <span className="font-semibold text-[#142D4E]">${Math.round(totalInterestPaid).toLocaleString()}</span>
              </div>
            </div>

            {/* Talk to mortgage advisor */}
            <button
              onClick={onConsultAdvisor}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-[#C5A46D] text-[#142D4E] hover:bg-[#B8975A] transition-all shadow-sm"
            >
              Consult an Aurelia Mortgage Specialist
            </button>
          </div>
        </div>
      ) : (
        /* INSTANT PROPERTY VALUATION */
        <div className="p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Property Address or Cadastral Plot
              </label>
              <input
                type="text"
                value={valAddress}
                onChange={(e) => setValAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs font-medium focus:outline-none focus:border-[#C5A46D]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Property Type
                </label>
                <select
                  value={valType}
                  onChange={(e) => setValType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs focus:outline-none"
                >
                  <option value="Townhouse">Historic Townhouse</option>
                  <option value="Penthouse">Penthouse</option>
                  <option value="Villa">Detached Villa</option>
                  <option value="Waterfront">Waterfront Estate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Interior Square Footage
                </label>
                <input
                  type="number"
                  step="100"
                  value={valSqft}
                  onChange={(e) => setValSqft(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Bedrooms
                </label>
                <select
                  value={valBeds}
                  onChange={(e) => setValBeds(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs focus:outline-none"
                >
                  <option value={2}>2 Bedrooms</option>
                  <option value={3}>3 Bedrooms</option>
                  <option value={4}>4 Bedrooms</option>
                  <option value={5}>5+ Bedrooms</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Finish & Condition
                </label>
                <select
                  value={valCondition}
                  onChange={(e) => setValCondition(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F7F5F0] border border-[#E4DFD3] rounded-xl text-xs focus:outline-none"
                >
                  <option value="Restored / Turnkey">Restored / Turnkey Luxury</option>
                  <option value="Good Condition">Good / Habitable</option>
                  <option value="Renovation Required">Renovation Required</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-[#F7F5F0] rounded-xl border border-[#E4DFD3] text-xs text-slate-600 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#2E7D5B] shrink-0 mt-0.5" />
              <span>
                Aurelia’s Automated Valuation Model incorporates audited HM Land Registry / ACRIS records, recent prime comp transfers, and localized capital appreciation indexes.
              </span>
            </div>
          </div>

          {/* Valuation Output */}
          <div className="lg:col-span-5 bg-[#F7F5F0] rounded-2xl p-6 border border-[#E4DFD3] space-y-6">
            <div className="text-center pb-5 border-b border-[#E4DFD3]">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                Estimated Current Valuation
              </span>
              <p className="font-serif text-3xl sm:text-4xl font-bold text-[#142D4E] tracking-tight tabular-nums mt-1">
                ${valuationResult.estimatedValue.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Range: ${valuationResult.lowRange.toLocaleString()} – ${valuationResult.highRange.toLocaleString()}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#E4DFD3]">
                <span className="text-slate-600">Model Confidence:</span>
                <span className="font-bold text-[#2E7D5B]">{valuationResult.confidence}% Verified</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#E4DFD3]">
                <span className="text-slate-600">Estimated Monthly Rental:</span>
                <span className="font-serif font-bold text-[#142D4E]">
                  ${valuationResult.monthlyRentalEstimate.toLocaleString()} / mo
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#E4DFD3]">
                <span className="text-slate-600">Gross Rental Yield:</span>
                <span className="font-bold text-[#9C7C3E]">{valuationResult.yieldPercent}%</span>
              </div>
            </div>

            {valReportRequested ? (
              <div className="p-3 bg-emerald-50 text-[#2E7D5B] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Full Surveyor Dossier Requested</span>
              </div>
            ) : (
              <button
                onClick={() => setValReportRequested(true)}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-[#142D4E] text-white hover:bg-[#0D1E35] transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#C5A46D]" />
                <span>Request Official Valuation Dossier</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
