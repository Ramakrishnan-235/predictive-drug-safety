import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import torch
import numpy as np

from src.models.fall_risk_model import GeriatricFallPredictor
from src.models.dataset import NUMERICAL_COLS, BINARY_RULE_COLS
from src.explainability.clinical_explainer import MechanisticExplainerEngine

app = FastAPI(
    title="Geriatric Fall Prevention CDSS API",
    description="CDS Hooks compliant decision support service for medication safety in older adults",
    version="1.0.0"
)

# Load explainer engine and model checkpoint
explainer_engine = MechanisticExplainerEngine(checkpoint_path="models/fall_risk_model.pt")

# CDS Hooks Request Schemas
class FHIRAuthorization(BaseModel):
    access_token: Optional[str] = None
    token_type: Optional[str] = "Bearer"

class CDSHookRequest(BaseModel):
    hook: str = Field(..., examples=["patient-view"])
    hookInstance: str = Field(..., examples=["d1b72e5a-7b3b-4171-88f2-8949826f0bc1"])
    context: Dict[str, Any] = Field(..., examples=[{"patientId": "1001", "userId": "Practitioner/502"}])
    prefetch: Optional[Dict[str, Any]] = None

# CDS Hooks Response Schemas
class CDSSuggestion(BaseModel):
    label: str
    uuid: Optional[str] = None

class CDSSource(BaseModel):
    label: str
    url: Optional[str] = None

class CDSCard(BaseModel):
    summary: str
    indicator: str = Field(..., description="info, warning, or critical")
    detail: str
    source: CDSSource
    suggestions: Optional[List[CDSSuggestion]] = None

class CDSHookResponse(BaseModel):
    cards: List[CDSCard]

# Discovery Endpoint
@app.get("/cds-services")
def discover_services():
    return {
        "services": [
            {
                "hook": "patient-view",
                "name": "Geriatric Fall & Polypharmacy Alert",
                "description": "Evaluates patient age, renal markers, FRIDs, and DDIs to flag acute fall risks",
                "id": "geriatric-fall-risk",
                "prefetch": {
                    "patient": "Patient/{{context.patientId}}",
                    "medications": "MedicationRequest?patient={{context.patientId}}&status=active"
                }
            }
        ]
    }

# Clinical Evaluation Hook Endpoint
@app.post("/cds-services/geriatric-fall-risk", response_model=CDSHookResponse)
def evaluate_patient_risk(request: CDSHookRequest):
    # Simulated vector transformation from patient prefetch data
    # Standard format: [NUMERICAL_COLS (7), BINARY_RULE_COLS (12)] -> 19 features
    hadm_id = int(request.context.get("hadm_id", 999999))
    
    # Example active features extracted from EHR prefetch bundle:
    # High age (82), 12 medications, high creatinine (1.8), severe DDI, FRID classes active
    simulated_vector = torch.tensor([
        1.25,  # age_at_admission (standardized)
        1.40,  # unique_drug_count (standardized)
        0.85,  # min_creatinine
        1.65,  # max_creatinine (> 1.5 mg/dL)
        1.20,  # avg_creatinine
        2.00,  # detected_ddi_count
        1.75,  # w_ddi_score
        1.0,   # benzodiazepines_and_z_drugs
        0.0,   # antipsychotics
        1.0,   # anticholinergics_and_antihistamines
        0.0,   # tricyclic_and_sedating_antidepressants
        1.0,   # vasodilators_and_alpha_blockers
        1.0,   # loop_diuretics
        0.0,   # opioids
        0.0,   # antiepileptics
        4.0,   # total_frid_classes
        1.0,   # cns_polypharmacy_flag
        1.0,   # renal_contraindication_flag
        1.0    # has_pim_alert
    ], dtype=torch.float32)

    active_meds = ["lorazepam", "furosemide", "diphenhydramine", "hydralazine", "metoprolol"]

    # Generate mechanistic prediction and attributions
    rec = explainer_engine.generate_clinical_explanation(
        hadm_id=hadm_id,
        feature_tensor=simulated_vector,
        active_medications=active_meds
    )

    if rec.predicted_fall_risk < 0.20:
        return CDSHookResponse(cards=[])

    indicator = "critical" if rec.risk_stratification == "High" else "warning"

    card = CDSCard(
        summary=f"Elevated Fall Risk Detected ({rec.predicted_fall_risk * 100:.1f}%) - {rec.risk_stratification} Priority",
        indicator=indicator,
        detail=(
            f"**Pharmacological Mechanism:** {rec.pharmacological_mechanisms}\n\n"
            f"**Key Drivers:** {', '.join(rec.primary_risk_drivers)}\n\n"
            f"**Guideline Evidence:** {rec.clinical_guideline_citations[0] if rec.clinical_guideline_citations else 'STOPP/START v3'}"
        ),
        source=CDSSource(
            label="Geriatric Neuro-Symbolic Safety Engine",
            url="https://cga-toolkit.org/stopp-start-v3"
        ),
        suggestions=[
            CDSSuggestion(label=action) for action in rec.actionable_deprescribing_plan
        ]
    )

    return CDSHookResponse(cards=[card])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
