"use client";

import React from "react";
import { X, ShieldCheck, AlertOctagon, BedDouble, CheckCircle } from "lucide-react";
import { Patient } from "@/types/patient";

interface SafetyHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
}

export function SafetyHandoffModal({
  isOpen,
  onClose,
  patients,
}: SafetyHandoffModalProps) {
  if (!isOpen) return null;

  const criticalPatients = patients.filter((p) => p.acuity_tier === "Critical");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                Nursing & Pharmacy Safety Handoff Brief
              </h2>
              <p className="text-[11px] text-zinc-500">
                Shift change high-fall-acuity surveillance & telemetry bed armed status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-zinc-700">
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-rose-900 text-sm block">
                {criticalPatients.length} Patients in Critical Acuity (&gt;50% Fall Hazard)
              </strong>
              <p className="text-rose-700 mt-1">
                Mandatory unassisted transfer prevention protocol active. Bedside alarms and non-slip footwear confirmed.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold uppercase tracking-wider text-[11px] text-zinc-500">
              Critical Bed Assignments
            </h3>
            {criticalPatients.map((p) => (
              <div
                key={p.hadm_id}
                className="rounded-lg border border-zinc-200 bg-white p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <BedDouble className="w-4 h-4 text-zinc-400" />
                  <div>
                    <div className="font-bold text-zinc-900">{p.name}</div>
                    <div className="text-[11px] text-zinc-500">
                      {p.bed} • {p.mrn} • eGFR {p.renal_egfr}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="rounded bg-rose-100 text-rose-700 px-2 py-0.5 text-[11px] font-bold">
                    {p.risk_percentage}%
                  </span>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    Bed Sensor Armed
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 flex items-center justify-between text-zinc-600">
            <span>On-Duty Clinical Pharmacist:</span>
            <strong className="text-zinc-900">Dr. Marcus Vance, PharmD, BCGP (Ext: 3810)</strong>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-zinc-100 bg-zinc-50/50">
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-950 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-zinc-800 transition"
          >
            Acknowledge & Sign Handoff
          </button>
        </div>
      </div>
    </div>
  );
}
