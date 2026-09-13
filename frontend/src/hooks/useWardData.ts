"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Patient, WardKpis, WardDistribution } from "@/types/patient";
import {
  INITIAL_WARD_KPIS,
  INITIAL_WARD_DISTRIBUTION,
  INITIAL_PATIENTS,
} from "@/lib/mockData";

const API_BASE = "http://127.0.0.1:8000/api";

async function fetchWithFallback<T>(url: string, fallback: T): Promise<T> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

export function useWardKpis() {
  return useQuery<WardKpis>({
    queryKey: ["wardKpis"],
    queryFn: () => fetchWithFallback<WardKpis>(`${API_BASE}/ward/kpis`, INITIAL_WARD_KPIS),
    initialData: INITIAL_WARD_KPIS,
    staleTime: 10000,
  });
}

export function useWardDistribution() {
  return useQuery<WardDistribution>({
    queryKey: ["wardDistribution"],
    queryFn: () =>
      fetchWithFallback<WardDistribution>(
        `${API_BASE}/ward/distribution`,
        INITIAL_WARD_DISTRIBUTION
      ),
    initialData: INITIAL_WARD_DISTRIBUTION,
    staleTime: 10000,
  });
}

export function usePatients() {
  return useQuery<Patient[]>({
    queryKey: ["patients"],
    queryFn: () =>
      fetchWithFallback<Patient[]>(`${API_BASE}/patients`, INITIAL_PATIENTS),
    initialData: INITIAL_PATIENTS,
    staleTime: 10000,
  });
}

export function useIngestAdmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newPatientData: Partial<Patient>) => {
      try {
        const res = await fetch(`${API_BASE}/admissions/ingest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newPatientData),
        });
        if (res.ok) return await res.json();
      } catch {
        // Fallback local mutation
      }
      return { success: true, patient: newPatientData };
    },
    onSuccess: (data) => {
      queryClient.setQueryData<Patient[]>(["patients"], (old = []) => {
        if (!data.patient) return old;
        const newPat: Patient = {
          hadm_id: Date.now(),
          mrn: data.patient.mrn || `#MRN-${Math.floor(80000 + Math.random() * 10000)}`,
          name: data.patient.name || "New Admission",
          initials: (data.patient.name || "NA")
            .split(" ")
            .map((s: string) => s[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
          age: Number(data.patient.age) || 75,
          gender: data.patient.gender || "FEMALE",
          bed: data.patient.bed || "Bed 428-A",
          ward: "Acute Care Unit 4B",
          los_days: 1,
          code_status: "Full Code",
          acuity_tier: data.patient.acuity_tier || "High",
          risk_percentage: Number(data.patient.risk_percentage) || 45.0,
          trend: "up",
          drug_count: Number(data.patient.drug_count) || 8,
          prn_count: 1,
          creatinine: Number(data.patient.creatinine) || 1.3,
          renal_egfr: 45,
          renal_stage: "CKD 3a",
          blood_pressure: "124/76",
          bp_drop: -12,
          primary_pim: { label: "Sedative-Hypnotic", severity: "high" },
          high_risk_meds: ["Lorazepam 0.5mg"],
          primary_recommendation: "Fall precautions initiated; clinical pharmacist review queued",
          recommendation_tags: "NEW ADMISSION TRIAGE",
          review_badge: "Unreviewed",
          review_time: "Admitted just now",
          reviewer_info: "Admitted just now",
        };
        return [newPat, ...old];
      });
    },
  });
}
