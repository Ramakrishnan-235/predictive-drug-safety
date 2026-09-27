"use client";

import React from "react";
import { Download, UserPlus } from "lucide-react";

interface DashboardSubheaderProps {
  patientCount?: number;
  syncTimeAgo?: string;
  isLive?: boolean;
  onExportFhir?: () => void;
  onIngestAdmission?: () => void;
}

export function DashboardSubheader({
  patientCount = 48,
  syncTimeAgo = "2m ago",
  isLive = true,
  onExportFhir,
  onIngestAdmission,
}: DashboardSubheaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 pb-3">
      {/* Title & Metadata */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          Inpatient Risk Triage & Fall Surveillance
        </h1>
        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isLive ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isLive ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
          </span>
          <span className="font-medium text-slate-600">
            Acute Care Unit 4B
          </span>
          <span className="text-slate-300">•</span>
          <span>Geriatric Polypharmacy Ward ({patientCount} Active Patients)</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">
            Live telemetry synchronized {syncTimeAgo}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onExportFhir}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Export FHIR Report</span>
        </button>

        <button
          onClick={onIngestAdmission}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1b3b36] hover:bg-[#142e2a] px-4 py-2 text-xs font-semibold text-white shadow-sm transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Ingest New Admission</span>
        </button>
      </div>
    </div>
  );
}

