"use client";

import { useState } from "react";
import { X, ShieldAlert, CheckCircle, FileCheck } from "lucide-react";
import type { Patient } from "@/types/patient";
import { usePatientDetail, useSignOrders } from "@/hooks/useWardData";

interface PatientReviewDrawerProps {
  patient: Patient;
  onClose: () => void;
}

export function PatientReviewDrawer({ patient, onClose }: PatientReviewDrawerProps) {
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const detail = usePatientDetail(patient.hadm_id);
  const signing = useSignOrders();
  const plans = detail.data?.deprescribing_plans ?? [];
  const selectedActionIds = selectedPlans.filter(id => plans.some(plan => plan.id === id && !plan.is_queued));

  const togglePlan = (id: string) => {
    if (signing.isPending) return;
    setSelectedPlans(previous => previous.includes(id) ? previous.filter(plan => plan !== id) : [...previous, id]);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div role="dialog" aria-modal="true" aria-label={`Medication review for ${patient.name}`} className="w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-900 text-white font-bold flex items-center justify-center text-sm">{patient.initials}</div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">{patient.name} <span className="text-xs font-normal">{patient.mrn}</span></h2>
              <p className="text-xs text-zinc-500">{patient.bed} • {patient.age} yo {patient.gender} • {patient.acuity_tier}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close patient review" className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-xs text-zinc-700">
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-rose-800 font-bold"><ShieldAlert className="w-4 h-4" />Current Fall Risk</div>
              <p className="mt-1 text-rose-700">Signing an order records authorization. Risk changes require execution and reassessment.</p>
            </div>
            <div className="text-3xl font-extrabold text-rose-600">{patient.risk_percentage}%</div>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-zinc-400">Blood Pressure</div>
              <div className="font-bold mt-1">{patient.blood_pressure ? `${patient.blood_pressure} mmHg` : "Unavailable"}</div>
              <div className="mt-1">{patient.bp_drop == null ? "Postural change unavailable" : `Postural change ${patient.bp_drop} mmHg`}</div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-zinc-400">Renal Clearance</div>
              <div className="font-bold mt-1">{patient.renal_egfr == null ? "eGFR unavailable" : `eGFR ${patient.renal_egfr} mL/min`}</div>
              <div className="mt-1">{patient.renal_stage ?? "Stage unavailable"}</div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-zinc-400">Active Regimen</div>
              <div className="font-bold mt-1">{patient.drug_count} medications</div>
              <div className="mt-1">{patient.prn_count} PRN orders</div>
            </div>
          </div>
          {detail.data?.clinical_rationale && <p className="rounded-lg border border-zinc-200 p-4">{detail.data.clinical_rationale}</p>}
          <div>
            <h3 className="font-bold uppercase tracking-wider text-zinc-500 mb-3">Deprescribing Action Plans</h3>
            {detail.isPending && <p role="status">Loading this patient&apos;s plans…</p>}
            {detail.isError && <p role="alert" className="text-rose-700">Could not load patient plans: {detail.error.message}</p>}
            {detail.isSuccess && plans.length === 0 && <p>No authorized deprescribing plans are available for this patient. Clinical review is required.</p>}
            <div className="space-y-2.5">
              {plans.map(plan => (
                <label key={plan.id} className="block rounded-xl border border-zinc-200 p-3.5">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={plan.is_queued || selectedPlans.includes(plan.id)} disabled={plan.is_queued || signing.isPending} onChange={() => togglePlan(plan.id)} />
                    <span className="font-bold">{plan.title}</span>
                    {plan.is_queued && <span className="text-emerald-700">Authorized</span>}
                  </div>
                  <p className="mt-1.5 pl-6">{plan.description ?? plan.desc}</p>
                  {plan.impact && <p className="mt-1 pl-6 text-zinc-500">{plan.impact}</p>}
                </label>
              ))}
            </div>
          </div>
          {signing.isError && <p role="alert" className="text-rose-700">Orders were not confirmed: {signing.error.message}</p>}
          {signing.isSuccess && <p role="status" className="flex items-center gap-2 text-emerald-700"><CheckCircle className="w-4 h-4" />Authorization recorded. Audit reference: {signing.data.audit_id}</p>}
        </div>

        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs">Close</button>
          <button disabled={signing.isPending || selectedActionIds.length === 0 || !detail.isSuccess} onClick={() => signing.mutate({ patientId: patient.hadm_id, actionIds: selectedActionIds })} className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
            <FileCheck className="w-3.5 h-3.5" />{signing.isPending ? "Authorizing…" : `Sign ${selectedActionIds.length} CPOE Orders`}
          </button>
        </div>
      </div>
    </div>
  );
}
