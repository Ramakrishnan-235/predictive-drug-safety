import polars as pl
import duckdb
from pathlib import Path

VOCAB_DIR = Path("data/vocab")
PROCESSED_DIR = Path("data/processed")
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


def get_vocab_path(name: str) -> str:
    """Finds vocabulary file (.csv or .csv.gz, case-insensitive) and returns a POSIX path."""
    for ext in [".csv", ".csv.gz"]:
        for cand_name in [name, name.upper(), name.lower()]:
            cand = VOCAB_DIR / f"{cand_name}{ext}"
            if cand.exists():
                return cand.as_posix()
    return (VOCAB_DIR / f"{name}.csv").as_posix()


def map_ndc_to_rxnorm():
    con = duckdb.connect()

    concept_file = get_vocab_path("CONCEPT")
    concept_relationship_file = get_vocab_path("CONCEPT_RELATIONSHIP")
    output_file = (PROCESSED_DIR / "ndc_to_rxnorm_map.parquet").as_posix()

    print("Normalizing NDCs to RxNorm Ingredients via OMOP tables...")
    con.execute(f"""
        CREATE OR REPLACE TABLE ndc_rxnorm_map AS
        SELECT 
            c1.concept_code AS source_ndc,
            c2.concept_id AS rxnorm_ingredient_id,
            c2.concept_name AS rxnorm_ingredient_name
        FROM read_csv_auto('{concept_file}') c1
        JOIN read_csv_auto('{concept_relationship_file}') cr 
          ON c1.concept_id = cr.concept_id_1
        JOIN read_csv_auto('{concept_file}') c2 
          ON cr.concept_id_2 = c2.concept_id
        WHERE c1.vocabulary_id = 'NDC'
          AND cr.relationship_id = 'Maps to'
          AND c2.vocabulary_id = 'RxNorm'
          AND c2.concept_class_id = 'Ingredient';
    """)

    con.execute(f"""
        COPY ndc_rxnorm_map TO '{output_file}' (FORMAT PARQUET);
    """)
    print("NDC mapping dictionary successfully exported.")
    con.close()


if __name__ == "__main__":
    if (VOCAB_DIR / "CONCEPT.csv").exists() or (VOCAB_DIR / "concept.csv").exists():
        map_ndc_to_rxnorm()
    else:
        print(f"OMOP tables not detected in {VOCAB_DIR}. Proceeding with string-level extraction.")
