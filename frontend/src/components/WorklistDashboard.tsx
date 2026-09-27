"use client";

import React, { useState, useMemo } from "react";
import { NavigationHeader } from "./NavigationHeader";
import { DashboardSubheader } from "./DashboardSubheader";
import { WardKpiCards } from "./WardKpiCards";
import { PatientTriageTable } from "./PatientTriageTable";
import { WardTelemetryFooter } from "./WardTelemetryFooter";
import { MedicationReviewSMR } from "./MedicationReviewSMR";
import { PatientTrajectory } from "./PatientTrajectory";
import { PatientReviewDrawer } from "./modals/PatientReviewDrawer";
import { IngestAdmissionModal } from "./modals/IngestAdmissionModal";
import { FhirExportModal } from "./modals/FhirExportModal";
import { CircadianCurveModal } from "./modals/CircadianCurveModal";
import { SafetyHandoffModal } from "./modals/SafetyHandoffModal";
import { ConsultModal } from "./modals/ConsultModal";

import { useTelemetrySSE } from "@/hooks/useTelemetrySSE";
import {
  useWardKpis,
  useWardDistribution,
  usePatients,
  useIngestAdmission,
} from "@/hooks/useWardData";
import { Patient } from "@/types/patient";

export function WorklistDashboard() {
  // Navigation & Search State - Defaults to Page 1: Triage Worklist
  const [activeTab, setActiveTab] = useState("Triage Worklist");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal & Drawer State
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [isFhirOpen, setIsFhirOpen] = useState(false);
  const [isCircadianOpen, setIsCircadianOpen] = useState(false);
  const [isSafetyHandoffOpen, setIsSafetyHandoffOpen] = useState(false);
  const [isConsultOpen, setIsConsultOpen] = useState(false);

  // Real-time Telemetry via SSE
  const { isConnected, syncTimeAgo, latestAlert, clearAlert } = useTelemetrySSE();

  // Ward Data via TanStack Query
  const { data: kpis } = useWardKpis();
  const { data: distribution } = useWardDistribution();
  const { data: patients = [] } = usePatients();
  const ingestMutation = useIngestAdmission();

  // Search filtering
  const displayedPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        p.bed.toLowerCase().includes(q) ||
        p.high_risk_meds.some((m) => m.toLowerCase().includes(q)) ||
        p.primary_recommendation.toLowerCase().includes(q)
    );
  }, [patients, searchQuery]);

  const handleIngestPatient = (patientData: Partial<Patient>) => {
    ingestMutation.mutate(patientData);
  };

  const handleSignPatientOrders = (patientId: number, planIds: string[]) => {
    // Orders signed in drawer
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans antialiased">
      {/* 1. TOP NAVIGATION HEADER */}
      <NavigationHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        hasAlert={Boolean(latestAlert)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* SSE Live Alert Banner (if broadcasted) */}
        {latestAlert && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 flex items-center justify-between text-xs text-amber-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>
                <strong>Live Telemetry Alert:</strong> {latestAlert}
              </span>
            </div>
            <button
              onClick={clearAlert}
              className="text-amber-600 hover:text-amber-900 font-semibold ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* CONDITIONALLY RENDER ACTIVE TAB */}
        {activeTab === "Medication Review (SMR)" ? (
          <MedicationReviewSMR
            onBackToTriage={() => setActiveTab("Triage Worklist")}
            onTabChange={setActiveTab}
          />
        ) : activeTab === "Patient Trajectory" ? (
          <PatientTrajectory
            onBackToSMR={() => setActiveTab("Medication Review (SMR)")}
            onApplyToSMR={() => setActiveTab("Medication Review (SMR)")}
          />
        ) : (
          <>
            {/* 2. SUBHEADER & GLOBAL ACTIONS */}
            <DashboardSubheader
              patientCount={patients.length}
              syncTimeAgo={syncTimeAgo}
              isLive={isConnected}
              onExportFhir={() => setIsFhirOpen(true)}
              onIngestAdmission={() => setIsIngestOpen(true)}
            />

            {/* 3. FOUR KPI SURVEILLANCE CARDS */}
            {kpis && <WardKpiCards kpis={kpis} totalPatients={patients.length} />}

            {/* 4. PATIENT TRIAGE WORKLIST TABLE */}
            <PatientTriageTable
              patients={displayedPatients}
              onSelectPatient={(p) => {
                setSelectedPatient(p);
              }}
              onReviewSmr={(p) => {
                setSelectedPatient(p);
                setActiveTab("Medication Review (SMR)");
              }}
            />

            {/* 5. GLOBAL BOTTOM COMPLIANCE BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-4 px-1 text-xs text-slate-400">
              <span>Clinical Decision Support Platform • ISO 13485 &amp; HIPAA Compliant</span>
              <span className="flex items-center gap-2 text-slate-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Ward 4B Session Active
              </span>
            </div>
          </>
        )}
      </main>

      {/* MODALS & DRAWERS */}
      {selectedPatient && (
        <PatientReviewDrawer
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onSignOrders={handleSignPatientOrders}
        />
      )}

      <IngestAdmissionModal
        isOpen={isIngestOpen}
        onClose={() => setIsIngestOpen(false)}
        onIngest={handleIngestPatient}
      />

      <FhirExportModal
        isOpen={isFhirOpen}
        onClose={() => setIsFhirOpen(false)}
        patient={selectedPatient}
      />

      <CircadianCurveModal
        isOpen={isCircadianOpen}
        onClose={() => setIsCircadianOpen(false)}
      />

      <SafetyHandoffModal
        isOpen={isSafetyHandoffOpen}
        onClose={() => setIsSafetyHandoffOpen(false)}
        patients={patients}
      />

      <ConsultModal
        isOpen={isConsultOpen}
        onClose={() => setIsConsultOpen(false)}
      />
    </div>
  );
}
export default WorklistDashboard;
