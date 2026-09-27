"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Copy,
  Share2,
  ShieldCheck,
  Sliders,
  Network,
  Activity,
  CheckCircle2,
  Info,
  Clock,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";

interface MedicationReviewSMRProps {
  onBackToTriage?: () => void;
  onTabChange?: (tab: string) => void;
}

// Circadian 24H Nocturia & Hemodynamic Profile Data
const CIRCADIAN_PROFILE_DATA = [
  { time: "20:00", sedative: 25, map: 86 },
  { time: "21:00", sedative: 48, map: 84 },
  { time: "22:30", sedative: 72, map: 79 },
  { time: "00:00", sedative: 88, map: 73 },
  { time: "01:30", sedative: 94, map: 69 },
  { time: "02:00", sedative: 98, map: 67 },
  { time: "02:30", sedative: 96, map: 65 },
  { time: "03:30", sedative: 89, map: 64 }, // Nadir MAP 64
  { time: "04:30", sedative: 78, map: 68 },
  { time: "06:00", sedative: 60, map: 74 },
  { time: "08:00", sedative: 42, map: 81 },
  { time: "10:00", sedative: 28, map: 85 },
  { time: "12:00", sedative: 18, map: 88 },
  { time: "14:00", sedative: 14, map: 89 },
];

export function MedicationReviewSMR({
  onBackToTriage,
  onTabChange,
}: MedicationReviewSMRProps) {
  // Checkbox states for the 3 clinical levers
  const [lever1, setLever1] = useState(true); // Lorazepam Taper 50%
  const [lever2, setLever2] = useState(true); // Deprescribe Diphenhydramine
  const [lever3, setLever3] = useState(true); // Reschedule Furosemide

  // Queue states for the right-hand action cards
  const [queueA, setQueueA] = useState(true);
  const [queueB, setQueueB] = useState(true);
  const [queueC, setQueueC] = useState(true);

  const [signedSuccess, setSignedSuccess] = useState(false);
  const [expandOtherMeds, setExpandOtherMeds] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Dynamic calculation of simulated risk based on checkboxes
  const baselineRisk = 68.4;
  let simulatedRisk = baselineRisk;
  if (lever1) simulatedRisk -= 16.2;
  if (lever2) simulatedRisk -= 10.2;
  if (lever3) simulatedRisk -= 7.8;
  simulatedRisk = Math.max(15, Number(simulatedRisk.toFixed(1)));
  const reductionPts = Number((baselineRisk - simulatedRisk).toFixed(1));
  const relativeReductionPct = Math.round((reductionPts / baselineRisk) * 100);

  const activeLeversCount = [lever1, lever2, lever3].filter(Boolean).length;

  const handleCopyEhr = () => {
    const summary = `GeriSafe CDSS SMR Note - Robert Miller (#994201, Bed 401-A)\nBaseline Risk: ${baselineRisk}% (Critical) -> Simulated Post-Rx: ${simulatedRisk}% (Moderate)\nActions: Lorazepam 50% taper, Deprescribe Diphenhydramine 25mg, Reschedule Furosemide 08:00 AM.`;
    navigator.clipboard.writeText(summary);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleSignOrders = () => {
    setSignedSuccess(true);
    setTimeout(() => setSignedSuccess(false), 4000);
  };

  return (
    <div className="w-full space-y-3.5 pb-8 font-sans antialiased text-slate-900">
      {/* 1. TOP BREADCRUMB SUB-HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 px-1 text-xs text-slate-500">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onBackToTriage}
            className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-950 font-semibold transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Triage Worklist</span>
          </button>
          <span className="text-slate-300">•</span>
          <span className="text-slate-600">Inpatient Ward 4B / Bed A</span>
          <span className="text-slate-300">•</span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
            SMR Clinical Review Active
          </span>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>EHR Bridge: EPIC Hyperspace v2024.1 (Live Sync)</span>
          </div>
          <span className="text-slate-300">•</span>
          <span className="text-slate-400 font-mono text-[11px]">
            Session Token: CDS-994201-B
          </span>
        </div>
      </div>

      {/* 2. TOP PATIENT BANNER CARD */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Patient Demographics & Fall Risk Badges */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center justify-center text-base shrink-0 shadow-2xs">
              RM
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                  Robert Miller
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                  <span>68.4% Critical Fall Risk</span>
                </span>
                <span className="rounded-full border border-amber-200 bg-[#fef9c3]/70 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  Frailty Index: 0.44 (Moderate-Severe)
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                84yo Male • Bed 401-A (Telemetry Pod) • MRN: #994201 • LOS: 4 Days • Attending: Dr. S. Chen, MD
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleCopyEhr}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>{copyFeedback ? "Copied!" : "Copy to EHR"}</span>
            </button>

            <button
              onClick={handleCopyEhr}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Export SBAR</span>
            </button>

            <button
              onClick={() => onTabChange?.("Patient Trajectory")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 shadow-2xs hover:bg-emerald-100 transition cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-700" />
              <span>Patient Trajectory →</span>
            </button>

            <button
              onClick={handleSignOrders}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1b3b36] hover:bg-[#142e2a] px-4 py-2 text-xs font-semibold text-white shadow-sm transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Sign CPOE Orders (3)</span>
            </button>
          </div>
        </div>

        {/* 5-Column Clinical Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3.5 mt-3.5 border-t border-slate-100 text-xs">
          {/* Col 1 */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              RENAL FUNCTION
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 font-semibold text-slate-800">
              <span>Cr: 1.80 • eGFR: 31</span>
              <span className="rounded bg-rose-50 border border-rose-200 px-1 py-0.1 text-[9px] font-bold text-rose-600 uppercase">
                CKD 3b
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              CrCl 29 mL/min (Cockcroft)
            </span>
          </div>

          {/* Col 2 */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              HEMODYNAMICS
            </span>
            <div className="mt-0.5 font-semibold text-rose-600">
              118/74 mmHg <span className="text-[11px]">↓ -18 drop</span>
            </div>
            <span className="text-[11px] text-rose-600 font-medium">
              Postural orthostasis flagged
            </span>
          </div>

          {/* Col 3 */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              ANTHROPOMETRICS
            </span>
            <div className="mt-0.5 font-semibold text-slate-800">
              72.4 kg • BMI 24.1
            </div>
            <span className="text-[11px] text-slate-500">
              IBW: 68.0 kg (Euvolemic)
            </span>
          </div>

          {/* Col 4 */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              SENSORY &amp; MOBILITY
            </span>
            <div className="mt-0.5 font-semibold text-slate-800">
              TUG: 24s • Unassisted Walker
            </div>
            <span className="text-[11px] text-slate-500">
              Mild vestibular sensory lag
            </span>
          </div>

          {/* Col 5 */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              TELEMETRY STALENESS
            </span>
            <div className="mt-0.5 font-semibold text-slate-800">
              Labs synced 42m ago
            </div>
            <span className="text-[11px] text-amber-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Vit B12 pending (Lab Core)
            </span>
          </div>
        </div>

        {signedSuccess && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 flex items-center gap-2 text-xs text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Orders signed! 3 deprescribing orders authorized by Dr. Sarah Chen and transmitted to EHR Pharmacy queue.
            </span>
          </div>
        )}
      </div>

      {/* 3. TWO-COLUMN MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ================= LEFT COLUMN (lg:col-span-7) ================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* CARD 1: Predicted Fall & Syncope Risk Analysis */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <h2 className="font-bold text-slate-900 text-sm tracking-tight">
                  Predicted Fall &amp; Syncope Risk Analysis
                </h2>
              </div>
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-600">
                Acuity Grade 4 • High Acuity Fall Event &lt; 48h
              </span>
            </div>

            {/* Big Risk Metric Block & Severity Curve */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 my-4 items-center">
              {/* Left Metric */}
              <div className="md:col-span-5">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                    68.4%
                  </span>
                  <span className="text-xs font-bold text-rose-600">
                    +3.76x Baseline
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Ward 4B Baseline: 18.2%
                </div>
              </div>

              {/* Right Severity Gauge */}
              <div className="md:col-span-7 flex flex-col justify-center">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-slate-500 font-medium">Risk Severity Curve</span>
                  <span className="font-bold text-rose-600">
                    Extreme Inpatient Hazard (Top 4%)
                  </span>
                </div>

                {/* Continuous Multi-Stop Gradient Bar */}
                <div className="relative w-full">
                  <div
                    className="h-2.5 w-full rounded-full overflow-hidden"
                    style={{
                      background:
                        "linear-gradient(to right, #16a34a 0%, #eab308 28%, #ea580c 55%, #dc2626 100%)",
                    }}
                  />
                  {/* Pin marker for Robert Miller at 68.4% */}
                  <div
                    className="absolute -top-1 w-2.5 h-4.5 bg-slate-900 border-2 border-white rounded-full shadow-sm"
                    style={{ left: "68.4%", transform: "translateX(-50%)" }}
                  />
                </div>

                {/* Subtext milestones */}
                <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1.5">
                  <span>0% Normal</span>
                  <span>25% Watch</span>
                  <span>50% Elevated</span>
                  <span className="font-bold text-rose-600">68.4% Robert Miller</span>
                </div>
              </div>
            </div>

            {/* Model Metadata */}
            <div className="flex items-center justify-between text-xs text-slate-500 py-2 border-t border-slate-100">
              <span>Calibrated Gradient Boosted Survival Model • AUROC 0.89</span>
              <span>95% CI [82.1% - 73.8%]</span>
            </div>

            {/* SHAP Attributions Header */}
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-3 pb-1 border-t border-slate-100">
              <span>KEY FEATURE ATTRIBUTIONS (SHAP IMPACT WEIGHT)</span>
              <span>Total Explained Variance: 88.4%</span>
            </div>

            {/* 4 SHAP Feature Bars */}
            <div className="space-y-3 pt-2">
              {/* Feature 1 */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-800">
                    wDDI Regimen Burden: Synergistic GABA-A &amp; Volume Depletion
                  </span>
                  <span className="font-mono font-semibold text-slate-700">+0.218</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-[#0d9488]" style={{ width: "65%" }} />
                </div>
              </div>

              {/* Feature 2 */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-800">
                    Serum Creatinine Elevation (Reduced Clearance CrCl 29 mL/min)
                  </span>
                  <span className="font-mono font-semibold text-slate-700">+0.174</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-[#0d9488]" style={{ width: "52%" }} />
                </div>
              </div>

              {/* Feature 3 */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-800">
                    CNS Polypharmacy Active (Sedation &amp; Ataxia Risk)
                  </span>
                  <span className="font-mono font-semibold text-slate-700">+0.130</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-[#0d9488]" style={{ width: "39%" }} />
                </div>
              </div>

              {/* Feature 4 */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-800">
                    Loop Diuretic Initiation (Acute Orthostasis &amp; Nocturia)
                  </span>
                  <span className="font-mono font-semibold text-slate-700">+0.092</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-[#0d9488]" style={{ width: "28%" }} />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs pt-3 mt-3 border-t border-slate-100">
              <button
                onClick={onBackToTriage}
                className="text-emerald-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Inspect Full 29-Feature Attribution Matrix</span>
                <span>→</span>
              </button>
              <span className="text-[11px] text-slate-400">SHAP TreeExplainer v0.42</span>
            </div>
          </div>

          {/* CARD 2: Counterfactual Deprescribing Simulation */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-700" />
                <h2 className="font-bold text-slate-900 text-sm tracking-tight">
                  Counterfactual Deprescribing Simulation
                </h2>
              </div>
              <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                Interactive Real-Time Model
              </span>
            </div>

            {/* Simulation Comparison Box */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 my-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs mb-2">
                <div className="font-semibold text-slate-800">
                  <span className="text-rose-600 font-bold">BASELINE: 68.4% (CRITICAL)</span>
                  {" → "}
                  <span className="text-emerald-800 font-bold">
                    SIMULATED POST-RX: {simulatedRisk}% (MODERATE)
                  </span>
                </div>
                <span className="font-bold text-emerald-700">
                  -{reductionPts} pts reduction (-{relativeReductionPct}% Relative Risk)
                </span>
              </div>

              {/* Side-by-Side Acuity Bars */}
              <div className="space-y-2 pt-1">
                {/* Pre-Intervention */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                    <span>Pre-Intervention Acuity</span>
                    <span className="font-bold text-rose-600">68.4%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full rounded-full bg-[#dc2626]" style={{ width: "68.4%" }} />
                  </div>
                </div>

                {/* Simulated Trajectory */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                    <span>Simulated Counterfactual Trajectory</span>
                    <span className="font-bold text-emerald-700">{simulatedRisk}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#0d9488] transition-all duration-300"
                      style={{ width: `${simulatedRisk}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Clinical Levers Header */}
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              TOGGLE CLINICAL LEVERS (PROJECTED IMPACT)
            </div>

            {/* 3 Interactive Levers */}
            <div className="space-y-2">
              {/* Lever 1 */}
              <div
                onClick={() => setLever1(!lever1)}
                className={`rounded-xl border p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                  lever1
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-slate-200 bg-white opacity-70"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={lever1}
                    onChange={() => {}}
                    className="mt-0.5 w-4 h-4 rounded text-[#1b3b36] focus:ring-0 cursor-pointer accent-[#1b3b36]"
                  />
                  <div>
                    <span className="font-bold text-slate-900 text-xs">
                      Plan 1: Lorazepam Taper 50%
                    </span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Reduce 1.0mg to 0.5mg PO QHS x 3 nights; non-pharmacologic sleep cues
                    </div>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 shrink-0">
                  -16.2% Risk Drop
                </span>
              </div>

              {/* Lever 2 */}
              <div
                onClick={() => setLever2(!lever2)}
                className={`rounded-xl border p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                  lever2
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-slate-200 bg-white opacity-70"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={lever2}
                    onChange={() => {}}
                    className="mt-0.5 w-4 h-4 rounded text-[#1b3b36] focus:ring-0 cursor-pointer accent-[#1b3b36]"
                  />
                  <div>
                    <span className="font-bold text-slate-900 text-xs">
                      Plan 2: Deprescribe PRN Diphenhydramine 25mg
                    </span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Discontinue antihistaminic sedation; prevent delirium exacerbation
                    </div>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 shrink-0">
                  -10.2% Risk Drop
                </span>
              </div>

              {/* Lever 3 */}
              <div
                onClick={() => setLever3(!lever3)}
                className={`rounded-xl border p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                  lever3
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-slate-200 bg-white opacity-70"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={lever3}
                    onChange={() => {}}
                    className="mt-0.5 w-4 h-4 rounded text-[#1b3b36] focus:ring-0 cursor-pointer accent-[#1b3b36]"
                  />
                  <div>
                    <span className="font-bold text-slate-900 text-xs">
                      Plan 3: Reschedule Furosemide strictly to 08:00 AM
                    </span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Eliminate nighttime voiding &amp; nocturnal orthostatic surge
                    </div>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 shrink-0">
                  -7.8% Risk Drop
                </span>
              </div>
            </div>
          </div>

          {/* CARD 3: Causal Mechanistic Cascade & Circadian Interaction */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-slate-700" />
                <h2 className="font-bold text-slate-900 text-sm tracking-tight">
                  Causal Mechanistic Cascade &amp; Circadian Interaction
                </h2>
              </div>
              <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                High Confidence (94.8%)
              </span>
            </div>

            {/* Synergy Node Diagram */}
            <div className="mt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                INTERACTIVE PHARMACOLOGICAL SYNERGY NODE
              </span>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center mt-2.5">
                {/* Left triggers */}
                <div className="md:col-span-4 space-y-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-2.5 border-l-4 border-l-[#ea580c]">
                    <span className="text-[10px] font-bold text-[#ea580c] uppercase">Trigger A</span>
                    <div className="font-bold text-xs text-slate-900">Lorazepam 1.0 mg PO</div>
                    <span className="text-[10px] text-slate-500">Admin 21:00</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-2.5 border-l-4 border-l-[#ea580c]">
                    <span className="text-[10px] font-bold text-[#ea580c] uppercase">Trigger B</span>
                    <div className="font-bold text-xs text-slate-900">Furosemide 40 mg</div>
                  </div>
                </div>

                {/* Center mechanism */}
                <div className="md:col-span-4 space-y-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-left">
                    <span className="text-[10px] font-semibold text-slate-500">Mechanism</span>
                    <div className="font-bold text-slate-800">GABA-A Allosteric Agonism</div>
                    <span className="text-[11px] text-slate-500">Cerebellar ataxia</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-left">
                    <span className="text-[11px] text-slate-700">
                      Volume Depletion + SBP Drop: -18 mmHg on bed exit
                    </span>
                  </div>
                </div>

                {/* Right Convergence Event */}
                <div className="md:col-span-4">
                  <div className="rounded-xl border border-rose-200 bg-[#fff1f2] p-3 text-left">
                    <span className="text-[10px] font-bold text-[#dc2626] uppercase tracking-wider">
                      CONVERGENCE EVENT
                    </span>
                    <div className="font-bold text-sm text-[#dc2626] mt-0.5">
                      Postural Collapse &amp; Fall
                    </div>
                    <div className="text-[11px] text-rose-700 mt-1">
                      Midnight unassisted voiding
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Clinical Note */}
            <div className="text-xs text-slate-600 leading-relaxed pt-3 mt-3 border-t border-slate-100">
              <strong className="font-semibold text-slate-800">Pharmacokinetic Vulnerability:</strong>{" "}
              Impaired renal clearance (CrCl 29 mL/min, serum creatinine 1.80 mg/dL) substantially prolongs the elimination half-life of lorazepam active metabolites. When coupled with loop diuresis, the patient experiences profound cerebral hypoperfusion upon unassisted standing between 02:00 and 05:00.
            </div>

            {/* Circadian Nocturia & Hemodynamic Profile Chart (Dark Container) */}
            <div className="rounded-xl bg-[#131f1c] text-white p-4 mt-3.5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold tracking-tight">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="uppercase text-[11px] tracking-wider">
                    CIRCADIAN NOCTURIA &amp; HEMODYNAMIC PROFILE (24H)
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">Telemetry Interpolation</span>
              </div>

              {/* Chart */}
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={CIRCADIAN_PROFILE_DATA}
                    margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="time"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      domain={[0, 110]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        borderColor: "#334155",
                        fontSize: "11px",
                        color: "#fff",
                      }}
                    />
                    {/* Critical window highlight: 02:00 to 04:30 */}
                    <ReferenceArea
                      x1="02:00"
                      x2="04:30"
                      stroke="#ef4444"
                      strokeOpacity={0.6}
                      fill="#ef4444"
                      fillOpacity={0.15}
                      strokeDasharray="3 3"
                    />
                    {/* Sedative concentration curve */}
                    <Line
                      type="monotone"
                      dataKey="sedative"
                      name="Sedative Brain Conc"
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    {/* Mean Arterial Pressure curve */}
                    <Line
                      type="monotone"
                      dataKey="map"
                      name="Mean Arterial Pressure (MAP)"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Legend & Nadir info */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-800 text-[11px]">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2.5 h-1 bg-[#ef4444] rounded-full" />
                    Sedative Brain Concentration
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2.5 h-1 bg-[#06b6d4] rounded-full" />
                    Mean Arterial Pressure (MAP)
                  </span>
                </div>
                <span className="text-[#ef4444] font-bold">
                  Nadir MAP: 64 mmHg @ 03:30 AM
                </span>
              </div>
            </div>

            {/* Evidence Guidelines */}
            <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-100 flex-wrap text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Evidence Guild:</span>
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                AGS Beers 2025 Table 2
              </span>
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                STOPP v3 Section B: FRIDs
              </span>
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                KDIGO 2024 Stage 3b Dosing
              </span>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN (lg:col-span-5) ================= */}
        <div className="lg:col-span-5 space-y-4">
          {/* CARD 1: Active Inpatient Medications */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900 text-sm tracking-tight">
                  Active Inpatient Medications
                </h2>
                <div className="text-[11px] text-slate-500">
                  14 Prescriptions • Ranked by Fall Risk Attribution Index (FRAI)
                </div>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                3 High FRIDs
              </span>
            </div>

            {/* High FRID Medication Cards */}
            <div className="space-y-3 pt-3">
              {/* Med 1: Lorazepam */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 border-l-4 border-l-[#ea580c] shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 text-xs">
                      Lorazepam 1.0 mg PO
                    </span>
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <span className="rounded-full bg-rose-50 text-rose-600 px-2 py-0.5 text-[10px] font-bold">
                    FRAI: 0.38
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 mt-1">
                  Schedule: QHS (Bedtime) • Dispensed 21:00
                </div>

                <div className="flex items-center gap-1.5 mt-2">
                  <span className="rounded border border-amber-200 bg-[#fffbeb] px-1.5 py-0.2 text-[10px] font-bold text-amber-900 uppercase">
                    FRID: SEDATIVE
                  </span>
                  <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.2 text-[10px] font-medium text-emerald-800">
                    STOPP v3: Benzodiazepine
                  </span>
                </div>

                <div className="text-[11px] font-medium text-rose-600 mt-2">
                  Active metabolite accumulation risk under CrCl 29 mL/min.
                </div>
              </div>

              {/* Med 2: Diphenhydramine */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 border-l-4 border-l-[#ea580c] shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 text-xs">
                      Diphenhydramine 25 mg PO
                    </span>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <span className="rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[10px] font-bold">
                    FRAI: 0.29
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 mt-1">
                  Schedule: PRN (Insomnia) • Last given: Yesterday 23:30
                </div>

                <div className="flex items-center gap-1.5 mt-2">
                  <span className="rounded border border-amber-200 bg-[#fffbeb] px-1.5 py-0.2 text-[10px] font-bold text-amber-900 uppercase">
                    FRID: ANTICHOLINERGIC
                  </span>
                  <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.2 text-[10px] font-medium text-emerald-800">
                    ACB Score: +3 (Delirium Precursor)
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 mt-2">
                  Inappropriate in elderly; potent cognitive impairment (AGS Beers 2023).
                </div>
              </div>

              {/* Med 3: Furosemide */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 border-l-4 border-l-[#f59e0b] shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 text-xs">
                      Furosemide 40 mg PO
                    </span>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <span className="rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[10px] font-bold">
                    FRAI: 0.18
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 mt-1">
                  Schedule: Daily (Morning) • Given: 08:30 AM
                </div>

                <div className="flex items-center gap-1.5 mt-2">
                  <span className="rounded border border-amber-200 bg-[#fffbeb] px-1.5 py-0.2 text-[10px] font-bold text-amber-900 uppercase">
                    FRID: DIURETIC
                  </span>
                  <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.2 text-[10px] font-medium text-emerald-800">
                    Orthostatic Risk
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 mt-2">
                  Heart failure euvolemic maintenance; peak voiding during nocturnal bed transfer.
                </div>
              </div>
            </div>

            {/* Expand other medications */}
            <div className="pt-2 mt-2 border-t border-slate-100 text-center">
              <button
                onClick={() => setExpandOtherMeds(!expandOtherMeds)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 py-1 cursor-pointer"
              >
                <span>
                  {expandOtherMeds ? "Hide other medications" : "View 11 other stable medications (Atorvastatin, Lisinopril, Omeprazole, etc.)"}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandOtherMeds ? "rotate-180" : ""}`} />
              </button>

              {expandOtherMeds && (
                <div className="mt-2 space-y-1.5 text-left text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                  <div className="flex justify-between py-0.5">
                    <span>Atorvastatin 20mg PO Daily</span>
                    <span className="text-slate-400 text-[10px]">Lipid Management</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>Lisinopril 10mg PO Daily</span>
                    <span className="text-slate-400 text-[10px]">ACE Inhibitor</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>Omeprazole 20mg PO Daily</span>
                    <span className="text-slate-400 text-[10px]">GI Protection</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>Acetaminophen 500mg PO PRN</span>
                    <span className="text-slate-400 text-[10px]">Mild Analgesic</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CARD 2: Deprescribing Actions (P1–P3) */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900 text-sm tracking-tight">
                  Deprescribing Actions (P1–P3)
                </h2>
                <div className="text-[11px] text-slate-500">
                  Select clinical actions for direct electronic transmission to EHR
                </div>
              </div>
              <button
                onClick={() => {
                  setQueueA(true);
                  setQueueB(true);
                  setQueueC(true);
                }}
                className="rounded-md bg-[#1b3b36] text-white px-2.5 py-1 text-[11px] font-semibold hover:bg-[#142e2a] transition cursor-pointer shadow-2xs"
              >
                + 1-Click CPOE
              </button>
            </div>

            {/* 3 Clinical Action Cards */}
            <div className="space-y-3 pt-3">
              {/* Action 1 */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-rose-50 border border-rose-200 px-1.5 py-0.2 text-[10px] font-bold text-rose-600 uppercase">
                      P1 HIGH
                    </span>
                    <span className="font-bold text-slate-900 text-xs">
                      Plan A: Taper Lorazepam 50%
                    </span>
                  </div>
                  <button
                    onClick={() => setQueueA(!queueA)}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
                      queueA
                        ? "bg-[#1b3b36] text-white"
                        : "border border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {queueA ? "✓ Queued" : "+ Queue"}
                  </button>
                </div>

                <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                  Step-down from 1.0mg to 0.5mg PO QHS x 3 nights; initiate nursing non-pharmacological sleep hygiene protocol.
                </p>

                <div className="flex items-center justify-between text-[11px] pt-2 mt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-700">
                    Predicted Impact: -22.4% Fall Risk
                  </span>
                  <span className="text-slate-400">AGS Beers Table 2</span>
                </div>
              </div>

              {/* Action 2 */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 uppercase">
                      P2 MED
                    </span>
                    <span className="font-bold text-slate-900 text-xs">
                      Plan B: Deprescribe PRN Diphenhydramine
                    </span>
                  </div>
                  <button
                    onClick={() => setQueueB(!queueB)}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
                      queueB
                        ? "bg-[#1b3b36] text-white"
                        : "border border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {queueB ? "✓ Queued" : "+ Queue"}
                  </button>
                </div>

                <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                  Cancel PRN order; if sleep support requested, substitute Melatonin 1.0 mg PO QHS. Eliminate anticholinergic toxicity.
                </p>

                <div className="flex items-center justify-between text-[11px] pt-2 mt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-700">
                    Impact: -11.8% Delirium Risk • ACB 4 → 1
                  </span>
                  <span className="text-slate-400">STOPP v3 Criteria</span>
                </div>
              </div>

              {/* Action 3 */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700 uppercase">
                      P3 SCHEDULER
                    </span>
                    <span className="font-bold text-slate-900 text-xs">
                      Plan C: Timed Diuresis &amp; Orthostatic Protocol
                    </span>
                  </div>
                  <button
                    onClick={() => setQueueC(!queueC)}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition cursor-pointer ${
                      queueC
                        ? "bg-[#1b3b36] text-white"
                        : "border border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {queueC ? "✓ Queued" : "+ Queue"}
                  </button>
                </div>

                <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                  Administer Furosemide strictly at 08:00 AM; hold afternoon dose. Order standing orthostatic blood pressure checks BID.
                </p>

                <div className="flex items-center justify-between text-[11px] pt-2 mt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-700">
                    Impact: Nighttime voiding events &lt; 1
                  </span>
                  <span className="text-slate-400">Circadian Sched.</span>
                </div>
              </div>
            </div>

            {/* Accept & Sign Primary Action Button */}
            <div className="pt-4 mt-2">
              <button
                onClick={handleSignOrders}
                className="w-full rounded-xl bg-[#1b3b36] hover:bg-[#142e2a] text-white font-semibold text-xs py-3 shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  Accept &amp; Sign {activeLeversCount} Adjustments (Projected: {simulatedRisk}%) →
                </span>
              </button>

              <div className="text-center mt-2.5">
                <button
                  onClick={handleCopyEhr}
                  className="text-[11px] text-slate-400 hover:text-slate-700 transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Override Recommendations with Clinical Justification...</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. GLOBAL BOTTOM STATUS / COMPLIANCE BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-4 px-1 text-xs text-slate-400 border-t border-slate-200/80 mt-4">
        <span>Clinical Decision Support Platform • ISO 13485 &amp; HIPAA Compliant</span>
        <span className="flex items-center gap-2 text-slate-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Ward 4B Session Active
        </span>
      </div>
    </div>
  );
}
