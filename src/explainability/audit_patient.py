import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import polars as pl
import torch
from src.models.dataset import prepare_dataloaders
from src.explainability.clinical_explainer import MechanisticExplainerEngine


def run_audit():
    print("Initializing Mechanistic Explainer Engine...")
    engine = MechanisticExplainerEngine()

    _, _, test_loader, _, _ = prepare_dataloaders()
    
    # Load raw cohort to access original drug lists for reporting
    raw_df = pl.read_parquet("data/processed/geriatric_features_with_ddi.parquet")

    print("\nAuditing High-Risk Cases from Held-Out Test Set...\n")
    audited_count = 0
    
    for x_batch, y_batch, hadm_ids in test_loader:
        for i in range(len(hadm_ids)):
            hadm_id = hadm_ids[i].item() if isinstance(hadm_ids[i], torch.Tensor) else int(hadm_ids[i])
            patient_row = raw_df.filter(pl.col("hadm_id") == hadm_id).to_dicts()[0]
            
            # Audit if patient experienced high predicted risk or positive fall label
            rec = engine.generate_clinical_explanation(
                hadm_id=hadm_id,
                feature_tensor=x_batch[i],
                active_medications=patient_row["drug_name_list"]
            )

            if rec.risk_stratification == "High" and audited_count < 2:
                print("=" * 65)
                print(f"CLINICAL DECISION SUPPORT AUDIT: Admission ID {rec.hadm_id}")
                print(f"Predicted Fall Risk        : {rec.predicted_fall_risk * 100:.2f}% ({rec.risk_stratification} Risk)")
                print(f"Ground Truth Fall Event    : {'YES' if patient_row['fall_target_label'] == 1 else 'NO'}")
                print(f"Active Medications ({patient_row['unique_drug_count']}): {patient_row['drug_name_list'][:6]}...")
                print("\n[Subsymbolic Attributions]")
                for driver in rec.primary_risk_drivers:
                    print(f"  • {driver}")
                print("\n[Mechanistic Rationale]")
                print(f"  {rec.pharmacological_mechanisms}")
                print("\n[Guideline Citations]")
                for cite in rec.clinical_guideline_citations:
                    print(f"  * {cite}")
                print("\n[Actionable Deprescribing Plan]")
                for action in rec.actionable_deprescribing_plan:
                    print(f"  -> {action}")
                print("=" * 65 + "\n")
                audited_count += 1

        if audited_count >= 2:
            break


if __name__ == "__main__":
    run_audit()
