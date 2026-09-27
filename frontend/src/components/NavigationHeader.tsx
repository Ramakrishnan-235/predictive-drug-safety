"use client";

import React from "react";
import {
  Search,
  Bell,
  User,
  Sparkles,
  Shield,
  Plus,
} from "lucide-react";

interface NavigationHeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onBellClick?: () => void;
  hasAlert?: boolean;
}

export function NavigationHeader({
  activeTab = "Triage Worklist",
  onTabChange,
  searchQuery = "",
  onSearchChange,
  onBellClick,
  hasAlert = true,
}: NavigationHeaderProps) {
  const tabs = [
    "Triage Worklist",
    "Medication Review (SMR)",
    "Patient Trajectory",
  ];

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur px-6 py-2.5 font-sans">
      <div className="max-w-[1520px] mx-auto flex items-center justify-between gap-4">
        {/* Brand & Version Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1b3b36] text-white shadow-xs">
            <Shield className="w-4.5 h-4.5 fill-white/20 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 tracking-tight text-base">
              GeriSafe CDSS
            </span>
            <span className="rounded-full border border-emerald-300/80 bg-emerald-50/90 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-emerald-800">
              v2.4 Inpatient
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            const isTrajectory = tab === "Patient Trajectory";
            return (
              <button
                key={tab}
                onClick={() => onTabChange?.(tab)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? isTrajectory
                      ? "bg-[#e2f3ee] text-[#1b3b36] border border-[#a8dad0] shadow-xs"
                      : "bg-[#1b3b36] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                {isActive && !isTrajectory && (
                  <Sparkles className="w-3 h-3 text-emerald-300 fill-emerald-300" />
                )}
                <span>{tab}</span>
              </button>
            );
          })}
        </nav>

        {/* Search Bar & Clinician Profile */}
        <div className="flex items-center gap-3.5">
          {/* Global Search */}
          <div className="relative w-64 md:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search MRN or Patient..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-10 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1b3b36] transition"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 font-mono">
              ⌘K
            </span>
          </div>

          {/* Notification Bell */}
          <button
            onClick={onBellClick}
            className="relative p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            {hasAlert && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {/* Clinician Profile */}
          <div className="flex items-center gap-2.5 pl-2">
            <div className="w-8 h-8 rounded-full bg-[#1b3b36] flex items-center justify-center text-white shadow-xs">
              <User className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 leading-tight">
                Dr. Sarah Chen, MD
              </span>
              <span className="text-[10px] text-slate-500 leading-tight">
                Geriatric Ward 4B
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

