"use client";

import React from "react";
import { X, TrendingUp, Moon, Sun, AlertTriangle } from "lucide-react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  CartesianGrid,
} from "recharts";

interface CircadianCurveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CIRCADIAN_DATA = [
  { hour: "18:00", map_nadir: 92, sedative_cmax: 15, fall_risk: 18 },
  { hour: "20:00", map_nadir: 88, sedative_cmax: 30, fall_risk: 25 },
  { hour: "22:00", map_nadir: 84, sedative_cmax: 65, fall_risk: 42 },
  { hour: "00:00", map_nadir: 78, sedative_cmax: 82, fall_risk: 58 },
  { hour: "02:00", map_nadir: 71, sedative_cmax: 95, fall_risk: 72 },
  { hour: "04:00", map_nadir: 69, sedative_cmax: 92, fall_risk: 78 },
  { hour: "06:00", map_nadir: 76, sedative_cmax: 70, fall_risk: 52 },
  { hour: "08:00", map_nadir: 85, sedative_cmax: 45, fall_risk: 34 },
  { hour: "10:00", map_nadir: 89, sedative_cmax: 25, fall_risk: 22 },
  { hour: "12:00", map_nadir: 93, sedative_cmax: 15, fall_risk: 16 },
  { hour: "14:00", map_nadir: 91, sedative_cmax: 12, fall_risk: 15 },
  { hour: "16:00", map_nadir: 90, sedative_cmax: 10, fall_risk: 17 },
];

export function CircadianCurveModal({
  isOpen,
  onClose,
}: CircadianCurveModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                24-Hour Circadian Hemodynamic & Fall Hazard Curve
              </h2>
              <p className="text-[11px] text-zinc-500">
                Mean Arterial Pressure (MAP) Nadir vs. Sedative Serum Cmax Dynamics
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
        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 flex items-center gap-3 text-xs text-amber-900">
            <Moon className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong className="font-bold">Peak Nocturnal Risk Window (02:00 - 05:00)</strong>:
              Diuretic induced nocturnal voiding aligns with peak sedative Cmax and lowest MAP (69 mmHg), causing orthostatic unassisted transfer falls.
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={CIRCADIAN_DATA}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="circadianRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "11px",
                  }}
                />
                <ReferenceArea x1="00:00" x2="06:00" fill="#fef3c7" fillOpacity={0.4} />
                <Area
                  type="monotone"
                  dataKey="fall_risk"
                  name="Fall Hazard %"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  fill="url(#circadianRed)"
                />
                <Line
                  type="monotone"
                  dataKey="sedative_cmax"
                  name="Sedative Cmax %"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="map_nadir"
                  name="MAP (mmHg)"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-zinc-600 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 bg-red-500 rounded" />
              <span>Fall Hazard Index (%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 bg-amber-500 rounded" />
              <span>Sedative Cmax (%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 bg-teal-600 rounded" />
              <span>Mean Arterial Pressure (mmHg)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 border-t border-zinc-100 bg-zinc-50/50">
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-950 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-zinc-800 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
