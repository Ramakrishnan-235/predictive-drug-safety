import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import torch
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import json

from src.explainability.attribution import PatientRiskAttributor, FEATURE_NAMES
from src.explainability.knowledge_retriever import ClinicalKnowledgeRetriever


class ClinicalRecommendation(BaseModel):
    hadm_id: int
    predicted_fall_risk: float = Field(description="Calibrated probability of fall/syncope [0.0 - 1.0]")
    risk_stratification: str = Field(description="Low, Moderate, or High")
    primary_risk_drivers: List[str] = Field(description="Top features driving the neural prediction")
    pharmacological_mechanisms: str = Field(description="Biochemical and physiological interaction pathway")
    clinical_guideline_citations: List[str] = Field(description="Referenced Beers / STOPP v3 criteria")
    actionable_deprescribing_plan: List[str] = Field(description="Concrete clinical steps for medication adjustment")


class MechanisticExplainerEngine:
    def __init__(self, checkpoint_path: str = "models/fall_risk_model.pt"):
        self.attributor = PatientRiskAttributor(checkpoint_path=checkpoint_path)
        self.retriever = ClinicalKnowledgeRetriever()
        
        # Lazy load LLM Explainer
        from src.explainability.llm_explainer import LLMClinicalExplainer
        self.llm_explainer = LLMClinicalExplainer()

    def generate_clinical_explanation(
        self, 
        hadm_id: int, 
        feature_tensor: Any, 
        active_medications: List[str],
        clinical_labs: Optional[Dict[str, Any]] = None,
        top_interaction_pairs: Optional[List[str]] = None,
        use_llm: bool = True
    ) -> ClinicalRecommendation:
        # 1. Compute neural prediction and attribution
        prob, top_drivers = self.attributor.explain_admission(feature_tensor, top_k=3)
        driver_names = [d["feature"] for d in top_drivers]

        # 2. Retrieve grounded clinical guidelines
        retrieved_texts = self.retriever.retrieve_guidelines(query_terms=driver_names, n_results=2)

        # 3. Stratify Risk
        stratification = "High" if prob >= 0.40 else ("Moderate" if prob >= 0.20 else "Low")

        # 4. Synthesize via LLM Explainer if enabled
        if use_llm:
            try:
                return self.llm_explainer.synthesize_explanation(
                    hadm_id=hadm_id,
                    predicted_fall_risk=prob,
                    risk_stratification=stratification,
                    top_drivers=top_drivers,
                    active_medications=active_medications,
                    clinical_labs=clinical_labs,
                    retrieved_guidelines=retrieved_texts,
                    top_interaction_pairs=top_interaction_pairs
                )
            except Exception as e:
                print(f"[MechanisticExplainer Warning] LLM generation encountered error ({e}); falling back to template engine.")

        # 5. Deterministic fallback rationale
        mechanisms = []
        action_plan = []

        if any("cns" in d or "benzodiazepine" in d for d in driver_names):
            mechanisms.append("Excessive GABAA receptor potentiated sedation impairs motor coordination and corrective postural reflexes.")
            action_plan.append("Initiate gradual 25% weekly taper of sedative/Z-drug regimen; transition to non-pharmacological sleep hygiene.")

        if any("ddi" in d or "loop_diuretics" in d or "vasodilators" in d for d in driver_names):
            mechanisms.append("Vasodilatory volume depletion compounds sedation, triggering orthostatic cerebral hypoperfusion upon standing.")
            action_plan.append("Check lying/standing orthostatic vitals; consider holding or lowering morning diuretic/antihypertensive dose.")

        if any("renal" in d or "creatinine" in d for d in driver_names):
            mechanisms.append("Reduced glomerular filtration rate prolongs active metabolite clearance, sustaining peak drug exposure.")
            action_plan.append("Re-calculate CrCl via Cockcroft-Gault; perform renal dose-adjustment on clearance-dependent medications.")

        if any("opioid" in d for d in driver_names):
            mechanisms.append("Mu-opioid receptor stimulation blunts cerebellar coordination, causing sedation and balance impairment.")
            action_plan.append("Taper opioid dose by 15-20% weekly and trial non-opioid pain modalities.")

        if not action_plan:
            action_plan.append("Continue routine observation; reassess medication regimen if clinical status changes.")

        return ClinicalRecommendation(
            hadm_id=hadm_id,
            predicted_fall_risk=round(prob, 4),
            risk_stratification=stratification,
            primary_risk_drivers=[f"{d['feature']} (Attribution: +{d['attribution_weight']:.3f})" for d in top_drivers],
            pharmacological_mechanisms=" ".join(mechanisms) if mechanisms else "Cumulative anticholinergic and age-related physiological reserve decline.",
            clinical_guideline_citations=retrieved_texts,
            actionable_deprescribing_plan=action_plan
        )


if __name__ == "__main__":
    engine = MechanisticExplainerEngine()
    dummy_features = torch.randn(len(FEATURE_NAMES))
    recommendation = engine.generate_clinical_explanation(
        hadm_id=20001234,
        feature_tensor=dummy_features,
        active_medications=["lorazepam", "furosemide", "gabapentin", "morphine"],
        clinical_labs={"age_at_admission": 81, "max_creatinine": 1.7},
        use_llm=True
    )
    print("\n--- Synthesized Clinical Recommendation (via MechanisticExplainerEngine) ---")
    print(recommendation.model_dump_json(indent=2))
