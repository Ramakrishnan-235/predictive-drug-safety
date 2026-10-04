"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Download, Copy, Check, FileCode2 } from "lucide-react";
import type { Patient } from "@/types/patient";
import { apiRequest } from "@/lib/api";

interface FhirExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient | null;
}

export function FhirExportModal({ isOpen, onClose, patient }: FhirExportModalProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const bundle = useQuery({
    queryKey: ["fhirExport", patient?.hadm_id],
    queryFn: ({ signal }) => apiRequest<Record<string, unknown>>(
      `/fhir/export${patient ? `?patient_id=${patient.hadm_id}` : ""}`, { signal },
    ),
    enabled: isOpen,
    staleTime: 0,
  });
  if (!isOpen) return null;
  const jsonString = bundle.data ? JSON.stringify(bundle.data, null, 2) : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setCopyError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("Clipboard access is unavailable. Download the bundle instead.");
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([jsonString], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `FHIR-R4-${patient?.hadm_id ?? "ward"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div role="dialog" aria-modal="true" aria-label="FHIR bundle export" className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <FileCode2 className="w-5 h-5 text-emerald-700" />
            <div><h2 className="text-sm font-bold">HL7 FHIR R4 Bundle Export</h2><p className="text-xs text-zinc-500">{patient ? patient.name : "Full ward census"} • Retrieved from the API</p></div>
          </div>
          <button onClick={onClose} aria-label="Close export"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">
          {bundle.isPending && <p role="status" className="text-xs">Loading the ward export…</p>}
          {bundle.isError && <p role="alert" className="text-xs text-rose-700">Export failed: {bundle.error.message}</p>}
          {bundle.data && <pre className="rounded-xl bg-zinc-900 p-3.5 font-mono text-[11px] text-emerald-400 max-h-80 overflow-auto">{jsonString}</pre>}
          {copyError && <p role="alert" className="text-xs text-rose-700 mt-2">{copyError}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-zinc-100 bg-zinc-50/50">
          <button disabled={!bundle.isSuccess} onClick={copy} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs disabled:opacity-50">{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? "Copied" : "Copy JSON"}</button>
          <button disabled={!bundle.isSuccess} onClick={download} className="flex items-center gap-1.5 rounded-lg bg-zinc-900 text-white px-3 py-1.5 text-xs disabled:opacity-50"><Download className="w-3.5 h-3.5" />Download Bundle</button>
        </div>
      </div>
    </div>
  );
}
