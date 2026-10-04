import pytest
from src.clinical_rules.safety_rules import (
    audit_patient_medications,
    FRID_CATEGORIES,
    RENAL_RISK_MEDS,
)


def test_empty_medication_list():
    res = audit_patient_medications([], max_creatinine=1.0)
    assert res["has_pim_alert"] == 0
    assert res["total_frid_classes"] == 0
    assert res["cns_polypharmacy_flag"] == 0
    assert res["renal_contraindication_flag"] == 0


def test_frid_identification():
    # Lorazepam (benzo) + Haloperidol (antipsychotic)
    res = audit_patient_medications(["lorazepam", "haloperidol"], max_creatinine=1.0)
    assert res["benzodiazepines_and_z_drugs"] == 1
    assert res["antipsychotics"] == 1
    assert res["total_frid_classes"] == 2
    assert res["has_pim_alert"] == 1


def test_cns_polypharmacy_trigger():
    # 3 CNS active agents: opioid + benzo + z-drug / sedating antidepressant
    res = audit_patient_medications(
        ["morphine", "lorazepam", "trazodone"], max_creatinine=1.0
    )
    assert res["cns_polypharmacy_flag"] == 1
    assert res["total_frid_classes"] >= 3


def test_renal_contraindication():
    # Ibuprofen with elevated creatinine (> 1.5)
    res = audit_patient_medications(["ibuprofen"], max_creatinine=2.1)
    assert res["renal_contraindication_flag"] == 1
    assert res["has_pim_alert"] == 1

    # Ibuprofen with normal creatinine (<= 1.5)
    res_normal = audit_patient_medications(["ibuprofen"], max_creatinine=0.9)
    assert res_normal["renal_contraindication_flag"] == 0
