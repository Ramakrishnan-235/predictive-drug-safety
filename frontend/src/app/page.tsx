'use client';

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Bell, 
  ArrowLeft, 
  BedDouble, 
  ArrowDown, 
  RefreshCw, 
  Info, 
  AlertTriangle, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  ShieldCheck, 
  Stethoscope, 
  Pill, 
  Sparkles,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SMRScreen() {
  // Interactive State
  const [riskPercentage, setRiskPercentage] = useState<number>(68.4);
  const [acuityTier, setAcuityTier] = useState<string>('CRITICAL');
  const [isSigned, setIsSigned] = useState<boolean>(false);
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [showChronic, setShowChronic] = useState<boolean>(false);
  const [showShapMatrix, setShowShapMatrix] = useState<boolean>(false);
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [overrideText, setOverrideText] = useState<string>('');
  const [notificationCount, setNotificationCount] = useState<number>(2);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  
  // Queued state for individual plans
  const [queuedPlans, setQueuedPlans] = useState<Record<string, boolean>>({
    planA: false,
    planB: false,
    planC: false,
  });

  const toggleQueue = (key: string) => {
    setQueuedPlans(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSignAll = async () => {
    setIsSigning(true);
    
    try {
      // Connect to backend API if available
      await fetch('http://127.0.0.1:8000/api/cpoe/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: '994201',
          action_ids: ['plan_a', 'plan_b', 'plan_c'],
          clinician: 'Dr. Sarah Chen, MD'
        })
      }).catch(() => null);
    } catch {
      // Optimistic offline execution fallback
    }

    setTimeout(() => {
      setIsSigning(false);
      setIsSigned(true);
      setRiskPercentage(26.8);
      setAcuityTier('MODERATE');
      setQueuedPlans({ planA: true, planB: true, planC: true });

      // Celebration confetti for risk reduction
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.85 },
          colors: ['#0d9488', '#10b981', '#064e3b']
        });
      } catch {
        // ignore
      }
    }, 600);
  };

  const handleOverrideSubmit = () => {
    setShowOverrideModal(false);
    setIsSigned(true);
  };

  return (
    <div className="min-h-screen bg-[#f2f7f6] text-[#111827]">
      
      {/* ================= 1. TOP HEADER NAVIGATION ================= */}
      <header className="bg-white border-b border-[#e5ecea] sticky top-0 z-50">
        <div className="max-w-[1520px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & App Version */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0b4d45] flex items-center justify-center text-white shadow-xs">
                <ShieldCheck className="w-5 h-5 text-[#34d399]" />
              </div>
              <span className="font-bold text-lg text-[#083a34] tracking-tight">
                GeriSafe CDSS
              </span>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] tracking-wide uppercase border border-[#bbf7d0]">
              v2.4 INPATIENT
            </span>
          </div>

          {/* Center Nav Tabs */}
          <nav className="flex items-center gap-1.5 md:gap-2">
            <button className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-md transition">
              Triage Worklist
            </button>
            <button className="px-3.5 py-1.5 text-xs font-bold text-[#083a34] bg-[#e6f4f1] rounded-md border border-[#cbebe5] shadow-xs">
              Medication Review (SMR)
            </button>
            <button className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-md transition">
              Patient Trajectory
            </button>
            <button className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-md transition">
              Safety Rules &amp; DDI
            </button>
            <button className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-md transition">
              Audit Log
            </button>
          </nav>

          {/* Right Controls: Search, Bell, Clinician */}
          <div className="flex items-center gap-4 shrink-0">
            
            {/* Search MRN or Patient */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search MRN or Patient..."
                className="w-56 md:w-64 pl-9 pr-3 py-1.5 text-xs bg-stone-50 hover:bg-stone-100/80 focus:bg-white text-stone-900 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 transition"
              />
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-full transition"
                title="Clinical Alerts"
              >
                <Bell className="w-4 h-4" />
                {notificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full ring-2 ring-white animate-pulse" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-stone-200 rounded-xl shadow-xl z-50 p-3 text-xs">
                  <div className="font-bold text-stone-800 pb-2 border-b border-stone-100">
                    High Syncope Acuity Alerts (2)
                  </div>
                  <div className="py-2 space-y-1.5 text-[11px] text-stone-600">
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-900 font-medium">
                      Robert Miller: Lorazepam + Furosemide synergism with eGFR 31.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Clinician Profile */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-stone-200">
              <div className="w-8 h-8 rounded-full bg-[#084c46] text-white flex items-center justify-center font-bold text-xs ring-2 ring-teal-700/20">
                SC
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-stone-900 leading-tight">Dr. Sarah Chen, MD</div>
                <div className="text-[11px] text-stone-500 font-medium">Geriatric Ward 4B</div>
              </div>
            </div>

          </div>

        </div>
      </header>

      {/* ================= MAIN CONTENT WRAPPER ================= */}
      <main className="max-w-[1520px] mx-auto px-6 py-5 space-y-5">
        
        {/* ================= 2. PATIENT BANNER CARD ================= */}
        <div className="cdss-card p-5 bg-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Left: Patient Identity */}
            <div className="flex items-center gap-3.5 flex-wrap">
              <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 px-3 py-1.5 rounded-lg transition">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Triage Worklist</span>
              </button>

              <div className="w-11 h-11 rounded-full bg-[#0d5e56] text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                RM
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                    Robert Miller
                  </h1>
                  <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded uppercase">
                    84YO MALE
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-stone-500 mt-1 flex-wrap">
                  <span className="font-semibold text-[#15803d] bg-[#dcfce7] px-2 py-0.5 rounded-full text-[11px]">
                    LOS: 4 Days
                  </span>
                  <span className="text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full text-[11px] font-medium">
                    Full Code
                  </span>
                  <span>MRN: <strong className="text-stone-800">#994201</strong></span>
                  <span className="flex items-center gap-1 text-stone-600 font-medium">
                    <BedDouble className="w-3.5 h-3.5 text-stone-400" />
                    Bed 401A (Acute Care 4B)
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Real-Time Vitals / Lab Metrics */}
            <div className="flex items-center gap-2.5 flex-wrap lg:justify-end">
              
              {/* Renal Clearance */}
              <div className="px-3.5 py-2 rounded-lg bg-stone-50 border border-stone-200 text-left min-w-[135px]">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  Renal Clearance
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-sm font-bold text-stone-900">Cr 1.80</span>
                  <span className="text-[10px] text-stone-500">mg/dL</span>
                </div>
                <div className="mt-0.5">
                  <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ffe4e6] text-[#be123c] border border-[#fecdd3]">
                    eGFR 31 • CKD 3b
                  </span>
                </div>
              </div>

              {/* Anthropometry */}
              <div className="px-3.5 py-2 rounded-lg bg-stone-50 border border-stone-200 text-left min-w-[135px]">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  Anthropometry
                </div>
                <div className="text-sm font-bold text-stone-900 mt-0.5">
                  72.4 <span className="text-[10px] text-stone-500 font-normal">kg</span>
                </div>
                <div className="text-[10px] text-stone-600 font-medium mt-0.5">
                  BMI 24.1 (CrCl 29 mL/m)
                </div>
              </div>

              {/* Postural Hemodynamics */}
              <div className="px-3.5 py-2 rounded-lg bg-stone-50 border border-stone-200 text-left min-w-[155px]">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  Postural Hemodynamics
                </div>
                <div className="text-sm font-bold text-stone-900 mt-0.5">
                  118/74 <span className="text-[10px] text-stone-500 font-normal">mmHg</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-red-600 mt-0.5">
                  <ArrowDown className="w-3 h-3 text-red-600 stroke-[2.5]" />
                  <span>-18 mmHg Drop (HR 64)</span>
                </div>
              </div>

              {/* Fall Risk Pill */}
              <div className={`px-4 py-2.5 rounded-lg border text-left min-w-[170px] ${
                riskPercentage >= 50 
                  ? 'bg-[#fee2e2] border-[#fca5a5]' 
                  : 'bg-[#dcfce7] border-[#86efac]'
              }`}>
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#b91c1c]">
                  <span className="critical-dot" />
                  <span>FALL RISK: {riskPercentage.toFixed(1)}% {acuityTier}</span>
                </div>
                <div className="text-[11px] font-medium text-stone-600 mt-0.5">
                  High Syncope Acuity Index
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Signed Success Confirmation Banner */}
        {isSigned && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                CPOE Authorization Confirmed: 3 Deprescribing Adjustments Transmitted to Ward 4B Pharmacy. Recalculated Fall Risk: <strong>{riskPercentage}% ({acuityTier})</strong>.
              </span>
            </div>
            <span className="text-[11px] text-emerald-700 font-mono">
              Audit ID: #CPOE-2026-0841
            </span>
          </div>
        )}

        {/* ================= 3. TWO-COLUMN CLINICAL GRID ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          
          {/* ================= LEFT COLUMN ================= */}
          <div className="space-y-5">
            
            {/* Card 1: Predicted Fall & Syncope Risk Analysis */}
            <div className="cdss-card p-5 bg-white">
              
              {/* Card Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-stone-100 flex items-center justify-center text-stone-700 text-xs">
                    ▦
                  </div>
                  <h2 className="font-bold text-base text-stone-900 tracking-tight">
                    Predicted Fall &amp; Syncope Risk Analysis
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Gradient Boosted Survival Tree • AUROC 0.89
                </span>
              </div>

              {/* Big Score Display */}
              <div className="my-3 pb-3 border-b border-stone-100">
                <div className="flex items-baseline gap-3">
                  <span className={`text-5xl font-extrabold tracking-tight ${
                    riskPercentage >= 50 ? 'text-[#111827]' : 'text-emerald-800'
                  }`}>
                    {riskPercentage.toFixed(1)}%
                  </span>
                  <span className="text-xs font-bold text-[#b91c1c] uppercase tracking-wide px-2 py-0.5 bg-[#fee2e2] border border-[#fca5a5] rounded">
                    HIGH ACUITY FALL EVENT &lt; 48H
                  </span>
                  <span className="text-xs text-stone-500 font-medium">
                    Ward Baseline: 18.2%
                  </span>
                </div>
                <div className="text-xs text-stone-500 font-medium mt-1">
                  3.76x elevation against age-matched inpatient cohort
                </div>
              </div>

              {/* Key Feature Attributions (SHAP Contribution) */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2.5">
                  <span>Key Feature Attributions (SHAP Contribution)</span>
                  <span>Impact Weight</span>
                </div>

                <div className="space-y-3.5">
                  
                  {/* Feature 1 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                      <span>wDDI Regimen Burden: Synergistic GABA-A &amp; Volume Depletion</span>
                      <span className="font-mono text-[#0b4d45] font-bold">+0.218</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#084c46] h-2 rounded-full w-[85%]" />
                    </div>
                    <div className="text-[11px] text-stone-500">
                      Lorazepam + Furosemide drug-drug-disease interaction loop
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                      <span>Serum Creatinine Elevation (Reduced Drug Clearance)</span>
                      <span className="font-mono text-[#0b4d45] font-bold">+0.174</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#0d9488] h-2 rounded-full w-[68%]" />
                    </div>
                    <div className="text-[11px] text-stone-500">
                      eGFR declined 42 → 31 mL/min/1.73m² over prior 72 hours
                    </div>
                  </div>

                  {/* Feature 3 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                      <span>CNS Polypharmacy Active (Sedation / Ataxia Risk)</span>
                      <span className="font-mono text-[#0b4d45] font-bold">+0.130</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#14b8a6] h-2 rounded-full w-[50%]" />
                    </div>
                    <div className="text-[11px] text-stone-500">
                      Concurrent central nervous system sedatives compounded by PRN Diphenhydramine
                    </div>
                  </div>

                  {/* Feature 4 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                      <span>Loop Diuretic Initiation (Acute Orthostasis &amp; Nocturia)</span>
                      <span className="font-mono text-[#0b4d45] font-bold">+0.092</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-[#2dd4bf] h-2 rounded-full w-[35%]" />
                    </div>
                    <div className="text-[11px] text-stone-500">
                      Furosemide 40 mg morning dosing inducing recurrent nocturnal unassisted transfers
                    </div>
                  </div>

                </div>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between text-xs text-stone-500 pt-4 mt-5 border-t border-stone-100">
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-stone-400" />
                  <span>EHR real-time stream synchronized 8 mins ago</span>
                </div>
                <button 
                  onClick={() => setShowShapMatrix(true)}
                  className="text-stone-700 font-semibold hover:text-[#0b4d45] underline text-xs"
                >
                  Inspect Full SHAP Matrix
                </button>
              </div>

            </div>

            {/* Card 2: Mechanistic Clinical Rationale */}
            <div className="cdss-card p-5 bg-white">
              
              {/* Card Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-stone-100 flex items-center justify-center text-stone-700 text-xs">
                    💡
                  </div>
                  <h2 className="font-bold text-base text-stone-900 tracking-tight">
                    Mechanistic Clinical Rationale
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-[#15803d] bg-[#dcfce7] px-2.5 py-0.5 rounded-full border border-[#bbf7d0] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Confidence: High (94.8%)
                </span>
              </div>

              {/* Quote Block */}
              <div className="p-3.5 bg-[#f0fdfa]/60 rounded-xl border border-[#ccfbf1] text-xs text-stone-800 leading-relaxed relative pl-7">
                <span className="absolute left-2.5 top-2 text-xl font-serif text-[#0f766e] leading-none">“</span>
                <p>
                  Co-administration of <strong>Lorazepam</strong> (GABA-A positive allosteric modulator) with <strong>Furosemide</strong> precipitates acute orthostatic cerebral hypoperfusion upon standing. Impaired renal clearance (<span className="text-[#be123c] font-bold">CrCl 29 mL/min</span>) extends sedative active metabolite half-life, causing daytime gait ataxia and impaired balance recovery during nocturnal voiding.
                </p>
              </div>

              {/* Circadian Nocturia & Hypotension Interaction Profile Chart */}
              <div className="w-full bg-stone-50/70 rounded-xl p-3 border border-stone-200/80 my-3.5">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-stone-800 text-xs">
                    Circadian Nocturia &amp; Hypotension Interaction Profile
                  </span>
                  <span className="font-bold text-[#b91c1c] text-xs tracking-wide">
                    Peak Risk: 02:00 – 05:00
                  </span>
                </div>

                <div className="relative w-full">
                  <svg viewBox="0 0 640 135" className="w-full h-auto text-xs select-none">
                    <defs>
                      <linearGradient id="circadianRiskGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fee2e2" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#fef2f2" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>

                    {/* Background Grid */}
                    <line x1="40" y1="20" x2="600" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" />
                    <line x1="40" y1="55" x2="600" y2="55" stroke="#e2e8f0" strokeDasharray="3 3" />
                    <line x1="40" y1="90" x2="600" y2="90" stroke="#e2e8f0" strokeDasharray="3 3" />

                    {/* Nocturnal Unassisted Transfer Zone Shading (02:00 to 05:00) */}
                    <rect
                      x="220"
                      y="12"
                      width="200"
                      height="85"
                      rx="6"
                      fill="url(#circadianRiskGradient)"
                      stroke="#fca5a5"
                      strokeDasharray="4 3"
                      strokeWidth="1.2"
                    />

                    {/* Time Labels */}
                    <text x="40" y="118" fill="#64748b" fontSize="10.5" fontWeight="600" textAnchor="middle">20:00</text>
                    <text x="140" y="118" fill="#334155" fontSize="10.5" fontWeight="600" textAnchor="middle">23:00 (Sedation)</text>
                    <text x="260" y="118" fill="#b91c1c" fontSize="10.5" fontWeight="700" textAnchor="middle">02:00</text>
                    <text x="380" y="118" fill="#b91c1c" fontSize="10.5" fontWeight="700" textAnchor="middle">04:00 (Critical)</text>
                    <text x="500" y="118" fill="#64748b" fontSize="10.5" fontWeight="600" textAnchor="middle">07:00</text>
                    <text x="600" y="118" fill="#334155" fontSize="10.5" fontWeight="600" textAnchor="middle">10:00 (Dosing)</text>

                    {/* Mean Arterial Pressure Nadir (Solid Teal Curve) */}
                    <path
                      d="M 40,42 C 100,45 180,55 260,72 C 320,84 360,88 400,82 C 480,66 540,50 600,45"
                      fill="none"
                      stroke="#0f766e"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Lorazepam / Anticholinergic Cmax (Red Dotted Curve) */}
                    <path
                      d="M 40,84 C 100,78 170,68 260,35 C 310,20 350,18 400,34 C 480,64 530,78 580,84"
                      fill="none"
                      stroke="#e11d48"
                      strokeWidth="2.5"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                    />

                    {/* Intersection Critical Dot */}
                    <circle cx="330" cy="82" r="5" fill="#e11d48" stroke="#ffffff" strokeWidth="2" />
                  </svg>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center justify-between text-[11px] font-semibold text-stone-600 mt-1 pt-2 border-t border-stone-200/60 px-1">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-0.5 bg-[#0f766e] rounded-full" />
                      <span>Mean Arterial Pressure Nadir</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3.5 h-0.5 border-b-2 border-[#e11d48] border-dashed" />
                      <span>Lorazepam / Anticholinergic Cmax</span>
                    </div>
                  </div>
                  <div className="text-[#b91c1c] font-bold">
                    Nocturnal Unassisted Transfer Zone
                  </div>
                </div>
              </div>

              {/* Validated Guideline Grounding */}
              <div className="mt-3 pt-3 border-t border-stone-100">
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Validated Guideline Grounding
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                    <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                    <span>2023 AGS Beers Criteria Table 2: Sedative-Hypnotics</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                    <span>STOPP v3 Section K: Fall-Risk Drugs (FRIDs)</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                    <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
                    <span>KDIGO 2024 Dose Adjustment (Stage 3b)</span>
                  </span>
                </div>
              </div>

            </div>

          </div>

          {/* ================= RIGHT COLUMN ================= */}
          <div className="space-y-5">
            
            {/* Card 3: Active Medications */}
            <div className="cdss-card p-5 bg-white">
              
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-700" />
                  <h2 className="font-bold text-base text-stone-900 tracking-tight">
                    Active Medications
                  </h2>
                </div>
                <span className="text-xs font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                  14 Active
                </span>
              </div>
              <div className="text-[11px] text-stone-500 mb-3 font-medium">
                Rank-ordered by Fall Risk Attribution Index
              </div>

              {/* Medication Cards List */}
              <div className="space-y-3">
                
                {/* Med 1: Lorazepam */}
                <div className="p-3.5 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-900">Lorazepam 1.0 mg PO</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5]">
                          FRID Priority 1
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        Route: Oral • QHS (Every Bedtime)
                      </div>
                    </div>
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5]">
                      Beers PIM Alert
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                      DDI w/ Furosemide
                    </span>
                  </div>

                  <div className="text-[11px] font-medium text-[#b91c1c] bg-[#fef2f2] px-2.5 py-1 rounded border border-[#fecaca] flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>Metabolite accumulation risk with GFR &lt; 30 mL/min</span>
                  </div>
                </div>

                {/* Med 2: Furosemide */}
                <div className="p-3.5 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-900">Furosemide 40 mg PO</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                          FRID Priority 2
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        Route: Oral • QAM (Every Morning)
                      </div>
                    </div>
                    <Info className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#e0f2fe] text-[#0369a1]">
                      Loop Diuretic
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                      Volume Depletion / Orthostasis
                    </span>
                  </div>

                  <div className="text-[11px] text-stone-500">
                    Last dose: 08:00 AM • Indication: CHF fluid management
                  </div>
                </div>

                {/* Med 3: Diphenhydramine */}
                <div className="p-3.5 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-900">Diphenhydramine 25 mg PO</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
                          ACB High (+3)
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        Route: Oral • PRN QHS (Nightly Insomnia)
                      </div>
                    </div>
                    <span className="text-orange-500 font-extrabold text-sm shrink-0">!</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5]">
                      High Delirium Hazard
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                      Anticholinergic Toxicity
                    </span>
                  </div>

                  <div className="text-[11px] text-[#b91c1c] font-medium">
                    Contraindicated in older adults with mild cognitive impairment
                  </div>
                </div>

                {/* Med 4: Metoprolol */}
                <div className="p-3.5 rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-900">Metoprolol Succinate 50 mg</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                          Monitored
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        Route: Oral • QD (Daily)
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                      Beta-1 Selective
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                      Postural Bradycardia Check
                    </span>
                  </div>
                </div>

              </div>

              {/* Expandable Accordion for Other Stable Meds */}
              <div className="mt-3">
                <button
                  onClick={() => setShowChronic(!showChronic)}
                  className="w-full py-2 px-3 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <span>
                    {showChronic ? 'Hide' : 'View 10 other stable medications (Atorvastatin, Omeprazole, etc.)'}
                  </span>
                  {showChronic ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showChronic && (
                  <div className="mt-2 p-3 bg-stone-50 rounded-lg divide-y divide-stone-200/60 text-xs text-stone-700">
                    <div className="py-1 flex justify-between"><span>Atorvastatin 20 mg PO QD</span><span className="text-[10px] text-stone-400">Lipid Lowering</span></div>
                    <div className="py-1 flex justify-between"><span>Omeprazole 20 mg PO QD</span><span className="text-[10px] text-stone-400">GI Prophylaxis</span></div>
                    <div className="py-1 flex justify-between"><span>Acetaminophen 650 mg PO Q8H PRN</span><span className="text-[10px] text-stone-400">Analgesic</span></div>
                    <div className="py-1 flex justify-between"><span>Lisinopril 5 mg PO QD</span><span className="text-[10px] text-stone-400">ACE Inhibitor</span></div>
                    <div className="py-1 flex justify-between"><span>Aspirin 81 mg PO QD</span><span className="text-[10px] text-stone-400">Antiplatelet</span></div>
                    <div className="py-1 flex justify-between"><span>Multivitamin 1 tab PO QD</span><span className="text-[10px] text-stone-400">Nutritional</span></div>
                    <div className="py-1 flex justify-between"><span>Polyethylene Glycol 17g PO QD PRN</span><span className="text-[10px] text-stone-400">Bowel Regimen</span></div>
                    <div className="py-1 flex justify-between"><span>Cyanocobalamin (B12) 1000 mcg PO QD</span><span className="text-[10px] text-stone-400">Vitamin B12</span></div>
                    <div className="py-1 flex justify-between"><span>Artificial Tears 1 gtt OU QID PRN</span><span className="text-[10px] text-stone-400">Ophthalmic</span></div>
                    <div className="py-1 flex justify-between"><span>Cholecalciferol (Vit D3) 1000 IU PO QD</span><span className="text-[10px] text-stone-400">Bone Health</span></div>
                  </div>
                )}
              </div>

            </div>

            {/* Card 4: Deprescribing Actions (1-Click CPOE) */}
            <div className="cdss-card p-5 bg-white border-teal-200/80">
              
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🪄</span>
                  <h2 className="font-bold text-base text-stone-900 tracking-tight">
                    Deprescribing Actions
                  </h2>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]">
                  1-Click CPOE
                </span>
              </div>
              <div className="text-[11px] text-stone-500 mb-4 font-medium">
                Select CDS adjustments for direct electronic EHR authorization
              </div>

              {/* Plans List */}
              <div className="space-y-3">
                
                {/* Plan A */}
                <div className={`p-3.5 rounded-xl border transition space-y-2 ${
                  queuedPlans.planA ? 'bg-[#f0fdfa] border-teal-300' : 'bg-white border-stone-200'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-xs text-stone-900">
                      Plan A: Taper Lorazepam by 50%
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]">
                      -22.4% Fall Risk
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    Step down from 1.0 mg to 0.5 mg PO QHS x 3 nights. Initiate nursing sleep protocol (dimming, noise reduction).
                  </p>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="font-semibold text-stone-800 text-[11px]">
                      New predicted fall rate: 46.0%
                    </span>
                    <button
                      onClick={() => toggleQueue('planA')}
                      className={`text-xs font-bold px-3 py-1 rounded-md transition ${
                        queuedPlans.planA 
                          ? 'bg-[#0f766e] text-white' 
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      {queuedPlans.planA ? '✓ Queued' : 'Queue Taper Order'}
                    </button>
                  </div>
                </div>

                {/* Plan B */}
                <div className={`p-3.5 rounded-xl border transition space-y-2 ${
                  queuedPlans.planB ? 'bg-[#f0fdfa] border-teal-300' : 'bg-white border-stone-200'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-xs text-stone-900">
                      Plan B: Deprescribe PRN Diphenhydramine
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fee2e2] text-[#b91c1c] border border-[#fca5a5]">
                      Delirium Prevention
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    Deprescribe antihistamine order. Substitute Melatonin 1.0 mg PO QHS if needed. Eliminates +3 Anticholinergic Cognitive Burden.
                  </p>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="font-semibold text-stone-800 text-[11px]">
                      ACB Score: 4 → 1
                    </span>
                    <button
                      onClick={() => toggleQueue('planB')}
                      className={`text-xs font-bold px-3 py-1 rounded-md transition ${
                        queuedPlans.planB 
                          ? 'bg-[#0f766e] text-white' 
                          : 'bg-[#fee2e2] hover:bg-[#fecaca] text-[#b91c1c]'
                      }`}
                    >
                      {queuedPlans.planB ? '✓ Queued' : 'Queue Discontinuation'}
                    </button>
                  </div>
                </div>

                {/* Plan C */}
                <div className={`p-3.5 rounded-xl border transition space-y-2 ${
                  queuedPlans.planC ? 'bg-[#f0fdfa] border-teal-300' : 'bg-white border-stone-200'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-xs text-stone-900">
                      Plan C: Schedule Orthostatic BP &amp; Timed Diuresis
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                      Hemodynamics
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    Enforce strict 08:00 AM Furosemide administration; prohibit after 14:00. Order nursing orthostatic standing vitals TID.
                  </p>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="font-semibold text-stone-800 text-[11px]">
                      Reduces nocturnal bed transfers
                    </span>
                    <button
                      onClick={() => toggleQueue('planC')}
                      className={`text-xs font-bold px-3 py-1 rounded-md transition ${
                        queuedPlans.planC 
                          ? 'bg-[#0f766e] text-white' 
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      {queuedPlans.planC ? '✓ Queued' : 'Queue Protocol'}
                    </button>
                  </div>
                </div>

              </div>

              {/* Big Sign Button */}
              <div className="mt-5 space-y-2">
                <button
                  onClick={handleSignAll}
                  disabled={isSigning}
                  className="w-full py-3 px-4 bg-[#084c46] hover:bg-[#063934] text-white font-bold text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2"
                >
                  {isSigning ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  )}
                  <span>
                    {isSigned ? '✓ All 3 Adjustments Signed & Authorized' : 'Accept & Sign All 3 Adjustments'}
                  </span>
                </button>

                <button
                  onClick={() => setShowOverrideModal(true)}
                  className="w-full text-center text-xs font-semibold text-stone-500 hover:text-stone-800 py-1 transition"
                >
                  Override Recommendations with Clinical Justification...
                </button>
              </div>

            </div>

          </div>

        </div>

      </main>

      {/* ================= 4. OVERRIDE JUSTIFICATION MODAL ================= */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <h3 className="text-base font-bold text-stone-900">
              Override Clinical Decision Support Recommendation
            </h3>
            <p className="text-xs text-stone-600">
              Please document the clinical rationale for continuing current fall-risk increasing medications (FRIDs) despite active CDS alerts.
            </p>
            <textarea
              value={overrideText}
              onChange={(e) => setOverrideText(e.target.value)}
              placeholder="e.g., Palliative sleep protocol active; family counselled on fall precautions..."
              className="w-full h-24 text-xs p-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 text-stone-800"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleOverrideSubmit}
                className="px-4 py-1.5 text-xs font-bold bg-[#084c46] text-white rounded-lg hover:bg-[#063934]"
              >
                Submit Clinical Justification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 5. FULL SHAP MATRIX MODAL ================= */}
      {showShapMatrix && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900">
                Full Model Attributions Matrix (TreeSHAP &amp; GATv2 Attention)
              </h3>
              <button 
                onClick={() => setShowShapMatrix(false)}
                className="text-stone-400 hover:text-stone-600 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="divide-y divide-stone-100 text-xs">
              <div className="py-2 flex justify-between font-bold text-stone-500 uppercase text-[10px]">
                <span>Feature / Biomarker</span>
                <span>Value</span>
                <span>SHAP Impact</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <div>
                  <div className="font-bold text-stone-800">wDDI Regimen Burden</div>
                  <div className="text-[11px] text-stone-500">Lorazepam ↔ Furosemide Interaction</div>
                </div>
                <div className="text-stone-600 font-mono">1.00 DDI</div>
                <div className="font-mono text-teal-800 font-bold">+0.218</div>
              </div>
              <div className="py-2.5 flex justify-between">
                <div>
                  <div className="font-bold text-stone-800">Serum Creatinine Elevation</div>
                  <div className="text-[11px] text-stone-500">Peak Cr 1.80 mg/dL (CKD 3b)</div>
                </div>
                <div className="text-stone-600 font-mono">1.80 mg/dL</div>
                <div className="font-mono text-teal-800 font-bold">+0.174</div>
              </div>
              <div className="py-2.5 flex justify-between">
                <div>
                  <div className="font-bold text-stone-800">CNS Polypharmacy Active</div>
                  <div className="text-[11px] text-stone-500">3+ Sedative Hypnotic Classes</div>
                </div>
                <div className="text-stone-600 font-mono">True (1)</div>
                <div className="font-mono text-teal-800 font-bold">+0.130</div>
              </div>
              <div className="py-2.5 flex justify-between">
                <div>
                  <div className="font-bold text-stone-800">Loop Diuretic Volume Depletion</div>
                  <div className="text-[11px] text-stone-500">Furosemide 40 mg PO QAM</div>
                </div>
                <div className="text-stone-600 font-mono">40 mg</div>
                <div className="font-mono text-teal-800 font-bold">+0.092</div>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowShapMatrix(false)}
                className="px-4 py-1.5 text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
