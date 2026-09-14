"use client";

import React, { useMemo, useState, useRef } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronDown,
  Menu,
  SlidersHorizontal,
} from "lucide-react";
import { Patient, FilterType, SortField } from "@/types/patient";
import { TablePagination } from "./TablePagination";

interface PatientTriageTableProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
  onReviewSmr?: (patient: Patient) => void;
}

export function PatientTriageTable({
  patients,
  onSelectPatient,
  onReviewSmr,
}: PatientTriageTableProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortField, setSortField] = useState<SortField>("risk_desc");
  const [pageSize, setPageSize] = useState(6);
  const [pageIndex, setPageIndex] = useState(0);

  // Compute counts for filter pills
  const counts = useMemo(() => {
    return {
      all: patients.length,
      critical: patients.filter((p) => p.acuity_tier === "Critical").length,
      high: patients.filter((p) => p.acuity_tier === "High").length,
      pim: patients.filter((p) => Boolean(p.primary_pim)).length,
      renal: patients.filter((p) => p.renal_egfr < 30).length,
    };
  }, [patients]);

  // Filtered and sorted dataset
  const filteredData = useMemo(() => {
    let list = [...patients];
    if (filter === "critical") {
      list = list.filter((p) => p.acuity_tier === "Critical");
    } else if (filter === "high") {
      list = list.filter((p) => p.acuity_tier === "High");
    } else if (filter === "pim") {
      list = list.filter((p) => Boolean(p.primary_pim));
    } else if (filter === "renal") {
      list = list.filter((p) => p.renal_egfr < 30);
    }

    // Sort list
    if (sortField === "risk_desc") {
      list.sort((a, b) => b.risk_percentage - a.risk_percentage);
    } else if (sortField === "risk_asc") {
      list.sort((a, b) => a.risk_percentage - b.risk_percentage);
    } else if (sortField === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortField === "bed") {
      list.sort((a, b) => a.bed.localeCompare(b.bed));
    } else if (sortField === "egfr") {
      list.sort((a, b) => a.renal_egfr - b.renal_egfr);
    } else if (sortField === "drugs") {
      list.sort((a, b) => b.drug_count - a.drug_count);
    }

    return list;
  }, [patients, filter, sortField]);

  // Helper to get badge style for high-risk meds & PIMs
  const getPimBadgeStyle = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes("z-drug") || l.includes("bzd") || l.includes("gabapentin")) {
      return "bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]";
    }
    if (l.includes("loop diuretic") || l.includes("anticholinergic") || l.includes("opioid")) {
      return "bg-[#fefce8] text-[#854d0e] border border-[#fef08a]";
    }
    if (l.includes("diphenhydramine") || l.includes("diuretic")) {
      if (l.includes("diphenhydramine")) {
        return "bg-[#f0fdfa] text-[#0f766e] border border-[#ccfbf1]";
      }
      return "bg-[#f8fafc] text-[#334155] border border-[#cbd5e1]";
    }
    if (l.includes("antihypertensive") || l.includes("statin") || l.includes("beta-blocker")) {
      return "bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]";
    }
    return "bg-[#f8fafc] text-[#334155] border border-[#cbd5e1]";
  };

  // Helper for eGFR color
  const getEgfrColor = (egfr: number) => {
    if (egfr < 30) return "text-[#dc2626] font-semibold";
    if (egfr < 45) return "text-[#b45309] font-semibold";
    if (egfr < 60) return "text-slate-800 font-medium";
    return "text-[#047857] font-medium";
  };

  // Table Columns Definition matching image
  const columns = useMemo<ColumnDef<Patient>[]>(
    () => [
      // 1. Patient Demographics
      {
        id: "demographics",
        header: "PATIENT DEMOGRAPHICS",
        cell: ({ row }) => {
          const pat = row.original;
          return (
            <div className="flex flex-col text-left py-1">
              <span
                onClick={() => onSelectPatient(pat)}
                className="font-bold text-slate-900 text-sm tracking-tight hover:underline cursor-pointer"
              >
                {pat.name}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <span>{pat.mrn}</span>
                <span>•</span>
                <span>{pat.bed}</span>
                <span>•</span>
                <span>
                  {pat.age} yo {pat.gender === "FEMALE" ? "F" : "M"}
                </span>
              </div>
            </div>
          );
        },
      },
      // 2. Regimen & Renal Function
      {
        id: "regimen",
        header: "REGIMEN & RENAL FUNCTION",
        cell: ({ row }) => {
          const pat = row.original;
          return (
            <div className="flex flex-col text-left text-xs py-1">
              <span className="font-medium text-slate-800">
                {pat.drug_count} meds ({pat.prn_count} PRN)
              </span>
              <span className={`mt-0.5 text-xs ${getEgfrColor(pat.renal_egfr)}`}>
                eGFR: {pat.renal_egfr} mL/min ({pat.renal_stage})
              </span>
            </div>
          );
        },
      },
      // 3. High-Risk Burden & PIMs
      {
        id: "pims",
        header: "HIGH-RISK BURDEN & PIMS",
        cell: ({ row }) => {
          const pat = row.original;
          const badges = [];
          if (pat.primary_pim?.label) badges.push(pat.primary_pim.label);
          if (pat.secondary_pim) badges.push(pat.secondary_pim);

          return (
            <div className="flex flex-col gap-1 text-left py-1 max-w-[230px]">
              {badges.map((b, idx) => (
                <span
                  key={idx}
                  className={`inline-block w-fit rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getPimBadgeStyle(
                    b
                  )}`}
                >
                  {b}
                </span>
              ))}
            </div>
          );
        },
      },
      // 4. Predicted Fall Risk
      {
        id: "risk",
        header: "PREDICTED FALL RISK",
        cell: ({ row }) => {
          const pat = row.original;
          const isCritical = pat.acuity_tier === "Critical";
          const isHigh = pat.acuity_tier === "High";
          const isModerate = pat.acuity_tier === "Moderate";

          const gaugeColor = isCritical
            ? "bg-[#dc2626]"
            : isHigh
            ? "bg-[#ea580c]"
            : isModerate
            ? "bg-[#1b3b36]"
            : "bg-[#16a34a]";

          const textColor = isCritical
            ? "text-[#dc2626]"
            : isHigh
            ? "text-[#d97706]"
            : isModerate
            ? "text-slate-700"
            : "text-[#059669]";

          return (
            <div className="flex flex-col text-left py-1 w-32">
              {/* Mini horizontal gauge */}
              <div className="h-1.5 w-20 rounded-full bg-slate-200/80 overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full ${gaugeColor}`}
                  style={{ width: `${Math.min(100, pat.risk_percentage)}%` }}
                />
              </div>
              <span className={`text-xs font-bold tracking-tight uppercase ${textColor}`}>
                {pat.risk_percentage}% {pat.acuity_tier}
              </span>
            </div>
          );
        },
      },
      // 5. Primary CDS Recommendation
      {
        id: "recommendation",
        header: "PRIMARY CDS RECOMMENDATION",
        cell: ({ row }) => {
          const pat = row.original;
          const hasBeers = pat.recommendation_tags?.includes("BEERS");

          return (
            <div className="flex flex-col text-left text-xs py-1 max-w-[280px]">
              <span className="text-slate-800 leading-snug">
                {pat.primary_recommendation}
              </span>
              {hasBeers && (
                <span className="text-[11px] font-bold text-[#dc2626] uppercase mt-0.5 tracking-tight">
                  (BEERS 2023: HIGH SEDATION RISK)
                </span>
              )}
            </div>
          );
        },
      },
      // 6. Last Reviewed
      {
        id: "reviewed",
        header: "LAST REVIEWED",
        cell: ({ row }) => {
          const pat = row.original;
          if (pat.review_badge === "Unreviewed") {
            return (
              <div className="flex flex-col text-left py-1 text-xs">
                <span className="w-fit rounded bg-rose-50 border border-rose-200/90 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                  Unreviewed
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  {pat.review_time}
                </span>
              </div>
            );
          }
          return (
            <div className="flex flex-col text-left py-1 text-xs text-slate-600">
              <span>{pat.review_time}</span>
            </div>
          );
        },
      },
      // 7. Actions
      {
        id: "actions",
        header: "ACTIONS",
        cell: ({ row }) => {
          const pat = row.original;
          const isHighOrCritical =
            pat.acuity_tier === "Critical" || pat.acuity_tier === "High";

          if (isHighOrCritical) {
            return (
              <div className="flex items-center justify-end py-1">
                <button
                  onClick={() => {
                    if (onReviewSmr) {
                      onReviewSmr(pat);
                    } else {
                      onSelectPatient(pat);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-[#1b3b36] hover:bg-[#142e2a] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
                >
                  <span>Review SMR</span>
                  <span className="text-white/80">→</span>
                </button>
              </div>
            );
          }

          return (
            <div className="flex items-center justify-end py-1">
              <button
                onClick={() => onSelectPatient(pat)}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
              >
                <span>View Details</span>
              </button>
            </div>
          );
        },
      },
    ],
    [onSelectPatient, onReviewSmr]
  );

  // TanStack Table Instance
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const next = updater({ pageIndex, pageSize });
        setPageIndex(next.pageIndex);
        setPageSize(next.pageSize);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden my-4">
      {/* FILTER & SORT CONTROLS BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 border-b border-slate-100 bg-white">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setFilter("all");
              setPageIndex(0);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold transition cursor-pointer ${
              filter === "all"
                ? "bg-[#1b3b36] text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>All Patients ({counts.all})</span>
          </button>

          <button
            onClick={() => {
              setFilter("critical");
              setPageIndex(0);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-medium transition cursor-pointer ${
              filter === "critical"
                ? "bg-[#1b3b36] text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Critical Risk ({counts.critical})</span>
          </button>

          <button
            onClick={() => {
              setFilter("high");
              setPageIndex(0);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-medium transition cursor-pointer ${
              filter === "high"
                ? "bg-[#1b3b36] text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>High Risk ({counts.high})</span>
          </button>

          <button
            onClick={() => {
              setFilter("pim");
              setPageIndex(0);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-medium transition cursor-pointer ${
              filter === "pim"
                ? "bg-[#1b3b36] text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>Has PIM Alert ({counts.pim})</span>
          </button>

          <button
            onClick={() => {
              setFilter("renal");
              setPageIndex(0);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-medium transition cursor-pointer ${
              filter === "renal"
                ? "bg-[#1b3b36] text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>Renal eGFR &lt; 30 ({counts.renal})</span>
          </button>
        </div>

        {/* Right side Sort & Layout toggle */}
        <div className="flex items-center gap-2">
          {/* Sort Dropdown */}
          <div className="relative inline-flex items-center">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[#1b3b36] cursor-pointer"
            >
              <option value="risk_desc">
                Sort: Predicted Fall Risk (Descending)
              </option>
              <option value="risk_asc">
                Sort: Predicted Fall Risk (Ascending)
              </option>
              <option value="egfr">Sort: Renal eGFR (Lowest first)</option>
              <option value="drugs">Sort: Total Meds (Highest first)</option>
              <option value="name">Sort: Patient Name (A-Z)</option>
              <option value="bed">Sort: Bed Assignment</option>
            </select>
            <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* View icons */}
          <button
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="List View"
          >
            <Menu className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Grid View"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* TABLE CONTENT */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="py-3 px-5 font-bold select-none whitespace-nowrap"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {rows.map((row) => {
              const pat = row.original;
              const isCritical = pat.acuity_tier === "Critical";

              return (
                <tr
                  key={row.id}
                  className={`border-b border-slate-100/80 transition-colors hover:bg-slate-50/70 ${
                    isCritical ? "border-l-4 border-l-[#dc2626]" : ""
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-3 px-5 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINATION FOOTER */}
      <TablePagination
        currentPage={pageIndex + 1}
        totalPages={table.getPageCount() || 1}
        pageSize={pageSize}
        totalRows={filteredData.length}
        onPageChange={(page) => setPageIndex(page - 1)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageIndex(0);
        }}
      />
    </div>
  );
}

