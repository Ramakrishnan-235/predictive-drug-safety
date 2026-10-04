"""
MIMIC-IV Data Processing Package.
"""

def build_dataset(dev: bool = False):
    """Load the optional PyHealth pipeline only when it is requested."""
    from .mimic_pipeline import build_dataset as build_mimic_dataset

    return build_mimic_dataset(dev=dev)

__all__ = [
    "build_dataset",
]
