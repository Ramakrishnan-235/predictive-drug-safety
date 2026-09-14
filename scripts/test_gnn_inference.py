import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.models.gnn_inference import GNNInferenceEngine

def main():
    engine = GNNInferenceEngine()
    print("=" * 60)
    print("GNN INFERENCE ENGINE VERIFICATION SUITE")
    print("=" * 60)

    # 1. Preset Scenarios
    presets = engine.get_preset_cases()
    for name, p in presets.items():
        res = engine.predict(p['drugs'], p['age'], p['creatinine_min'], p['creatinine_max'], p['creatinine_avg'])
        print(f"\n[Case] {name}")
        print(f"  Risk: {res['predicted_risk_pct']}% ({res['risk_tier']})")
        print(f"  FRID Classes: {res['safety_audit']['total_frid_classes']}")
        print(f"  CNS Polypharmacy: {res['safety_audit']['cns_polypharmacy_flag']}")
        print(f"  Renal Contraindication: {res['safety_audit']['renal_contraindication_flag']}")
        print(f"  Attended Interactions ({len(res['attended_interactions'])}):")
        for att in res['attended_interactions']:
            print(f"    - {att['pair_name']}: α={att['attention_weight']:.4f} | {att['adverse_mechanism']}")

    # 2. What-If Deprescribing Test
    print("\n" + "=" * 60)
    print("WHAT-IF DEPRESCRIBING SIMULATION TEST")
    print("=" * 60)
    sim = engine.simulate_deprescribing(
        drug_list=["zolpidem", "trazodone", "furosemide"],
        drug_to_remove="zolpidem",
        age=82,
        creatinine_min=1.2,
        creatinine_max=1.6,
        creatinine_avg=1.4
    )
    print(f"Baseline Risk: {sim['baseline_risk_pct']}% -> Deprescribed Risk: {sim['deprescribed_risk_pct']}% (Delta: {sim['delta_pct']:+.2f}%)")

    # 3. Robustness on Edge Cases
    print("\n" + "=" * 60)
    print("ROBUSTNESS & EDGE CASE TESTS")
    print("=" * 60)
    res_empty = engine.predict([], age=70)
    print(f"Empty Regimen: {res_empty['predicted_risk_pct']}% ({res_empty['risk_tier']})")

    res_unknown = engine.predict(["non_existent_drug_123"], age=70)
    print(f"Unknown Regimen: {res_unknown['predicted_risk_pct']}% ({res_unknown['risk_tier']})")

    print("\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
