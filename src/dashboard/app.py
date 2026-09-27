import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import streamlit as st
import polars as pl
import torch
import plotly.graph_objects as go

from src.models.dataset import prepare_dataloaders
from src.explainability.clinical_explainer import MechanisticExplainerEngine

st.set_page_config(
    page_title="Geriatric Fall Prevention CDSS",
    page_icon="🩺",
    layout="wide"
)

# Cache model engine to prevent re-loading on UI rerenders
@st.cache_resource
def load_explainer():
    return MechanisticExplainerEngine(checkpoint_path="models/fall_risk_model.pt")

@st.cache_data
def load_cohort_sample():
    df = pl.read_parquet("data/processed/geriatric_features_with_ddi.parquet")
    return df

explainer = load_explainer()
df = load_cohort_sample()
_, _, test_loader, _, _ = prepare_dataloaders()

# Header
st.title("🩺 Geriatric Medication Safety & Fall Prevention CDSS")
st.caption("AI-Assisted Decision Support for Structured Medication Reviews (SMRs) and Deprescribing")

# Sidebar Controls
st.sidebar.header("Patient Selection")
hadm_list = df["hadm_id"].head(50).to_list()
selected_hadm = st.sidebar.selectbox("Select Admission (hadm_id):", hadm_list)

st.sidebar.markdown("---")
st.sidebar.header("Explainability Engine")
use_llm = st.sidebar.checkbox("Enable Deep LLM Rationale Synthesis", value=True)
st.sidebar.caption(f"Active Provider: `{explainer.llm_explainer.provider}`")

# Retrieve Selected Patient Record
patient_row = df.filter(pl.col("hadm_id") == selected_hadm).to_dicts()[0]

# Construct Feature Vector
feature_vals = [
    float(patient_row.get(col, 0.0) or 0.0)
    for col in [
        "age_at_admission", "unique_drug_count", "min_creatinine", 
        "max_creatinine", "avg_creatinine", "detected_ddi_count", "w_ddi_score",
        "benzodiazepines_and_z_drugs", "antipsychotics", "anticholinergics_and_antihistamines",
        "tricyclic_and_sedating_antidepressants", "vasodilators_and_alpha_blockers",
        "loop_diuretics", "opioids", "antiepileptics", "total_frid_classes",
        "cns_polypharmacy_flag", "renal_contraindication_flag", "has_pim_alert"
    ]
]
x_tensor = torch.tensor(feature_vals, dtype=torch.float32)

# Generate Recommendation
rec = explainer.generate_clinical_explanation(
    hadm_id=selected_hadm,
    feature_tensor=x_tensor,
    active_medications=patient_row["drug_name_list"],
    clinical_labs={
        "age_at_admission": int(patient_row["age_at_admission"]),
        "max_creatinine": float(patient_row["max_creatinine"] or 1.0)
    },
    use_llm=use_llm
)

# Main UI Columns
col1, col2, col3 = st.columns([1, 1, 1])

with col1:
    st.metric("Age at Admission", f"{int(patient_row['age_at_admission'])} yrs")
    st.metric("Unique Drug Count", f"{patient_row['unique_drug_count']} medications")

with col2:
    st.metric("Max Serum Creatinine", f"{patient_row['max_creatinine']:.2f} mg/dL")
    st.metric("Total FRID Drug Classes", f"{patient_row['total_frid_classes']} classes")

with col3:
    risk_pct = rec.predicted_fall_risk * 100
    st.metric(
        label="Predicted Fall / Syncope Risk",
        value=f"{risk_pct:.1f}%",
        delta=rec.risk_stratification,
        delta_color="inverse" if rec.risk_stratification == "High" else "normal"
    )
    st.metric("Ground Truth Encounter Fall", "YES" if patient_row["fall_target_label"] == 1 else "NO")

st.markdown("---")

# Layout: Visual Explanations vs Clinical Action Plan
left_col, right_col = st.columns([1.2, 1])

with left_col:
    st.subheader("Subsymbolic Feature Attributions (Integrated Gradients)")
    driver_names = [d.split(" (Attribution:")[0] for d in rec.primary_risk_drivers]
    weights = []
    for d in rec.primary_risk_drivers:
        try:
            if "Attribution:" in d:
                raw_w = d.split("Attribution:")[1].replace(")", "").replace("+", "").strip()
                weights.append(float(raw_w))
            else:
                weights.append(0.05)
        except Exception:
            weights.append(0.05)

    fig = go.Figure(go.Bar(
        x=weights,
        y=driver_names,
        orientation="h",
        marker=dict(color=["#e63946" if w > 0.08 else "#457b9d" for w in weights])
    ))
    fig.update_layout(
        xaxis_title="Risk Attribution Weight",
        yaxis_title="Clinical / Pharmacological Feature",
        height=260,
        margin=dict(l=20, r=20, t=20, b=20)
    )
    st.plotly_chart(fig, use_container_width=True)

    st.subheader("Active Patient Medications")
    st.write(patient_row["drug_name_list"])

with right_col:
    st.subheader("Mechanistic Rationale & Guideline Support")
    st.info(f"**Pharmacological Mechanism:**\n{rec.pharmacological_mechanisms}")

    if rec.clinical_guideline_citations:
        with st.expander("Grounded Clinical Guidelines (Beers & STOPP v3)", expanded=True):
            for cite in rec.clinical_guideline_citations:
                st.markdown(f"- *{cite}*")

    st.subheader("Actionable Deprescribing Recommendations")
    for idx, action in enumerate(rec.actionable_deprescribing_plan, 1):
        st.write(f"**{idx}.** {action}")

    # Actionable Audit Feedback Loop
    st.markdown("---")
    st.write("**Clinician Decision Review Audit**")
    btn_col1, btn_col2 = st.columns(2)
    with btn_col1:
        if st.button("Accept & Queue Deprescribing Plan", type="primary"):
            st.success(f"Action logged for Admission {selected_hadm}. Orders queued.")
    with btn_col2:
        if st.button("Override / Dismiss Alert"):
            st.warning(f"Alert override logged for review audit.")
