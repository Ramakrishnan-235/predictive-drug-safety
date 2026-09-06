"""PyHealth MIMIC-IV medication recommendation pipeline.
Start with dev=True (fast), switch to dev=False when confident."""
import argparse
from pathlib import Path
from loguru import logger

try:
    from pyhealth.datasets import MIMIC4Dataset, MIMIC4EHRDataset
except ImportError:
    from pyhealth.datasets import MIMIC4Dataset
    MIMIC4EHRDataset = MIMIC4Dataset

try:
    from pyhealth.datasets.sample_dataset import SampleDataset

    def _get_all_tokens(self, key="drugs"):
        if hasattr(self, "output_processors") and key in self.output_processors:
            proc = self.output_processors[key]
            if hasattr(proc, "label_vocab"):
                return list(proc.label_vocab.keys())
            if hasattr(proc, "vocab"):
                return list(proc.vocab.keys()) if isinstance(proc.vocab, dict) else list(proc.vocab)
        if hasattr(self, "input_processors") and key in self.input_processors:
            proc = self.input_processors[key]
            if hasattr(proc, "vocab"):
                return list(proc.vocab.keys()) if isinstance(proc.vocab, dict) else list(proc.vocab)
        return []

    if not hasattr(SampleDataset, "get_all_tokens"):
        SampleDataset.get_all_tokens = _get_all_tokens
except Exception:
    pass

try:
    from pyhealth.tasks import DrugRecommendationMIMIC4 as medication_recommendation_fn
except ImportError:
    try:
        from pyhealth.tasks import drug_recommendation_mimic4_fn as medication_recommendation_fn
    except ImportError:
        from pyhealth.tasks import medication_recommendation_fn


def get_mimic_root() -> str:
    candidate_paths = [
        Path("data/raw/mimic4"),
        Path("data/raw/MIMIC-iv v.2.1"),
        Path("data/raw/mimic-iv"),
        Path("data/raw/mimic-iv-2.1"),
    ]
    for p in candidate_paths:
        if p.exists():
            return str(p)
    return "data/raw/mimic4"


def build_dataset(dev: bool = False):
    root_path = get_mimic_root()
    logger.info(f"Building MIMIC-IV dataset from {root_path} (dev={dev})")

    try:
        base_ds = MIMIC4Dataset(
            ehr_root=root_path,
            ehr_tables=["diagnoses_icd", "procedures_icd", "prescriptions"],
            dev=dev,
        )
    except TypeError:
        base_ds = MIMIC4Dataset(
            root=root_path,
            tables=["DIAGNOSES_ICD", "PROCEDURES_ICD", "PRESCRIPTIONS"],
            dev=dev,
        )

    task = (
        medication_recommendation_fn()
        if callable(medication_recommendation_fn) and isinstance(medication_recommendation_fn, type)
        else medication_recommendation_fn
    )

    sample_ds = base_ds.set_task(task)
    return sample_ds


def print_stats(sample_ds):
    print("=" * 60)
    print("SAMPLE DATASET STATISTICS")
    print("=" * 60)
    if hasattr(sample_ds, "stat"):
        sample_ds.stat()
    elif hasattr(sample_ds, "stats"):
        sample_ds.stats()
    else:
        print(f"Total samples: {len(sample_ds):,}")
        if hasattr(sample_ds, "input_schema"):
            print(f"Input schema:  {sample_ds.input_schema}")
        if hasattr(sample_ds, "output_schema"):
            print(f"Output schema: {sample_ds.output_schema}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PyHealth MIMIC-IV Pipeline")
    parser.add_argument("--dev", action="store_true", help="run on dev subset of patients (fast)")
    parser.add_argument("--show-sample", action="store_true", help="print sample #0 structure")
    args = parser.parse_args()

    sample_ds = build_dataset(dev=args.dev)
    print_stats(sample_ds)

    if args.show_sample:
        print("\n" + "=" * 60)
        print("SAMPLE #0 — this is what your model will consume:")
        print("=" * 60)
        sample = sample_ds[0] if hasattr(sample_ds, "__getitem__") else sample_ds.samples[0]
        print(sample)
