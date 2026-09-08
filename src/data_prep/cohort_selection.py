import duckdb
from pathlib import Path

RAW_DIR = Path("data/raw/hosp")
PROCESSED_DIR = Path("data/processed")
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


def get_table_path(table_name: str) -> str:
    """Finds .csv.gz or .csv for a given table name and returns a POSIX path."""
    for ext in [".csv.gz", ".csv"]:
        p = RAW_DIR / f"{table_name}{ext}"
        if p.exists():
            return p.as_posix()
    return (RAW_DIR / f"{table_name}.csv.gz").as_posix()


def run_cohort_pipeline():
    con = duckdb.connect()

    # Optimize DuckDB engine parameters
    con.execute("PRAGMA threads=8;")
    con.execute("PRAGMA memory_limit='16GB';")

    admissions_file = get_table_path("admissions")
    patients_file = get_table_path("patients")
    diagnoses_file = get_table_path("diagnoses_icd")
    prescriptions_file = get_table_path("prescriptions")
    labevents_file = get_table_path("labevents")

    print("[1/5] Extracting Geriatric Admissions (Age >= 65, Stay >= 24h)...")
    con.execute(f"""
        CREATE OR REPLACE TABLE cohort_base AS
        SELECT 
            adm.subject_id,
            adm.hadm_id,
            adm.admittime,
            adm.dischtime,
            adm.admission_type,
            pat.gender,
            pat.anchor_age + (EXTRACT(YEAR FROM adm.admittime) - pat.anchor_year) AS age_at_admission
        FROM read_csv_auto('{admissions_file}') adm
        JOIN read_csv_auto('{patients_file}') pat
          ON adm.subject_id = pat.subject_id
        WHERE (pat.anchor_age + (EXTRACT(YEAR FROM adm.admittime) - pat.anchor_year)) >= 65
          AND adm.dischtime >= adm.admittime + INTERVAL 24 HOUR;
    """)

    print("[2/5] Tagging Fall, Syncope, and Fracture Target Events...")
    con.execute(f"""
        CREATE OR REPLACE TABLE fall_labels AS
        SELECT 
            hadm_id,
            MAX(CASE 
                -- Fall mechanism codes
                WHEN icd_version = 9 AND (
                    icd_code LIKE 'E880%' OR icd_code LIKE 'E881%' OR 
                    icd_code LIKE 'E882%' OR icd_code LIKE 'E884%' OR 
                    icd_code LIKE 'E885%' OR icd_code LIKE 'E888%'
                ) THEN 1
                WHEN icd_version = 10 AND (
                    icd_code LIKE 'W00%' OR icd_code LIKE 'W01%' OR 
                    icd_code LIKE 'W02%' OR icd_code LIKE 'W03%' OR 
                    icd_code LIKE 'W04%' OR icd_code LIKE 'W05%' OR 
                    icd_code LIKE 'W06%' OR icd_code LIKE 'W07%' OR 
                    icd_code LIKE 'W08%' OR icd_code LIKE 'W10%' OR 
                    icd_code LIKE 'W18%' OR icd_code LIKE 'W19%'
                ) THEN 1
                -- Syncope & Collapse
                WHEN icd_version = 9 AND icd_code = '7802' THEN 1
                WHEN icd_version = 10 AND icd_code = 'R55' THEN 1
                -- Femur / Hip Fractures (direct fall complications)
                WHEN icd_version = 9 AND icd_code LIKE '820%' THEN 1
                WHEN icd_version = 10 AND icd_code LIKE 'S72%' THEN 1
                ELSE 0 
            END) AS fall_target_label
        FROM read_csv_auto('{diagnoses_file}')
        GROUP BY hadm_id;
    """)

    print("[3/5] Aggregating Prescriptions for Polypharmacy (>= 5 Unique Drugs)...")
    con.execute(f"""
        CREATE OR REPLACE TABLE polypharmacy_filter AS
        SELECT 
            hadm_id,
            COUNT(DISTINCT drug) AS unique_drug_count,
            LIST(DISTINCT drug) AS drug_name_list,
            LIST(DISTINCT ndc) AS ndc_list
        FROM read_csv_auto('{prescriptions_file}')
        WHERE drug IS NOT NULL AND drug != ''
        GROUP BY hadm_id
        HAVING COUNT(DISTINCT drug) >= 5;
    """)

    print("[4/5] Extracting Renal Function Markers (Serum Creatinine)...")
    con.execute(f"""
        CREATE OR REPLACE TABLE renal_labs AS
        SELECT 
            hadm_id,
            MIN(valuenum) AS min_creatinine,
            MAX(valuenum) AS max_creatinine,
            AVG(valuenum) AS avg_creatinine
        FROM read_csv_auto('{labevents_file}')
        WHERE itemid = 50912 
          AND valuenum IS NOT NULL 
          AND valuenum > 0 
          AND valuenum < 30
        GROUP BY hadm_id;
    """)

    print("[5/5] Compiling Final Cohort & Exporting to Parquet...")
    con.execute(f"""
        CREATE OR REPLACE TABLE final_cohort AS
        SELECT 
            b.subject_id,
            b.hadm_id,
            b.admittime,
            b.dischtime,
            b.gender,
            b.age_at_admission,
            p.unique_drug_count,
            p.drug_name_list,
            p.ndc_list,
            r.min_creatinine,
            r.max_creatinine,
            r.avg_creatinine,
            COALESCE(f.fall_target_label, 0) AS fall_target_label
        FROM cohort_base b
        INNER JOIN polypharmacy_filter p ON b.hadm_id = p.hadm_id
        LEFT JOIN fall_labels f ON b.hadm_id = f.hadm_id
        LEFT JOIN renal_labs r ON b.hadm_id = r.hadm_id;
    """)

    output_file = (PROCESSED_DIR / "geriatric_fall_cohort.parquet").as_posix()
    con.execute(f"COPY final_cohort TO '{output_file}' (FORMAT PARQUET);")

    # Generate demographic and label balance statistics
    stats = con.execute("""
        SELECT 
            COUNT(DISTINCT subject_id) AS total_patients,
            COUNT(DISTINCT hadm_id) AS total_admissions,
            ROUND(AVG(age_at_admission), 2) AS mean_age,
            ROUND(AVG(unique_drug_count), 2) AS mean_drugs_per_stay,
            SUM(fall_target_label) AS positive_fall_admissions,
            ROUND(SUM(fall_target_label) * 100.0 / COUNT(*), 2) AS fall_prevalence_pct
        FROM final_cohort;
    """).fetchdf()

    print("\n================ Cohort Extraction Metrics ================")
    print(stats.to_string(index=False))
    print(f"\nCohort saved successfully to: {output_file}")
    con.close()


# Alias for backward compatibility
build_geriatric_fall_cohort = run_cohort_pipeline


if __name__ == "__main__":
    run_cohort_pipeline()
