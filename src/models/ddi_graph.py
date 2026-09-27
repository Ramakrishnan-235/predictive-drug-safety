import polars as pl
import itertools
from pathlib import Path
from typing import Dict, Tuple, List


class DDISeverityEngine:
    def __init__(self):
        # Pharmacodynamic and pharmacokinetic interaction matrix from TWOSIDES & DDInter
        # Capturing major additive sedation, orthostasis, and CYP3A4 metabolic competition
        self.ddi_registry: Dict[Tuple[str, str], Tuple[float, str]] = {
            # Pair: (Severity Weight, Adverse Mechanism)
            ("lorazepam", "furosemide"): (0.75, "Additive sedation + orthostatic hypotension"),
            ("zolpidem", "trazodone"): (1.00, "Severe central nervous system depression"),
            ("oxycodone", "lorazepam"): (1.00, "Profound sedation and respiratory depression"),
            ("furosemide", "hydralazine"): (0.75, "Precipitous hypotension and syncope"),
            ("diphenhydramine", "quetiapine"): (0.85, "Potentiated anticholinergic and sedative toxicity"),
            ("gabapentin", "tramadol"): (0.90, "Enhanced neurotoxicity, ataxia, and dizziness"),
            ("furosemide", "digoxin"): (0.80, "Electrolyte depletion predisposing to digitalis toxicity"),
            ("metoprolol", "diltiazem"): (0.70, "Additive bradycardia and atrioventricular conduction block"),
            ("ciprofloxacin", "warfarin"): (0.85, "CYP1A2 inhibition leading to elevated bleeding risk"),
            ("haloperidol", "lorazepam"): (0.80, "Severe extrapyramidal symptoms and gait instability")
        }
        self._all_known = sorted(set(k for pair in self.ddi_registry for k in pair), key=len, reverse=True)

    def evaluate_regimen(self, drug_list: List[str]) -> Tuple[int, float, List[str]]:
        """Calculates co-occurring interaction count, wDDI score, and mechanistic alerts."""
        if not drug_list or len(drug_list) < 2:
            return 0, 0.0, []

        normalized_drugs = [str(d).lower().strip() for d in drug_list if d]
        n = len(normalized_drugs)
        if n < 2:
            return 0, 0.0, []

        drug_kw = [[kw for kw in self._all_known if kw in d] for d in normalized_drugs]

        detected_interactions = 0
        cumulative_severity = 0.0
        mechanisms = []

        for i in range(n):
            kws_i = drug_kw[i]
            if not kws_i:
                continue
            for j in range(i + 1, n):
                kws_j = drug_kw[j]
                if not kws_j:
                    continue
                for (known_a, known_b), (severity, mech) in self.ddi_registry.items():
                    if (known_a in kws_i and known_b in kws_j) or (known_b in kws_i and known_a in kws_j):
                        detected_interactions += 1
                        cumulative_severity += severity
                        mechanisms.append(f"{known_a.title()} + {known_b.title()}: {mech}")

        # Normalization over total active drug combinations
        denom = n * (n - 1)
        w_ddi = (2.0 * cumulative_severity) / denom if denom > 0 else 0.0

        return detected_interactions, round(w_ddi, 4), mechanisms


def run_ddi_graph():
    input_path = Path("data/processed/cohort_with_safety_flags.parquet")
    output_path = Path("data/processed/geriatric_features_with_ddi.parquet")

    print("[1/2] Loading Safety-Audited Cohort...")
    df = pl.read_parquet(input_path)

    engine = DDISeverityEngine()
    print("[2/2] Computing Pairwise DDI Metrics and wDDI Tensors...")

    results = [engine.evaluate_regimen(drugs) for drugs in df["drug_name_list"].to_list()]

    ddi_df = pl.DataFrame({
        "detected_ddi_count": [r[0] for r in results],
        "w_ddi_score": [r[1] for r in results],
        "ddi_mechanisms": [r[2] for r in results]
    })

    final_df = pl.concat([df, ddi_df], how="horizontal")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    final_df.write_parquet(output_path)

    print(f"Master feature matrix saved: {output_path}")
    print("\n--- Master Feature Matrix Preview (Ready for Phase 3 Model) ---")
    print(final_df.select([
        "hadm_id", "unique_drug_count", "total_frid_classes", 
        "detected_ddi_count", "w_ddi_score", "fall_target_label"
    ]).head(5))


if __name__ == "__main__":
    run_ddi_graph()
