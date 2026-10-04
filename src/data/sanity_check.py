"""Sanity checks for MIMIC-IV v2.1 hosp module. Run before anything else."""
import sys
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.data_prep.paths import resolve_hospital_directory, resolve_table_path

# Support standard configured paths and local workspace directories
HOSP = resolve_hospital_directory()


def main():
    print("=" * 60)
    print("MIMIC-IV v2.1 SANITY CHECK")
    print(f"Dataset location: {HOSP.resolve()}")
    print("=" * 60)

    if not HOSP.exists():
        print(f"Error: Hospital directory not found at {HOSP}")
        sys.exit(1)

    patients = pd.read_csv(resolve_table_path(HOSP, "patients"))
    admissions = pd.read_csv(resolve_table_path(HOSP, "admissions"))
    print(f"Patients:            {len(patients):>12,}")
    print(f"Admissions:          {len(admissions):>12,}")

    vpp = admissions.groupby("subject_id").size()
    print(f"Avg admissions/pt:   {vpp.mean():>12.2f}")
    print(f"Multi-visit patients:{(vpp > 1).sum():>12,}  ← critical for our task")

    dx = pd.read_csv(resolve_table_path(HOSP, "diagnoses_icd"), dtype=str)
    print(f"\nDiagnoses rows:      {len(dx):>12,}")
    print(f"Unique ICD codes:    {dx.icd_code.nunique():>12,}")

    proc = pd.read_csv(resolve_table_path(HOSP, "procedures_icd"), dtype=str)
    print(f"Procedures rows:     {len(proc):>12,}")

    print("\nLoading prescriptions (biggest table, ~1 min)...")
    rx = pd.read_csv(resolve_table_path(HOSP, "prescriptions"), low_memory=False)
    print(f"Prescription rows:   {len(rx):>12,}")
    print(f"Unique NDC codes:    {rx.ndc.nunique():>12,}")
    print(f"Null NDC rows:       {rx.ndc.isna().sum():>12,}")

    print("\n✅ ALL CHECKS PASSED — safe to proceed to PyHealth")


if __name__ == "__main__":
    main()
