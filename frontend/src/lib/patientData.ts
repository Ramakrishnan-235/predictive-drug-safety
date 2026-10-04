import type { Patient } from "../types/patient";

// Fill display text omitted by the census without replacing server identities or clinical values.
export function normalizePatient(patient: Patient): Patient {
  return {
    ...patient,
    initials: patient.initials ?? patient.name.trim().split(/\s+/).map(word => word[0]).join("").slice(0, 2).toUpperCase(),
    high_risk_meds: patient.high_risk_meds ?? [],
    primary_recommendation: patient.primary_recommendation ?? "Clinical review pending",
    recommendation_tags: patient.recommendation_tags ?? "",
    review_time: patient.review_time ?? patient.reviewer_info ?? "Review pending",
  };
}
