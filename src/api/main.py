import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, Optional
from copy import deepcopy
import datetime
import asyncio
import json
import logging
import math
import uuid
import torch

from src.api.schemas import (
    IngestAdmissionRequest,
    MedGemmaPipelineRequest,
    PredictGNNRequest,
    SignCPOEOrderRequest,
    SimulateDeprescribeRequest,
)
from src.api.state import WARD_STATE_LOCK

logger = logging.getLogger(__name__)

from src.api.ward_data import (
    FULL_WARD_CENSUS,
    get_ward_kpi_metrics,
    get_ward_risk_distribution,
    generate_fhir_r4_bundle
)

from src.models.gnn_inference import GNNInferenceEngine
from src.clinical_rules.safety_rules import audit_patient_medications, FRID_CATEGORIES, RENAL_RISK_MEDS
from src.explainability.llm_explainer import LLMClinicalExplainer
from src.explainability.medgemma_pipeline import MedGemmaPipelineService

app = FastAPI(
    title="GeriSafe CDSS Inpatient Drug Safety & Fall Risk API",
    description="Multimodal Graph Neural Network & Clinical Knowledge Guardrails API for Geriatric Fall Prevention",
    version="2.4.0"
)

# Enable CORS for Next.js frontend (default ports 3000, 3001, etc.)
# Note: allow_origins=["*"] combined with allow_credentials=True is an illegal combination in Starlette.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize engines
try:
    gnn_engine = GNNInferenceEngine(checkpoint_path="models/gnn_fall_model.pt")
    print(f"[GeriSafe API] GNN Inference Engine initialized with {gnn_engine.num_unique_drugs} drugs.")
except Exception as e:
    print(f"[GeriSafe API Warning] Failed to initialize GNN engine: {e}")
    gnn_engine = None

try:
    explainer = LLMClinicalExplainer()
except Exception as e:
    print(f"[GeriSafe API Warning] Failed to initialize LLM explainer: {e}")
    explainer = None

medgemma_service = MedGemmaPipelineService()

# In-memory store for audit events and dynamic patient states
AUDIT_LOG_STORE: List[Dict[str, Any]] = [
    {
        "id": "AUD-20260418-0912",
        "timestamp": "2026-04-18T09:12:44Z",
        "patient_id": "994201",
        "patient_name": "Robert Miller",
        "action": "EHR Real-Time Synchronization",
        "actor": "System Automation / HL7 FHIR Stream",
        "details": "Synchronized 14 active medication orders and latest serum creatinine (1.80 mg/dL).",
        "status": "Logged"
    },
    {
        "id": "AUD-20260418-0914",
        "timestamp": "2026-04-18T09:14:02Z",
        "patient_id": "994201",
        "patient_name": "Robert Miller",
        "action": "GNN Fall Risk Inference Executed",
        "actor": "GeriSafe Acuity Engine v2.4",
        "details": "Calculated 68.4% acute fall risk (<48h). Hard safety gates flagged for Beers PIM & STOPP v3 Section K.",
        "status": "Alert Active"
    },
    {
        "id": "AUD-20260418-0845",
        "timestamp": "2026-04-18T08:45:10Z",
        "patient_id": "994202",
        "patient_name": "Margaret Davis",
        "action": "Routine SMR Complete",
        "actor": "Dr. Sarah Chen, MD",
        "details": "Accepted taper for Zolpidem 5mg -> 2.5mg. Fall risk mitigated from 44.2% to 28.5%.",
        "status": "Signed"
    }
]

# Patient State (Default: Robert Miller #994201)
PATIENTS_DATABASE: Dict[str, Dict[str, Any]] = {
    "994201": {
        "hadm_id": 994201,
        "mrn": "#994201",
        "name": "Robert Miller",
        "age": 84,
        "gender": "MALE",
        "los_days": 4,
        "code_status": "Full Code",
        "ward": "Geriatric Ward 4B",
        "bed": "Bed 401A (Acute Care 4B)",
        "attending": "Dr. Sarah Chen, MD",
        "admission_date": "2026-04-14",
        "acuity_tier": "Critical",
        "risk_percentage": 68.4,
        "ward_baseline_pct": 18.2,
        "elevation_multiplier": "3.76x",
        "model_confidence": "94.8%",
        "model_name": "Gradient Boosted Survival Tree • AUROC 0.89",
        "renal_clearance": {
            "creatinine": 1.80,
            "creatinine_unit": "mg/dL",
            "egfr": 31,
            "stage": "CKD 3b",
            "crcl": 29,
            "crcl_unit": "mL/min"
        },
        "anthropometry": {
            "weight_kg": 72.4,
            "bmi": 24.1
        },
        "postural_hemodynamics": {
            "supine_bp": "118/74",
            "standing_bp": "100/62",
            "drop_mmhg": -18,
            "heart_rate": 64,
            "status": "Orthostatic Hypotension Confirmed"
        },
        "shap_attributions": [
            {
                "feature": "wDDI Regimen Burden: Synergistic GABA-A & Volume Depletion",
                "impact_weight": 0.218,
                "detail": "Lorazepam + Furosemide drug-drug-disease interaction loop"
            },
            {
                "feature": "Serum Creatinine Elevation (Reduced Drug Clearance)",
                "impact_weight": 0.174,
                "detail": "eGFR declined 42 -> 31 mL/min/1.73m² over prior 72 hours"
            },
            {
                "feature": "CNS Polypharmacy Active (Sedation / Ataxia Risk)",
                "impact_weight": 0.130,
                "detail": "Concurrent central nervous system sedatives compounded by PRN Diphenhydramine"
            },
            {
                "feature": "Loop Diuretic Initiation (Acute Orthostasis & Nocturia)",
                "impact_weight": 0.092,
                "detail": "Furosemide 40 mg morning dosing inducing recurrent nocturnal unassisted transfers"
            }
        ],
        "clinical_rationale": (
            "Co-administration of Lorazepam (GABA-A positive allosteric modulator) with Furosemide precipitates "
            "acute orthostatic cerebral hypoperfusion upon standing. Impaired renal clearance (CrCl 29 mL/min) "
            "extends sedative active metabolite half-life, causing daytime gait ataxia and impaired balance recovery "
            "during nocturnal voiding."
        ),
        "guidelines": [
            {"name": "2023 AGS Beers Criteria Table 2: Sedative-Hypnotics", "tag": "BEERS"},
            {"name": "STOPP v3 Section K: Fall-Risk Drugs (FRIDs)", "tag": "STOPP"},
            {"name": "KDIGO 2024 Dose Adjustment (Stage 3b)", "tag": "KDIGO"}
        ],
        "circadian_profile": {
            "peak_risk_window": "02:00 - 05:00",
            "points": [
                {"hour": "20:00", "map_nadir": 88, "sedative_cmax": 25, "nocturnal_transfer": False},
                {"hour": "23:00", "map_nadir": 84, "sedative_cmax": 65, "nocturnal_transfer": False},
                {"hour": "02:00", "map_nadir": 74, "sedative_cmax": 92, "nocturnal_transfer": True},
                {"hour": "04:00", "map_nadir": 71, "sedative_cmax": 90, "nocturnal_transfer": True},
                {"hour": "07:00", "map_nadir": 82, "sedative_cmax": 50, "nocturnal_transfer": False},
                {"hour": "10:00", "map_nadir": 89, "sedative_cmax": 20, "nocturnal_transfer": False}
            ]
        },
        "active_medications": [
            {
                "id": "med-1",
                "name": "Lorazepam 1.0 mg PO",
                "generic_name": "lorazepam",
                "priority_badge": "FRID Priority 1",
                "severity_type": "critical",
                "route_timing": "Route: Oral • QHS (Every Bedtime)",
                "badges": ["Beers PIM Alert", "DDI w/ Furosemide"],
                "warning": "Metabolite accumulation risk with GFR < 30 mL/min",
                "is_monitored": True
            },
            {
                "id": "med-2",
                "name": "Furosemide 40 mg PO",
                "generic_name": "furosemide",
                "priority_badge": "FRID Priority 2",
                "severity_type": "warning",
                "route_timing": "Route: Oral • QAM (Every Morning)",
                "badges": ["Loop Diuretic", "Volume Depletion / Orthostasis"],
                "warning": "Last dose: 08:00 AM • Indication: CHF fluid management",
                "is_monitored": True
            },
            {
                "id": "med-3",
                "name": "Diphenhydramine 25 mg PO",
                "generic_name": "diphenhydramine",
                "priority_badge": "ACB High (+3)",
                "severity_type": "danger",
                "route_timing": "Route: Oral • PRN QHS (Nightly Insomnia)",
                "badges": ["High Delirium Hazard", "Anticholinergic Toxicity"],
                "warning": "Contraindicated in older adults with mild cognitive impairment",
                "is_monitored": True
            },
            {
                "id": "med-4",
                "name": "Metoprolol Succinate 50 mg",
                "generic_name": "metoprolol",
                "priority_badge": "Monitored",
                "severity_type": "info",
                "route_timing": "Route: Oral • QD (Daily)",
                "badges": ["Beta-1 Selective", "Postural Bradycardia Check"],
                "warning": None,
                "is_monitored": True
            }
        ],
        "chronic_stable_medications": [
            "Atorvastatin 20 mg PO QD",
            "Omeprazole 20 mg PO QD",
            "Acetaminophen 650 mg PO Q8H PRN",
            "Lisinopril 5 mg PO QD",
            "Aspirin 81 mg PO QD",
            "Multivitamin 1 tab PO QD",
            "Polyethylene Glycol 17g PO QD PRN",
            "Cyanocobalamin (B12) 1000 mcg PO QD",
            "Artificial Tears 1 gtt OU QID PRN",
            "Cholecalciferol (Vit D3) 1000 IU PO QD"
        ],
        "deprescribing_plans": [
            {
                "id": "plan_a",
                "title": "Plan A: Taper Lorazepam by 50%",
                "risk_delta_label": "-22.4% Fall Risk",
                "risk_delta_type": "success",
                "description": "Step down from 1.0 mg to 0.5 mg PO QHS x 3 nights. Initiate nursing sleep protocol (dimming, noise reduction).",
                "impact_metric": "New predicted fall rate: 46.0%",
                "action_button": "Queue Taper Order",
                "is_queued": False
            },
            {
                "id": "plan_b",
                "title": "Plan B: Deprescribe PRN Diphenhydramine",
                "risk_delta_label": "Delirium Prevention",
                "risk_delta_type": "danger",
                "description": "Deprescribe antihistamine order. Substitute Melatonin 1.0 mg PO QHS if needed. Eliminates +3 Anticholinergic Cognitive Burden.",
                "impact_metric": "ACB Score: 4 -> 1",
                "action_button": "Queue Discontinuation",
                "is_queued": False
            },
            {
                "id": "plan_c",
                "title": "Plan C: Schedule Orthostatic BP & Timed Diuresis",
                "risk_delta_label": "Hemodynamics",
                "risk_delta_type": "neutral",
                "description": "Enforce strict 08:00 AM Furosemide administration; prohibit after 14:00. Order nursing orthostatic standing vitals TID.",
                "impact_metric": "Reduces nocturnal bed transfers",
                "action_button": "Queue Protocol",
                "is_queued": False
            }
        ]
    },
    "994202": {
        "hadm_id": 994202,
        "mrn": "#994202",
        "name": "Margaret Davis",
        "age": 79,
        "gender": "FEMALE",
        "los_days": 2,
        "code_status": "Full Code",
        "ward": "Geriatric Ward 4B",
        "bed": "Bed 402B",
        "attending": "Dr. Sarah Chen, MD",
        "admission_date": "2026-04-16",
        "acuity_tier": "High",
        "risk_percentage": 44.2,
        "ward_baseline_pct": 18.2,
        "elevation_multiplier": "2.43x",
        "model_confidence": "91.2%",
        "model_name": "Gradient Boosted Survival Tree • AUROC 0.89",
        "renal_clearance": {"creatinine": 1.35, "creatinine_unit": "mg/dL", "egfr": 46, "stage": "CKD 3a", "crcl": 42, "crcl_unit": "mL/min"},
        "anthropometry": {"weight_kg": 64.0, "bmi": 23.2},
        "postural_hemodynamics": {"supine_bp": "126/80", "standing_bp": "114/72", "drop_mmhg": -12, "heart_rate": 72, "status": "Mild Postural Drop"}
    },
    "994203": {
        "hadm_id": 994203,
        "mrn": "#994203",
        "name": "Arthur Pendelton",
        "age": 86,
        "gender": "MALE",
        "los_days": 6,
        "code_status": "DNR/DNI",
        "ward": "Geriatric Ward 4B",
        "bed": "Bed 405A",
        "attending": "Dr. Sarah Chen, MD",
        "admission_date": "2026-04-12",
        "acuity_tier": "Critical",
        "risk_percentage": 62.1,
        "ward_baseline_pct": 18.2,
        "elevation_multiplier": "3.41x",
        "model_confidence": "95.0%",
        "model_name": "Gradient Boosted Survival Tree • AUROC 0.89",
        "renal_clearance": {"creatinine": 2.10, "creatinine_unit": "mg/dL", "egfr": 26, "stage": "CKD 4", "crcl": 22, "crcl_unit": "mL/min"},
        "anthropometry": {"weight_kg": 80.1, "bmi": 26.5},
        "postural_hemodynamics": {"supine_bp": "110/68", "standing_bp": "90/58", "drop_mmhg": -20, "heart_rate": 60, "status": "Severe Orthostatic Hypotension"}
    },
    "994204": {
        "hadm_id": 994204,
        "mrn": "#994204",
        "name": "Eleanor Vance",
        "age": 76,
        "gender": "FEMALE",
        "los_days": 1,
        "code_status": "Full Code",
        "ward": "Geriatric Ward 4B",
        "bed": "Bed 408A",
        "attending": "Dr. Sarah Chen, MD",
        "admission_date": "2026-04-17",
        "acuity_tier": "Moderate",
        "risk_percentage": 22.8,
        "ward_baseline_pct": 18.2,
        "elevation_multiplier": "1.25x",
        "model_confidence": "89.4%",
        "model_name": "Gradient Boosted Survival Tree • AUROC 0.89",
        "renal_clearance": {"creatinine": 0.95, "creatinine_unit": "mg/dL", "egfr": 68, "stage": "CKD 2", "crcl": 62, "crcl_unit": "mL/min"},
        "anthropometry": {"weight_kg": 58.5, "bmi": 22.0},
        "postural_hemodynamics": {"supine_bp": "130/82", "standing_bp": "125/78", "drop_mmhg": -5, "heart_rate": 70, "status": "Normal Postural Reflex"}
    },
    "994205": {
        "hadm_id": 994205,
        "mrn": "#994205",
        "name": "Harold Finch",
        "age": 81,
        "gender": "MALE",
        "los_days": 3,
        "code_status": "Full Code",
        "ward": "Geriatric Ward 4B",
        "bed": "Bed 410B",
        "attending": "Dr. Sarah Chen, MD",
        "admission_date": "2026-04-15",
        "acuity_tier": "Low",
        "risk_percentage": 8.5,
        "ward_baseline_pct": 18.2,
        "elevation_multiplier": "0.47x",
        "model_confidence": "96.1%",
        "model_name": "Gradient Boosted Survival Tree • AUROC 0.89",
        "renal_clearance": {"creatinine": 0.85, "creatinine_unit": "mg/dL", "egfr": 79, "stage": "Normal", "crcl": 74, "crcl_unit": "mL/min"},
        "anthropometry": {"weight_kg": 75.0, "bmi": 24.5},
        "postural_hemodynamics": {"supine_bp": "122/78", "standing_bp": "120/76", "drop_mmhg": -2, "heart_rate": 68, "status": "Normal Postural Reflex"}
    }
}

# Longitudinal Trajectory for Robert Miller
TRAJECTORY_DATA: Dict[str, Any] = {
    "patient_id": "994201",
    "timeline_range": "May 2023 - Apr 2024 (12 Months)",
    "months": ["M1 (May '23)", "M2 (Jun '23)", "M3 (Jul '23)", "M4 (Aug '23)", "M5 (Sep '23)", "M6 (Oct '23)", "M7 (Nov '23)", "M8 (Dec '23)", "M9 (Jan '24)", "M10 (Feb '24)", "M11 (Mar '24)", "M12 (Apr '24 Now)"],
    "clinical_events": [
        {
            "month_idx": 7,
            "title": "Dec 14 (M8): Mechanical Fall (ED)",
            "subtitle": "Sutured lac, # rule-out",
            "type": "fall",
            "tag": "Fall #1"
        },
        {
            "month_idx": 10,
            "title": "Mar 02 (M11): Bathroom Syncope",
            "subtitle": "Postural drop -22 mmHg",
            "type": "syncope",
            "tag": "Fall #2"
        },
        {
            "month_idx": 11,
            "title": "Apr 18: Ward 4B SMR",
            "subtitle": "Current Inpatient Admission",
            "type": "current",
            "tag": "Active"
        }
    ],
    "prescription_swimlanes": [
        {
            "drug_name": "Lorazepam PO",
            "category": "Benzodiazepine (Sedative)",
            "badge": "BEERS",
            "segments": [
                {"start": 0, "end": 4, "dose": "0.5 mg QHS (Insomnia)", "type": "stable"},
                {"start": 4, "end": 11, "dose": "1.0 mg QHS (Dose Doubled by PCP)", "type": "titrated_up", "alert": "PIM Cascade Lead"}
            ]
        },
        {
            "drug_name": "Furosemide PO",
            "category": "Loop Diuretic",
            "badge": "M7 START",
            "segments": [
                {"start": 6, "end": 11, "dose": "40 mg QAM (HF Peripheral Edema)", "type": "cascade_reactive", "alert": "Volume Depletion"}
            ]
        },
        {
            "drug_name": "Diphenhydramine OTC",
            "category": "Antihistamine (H1)",
            "badge": "ACB +3",
            "segments": [
                {"start": 3, "end": 4, "dose": "25mg", "type": "intermittent"},
                {"start": 5, "end": 6, "dose": "25mg", "type": "intermittent"},
                {"start": 8, "end": 9, "dose": "25mg", "type": "intermittent"},
                {"start": 9, "end": 11, "dose": "25 mg PRN OTC (Sleep Aid)", "type": "titrated_up", "alert": "DELIRIUM RISK"}
            ]
        },
        {
            "drug_name": "Hydralazine PO",
            "category": "Vasodilator (Reactive)",
            "badge": "CASCADE 4th",
            "segments": [
                {"start": 7, "end": 11, "dose": "25 mg TID (Reactive for Diuretic BP Fluctuations)", "type": "cascade_reactive", "alert": "Cascade Step 4"}
            ]
        }
    ],
    "renal_biomarkers": {
        "egfr_curve": [78, 76, 75, 74, 68, 62, 45, 38, 36, 34, 32, 31],
        "creatinine_curve": [0.90, 0.92, 0.95, 0.98, 1.10, 1.25, 1.50, 1.65, 1.68, 1.72, 1.76, 1.80],
        "ckd_3b_threshold_egfr": 45,
        "acute_event_callout": {
            "month": "M7 - M8",
            "title": "Acute eGFR Drop (-27 mL/min)",
            "text": "Rapid clearance decline follows Furosemide initiation + Lorazepam titration. Creatinine surges 1.2 -> 1.5 mg/dL."
        }
    },
    "fall_risk_curve": [
        {"month": "M1", "risk": 12.4},
        {"month": "M2", "risk": 13.1},
        {"month": "M3", "risk": 14.0},
        {"month": "M4", "risk": 15.2},
        {"month": "M5", "risk": 24.0},
        {"month": "M6", "risk": 28.5},
        {"month": "M7", "risk": 38.0},
        {"month": "M8", "risk": 49.5, "event": "Fall #1"},
        {"month": "M9", "risk": 52.0},
        {"month": "M10", "risk": 55.4},
        {"month": "M11", "risk": 63.8, "event": "Bathroom Syncope"},
        {"month": "M12", "risk": 68.4, "event": "Peak"}
    ],
    "prescribing_cascade_steps": [
        {
            "step": 1,
            "title": "Lorazepam Titration (1.0 mg QHS)",
            "timing": "MONTH 5",
            "description": "Triggered daytime motor ataxia, somnolence & reduced clearance"
        },
        {
            "step": 2,
            "title": "Furosemide Added (40 mg QAM)",
            "timing": "MONTH 7",
            "description": "Orthostatic dehydration + prerenal azotemia"
        },
        {
            "step": 3,
            "title": "Renal Function Collapse (eGFR 78 -> 31 mL/min)",
            "timing": "M7 - M8",
            "description": "Drug accumulation of sedative metabolites + orthostatic hypotension"
        },
        {
            "step": 4,
            "title": "Hydralazine 25mg TID + 2 Acute Falls",
            "timing": "M8 & M11",
            "description": "Reactive prescribing for fluctuating BP leads to ED Visit and Bathroom Syncope"
        }
    ],
    "prescribing_cascade_summary": (
        "Trajectory Etiology: The patient's fall probability accelerated from 12% to 68.4% primarily following "
        "the addition of Furosemide to escalated Lorazepam. Prerenal dehydration precipitated acute drug accumulation "
        "and orthostatic instability."
    ),
    "targeted_deprescribing_plan": [
        {
            "priority": "URGENT",
            "title": "De-escalate Lorazepam to 0.5 mg",
            "description": "Reverse Month 5 titration; transition to non-pharmacological sleep hygiene protocol."
        },
        {
            "priority": "MED REVIEW",
            "title": "Re-evaluate Furosemide 40 mg",
            "description": "Check dry weight & lower extremity edema. Consider stepping down to 20 mg PO with daily weights to restore renal perfusion."
        },
        {
            "priority": "STOPP",
            "title": "Eliminate OTC Diphenhydramine",
            "description": "Eliminate high-risk anticholinergic burden (ACB +3) to protect cognitive reserve and mitigate acute delirium."
        }
    ]
}

# Clinical Knowledge Guardrails & DDI Registry Rules
CLINICAL_RULES_DATABASE: List[Dict[str, Any]] = [
    {
        "id": "STOPP-K.1",
        "code": "STOPP-K.1",
        "category": "FRID",
        "badge_type": "Hard Safety Gate",
        "title": "STOPP v3 Section K: Fall-Risk Increasing Drugs (FRIDs)",
        "subtitle": "Mandates avoidance of sedative hypnotics and high-potency benzodiazepines in patients >=65 with prior documented falls.",
        "tags": ["Benzodiazepines", "Z-Drugs", "Loop Diuretics"],
        "sensitivity": "94.8%",
        "ward_triggers_30d": 34,
        "last_audit": "Jan 2026",
        "full_breadcrumb": "KNOWLEDGE BASE > STOPP/START V3 > SECTION K (FALLS) > RULE #STOPP-K.1",
        "rule_heading": "STOPP v3 Section K: Benzodiazepines and Z-Drugs in Patients with History of Falls",
        "rule_id": "CDSS-RULE-FRID-0841",
        "icd10": "R29.6 (Falls)",
        "snomed_ct": "418428997",
        "status": "ACTIVE PRODUCTION GATE",
        "alert_level": "CRITICAL CONTRAINDICATION",
        "biological_etiology": (
            "Positive allosteric modulation of GABAA receptor subunits (specifically α1 and α2) induces "
            "central psychomotor slowing, impairment of righting reflexes, and delayed reactive postural muscle "
            "recruitment. In geriatric patients with reduced neuromuscular reserve and pre-existing subclinical "
            "cerebellar or vestibular deficits, peak serum concentrations precipitate acute gait ataxia. When "
            "co-administered with orthostatic-inducing agents (e.g., loop diuretics, vasodilators), transient "
            "cerebral hypoperfusion exacerbates loss of balance during unassisted nocturnal bed transfers."
        ),
        "etiology_flow": [
            {"step": 1, "title": "RECEPTOR ACTION", "desc": "GABAA Agonism"},
            {"step": 2, "title": "SPINAL REFLEX", "desc": "Delayed Vestibular"},
            {"step": 3, "title": "POSTURAL DEFICIT", "desc": "Center-of-Mass Lag"},
            {"step": 4, "title": "END-POINT HAZARD", "desc": "Severe Fracture / Fall"}
        ],
        "high_priority_interacting_pairs": [
            {
                "primary_drug": "Lorazepam (Benzodiazepine)",
                "interacting_agent": "Furosemide (Loop Diuretic)",
                "severity_weight": 1.00,
                "severity_label": "Major",
                "clinical_consequence": "Orthostatic syncope, volume depletion + psychomotor sedation",
                "action": "Auto-Flag Hard Alert",
                "action_type": "alert"
            },
            {
                "primary_drug": "Zolpidem (Non-BZD Z-Drug)",
                "interacting_agent": "Diphenhydramine (Antihistamine / ACB +3)",
                "severity_weight": 0.95,
                "severity_label": "Major",
                "clinical_consequence": "Severe additive anticholinergic delirium + nocturnal confusion",
                "action": "Auto-Flag Hard Alert",
                "action_type": "alert"
            },
            {
                "primary_drug": "Lorazepam (Benzodiazepine)",
                "interacting_agent": "Hydralazine (Vasodilator)",
                "severity_weight": 0.66,
                "severity_label": "Moderate",
                "clinical_consequence": "Precipitous orthostatic BP drop, baroreceptor suppression",
                "action": "Recommended Taper",
                "action_type": "warning"
            },
            {
                "primary_drug": "Gabapentin (Gabapentinoid)",
                "interacting_agent": "Oxycodone (Opioid Analgesic)",
                "severity_weight": 1.00,
                "severity_label": "Critical",
                "clinical_consequence": "Respiratory depression, profound sedation, severe ataxia",
                "action": "Hard CPOE Block",
                "action_type": "danger"
            }
        ],
        "citations": [
            {
                "authors": "O'Mahony D, et al.",
                "title": "STOPP/START criteria for potentially inappropriate prescribing in older people: version 3.",
                "journal": "Eur Geriatr Med. 2023;14(4):625-632.",
                "pmcid": "PMC99281"
            },
            {
                "authors": "2023 AGS Beers Criteria Update Expert Panel.",
                "title": "American Geriatrics Society 2023 updated AGS Beers Criteria for potentially inappropriate medication use in older adults.",
                "journal": "J Am Geriatr Soc. 2023;71(7):2052-2081. Table 2 (Sedative-Hypnotics).",
                "doi": "10.1111/jgs.18372"
            },
            {
                "authors": "Bickel H, et al.",
                "title": "Additive fall risk of loop diuretics and psychotropic polypharmacy: Prospective hospital cohort.",
                "journal": "Lancet Healthy Longev. 2024.",
                "dossier": "SaMD Dossier #V4-22"
            }
        ]
    },
    {
        "id": "BEERS-2023.T2",
        "code": "BEERS-2023.T2",
        "category": "FRID",
        "badge_type": "PIM High Priority",
        "title": "2023 AGS Beers Criteria: Benzodiazepine Avoidance",
        "subtitle": "Older adults have increased sensitivity to benzodiazepines and decreased metabolism of long-acting agents; increased risk of cognitive impairment, delirium, falls, and motor vehicle crashes.",
        "tags": ["Lorazepam", "Diazepam", "Clonazepam"],
        "sensitivity": "96.2%",
        "ward_triggers_30d": 42,
        "last_audit": "Feb 2026",
        "full_breadcrumb": "KNOWLEDGE BASE > AGS BEERS 2023 > TABLE 2 > PIM-BZD",
        "rule_heading": "2023 AGS Beers Criteria Table 2: Avoidance of Benzodiazepines in Inpatients >=65",
        "rule_id": "CDSS-RULE-BEERS-0112",
        "icd10": "R29.6",
        "snomed_ct": "418428997",
        "status": "ACTIVE PRODUCTION GATE",
        "alert_level": "POTENTIALLY INAPPROPRIATE MEDICATION (PIM)",
        "biological_etiology": (
            "Age-related pharmacodynamic alterations increase central receptor sensitivity to benzodiazepines. "
            "Hepatic oxidation via CYP3A4 is reduced, extending half-lives and metabolite accumulation, leading to "
            "protracted daytime sedation and impairment of compensatory stepping responses during sudden postural perturbances."
        ),
        "etiology_flow": [
            {"step": 1, "title": "HEPATIC CLEARANCE", "desc": "Reduced CYP3A4 Oxidation"},
            {"step": 2, "title": "PLASMA ACCUMULATION", "desc": "Sedative Active Metabolites"},
            {"step": 3, "title": "NEURO-MOTOR", "desc": "Impaired Compensatory Stepping"},
            {"step": 4, "title": "OUTCOME", "desc": "Unassisted Fall / Hip Fracture"}
        ],
        "high_priority_interacting_pairs": [
            {
                "primary_drug": "Lorazepam",
                "interacting_agent": "Furosemide",
                "severity_weight": 1.00,
                "severity_label": "Major",
                "clinical_consequence": "Acute postural hypotension with reduced corrective motor reflexes",
                "action": "Auto-Flag Hard Alert",
                "action_type": "alert"
            }
        ],
        "citations": [
            {
                "authors": "2023 AGS Beers Criteria Update Expert Panel.",
                "title": "American Geriatrics Society 2023 updated AGS Beers Criteria.",
                "journal": "J Am Geriatr Soc. 2023.",
                "doi": "10.1111/jgs.18372"
            }
        ]
    },
    {
        "id": "DDINTER-MAJ.08",
        "code": "DDINTER-MAJ.08",
        "category": "DDI",
        "badge_type": "Pharmacodynamic Synergism",
        "title": "DDInter Major: CNS Depressants + Antihypertensives",
        "subtitle": "Synergistic vasodilatory and sedative impairment leading to impaired baroreflex response and postprandial / nocturnal orthostatic collapse.",
        "tags": ["Furosemide", "Lorazepam", "Hydralazine"],
        "sensitivity": "92.1%",
        "ward_triggers_30d": 89,
        "last_audit": "Mar 2026",
        "full_breadcrumb": "KNOWLEDGE BASE > DDINTER CLINICAL > PHARMACODYNAMICS > RULE #DDI-08",
        "rule_heading": "DDInter Major: Central Sedatives Combined with Potent Volume Depletors",
        "rule_id": "CDSS-RULE-DDI-0419",
        "icd10": "I95.1 (Orthostatic Hypotension)",
        "snomed_ct": "2858002",
        "status": "ACTIVE PRODUCTION GATE",
        "alert_level": "HIGH PHARMACODYNAMIC SYNERGISM",
        "biological_etiology": (
            "Concurrent administration of loop diuretics (Furosemide) reduces circulating plasma volume and suppresses "
            "cardiac preload. Co-administered central depressants (Lorazepam) blunt sympathetic vasomotor outflow and "
            "baroreceptor tachycardic compensation, producing precipitous cerebral hypoperfusion upon standing."
        ),
        "etiology_flow": [
            {"step": 1, "title": "DIURETIC ACTION", "desc": "Volume Depletion & Low Preload"},
            {"step": 2, "title": "BAROREFLEX", "desc": "Blunted Sympathetic Response"},
            {"step": 3, "title": "CEREBRAL PERFUSION", "desc": "Acute MAP Nadir (<65 mmHg)"},
            {"step": 4, "title": "SYNCOPE", "desc": "Transient Loss of Consciousness"}
        ],
        "high_priority_interacting_pairs": [
            {
                "primary_drug": "Furosemide",
                "interacting_agent": "Hydralazine",
                "severity_weight": 0.75,
                "severity_label": "Major",
                "clinical_consequence": "Severe compounding of orthostatic blood pressure drops",
                "action": "Recommended Taper",
                "action_type": "warning"
            }
        ],
        "citations": [
            {
                "authors": "DDInter Research Consortium.",
                "title": "Clinical drug interaction knowledgebase for adverse outcome prediction.",
                "journal": "Nucleic Acids Res. 2022.",
                "pmcid": "PMC8728219"
            }
        ]
    },
    {
        "id": "RENAL-CKD.3B",
        "code": "RENAL-CKD.3B",
        "category": "Renal",
        "badge_type": "Pharmacokinetic Guardrail",
        "title": "Renal Adjustment: Serum Creatinine > 1.5 mg/dL",
        "subtitle": "Automated dose-taper alerts when eGFR drops below 45 mL/min/1.73m² (CKD Stage 3b) for renally cleared neuro-active medications.",
        "tags": ["Gabapentin", "Digoxin", "Levetiracetam"],
        "sensitivity": "98.5%",
        "ward_triggers_30d": 56,
        "last_audit": "Apr 2026",
        "full_breadcrumb": "KNOWLEDGE BASE > RENAL DOSING > KDIGO 2024 > CKD-STAGE-3B",
        "rule_heading": "KDIGO 2024 Stage 3b Renal Guardrail for Geriatric Inpatients",
        "rule_id": "CDSS-RULE-RENAL-0231",
        "icd10": "N18.32 (CKD Stage 3b)",
        "snomed_ct": "433144002",
        "status": "ACTIVE PRODUCTION GATE",
        "alert_level": "RENAL CLEARANCE HAZARD",
        "biological_etiology": (
            "Glomerular filtration rates below 45 mL/min dramatically retard the elimination kinetics of polar drug "
            "metabolites. Sedatives and gabapentinoids accumulate exponentially in systemic circulation, causing profound "
            "lethargy, delayed arousal, and severe nocturnal myoclonus or ataxia."
        ),
        "etiology_flow": [
            {"step": 1, "title": "GFR DECLINE", "desc": "eGFR < 45 mL/min"},
            {"step": 2, "title": "METABOLITE ACCUMULATION", "desc": "Extended Elimination Half-Life"},
            {"step": 3, "title": "CNS EXPOSURE", "desc": "Compounded Sedation & Ataxia"},
            {"step": 4, "title": "TOXICITY", "desc": "Over-Sedation & Nocturnal Falls"}
        ],
        "high_priority_interacting_pairs": [
            {
                "primary_drug": "Gabapentin",
                "interacting_agent": "Renal Impairment (CrCl < 30)",
                "severity_weight": 0.90,
                "severity_label": "Major",
                "clinical_consequence": "Profound neurotoxicity and sedation if dose unadjusted",
                "action": "Auto-Flag Hard Alert",
                "action_type": "alert"
            }
        ],
        "citations": [
            {
                "authors": "KDIGO Clinical Practice Guideline Working Group.",
                "title": "Kidney Disease: Improving Global Outcomes (KDIGO) 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease.",
                "journal": "Kidney Int. 2024;105(4S):S117-S314.",
                "doi": "10.1016/j.kint.2023.10.018"
            }
        ]
    }
]

def _timestamp() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")


def _census_patient_detail(patient: Dict[str, Any], drugs=None) -> Dict[str, Any]:
    """Expose only this patient's available data, without inheriting demo plans."""
    detail = deepcopy(patient)
    detail["renal_clearance"] = {
        "creatinine": patient.get("creatinine"),
        "creatinine_unit": "mg/dL",
        "egfr": patient.get("renal_egfr"),
        "stage": patient.get("renal_stage"),
    }
    detail["active_medications"] = [
        {"id": f"med-{index}", "name": drug, "generic_name": drug, "is_monitored": False}
        for index, drug in enumerate(drugs if drugs is not None else patient.get("high_risk_meds", []), 1)
    ]
    detail["deprescribing_plans"] = []
    detail["shap_attributions"] = []
    detail["guidelines"] = []
    detail["clinical_rationale"] = "\n".join(patient.get("clinical_notes", []))
    return detail


def _find_patient(patient_id: str) -> Dict[str, Any]:
    """Resolve a real patient ID or MRN. Caller holds WARD_STATE_LOCK."""
    patient = PATIENTS_DATABASE.get(patient_id)
    if patient is not None:
        return patient
    patient = next((p for p in PATIENTS_DATABASE.values() if p.get("mrn") == patient_id), None)
    if patient is not None:
        return patient
    census_patient = next(
        (p for p in FULL_WARD_CENSUS if str(p["hadm_id"]) == patient_id or p.get("mrn") == patient_id),
        None,
    )
    if census_patient is None:
        raise HTTPException(status_code=404, detail="Patient not found.")
    return _census_patient_detail(census_patient)


def _register_admission(patient: Dict[str, Any], drugs: List[str], audit: Dict[str, Any]):
    """Publish the admission, detail profile and audit record together."""
    with WARD_STATE_LOCK:
        mrn = patient.get("mrn")
        if mrn and any(p.get("mrn") == mrn for p in [*FULL_WARD_CENSUS, *PATIENTS_DATABASE.values()]):
            raise HTTPException(status_code=409, detail="An active patient already uses this MRN.")
        existing_ids = [int(p["hadm_id"]) for p in [*FULL_WARD_CENSUS, *PATIENTS_DATABASE.values()]]
        hadm_id = max([994299, *existing_ids]) + 1
        patient["hadm_id"] = hadm_id
        patient["mrn"] = mrn or f"#MRN-{hadm_id}"
        detail = _census_patient_detail(patient, drugs)
        patient["active_medications"] = deepcopy(detail["active_medications"])
        audit.update({
            "id": f"AUD-{uuid.uuid4()}",
            "timestamp": _timestamp(),
            "patient_id": str(hadm_id),
            "patient_name": patient["name"],
        })
        PATIENTS_DATABASE[str(hadm_id)] = detail
        FULL_WARD_CENSUS.insert(0, deepcopy(patient))
        AUDIT_LOG_STORE.insert(0, audit)
        return deepcopy(patient), audit["id"]


def _prediction_summary(prediction: Dict[str, Any]):
    try:
        risk = float(prediction["predicted_risk_pct"])
        tier = prediction["risk_tier"]
    except (KeyError, TypeError, ValueError) as exc:
        raise RuntimeError("Invalid inference output.") from exc
    if not math.isfinite(risk) or not 0 <= risk <= 100 or tier not in {"Critical", "High", "Moderate", "Low"}:
        raise RuntimeError("Invalid inference output.")
    return risk, tier


def _admission_regimen(prediction: Dict[str, Any], supplied_drugs: List[str]) -> List[str]:
    medications = prediction.get("active_medications", supplied_drugs)
    if not isinstance(medications, list) or not medications or any(not isinstance(drug, str) or not drug.strip() for drug in medications):
        raise RuntimeError("Invalid inference medication output.")
    return list(dict.fromkeys(drug.strip().lower() for drug in medications))


def _high_risk_medications(drugs: List[str], creatinine: float) -> List[str]:
    return [
        drug.capitalize() for drug in drugs
        if audit_patient_medications([drug], creatinine).get("has_pim_alert")
    ]

# ----------------- API ENDPOINTS -----------------
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy" if gnn_engine is not None else "degraded",
        "system": "GeriSafe CDSS API",
        "version": "2.4.0",
        "gnn_model_loaded": gnn_engine is not None,
        "device": str(gnn_engine.device) if gnn_engine else "none",
        "timestamp": _timestamp()
    }

@app.get("/api/ward/kpis")
def get_ward_kpis():
    """Returns ward-level aggregate metrics for Inpatient Ward 4B."""
    return get_ward_kpi_metrics()

@app.get("/api/ward/distribution")
def get_ward_distribution():
    """Returns patient counts partitioned across calibrated risk stratums."""
    return get_ward_risk_distribution()

@app.get("/api/fhir/export")
def export_fhir_bundle(patient_id: Optional[str] = None):
    """Export the selected patient, or every patient in the ward census."""
    with WARD_STATE_LOCK:
        try:
            if patient_id is not None:
                return generate_fhir_r4_bundle(patient_id, patient=deepcopy(_find_patient(patient_id)))
            bundle = {
                "resourceType": "Bundle",
                "id": str(uuid.uuid4()),
                "type": "collection",
                "timestamp": _timestamp(),
                "entry": [],
            }
            for patient in FULL_WARD_CENSUS:
                patient_bundle = generate_fhir_r4_bundle(
                    str(patient["hadm_id"]), patient=deepcopy(_find_patient(str(patient["hadm_id"])))
                )
                bundle["entry"].extend(patient_bundle["entry"])
            return bundle
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

@app.post("/api/admissions/ingest")
def ingest_admission(req: IngestAdmissionRequest):
    """Ingests a new inpatient admission, runs live GNN risk inference, and adds to census."""
    if gnn_engine is None:
        raise HTTPException(status_code=503, detail="GNN Engine is currently unavailable.")
    try:
        pred = gnn_engine.predict(
            drug_list=req.drugs,
            age=req.age,
            creatinine_min=max(0.01, req.creatinine - 0.2),
            creatinine_max=req.creatinine + 0.2,
            creatinine_avg=req.creatinine,
        )
        risk_val, tier = _prediction_summary(pred)
        regimen = _admission_regimen(pred, req.drugs)
        high_risk_meds = _high_risk_medications(regimen, req.creatinine)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Admission inference failed (%s).", type(exc).__name__)
        raise HTTPException(status_code=500, detail="Admission inference failed.") from exc
    
    new_patient = {
        "mrn": req.mrn,
        "name": req.name,
        "age": int(req.age),
        "gender": req.gender.upper(),
        "bed": req.bed,
        "ward": "Geriatric Ward 4B",
        "los_days": 1,
        "code_status": "Full Code",
        "acuity_tier": tier,
        "risk_percentage": round(risk_val, 1),
        "trend": "up" if tier in ["Critical", "High"] else "neutral",
        "drug_count": len(regimen),
        "prn_count": 0,
        "creatinine": req.creatinine,
        "renal_egfr": pred.get("calculated_egfr"),
        "renal_stage": None,
        "blood_pressure": None,
        "bp_drop": None,
        "high_risk_meds": high_risk_meds,
        "clinical_notes": [
            f"Admitted to Ward 4B: GNN fall hazard estimated at {round(risk_val, 1)}%",
            "Automated clinical knowledge guardrails scan active"
        ],
        "reviewer_info": "New Admission • Ingestion Complete"
    }
    
    audit_entry = {
        "action": "New Inpatient Ingested & GNN Evaluated",
        "actor": "System Admission Stream",
        "details": f"Ingested {req.name} ({req.bed}) with {len(regimen)} medications. Calculated acute risk: {round(risk_val, 1)}%.",
        "status": "Admission Active"
    }
    new_patient, audit_id = _register_admission(new_patient, regimen, audit_entry)
    
    return {
        "success": True,
        "patient": new_patient,
        "audit_id": audit_id
    }

@app.get("/api/telemetry/stream")
async def telemetry_stream():
    """Server-Sent Events (SSE) endpoint providing live ward telemetry pulses."""
    async def event_generator():
        tick = 0
        while True:
            await asyncio.sleep(3)
            tick += 1
            with WARD_STATE_LOCK:
                active_patients = len(FULL_WARD_CENSUS)
                high_risk_count = sum(p["acuity_tier"] in {"Critical", "High"} for p in FULL_WARD_CENSUS)
            payload = {
                "event": "telemetry_pulse",
                "timestamp": _timestamp(),
                "sync_seconds_ago": 0,
                "ward_id": "ACUTE CARE UNIT 4B",
                "active_patients": active_patients,
                "high_risk_count": high_risk_count,
                "alert": "Patient #MRN-88421 bed sensor armed" if tick % 6 == 0 else None
            }
            yield f"data: {json.dumps(payload)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.get("/api/patients")
def get_inpatient_census(
    sort_by: Optional[str] = Query(default="default"),
    page: int = Query(default=1, ge=1),
    limit: Optional[int] = Query(default=None, ge=1)
):
    """Returns the full 48-patient census for Geriatric Ward 4B."""
    with WARD_STATE_LOCK:
        census = deepcopy(FULL_WARD_CENSUS)
    
    # Sorting
    if sort_by == "risk_desc":
        census.sort(key=lambda p: p["risk_percentage"], reverse=True)
    elif sort_by == "risk_asc":
        census.sort(key=lambda p: p["risk_percentage"])
    elif sort_by == "name":
        census.sort(key=lambda p: p["name"])
    elif sort_by == "bed":
        census.sort(key=lambda p: p["bed"])
    elif sort_by == "egfr":
        census.sort(key=lambda p: (p.get("renal_egfr") is None, p.get("renal_egfr") or 0))
    elif sort_by == "drugs":
        census.sort(key=lambda p: p.get("drug_count", 0), reverse=True)
        
    if limit is not None and limit > 0:
        start_idx = (page - 1) * limit
        return census[start_idx : start_idx + limit]
        
    return census


@app.get("/api/patient/{patient_id}")
def get_patient_detail(patient_id: str):
    """Returns detailed clinical profile, GNN SHAP attributions, circadian profile, and active meds."""
    with WARD_STATE_LOCK:
        return deepcopy(_find_patient(patient_id))

@app.get("/api/trajectory/{patient_id}")
def get_patient_trajectory(patient_id: str):
    """Returns 12-month multi-track longitudinal data, Gantt swimlanes, and prescribing cascade discovery."""
    with WARD_STATE_LOCK:
        patient = _find_patient(patient_id)
        if str(patient["hadm_id"]) != TRAJECTORY_DATA["patient_id"]:
            raise HTTPException(status_code=404, detail="Trajectory data is unavailable for this patient.")
        return deepcopy(TRAJECTORY_DATA)

@app.get("/api/rules")
def get_clinical_rules():
    """Returns codified Beers, STOPP, DDInter, and Renal rules for the Knowledge Registry."""
    return {
        "version": "2026.3",
        "audited_date": "14 Apr 2026",
        "samd_level": "SaMD Level IIb",
        "total_rules": 142,
        "rules": CLINICAL_RULES_DATABASE
    }

@app.get("/api/drugs/search")
def search_drug_vocabulary(q: str = "", limit: int = Query(default=25, ge=1, le=100)):
    """Searches the 5,034-drug GNN vocabulary with substring matching."""
    if gnn_engine is None:
        return {"query": q, "count": 0, "results": []}
    
    query = q.lower().strip()
    results = []
    if not query:
        results = gnn_engine.get_curated_med_list()[:limit]
    else:
        # Priority 1: Match in curated high-priority meds
        curated = gnn_engine.get_curated_med_list()
        for d in curated:
            if query in d.lower() and d not in results:
                results.append(d)
        
        # Priority 2: Matches in full 5,034 vocab
        for d in gnn_engine.drug_to_idx.keys():
            if query in d.lower():
                clean_d = d.replace("*nf*", "").replace("*nf", "").strip()
                if clean_d and clean_d not in results:
                    results.append(clean_d)
            if len(results) >= limit:
                break
                
    results = results[:limit]
    return {
        "query": q,
        "count": len(results),
        "results": results
    }

@app.post("/api/predict-gnn")
def run_gnn_prediction(req: PredictGNNRequest):
    """Runs live PyTorch Geometric GNN inference on the drug regimen."""
    if gnn_engine is None:
        raise HTTPException(status_code=503, detail="GNN Engine is currently unavailable.")
    
    try:
        result = gnn_engine.predict(
            drug_list=req.drugs,
            age=req.age,
            creatinine_min=req.creatinine_min,
            creatinine_max=req.creatinine_max,
            creatinine_avg=req.creatinine_avg
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Prediction failed (%s).", type(exc).__name__)
        raise HTTPException(status_code=500, detail="Inference failed.") from exc

@app.post("/api/simulate-deprescribing")
def run_deprescribing_simulation(req: SimulateDeprescribeRequest):
    """Simulates GNN risk delta after removing a targeted drug."""
    if gnn_engine is None:
        raise HTTPException(status_code=503, detail="GNN Engine is currently unavailable.")
    
    try:
        result = gnn_engine.simulate_deprescribing(
            drug_list=req.drugs,
            drug_to_remove=req.drug_to_remove,
            age=req.age,
            creatinine_min=req.creatinine_min,
            creatinine_max=req.creatinine_max,
            creatinine_avg=req.creatinine_avg
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Simulation failed (%s).", type(exc).__name__)
        raise HTTPException(status_code=500, detail="Simulation failed.") from exc

@app.post("/api/medgemma/pipeline")
def run_medgemma_pipeline(req: MedGemmaPipelineRequest):
    """Structure admission inputs, run inference, then request an explanation."""
    if gnn_engine is None:
        raise HTTPException(status_code=503, detail="GNN Engine is currently unavailable.")

    cr_min, cr_max, cr_avg = req.creatinine_range()
    stage_1_input = {
        "name": req.name,
        "mrn": req.mrn,
        "age": req.age,
        "gender": req.gender,
        "bed": req.bed,
        "creatinine": req.creatinine,
        "creatinine_min": cr_min,
        "creatinine_max": cr_max,
        "creatinine_avg": cr_avg,
        "drugs_text": ", ".join(req.drugs_list) if req.drugs_list is not None else req.drugs_text,
    }
    try:
        structured_admission = medgemma_service.structure_patient_admission(stage_1_input)
    except Exception as exc:
        logger.error("Admission structuring failed (%s).", type(exc).__name__)
        raise HTTPException(status_code=500, detail="Admission structuring failed.") from exc

    standardized_drugs = structured_admission.get("standardized_drugs", [])
    if not isinstance(standardized_drugs, list) or not standardized_drugs or any(
        not isinstance(drug, str) or not drug.strip() for drug in standardized_drugs
    ):
        raise HTTPException(status_code=422, detail="Admission structuring did not produce a valid medication list.")

    try:
        prediction = gnn_engine.predict(
            drug_list=standardized_drugs,
            age=req.age,
            creatinine_min=cr_min,
            creatinine_max=cr_max,
            creatinine_avg=cr_avg,
        )
        risk, tier = _prediction_summary(prediction)
        regimen = _admission_regimen(prediction, standardized_drugs)
        high_risk_meds = _high_risk_medications(regimen, req.creatinine)
        interactions = [
            {
                "pair": [interaction["drug_a"].capitalize(), interaction["drug_b"].capitalize()],
                "severity": f"Severity {interaction['severity_weight']}",
                "attention_weight": interaction["attention_weight"],
                "mechanism": interaction["adverse_mechanism"],
            }
            for interaction in prediction.get("attended_interactions", [])
        ]
        gnn_result = {
            "risk_percentage": risk,
            "acuity_tier": tier,
            "relative_risk": prediction.get("relative_risk_multiplier"),
            "raw_gnn_prob": prediction.get("raw_gnn_pct"),
            "w_ddi_burden_score": round(
                sum(item["severity_weight"] for item in prediction.get("attended_interactions", []))
                / max(1, len(regimen)), 2
            ),
            "synergistic_pairs_count": len(interactions),
            "detected_interactions": interactions,
            "top_features": prediction.get("feature_attributions", []),
            "model_confidence": "Unavailable",
            "inference_engine": "Multimodal GATv2 Graph Neural Network",
        }
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Pipeline inference failed (%s).", type(exc).__name__)
        raise HTTPException(status_code=500, detail="Pipeline inference failed.") from exc

    try:
        verification_result = medgemma_service.verify_and_explain(
            structured_data=structured_admission, gnn_result=gnn_result
        )
    except Exception as exc:
        logger.error("Pipeline explanation failed (%s).", type(exc).__name__)
        raise HTTPException(status_code=500, detail="Pipeline explanation failed.") from exc

    patient = None
    audit_id = None
    if req.save_to_census:
        census_entry = {
            "mrn": req.mrn,
            "name": req.name,
            "age": int(req.age),
            "gender": req.gender.upper(),
            "bed": req.bed,
            "ward": "Geriatric Ward 4B",
            "los_days": 1,
            "code_status": "Full Code",
            "acuity_tier": tier,
            "risk_percentage": round(risk, 1),
            "trend": "up" if tier in {"Critical", "High"} else "neutral",
            "drug_count": len(regimen),
            "prn_count": sum(1 for order in structured_admission.get("parsed_orders", []) if order.get("is_prn")),
            "creatinine": req.creatinine,
            "renal_egfr": structured_admission.get("calculated_egfr"),
            "renal_stage": structured_admission.get("ckd_stage"),
            "blood_pressure": None,
            "bp_drop": None,
            "high_risk_meds": high_risk_meds,
            "clinical_notes": [
                f"Admission inference completed: {risk}% fall risk.",
                f"Explanation status: {verification_result.get('verification_status', 'Unavailable')}",
            ],
            "reviewer_info": "Admission Active",
        }
        audit_entry = {
            "action": "Admission Inference & Explanation Complete",
            "actor": "Admission Pipeline",
            "details": f"Ingested {len(regimen)} meds. Calculated risk: {risk}%.",
            "status": "Admission Active",
        }
        patient, audit_id = _register_admission(census_entry, regimen, audit_entry)

    return {
        "success": True,
        "patient_id": str(patient["hadm_id"]) if patient else None,
        "patient": patient,
        "audit_id": audit_id,
        "patient_summary": {
            "name": req.name,
            "mrn": req.mrn,
            "bed": req.bed,
            "age": req.age,
            "gender": req.gender,
            "egfr": structured_admission.get("calculated_egfr"),
            "ckd_stage": structured_admission.get("ckd_stage"),
            "risk_percentage": risk,
            "acuity_tier": tier,
        },
        "pipeline_stages": {
            "stage_1_medgemma_structuring": structured_admission,
            "stage_2_gnn_inference": gnn_result,
            "stage_3_medgemma_verification": verification_result,
        },
    }


@app.post("/api/cpoe/sign")
def sign_cpoe_adjustments(req: SignCPOEOrderRequest):
    """Record plan authorization; risk stays unchanged until treatment is executed."""
    with WARD_STATE_LOCK:
        patient = _find_patient(req.patient_id)
        plans = patient.get("deprescribing_plans", [])
        if not plans:
            raise HTTPException(status_code=409, detail="No deprescribing plans are available for this patient.")
        available_ids = {plan["id"] for plan in plans}
        requested_ids = set(req.action_ids)
        unknown_ids = requested_ids - available_ids - {"all"}
        if unknown_ids:
            raise HTTPException(status_code=400, detail="Unknown deprescribing action IDs.")
        selected = [plan for plan in plans if "all" in requested_ids or plan["id"] in requested_ids]
        unsigned = [plan for plan in selected if not plan.get("is_signed", False)]
        risk = patient["risk_percentage"]
        tier = patient["acuity_tier"]
        signed_plans = [plan["title"] for plan in unsigned]

        if unsigned:
            timestamp = _timestamp()
            audit_id = f"AUD-{uuid.uuid4()}"
            audit_entry = {
                "id": audit_id,
                "timestamp": timestamp,
                "patient_id": str(patient["hadm_id"]),
                "patient_name": patient["name"],
                "action": "CPOE Deprescribing Orders Signed",
                "actor": req.clinician,
                "details": f"Signed adjustments: {', '.join(signed_plans)}. Risk remains {risk}% pending execution and recomputation.",
                "override_reason": req.override_reason,
                "status": "Signed; Pending Execution",
            }
            for plan in unsigned:
                plan.update({
                    "is_queued": True,
                    "is_signed": True,
                    "signed_by": req.clinician,
                    "signed_at": timestamp,
                    "signed_audit_id": audit_id,
                })
            AUDIT_LOG_STORE.insert(0, audit_entry)
        else:
            audit_id = selected[-1].get("signed_audit_id")

        return {
            "success": True,
            "patient_id": str(patient["hadm_id"]),
            "original_risk": risk,
            "new_risk": risk,
            "acuity_tier": tier,
            "signed_actions": signed_plans,
            "audit_id": audit_id,
            "already_signed": not bool(unsigned),
            "message": (
                f"Successfully signed {len(signed_plans)} adjustments. Risk remains unchanged pending execution and recomputation."
                if unsigned else "The selected adjustments have already been signed."
            ),
        }


@app.get("/api/audit-log")
def get_audit_log():
    """Returns a snapshot of the process-local clinical governance audit trail."""
    with WARD_STATE_LOCK:
        return deepcopy(AUDIT_LOG_STORE)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
