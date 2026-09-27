import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple


class GeriatricFallPredictor(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int = 64, dropout_rate: float = 0.3):
        super().__init__()

        # Feature representation layers
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.BatchNorm1d(hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(dropout_rate)
        )

        # Primary head: Calibrated acute fall/syncope probability
        self.risk_head = nn.Linear(hidden_dim // 2, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        latent = self.encoder(x)
        logits = self.risk_head(latent)
        return logits


class MultiTaskRiskLoss(nn.Module):
    def __init__(self, pos_weight: float = 1.0, gamma_ddi: float = 0.15):
        super().__init__()
        self.pos_weight = torch.tensor([pos_weight], dtype=torch.float32)
        self.gamma_ddi = gamma_ddi

    def to(self, device):
        self.pos_weight = self.pos_weight.to(device)
        return super().to(device)

    def forward(self, logits: torch.Tensor, targets: torch.Tensor, inputs: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        # 1. Primary classification loss: Weighted Binary Cross-Entropy
        # Ensure pos_weight is on the same device as logits
        if self.pos_weight.device != logits.device:
            self.pos_weight = self.pos_weight.to(logits.device)

        bce_loss = F.binary_cross_entropy_with_logits(
            logits, targets, pos_weight=self.pos_weight
        )

        # 2. Pharmacological safety loss: Regimen DDI coupling penalty
        # Column index 6 corresponds to wDDI score from NUMERICAL_COLS
        probs = torch.sigmoid(logits)
        w_ddi = inputs[:, 6].unsqueeze(1)

        # Un-center / scale if standardized (negative values from z-scoring), so the penalty applies to all patients
        if (w_ddi < 0).any():
            w_ddi_normalized = (w_ddi - w_ddi.min()) / (w_ddi.max() - w_ddi.min() + 1e-8)
        else:
            w_ddi_normalized = torch.clamp(w_ddi, 0.0, 1.0)

        # Pharmacological safety constraint:
        # Penalizes under-predicting fall risk for patients with severe drug-drug interactions.
        # Enforces that predicted fall probability does not fall below the patient's DDI hazard burden.
        ddi_penalty = torch.mean(F.relu(w_ddi_normalized - probs))

        total_loss = bce_loss + self.gamma_ddi * ddi_penalty
        return total_loss, bce_loss
