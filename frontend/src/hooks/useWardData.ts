"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AdmissionRequest, Patient, PatientDetail, SignOrdersResponse, WardKpis, WardDistribution } from "@/types/patient";
import { apiRequest } from "@/lib/api";
import { normalizePatient } from "@/lib/patientData";
import { INITIAL_WARD_KPIS, INITIAL_WARD_DISTRIBUTION, INITIAL_PATIENTS } from "@/lib/mockData";

export function useWardKpis() {
  return useQuery<WardKpis>({
    queryKey: ["wardKpis"],
    queryFn: ({ signal }) => apiRequest<WardKpis>("/ward/kpis", { signal }),
    placeholderData: INITIAL_WARD_KPIS,
    staleTime: 10000,
  });
}

export function useWardDistribution() {
  return useQuery<WardDistribution>({
    queryKey: ["wardDistribution"],
    queryFn: ({ signal }) => apiRequest<WardDistribution>("/ward/distribution", { signal }),
    placeholderData: INITIAL_WARD_DISTRIBUTION,
    staleTime: 10000,
  });
}

export function usePatients() {
  return useQuery<Patient[]>({
    queryKey: ["patients"],
    queryFn: async ({ signal }) => (await apiRequest<Patient[]>("/patients", { signal })).map(normalizePatient),
    placeholderData: INITIAL_PATIENTS,
    staleTime: 10000,
  });
}

export function usePatientDetail(patientId?: number) {
  return useQuery<PatientDetail>({
    queryKey: ["patient", patientId],
    queryFn: ({ signal }) => apiRequest<PatientDetail>(`/patient/${patientId}`, { signal }),
    enabled: patientId !== undefined,
  });
}

export function useIngestAdmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: AdmissionRequest) => {
      const data = await apiRequest<{ success: boolean; patient: Patient }>("/admissions/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!data.success || !data.patient) throw new Error("The admission was not saved.");
      return normalizePatient(data.patient);
    },
    onSuccess: (patient) => {
      queryClient.setQueryData<Patient[]>(["patients"], (old = []) => [patient, ...old.filter(p => p.hadm_id !== patient.hadm_id)]);
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
      void queryClient.invalidateQueries({ queryKey: ["wardKpis"] });
      void queryClient.invalidateQueries({ queryKey: ["wardDistribution"] });
    },
  });
}

export function useSignOrders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ patientId, actionIds }: { patientId: number; actionIds: string[] }) => {
      const data = await apiRequest<SignOrdersResponse>("/cpoe/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: String(patientId), action_ids: actionIds }),
      });
      if (!data.success || data.patient_id !== String(patientId)) throw new Error("The orders were not authorized for this patient.");
      return data;
    },
    onSuccess: (_data, { patientId }) => {
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
      void queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
      void queryClient.invalidateQueries({ queryKey: ["wardKpis"] });
      void queryClient.invalidateQueries({ queryKey: ["wardDistribution"] });
    },
  });
}
