"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  Square,
  Download,
  AlertTriangle,
  Flame,
  Brain,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Printer,
  ChevronDown,
  Droplets,
  Activity,
  TrendingDown,
  Sparkles,
  Layers,
} from "lucide-react";

interface PatientTrajectoryProps {
  onBackToSMR: () => void;
  onApplyToSMR?: () => void;
}

export function PatientTrajectory({
  onBackToSMR,
  onApplyToSMR,
}: PatientTrajectoryProps) {
  // Timeline Filter & Track Toggles
  const [timeRange, setTimeRange] = useState("Past 12 Months");
  const [showMedications, setShowMedications] = useState(true);
  const [showRenalLabs, setShowRenalLabs] = useState(true);
  const [showFallEvents, setShowFallEvents] = useState(true);
  const [showRiskCurve, setShowRiskCurve] = useState(true);
  const [appliedNotification, setAppliedNotification] = useState(false);

  // 12 Months definition
  const months = [
    { id: "M1", label: "M1", date: "May '23", isNow: false, isRed: false },
    { id: "M2", label: "M2", date: "Jun '23", isNow: false, isRed: false },
    { id: "M3", label: "M3", date: "Jul '23", isNow: false, isRed: false },
    { id: "M4", label: "M4", date: "Aug '23", isNow: false, isRed: false },
    { id: "M5", label: "M5", date: "Sep '23", isNow: false, isRed: false },
    { id: "M6", label: "M6", date: "Oct '23", isNow: false, isRed: false },
    { id: "M7", label: "M7", date: "Nov '23", isNow: false, isRed: false },
    { id: "M8", label: "M8", date: "Dec '23", isNow: false, isRed: true },
    { id: "M9", label: "M9", date: "Jan '24", isNow: false, isRed: false },
    { id: "M10", label: "M10", date: "Feb '24", isNow: false, isRed: false },
    { id: "M11", label: "M11", date: "Mar '24", isNow: false, isRed: false },
    { id: "M12", label: "M12", date: "Apr '24 (Now)", isNow: true, isRed: false },
  ];

  const handleApplyToSMR = () => {
    setAppliedNotification(true);
    setTimeout(() => {
      onApplyToSMR?.() || onBackToSMR();
    }, 900);
  };

  return (
    <div className="space-y-4 font-sans text-slate-800 pb-12 animate-in fade-in duration-300">
      {/* Toast alert when deprescribing plan is applied */}
      {appliedNotification && (
        <div className="fixed top-16 right-8 z-50 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <div>
            <div className="font-bold">Deprescribing Plan Synced</div>
            <div className="text-xs text-emerald-700">3 cascade de-escalations applied to active SMR regimen.</div>
          </div>
        </div>
      )}

      {/* TOP SUBHEADER & PATIENT CONTEXT BAR */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Left: Back button & Patient demographics */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToSMR}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Back to Patient SMR</span>
          </button>

          <div className="w-8 h-8 rounded-full bg-[#1b3b36] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            RM
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">Robert Miller</h1>
              <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                84yo Male
              </span>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              MRN #994201 • Bed 401A • <span className="font-semibold text-slate-700">Inpatient Day 4</span>
            </div>
          </div>
        </div>

        {/* Center: Time Range Selector */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-full border border-slate-200 text-xs font-semibold text-slate-600">
          {["Past 3 Months", "Past 6 Months", "Past 12 Months", "All Stays"].map((range) => {
            const isActive = timeRange === range;
            return (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-full transition cursor-pointer ${
                  isActive
                    ? "bg-[#1b3b36] text-white shadow-xs font-bold"
                    : "hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                {range}
              </button>
            );
          })}
        </div>

        {/* Right: Checkbox Toggles & Export button */}
        <div className="flex items-center gap-3">
          <div className="hidden xl:flex items-center gap-3 text-xs font-medium text-slate-700">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showMedications}
                onChange={(e) => setShowMedications(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-[#1b3b36] focus:ring-[#1b3b36]"
              />
              <span>Medications</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showRenalLabs}
                onChange={(e) => setShowRenalLabs(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-[#1b3b36] focus:ring-[#1b3b36]"
              />
              <span>Renal Labs</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showFallEvents}
                onChange={(e) => setShowFallEvents(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-[#1b3b36] focus:ring-[#1b3b36]"
              />
              <span>Fall Events</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showRiskCurve}
                onChange={(e) => setShowRiskCurve(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-[#1b3b36] focus:ring-[#1b3b36]"
              />
              <span>Risk Curve</span>
            </label>
          </div>

          <button
            onClick={() => alert("FHIR / CSV chronology bundle generated.")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export FHIR/CSV</span>
          </button>
        </div>
      </div>

      {/* SYNCHRONIZED MULTI-TRACK TIMELINE CANVAS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 overflow-x-auto">
        <div className="min-w-[1060px] space-y-5">
          {/* 1. TIMELINE X-AXIS HEADER */}
          <div className="grid grid-cols-12 gap-0 border-b border-slate-200 pb-3 items-end">
            {/* Left Header Label */}
            <div className="col-span-2 pr-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Synchronized Timeline
              </div>
              <div className="text-xs font-bold text-slate-800">
                May 2023 – Apr 2024
              </div>
            </div>

            {/* 10 Month Columns (Col 3 to 12) */}
            <div className="col-span-10 grid grid-cols-12 gap-0 text-center">
              {months.map((m) => (
                <div key={m.id} className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-400">{m.label}</span>
                  {m.isNow ? (
                    <span className="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 shadow-2xs whitespace-nowrap">
                      Apr &apos;24 (Now)
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] font-semibold whitespace-nowrap ${
                        m.isRed ? "text-rose-600 font-bold" : "text-slate-600"
                      }`}
                    >
                      {m.date}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 2. TRACK 1: CLINICAL EVENTS */}
          {showFallEvents && (
            <div className="grid grid-cols-12 gap-0 items-center py-2 border-b border-slate-100 relative">
              {/* Left Label */}
              <div className="col-span-2 pr-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Clinical Events
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  Acute hospitalizations &amp; falls
                </div>
              </div>

              {/* Event Cards along the 12-month Grid */}
              <div className="col-span-10 grid grid-cols-12 gap-0 relative h-18 items-center">
                {/* Vertical guide lines */}
                <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                  {months.map((m) => (
                    <div
                      key={m.id}
                      className={`h-full border-r ${
                        m.id === "M8" || m.id === "M11"
                          ? "border-dashed border-rose-300/80"
                          : "border-slate-100"
                      }`}
                    />
                  ))}
                </div>

                {/* Event 1: M8 Mechanical Fall */}
                <div className="col-start-8 col-span-2 px-1 z-10">
                  <div className="rounded-lg border border-rose-200 bg-rose-50/95 p-1.5 text-center shadow-xs">
                    <div className="flex items-center justify-center gap-1 text-[9px] font-extrabold text-rose-600 uppercase tracking-wide">
                      <span className="text-xs">✱</span> DEC 14 (M8)
                    </div>
                    <div className="text-[11px] font-bold text-slate-900 leading-tight">
                      Mechanical Fall (ED)
                    </div>
                    <div className="text-[9px] text-slate-500">
                      Sutured lac, # rule-out
                    </div>
                  </div>
                </div>

                {/* Event 2: M11 Bathroom Syncope */}
                <div className="col-start-11 col-span-1 px-0.5 z-10">
                  <div className="rounded-lg border border-amber-300 bg-amber-50/95 p-1.5 text-center shadow-xs">
                    <div className="flex items-center justify-center gap-0.5 text-[9px] font-extrabold text-amber-700 uppercase tracking-wide">
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-600" /> MAR 02 (M11)
                    </div>
                    <div className="text-[11px] font-bold text-slate-900 leading-tight">
                      Bathroom Syncope
                    </div>
                    <div className="text-[9px] text-slate-500">
                      Postural drop -22 mmHg
                    </div>
                  </div>
                </div>

                {/* Event 3: M12 Ward 4B SMR */}
                <div className="col-start-12 col-span-1 px-1 z-10">
                  <div className="rounded-lg bg-[#1b3b36] p-1.5 text-center text-white shadow-xs">
                    <div className="text-[9px] font-bold text-emerald-300 uppercase tracking-wide">
                      APR 18
                    </div>
                    <div className="text-[11px] font-bold text-white leading-tight">
                      Ward 4B SMR
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. TRACK 2: PRESCRIPTION SWIMLANES */}
          {showMedications && (
            <div className="py-2 border-b border-slate-100">
              {/* Header & Legend */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-900">
                    Prescription Swimlanes
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Gantt cascade &amp; titrations
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[10px] font-medium text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#bbf7d0] border border-emerald-300" />
                    Stable Dose
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#1b3b36]" />
                    Titrated Up (PIM)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#fecaca] border border-rose-300" />
                    Cascade Reactive
                  </span>
                </div>
              </div>

              {/* 4 Swimlane Gantt Rows */}
              <div className="space-y-2.5">
                {/* Row 1: Lorazepam PO */}
                <div className="grid grid-cols-12 gap-0 items-center">
                  <div className="col-span-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800">Lorazepam PO</span>
                      <span className="rounded bg-rose-100/80 px-1 py-0.2 text-[9px] font-extrabold text-rose-700 border border-rose-200">
                        BEERS
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">Benzodiazepine (Sedative)</div>
                  </div>

                  <div className="col-span-10 grid grid-cols-12 gap-0 relative h-7 items-center">
                    {/* Month 1-5: 0.5 mg QHS */}
                    <div className="col-start-1 col-span-5 h-6 rounded-l-md bg-emerald-50/90 border border-emerald-200 flex items-center px-2 text-[10px] font-semibold text-emerald-900 shadow-2xs">
                      0.5 mg QHS (Insomnia)
                    </div>
                    {/* Month 6-12: Titrated 1.0 mg QHS (Dark Pine) */}
                    <div className="col-start-6 col-span-7 h-6 rounded-r-md bg-[#1b3b36] flex items-center justify-between px-2 text-[10px] font-semibold text-white shadow-xs">
                      <span>↑ 1.0 mg QHS (Dose Doubled by PCP)</span>
                      <span className="rounded bg-rose-600 px-1 py-0.2 text-[8px] font-bold text-white flex items-center gap-0.5">
                        <Flame className="w-2 h-2" /> PIM Cascade Lead
                      </span>
                    </div>
                  </div>
                </div>

                {/* Row 2: Furosemide PO */}
                <div className="grid grid-cols-12 gap-0 items-center">
                  <div className="col-span-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800">Furosemide PO</span>
                      <span className="rounded bg-cyan-100/80 px-1 py-0.2 text-[9px] font-extrabold text-cyan-800 border border-cyan-200">
                        M7 START
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">Loop Diuretic</div>
                  </div>

                  <div className="col-span-10 grid grid-cols-12 gap-0 relative h-7 items-center">
                    {/* Empty M1-M7, then starts at M8 to M12 */}
                    <div className="col-start-8 col-span-5 h-6 rounded-md bg-[#134e4a] flex items-center justify-between px-2 text-[10px] font-semibold text-white shadow-xs">
                      <span className="flex items-center gap-1">
                        <Droplets className="w-2.5 h-2.5 text-cyan-300" />
                        40 mg QAM (HF Peripheral Edema)
                      </span>
                      <span className="rounded bg-cyan-500/30 border border-cyan-400/50 px-1 py-0.2 text-[8px] font-bold text-cyan-100 flex items-center gap-0.5">
                        <Droplets className="w-2 h-2" /> Volume Depletion
                      </span>
                    </div>
                  </div>
                </div>

                {/* Row 3: Diphenhydramine OTC */}
                <div className="grid grid-cols-12 gap-0 items-center">
                  <div className="col-span-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800">Diphenhydramine OTC</span>
                      <span className="rounded bg-amber-100/80 px-1 py-0.2 text-[9px] font-extrabold text-amber-800 border border-amber-200">
                        ACB +3
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">Antihistamine (H1)</div>
                  </div>

                  <div className="col-span-10 grid grid-cols-12 gap-0 relative h-7 items-center">
                    {/* Sporadic PRN doses */}
                    <div className="col-start-5 col-span-1 h-5 rounded border border-dashed border-rose-300 bg-rose-50/70 flex items-center justify-center text-[9px] text-rose-700 font-medium">
                      25mg
                    </div>
                    <div className="col-start-7 col-span-1 h-5 rounded border border-dashed border-rose-300 bg-rose-50/70 flex items-center justify-center text-[9px] text-rose-700 font-medium">
                      25mg
                    </div>
                    <div className="col-start-10 col-span-1 h-5 rounded border border-dashed border-rose-300 bg-rose-50/70 flex items-center justify-center text-[9px] text-rose-700 font-medium">
                      25mg
                    </div>
                    {/* Consistent PRN at M11-M12 */}
                    <div className="col-start-11 col-span-2 h-6 rounded-md bg-rose-100/90 border border-rose-300 flex items-center justify-between px-2 text-[10px] font-bold text-rose-900 shadow-2xs">
                      <span>25 mg PRN OTC (Sleep Aid)</span>
                      <span className="rounded bg-rose-600 px-1 py-0.2 text-[8px] font-extrabold text-white">
                        DELIRIUM RISK
                      </span>
                    </div>
                  </div>
                </div>

                {/* Row 4: Hydralazine PO */}
                <div className="grid grid-cols-12 gap-0 items-center">
                  <div className="col-span-2 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800">Hydralazine PO</span>
                      <span className="rounded bg-slate-800 px-1 py-0.2 text-[9px] font-extrabold text-white">
                        CASCADE 4th
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">Vasodilator (Reactive)</div>
                  </div>

                  <div className="col-span-10 grid grid-cols-12 gap-0 relative h-7 items-center">
                    {/* Starts at M9 to M12 */}
                    <div className="col-start-9 col-span-4 h-6 rounded-md bg-rose-50/90 border border-rose-300 flex items-center justify-between px-2 text-[10px] font-semibold text-rose-900 shadow-2xs">
                      <span>25 mg TID (Reactive for Diuretic BP Fluctuations)</span>
                      <span className="rounded bg-rose-200 text-rose-800 px-1 py-0.2 text-[8px] font-bold">
                        Cascade Step 4
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. TRACK 3: RENAL BIOMARKERS */}
          {showRenalLabs && (
            <div className="py-2 border-b border-slate-100">
              {/* Header & Metrics */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">Renal Biomarkers</span>
                  <span className="text-[10px] text-slate-400">eGFR vs Serum Creatinine</span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="w-3 h-0.5 border-t-2 border-dashed border-emerald-600" />
                    <span className="text-[11px] text-slate-500">eGFR (mL/min/1.73m²)</span>
                    <span className="font-bold text-emerald-800">78 → 31</span>
                  </div>

                  <div className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="w-3 h-0.5 bg-slate-900" />
                    <span className="text-[11px] text-slate-500">Creatinine (mg/dL)</span>
                    <span className="font-bold text-slate-900">0.90 → 1.80</span>
                  </div>

                  <span className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                    CKD 3b Threshold (&lt;45)
                  </span>
                </div>
              </div>

              {/* Dual-Axis SVG Curve Canvas */}
              <div className="grid grid-cols-12 gap-0 items-center relative">
                {/* Left Y-axis labels */}
                <div className="col-span-2 pr-2 flex flex-col justify-between h-36 text-right py-1 font-mono text-[10px]">
                  <div className="flex justify-end gap-2 text-slate-400">
                    <span>eGFR 90</span>
                    <span className="text-slate-300">|</span>
                    <span>Cr 0.8</span>
                  </div>
                  <div className="flex justify-end gap-2 text-slate-400">
                    <span>eGFR 60</span>
                    <span className="text-slate-300">|</span>
                    <span>Cr 1.2</span>
                  </div>
                  <div className="flex justify-end gap-2 text-rose-600 font-bold">
                    <span>CKD 3b (45)</span>
                    <span className="text-slate-300">|</span>
                    <span>Cr 1.5</span>
                  </div>
                  <div className="flex justify-end gap-2 text-rose-700 font-bold">
                    <span>eGFR 30</span>
                    <span className="text-slate-300">|</span>
                    <span>Cr 1.8</span>
                  </div>
                </div>

                {/* Main Graph Area with Shaded Danger Band & SVG curves */}
                <div className="col-span-10 relative h-36 border-l border-slate-200">
                  {/* Danger Zone Shading (<45 mL/min) */}
                  <div className="absolute inset-x-0 bottom-0 top-[52%] bg-rose-50/50 border-t border-dashed border-rose-300/80 z-0">
                    <span className="absolute top-1 left-2 text-[9px] font-bold text-rose-500 uppercase tracking-wide">
                      Critical CKD 3b Threshold (&lt; 45 mL/min)
                    </span>
                  </div>

                  {/* SVG Curves */}
                  <svg className="absolute inset-0 w-full h-full overflow-visible z-10">
                    <defs>
                      <linearGradient id="egfrGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#059669" />
                        <stop offset="60%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#dc2626" />
                      </linearGradient>
                    </defs>

                    {/* eGFR Curve (Dashed line) */}
                    {/* Points: M1=78(20%), M4=74(24%), M7=60(38%), M8=41(57%), M10=34(68%), M12=31(75%) */}
                    <path
                      d="M 40 22 Q 180 26, 340 38 T 540 60 T 680 82 T 840 98 T 940 108"
                      fill="none"
                      stroke="#0d9488"
                      strokeWidth="2.5"
                      strokeDasharray="4,3"
                    />

                    {/* eGFR Data Points */}
                    <circle cx="40" cy="22" r="3.5" fill="#0d9488" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx="340" cy="38" r="3.5" fill="#0d9488" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx="540" cy="60" r="3.5" fill="#0d9488" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx="680" cy="82" r="3.5" fill="#e11d48" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx="940" cy="108" r="4" fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" />

                    {/* Serum Creatinine Curve (Solid Dark line) */}
                    {/* Starts at 0.9 (80%), rises to 1.8 (10%) */}
                    <path
                      d="M 40 98 Q 200 94, 340 88 T 540 78 T 680 52 T 840 34 T 940 18"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="2.5"
                    />

                    {/* Creatinine Data Points */}
                    <circle cx="40" cy="98" r="3.5" fill="#0f172a" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx="340" cy="88" r="3.5" fill="#0f172a" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx="540" cy="78" r="3.5" fill="#0f172a" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx="680" cy="52" r="3.5" fill="#0f172a" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx="940" cy="18" r="4" fill="#0f172a" stroke="#ffffff" strokeWidth="1.5" />
                  </svg>

                  {/* Floating Callout Card Anchored at M7-M8 */}
                  <div className="absolute top-1 left-[44%] -translate-x-1/2 z-20 w-64 rounded-lg border border-rose-300 bg-white/95 p-2 shadow-md backdrop-blur-xs">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Acute eGFR Drop (-27 mL/min)
                    </div>
                    <div className="text-[9.5px] text-slate-600 leading-tight mt-0.5">
                      Rapid clearance decline follows Furosemide initiation + Lorazepam titration. Creatinine surges 1.2 → 1.5 mg/dL.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. TRACK 4: FALL RISK PROBABILITY */}
          {showRiskCurve && (
            <div className="py-2">
              {/* Header & Metrics */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  <span className="text-xs font-bold text-slate-900">Fall Risk Probability</span>
                  <span className="text-[10px] text-slate-400">Survival Tree ML Acuity Model</span>
                </div>

                <div className="flex items-center gap-5">
                  <div className="text-xs text-right">
                    <div className="text-[10px] text-slate-400 font-medium">Ward 4B Average</div>
                    <div className="font-bold text-slate-700">18.2%</div>
                  </div>

                  <div className="text-xs text-right">
                    <div className="text-[10px] text-rose-500 font-bold uppercase tracking-wide">
                      Current Robert Miller Risk
                    </div>
                    <div className="text-xl font-black text-rose-600 tracking-tight leading-none">
                      68.4%
                    </div>
                  </div>
                </div>
              </div>

              {/* Curve Canvas Area */}
              <div className="grid grid-cols-12 gap-0 items-center relative">
                {/* Y-Axis Labels */}
                <div className="col-span-2 pr-2 flex flex-col justify-between h-36 text-right py-1 font-mono text-[10px]">
                  <span className="text-rose-600 font-bold">75% Critical</span>
                  <span className="text-amber-600 font-medium">50% High Risk</span>
                  <span className="text-slate-400 font-medium">25% Moderate</span>
                  <span className="text-emerald-600 font-medium">0% Low</span>
                </div>

                {/* Graph Canvas */}
                <div className="col-span-10 relative h-36 border-l border-slate-200">
                  {/* Ward Baseline Dashed Line (18.2%) */}
                  <div className="absolute inset-x-0 bottom-[24%] border-t border-dashed border-slate-300 z-0">
                    <span className="absolute -top-3.5 left-2 text-[9px] font-medium text-slate-400">
                      Ward Baseline: 18.2%
                    </span>
                  </div>

                  {/* SVG Area & Curve */}
                  <svg className="absolute inset-0 w-full h-full overflow-visible z-10">
                    <defs>
                      <linearGradient id="riskAreaGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.35" />
                        <stop offset="75%" stopColor="#ef4444" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#dc2626" stopOpacity="0.85" />
                      </linearGradient>
                    </defs>

                    {/* Area under curve */}
                    <path
                      d="M 40 120 Q 200 118, 340 114 T 540 94 T 680 54 T 840 40 T 940 24 L 940 144 L 40 144 Z"
                      fill="url(#riskAreaGrad)"
                    />

                    {/* Continuous Stroke */}
                    <path
                      d="M 40 120 Q 200 118, 340 114 T 540 94 T 680 54 T 840 40 T 940 24"
                      fill="none"
                      stroke="#991b1b"
                      strokeWidth="2.5"
                    />

                    {/* Point: M1 (12.4%) */}
                    <circle cx="40" cy="120" r="3.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                    {/* Point: M5 (24.0%) */}
                    <circle cx="340" cy="114" r="3.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                    {/* Point: M8 (49.5% - Fall #1) */}
                    <circle cx="680" cy="54" r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                    {/* Point: M12 (68.4% - Peak) */}
                    <circle cx="940" cy="24" r="5" fill="#dc2626" stroke="#ffffff" strokeWidth="2" />
                  </svg>

                  {/* Marker Labels */}
                  <div className="absolute left-[38px] bottom-[26px] -translate-x-1/2 text-[10px] font-bold text-emerald-800">
                    12.4%
                  </div>
                  <div className="absolute left-[340px] bottom-[32px] -translate-x-1/2 text-[10px] font-bold text-slate-700">
                    24.0%
                  </div>
                  <div className="absolute left-[680px] top-[40px] -translate-x-1/2 flex items-center gap-1 rounded bg-amber-100/90 border border-amber-300 px-1.5 py-0.2 text-[9px] font-bold text-amber-900 shadow-2xs">
                    <span>49.5%</span>
                    <span className="text-rose-600">⚠ Fall #1</span>
                  </div>

                  {/* Peak Marker Badge at M12 */}
                  <div className="absolute right-0 top-[6px] flex items-center gap-1 rounded-md bg-[#dc2626] px-2 py-0.5 text-xs font-extrabold text-white shadow-sm z-20">
                    <Sparkles className="w-3 h-3 text-amber-200" />
                    <span>68.4% Peak</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM TWO-COLUMN CLINICAL DECISION SUPPORT PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT PANEL: PRESCRIBING CASCADE DISCOVERY */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                  <Brain className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Prescribing Cascade Discovery</h2>
                  <div className="text-[11px] text-slate-500 font-medium">
                    AI Mechanistic Etiology Synthesis
                  </div>
                </div>
              </div>

              <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                HIGH CONFIDENCE (94.2%)
              </span>
            </div>

            {/* Stepped Sequence 1 -> 4 */}
            <div className="space-y-2 py-4">
              {/* Step 1 */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#1b3b36] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Lorazepam Titration (1.0 mg QHS)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Triggered daytime motor ataxia, somnolence &amp; reduced clearance
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 shrink-0">MONTH 5</span>
              </div>

              <div className="pl-3 py-0.5 text-slate-300 font-bold text-xs">↓</div>

              {/* Step 2 */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#1b3b36] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Furosemide Added (40 mg QAM)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Orthostatic dehydration + prerenal azotemia
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 shrink-0">MONTH 7</span>
              </div>

              <div className="pl-3 py-0.5 text-slate-300 font-bold text-xs">↓</div>

              {/* Step 3 */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#1b3b36] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <div className="text-xs font-bold text-rose-600">
                      Renal Function Collapse (eGFR 78 → 31 mL/min)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Drug accumulation of sedative metabolites + orthostatic hypotension
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-rose-500 shrink-0">M7 – M8</span>
              </div>

              <div className="pl-3 py-0.5 text-slate-300 font-bold text-xs">↓</div>

              {/* Step 4 (Highlighted in light red card) */}
              <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-3 flex items-start justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <div className="text-xs font-bold text-rose-700">
                      Hydralazine 25mg TID + 2 Acute Falls
                    </div>
                    <div className="text-[11px] text-rose-900/80 font-medium">
                      Reactive prescribing for fluctuating BP leads to ED Visit and Bathroom Syncope
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-rose-600 shrink-0">M8 &amp; M11</span>
              </div>
            </div>
          </div>

          {/* Etiology Rationale Callout Box */}
          <div className="rounded-lg border border-[#a3ded2] bg-[#eef7f5] p-3 text-[11px] text-slate-700 leading-relaxed mt-2">
            <strong className="text-[#134e4a]">Trajectory Etiology:</strong> The patient&apos;s fall probability accelerated from 12% to 68.4% primarily following the addition of Furosemide to escalated Lorazepam. Prerenal dehydration precipitated acute drug accumulation and orthostatic instability.
          </div>
        </div>

        {/* RIGHT PANEL: TARGETED DEPRESCRIBING PLAN */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1b3b36]/10 text-[#1b3b36] border border-[#1b3b36]/20 flex items-center justify-center">
                  <ShieldCheck className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Targeted Deprescribing Plan</h2>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Stepwise Risk Reduction Actions
                  </div>
                </div>
              </div>

              <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                3 INTERVENTIONS
              </span>
            </div>

            {/* 3 Action Cards */}
            <div className="space-y-3 py-4">
              {/* Action 1 */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 p-3 transition shadow-2xs">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        De-escalate Lorazepam to 0.5 mg
                      </span>
                      <span className="rounded bg-rose-100 text-rose-700 border border-rose-200 text-[9px] font-extrabold px-1.5 py-0.2">
                        URGENT
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1 leading-snug">
                      Reverse Month 5 titration; transition to non-pharmacological sleep hygiene protocol.
                    </div>
                  </div>
                </div>
              </div>

              {/* Action 2 */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 p-3 transition shadow-2xs">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        Re-evaluate Furosemide 40 mg
                      </span>
                      <span className="rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-extrabold px-1.5 py-0.2">
                        MED REVIEW
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1 leading-snug">
                      Check dry weight &amp; lower extremity edema. Consider stepping down to 20 mg PO with daily weights to restore renal perfusion.
                    </div>
                  </div>
                </div>
              </div>

              {/* Action 3 */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 p-3 transition shadow-2xs">
                <div className="flex items-start gap-3">
                  <XCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        Eliminate OTC Diphenhydramine
                      </span>
                      <span className="rounded bg-rose-100 text-rose-700 border border-rose-200 text-[9px] font-extrabold px-1.5 py-0.2">
                        STOPP
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1 leading-snug">
                      Eliminate high-risk anticholinergic burden (ACB +3) to protect cognitive reserve and mitigate acute delirium.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleApplyToSMR}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1b3b36] hover:bg-[#152e2a] text-white py-2.5 px-4 text-xs font-bold transition shadow-xs cursor-pointer active:scale-[0.99]"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Apply to Active SMR</span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-2.5 px-3.5 text-xs font-semibold transition shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Chronology</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PatientTrajectory;
