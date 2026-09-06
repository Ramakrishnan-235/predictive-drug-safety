import duckdb
import os
import polars as pl
from pathlib import Path

# Paths
CANDIDATE_PATHS = [
    Path("data/raw/hosp"),
    Path("data/raw/mimic4/hosp"),
    Path("data/raw/MIMIC-iv v.2.1/hosp"),
    Path("data/raw/MIMIC-iv v.2.1/hos"),
]
RAW_DATA_DIR = next((p for p in CANDIDATE_PATHS if p.exists()), Path("data/raw/hosp"))
PROCESSED_DATA_DIR = Path("data/processed")
PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_table_path(table_name: str) -> str:
    """Finds .csv.gz or .csv for a given table name and returns a POSIX path."""
    for ext in [".csv.gz", ".csv"]:
        p = RAW_DATA_DIR / f"{table_name}{ext}"
        if p.exists():
            return p.as_posix()
    return (RAW_DATA_DIR / f"{table_name}.csv.gz").as_posix()


def build_geriatric_fall_cohort():
    con = duckdb.connect()

    # Enable multithreading and memory capping
    con.execute("PRAGMA threads=8;")
    con.execute("PRAGMA memory_limit='16GB';")

    admissions_file = get_table_path("admissions")
    patients_file = get_table_path("patients")
    diagnoses_file = get_table_path("diagnoses_icd")
    prescriptions_file = get_table_path("prescriptions")

    print("[1/5] Extracting Geriatric Admissions (Age >= 65)...")
    con.execute(f"""
        CREATE OR REPLACE TABLE cohort_base AS
        SELECT 
            adm.subject_id,
            adm.hadm_id,
            adm.admittime,
            adm.dischtime,
            adm.admission_type,
            adm.hospital_expire_flag,
            pat.gender,
            pat.anchor_age + (EXTRACT(YEAR FROM adm.admittime) - pat.anchor_year) AS age_at_admission
        FROM read_csv_auto('{admissions_file}') adm
        JOIN read_csv_auto('{patients_file}') pat
          ON adm.subject_id = pat.subject_id
        WHERE (pat.anchor_age + (EXTRACT(YEAR FROM adm.admittime) - pat.anchor_year)) >= 65
          AND adm.dischtime >= adm.admittime + INTERVAL 24 HOUR;
    """)

    print("[2/5] Identifying Fall, Syncope, and Fracture Events...")
    # Matches ICD-9 (E880-E888, 780.2, 800-829) and ICD-10 (W00-W19, R55, S02-S92 fractures)
    con.execute(f"""
        CREATE OR REPLACE TABLE fall_labels AS
        SELECT 
            hadm_id,
            MAX(CASE 
                -- Fall mechanism codes
                WHEN icd_version = 9 AND (icd_code LIKE 'E880%' OR icd_code LIKE 'E881%' OR icd_code LIKE 'E882%' OR icd_code LIKE 'E884%' OR icd_code LIKE 'E885%' OR icd_code LIKE 'E888%') THEN 1
                WHEN icd_version = 10 AND (icd_code LIKE 'W00%' OR icd_code LIKE 'W01%' OR icd_code LIKE 'W02%' OR icd_code LIKE 'W03%' OR icd_code LIKE 'W04%' OR icd_code LIKE 'W05%' OR icd_code LIKE 'W06%' OR icd_code LIKE 'W07%' OR icd_code LIKE 'W08%' OR icd_code LIKE 'W10%' OR icd_code LIKE 'W18%' OR icd_code LIKE 'W19%') THEN 1
                -- Syncope & collapse
                WHEN icd_version = 9 AND icd_code = '7802' THEN 1
                WHEN icd_version = 10 AND icd_code = 'R55' THEN 1
                -- Hip & Femur Fractures (common fall outcomes)
                WHEN icd_version = 9 AND icd_code LIKE '820%' THEN 1
                WHEN icd_version = 10 AND icd_code LIKE 'S72%' THEN 1
                ELSE 0 
            END) AS fall_target_label
        FROM read_csv_auto('{diagnoses_file}')
        GROUP BY hadm_id;
    """)

    print("[3/5] Aggregating Prescriptions & Filtering for Polypharmacy (>= 5 drugs)...")
    con.execute(f"""
        CREATE OR REPLACE TABLE medication_summary AS
        SELECT 
            hadm_id,
            COUNT(DISTINCT drug) AS unique_drug_count,
            LIST(DISTINCT drug) AS drug_list,
            LIST(DISTINCT ndc) AS ndc_list
        FROM read_csv_auto('{prescriptions_file}')
        WHERE drug IS NOT NULL AND drug != ''
        GROUP BY hadm_id
        HAVING COUNT(DISTINCT drug) >= 5;
    """)

    print("[4/5] Extracting Renal Baseline Labs (Serum Creatinine, eGFR indicator)...")
    # itemid 50912 = Creatinine (Blood)
    labevents_file = None
    for ext in [".csv.gz", ".csv"]:
        cand = RAW_DATA_DIR / f"labevents{ext}"
        if cand.exists():
            labevents_file = cand.as_posix()
            break

    if labevents_file:
        con.execute(f"""
            CREATE OR REPLACE TABLE renal_labs AS
            SELECT 
                hadm_id,
                MIN(valuenum) AS min_creatinine,
                MAX(valuenum) AS max_creatinine,
                AVG(valuenum) AS avg_creatinine
            FROM read_csv_auto('{labevents_file}')
            WHERE itemid = 50912 AND valuenum IS NOT NULL AND valuenum > 0
            GROUP BY hadm_id;
        """)
    else:
        print("  (labevents file not found in RAW_DATA_DIR; initializing renal_labs columns with NULLs)")
        con.execute("""
            CREATE OR REPLACE TABLE renal_labs (
                hadm_id BIGINT,
                min_creatinine DOUBLE,
                max_creatinine DOUBLE,
                avg_creatinine DOUBLE
            );
        """)

    print("[5/5] Joining Master Dataset & Exporting Parquet...")
    con.execute(f"""
        CREATE OR REPLACE TABLE final_cohort AS
        SELECT 
            b.subject_id,
            b.hadm_id,
            b.admittime,
            b.dischtime,
            b.gender,
            b.age_at_admission,
            m.unique_drug_count,
            m.drug_list,
            m.ndc_list,
            COALESCE(l.min_creatinine, NULL) AS min_creatinine,
            COALESCE(l.avg_creatinine, NULL) AS avg_creatinine,
            COALESCE(f.fall_target_label, 0) AS fall_target_label
        FROM cohort_base b
        INNER JOIN medication_summary m ON b.hadm_id = m.hadm_id
        LEFT JOIN fall_labels f ON b.hadm_id = f.hadm_id
        LEFT JOIN renal_labs l ON b.hadm_id = l.hadm_id;
    """)

    output_path = (PROCESSED_DATA_DIR / "geriatric_fall_cohort.parquet").as_posix()
    con.execute(f"COPY final_cohort TO '{output_path}' (FORMAT PARQUET);")

    # Fetch summary stats
    summary = con.execute("""
        SELECT 
            COUNT(DISTINCT subject_id) AS total_patients,
            COUNT(DISTINCT hadm_id) AS total_admissions,
            AVG(age_at_admission) AS mean_age,
            AVG(unique_drug_count) AS mean_drugs,
            SUM(fall_target_label) AS positive_fall_admissions,
            ROUND(SUM(fall_target_label) * 100.0 / COUNT(*), 2) AS fall_prevalence_pct
        FROM final_cohort;
    """).fetchdf()

    print("\n--- Cohort Extraction Summary ---")
    print(summary.to_string(index=False))
    con.close()


if __name__ == "__main__":
    build_geriatric_fall_cohort()
