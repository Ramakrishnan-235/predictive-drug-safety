"""
GeriSafe CDSS Inpatient Ward 4B Dataset & FHIR Generator
Provides census data for 48 active inpatients, ward KPIs, distribution stratums,
and FHIR R4 Bundle generation.
"""

from typing import List, Dict, Any, Optional
import datetime
import uuid

# Base cohort data matching the exact screenshot
PRIMARY_INPATIENTS: List[Dict[str, Any]] = [
    {
        "hadm_id": 88421,
        "mrn": "#MRN-88421",
        "name": "Eleanor Vance",
        "initials": "EV",
        "age": 84,
        "gender": "FEMALE",
        "bed": "Bed 402-A",
        "ward": "Acute Care Unit 4B",
        "los_days": 1,
        "code_status": "Full Code",
        "acuity_tier": "Critical",
        "risk_percentage": 68.4,
        "trend": "up",
        "drug_count": 16,
        "prn_count": 3,
        "creatinine": 1.80,
        "renal_egfr": 28,
        "renal_stage": "CKD 4 (Cr 1.8)",
        "blood_pressure": "114/68",
        "bp_drop": -22,
        "primary_pim": {"label": "Z-Drug (Zolpidem 10mg)", "severity": "critical"},
        "secondary_pim": "Diuretic (Furosemide 40mg)",
        "high_risk_meds": ["Zolpidem 10mg", "Furosemide 40mg"],
        "primary_recommendation": "Taper Zolpidem; initiate sleep hygiene protocol",
        "recommendation_tags": "BEERS 2023 · HIGH SEDATION RISK",
        "review_badge": "Unreviewed",
        "review_time": "Admitted 2h ago",
        "reviewer_info": "Admitted 2h ago"
    },
    {
        "hadm_id": 77319,
        "mrn": "#MRN-77319",
        "name": "Arthur Pendelton",
        "initials": "AP",
        "age": 79,
        "gender": "MALE",
        "bed": "Bed 404-B",
        "ward": "Acute Care Unit 4B",
        "los_days": 2,
        "code_status": "Full Code",
        "acuity_tier": "Critical",
        "risk_percentage": 58.2,
        "trend": "up",
        "drug_count": 14,
        "prn_count": 2,
        "creatinine": 1.50,
        "renal_egfr": 34,
        "renal_stage": "CKD 3b (Cr 1.5)",
        "blood_pressure": "118/70",
        "bp_drop": -18,
        "primary_pim": {"label": "BZD (Lorazepam 1mg)", "severity": "critical"},
        "secondary_pim": "Diuretic (Furosemide PM)",
        "high_risk_meds": ["Lorazepam 1mg", "Furosemide PM"],
        "primary_recommendation": "Deprescribe Furosemide PM; orthostatic BP eval",
        "recommendation_tags": "NOCTURIA HAZARD · STOPP SEC B",
        "review_time": "Reviewed 45m ago",
        "review_actor": "By Dr. Chen",
        "reviewer_info": "Reviewed 45m ago By Dr. Chen"
    },
    {
        "hadm_id": 64210,
        "mrn": "#MRN-64210",
        "name": "Clara Higgins",
        "initials": "CH",
        "age": 88,
        "gender": "FEMALE",
        "bed": "Bed 407-A",
        "ward": "Acute Care Unit 4B",
        "los_days": 3,
        "code_status": "Full Code",
        "acuity_tier": "High",
        "risk_percentage": 44.7,
        "trend": "up",
        "drug_count": 12,
        "prn_count": 1,
        "creatinine": 1.10,
        "renal_egfr": 58,
        "renal_stage": "CKD 3a (Cr 1.1)",
        "blood_pressure": "126/74",
        "bp_drop": -15,
        "primary_pim": {"label": "Anticholinergic (ACB 3)", "severity": "high"},
        "secondary_pim": "Antihistamine (Diphenhydramine)",
        "high_risk_meds": ["Anticholinergic (ACB 3)", "Antihistamine (Diphenhydramine)"],
        "primary_recommendation": "Anticholinergic reduction (ACB 4 → 1)",
        "recommendation_tags": "DELIRIUM PROTOCOL ACTIVE",
        "review_time": "Reviewed 2h ago",
        "review_actor": "By PharmD Vance",
        "reviewer_info": "Reviewed 2h ago By PharmD Vance"
    },
    {
        "hadm_id": 55902,
        "mrn": "#MRN-55902",
        "name": "Walter Kowalski",
        "initials": "WK",
        "age": 81,
        "gender": "MALE",
        "bed": "Bed 410-C",
        "ward": "Acute Care Unit 4B",
        "los_days": 4,
        "code_status": "DNR/DNI",
        "acuity_tier": "High",
        "risk_percentage": 42.1,
        "trend": "up",
        "drug_count": 15,
        "prn_count": 4,
        "creatinine": 2.10,
        "renal_egfr": 24,
        "renal_stage": "CKD 4 (Cr 2.1)",
        "blood_pressure": "110/65",
        "bp_drop": -20,
        "primary_pim": {"label": "Opioid (Oxycodone 5mg)", "severity": "critical"},
        "secondary_pim": "Gabapentin 300mg",
        "high_risk_meds": ["Opioid (Oxycodone 5mg)", "Gabapentin 300mg"],
        "primary_recommendation": "Renal dose adjust Gabapentin to 100mg QHS",
        "recommendation_tags": "ACCUMULATION ATAXIA HAZARD",
        "review_time": "Reviewed 3h ago",
        "review_actor": "By Dr. Chen",
        "reviewer_info": "Reviewed 3h ago By Dr. Chen"
    },
    {
        "hadm_id": 90214,
        "mrn": "#MRN-90214",
        "name": "Margaret DuPont",
        "initials": "MD",
        "age": 76,
        "gender": "FEMALE",
        "bed": "Bed 412-B",
        "ward": "Acute Care Unit 4B",
        "los_days": 3,
        "code_status": "Full Code",
        "acuity_tier": "Moderate",
        "risk_percentage": 21.5,
        "trend": "neutral",
        "drug_count": 9,
        "prn_count": 1,
        "creatinine": 0.90,
        "renal_egfr": 72,
        "renal_stage": "CKD 2 (Cr 0.9)",
        "blood_pressure": "134/78",
        "bp_drop": -14,
        "primary_pim": {"label": "Antihypertensive (Amlodipine)", "severity": "neutral"},
        "high_risk_meds": ["Antihypertensive (Amlodipine)"],
        "primary_recommendation": "Monitor seated/standing blood pressure delta",
        "recommendation_tags": "POSTURAL STABILITY FLAG ON PT",
        "review_time": "Reviewed 5h ago",
        "review_actor": "By RN Sarah",
        "reviewer_info": "Reviewed 5h ago By RN Sarah"
    },
    {
        "hadm_id": 43187,
        "mrn": "#MRN-43187",
        "name": "Harold Jenkins",
        "initials": "HJ",
        "age": 73,
        "gender": "MALE",
        "bed": "Bed 415-A",
        "ward": "Acute Care Unit 4B",
        "los_days": 5,
        "code_status": "Full Code",
        "acuity_tier": "Low",
        "risk_percentage": 14.3,
        "trend": "down",
        "drug_count": 6,
        "prn_count": 0,
        "creatinine": 0.80,
        "renal_egfr": 88,
        "renal_stage": "CKD 1/2 (Cr 0.8)",
        "blood_pressure": "122/74",
        "bp_drop": -4,
        "primary_pim": {"label": "Statin (Atorvastatin 20mg)", "severity": "neutral"},
        "secondary_pim": "Beta-blocker (Bisoprolol 2.5)",
        "high_risk_meds": ["Statin (Atorvastatin 20mg)", "Beta-blocker (Bisoprolol 2.5)"],
        "primary_recommendation": "Optimal regimen maintained; discharge review",
        "recommendation_tags": "NO CDSS ALERTS ACTIVE",
        "review_time": "Reviewed 6h ago",
        "review_actor": "Discharge ready",
        "reviewer_info": "Reviewed 6h ago Discharge ready"
    }
]

ADDITIONAL_PATIENT_NAMES = [
    ("Clara Oswald", 79, "FEMALE", "Bed 402-A", 48.5, "High", 11, 2, 1.45, 41, "CKD 3b", ["Zolpidem 5mg", "Furosemide 20mg"], ["Z-Drug fall risk flagged", "Taper to sleep hygiene protocol"]),
    ("George Washington Gale", 85, "MALE", "Bed 402-B", 54.2, "High", 13, 1, 1.60, 36, "CKD 3b", ["Haloperidol 0.5mg", "Clonazepam"], ["Antipsychotic + Benzodiazepine synergism", "High extrapyramidal ataxia risk"]),
    ("Beatrice Montgomery", 82, "FEMALE", "Bed 403-A", 42.1, "High", 10, 0, 1.30, 48, "CKD 3a", ["Oxycodone 5mg", "Pregabalin"], ["Opioid + Gabapentinoid sedation alert", "Bedside fall alarm activated"]),
    ("Donald Fletcher", 77, "MALE", "Bed 403-B", 46.8, "High", 12, 2, 1.55, 38, "CKD 3b", ["Hydrochlorothiazide", "Temazepam"], ["Diuretic volume depletion + BZD", "Standing systolic drop -19 mmHg"]),
    ("Florence Nightingale Davis", 88, "FEMALE", "Bed 404-A", 59.4, "High", 14, 3, 1.70, 32, "CKD 3b", ["Alprazolam 0.5mg", "Furosemide"], ["Severe Beers PIM violation", "Pharmacist consult requested for taper"]),
    ("Samuel Brooks", 83, "MALE", "Bed 404-B", 51.0, "High", 11, 1, 1.40, 43, "CKD 3b", ["Tamsulosin 0.4mg", "Lisinopril"], ["Alpha-1 blocker first-dose syncope risk", "Monitor night-time bathroom transfers"]),
    ("Dorothy Higgins", 80, "FEMALE", "Bed 406-A", 45.2, "High", 9, 2, 1.35, 45, "CKD 3a", ["Sertraline 50mg", "Zolpidem"], ["Hyponatremia hazard + sedative hip fracture risk", "Check serum sodium levels"]),
    ("Leonard McCoy", 75, "MALE", "Bed 406-B", 43.6, "High", 10, 1, 1.25, 52, "CKD 3a", ["Amiodarone", "Metoprolol"], ["Bradycardia + conduction delay risk", "Telemetry continuous monitoring active"]),
    ("Alice Henderson", 84, "FEMALE", "Bed 407-A", 38.2, "Moderate", 8, 1, 1.10, 56, "CKD 3a", ["Citalopram 20mg"], ["QTc prolongation screening recommended", "Physical therapy gait assessment scheduled"]),
    ("Frank Castle", 78, "MALE", "Bed 407-B", 35.4, "Moderate", 9, 0, 1.05, 60, "CKD 2", ["Carvedilol 12.5mg"], ["Mild orthostatic sensation on chair stand", "Blood pressure log recorded TID"]),
    ("Grace Kelly", 81, "FEMALE", "Bed 409-A", 39.8, "Moderate", 10, 2, 1.20, 50, "CKD 3a", ["Gabapentin 300mg"], ["Dose adjusted for CrCl 48 mL/min", "No active contraindications"]),
    ("Henry Higgins", 80, "MALE", "Bed 409-B", 32.5, "Moderate", 8, 1, 1.00, 64, "CKD 2", ["Losartan 50mg"], ["Preserved balance score", "Scheduled for routine discharge planning"]),
    ("Irene Adler", 74, "FEMALE", "Bed 411-A", 28.6, "Moderate", 7, 0, 0.90, 71, "CKD 2", ["Levothyroxine", "Atorvastatin"], ["Stable chronic pharmacotherapy", "Routine vitals within parameters"]),
    ("James Wilson", 82, "MALE", "Bed 411-B", 36.1, "Moderate", 9, 1, 1.15, 54, "CKD 3a", ["Spironolactone 25mg"], ["Monitor potassium levels", "Mild nocturia reported"]),
    ("Katherine Johnson", 89, "FEMALE", "Bed 413-A", 37.9, "Moderate", 10, 2, 1.20, 49, "CKD 3a", ["Donepezil 5mg", "Memantine"], ["Cognitive baseline stable", "Fall mat placed at bedside"]),
    ("Lawrence Talbot", 79, "MALE", "Bed 413-B", 31.4, "Moderate", 8, 0, 0.95, 66, "CKD 2", ["Metformin 500mg"], ["Renal function safe for biguanide", "Physical therapy assisted walks"]),
    ("Martha Stewart", 85, "FEMALE", "Bed 414-A", 34.7, "Moderate", 9, 1, 1.05, 58, "CKD 3a", ["Omeprazole 20mg", "Calcium"], ["Consider PPI deprescribing review", "Low acute fall probability"]),
    ("Norman Bates", 76, "MALE", "Bed 414-B", 29.8, "Moderate", 7, 1, 0.92, 69, "CKD 2", ["Diltiazem 120mg"], ["Heart rate controlled", "No postural drops detected"]),
    ("Ophelia Palmer", 83, "FEMALE", "Bed 416-A", 33.2, "Moderate", 8, 0, 1.10, 55, "CKD 3a", ["Apixaban 2.5mg BID"], ["Renal dosing verified", "Fall precautions maintained"]),
    ("Patrick Stewart", 81, "MALE", "Bed 416-B", 27.5, "Moderate", 7, 1, 0.88, 73, "CKD 2", ["Aspirin 81mg", "Clopidogrel"], ["Dual antiplatelet therapy reviewed", "Discharge planned 48h"]),
    ("Queenie Goldstein", 77, "FEMALE", "Bed 417-A", 25.4, "Moderate", 6, 0, 0.85, 78, "CKD 2", ["Pantoprazole 40mg"], ["Regimen optimized", "No Beers criteria alerts"]),
    ("Richard Starkey", 82, "MALE", "Bed 417-B", 24.1, "Moderate", 7, 1, 0.90, 72, "CKD 2", ["Warfarin 3mg"], ["INR stable at 2.3", "Assisted ambulation only"]),
    ("Susan Bones", 78, "FEMALE", "Bed 418-A", 26.9, "Moderate", 8, 1, 0.98, 65, "CKD 2", ["Insulin Glargine 14u"], ["No hypoglycemia reported", "Bed rail sensors armed"]),
    ("Thomas Shelby", 84, "MALE", "Bed 418-B", 39.1, "Moderate", 10, 2, 1.25, 51, "CKD 3a", ["Baclofen 10mg"], ["Muscle relaxant sedation risk flagged", "Scheduled for taper evaluation"]),
    ("Ursula Buffay", 86, "FEMALE", "Bed 419-A", 30.5, "Moderate", 8, 0, 1.05, 59, "CKD 3a", ["Hydrocodone/APAP"], ["PRN analgesic use minimal", "Physical therapy cleared for walker"]),
    ("Victor Frankenstein", 80, "MALE", "Bed 419-B", 22.0, "Moderate", 6, 1, 0.82, 81, "CKD 2", ["Allopurinol 100mg"], ["Uric acid target achieved", "Preserved mobility"]),
    ("Wendy Darling", 75, "FEMALE", "Bed 420-A", 23.4, "Moderate", 7, 0, 0.86, 76, "CKD 2", ["Lisinopril 10mg"], ["Stable hemodynamics", "Discharge review queued"]),
    ("Xavier Rhodes", 87, "MALE", "Bed 420-B", 18.9, "Low", 5, 0, 0.78, 86, "CKD 1/2", ["Atorvastatin 10mg"], ["Preserved functional independence", "No fall history"]),
    ("Yvonne Strahovski", 73, "FEMALE", "Bed 421-A", 16.4, "Low", 5, 0, 0.72, 92, "CKD 1/2", ["Levothyroxine 50mcg"], ["Optimal medication adherence", "Discharge in 24h"]),
    ("Zachary Levi", 74, "MALE", "Bed 421-B", 15.2, "Low", 6, 1, 0.80, 85, "CKD 1/2", ["Metoprolol 25mg"], ["Vital signs stable", "No orthostasis"]),
    ("Audrey Hepburn", 79, "FEMALE", "Bed 422-A", 12.8, "Low", 4, 0, 0.70, 95, "CKD 1/2", ["Cholecalciferol 1000IU"], ["Normal gait analysis", "Discharge ready"]),
    ("Buster Keaton", 81, "MALE", "Bed 422-B", 17.5, "Low", 5, 0, 0.84, 82, "CKD 1/2", ["Finasteride 5mg"], ["Minimal drug burden", "Independent transfers"]),
    ("Catherine Deneuve", 76, "FEMALE", "Bed 423-A", 11.2, "Low", 4, 0, 0.68, 98, "CKD 1/2", ["Multivitamin", "Aspirin 81mg"], ["Preserved mobility metrics", "Low acuity"]),
    ("David Niven", 83, "MALE", "Bed 423-B", 19.4, "Low", 6, 1, 0.89, 75, "CKD 2", ["Amlodipine 2.5mg"], ["Blood pressure controlled", "No gait deviations"]),
    ("Eva Green", 72, "FEMALE", "Bed 424-A", 9.8, "Low", 4, 0, 0.65, 102, "CKD 1/2", ["Calcium + Vit D"], ["Excellent functional reserve", "Discharge ready"]),
    ("Frank Sinatra", 85, "MALE", "Bed 424-B", 18.0, "Low", 5, 0, 0.82, 80, "CKD 1/2", ["Atorvastatin 20mg"], ["Normal cognitive and balance screen", "Discharge scheduled"]),
    ("Greta Garbo", 80, "FEMALE", "Bed 425-A", 14.9, "Low", 5, 0, 0.75, 88, "CKD 1/2", ["Omeprazole 20mg"], ["Stable inpatient course", "Low fall probability"]),
    ("Humphrey Bogart", 78, "MALE", "Bed 425-B", 16.8, "Low", 6, 1, 0.85, 81, "CKD 1/2", ["Lisinopril 5mg"], ["Normal postural response", "Physical therapy signed off"]),
    ("Ingrid Bergman", 77, "FEMALE", "Bed 426-A", 13.5, "Low", 4, 0, 0.70, 94, "CKD 1/2", ["Metformin 500mg"], ["Euglycemic control maintained", "Discharge pending transportation"]),
    ("James Dean", 71, "MALE", "Bed 426-B", 8.4, "Low", 3, 0, 0.62, 105, "CKD 1/2", ["Acetaminophen PRN"], ["Zero high-risk medications", "Discharge ready"]),
    ("Judy Garland", 75, "FEMALE", "Bed 427-A", 10.6, "Low", 4, 0, 0.69, 96, "CKD 1/2", ["Cholecalciferol 2000IU"], ["Preserved righting reflex", "Discharge ready"]),
    ("Kirk Douglas", 91, "MALE", "Bed 427-B", 19.8, "Low", 6, 0, 0.90, 72, "CKD 2", ["Tamsulosin 0.4mg"], ["Stable gait with walker", "Rounds complete"])
]

def build_full_ward_census() -> List[Dict[str, Any]]:
    census = list(PRIMARY_INPATIENTS)
    start_hadm = 994210
    start_mrn = 80100
    
    for item in ADDITIONAL_PATIENT_NAMES:
        name, age, gender, bed, risk, tier, drugs, prn, cr, egfr, ckd, high_meds, notes = item
        start_hadm += 1
        start_mrn += 1
        
        census.append({
            "hadm_id": start_hadm,
            "mrn": f"#MRN-{start_mrn}",
            "name": name,
            "age": age,
            "gender": gender,
            "bed": bed,
            "ward": "Geriatric Ward 4B",
            "los_days": 2 + (start_hadm % 5),
            "code_status": "Full Code" if tier != "Critical" else "DNR/DNI",
            "acuity_tier": tier,
            "risk_percentage": risk,
            "trend": "up" if tier in ["Critical", "High"] else ("down" if tier == "Low" else "neutral"),
            "drug_count": drugs,
            "prn_count": prn,
            "creatinine": cr,
            "renal_egfr": egfr,
            "renal_stage": ckd,
            "blood_pressure": f"{115 + (start_hadm % 20)}/{70 + (start_hadm % 15)}",
            "bp_drop": -4 - (int(risk // 4)),
            "high_risk_meds": high_meds,
            "clinical_notes": notes,
            "reviewer_info": f"Reviewed {(start_hadm % 8) + 1}h ago By Staff RN"
        })
        
    return census

FULL_WARD_CENSUS = build_full_ward_census()

def get_ward_kpi_metrics() -> Dict[str, Any]:
    return {
        "high_fall_risk_count": 11,
        "high_fall_risk_today_delta": 2,
        "acute_admissions_flagged_12h": 3,
        "active_pim_alerts_count": 19,
        "stopp_version": "STOPP v3",
        "commonest_pim_type": "CNS Polypharmacy & Diuretics",
        "severe_ddi_burden_count": 8,
        "critical_interaction_index": 62,
        "ddi_synergies_desc": "Additive orthostatic & sedative synergies",
        "deprescribing_completed_pct": 74.2,
        "deprescribing_week_delta": 12,
        "medication_tapers_week_count": 26
    }

def get_ward_risk_distribution() -> Dict[str, Any]:
    return {
        "total_inpatients": 48,
        "stratums": [
            {
                "id": "critical",
                "label": "Critical Risk (>60%)",
                "criteria": ">60%",
                "patient_count": 3,
                "percentage": 6.3,
                "color_class": "bg-[#ef4444]",
                "bar_color": "#ef4444"
            },
            {
                "id": "high",
                "label": "High Risk (41-60%)",
                "criteria": "41-60%",
                "patient_count": 8,
                "percentage": 16.7,
                "color_class": "bg-[#f59e0b]",
                "bar_color": "#f59e0b"
            },
            {
                "id": "moderate",
                "label": "Moderate Risk (20-40%)",
                "criteria": "20-40%",
                "patient_count": 19,
                "percentage": 39.6,
                "color_class": "bg-[#0d9488]",
                "bar_color": "#0d9488"
            },
            {
                "id": "low",
                "label": "Low Risk (<20%)",
                "criteria": "<20%",
                "patient_count": 18,
                "percentage": 37.5,
                "color_class": "bg-[#10b981]",
                "bar_color": "#10b981"
            }
        ]
    }

def generate_fhir_r4_bundle(patient_id: Optional[str] = None) -> Dict[str, Any]:
    bundle_id = f"urn:uuid:{uuid.uuid4()}"
    timestamp = datetime.datetime.utcnow().isoformat() + "Z"
    
    pat = next((p for p in FULL_WARD_CENSUS if str(p["hadm_id"]) == str(patient_id) or p["mrn"] == patient_id), FULL_WARD_CENSUS[3])
    
    patient_resource = {
        "fullUrl": f"urn:uuid:patient-{pat['hadm_id']}",
        "resource": {
            "resourceType": "Patient",
            "id": str(pat["hadm_id"]),
            "identifier": [
                {
                    "system": "http://hospital.smarthealth.org/mrn",
                    "value": pat["mrn"]
                }
            ],
            "active": True,
            "name": [
                {
                    "use": "official",
                    "family": pat["name"].split()[-1],
                    "given": pat["name"].split()[:-1]
                }
            ],
            "gender": pat["gender"].lower(),
            "birthDate": (datetime.datetime.utcnow() - datetime.timedelta(days=int(pat["age"]*365.25))).strftime("%Y-%m-%d")
        }
    }
    
    risk_assessment_resource = {
        "fullUrl": f"urn:uuid:risk-{pat['hadm_id']}",
        "resource": {
            "resourceType": "RiskAssessment",
            "id": f"risk-{pat['hadm_id']}",
            "status": "final",
            "subject": {
                "reference": f"Patient/{pat['hadm_id']}",
                "display": pat["name"]
            },
            "occurrenceDateTime": timestamp,
            "basis": [
                {"display": "GeriSafe Multimodal GNN Model v2.4"},
                {"display": "AGS Beers Criteria 2023 Table 2"},
                {"display": "STOPP/START Version 3 Section K"}
            ],
            "prediction": [
                {
                    "outcome": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "217082002",
                                "display": "Accidental Fall during inpatient stay"
                            }
                        ],
                        "text": f"Acute Inpatient Fall Hazard: {pat['risk_percentage']}% ({pat['acuity_tier']})"
                    },
                    "probabilityDecimal": round(pat["risk_percentage"] / 100.0, 4),
                    "qualitativeRisk": {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/risk-probability",
                                "code": pat["acuity_tier"].lower(),
                                "display": pat["acuity_tier"]
                            }
                        ]
                    }
                }
            ],
            "note": [
                {"text": note} for note in pat.get("clinical_notes", [])
            ]
        }
    }
    
    medication_entries = []
    for idx, med_name in enumerate(pat.get("high_risk_meds", ["Lorazepam 1.0mg PO", "Furosemide 40mg PO"])):
        medication_entries.append({
            "fullUrl": f"urn:uuid:med-{pat['hadm_id']}-{idx}",
            "resource": {
                "resourceType": "MedicationRequest",
                "id": f"med-{pat['hadm_id']}-{idx}",
                "status": "active",
                "intent": "order",
                "medicationCodeableConcept": {
                    "text": med_name
                },
                "subject": {
                    "reference": f"Patient/{pat['hadm_id']}"
                }
            }
        })

    entries = [patient_resource, risk_assessment_resource] + medication_entries
    
    return {
        "resourceType": "Bundle",
        "id": str(uuid.uuid4()),
        "meta": {
            "lastUpdated": timestamp,
            "profile": ["http://hl7.org/fhir/StructureDefinition/Bundle"]
        },
        "type": "collection",
        "timestamp": timestamp,
        "total": len(entries),
        "entry": entries
    }
