import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import torch
from captum.attr import IntegratedGradients
import numpy as np
from typing import List, Dict, Tuple, Any

from src.models.fall_risk_model import GeriatricFallPredictor
from src.models.dataset import NUMERICAL_COLS, BINARY_RULE_COLS

FEATURE_NAMES = NUMERICAL_COLS + BINARY_RULE_COLS


class PatientRiskAttributor:
    def __init__(self, checkpoint_path: str = "models/fall_risk_model.pt", device: str = None):
        self.device = torch.device(device if device else ("cuda" if torch.cuda.is_available() else "cpu"))
        
        checkpoint = torch.load(checkpoint_path, map_location=self.device, weights_only=True)
        self.model = GeriatricFallPredictor(input_dim=checkpoint["input_dim"]).to(self.device)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.eval()
        
        self.ig = IntegratedGradients(self.model)

    def explain_admission(
        self, 
        feature_tensor: torch.Tensor, 
        top_k: int = 5
    ) -> Tuple[float, List[Dict[str, Any]]]:
        """Calculates predicted probability and extracts top-k contributing features."""
        x = feature_tensor.to(self.device).unsqueeze(0) if feature_tensor.dim() == 1 else feature_tensor.to(self.device)
        baseline = torch.zeros_like(x)

        with torch.no_grad():
            prob = torch.sigmoid(self.model(x)).item()

        # Integrated Gradients attribution
        attributions, delta = self.ig.attribute(
            x, 
            baseline, 
            target=None, 
            return_convergence_delta=True
        )
        
        attr_scores = attributions.squeeze(0).cpu().detach().numpy()
        raw_values = x.squeeze(0).cpu().detach().numpy()

        # Rank features by positive contribution to fall risk
        ranked_indices = np.argsort(-attr_scores)
        
        top_drivers = []
        for idx in ranked_indices[:top_k]:
            top_drivers.append({
                "feature": FEATURE_NAMES[idx],
                "attribution_weight": float(attr_scores[idx]),
                "raw_value": float(raw_values[idx])
            })

        return prob, top_drivers


if __name__ == "__main__":
    attributor = PatientRiskAttributor()
    # Dummy input vector with 19 features
    dummy_input = torch.randn(len(FEATURE_NAMES))
    pred_prob, drivers = attributor.explain_admission(dummy_input, top_k=5)
    print(f"Sample Predicted Fall Probability: {pred_prob:.4f}")
    print("Top Contributing Drivers:")
    for d in drivers:
        print(f"  - {d['feature']}: weight={d['attribution_weight']:.4f}, raw_value={d['raw_value']:.4f}")
