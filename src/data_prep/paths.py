"""Shared discovery of supported MIMIC hospital-table locations."""

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
HOSPITAL_LOCATIONS = (
    "data/raw/mimic4/hosp",
    "data/raw/MIMIC-iv v.2.1/hosp",
    "data/raw/MIMIC-iv v.2.1/hos",
    "data/raw/mimic-iv/hosp",
    "data/raw/mimic-iv-2.1/hosp",
    "data/raw/mimic-iv-2.1/hos",
    "data/raw/hosp",
    "data/raw/hos",
)


def resolve_hospital_directory(project_root: Path = PROJECT_ROOT) -> Path:
    """Prefer a directory containing patient tables over empty placeholder folders."""
    for location in HOSPITAL_LOCATIONS:
        directory = project_root / location
        if any((directory / f"patients{extension}").is_file() for extension in (".csv.gz", ".csv")):
            return directory
    return project_root / HOSPITAL_LOCATIONS[0]


def resolve_table_path(directory: Path, table_name: str) -> Path:
    for extension in (".csv.gz", ".csv"):
        candidate = directory / f"{table_name}{extension}"
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(f"MIMIC table {table_name!r} not found in {directory}")
