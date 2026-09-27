"use client";

import React, { useState } from "react";
import { X, MessageSquare, Send, CheckCircle2 } from "lucide-react";

interface ConsultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConsultModal({ isOpen, onClose }: ConsultModalProps) {
  const [note, setNote] = useState(
    "Requesting urgent clinical pharmacist review for Eleanor Vance (Bed 402-A) and Arthur Pendelton (Bed 404-B) regarding loop diuretic + benzodiazepine synergistic fall hazard. Recommend initiating sleep hygiene taper."
  );
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleSend = () => {
    setSent(true);
    setTimeout(() => {
      setSent(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                Initiate Joint SMR Consult
              </h2>
              <p className="text-[11px] text-zinc-500">
                Direct secure page to Dr. Marcus Vance, PharmD, BCGP (Pager: #4482)
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
        <div className="p-5 space-y-4 text-xs text-zinc-700">
          <div>
            <label className="font-semibold text-zinc-800 block mb-1">
              Clinical Consult Priority
            </label>
            <div className="flex gap-2">
              <span className="rounded-md border border-rose-200 bg-rose-50 text-rose-700 px-3 py-1 font-semibold text-xs">
                Stat / Within 1 Hour (Fall Hazard)
              </span>
              <span className="rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600 px-3 py-1 text-xs">
                Routine Rounds (14:00)
              </span>
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-800 block mb-1">
              Consultation Notes & Deprescribing Scope
            </label>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 p-2.5 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          {sent && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Consult dispatched via Voicera EHR Paging System.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-zinc-100 bg-zinc-50/50">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sent}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-zinc-800 disabled:opacity-50 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Transmit Page</span>
          </button>
        </div>
      </div>
    </div>
  );
}
