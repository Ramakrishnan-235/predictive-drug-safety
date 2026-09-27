export type AcuityTier = "Critical" | "High" | "Moderate" | "Low";

export interface PrimaryPim {
  label: string;
  severity: "critical" | "high" | "warning" | "neutral";
}

export interface Patient {
  hadm_id: number;
  mrn: string;
  name: string;
  initials: string;
  age: number;
  gender: "MALE" | "FEMALE" | "OTHER";
  bed: string;
  ward: string;
  los_days: number;
  code_status: string;
  acuity_tier: AcuityTier;
  risk_percentage: number;
  trend: "up" | "down" | "neutral";
  drug_count: number;
  prn_count: number;
  creatinine: number;
  renal_egfr: number;
  renal_stage: string;
  blood_pressure: string;
  bp_drop: number;
  primary_pim?: PrimaryPim;
  secondary_pim?: string;
  high_risk_meds: string[];
  primary_recommendation: string;
  recommendation_tags: string;
  review_badge?: string; // e.g. "Unreviewed"
  review_time: string;  // e.g. "Admitted 2h ago"
  review_actor?: string; // e.g. "By Dr. Chen"
  reviewer_info?: string;
  clinical_notes?: string[];
  // Extended fields for review drawer
  attending?: string;
  elevation_multiplier?: string;
  model_confidence?: string;
  model_name?: string;
}

export interface WardKpis {
  high_fall_risk_count: number;
  high_fall_risk_today_delta: number;
  acute_admissions_flagged_12h: number;
  active_pim_alerts_count: number;
  stopp_version: string;
  commonest_pim_type: string;
  severe_ddi_burden_count: number;
  critical_interaction_index: number;
  ddi_synergies_desc: string;
  deprescribing_completed_pct: number;
  deprescribing_week_delta: number;
  medication_tapers_week_count: number;
}

export interface RiskStratum {
  id: string;
  label: string;
  criteria: string;
  patient_count: number;
  percentage: number;
  color_class: string;
  bar_color: string;
}

export interface WardDistribution {
  total_inpatients: number;
  stratums: RiskStratum[];
}

export interface TelemetryEvent {
  event: string;
  timestamp: string;
  sync_seconds_ago: number;
  ward_id: string;
  active_patients: number;
  high_risk_count: number;
  alert?: string;
}

export type FilterType = "all" | "critical" | "high" | "pim" | "renal";
export type SortField = "risk_desc" | "risk_asc" | "name" | "bed" | "egfr" | "drugs";
