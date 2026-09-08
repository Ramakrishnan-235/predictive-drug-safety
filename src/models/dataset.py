import polars as pl
import torch
from torch.utils.data import Dataset, DataLoader
import numpy as np
from pathlib import Path
from typing import Tuple, List

# Explicit feature columns engineered in Phases 1 and 2
NUMERICAL_COLS = [
    "age_at_admission",
    "unique_drug_count",
    "min_creatinine",
    "max_creatinine",
    "avg_creatinine",
    "detected_ddi_count",
    "w_ddi_score"
]

BINARY_RULE_COLS = [
    "benzodiazepines_and_z_drugs",
    "antipsychotics",
    "anticholinergics_and_antihistamines",
    "tricyclic_and_sedating_antidepressants",
    "vasodilators_and_alpha_blockers",
    "loop_diuretics",
    "opioids",
    "antiepileptics",
    "total_frid_classes",
    "cns_polypharmacy_flag",
    "renal_contraindication_flag",
    "has_pim_alert"
]


class GeriatricRiskDataset(Dataset):
    def __init__(self, features: np.ndarray, labels: np.ndarray, hadm_ids: List[int]):
        self.x = torch.tensor(features, dtype=torch.float32)
        self.y = torch.tensor(labels, dtype=torch.float32).unsqueeze(1)
        self.hadm_ids = hadm_ids

    def __len__(self) -> int:
        return len(self.x)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, int]:
        return self.x[idx], self.y[idx], self.hadm_ids[idx]


def prepare_dataloaders(
    data_path: str = "data/processed/geriatric_features_with_ddi.parquet",
    batch_size: int = 64,
    split_ratios: Tuple[float, float, float] = (0.8, 0.1, 0.1),
    random_seed: int = 42
) -> Tuple[DataLoader, DataLoader, DataLoader, float, int]:
    """Splits cohort by patient subject_id and normalizes continuous predictors."""
    df = pl.read_parquet(data_path)

    # Impute potential lab missingness with median
    for col in ["min_creatinine", "max_creatinine", "avg_creatinine"]:
        median_val = df[col].median()
        df = df.with_columns(pl.col(col).fill_null(median_val))

    # Patient-level split to prevent data contamination across visits
    unique_patients = df["subject_id"].unique().to_numpy()
    np.random.seed(random_seed)
    np.random.shuffle(unique_patients)

    n_total = len(unique_patients)
    n_train = int(n_total * split_ratios[0])
    n_val = int(n_total * split_ratios[1])

    train_pts = set(unique_patients[:n_train])
    val_pts = set(unique_patients[n_train:n_train + n_val])
    test_pts = set(unique_patients[n_train + n_val:])

    train_df = df.filter(pl.col("subject_id").is_in(train_pts))
    val_df = df.filter(pl.col("subject_id").is_in(val_pts))
    test_df = df.filter(pl.col("subject_id").is_in(test_pts))

    # Fit standardization scalars solely on the training cohort
    num_train = train_df.select(NUMERICAL_COLS).to_numpy()
    mean = np.mean(num_train, axis=0)
    std = np.std(num_train, axis=0) + 1e-8

    def transform_data(split_df: pl.DataFrame) -> Tuple[np.ndarray, np.ndarray, List[int]]:
        num_scaled = (split_df.select(NUMERICAL_COLS).to_numpy() - mean) / std
        rules = split_df.select(BINARY_RULE_COLS).to_numpy()
        x_all = np.hstack([num_scaled, rules])
        y_all = split_df["fall_target_label"].to_numpy()
        hadm_list = split_df["hadm_id"].to_list()
        return x_all, y_all, hadm_list

    x_train, y_train, hadm_train = transform_data(train_df)
    x_val, y_val, hadm_val = transform_data(val_df)
    x_test, y_test, hadm_test = transform_data(test_df)

    # Compute positive label weight for imbalance compensation
    pos_count = np.sum(y_train == 1)
    neg_count = np.sum(y_train == 0)
    pos_weight = float(neg_count / max(pos_count, 1))

    train_loader = DataLoader(GeriatricRiskDataset(x_train, y_train, hadm_train), batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(GeriatricRiskDataset(x_val, y_val, hadm_val), batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(GeriatricRiskDataset(x_test, y_test, hadm_test), batch_size=batch_size, shuffle=False)

    total_feature_dim = x_train.shape[1]
    return train_loader, val_loader, test_loader, pos_weight, total_feature_dim


if __name__ == "__main__":
    train_loader, val_loader, test_loader, pos_weight, total_feature_dim = prepare_dataloaders()
    print(f"Dataset partitioned successfully:")
    print(f"  Total feature dim : {total_feature_dim}")
    print(f"  Train batches     : {len(train_loader)} (batch_size={train_loader.batch_size})")
    print(f"  Val batches       : {len(val_loader)}")
    print(f"  Test batches      : {len(test_loader)}")
    print(f"  Positive class wt : {pos_weight:.4f}")
