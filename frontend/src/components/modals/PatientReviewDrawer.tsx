"use client";

import React, { useState } from "react";
import {
  X,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  FileCheck,
  TrendingDown,
  Activity,
  Zap,
} from "lucide-react";
import { Patient } from "@/types/patient";

interface PatientReviewDrawerProps {
  patient: Patient | null;
  onClose: () => void;
  onSignOrders?: (patientId: number, planIds: string[]) => void;
}

export function PatientReviewDrawer({
  patient,
  onClose,
  onSignOrders,
}: PatientReviewDrawerProps) {
  const [selectedPlans, setSelectedPlans] = useState<string[]>([
    "plan_a",
    "plan_b",
  ]);
  const [isSigned, setIsSigned] = useState(false);
  const [currentRisk, setCurrentRisk] = useState<number | null>(null);

  if (!patient) return null;

  const displayRisk = currentRisk !== null ? currentRisk : patient.risk_percentage;

  const plans = [
    {
      id: "plan_a",
      title: "Plan A: Taper Sedative-Hypnotic by 50%",
      delta: "-22.4% Fall Risk",
      deltaType: "success",
      desc: "Step down dose PO QHS x 3 nights. Initiate nursing sleep hygiene protocol (dimming, sound machines).",
      impact: "New predicted fall rate: 46.0%",
    },
    {
      id: "plan_b",
      title: "Plan B: Deprescribe PRN Anticholinergics",
      delta: "Delirium Prevention",
      deltaType: "danger",
      desc: "Eliminate OTC sleep aids. Substitute Melatonin 1mg PO QHS if needed. Eliminates +3 Anticholinergic Cognitive Burden.",
      impact: "ACB Score: 4 → 1",
    },
    {
      id: "plan_c",
      title: "Plan C: Schedule Orthostatic BP & Timed Diuresis",
      delta: "Hemodynamics",
      deltaType: "neutral",
      desc: "Enforce strict morning Furosemide dosing; prohibit after 14:00. Order nursing orthostatic standing vitals TID.",
      impact: "Reduces nocturnal bed transfers",
    },
  ];

  const handleTogglePlan = (id: string) => {
    setSelectedPlans((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSign = () => {
    setIsSigned(true);
    setCurrentRisk(26.8);
    if (onSignOrders) {
      onSignOrders(patient.hadm_id, selectedPlans);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* DRAWER HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-900 text-white font-bold flex items-center justify-center text-sm">
              {patient.initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900">
                  {patient.name}
                </h2>
                <span className="rounded bg-zinc-200 px-1.5 py-0.2 text-[10px] font-semibold text-zinc-700">
                  {patient.mrn}
                </span>
                <span className="rounded bg-rose-50 border border-rose-200 px-2 py-0.2 text-[10px] font-bold text-rose-700 uppercase">
                  {patient.acuity_tier}
                </span>
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {patient.bed} • {patient.age} yo {patient.gender} • eGFR{" "}
                {patient.renal_egfr} ({patient.renal_stage})
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* DRAWER BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-xs text-zinc-700">
          {/* Risk Overview Callout */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-rose-800 font-bold uppercase tracking-wider text-[11px]">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Multimodal GNN Acute Fall Hazard</span>
              </div>
              <p className="text-xs text-rose-700 max-w-md">
                Precipitated by synergistic GABA-A sedation and loop diuretic volume depletion under CKD clearance impairment.
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-3xl font-extrabold text-rose-600 tracking-tight">
                {displayRisk}%
              </div>
              <span className="text-[10px] font-semibold text-rose-500 uppercase">
                {isSigned ? "Mitigated Acuity" : "Critical Acuity"}
              </span>
            </div>
          </div>

          {/* Clinical Vital Signs & Renal Metrics */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
              Hemodynamics & Pharmacokinetics
            </h3>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                  Blood Pressure Delta
                </span>
                <div className="text-sm font-bold text-zinc-900 mt-1">
                  {patient.blood_pressure} mmHg
                </div>
                <div className="text-[11px] font-semibold text-rose-600 mt-0.5">
                  Drop {patient.bp_drop} mmHg (Orthostatic)
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                  Renal Clearance
                </span>
                <div className="text-sm font-bold text-zinc-900 mt-1">
                  eGFR {patient.renal_egfr} mL/min
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Cr {patient.creatinine} mg/dL
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                  Total Active Regimen
                </span>
                <div className="text-sm font-bold text-zinc-900 mt-1">
                  {patient.drug_count} Medications
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  {patient.prn_count} PRN Orders
                </div>
              </div>
            </div>
          </div>

          {/* GNN SHAP Feature Attributions */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
              GNN SHAP Feature Importance Breakdown
            </h3>
            <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3.5">
              {[
                {
                  feature: "wDDI Regimen Burden: GABA-A + Diuretic Synergy",
                  weight: 0.38,
                  pct: 38,
                },
                {
                  feature: "Renal Clearance Impairment (eGFR < 30)",
                  weight: 0.28,
                  pct: 28,
                },
                {
                  feature: "CNS Polypharmacy Active (Sedatives + PRN)",
                  weight: 0.21,
                  pct: 21,
                },
                {
                  feature: "Acute Orthostatic Blood Pressure Drop",
                  weight: 0.13,
                  pct: 13,
                },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs font-medium text-zinc-800 mb-1">
                    <span>{item.feature}</span>
                    <span className="font-bold text-zinc-900">+{item.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-rose-500"
                      style={{ width: `${item.pct * 2}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deprescribing Action Plans */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Recommended Deprescribing Protocol
              </h3>
              <span className="text-[11px] text-zinc-500">
                Select plans to include in CPOE order
              </span>
            </div>

            <div className="space-y-2.5">
              {plans.map((p) => {
                const isSelected = selectedPlans.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => handleTogglePlan(p.id)}
                    className={`rounded-xl border p-3.5 cursor-pointer transition ${
                      isSelected
                        ? "border-zinc-800 bg-zinc-50/50 shadow-xs"
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleTogglePlan(p.id)}
                          className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                        />
                        <span className="font-bold text-zinc-900 text-xs">
                          {p.title}
                        </span>
                      </div>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.2 text-[10px] font-bold">
                        {p.delta}
                      </span>
                    </div>
                    <p className="text-zinc-600 text-xs mt-1.5 pl-6">{p.desc}</p>
                    <div className="text-[11px] font-semibold text-zinc-500 mt-1 pl-6">
                      Target: {p.impact}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* DRAWER FOOTER (CPOE Sign Action) */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between gap-4">
          <div>
            {isSigned ? (
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                <CheckCircle className="w-4 h-4" />
                <span>Orders signed & transmitted to Pharmacy EHR</span>
              </div>
            ) : (
              <div className="text-xs text-zinc-500">
                Signed by: <strong className="text-zinc-800">Dr. Sarah Chen, MD</strong>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition"
            >
              Close
            </button>
            <button
              disabled={isSigned || selectedPlans.length === 0}
              onClick={handleSign}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-zinc-800 disabled:opacity-50 transition"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>{isSigned ? "Orders Authorized" : "Sign CPOE Order"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
