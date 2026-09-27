import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import torch
from torch_geometric.loader import DataLoader
from torch.optim import AdamW
from torch.optim.lr_scheduler import ReduceLROnPlateau
import numpy as np
from sklearn.metrics import roc_auc_score, precision_recall_curve, auc, brier_score_loss

from src.models.graph_dataset import build_patient_graphs
from src.models.gnn_fall_model import RegimenGNNPredictor


def train_gnn_pipeline():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Executing GNN Training on Device: {device}")

    train_set, val_set, test_set, num_drugs, tabular_dim = build_patient_graphs()

    train_loader = DataLoader(train_set, batch_size=64, shuffle=True)
    val_loader = DataLoader(val_set, batch_size=64, shuffle=False)
    test_loader = DataLoader(test_set, batch_size=64, shuffle=False)

    model = RegimenGNNPredictor(
        num_unique_drugs=num_drugs,
        drug_emb_dim=32,
        gnn_hidden_dim=32,
        tabular_dim=tabular_dim,
        dense_hidden_dim=64
    ).to(device)

    # Class imbalance weighting
    criterion = torch.nn.BCEWithLogitsLoss(pos_weight=torch.tensor([3.5]).to(device))
    optimizer = AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    scheduler = ReduceLROnPlateau(optimizer, mode="max", factor=0.5, patience=2)

    best_prauc = 0.0
    checkpoint_path = Path("models/gnn_fall_model.pt")
    checkpoint_path.parent.mkdir(parents=True, exist_ok=True)

    print("\n[Phase GNN] Initiating Graph Optimization Loop (Max 15 Epochs)...")
    for epoch in range(1, 16):
        model.train()
        total_loss = 0.0
        for batch in train_loader:
            batch = batch.to(device)
            optimizer.zero_grad()
            logits, _ = model(batch)
            loss = criterion(logits.view(-1), batch.y.view(-1))
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        # Validation phase
        model.eval()
        val_preds, val_labels = [], []
        with torch.no_grad():
            for batch in val_loader:
                batch = batch.to(device)
                logits, _ = model(batch)
                val_preds.extend(torch.sigmoid(logits).cpu().numpy().ravel())
                val_labels.extend(batch.y.cpu().numpy().ravel())

        precision, recall, _ = precision_recall_curve(val_labels, val_preds)
        val_prauc = float(auc(recall, precision))
        val_auroc = float(roc_auc_score(val_labels, val_preds))
        scheduler.step(val_prauc)

        print(f"Epoch {epoch:02d} | Loss: {total_loss/len(train_loader):.4f} | Val AUROC: {val_auroc:.4f} | Val PR-AUC: {val_prauc:.4f}")

        if val_prauc > best_prauc:
            best_prauc = val_prauc
            torch.save(model.state_dict(), checkpoint_path)

    # Test Evaluation & Edge Attention Extraction
    print("\n--- Evaluating Held-Out Test Set with GNN ---")
    model.load_state_dict(torch.load(checkpoint_path, weights_only=True))
    model.eval()
    test_preds, test_labels = [], []

    with torch.no_grad():
        for batch in test_loader:
            batch = batch.to(device)
            logits, (edge_index, alpha) = model(batch)
            test_preds.extend(torch.sigmoid(logits).cpu().numpy().ravel())
            test_labels.extend(batch.y.cpu().numpy().ravel())

    test_auroc = roc_auc_score(test_labels, test_preds)
    precision, recall, _ = precision_recall_curve(test_labels, test_preds)
    test_prauc = auc(recall, precision)
    brier = brier_score_loss(test_labels, test_preds)

    print("================ Held-Out GNN Test Performance ================")
    print(f"Test AUROC     : {test_auroc:.4f}")
    print(f"Test PR-AUC    : {test_prauc:.4f}")
    print(f"Test Brier     : {brier:.4f}")
    print(f"GNN Model Saved: {checkpoint_path}")
    print("================================================================")

    # Extract sample high-attention interactions from test cohort
    print("\n--- Top Attended Regimen Interaction Pairs (GATv2 Attention) ---")
    sample_batch = next(iter(test_loader)).to(device)
    with torch.no_grad():
        _, (edge_index, alpha) = model(sample_batch)

    alpha_np = alpha.cpu().numpy().ravel()
    ei_np = edge_index.cpu().numpy()

    # Filter out self-loops (where src == dst)
    non_self_idx = np.where(ei_np[0] != ei_np[1])[0]
    if len(non_self_idx) > 0:
        sorted_indices = non_self_idx[np.argsort(-alpha_np[non_self_idx])]
        seen_pairs = set()
        for idx in sorted_indices:
            src = ei_np[0, idx]
            dst = ei_np[1, idx]
            drug_src = sample_batch.node_ids[src].item()
            drug_dst = sample_batch.node_ids[dst].item()
            pair = tuple(sorted([drug_src, drug_dst]))
            if pair not in seen_pairs:
                seen_pairs.add(pair)
                att_score = alpha_np[idx]
                print(f"  • Interaction: Drug Node {pair[0]} <-> Drug Node {pair[1]} | GATv2 Attention Weight: {att_score:.4f}")
            if len(seen_pairs) >= 5:
                break
    else:
        print("  (Sample batch contains independent regimens with self-loop interactions)")


if __name__ == "__main__":
    train_gnn_pipeline()
