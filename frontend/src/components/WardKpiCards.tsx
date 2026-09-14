"use client";

import React from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { WardKpis } from "@/types/patient";

interface WardKpiCardsProps {
  kpis: WardKpis;
  totalPatients?: number;
}

// Sparkline curve data matching the red fall risk upward curve
const SPARKLINE_DATA = [
  { val: 4.2 },
  { val: 4.8 },
  { val: 4.5 },
  { val: 5.8 },
  { val: 6.2 },
  { val: 6.0 },
  { val: 7.6 },
  { val: 8.4 },
  { val: 8.0 },
  { val: 9.8 },
  { val: 11.0 },
];

export function WardKpiCards({ kpis, totalPatients = 48 }: WardKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-3">
      {/* CARD 1: High Fall Risk */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
        <div>
          {/* Top row */}
          <div className="flex items-center justify-between gap-2">
            <span className="rounded bg-rose-50 border border-rose-100 text-rose-600 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
              HIGH FALL RISK (&gt;40%)
            </span>
            <span className="rounded-full bg-rose-50 text-rose-600 px-2 py-0.5 text-[10px] font-semibold">
              +{kpis.high_fall_risk_today_delta} today
            </span>
          </div>

          {/* Metric Row */}
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {kpis.high_fall_risk_count}
            </span>
            <span className="text-xs text-slate-400 font-normal">
              / {totalPatients} Inpatients
            </span>
          </div>

          {/* Sparkline Curve */}
          <div className="h-10 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SPARKLINE_DATA} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="redCurveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke="#dc2626"
                  strokeWidth={2}
                  fill="url(#redCurveGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Footer Note */}
        <div className="flex items-center gap-1.5 pt-2 mt-2 text-xs font-medium text-rose-600">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
          <span>
            {kpis.acute_admissions_flagged_12h} acute admissions flagged in last 12h
          </span>
        </div>
      </div>

      {/* CARD 2: Active PIM Alerts */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
        <div>
          {/* Top row */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-amber-900 tracking-wider uppercase">
              ACTIVE PIM ALERTS
            </span>
            <span className="rounded border border-amber-300/80 bg-[#fef9c3]/70 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              {kpis.stopp_version}
            </span>
          </div>

          {/* Metric Row */}
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {kpis.active_pim_alerts_count}
            </span>
            <span className="text-xs text-slate-500 font-normal">Regimens</span>
          </div>

          {/* Split Two-Tone Bar */}
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-slate-100 flex overflow-hidden">
              <div className="h-full bg-[#ea580c]" style={{ width: "60%" }} />
              <div className="h-full bg-[#f59e0b]" style={{ width: "40%" }} />
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-medium">
              <span>60% BZD</span>
              <span>40% Z-Drugs</span>
            </div>
          </div>
        </div>

        {/* Spacer to match card height */}
        <div className="h-4" />
      </div>

      {/* CARD 3: Severe DDI Burden */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
        <div>
          {/* Top row */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-amber-900 tracking-wider uppercase">
              SEVERE DDI BURDEN (wDDI ≥ 1.0)
            </span>
            <span className="rounded bg-[#fef3c7] text-amber-900 px-2.5 py-0.5 text-[10px] font-semibold">
              High Risk
            </span>
          </div>

          {/* Metric Row */}
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {kpis.severe_ddi_burden_count}
            </span>
            <span className="text-xs text-slate-500 font-normal">Patients</span>
          </div>
        </div>

        {/* Footer Description */}
        <div className="text-xs text-slate-500 leading-snug pt-2">
          Additive orthostatic &amp; sedative synergism
        </div>
      </div>

      {/* CARD 4: Deprescribing Completed */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
        <div>
          {/* Top row */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-slate-600 tracking-wider uppercase">
              DEPRESCRIBING COMPLETED
            </span>
            <span className="rounded bg-emerald-50 text-emerald-700 border border-emerald-200/70 px-2 py-0.5 text-[10px] font-semibold">
              +{kpis.deprescribing_week_delta}% wk
            </span>
          </div>

          {/* Metric Row */}
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {kpis.deprescribing_completed_pct}%
            </span>
            <span className="text-xs text-slate-500 font-normal">
              Target Met (≥70%)
            </span>
          </div>

          {/* Attainment Progress Bar */}
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1b3b36]"
                style={{ width: `${Math.min(100, kpis.deprescribing_completed_pct)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px]">
              <span className="text-slate-400 font-medium">Current Progress</span>
              <span className="text-slate-600 font-semibold">Goal: 70%</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="flex items-center gap-1.5 pt-2 mt-2 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
          <span>
            {kpis.medication_tapers_week_count} medication tapers executed this week
          </span>
        </div>
      </div>
    </div>
  );
}

