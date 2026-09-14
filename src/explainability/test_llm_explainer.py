import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import polars as pl
import torch
from src.explainability.clinical_explainer import MechanisticExplainerEngine
from src.explainability.llm_explainer import LLMClinicalExplainer


def run_llm_audit():
    print("=================================================================")
    print("        LLM CLINICAL EXPLAINER AUDIT & BENCHMARK SUITE          ")
    print("=================================================================\n")

    # 1. Initialize Engine
    explainer = LLMClinicalExplainer()
    print(f"Active LLM Provider Engine: '{explainer.provider}'\n")

    # 2. Test High-Risk Multimorbidity Patient Profile
    test_cases = [
        {
            "name": "Case A: Acute Opioid + Benzodiazepine CNS Polypharmacy",
            "hadm_id": 20582386,
            "predicted_risk": 0.5420,
            "stratification": "High",
            "drivers": [
                {"feature": "opioids", "attribution_weight": 0.684},
                {"feature": "benzodiazepines_and_z_drugs", "attribution_weight": 0.412},
                {"feature": "cns_polypharmacy_flag", "attribution_weight": 0.320}
            ],
            "meds": ["Morphine Sulfate", "Lorazepam", "Zolpidem", "Ondansetron", "Omeprazole", "Furosemide"],
            "labs": {"age_at_admission": 84, "max_creatinine": 1.25},
            "interactions": ["Morphine <-> Lorazepam (GATv2: 0.945)"]
        },
        {
            "name": "Case B: Vasodilator-Induced Orthostasis with Impaired Renal Clearance",
            "hadm_id": 26971272,
            "predicted_risk": 0.4810,
            "stratification": "High",
            "drivers": [
                {"feature": "max_creatinine", "attribution_weight": 0.521},
                {"feature": "loop_diuretics", "attribution_weight": 0.442},
                {"feature": "vasodilators_and_alpha_blockers", "attribution_weight": 0.315}
            ],
            "meds": ["Furosemide", "Hydralazine", "Nitroglycerin", "Metoprolol", "Gabapentin", "Aspirin"],
            "labs": {"age_at_admission": 79, "max_creatinine": 2.15},
            "interactions": ["Furosemide <-> Hydralazine (GATv2: 0.912)"]
        }
    ]

    for case in test_cases:
        print("-" * 65)
        print(f"AUDITING: {case['name']}")
        print(f"Admission ID: {case['hadm_id']} | Risk: {case['predicted_risk']*100:.1f}% ({case['stratification']})")
        print(f"Medications ({len(case['meds'])}): {', '.join(case['meds'])}")
        print(f"GNN Attended Pair: {case['interactions'][0]}")

        rec = explainer.synthesize_explanation(
            hadm_id=case["hadm_id"],
            predicted_fall_risk=case["predicted_risk"],
            risk_stratification=case["stratification"],
            top_drivers=case["drivers"],
            active_medications=case["meds"],
            clinical_labs=case["labs"],
            top_interaction_pairs=case["interactions"]
        )

        print("\n[Synthesized Pharmacological Mechanism]")
        print(f"  {rec.pharmacological_mechanisms}")

        print("\n[Clinical Guideline Citations]")
        for cite in rec.clinical_guideline_citations:
            print(f"  * {cite}")

        print("\n[Actionable Deprescribing Plan]")
        for idx, action in enumerate(rec.actionable_deprescribing_plan, 1):
            print(f"  {idx}. {action}")
        print("-" * 65 + "\n")

    print("All clinical test cases synthesized successfully!")


if __name__ == "__main__":
    run_llm_audit()
