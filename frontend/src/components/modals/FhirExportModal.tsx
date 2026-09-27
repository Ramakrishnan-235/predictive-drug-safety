"use client";

import React, { useState } from "react";
import { X, Download, Copy, Check, FileCode2 } from "lucide-react";
import { Patient } from "@/types/patient";

interface FhirExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient | null;
}

export function FhirExportModal({
  isOpen,
  onClose,
  patient,
}: FhirExportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const pat = patient || {
    hadm_id: 88421,
    mrn: "#MRN-88421",
    name: "Eleanor Vance",
    age: 84,
    gender: "female",
    risk_percentage: 68.4,
    acuity_tier: "Critical",
  };

  const fhirBundle = {
    resourceType: "Bundle",
    id: "bundle-gerisafe-4b-2026",
    meta: {
      lastUpdated: new Date().toISOString(),
      profile: ["http://hl7.org/fhir/StructureDefinition/Bundle"],
    },
    type: "collection",
    entry: [
      {
        fullUrl: `urn:uuid:patient-${pat.hadm_id}`,
        resource: {
          resourceType: "Patient",
          id: String(pat.hadm_id),
          identifier: [
            {
              system: "http://hospital.smarthealth.org/mrn",
              value: pat.mrn,
            },
          ],
          name: [
            {
              use: "official",
              family: pat.name.split(" ").slice(-1)[0],
              given: pat.name.split(" ").slice(0, -1),
            },
          ],
          gender: pat.gender.toLowerCase(),
        },
      },
      {
        fullUrl: `urn:uuid:risk-${pat.hadm_id}`,
        resource: {
          resourceType: "RiskAssessment",
          id: `risk-${pat.hadm_id}`,
          status: "final",
          subject: {
            reference: `Patient/${pat.hadm_id}`,
            display: pat.name,
          },
          basis: [
            { display: "GeriSafe Multimodal GNN Model v2.4" },
            { display: "AGS Beers Criteria 2023 Table 2" },
            { display: "STOPP/START Version 3 Section K" },
          ],
          prediction: [
            {
              outcome: {
                coding: [
                  {
                    system: "http://snomed.info/sct",
                    code: "217082002",
                    display: "Accidental Fall during inpatient stay",
                  },
                ],
                text: `Acute Inpatient Fall Hazard: ${pat.risk_percentage}% (${pat.acuity_tier})`,
              },
              probabilityDecimal: Number((pat.risk_percentage / 100).toFixed(4)),
            },
          ],
        },
      },
    ],
  };

  const jsonString = JSON.stringify(fhirBundle, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FHIR-R4-FallRisk-${pat.hadm_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <FileCode2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                HL7 FHIR R4 Bundle Export
              </h2>
              <p className="text-[11px] text-zinc-500">
                Standardized EHR interoperability payload conforming to US Core RiskAssessment profile
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

        {/* Body */}
        <div className="p-5">
          <div className="rounded-xl border border-zinc-200 bg-zinc-900 p-3.5 font-mono text-[11px] text-emerald-400 max-h-80 overflow-y-auto">
            <pre>{jsonString}</pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 bg-zinc-50/50">
          <span className="text-[11px] text-zinc-500">
            Validated against HL7 FHIR v4.0.1
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-zinc-800 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Bundle</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
