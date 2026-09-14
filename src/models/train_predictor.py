import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import torch
from torch.optim import AdamW
from torch.optim.lr_scheduler import ReduceLROnPlateau
import numpy as np
from sklearn.metrics import roc_auc_score, precision_recall_curve, auc, brier_score_loss

from src.models.dataset import prepare_dataloaders
from src.models.fall_risk_model import GeriatricFallPredictor, MultiTaskRiskLoss

MODEL_DIR = Path("models")
MODEL_DIR.mkdir(parents=True, exist_ok=True)

def train_and_evaluate():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Executing model training pipeline on device: {device}")

    # Load partitioned data
    train_loader, val_loader, test_loader, pos_weight, input_dim = prepare_dataloaders()
    
    model = GeriatricFallPredictor(input_dim=input_dim).to(device)
    criterion = MultiTaskRiskLoss(pos_weight=pos_weight, gamma_ddi=0.15).to(device)
    optimizer = AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    scheduler = ReduceLROnPlateau(optimizer, mode="max", factor=0.5, patience=3)

    best_val_prauc = 0.0
    checkpoint_path = MODEL_DIR / "fall_risk_model.pt"

    print("\n[Phase 3] Initiating Optimization Loop (Max 25 Epochs)...")
    for epoch in range(1, 26):
        model.train()
        train_loss = 0.0
        
        for x_batch, y_batch, _ in train_loader:
            x_batch, y_batch = x_batch.to(device), y_batch.to(device)
            optimizer.zero_grad()
            logits = model(x_batch)
            loss, _ = criterion(logits, y_batch, x_batch)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * len(x_batch)

        train_loss /= len(train_loader.dataset)

        # Validation evaluation
        model.eval()
        val_probs, val_targets = [], []
        with torch.no_grad():
            for x_val, y_val, _ in val_loader:
                x_val = x_val.to(device)
                probs = torch.sigmoid(model(x_val)).cpu().numpy()
                val_probs.extend(probs)
                val_targets.extend(y_val.numpy())

        val_probs = np.array(val_probs).ravel()
        val_targets = np.array(val_targets).ravel()
        
        val_auroc = roc_auc_score(val_targets, val_probs)
        precision, recall, _ = precision_recall_curve(val_targets, val_probs)
        val_prauc = float(auc(recall, precision))
        
        scheduler.step(val_prauc)

        print(f"Epoch {epoch:02d} | Train Loss: {train_loss:.4f} | Val AUROC: {val_auroc:.4f} | Val PR-AUC: {val_prauc:.4f}")

        if val_prauc > best_val_prauc:
            best_val_prauc = val_prauc
            torch.save({
                "model_state_dict": model.state_dict(),
                "input_dim": input_dim,
                "best_val_prauc": float(best_val_prauc)
            }, checkpoint_path)

    print(f"\nOptimization complete. Best validation PR-AUC checkpoint saved to: {checkpoint_path}")

    # Final evaluation on locked testing set
    print("\nExecuting Evaluation on Held-Out Test Cohort...")
    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=True)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    test_probs, test_targets, test_hadms = [], [], []
    with torch.no_grad():
        for x_test, y_test, hadm_ids in test_loader:
            x_test = x_test.to(device)
            probs = torch.sigmoid(model(x_test)).cpu().numpy()
            test_probs.extend(probs)
            test_targets.extend(y_test.numpy())
            test_hadms.extend(hadm_ids)

    test_probs = np.array(test_probs).ravel()
    test_targets = np.array(test_targets).ravel()

    test_auroc = roc_auc_score(test_targets, test_probs)
    precision, recall, _ = precision_recall_curve(test_targets, test_probs)
    test_prauc = float(auc(recall, precision))
    brier = float(brier_score_loss(test_targets, test_probs))

    print("================ Held-Out Test Performance ================")
    print(f"Total Test Admissions Evaluated: {len(test_targets)}")
    print(f"ROC-AUC                         : {test_auroc:.4f}")
    print(f"PR-AUC (Primary Metric)         : {test_prauc:.4f}")
    print(f"Brier Score (Calibration)       : {brier:.4f}")
    print("============================================================")

if __name__ == "__main__":
    train_and_evaluate()
