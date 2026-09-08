import polars as pl
from pathlib import Path
from typing import Dict, List, Any

# Explicit FRID categories codified from AGS Beers 2023 and STOPP v3 (Section K)
FRID_CATEGORIES: Dict[str, List[str]] = {
    "benzodiazepines_and_z_drugs": [
        "lorazepam", "diazepam", "temazepam", "clonazepam", "alprazolam", 
        "midazolam", "chlordiazepoxide", "clorazepate", "oxazepam", 
        "zolpidem", "zaleplon", "eszopiclone", "zopiclone"
    ],
    "antipsychotics": [
        "haloperidol", "quetiapine", "risperidone", "olanzapine", 
        "aripiprazole", "clozapine", "chlorpromazine", "fluphenazine"
    ],
    "anticholinergics_and_antihistamines": [
        "diphenhydramine", "hydroxyzine", "promethazine", "meclizine", 
        "oxybutynin", "tolterodine", "benztropine", "trihexyphenidyl"
    ],
    "tricyclic_and_sedating_antidepressants": [
        "amitriptyline", "nortriptyline", "doxepin", "imipramine", 
        "trazodone", "mirtazapine", "paroxetine"
    ],
    "vasodilators_and_alpha_blockers": [
        "hydralazine", "nitroglycerin", "isosorbide", "prazosin", 
        "doxazosin", "terazosin", "clonidine"
    ],
    "loop_diuretics": [
        "furosemide", "bumetanide", "torsemide"
    ],
    "opioids": [
        "morphine", "oxycodone", "hydromorphone", "fentanyl", 
        "tramadol", "codeine", "methadone", "buprenorphine"
    ],
    "antiepileptics": [
        "gabapentin", "pregabalin", "carbamazepine", "phenytoin", 
        "valproic acid", "levetiracetam", "topiramate"
    ]
}

# Medications requiring caution or avoidance in renal impairment
RENAL_RISK_MEDS: List[str] = [
    "ibuprofen", "naproxen", "ketorolac", "meloxicam", "celecoxib",
    "spironolactone", "digoxin", "glyburide", "nitrofurantoin"
]


def audit_patient_medications(drug_list: List[str], max_creatinine: float) -> Dict[str, Any]:
    """Evaluates medication regimen against explicit geriatric safety rules."""
    flags: Dict[str, Any] = {cat: 0 for cat in FRID_CATEGORIES}
    flags["renal_contraindication_flag"] = 0
    flags["total_frid_classes"] = 0
    flags["cns_polypharmacy_flag"] = 0

    if not drug_list:
        flags["has_pim_alert"] = 0
        return flags

    normalized_text = " ".join(str(d) for d in drug_list if d).lower()

    # 1. Screen standard FRID drug classes
    active_frid_count = 0
    cns_classes_active = 0
    cns_categories = {
        "benzodiazepines_and_z_drugs", 
        "antipsychotics", 
        "tricyclic_and_sedating_antidepressants", 
        "opioids", 
        "antiepileptics"
    }

    for category, keywords in FRID_CATEGORIES.items():
        if any(keyword in normalized_text for keyword in keywords):
            flags[category] = 1
            active_frid_count += 1
            if category in cns_categories:
                cns_classes_active += 1

    flags["total_frid_classes"] = active_frid_count

    # Beers Criteria warning: >= 3 CNS-active classes significantly multiplies fall/fracture risk
    if cns_classes_active >= 3:
        flags["cns_polypharmacy_flag"] = 1

    # 2. Lab-integrated renal impairment audit (Creatinine > 1.5 mg/dL)
    is_renally_impaired = max_creatinine is not None and max_creatinine > 1.5
    if is_renally_impaired:
        if any(med in normalized_text for med in RENAL_RISK_MEDS):
            flags["renal_contraindication_flag"] = 1

    # Consolidated PIM indicator
    flags["has_pim_alert"] = int(active_frid_count > 0 or flags["renal_contraindication_flag"] == 1)
    return flags


def run_safety_rules():
    input_path = Path("data/processed/geriatric_fall_cohort.parquet")
    output_path = Path("data/processed/cohort_with_safety_flags.parquet")

    print("[1/2] Loading Phase 1 Parquet Cohort...")
    df = pl.read_parquet(input_path)

    print("[2/2] Screening Regimens against AGS Beers 2023 & STOPP v3...")
    drugs = df["drug_name_list"].to_list()
    creatinines = df["max_creatinine"].to_list()

    audits = [
        audit_patient_medications(drug_seq, cr) 
        for drug_seq, cr in zip(drugs, creatinines)
    ]
    audit_df = pl.DataFrame(audits)

    enriched_df = pl.concat([df, audit_df], how="horizontal")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    enriched_df.write_parquet(output_path)

    print(f"Safety flags compiled: {output_path}")
    print("\nSafety Screening Summary:")
    print(enriched_df.select([
        "hadm_id", "age_at_admission", "unique_drug_count", 
        "total_frid_classes", "cns_polypharmacy_flag", 
        "renal_contraindication_flag", "has_pim_alert"
    ]).head(5))


if __name__ == "__main__":
    run_safety_rules()
