import pytest

from src.data_prep.paths import resolve_hospital_directory, resolve_table_path


@pytest.mark.parametrize("location", ["data/raw/mimic4/hosp", "data/raw/MIMIC-iv v.2.1/hos", "data/raw/hosp"])
def test_discovers_supported_hospital_layouts(tmp_path, location):
    directory = tmp_path / location
    directory.mkdir(parents=True)
    (directory / "patients.csv.gz").touch()
    assert resolve_hospital_directory(tmp_path) == directory


def test_empty_preferred_folder_does_not_hide_existing_tables(tmp_path):
    (tmp_path / "data/raw/mimic4/hosp").mkdir(parents=True)
    directory = tmp_path / "data/raw/hosp"
    directory.mkdir(parents=True)
    (directory / "patients.csv").touch()
    assert resolve_hospital_directory(tmp_path) == directory


def test_table_resolution_supports_compressed_and_uncompressed_files(tmp_path):
    uncompressed = tmp_path / "admissions.csv"
    uncompressed.touch()
    assert resolve_table_path(tmp_path, "admissions") == uncompressed
    compressed = tmp_path / "admissions.csv.gz"
    compressed.touch()
    assert resolve_table_path(tmp_path, "admissions") == compressed


def test_missing_table_has_actionable_error(tmp_path):
    with pytest.raises(FileNotFoundError, match="admissions"):
        resolve_table_path(tmp_path, "admissions")
