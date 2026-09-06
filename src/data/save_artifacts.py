"""Save dataset artifacts needed by later phases (severity matrix, DDI mapping)."""
import sys
from pathlib import Path
import pickle
import duckdb

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.data.mimic_pipeline import build_dataset

# Build the complete dataset
sample_ds = build_dataset(dev=False)

# Load NDC to ATC ontology mapping
ndc_to_atc_path = Path.home() / ".cache" / "pyhealth" / "medcode" / "NDC_to_ATC.pkl"
ndc_to_atc = {}
if ndc_to_atc_path.exists():
    with open(ndc_to_atc_path, "rb") as f:
        ndc_to_atc = pickle.load(f)

# Extract ATC-3 codes from MIMIC prescriptions
atc3_vocab = set()
if ndc_to_atc:
    con = duckdb.connect()
    candidates = [
        Path("data/raw/hosp/prescriptions.csv"),
        Path("data/raw/MIMIC-iv v.2.1/hos/prescriptions.csv"),
        Path("data/raw/mimic4/hosp/prescriptions.csv"),
    ]
    rx_path = next((p for p in candidates if p.exists()), None)
    if rx_path:
        rx_rows = con.execute(
            f"SELECT DISTINCT ndc FROM read_csv_auto('{rx_path.as_posix()}') WHERE ndc IS NOT NULL AND ndc != '0' AND ndc != ''"
        ).fetchall()
        for r in rx_rows:
            raw_ndc = str(r[0]).strip()
            cand_keys = [raw_ndc, raw_ndc.zfill(11)]
            if raw_ndc.isdigit():
                cand_keys.append(str(int(raw_ndc)))
            for k in cand_keys:
                if k in ndc_to_atc:
                    for atc in ndc_to_atc[k]:
                        if len(atc) >= 4 and atc[0].isalpha() and atc[1:3].isdigit() and atc[3].isalpha():
                            atc3_vocab.add(atc[:4])
                    break
        con.close()

if atc3_vocab:
    drug_vocab = sorted(list(atc3_vocab))
else:
    drug_vocab = sorted(sample_ds.get_all_tokens(key="drugs"))

Path("data/processed").mkdir(parents=True, exist_ok=True)
with open("data/processed/drug_vocab.pkl", "wb") as f:
    pickle.dump(drug_vocab, f)

print(f"Drug vocabulary size: {len(drug_vocab)}")   # expect ~120–200 ATC3 codes
print("First 10:", drug_vocab[:10])
