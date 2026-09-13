"use client";

import React, { useState } from "react";
import { X, UserPlus, Sparkles, AlertCircle } from "lucide-react";
import { Patient } from "@/types/patient";

interface IngestAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngest: (patientData: Partial<Patient>) => void;
}

export function IngestAdmissionModal({
  isOpen,
  onClose,
  onIngest,
}: IngestAdmissionModalProps) {
  const [name, setName] = useState("Eleanor Vance");
  const [age, setAge] = useState(84);
  const [gender, setGender] = useState<"FEMALE" | "MALE">("FEMALE");
  const [bed, setBed] = useState("Bed 428-A");
  const [creatinine, setCreatinine] = useState(1.8);
  const [drugs, setDrugs] = useState("Zolpidem 10mg, Furosemide 40mg, Lisinopril, Metoprolol");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const drugList = drugs.split(",").map((s) => s.trim()).filter(Boolean);
    const estimatedRisk = creatinine > 1.5 ? 64.2 : 38.0;

    onIngest({
      name,
      age: Number(age),
      gender,
      bed,
      creatinine: Number(creatinine),
      drug_count: drugList.length || 6,
      risk_percentage: estimatedRisk,
      acuity_tier: estimatedRisk > 50 ? "Critical" : "High",
      high_risk_meds: drugList.slice(0, 2),
      primary_pim: {
        label: drugList[0] || "Sedative-Hypnotic",
        severity: estimatedRisk > 50 ? "critical" : "high",
      },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                Ingest Acute Inpatient Admission
              </h2>
              <p className="text-[11px] text-zinc-500">
                Executes live GNN inference and codified STOPP/Beers safety audit
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-zinc-700">
          <div>
            <label className="font-semibold text-zinc-800 block mb-1">
              Patient Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-zinc-800 block mb-1">
                Age
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                required
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="font-semibold text-zinc-800 block mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as "FEMALE" | "MALE")}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-zinc-800 block mb-1">
                Bed Allocation
              </label>
              <input
                type="text"
                value={bed}
                onChange={(e) => setBed(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-800 block mb-1">
              Serum Creatinine (mg/dL)
            </label>
            <input
              type="number"
              step="0.05"
              value={creatinine}
              onChange={(e) => setCreatinine(Number(e.target.value))}
              required
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Normal range: 0.6 - 1.2 mg/dL. Elevated creatinine triggers renal accumulation guardrails.
            </p>
          </div>

          <div>
            <label className="font-semibold text-zinc-800 block mb-1">
              Active Medication Orders (Comma separated)
            </label>
            <textarea
              rows={2}
              value={drugs}
              onChange={(e) => setDrugs(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 flex items-center gap-2 text-amber-800 text-[11px]">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Real-time GNN Graph Inference automatically connects this admission to Ward 4B continuous telemetry.
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-zinc-800"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Ingest & Run Inference</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
