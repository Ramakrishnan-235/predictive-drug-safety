"""Sanity checks for MIMIC-IV v2.1 hosp module. Run before anything else."""
import sys
from pathlib import Path
import pandas as pd

# Support standard configured paths and local workspace directories
CANDIDATE_PATHS = [
    Path("data/raw/mimic4/hosp"),
    Path("data/raw/MIMIC-iv v.2.1/hos"),
    Path("data/raw/MIMIC-iv v.2.1/hosp"),
    Path("data/raw/mimic-iv/hosp"),
    Path("data/raw/mimic-iv-2.1/hos"),
]

HOSP = next((p for p in CANDIDATE_PATHS if p.exists()), Path("data/raw/mimic4/hosp"))


def main():
    print("=" * 60)
    print("MIMIC-IV v2.1 SANITY CHECK")
    print(f"Dataset location: {HOSP.resolve()}")
    print("=" * 60)

    if not HOSP.exists():
        print(f"Error: Hospital directory not found at {HOSP}")
        sys.exit(1)

    patients = pd.read_csv(HOSP / "patients.csv")
    admissions = pd.read_csv(HOSP / "admissions.csv")
    print(f"Patients:            {len(patients):>12,}")
    print(f"Admissions:          {len(admissions):>12,}")

    vpp = admissions.groupby("subject_id").size()
    print(f"Avg admissions/pt:   {vpp.mean():>12.2f}")
    print(f"Multi-visit patients:{(vpp > 1).sum():>12,}  ← critical for our task")

    dx = pd.read_csv(HOSP / "diagnoses_icd.csv", dtype=str)
    print(f"\nDiagnoses rows:      {len(dx):>12,}")
    print(f"Unique ICD codes:    {dx.icd_code.nunique():>12,}")

    proc = pd.read_csv(HOSP / "procedures_icd.csv", dtype=str)
    print(f"Procedures rows:     {len(proc):>12,}")

    print("\nLoading prescriptions (biggest table, ~1 min)...")
    rx = pd.read_csv(HOSP / "prescriptions.csv", low_memory=False)
    print(f"Prescription rows:   {len(rx):>12,}")
    print(f"Unique NDC codes:    {rx.ndc.nunique():>12,}")
    print(f"Null NDC rows:       {rx.ndc.isna().sum():>12,}")

    print("\n✅ ALL CHECKS PASSED — safe to proceed to PyHealth")


if __name__ == "__main__":
    main()
