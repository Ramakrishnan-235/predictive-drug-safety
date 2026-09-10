export interface RenalClearance {
  creatinine: number;
  creatinine_unit: string;
  egfr: number;
  stage: string;
  crcl: number;
  crcl_unit: string;
}

export interface Anthropometry {
  weight_kg: number;
  bmi: number;
}

export interface PosturalHemodynamics {
  supine_bp: string;
  standing_bp: string;
  drop_mmhg: number;
  heart_rate: number;
  status: string;
}

export interface ShapAttribution {
  feature: string;
  impact_weight: number;
  detail: string;
}

export interface GuidelineBadge {
  name: string;
  tag: string;
}

export interface CircadianPoint {
  hour: string;
  map_nadir: number;
  sedative_cmax: number;
  nocturnal_transfer: boolean;
}

export interface CircadianProfile {
  peak_risk_window: string;
  points: CircadianPoint[];
}

export interface ActiveMedication {
  id: string;
  name: string;
  generic_name: string;
  priority_badge: string;
  severity_type: 'critical' | 'warning' | 'danger' | 'info';
  route_timing: string;
  badges: string[];
  warning?: string | null;
  is_monitored: boolean;
}

export interface DeprescribingPlan {
  id: string;
  title: string;
  risk_delta_label: string;
  risk_delta_type: 'success' | 'danger' | 'neutral';
  description: string;
  impact_metric: string;
  action_button: string;
  is_queued: boolean;
}

export interface PatientDetail {
  hadm_id: number;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  los_days: number;
  code_status: string;
  ward: string;
  bed: string;
  attending: string;
  admission_date: string;
  acuity_tier: string;
  risk_percentage: number;
  ward_baseline_pct: number;
  elevation_multiplier: string;
  model_confidence: string;
  model_name: string;
  renal_clearance: RenalClearance;
  anthropometry: Anthropometry;
  postural_hemodynamics: PosturalHemodynamics;
  shap_attributions: ShapAttribution[];
  clinical_rationale: string;
  guidelines: GuidelineBadge[];
  circadian_profile: CircadianProfile;
  active_medications: ActiveMedication[];
  chronic_stable_medications: string[];
  deprescribing_plans: DeprescribingPlan[];
}

export interface InpatientSummary {
  hadm_id: number;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  bed: string;
  ward: string;
  los_days: number;
  code_status: string;
  acuity_tier: string;
  risk_percentage: number;
  renal_egfr: number;
  renal_stage: string;
  blood_pressure: string;
  bp_drop: number;
}

export interface ClinicalEvent {
  month_idx: number;
  title: string;
  subtitle: string;
  type: string;
  tag: string;
}

export interface SwimlaneSegment {
  start: number;
  end: number;
  dose: string;
  type: 'stable' | 'titrated_up' | 'cascade_reactive' | 'intermittent';
  alert?: string;
}

export interface PrescriptionSwimlane {
  drug_name: string;
  category: string;
  badge: string;
  segments: SwimlaneSegment[];
}

export interface AcuteEventCallout {
  month: string;
  title: string;
  text: string;
}

export interface RenalBiomarkers {
  egfr_curve: number[];
  creatinine_curve: number[];
  ckd_3b_threshold_egfr: number;
  acute_event_callout: AcuteEventCallout;
}

export interface FallRiskPoint {
  month: string;
  risk: number;
  event?: string;
}

export interface PrescribingCascadeStep {
  step: number;
  title: string;
  timing: string;
  description: string;
}

export interface TargetedPlanItem {
  priority: 'URGENT' | 'MED REVIEW' | 'STOPP';
  title: string;
  description: string;
}

export interface TrajectoryData {
  patient_id: string;
  timeline_range: string;
  months: string[];
  clinical_events: ClinicalEvent[];
  prescription_swimlanes: PrescriptionSwimlane[];
  renal_biomarkers: RenalBiomarkers;
  fall_risk_curve: FallRiskPoint[];
  prescribing_cascade_steps: PrescribingCascadeStep[];
  prescribing_cascade_summary: string;
  targeted_deprescribing_plan: TargetedPlanItem[];
}

export interface EtiologyFlowStep {
  step: number;
  title: string;
  desc: string;
}

export interface InteractingPair {
  primary_drug: string;
  interacting_agent: string;
  severity_weight: number;
  severity_label: string;
  clinical_consequence: string;
  action: string;
  action_type: 'alert' | 'warning' | 'danger';
}

export interface Citation {
  authors: string;
  title: string;
  journal: string;
  pmcid?: string;
  doi?: string;
  dossier?: string;
}

export interface ClinicalRule {
  id: string;
  code: string;
  category: string;
  badge_type: string;
  title: string;
  subtitle: string;
  tags: string[];
  sensitivity: string;
  ward_triggers_30d: number;
  last_audit: string;
  full_breadcrumb: string;
  rule_heading: string;
  rule_id: string;
  icd10: string;
  snomed_ct: string;
  status: string;
  alert_level: string;
  biological_etiology: string;
  etiology_flow: EtiologyFlowStep[];
  high_priority_interacting_pairs: InteractingPair[];
  citations: Citation[];
}

export interface RulesResponse {
  version: string;
  audited_date: string;
  samd_level: string;
  total_rules: number;
  rules: ClinicalRule[];
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  patient_id: string;
  patient_name: string;
  action: string;
  actor: string;
  details: string;
  status: string;
}
