"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalRows: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalRows,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalRows);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 6) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push(2);
      pages.push(3);
      pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3.5 px-6 border-t border-slate-100 text-xs text-slate-500">
      {/* Left info & rows per page */}
      <div className="flex items-center gap-3">
        <span>
          Showing {totalRows > 0 ? `${startIdx}–${endIdx}` : 0} of {totalRows} patients
        </span>
        <span className="text-slate-300">•</span>
        <div className="flex items-center gap-1.5">
          <span>Rows per page:</span>
          <div className="relative inline-flex items-center">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="appearance-none rounded border border-slate-200 bg-white pl-2 pr-5 py-0.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1b3b36] cursor-pointer"
            >
              <option value={6}>6</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={48}>48</option>
            </select>
            <span className="absolute right-1.5 pointer-events-none text-[10px] text-slate-400">
              ▼
            </span>
          </div>
        </div>
      </div>

      {/* Right page buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="w-7 h-7 rounded border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition cursor-pointer"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {getPageNumbers().map((page, idx) => {
          if (page === "...") {
            return (
              <span key={`dots-${idx}`} className="px-1 text-slate-400 text-xs">
                ...
              </span>
            );
          }
          const isCurrent = page === currentPage;
          return (
            <button
              key={`page-${page}`}
              onClick={() => onPageChange(Number(page))}
              className={`w-7 h-7 rounded flex items-center justify-center text-xs font-semibold transition cursor-pointer ${
                isCurrent
                  ? "bg-[#1b3b36] text-white shadow-xs"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {page}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="w-7 h-7 rounded border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition cursor-pointer"
          title="Next Page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

