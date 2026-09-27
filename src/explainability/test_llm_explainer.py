import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.explainability.clinical_explainer import ClinicalRecommendation
from src.explainability.llm_explainer import LLMClinicalExplainer
from src.explainability.langchain_explainer import LangChainClinicalExplainer


def run_llm_audit():
    print("=================================================================")
    print("      MEDGEMMA 1.5-4B & LANGCHAIN CLINICAL EXPLAINER AUDIT       ")
    print("=================================================================\n")

    # 1. Initialize Engine
    explainer = LLMClinicalExplainer()
    print(f"Active LLM Provider Engine: '{explainer.provider}'")
    print(f"Underlying LangChain Framework: '{type(explainer.langchain_explainer).__name__}'\n")

    # 2. Test High-Risk Multimorbidity Patient Profiles
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
            "labs": {"age_at_admission": 84, "max_creatinine": 1.25, "calculated_egfr": 34},
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
            "labs": {"age_at_admission": 79, "max_creatinine": 2.15, "calculated_egfr": 26},
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

        assert isinstance(rec, ClinicalRecommendation), "Output must strictly conform to ClinicalRecommendation schema"
        assert rec.hadm_id == case["hadm_id"], "HADM ID must match"
        assert len(rec.primary_risk_drivers) > 0, "Risk drivers must be populated"
        assert len(rec.actionable_deprescribing_plan) > 0, "Deprescribing plan must not be empty"

        print("\n[Synthesized Pharmacological Mechanism]")
        print(f"  {rec.pharmacological_mechanisms}")

        print("\n[Clinical Guideline Citations]")
        for cite in rec.clinical_guideline_citations:
            print(f"  * {cite}")

        print("\n[Actionable Deprescribing Plan]")
        for idx, action in enumerate(rec.actionable_deprescribing_plan, 1):
            print(f"  {idx}. {action}")
        print("-" * 65 + "\n")

    # 3. Multimodal LangChain Execution Test
    print("=================================================================")
    print("    TESTING MULTIMODAL MEDGEMMA 1.5-4B LANGCHAIN INTEGRATION    ")
    print("=================================================================")
    lc_explainer = LangChainClinicalExplainer()
    print(f"Testing LangChain multimodal pipeline with prescription chart mock...")
    sample_image_url = "https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/p-blog/candy.JPG"
    multimodal_rec = lc_explainer.explain_case(
        hadm_id=999901,
        predicted_fall_risk=0.625,
        risk_stratification="High",
        top_drivers=[{"feature": "cns_polypharmacy_flag", "attribution_weight": 0.710}],
        active_medications=["Lorazepam", "Oxycodone", "Furosemide"],
        clinical_labs={"age_at_admission": 82, "max_creatinine": 1.6},
        image_input=sample_image_url
    )
    assert isinstance(multimodal_rec, ClinicalRecommendation)
    print(f"Multimodal case execution successful! Risk: {multimodal_rec.predicted_fall_risk*100:.1f}%")
    print(f"Pharmacological mechanism: {multimodal_rec.pharmacological_mechanisms[:100]}...\n")

    print("All clinical test cases & multimodal checks passed successfully!")


if __name__ == "__main__":
    run_llm_audit()
