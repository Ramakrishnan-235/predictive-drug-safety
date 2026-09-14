import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GATv2Conv, global_mean_pool, global_max_pool
from typing import Tuple


class RegimenGNNPredictor(nn.Module):
    def __init__(
        self, 
        num_unique_drugs: int, 
        drug_emb_dim: int = 32, 
        gnn_hidden_dim: int = 32, 
        tabular_dim: int = 16, 
        dense_hidden_dim: int = 64,
        heads: int = 2,
        dropout: float = 0.25
    ):
        super().__init__()
        
        # 1. Drug Node Representation Layer
        self.drug_embedding = nn.Embedding(num_unique_drugs, drug_emb_dim)
        
        # 2. Graph Attention Message Passing Layers (GATv2)
        # Note: add_self_loops=False because self-loops with weights are pre-constructed in graph_dataset
        self.gat1 = GATv2Conv(
            in_channels=drug_emb_dim, 
            out_channels=gnn_hidden_dim, 
            heads=heads, 
            edge_dim=1,
            concat=True,
            add_self_loops=False
        )
        self.gat2 = GATv2Conv(
            in_channels=gnn_hidden_dim * heads, 
            out_channels=gnn_hidden_dim, 
            heads=1, 
            edge_dim=1,
            concat=False,
            add_self_loops=False
        )
        
        # 3. Graph Regimen Readout Dimension (Mean + Max pooling concatenated)
        regimen_vector_dim = gnn_hidden_dim * 2
        
        # 4. Multimodal Fusion Head (Graph Regimen + Tabular Clinical EHR)
        fusion_dim = regimen_vector_dim + tabular_dim
        self.classifier = nn.Sequential(
            nn.Linear(fusion_dim, dense_hidden_dim),
            nn.BatchNorm1d(dense_hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(dense_hidden_dim, dense_hidden_dim // 2),
            nn.BatchNorm1d(dense_hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(dense_hidden_dim // 2, 1)
        )
        self.dropout = dropout

    def forward(self, batch) -> Tuple[torch.Tensor, Tuple[torch.Tensor, torch.Tensor]]:
        # Map drug indices to continuous vectors
        x = self.drug_embedding(batch.node_ids)
        
        # GAT Layer 1
        x = self.gat1(x, batch.edge_index, batch.edge_attr)
        x = F.elu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)
        
        # GAT Layer 2 (capturing attention weights for explainability)
        x, (edge_index, alpha) = self.gat2(
            x, batch.edge_index, batch.edge_attr, return_attention_weights=True
        )
        x = F.elu(x)
        
        # Global Graph Pooling (Aggregate drug nodes into patient regimen embedding)
        batch_idx = batch.batch if hasattr(batch, "batch") and batch.batch is not None else torch.zeros(x.size(0), dtype=torch.long, device=x.device)
        h_mean = global_mean_pool(x, batch_idx)
        h_max = global_max_pool(x, batch_idx)
        z_regimen = torch.cat([h_mean, h_max], dim=1)
        
        # Ensure clinical tabular tensor matches batch dimension
        clinical_x = batch.clinical_x
        if clinical_x.dim() == 1:
            clinical_x = clinical_x.unsqueeze(0)
            
        # Multimodal Fusion
        z_combined = torch.cat([z_regimen, clinical_x], dim=1)
        logits = self.classifier(z_combined)
        
        return logits, (edge_index, alpha)


if __name__ == "__main__":
    from torch_geometric.data import Data, Batch

    # Sanity check with dummy graphs
    print("Testing RegimenGNNPredictor architecture...")
    model = RegimenGNNPredictor(num_unique_drugs=100, tabular_dim=16)
    
    d1 = Data(
        node_ids=torch.tensor([1, 5, 12]),
        edge_index=torch.tensor([[0, 1, 0, 1, 2], [1, 0, 0, 1, 2]]),
        edge_attr=torch.tensor([[0.75], [0.75], [0.1], [0.1], [0.1]]),
        clinical_x=torch.randn(1, 16),
        num_nodes=3
    )
    d2 = Data(
        node_ids=torch.tensor([8, 22]),
        edge_index=torch.tensor([[0, 1], [0, 1]]),
        edge_attr=torch.tensor([[0.1], [0.1]]),
        clinical_x=torch.randn(1, 16),
        num_nodes=2
    )

    batch = Batch.from_data_list([d1, d2])
    logits, (ei, alpha) = model(batch)
    probs = torch.sigmoid(logits)
    
    print(f"Model forward pass successful:")
    print(f"  Logits shape          : {logits.shape}")
    print(f"  Predicted Fall Probs  : {probs.squeeze().tolist()}")
    print(f"  Attention edge_index  : {ei.shape}")
    print(f"  Attention alpha weights: {alpha.shape}")
