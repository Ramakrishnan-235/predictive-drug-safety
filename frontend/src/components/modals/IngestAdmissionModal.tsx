"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  X,
  User,
  FlaskConical,
  Zap,
  RotateCcw,
  Pill,
  ClipboardList,
  Search,
  Link2,
  ShieldAlert,
  AlertTriangle,
  Bot,
  Activity,
  Clock,
  ArrowRight,
  Check,
  Sparkles,
} from "lucide-react";
import { AdmissionRequest, AcuityTier } from "@/types/patient";
import { searchCuratedDrugs } from "@/lib/drugVocabulary";
import { apiRequest } from "@/lib/api";

interface IngestAdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngest: (patientData: AdmissionRequest) => Promise<void>;
}

interface PipelineResponse {
  pipeline_stages?: {
    stage_2_gnn_inference?: {
      risk_percentage?: number;
      acuity_tier?: AcuityTier;
      relative_risk?: string;
      model_confidence?: string;
      w_ddi_burden_score?: number | string;
      detected_interactions?: Array<{ pair: string | string[]; mechanism?: string; attention_weight?: number | string }>;
      top_features?: Array<{ feature: string; importance?: number }>;
    };
    stage_3_medgemma_verification?: {
      clinical_rationale?: string;
      primary_culprit_cascade?: string[];
    };
  };
}

// 8 Codified FRID Categories from AGS Beers 2023 and STOPP v3
const FRID_DEFINITIONS = [
  { id: "bzd", label: "Benzodiazepines & Z-Drugs", keywords: ["lorazepam", "diazepam", "temazepam", "clonazepam", "alprazolam", "zolpidem", "zaleplon", "eszopiclone"] },
  { id: "antipsychotics", label: "Antipsychotics", keywords: ["haloperidol", "quetiapine", "risperidone", "olanzapine", "aripiprazole"] },
  { id: "anticholinergics", label: "Anticholinergics & Antihistamines", keywords: ["diphenhydramine", "hydroxyzine", "promethazine", "meclizine", "oxybutynin"] },
  { id: "tca", label: "Tricyclic & Sedating Antidepressants", keywords: ["amitriptyline", "nortriptyline", "trazodone", "mirtazapine"] },
  { id: "vasodilators", label: "Vasodilators & Alpha-Blockers", keywords: ["hydralazine", "nitroglycerin", "isosorbide", "prazosin", "clonidine"] },
  { id: "loop_diuretics", label: "Loop Diuretics", keywords: ["furosemide", "bumetanide", "torsemide"] },
  { id: "opioids", label: "Opioids", keywords: ["morphine", "oxycodone", "hydromorphone", "fentanyl", "tramadol"] },
  { id: "antiepileptics", label: "Antiepileptics / Neuropathics", keywords: ["gabapentin", "pregabalin", "carbamazepine", "levetiracetam"] },
];

export function IngestAdmissionModal({
  isOpen,
  onClose,
  onIngest,
}: IngestAdmissionModalProps) {
  // 1. Patient Identifiers & Demographics
  const [name, setName] = useState("Robert Miller");
  const [mrn, setMrn] = useState("#884210");
  const [age, setAge] = useState(41);
  const [gender, setGender] = useState<"MALE" | "FEMALE">("FEMALE");
  const [bed, setBed] = useState("Bed 402-A");

  // 2. Renal Biomarkers
  const [creatinine, setCreatinine] = useState(7.85);
  const [creatinineMin, setCreatinineMin] = useState(1.20);
  const [creatinineMax, setCreatinineMax] = useState(7.85);
  const [creatinineAvg, setCreatinineAvg] = useState(1.50);

  // 3. Drug Regimen
  const [drugsInput, setDrugsInput] = useState(
    "Hydralazine 25mg TID"
  );

  // 4. FRID Manual Overrides (Default checked classes matching screenshot)
  const [manualFridOverrides, setManualFridOverrides] = useState<Record<string, boolean>>({
    antipsychotics: true,
    tca: true,
    vasodilators: true,
    opioids: true,
    antiepileptics: true,
  });

  // 5. Ingestion UI state
  const [isComputing, setIsComputing] = useState(false);
  const [pipelineStage, setPipelineStage] = useState<"idle" | "structuring" | "gnn_inference" | "verifying" | "complete">("idle");
  const [pipelineResult, setPipelineResult] = useState<{ inputKey: string; data: PipelineResponse } | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pipelineController = useRef<AbortController | null>(null);
  const inputKey = JSON.stringify({ name, mrn, age, gender, bed, creatinine, creatinineMin, creatinineMax, creatinineAvg, drugsInput });
  const pipelineData = pipelineResult?.inputKey === inputKey ? pipelineResult.data : null;

  useEffect(() => () => pipelineController.current?.abort(), []);

  // Interactive MedGemma Query state
  const [clinicalQuery, setClinicalQuery] = useState("");
  const [queryResponse, setQueryResponse] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);

  // Search Type-Ahead State
  const [drugSearchQuery, setDrugSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPasteMode, setIsPasteMode] = useState(false);

  // Derive drug array
  const parsedDrugs = useMemo(() => {
    return drugsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [drugsInput]);

  const searchResults = useMemo(() => {
    return searchCuratedDrugs(drugSearchQuery, 8);
  }, [drugSearchQuery]);

  // Add drug
  const handleAddDrug = useCallback((drugName: string, dose?: string, freq?: string) => {
    const formatted = [drugName, dose || "", freq || ""].filter(Boolean).join(" ").trim();
    if (!formatted) return;

    setDrugsInput((prev) => {
      const existing = prev.split(",").map((s) => s.trim()).filter(Boolean);
      const alreadyHas = existing.some(
        (d) => d.toLowerCase().startsWith(drugName.toLowerCase()) || drugName.toLowerCase().startsWith(d.toLowerCase())
      );
      if (alreadyHas) return prev;
      return existing.length > 0 ? `${prev}, ${formatted}` : formatted;
    });

    setDrugSearchQuery("");
    setIsDropdownOpen(false);
  }, []);

  // Remove drug
  const handleRemoveDrug = useCallback((indexToRemove: number) => {
    setDrugsInput((prev) => {
      const existing = prev.split(",").map((s) => s.trim()).filter(Boolean);
      return existing.filter((_, i) => i !== indexToRemove).join(", ");
    });
  }, []);

  // Helper to identify FRID class for a drug token
  const getDrugFridBadge = useCallback((drugStr: string) => {
    const lower = drugStr.toLowerCase();
    for (const def of FRID_DEFINITIONS) {
      if (def.keywords.some((k) => lower.includes(k))) {
        return def.label.toUpperCase().split("&")[0].trim();
      }
    }
    return "VASODILATORS";
  }, []);

  // Cockcroft-Gault / CKD-EPI approximate eGFR calculation
  const calculatedEgfr = useMemo(() => {
    if (creatinine <= 0) return 90;
    const factor = gender === "FEMALE" ? 0.85 : 1.0;
    const egfr = Math.round((((140 - age) * 72) / (72 * creatinine)) * factor);
    return Math.max(12, Math.min(120, egfr));
  }, [age, gender, creatinine]);

  const ckdStage = useMemo(() => {
    if (calculatedEgfr >= 90) return "Normal / Preserved";
    if (calculatedEgfr >= 60) return "CKD Stage 2";
    if (calculatedEgfr >= 45) return "CKD Stage 3a";
    if (calculatedEgfr >= 30) return "CKD Stage 3b";
    if (calculatedEgfr >= 15) return "CKD Stage 4";
    return "CKD Stage 5 (End-Stage)";
  }, [calculatedEgfr]);

  // Determine active FRID classes from parsed drugs or manual toggles
  const activeFridMap = useMemo(() => {
    const text = drugsInput.toLowerCase();
    const map: Record<string, boolean> = {};
    for (const def of FRID_DEFINITIONS) {
      if (manualFridOverrides[def.id] !== undefined) {
        map[def.id] = manualFridOverrides[def.id];
      } else {
        map[def.id] = def.keywords.some((kw) => text.includes(kw));
      }
    }
    return map;
  }, [drugsInput, manualFridOverrides]);

  const totalFridCount = useMemo(() => {
    return Object.values(activeFridMap).filter(Boolean).length;
  }, [activeFridMap]);

  // CNS Polypharmacy Flag (>=3 CNS classes)
  const cnsPolypharmacyFlag = useMemo(() => {
    const cnsClasses = ["bzd", "antipsychotics", "tca", "opioids", "antiepileptics"];
    const activeCns = cnsClasses.filter((c) => activeFridMap[c]).length;
    return activeCns >= 3;
  }, [activeFridMap]);

  // Renal Accumulation Flag
  const renalAccumulationFlag = useMemo(() => {
    return creatinine > 1.5;
  }, [creatinine]);

  // Detected Pairwise DDI
  const detectedDdiPairs = useMemo<Array<{ pair: string; mechanism: string; attnWeight: string }>>(() => {
    if (pipelineData?.pipeline_stages?.stage_2_gnn_inference?.detected_interactions?.length) {
      return pipelineData.pipeline_stages.stage_2_gnn_inference.detected_interactions.map((d) => ({
        pair: Array.isArray(d.pair) ? `${d.pair[0]} ↔ ${d.pair[1]}` : String(d.pair),
        mechanism: d.mechanism || "Pharmacodynamic Synergism",
        attnWeight: typeof d.attention_weight === "number" ? d.attention_weight.toFixed(3) : String(d.attention_weight || "0.600"),
      }));
    }
    if (pipelineData) return [];
    const lower = drugsInput.toLowerCase();
    const pairs: Array<{ pair: string; mechanism: string; attnWeight: string }> = [];

    if (lower.includes("lorazepam") && lower.includes("diphenhydramine")) {
      pairs.push({
        pair: "Lorazepam ↔ Diphenhydramine",
        mechanism: "Synergistic CNS Depression",
        attnWeight: "0.650",
      });
    }
    if (lower.includes("furosemide") && lower.includes("hydralazine")) {
      pairs.push({
        pair: "Furosemide ↔ Hydralazine",
        mechanism: "Profound Orthostatic Hypotension",
        attnWeight: "0.600",
      });
    }
    if (lower.includes("lorazepam") && lower.includes("furosemide")) {
      pairs.push({
        pair: "Lorazepam ↔ Furosemide",
        mechanism: "Additive Sedation + Orthostasis",
        attnWeight: "0.580",
      });
    }
    if (lower.includes("gabapentin") && (lower.includes("lorazepam") || lower.includes("opioid") || lower.includes("tramadol"))) {
      pairs.push({
        pair: "Gabapentin ↔ CNS Depressant",
        mechanism: "Enhanced Neurotoxicity & Ataxia",
        attnWeight: "0.620",
      });
    }

    if (pairs.length === 0) {
      if (parsedDrugs.length >= 2) {
        pairs.push({
          pair: `${parsedDrugs[0]} ↔ ${parsedDrugs[1]}`,
          mechanism: "Pharmacodynamic Drug Interaction",
          attnWeight: "0.550",
        });
      } else if (parsedDrugs.length === 1) {
        pairs.push({
          pair: `${parsedDrugs[0]} ↔ Postural Vasomotor Tone`,
          mechanism: "Vascular Tone & Orthostasis Impact",
          attnWeight: "0.500",
        });
      } else {
        pairs.push({
          pair: "Regimen Evaluation ↔ Baseline",
          mechanism: "Baseline Fall Risk Evaluation",
          attnWeight: "0.350",
        });
      }
    }
    return pairs;
  }, [pipelineData, drugsInput, parsedDrugs]);

  // GNN Prediction Values
  const gnnDisplay = useMemo(() => {
    if (pipelineData?.pipeline_stages?.stage_2_gnn_inference) {
      const s2 = pipelineData.pipeline_stages.stage_2_gnn_inference;
      const risk = Number(s2.risk_percentage ?? 29.6);
      const tier = (s2.acuity_tier || (risk >= 50 ? "Critical" : risk >= 25 ? "Moderate" : "Low")) as AcuityTier;
      return {
        riskPercentage: risk,
        relativeRisk: s2.relative_risk ? (s2.relative_risk.includes("vs") ? s2.relative_risk : `${s2.relative_risk} vs baseline`) : `${(risk / 18.2).toFixed(2)}x vs baseline`,
        acuityTier: tier,
        acuityTierLabel: `${tier.toUpperCase()} HAZARD TIER`,
        confidence: s2.model_confidence || "Unavailable",
        wDdiScore: String(s2.w_ddi_burden_score ?? "0.92"),
      };
    }

    // Dynamic Calibrated Baseline
    let baseRisk = 12.0;
    if (calculatedEgfr < 30) baseRisk += 14.0;
    else if (calculatedEgfr < 60) baseRisk += 7.0;
    baseRisk += Math.min(20, totalFridCount * 3.5);
    if (cnsPolypharmacyFlag) baseRisk += 12.0;
    if (parsedDrugs.length > 2) baseRisk += (parsedDrugs.length - 2) * 2.5;

    const risk = Math.min(95.0, Math.max(8.0, Math.round(baseRisk * 10) / 10));
    const tier: AcuityTier = risk >= 50 ? "Critical" : risk >= 25 ? "Moderate" : "Low";
    const relRisk = `${(risk / 18.2).toFixed(2)}x vs baseline`;

    return {
      riskPercentage: risk,
      relativeRisk: relRisk,
      acuityTier: tier,
      acuityTierLabel: `${tier.toUpperCase()} HAZARD TIER`,
      confidence: "Demo estimate",
      wDdiScore: totalFridCount >= 3 ? "1.42" : totalFridCount >= 1 ? "0.92" : "0.25",
    };
  }, [pipelineData, calculatedEgfr, totalFridCount, cnsPolypharmacyFlag, parsedDrugs.length]);

  // Dynamic Feature Attributions
  const featureAttributions = useMemo<Array<{ feature: string; importancePct: number; color: string; textColor: string }>>(() => {
    if (pipelineData?.pipeline_stages?.stage_2_gnn_inference?.top_features?.length) {
      return pipelineData.pipeline_stages.stage_2_gnn_inference.top_features.map((f, idx) => {
        const colors = [
          { bar: "bg-rose-500", text: "text-rose-600" },
          { bar: "bg-amber-500", text: "text-amber-600" },
          { bar: "bg-blue-500", text: "text-blue-600" },
          { bar: "bg-slate-400", text: "text-slate-600" },
        ];
        const c = colors[idx % colors.length];
        return {
          feature: f.feature,
          importancePct: Math.round((f.importance ?? 0) * 100),
          color: c.bar,
          textColor: c.text,
        };
      });
    }
    if (pipelineData) return [];
    return [
      { feature: "wDDI Interacting Pairs Burden", importancePct: 38, color: "bg-rose-500", textColor: "text-rose-600" },
      { feature: `eGFR Decline (${ckdStage})`, importancePct: 29, color: "bg-amber-500", textColor: "text-amber-600" },
      { feature: cnsPolypharmacyFlag ? "Cumulative Anticholinergic ACB +3" : "Active FRID Prescribing Cascade", importancePct: 19, color: "bg-blue-500", textColor: "text-blue-600" },
      { feature: age >= 80 ? "Age > 80 Polypharmacy" : `Age ${age} Fragility Profile`, importancePct: 14, color: "bg-slate-400", textColor: "text-slate-600" },
    ];
  }, [pipelineData, ckdStage, cnsPolypharmacyFlag, age]);

  // Dynamic MedGemma Causal Explanation
  const clinicalRationale = useMemo<string>(() => {
    if (pipelineData?.pipeline_stages?.stage_3_medgemma_verification?.clinical_rationale) {
      return pipelineData.pipeline_stages.stage_3_medgemma_verification.clinical_rationale;
    }
    if (pipelineData) return "No server clinical rationale is available.";
    const medList = parsedDrugs.join(", ") || "the active regimen";
    return `Local demonstration estimate: ${gnnDisplay.riskPercentage}% (${gnnDisplay.acuityTier}) for ${name} (${age}yo), with ${medList}. Run the server pipeline for an evaluated clinical rationale. This summary has not been verified by MedGemma.`;
  }, [pipelineData, gnnDisplay, name, age, parsedDrugs]);

  // Dynamic Prescribing Cascade
  const culpritCascade = useMemo<string[]>(() => {
    if (pipelineData?.pipeline_stages?.stage_3_medgemma_verification?.primary_culprit_cascade?.length) {
      return pipelineData.pipeline_stages.stage_3_medgemma_verification.primary_culprit_cascade;
    }
    if (pipelineData) return [];
    const items: string[] = [];
    const lower = drugsInput.toLowerCase();
    if (lower.includes("hydralazine")) {
      items.push("Hydralazine (Arteriolar Vasodilation & Postural Orthostasis)");
    }
    if (lower.includes("lorazepam") || lower.includes("bzd")) {
      items.push("Lorazepam / Sedative (GABAA Psychomotor Ataxia Lead)");
    }
    if (lower.includes("furosemide")) {
      items.push("Furosemide (Intravascular Contraction & Nocturia)");
    }
    if (lower.includes("diphenhydramine")) {
      items.push("Diphenhydramine (Anticholinergic ACB +3 Delirium Precipitant)");
    }
    for (const d of parsedDrugs) {
      if (!items.some((it) => it.toLowerCase().includes(d.toLowerCase())) && items.length < 3) {
        items.push(`${d} (Active Regimen Component)`);
      }
    }
    if (calculatedEgfr < 60) {
      items.push(`Renal Clearance Deficit (eGFR ${calculatedEgfr} mL/min — ${ckdStage} Accumulation)`);
    }
    if (items.length === 0) {
      items.push("Active Regimen Fall Risk Burden", `Renal Clearance Function (eGFR ${calculatedEgfr} mL/min)`);
    }
    return items.map((it, idx) => (it.startsWith(`${idx + 1}.`) ? it : `${idx + 1}. ${it}`));
  }, [pipelineData, drugsInput, parsedDrugs, calculatedEgfr, ckdStage]);

  // Run Pipeline
  const handleRunPipeline = useCallback(async () => {
    if (isComputing) return;
    setIsComputing(true);
    setPipelineError(null);
    setPipelineResult(null);
    setPipelineStage("gnn_inference");
    const controller = new AbortController();
    pipelineController.current = controller;
    try {
      const data = await apiRequest<PipelineResponse>("/medgemma/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          name,
          mrn,
          age: Number(age),
          gender,
          bed,
          creatinine: Number(creatinine),
          creatinine_min: Number(creatinineMin),
          creatinine_max: Number(creatinineMax),
          creatinine_avg: Number(creatinineAvg),
          drugs_text: drugsInput,
          save_to_census: false,
        }),
      }, 60000);
      if (!Number.isFinite(data.pipeline_stages?.stage_2_gnn_inference?.risk_percentage)) {
        throw new Error("The server did not return a valid risk analysis.");
      }
      if (!controller.signal.aborted) {
        setPipelineResult({ inputKey, data });
        setPipelineStage("complete");
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setPipelineError(error instanceof Error ? error.message : "The pipeline could not complete.");
        setPipelineStage("idle");
      }
    } finally {
      if (!controller.signal.aborted) setIsComputing(false);
    }
  }, [isComputing, inputKey, name, mrn, age, gender, bed, creatinine, creatinineMin, creatinineMax, creatinineAvg, drugsInput]);

  // Handle Interactive Question
  const handleAskMedGemma = async () => {
    if (!clinicalQuery.trim()) return;
    setIsQuerying(true);
    await new Promise((r) => setTimeout(r, 450));

    const q = clinicalQuery.toLowerCase();
    if (q.includes("lorazepam") || q.includes("taper") || q.includes("sleep")) {
      setQueryResponse(
        `Local demonstration: De-escalating sedative agents by 50% reduces GABAA receptor chloride hyperpolarization, lowering projected 48h fall probability from ${gnnDisplay.riskPercentage}% to ${Math.max(10, Math.round(gnnDisplay.riskPercentage * 0.65 * 10) / 10)}% while preserving sleep initiation.`
      );
    } else if (q.includes("hydralazine") || q.includes("blood pressure") || q.includes("bp") || q.includes("pressure")) {
      setQueryResponse(
        `Local demonstration: Hydralazine-induced arteriolar vasodilation compounds orthostatic drop (eGFR ${calculatedEgfr} mL/min). Re-titrating dose with mandatory seated/standing orthostatic vitals eliminates peak postural hypotension.`
      );
    } else {
      setQueryResponse(
        `Local demonstration: In this patient (${age}yo ${gender.toLowerCase()}, eGFR ${calculatedEgfr} mL/min [${ckdStage}]), optimizing ${parsedDrugs.slice(0, 2).join(" & ") || "the active regimen"} and mitigating ${gnnDisplay.acuityTier} risk addresses the primary fall trajectory according to AGS Beers 2023 guidelines.`
      );
    }
    setIsQuerying(false);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isComputing) return;
    setIsSubmitting(true);
    setIngestError(null);
    try {
      await onIngest({
      name,
      mrn,
      age: Number(age),
      gender,
      bed,
      creatinine: Number(creatinine),
      drugs: parsedDrugs,
    });
    onClose();
    } catch (error) {
      setIngestError(error instanceof Error ? error.message : "The admission could not be saved.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in overflow-y-auto font-sans">
      <div className="w-full max-w-[1220px] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0e3b33] text-emerald-400 flex items-center justify-center shadow-xs">
              <FlaskConical className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Ingest Acute Inpatient Admission
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRunPipeline}
              disabled={isComputing || isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0e3b33] hover:bg-[#092923] px-4 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <Zap className="w-4 h-4 fill-emerald-400 text-emerald-400" />
              <span>{isComputing ? "Running Pipeline..." : "Run MedGemma"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY (TWO COLUMNS) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-12 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            {pipelineData ? "Server analysis is available for these inputs." : "Local estimates, feature weights, and query responses below are demonstrations. Run the server pipeline to evaluate these inputs."}
            {pipelineError && <p role="alert" className="mt-1">Pipeline failed: {pipelineError}</p>}
            {ingestError && <p role="alert" className="mt-1">Admission was not saved: {ingestError}</p>}
          </div>
          {/* LEFT COLUMN: GNN INPUT FEATURES (7 Cols) */}
          <div className="lg:col-span-7 space-y-4 text-xs text-slate-700">
            {/* 1. PATIENT DEMOGRAPHICS & INPATIENT IDENTIFICATION */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 tracking-wide uppercase">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>1. Patient Demographics &amp; Inpatient Identification</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Patient Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full rounded-md border border-slate-200 bg-slate-50/40 px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    MRN
                  </label>
                  <input
                    type="text"
                    value={mrn}
                    onChange={(e) => setMrn(e.target.value)}
                    required
                    className="w-full rounded-md border border-slate-200 bg-slate-50/40 px-3 py-1.5 text-xs text-slate-900 font-mono focus:bg-white focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Age (Years)
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    required
                    className="w-full rounded-md border border-slate-200 bg-slate-50/40 px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE")}
                    className="w-full rounded-md border border-slate-200 bg-slate-50/40 px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-slate-400 focus:outline-none"
                  >
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Bed Allocation
                  </label>
                  <input
                    type="text"
                    value={bed}
                    onChange={(e) => setBed(e.target.value)}
                    required
                    className="w-full rounded-md border border-slate-200 bg-slate-50/40 px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. RENAL BIOMARKERS (MIMIC-IV NORMALIZED) */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 tracking-wide uppercase">
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>2. Renal Biomarkers (MIMIC-IV Normalized)</span>
                </div>
                <span className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
                  eGFR: {calculatedEgfr} mL/min ({ckdStage})
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Serum Creatinine (mg/dL)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={creatinine}
                    onChange={(e) => setCreatinine(Number(e.target.value))}
                    required
                    className="w-full rounded-md border border-slate-200 bg-slate-50/40 px-3 py-1.5 text-xs text-slate-900 font-bold focus:bg-white focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Min Creatinine
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={creatinineMin}
                    onChange={(e) => setCreatinineMin(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-200 bg-slate-50/40 px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Max Creatinine
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={creatinineMax}
                    onChange={(e) => setCreatinineMax(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-200 bg-slate-50/40 px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-slate-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                    Avg Creatinine
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={creatinineAvg}
                    onChange={(e) => setCreatinineAvg(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-200 bg-slate-50/40 px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 3. ACTIVE MEDICATION ORDERS (5,034 DRUG VOCABULARY) */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 tracking-wide uppercase">
                  <Pill className="w-3.5 h-3.5 text-slate-500" />
                  <span>3. Active Medication Orders (5,034 Drug Vocabulary)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    {parsedDrugs.length} Active Meds
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPasteMode((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 transition cursor-pointer"
                  >
                    <ClipboardList className="w-3 h-3 text-slate-500" />
                    <span>Paste from EHR</span>
                  </button>
                </div>
              </div>

              {isPasteMode ? (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={drugsInput}
                    onChange={(e) => setDrugsInput(e.target.value)}
                    placeholder="Paste comma-separated medications e.g. Hydralazine 25mg TID, Furosemide 40mg QAM..."
                    className="w-full rounded-md border border-slate-200 p-2.5 text-xs font-mono focus:border-slate-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPasteMode(false)}
                    className="text-[11px] text-emerald-800 font-bold hover:underline cursor-pointer"
                  >
                    Done Pasting &rarr;
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Search bar */}
                  <div className="relative">
                    <div className="relative flex items-center">
                      <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={drugSearchQuery}
                        onChange={(e) => {
                          setDrugSearchQuery(e.target.value);
                          setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        placeholder="Search 5,034 drugs by generic or brand (e.g. 'lor', 'furosemide', 'ambien', 'meto..."
                        className="w-full pl-9 pr-20 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none transition shadow-2xs"
                      />
                      <div className="absolute right-2.5">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          5,034 GNN
                        </span>
                      </div>
                    </div>

                    {/* Dropdown */}
                    {isDropdownOpen && drugSearchQuery.trim() && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg bg-white border border-slate-200 shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                          {searchResults.map((drug) => (
                            <button
                              key={drug.id}
                              type="button"
                              onClick={() => handleAddDrug(drug.name, drug.defaultDose, drug.defaultFreq)}
                              className="w-full p-2 text-left hover:bg-slate-50 flex items-center justify-between text-xs border-b border-slate-100 last:border-b-0 cursor-pointer"
                            >
                              <span className="font-semibold text-slate-900">{drug.name}</span>
                              <span className="text-[10px] text-slate-500">{drug.category}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Active Med Chips Container */}
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5 min-h-[50px] flex flex-wrap gap-2 items-center">
                    {parsedDrugs.map((drug, i) => {
                      const fridBadge = getDrugFridBadge(drug);
                      return (
                        <div
                          key={i}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/80 px-2.5 py-1 text-xs text-rose-900 font-medium"
                        >
                          <Link2 className="w-3 h-3 text-rose-500" />
                          <span>{drug}</span>
                          <span className="rounded bg-rose-200/80 text-rose-800 text-[9px] font-bold px-1.5 py-0.2 uppercase tracking-wide">
                            {fridBadge}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDrug(i)}
                            className="ml-1 text-rose-400 hover:text-rose-700 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                    <span className="font-bold text-amber-500 flex items-center gap-1 mr-1">
                      <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                      Quick Presets:
                    </span>
                    {[
                      { name: "Lorazepam 1.0mg", key: "lorazepam" },
                      { name: "Furosemide 40mg", key: "furosemide" },
                      { name: "Diphenhydramine 25mg", key: "diphenhydramine" },
                      { name: "Hydralazine 25mg", key: "hydralazine" },
                      { name: "Gabapentin 300mg", key: "gabapentin" },
                      { name: "Zolpidem 10mg", key: "zolpidem" },
                      { name: "Metoprolol 25mg", key: "metoprolol" },
                      { name: "Lisinopril 10mg", key: "lisinopril" },
                    ].map((item, idx) => {
                      const isAdded = parsedDrugs.some((d) => d.toLowerCase().includes(item.key));
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (isAdded) {
                              const index = parsedDrugs.findIndex((d) => d.toLowerCase().includes(item.key));
                              if (index !== -1) handleRemoveDrug(index);
                            } else {
                              handleAddDrug(item.name);
                            }
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-medium transition cursor-pointer ${
                            isAdded
                              ? "bg-slate-100 text-slate-800 border-slate-300 shadow-2xs"
                              : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
                          }`}
                        >
                          <span>{isAdded ? "✓" : "+"}</span>
                          <span>{item.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 4. CODIFIED FRID CLASSES (AGS BEERS 2023 & STOPP V3) */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 tracking-wide uppercase">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                  <span>4. Codified FRID Classes (AGS Beers 2023 &amp; STOPP v3)</span>
                </div>
                <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                  {totalFridCount} / 8 FRID Classes Triggered
                </span>
              </div>

              {/* 8 Checkbox Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FRID_DEFINITIONS.map((def) => {
                  const isChecked = Boolean(activeFridMap[def.id]);
                  return (
                    <div
                      key={def.id}
                      onClick={() => {
                        setManualFridOverrides((prev) => ({
                          ...prev,
                          [def.id]: !isChecked,
                        }));
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border transition cursor-pointer select-none text-[11px] ${
                        isChecked
                          ? "border-rose-300 bg-white shadow-2xs text-slate-900 font-semibold"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="shrink-0">
                        {isChecked ? (
                          <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded border border-slate-300 bg-white" />
                        )}
                      </div>
                      <span className="leading-tight text-[11px]">{def.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Automatic Guardrail Alert Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-[11px] flex items-center gap-2 text-rose-900">
                  <Zap className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0" />
                  <span>
                    CNS Polypharmacy (≥3 Sedative Classes):{" "}
                    <span className="font-bold underline">
                      {cnsPolypharmacyFlag ? "FLAGGED" : "Clear"}
                    </span>
                  </span>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3 text-[11px] flex items-center gap-2 text-slate-600">
                  <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Renal Accumulation (Cr &gt; 1.5):{" "}
                    <span className="font-semibold text-slate-800">
                      {renalAccumulationFlag ? "FLAGGED" : "Clear"}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: MEDGEMMA PIPELINE & GNN INFERENCE (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* CARD 1: MEDGEMMA 1.5 MULTIMODAL GNN PIPELINE */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Bot className="w-4 h-4 text-slate-600" />
                  <span>MedGemma 1.5 — Multimodal GNN Pipeline</span>
                </div>
                {pipelineStage === "structuring" && (
                  <span className="rounded-md border border-teal-300 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 animate-pulse flex items-center gap-1">
                    <Activity className="w-3 h-3 animate-spin" />
                    Stage 1: Structuring...
                  </span>
                )}
                {pipelineStage === "gnn_inference" && (
                  <span className="rounded-md border border-teal-300 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 animate-pulse flex items-center gap-1">
                    <Zap className="w-3 h-3 animate-pulse text-amber-500" />
                    Stage 2: GNN Inference...
                  </span>
                )}
                {pipelineStage === "verifying" && (
                  <span className="rounded-md border border-teal-300 bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 animate-pulse flex items-center gap-1">
                    <Clock className="w-3 h-3 animate-spin text-indigo-600" />
                    Stage 3: Verifying...
                  </span>
                )}
                {pipelineStage === "complete" && pipelineData && (
                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    Server Analysis Complete
                  </span>
                )}
                {pipelineStage === "idle" && (
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    Ready to Run
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px]">
                {/* STAGE 1 */}
                <div
                  className={`rounded-lg border p-2.5 transition-all duration-300 ${
                    pipelineStage === "structuring"
                      ? "border-teal-400 bg-teal-100/80 ring-2 ring-teal-400/40 animate-pulse"
                      : "border-teal-200 bg-teal-50/40"
                  } text-slate-800`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-[9px] uppercase tracking-wider text-[#0e3b33]">
                      STAGE 1
                    </span>
                    {pipelineStage === "structuring" ? (
                      <Activity className="w-3.5 h-3.5 text-teal-700 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-teal-600 stroke-[3]" />
                    )}
                  </div>
                  <div className="font-semibold text-slate-900">MedGemma 1.5</div>
                  <div className="text-[9px] text-slate-500">Input Structuring</div>
                </div>

                {/* STAGE 2 */}
                <div
                  className={`rounded-lg border p-2.5 transition-all duration-300 ${
                    pipelineStage === "gnn_inference"
                      ? "border-teal-400 bg-teal-100/80 ring-2 ring-teal-400/40 animate-pulse"
                      : "border-teal-200 bg-teal-50/40"
                  } text-slate-800`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-[9px] uppercase tracking-wider text-[#0e3b33]">
                      STAGE 2
                    </span>
                    {pipelineStage === "gnn_inference" ? (
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-bounce" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-teal-600 stroke-[3]" />
                    )}
                  </div>
                  <div className="font-semibold text-slate-900">Multimodal GNN</div>
                  <div className="text-[9px] text-slate-500">wDDI Graph Conv</div>
                </div>

                {/* STAGE 3 */}
                <div
                  className={`rounded-lg border p-2.5 transition-all duration-300 ${
                    pipelineStage === "verifying"
                      ? "border-teal-400 bg-teal-100/80 ring-2 ring-teal-400/40 animate-pulse"
                      : "border-teal-200 bg-teal-50/40"
                  } text-slate-800`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-[9px] uppercase tracking-wider text-[#0e3b33]">
                      STAGE 3
                    </span>
                    {pipelineStage === "verifying" ? (
                      <Clock className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-teal-600 stroke-[3]" />
                    )}
                  </div>
                  <div className="font-semibold text-slate-900">MedGemma 1.5</div>
                  <div className="text-[9px] text-slate-500">Clinical Verification</div>
                </div>
              </div>
            </div>

            {/* CARD 2: LIVE GNN INFERENCE RESULTS */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-900">
                    LIVE GNN INFERENCE RESULTS
                  </span>
                </div>
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Confidence: {gnnDisplay.confidence}
                </span>
              </div>

              {/* Metrics Block */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-xs text-slate-600 font-medium">
                    Predicted 48h Fall &amp; Syncope Risk:
                  </div>
                  <span
                    className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                      gnnDisplay.riskPercentage >= 50
                        ? "text-rose-700 bg-rose-50 border-rose-200"
                        : gnnDisplay.riskPercentage >= 25
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : "text-teal-700 bg-teal-50 border-teal-200"
                    }`}
                  >
                    {gnnDisplay.relativeRisk}
                  </span>
                </div>
                <div
                  className={`text-3xl font-black tracking-tight ${
                    gnnDisplay.riskPercentage >= 50
                      ? "text-rose-600"
                      : gnnDisplay.riskPercentage >= 25
                      ? "text-emerald-600"
                      : "text-teal-600"
                  }`}
                >
                  {gnnDisplay.riskPercentage}%
                </div>
              </div>

              {/* Progress Bar & Markers */}
              <div className="space-y-1">
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      gnnDisplay.riskPercentage >= 50
                        ? "bg-rose-500"
                        : gnnDisplay.riskPercentage >= 25
                        ? "bg-emerald-500"
                        : "bg-teal-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, gnnDisplay.riskPercentage))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>0% Normal</span>
                  <span>Ward Baseline: 18.2%</span>
                  <span className="text-rose-500 font-bold">50% Critical</span>
                </div>
              </div>

              {/* Acuity Tier Row */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-slate-800">Assigned Acuity Tier:</span>
                <span
                  className={`rounded-md border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                    gnnDisplay.acuityTier === "Critical"
                      ? "border-rose-300 bg-rose-50 text-rose-800"
                      : gnnDisplay.acuityTier === "Moderate"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-teal-300 bg-teal-50 text-teal-800"
                  }`}
                >
                  {gnnDisplay.acuityTierLabel}
                </span>
              </div>

              {/* DDI Synergistic Graph Edges */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">DDI Synergistic Graph Edges:</span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    wDDI: {gnnDisplay.wDdiScore}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {detectedDdiPairs.map((p, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 bg-white p-2 text-xs flex items-center justify-between shadow-2xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{p.pair}</div>
                        <div className="text-[10px] text-slate-500">{p.mechanism}</div>
                      </div>
                      <span className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-700">
                        GATv2 Attn: {p.attnWeight}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* GNN Feature Attribution Breakdown */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                <span className="font-semibold text-slate-800 block">
                  GNN Feature Attribution Breakdown:
                </span>

                <div className="space-y-1.5 text-[11px]">
                  {featureAttributions.map((fa, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between text-slate-700 mb-0.5">
                        <span>{fa.feature}</span>
                        <span className={`font-bold ${fa.textColor}`}>+{fa.importancePct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`${fa.color} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(100, Math.max(5, fa.importancePct))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CARD 3: MEDGEMMA 1.5 RECEPTOR-LEVEL CAUSAL EXPLANATION */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>MedGemma 1.5 Receptor-Level Causal Explanation</span>
                </div>
                <span className="rounded-md border border-indigo-200 bg-indigo-100/70 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                  Pharmacodynamics
                </span>
              </div>

              <p className="text-[11px] text-slate-700 leading-relaxed">
                {clinicalRationale}
              </p>

              {/* Primary Culprit Prescribing Cascade */}
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-bold text-slate-800 block">
                  Primary Culprit Prescribing Cascade:
                </span>
                <div className="space-y-1.5 text-xs">
                  {culpritCascade.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 flex items-center gap-2 text-xs text-slate-800 shadow-2xs"
                    >
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interactive Clinical Query (MedGemma 1.5) */}
              <div className="space-y-2 pt-2 border-t border-indigo-100/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">
                    Interactive Clinical Query (Local Demo):
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-indigo-700">
                    <span className="font-mono">Sample response</span>
                    <span>•</span>
                    <span className="font-mono">Not verified</span>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={2}
                    value={clinicalQuery}
                    onChange={(e) => setClinicalQuery(e.target.value)}
                    placeholder='Ask MedGemma 1.5 a follow-up question (e.g. "What if we taper Lorazepam first?" or "Alternative sleep aid with lower fall risk?")...'
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 pb-9 text-xs text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none shadow-2xs leading-relaxed"
                  />
                  <div className="absolute right-2 bottom-2.5">
                    <button
                      type="button"
                      onClick={handleAskMedGemma}
                      disabled={isQuerying || !clinicalQuery.trim()}
                      className="inline-flex items-center gap-1.5 rounded-md bg-black hover:bg-slate-800 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                      <span>{isQuerying ? "Thinking..." : "Ask MedGemma"}</span>
                    </button>
                  </div>
                </div>

                {queryResponse && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-2.5 text-xs text-emerald-900 animate-in fade-in">
                    <div className="font-bold mb-0.5 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Local Demonstration Response:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{queryResponse}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="lg:col-span-12 flex justify-end">
            <button type="submit" disabled={isSubmitting || isComputing || !name.trim()} className="rounded-lg bg-[#0e3b33] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
              {isSubmitting ? "Saving admission…" : "Save Admission to Ward"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default IngestAdmissionModal;
