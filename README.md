# Predictive Drug Safety

Research codebase for predicting medication-related safety risks from electronic health records. The current pipeline extracts a geriatric polypharmacy cohort from [MIMIC-IV](https://physionet.org/content/mimiciv/), maps drugs to ATC-3 codes, and smoke-tests a RETAIN medication-recommendation model via PyHealth.

## What is in this repo

| Path | Purpose |
| --- | --- |
| `src/data/` | MIMIC-IV PyHealth loader, sanity checks, ATC-3 vocab export |
| `src/data_prep/` | DuckDB geriatric fall / polypharmacy cohort extraction |
| `src/api/` | FastAPI stubs (not wired yet) |
| `scripts/smoke_test.py` | 2-epoch RETAIN GPU/CPU smoke test |
| `configs/` | Placeholders for data / model / LLM settings |
| `data/` | Local data layout only (raw and processed files are **not** committed) |

## What is not committed

These stay on disk and are listed in `.gitignore`:

- MIMIC-IV, DrugBank, DDInter, TWOSIDES, and other raw dumps under `data/raw/`
- Processed artifacts (`*.parquet`, `*.pkl`) under `data/processed/`
- Virtualenv (`.venv/`), caches, logs, and training runs (`runs/`, `*.ckpt`)

MIMIC-IV is a credentialed PhysioNet dataset. Do not push it to GitHub.

## Setup

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Conda:

```bash
conda env create -f environment.yml
conda activate predictive-drug-safety
```

Place MIMIC-IV files under one of:

- `data/raw/mimic4/`
- `data/raw/MIMIC-iv v.2.1/`

Hospital-module CSVs (`patients`, `admissions`, `diagnoses_icd`, `procedures_icd`, `prescriptions`) should sit in `hosp/` or `hos/`.

## Common commands

```bash
# Verify MIMIC-IV tables load
python -m src.data.sanity_check

# Build geriatric fall + polypharmacy cohort → data/processed/geriatric_fall_cohort.parquet
python -m src.data_prep.cohort_selection

# Export ATC-3 drug vocabulary → data/processed/drug_vocab.pkl
python -m src.data.save_artifacts

# Train a 2-epoch RETAIN smoke test
python scripts/smoke_test.py
```

## License

MIT. Underlying EHR and drug databases remain under their original data-use agreements.
