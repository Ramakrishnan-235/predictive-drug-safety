"""2-epoch RETAIN smoke test. If this runs, your entire pipeline is healthy."""
import sys
from pathlib import Path
import torch

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from pyhealth.datasets import get_dataloader, split_by_visit
from pyhealth.datasets.sample_dataset import SampleDataset
from pyhealth.models import RETAIN
from pyhealth.trainer import Trainer
from src.data.mimic_pipeline import build_dataset

# Enable sample_ds.split_by_visit(...) method syntax for SampleDataset
if not hasattr(SampleDataset, "split_by_visit"):
    SampleDataset.split_by_visit = lambda self, ratios, **kwargs: split_by_visit(self, ratios, **kwargs)

# Determine device (prioritize GPU)
if torch.cuda.is_available():
    device = "cuda"
    print(f"🚀 Using GPU: {torch.cuda.get_device_name(0)}")
else:
    device = "cpu"
    print("⚠️ CUDA not available, falling back to CPU")

sample_ds = build_dataset(dev=True)   # small = fast

train_ds, val_ds, test_ds = sample_ds.split_by_visit([0.8, 0.1, 0.1])
train_loader = get_dataloader(train_ds, batch_size=32, shuffle=True)
val_loader = get_dataloader(val_ds, batch_size=32, shuffle=False)

# RETAIN model automatically infers feature_keys and output_schema from dataset
model = RETAIN(
    dataset=sample_ds,
    embedding_dim=128,
)

trainer = Trainer(model=model, device=device, output_path="runs/smoke_retain")
trainer.train(
    train_dataloader=train_loader,
    val_dataloader=val_loader,
    epochs=2,
    monitor="pr_auc_samples",
)

print("\n✅ SMOKE TEST PASSED — full pipeline is healthy. Phase 2 may begin.")
