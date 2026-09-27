"use client";

import React, { useState } from "react";
import {
  Activity,
  ChevronDown,
  TrendingUp,
  Download,
  Shield,
  MessageSquare,
  AlertTriangle,
  Clock,
  CheckCircle,
} from "lucide-react";
import { WardDistribution } from "@/types/patient";

interface WardTelemetryFooterProps {
  distribution: WardDistribution;
  onOpenCircadian: () => void;
  onOpenSafetyHandoff: () => void;
  onInitiateSmrConsult: () => void;
  onExportPt: () => void;
}

export function WardTelemetryFooter({
  distribution,
  onOpenCircadian,
  onOpenSafetyHandoff,
  onInitiateSmrConsult,
  onExportPt,
}: WardTelemetryFooterProps) {
  const [isCompact, setIsCompact] = useState(false);

  return (
    <div className="mt-4 mb-8">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between py-2 text-xs text-zinc-500 font-medium">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-bold tracking-wider uppercase text-zinc-600">
            WARD CLINICAL TELEMETRY & ON-DUTY COVERAGE
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-zinc-500 font-medium">
              Updated real-time
            </span>
          </div>
          <button
            onClick={() => setIsCompact(!isCompact)}
            className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-800 transition"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                isCompact ? "-rotate-90" : ""
              }`}
            />
            <span>{isCompact ? "Expand view" : "Compact view"}</span>
          </button>
        </div>
      </div>

      {/* 2 MAIN CARDS */}
      {!isCompact && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 mt-1">
          {/* LEFT CARD: Ward Fall Risk Distribution (lg:col-span-8) */}
          <div className="lg:col-span-8 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm flex flex-col justify-between">
            <div>
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-zinc-900 text-sm tracking-tight">
                      Ward Fall Risk Distribution & Triage Velocity
                    </h2>
                    <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                      {distribution.total_inpatients} inpatients
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Real-time calibrated stratification with fall incidence weighting
                  </p>
                </div>

                <button
                  onClick={onOpenCircadian}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50/70 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Circadian curves</span>
                </button>
              </div>

              {/* Stratum 4-Block Segment */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
                {distribution.stratums.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-2.5 flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${s.color_class}`}
                        />
                        <span className="text-xs font-semibold text-zinc-700">
                          {s.label}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-sm font-bold text-zinc-900">
                      {s.patient_count}{" "}
                      <span className="text-xs font-medium text-zinc-500">
                        ({s.percentage}%)
                      </span>
                    </div>
                    {/* Bottom accent indicator */}
                    <div
                      className={`h-1 w-full mt-2 rounded-full ${s.color_class}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-4 border-t border-zinc-100">
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>
                  Velocity:{" "}
                  <strong className="font-semibold text-zinc-900">
                    6.8 rev/hr
                  </strong>{" "}
                  <span className="text-zinc-400">(Target ≥ 5.0)</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onExportPt}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 transition"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Export P&T</span>
                </button>

                <button
                  onClick={onOpenSafetyHandoff}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-1.5 text-xs font-medium text-white shadow hover:bg-zinc-800 transition"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Safety Handoff</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT CARD: Clinical Pharmacist Coverage (lg:col-span-4) */}
          <div className="lg:col-span-4 rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm flex flex-col justify-between">
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h2 className="font-bold text-zinc-900 text-sm tracking-tight">
                    Clinical Pharmacist Coverage
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase">
                  ACTIVE
                </span>
              </div>

              {/* Pharmacist Profile */}
              <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50/70 p-3">
                <div className="font-bold text-zinc-900 text-sm">
                  Dr. Marcus Vance, PharmD, BCGP
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Pager: #4482 • Ext: 3810 • Rounds: 14:00
                </div>
              </div>

              {/* Pending Tapers notice */}
              <div className="flex items-center justify-between gap-2 mt-3 text-xs text-zinc-700">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-medium">Pending High-Risk Tapers</span>
                </div>
                <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.2 text-[10px] font-bold">
                  3 PIM triggers
                </span>
              </div>
            </div>

            {/* Bottom Button */}
            <button
              onClick={onInitiateSmrConsult}
              className="w-full mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-zinc-800 transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Initiate Joint SMR Consult</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
