import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import polars as pl
import torch
from torch_geometric.data import Data, Dataset
from torch_geometric.loader import DataLoader
import numpy as np
import itertools
from typing import List, Dict, Tuple

# Tabular clinical predictors (excluding raw DDI counts now handled by the graph)
CLINICAL_TABULAR_COLS = [
    "age_at_admission",
    "unique_drug_count",
    "min_creatinine",
    "max_creatinine",
    "avg_creatinine",
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
    "renal_contraindication_flag"
]


class PatientGraphDataset(Dataset):
    def __init__(self, data_list: List[Data]):
        super().__init__()
        self.data_list = data_list

    def len(self) -> int:
        return len(self.data_list)

    def get(self, idx: int) -> Data:
        return self.data_list[idx]


def build_patient_graphs(
    data_path: str = "data/processed/geriatric_features_with_ddi.parquet",
    known_ddi_pairs: Dict[Tuple[str, str], float] = None,
    embedding_dim: int = 32,
    cache_path: str = "data/processed/patient_graphs.pt"
) -> Tuple[Dataset, Dataset, Dataset, int, int]:
    cache_file = Path(cache_path) if cache_path else None
    if cache_file and cache_file.exists():
        print(f"Loading cached PyG Patient Graphs from {cache_file}...")
        cached_data = torch.load(cache_file, weights_only=False)
        return (
            PatientGraphDataset(cached_data["train_graphs"]),
            PatientGraphDataset(cached_data["val_graphs"]),
            PatientGraphDataset(cached_data["test_graphs"]),
            cached_data["num_unique_drugs"],
            cached_data["tabular_dim"]
        )

    df = pl.read_parquet(data_path)
    
    # Impute missing lab values
    for col in ["min_creatinine", "max_creatinine", "avg_creatinine"]:
        df = df.with_columns(pl.col(col).fill_null(df[col].median()))

    # Build unique drug dictionary across cohort
    all_drugs = sorted(list({d.lower().strip() for sublist in df["drug_name_list"].to_list() for d in sublist}))
    drug_to_idx = {drug: i for i, drug in enumerate(all_drugs)}
    num_unique_drugs = len(drug_to_idx)

    # Reference DDI lookup table (from TWOSIDES / DDInter)
    if known_ddi_pairs is None:
        known_ddi_pairs = {
            ("lorazepam", "furosemide"): 0.75,
            ("zolpidem", "trazodone"): 1.00,
            ("oxycodone", "lorazepam"): 1.00,
            ("furosemide", "hydralazine"): 0.75,
            ("diphenhydramine", "quetiapine"): 0.85,
            ("gabapentin", "tramadol"): 0.90,
            ("metoprolol", "diltiazem"): 0.70
        }

    all_ddi_keywords = sorted(list({k for pair in known_ddi_pairs for k in pair}), key=len, reverse=True)

    # Split patients by subject_id to prevent data leakage across visits
    unique_patients = df["subject_id"].unique().to_numpy()
    np.random.seed(42)
    np.random.shuffle(unique_patients)

    n_total = len(unique_patients)
    train_pts = set(unique_patients[:int(n_total * 0.8)])
    val_pts = set(unique_patients[int(n_total * 0.8):int(n_total * 0.9)])
    test_pts = set(unique_patients[int(n_total * 0.9):])

    # Pre-compute tabular normalization on training split
    train_tabular = df.filter(pl.col("subject_id").is_in(train_pts)).select(CLINICAL_TABULAR_COLS[:5]).to_numpy()
    tab_mean = np.mean(train_tabular, axis=0)
    tab_std = np.std(train_tabular, axis=0) + 1e-8

    def row_to_graph(row: dict) -> Data:
        meds = [m.lower().strip() for m in row["drug_name_list"]]
        med_indices = [drug_to_idx[m] for m in meds if m in drug_to_idx]
        
        if len(med_indices) == 0:
            med_indices = [0]
            meds = ["unknown"]
            
        num_nodes = len(med_indices)
        node_ids = torch.tensor(med_indices, dtype=torch.long)

        # Pre-tag medications with matching DDI keywords for fast combination check
        med_keywords = [[kw for kw in all_ddi_keywords if kw in m] for m in meds]

        # Build interaction edges between co-prescribed medications
        edge_list = []
        edge_weights = []
        
        for i, j in itertools.combinations(range(num_nodes), 2):
            kws_i = med_keywords[i]
            kws_j = med_keywords[j]
            if not kws_i or not kws_j:
                continue

            weight = 0.0
            for (k1, k2), w in known_ddi_pairs.items():
                if (k1 in kws_i and k2 in kws_j) or (k2 in kws_i and k1 in kws_j):
                    weight = w
                    break
            
            # If known DDI exists, create bidirectional edge
            if weight > 0.0:
                edge_list.append([i, j])
                edge_list.append([j, i])
                edge_weights.extend([weight, weight])

        # Self-loops to guarantee isolated nodes retain state during aggregation
        for i in range(num_nodes):
            edge_list.append([i, i])
            edge_weights.append(0.1)

        edge_index = torch.tensor(edge_list, dtype=torch.long).t().contiguous()
        edge_attr = torch.tensor(edge_weights, dtype=torch.float32).unsqueeze(1)

        # Normalize continuous tabular features and append binary flags
        cont_features = (np.array([row[c] for c in CLINICAL_TABULAR_COLS[:5]]) - tab_mean) / tab_std
        bin_features = np.array([row[c] for c in CLINICAL_TABULAR_COLS[5:]])
        clinical_tensor = torch.tensor(np.hstack([cont_features, bin_features]), dtype=torch.float32).unsqueeze(0)

        y = torch.tensor([row["fall_target_label"]], dtype=torch.float32)

        return Data(
            node_ids=node_ids,
            edge_index=edge_index,
            edge_attr=edge_attr,
            clinical_x=clinical_tensor,
            y=y,
            hadm_id=row["hadm_id"],
            num_nodes=num_nodes
        )

    print("Constructing PyG Patient Graphs...")
    all_rows = df.to_dicts()
    train_graphs, val_graphs, test_graphs = [], [], []
    for r in all_rows:
        pid = r["subject_id"]
        if pid in train_pts:
            train_graphs.append(row_to_graph(r))
        elif pid in val_pts:
            val_graphs.append(row_to_graph(r))
        elif pid in test_pts:
            test_graphs.append(row_to_graph(r))

    tabular_dim = len(CLINICAL_TABULAR_COLS)
    if cache_file:
        print(f"Caching PyG Patient Graphs to {cache_file}...")
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        torch.save({
            "train_graphs": train_graphs,
            "val_graphs": val_graphs,
            "test_graphs": test_graphs,
            "num_unique_drugs": num_unique_drugs,
            "tabular_dim": tabular_dim
        }, cache_file)

    return (
        PatientGraphDataset(train_graphs),
        PatientGraphDataset(val_graphs),
        PatientGraphDataset(test_graphs),
        num_unique_drugs,
        tabular_dim
    )


if __name__ == "__main__":
    train_set, val_set, test_set, num_drugs, tab_dim = build_patient_graphs()
    print(f"\nPyG Patient Graphs built successfully:")
    print(f"  Vocabulary size (unique drugs): {num_drugs}")
    print(f"  Clinical tabular dimensions   : {tab_dim}")
    print(f"  Train graphs                  : {len(train_set)}")
    print(f"  Validation graphs             : {len(val_set)}")
    print(f"  Test graphs                   : {len(test_set)}")

    # Test batching with DataLoader
    loader = DataLoader(train_set, batch_size=4, shuffle=True)
    sample_batch = next(iter(loader))
    print(f"\nSample Batch inspection:")
    print(f"  Batch node_ids shape          : {sample_batch.node_ids.shape}")
    print(f"  Batch edge_index shape        : {sample_batch.edge_index.shape}")
    print(f"  Batch clinical_x shape        : {sample_batch.clinical_x.shape}")
    print(f"  Batch y shape                 : {sample_batch.y.shape}")
