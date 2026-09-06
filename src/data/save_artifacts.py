"""Save dataset artifacts needed by later phases (severity matrix, DDI mapping)."""
import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pickle
from src.data.mimic_pipeline import build_dataset

# Build the complete dataset
sample_ds = build_dataset(dev=False)

# The complete drug vocabulary — your model's output space (the "N" in matrix S)
drug_vocab = sorted(sample_ds.get_all_tokens(key="drugs"))

Path("data/processed").mkdir(parents=True, exist_ok=True)
with open("data/processed/drug_vocab.pkl", "wb") as f:
    pickle.dump(drug_vocab, f)

print(f"Drug vocabulary size: {len(drug_vocab)}")   # expect ~120–200 ATC3 codes
print("First 10:", drug_vocab[:10])
