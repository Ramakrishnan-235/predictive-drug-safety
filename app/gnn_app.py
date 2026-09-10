import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import streamlit as st
import polars as pl
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import networkx as nx

from src.models.gnn_inference import GNNInferenceEngine
from src.clinical_rules.safety_rules import FRID_CATEGORIES, RENAL_RISK_MEDS

st.set_page_config(
    page_title="GNN Geriatric Fall Risk CDSS",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Medical Dashboard CSS
st.markdown("""
<style>
    .metric-card {
        background: #ffffff;
        border-radius: 12px;
        padding: 16px 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        border: 1px solid #e9ecef;
        margin-bottom: 12px;
    }
    .risk-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 16px;
        font-weight: 700;
        font-size: 0.95rem;
        letter-spacing: 0.5px;
    }
    .badge-low { background-color: #d1e7dd; color: #0f5132; }
    .badge-mod { background-color: #fff3cd; color: #664d03; }
    .badge-high { background-color: #ffe5d0; color: #984c0c; }
    .badge-critical { background-color: #f8d7da; color: #842029; }
    .stTabs [data-baseweb="tab-list"] { gap: 12px; }
    .stTabs [data-baseweb="tab"] { border-radius: 8px; padding: 8px 18px; }
</style>
""", unsafe_allow_html=True)


@st.cache_resource
def load_gnn_engine():
    return GNNInferenceEngine(checkpoint_path="models/gnn_fall_model.pt")


@st.cache_data
def load_cohort_sample():
    path = Path("data/processed/geriatric_features_with_ddi.parquet")
    if path.exists():
        df = pl.read_parquet(path)
        return df.select([
            "hadm_id", "subject_id", "age_at_admission", "unique_drug_count",
            "min_creatinine", "max_creatinine", "avg_creatinine",
            "total_frid_classes", "detected_ddi_count", "fall_target_label", "drug_name_list"
        ]).to_pandas()
    return None


engine = load_gnn_engine()
cohort_df = load_cohort_sample()
curated_meds = engine.get_curated_med_list()
preset_cases = engine.get_preset_cases()

# ----------------- SIDEBAR CONTROLS -----------------
with st.sidebar:
    st.image("https://img.icons8.com/color/96/artificial-intelligence.png", width=64)
    st.title("GNN Safety CDSS")
    st.caption("Graph Attention Network (GATv2) for Geriatric Fall-Risk & Regimen Interaction Modeling")
    st.markdown("---")
    
    app_mode = st.radio(
        "Navigation & Patient Mode",
        ["Custom Patient Regimen", "Clinical Case Presets", "MIMIC-IV Cohort Browser"],
        index=0
    )
    
    st.markdown("---")
    st.subheader("Model Specifications")
    st.markdown("""
    - **Architecture**: `RegimenGNNPredictor`
    - **GNN Layers**: GATv2 Attention (2 Heads, 32-dim)
    - **Readout**: Multimodal Fusion (Graph + Tabular)
    - **Drug Vocab Size**: 5,034 MIMIC-IV medications
    - **Clinical Rules**: AGS Beers 2023 & STOPP v3
    """)
    st.caption("Checkpoint: `models/gnn_fall_model.pt`")

# ----------------- STATE INITIALIZATION -----------------
if "med_list" not in st.session_state:
    st.session_state.med_list = ["lorazepam", "furosemide", "gabapentin", "metoprolol"]
if "patient_age" not in st.session_state:
    st.session_state.patient_age = 79
if "creatinine_max" not in st.session_state:
    st.session_state.creatinine_max = 1.6
if "creatinine_min" not in st.session_state:
    st.session_state.creatinine_min = 1.2
if "creatinine_avg" not in st.session_state:
    st.session_state.creatinine_avg = 1.4

# ----------------- MODE 2: CLINICAL PRESETS -----------------
if app_mode == "Clinical Case Presets":
    st.subheader("📋 Standardized Geriatric Case Vignettes")
    selected_preset_name = st.selectbox(
        "Select a Clinical Scenario:",
        list(preset_cases.keys())
    )
    preset_data = preset_cases[selected_preset_name]
    st.info(f"**Clinical Vignette:** {preset_data['description']}")
    
    col_p1, col_p2, col_p3 = st.columns([1.5, 1, 1])
    with col_p1:
        st.markdown(f"**Active Medications:** `{', '.join(preset_data['drugs'])}`")
    with col_p2:
        st.markdown(f"**Patient Age:** {preset_data['age']} years")
    with col_p3:
        st.markdown(f"**Creatinine:** {preset_data['creatinine_max']:.1f} mg/dL")
        
    if st.button("📥 Load This Case into Regimen Tester", type="primary"):
        st.session_state.med_list = list(preset_data["drugs"])
        st.session_state.patient_age = int(preset_data["age"])
        st.session_state.creatinine_max = float(preset_data["creatinine_max"])
        st.session_state.creatinine_min = float(preset_data["creatinine_min"])
        st.session_state.creatinine_avg = float(preset_data["creatinine_avg"])
        st.success("Case loaded successfully! Switching to evaluation below.")

# ----------------- MODE 3: MIMIC-IV COHORT BROWSER -----------------
elif app_mode == "MIMIC-IV Cohort Browser":
    st.subheader("🏥 MIMIC-IV Clinical Encounter Explorer")
    if cohort_df is not None:
        c1, c2 = st.columns([1.5, 1])
        with c1:
            hadm_options = cohort_df["hadm_id"].head(60).tolist()
            selected_hadm = st.selectbox("Select Patient Admission ID (hadm_id):", hadm_options)
            patient_record = cohort_df[cohort_df["hadm_id"] == selected_hadm].iloc[0]
        with c2:
            ground_truth_fall = int(patient_record["fall_target_label"])
            gt_text = "🚨 IN-HOSPITAL FALL / SYNCOPE EVENT" if ground_truth_fall == 1 else "✅ NO FALL RECORDED"
            st.metric("Cohort Ground Truth Event", gt_text)
            
        st.write(f"**Encounter Regimen ({len(patient_record['drug_name_list'])} drugs):**")
        st.code(", ".join(patient_record["drug_name_list"][:15]) + ("..." if len(patient_record["drug_name_list"]) > 15 else ""))
        
        if st.button("📥 Import Encounter for GNN Analysis", type="primary"):
            st.session_state.med_list = list(patient_record["drug_name_list"])
            st.session_state.patient_age = int(patient_record["age_at_admission"])
            st.session_state.creatinine_max = float(patient_record["max_creatinine"] if pd.notna(patient_record["max_creatinine"]) else 1.2)
            st.session_state.creatinine_min = float(patient_record["min_creatinine"] if pd.notna(patient_record["min_creatinine"]) else 1.0)
            st.session_state.creatinine_avg = float(patient_record["avg_creatinine"] if pd.notna(patient_record["avg_creatinine"]) else 1.1)
            st.success(f"Encounter {selected_hadm} loaded into interactive tester!")
    else:
        st.warning("Processed cohort parquet not found at `data/processed/geriatric_features_with_ddi.parquet`.")

st.markdown("---")

# ----------------- PATIENT & REGIMEN INPUT SECTION -----------------
st.header("1. Patient Profile & Medication Regimen Input")

input_c1, input_c2 = st.columns([1.6, 1])

with input_c1:
    st.subheader("Medication Regimen")
    
    # Quick-add pills for high-risk geriatric drugs
    st.caption("Quick Add High-Risk Geriatric FRID Drugs:")
    quick_cols = st.columns(6)
    quick_drugs = [
        ("Lorazepam", "lorazepam"),
        ("Zolpidem", "zolpidem"),
        ("Furosemide", "furosemide"),
        ("Oxycodone", "oxycodone"),
        ("Gabapentin", "gabapentin"),
        ("Haloperidol", "haloperidol")
    ]
    for idx, (label, val) in enumerate(quick_drugs):
        with quick_cols[idx]:
            if st.button(f"+ {label}", key=f"quick_{val}"):
                if val not in st.session_state.med_list:
                    st.session_state.med_list.append(val)
                    st.rerun()

    # Searchable Multiselect
    selected_drugs = st.multiselect(
        "Select or Search Medications from Vocabulary (5,000+ items):",
        options=curated_meds,
        default=[d for d in st.session_state.med_list if d in curated_meds],
        help="Select drugs from the MIMIC-IV cohort vocabulary or type custom entries below."
    )
    
    # Custom Comma-Separated Free Text Box
    custom_text = st.text_input(
        "Or enter additional medications (comma-separated):",
        value="",
        placeholder="e.g. trazodone, hydralazine, quetiapine, diphenhydramine"
    )
    
    col_btn1, col_btn2 = st.columns([1, 2])
    with col_btn1:
        if st.button("Apply Medication Updates", type="secondary"):
            combined = set(selected_drugs)
            if custom_text.strip():
                for item in custom_text.split(","):
                    c = item.strip().lower()
                    if c:
                        combined.add(c)
            st.session_state.med_list = list(combined)
            st.rerun()
    with col_btn2:
        if st.button("Reset to Default Polypharmacy Regimen"):
            st.session_state.med_list = ["lorazepam", "furosemide", "gabapentin", "metoprolol"]
            st.session_state.patient_age = 79
            st.session_state.creatinine_max = 1.6
            st.rerun()

    # Ensure med_list stays synced if multiselect changes
    if set(selected_drugs) != set(st.session_state.med_list) and not custom_text:
        st.session_state.med_list = selected_drugs

with input_c2:
    st.subheader("Demographics & Clinical Labs")
    
    age_val = st.slider(
        "Age at Admission (years):",
        min_value=50,
        max_value=102,
        value=int(st.session_state.patient_age),
        step=1
    )
    st.session_state.patient_age = age_val
    if age_val >= 75:
        st.caption("⚠️ **Geriatric Frailty Alert**: Age ≥ 75 significantly increases pharmacodynamic sensitivity.")
        
    cr_val = st.slider(
        "Peak Serum Creatinine (mg/dL):",
        min_value=0.4,
        max_value=4.5,
        value=float(st.session_state.creatinine_max),
        step=0.1
    )
    st.session_state.creatinine_max = cr_val
    st.session_state.creatinine_min = max(0.4, cr_val - 0.3)
    st.session_state.creatinine_avg = max(0.4, cr_val - 0.15)
    
    if cr_val > 1.5:
        st.error("🚨 **Renal Impairment Alert**: Creatinine > 1.5 mg/dL. Renal contraindication rules active.")
    else:
        st.success("Normal or mild renal function range.")

# ----------------- GNN MODEL INFERENCE -----------------
active_drugs = st.session_state.med_list if st.session_state.med_list else ["unknown"]

res = engine.predict(
    drug_list=active_drugs,
    age=float(st.session_state.patient_age),
    creatinine_min=float(st.session_state.creatinine_min),
    creatinine_max=float(st.session_state.creatinine_max),
    creatinine_avg=float(st.session_state.creatinine_avg)
)

st.markdown("---")

# ----------------- SECTION 2: GNN PREDICTION & KPIS -----------------
st.header("2. GNN Predicted Fall / Syncope Risk Assessment")

kpi_col1, kpi_col2, kpi_col3, kpi_col4 = st.columns(4)

with kpi_col1:
    st.markdown(f"""
    <div class="metric-card">
        <p style="color:#6c757d; font-size:0.85rem; margin-bottom:4px; font-weight:600;">GNN PREDICTED FALL RISK</p>
        <h2 style="color:{res['risk_color']}; margin:0; font-size:2.3rem;">{res['predicted_risk_pct']}%</h2>
        <span class="risk-badge" style="background-color:{res['risk_color']}20; color:{res['risk_color']}; margin-top:8px;">
            {res['risk_tier'].upper()} RISK
        </span>
    </div>
    """, unsafe_allow_html=True)

with kpi_col2:
    st.markdown(f"""
    <div class="metric-card">
        <p style="color:#6c757d; font-size:0.85rem; margin-bottom:4px; font-weight:600;">ACTIVE DRUG COUNT</p>
        <h2 style="margin:0; font-size:2.3rem; color:#2b2d42;">{len(res['active_medications'])}</h2>
        <span style="color:#6c757d; font-size:0.85rem;">Medications in Regimen Graph</span>
    </div>
    """, unsafe_allow_html=True)

with kpi_col3:
    num_frid = res['safety_audit'].get('total_frid_classes', 0)
    frid_color = "#e63946" if num_frid >= 2 else "#2a9d8f"
    st.markdown(f"""
    <div class="metric-card">
        <p style="color:#6c757d; font-size:0.85rem; margin-bottom:4px; font-weight:600;">BEERS FRID CLASSES</p>
        <h2 style="color:{frid_color}; margin:0; font-size:2.3rem;">{num_frid}</h2>
        <span style="color:#6c757d; font-size:0.85rem;">Fall-Risk-Increasing Drug Classes</span>
    </div>
    """, unsafe_allow_html=True)

with kpi_col4:
    attended_count = len(res['attended_interactions'])
    ddi_color = "#e63946" if attended_count > 0 else "#2a9d8f"
    st.markdown(f"""
    <div class="metric-card">
        <p style="color:#6c757d; font-size:0.85rem; margin-bottom:4px; font-weight:600;">ATTENDED DDI EDGES</p>
        <h2 style="color:{ddi_color}; margin:0; font-size:2.3rem;">{attended_count}</h2>
        <span style="color:#6c757d; font-size:0.85rem;">GATv2 Graph Attention Pairs</span>
    </div>
    """, unsafe_allow_html=True)

# Safety Rule Flags Banner
safety = res["safety_audit"]
alert_col1, alert_col2 = st.columns(2)
with alert_col1:
    if safety.get("cns_polypharmacy_flag", 0) == 1:
        st.error("🚨 **Beers Criteria High-Risk Alert**: CNS Polypharmacy detected (≥ 3 concurrent CNS-depressant drug classes). Multiplies syncope & hip fracture risk.")
    else:
        st.success("✅ CNS Polypharmacy: Under high-risk threshold (< 3 concurrent sedative classes).")

with alert_col2:
    if safety.get("renal_contraindication_flag", 0) == 1:
        st.error("🚨 **Renal Contraindication Alert**: Renally cleared or nephrotoxic medication active in renal impairment (Creatinine > 1.5 mg/dL).")
    else:
        st.success("✅ Renal Contraindications: No acute nephrotoxic conflicts identified.")

st.markdown("---")

# ----------------- SECTION 3: GRAPH VISUALIZATION & ATTENTION -----------------
st.header("3. Regimen Graph Attention Network (GATv2) Visualization")

viz_col1, viz_col2 = st.columns([1.5, 1])

# Build 2D Network Graph with NetworkX & Plotly
def render_plotly_regimen_graph(active_meds, attended_pairs, num_nodes):
    G = nx.Graph()
    for idx, med in enumerate(active_meds):
        is_frid = any(
            any(kw in med for kw in kws)
            for cat, kws in FRID_CATEGORIES.items()
        )
        G.add_node(idx, label=med.title(), is_frid=is_frid)
        
    for p in attended_pairs:
        G.add_edge(
            p["u"], p["v"],
            weight=p["attention_weight"],
            mechanism=p["adverse_mechanism"],
            severity=p["severity_weight"],
            pair_name=p["pair_name"]
        )

    pos = nx.spring_layout(G, seed=42, k=1.2)

    # Edge traces
    edge_x, edge_y = [], []
    edge_hover = []
    
    # We create individual edge lines to color by attention weight
    edge_traces = []
    for edge in G.edges(data=True):
        u, v, d = edge
        x0, y0 = pos[u]
        x1, y1 = pos[v]
        att = d.get("weight", 0.1)
        # Scaled width based on GATv2 attention
        line_width = max(2.0, att * 10.0)
        
        trace = go.Scatter(
            x=[x0, x1, None],
            y=[y0, y1, None],
            line=dict(width=line_width, color="#e63946" if att > 0.3 else "#f4a261"),
            hoverinfo="text",
            text=f"<b>Interaction:</b> {d.get('pair_name')}<br><b>GATv2 Attention:</b> {att:.4f}<br><b>Mechanism:</b> {d.get('mechanism')}",
            mode="lines"
        )
        edge_traces.append(trace)

    # Node trace
    node_x = [pos[n][0] for n in G.nodes()]
    node_y = [pos[n][1] for n in G.nodes()]
    node_labels = [G.nodes[n]["label"] for n in G.nodes()]
    node_colors = ["#e63946" if G.nodes[n]["is_frid"] else "#457b9d" for n in G.nodes()]
    
    node_trace = go.Scatter(
        x=node_x, y=node_y,
        mode="markers+text",
        text=node_labels,
        textposition="top center",
        hoverinfo="text",
        hovertext=[f"<b>Medication:</b> {G.nodes[n]['label']}<br><b>Status:</b> {'FRID High-Risk' if G.nodes[n]['is_frid'] else 'Standard Regimen'}" for n in G.nodes()],
        marker=dict(
            size=28,
            color=node_colors,
            line=dict(width=2, color="#ffffff"),
            opacity=0.95
        )
    )

    fig = go.Figure(data=edge_traces + [node_trace])
    fig.update_layout(
        title="<b>Patient Drug Regimen Graph Architecture</b> (Edge thickness represents GATv2 Attention)",
        showlegend=False,
        hovermode="closest",
        margin=dict(b=20, l=20, r=20, t=50),
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        height=450,
        plot_bgcolor="#f8f9fa",
        paper_bgcolor="#f8f9fa"
    )
    return fig


with viz_col1:
    fig_graph = render_plotly_regimen_graph(
        active_meds=res["active_medications"],
        attended_pairs=res["attended_interactions"],
        num_nodes=len(res["active_medications"])
    )
    st.plotly_chart(fig_graph, use_container_width=True)
    st.caption("🔴 Red Nodes: Beers/STOPP Fall-Risk-Increasing Drugs (FRIDs) | 🔵 Blue Nodes: Other Medications | ⚡ Edges: GATv2 Neural Attention")

with viz_col2:
    st.subheader("GATv2 Top Attended Interaction Pairs")
    if res["attended_interactions"]:
        # Horizontal Bar Chart of Attention Weights
        pair_names = [p["pair_name"] for p in res["attended_interactions"]]
        weights = [p["attention_weight"] for p in res["attended_interactions"]]
        
        fig_bar = go.Figure(go.Bar(
            x=weights,
            y=pair_names,
            orientation="h",
            marker=dict(
                color=weights,
                colorscale="Reds",
                showscale=False
            )
        ))
        fig_bar.update_layout(
            xaxis_title="GATv2 Layer 2 Attention Weight (α)",
            yaxis_title="Interacting Pair",
            height=280,
            margin=dict(l=10, r=10, t=20, b=30)
        )
        st.plotly_chart(fig_bar, use_container_width=True)
        
        # Details list
        for p in res["attended_interactions"][:3]:
            st.markdown(f"**{p['pair_name']}** (`α = {p['attention_weight']:.4f}`)")
            st.caption(f"_{p['adverse_mechanism']}_")
    else:
        st.info("No high-severity pairwise drug-drug interactions detected in current regimen. Isolated nodes communicate via self-loops.")

st.markdown("---")

# ----------------- SECTION 4: WHAT-IF DEPRESCRIBING SIMULATOR -----------------
st.header("4. 🧪 Interactive 'What-If' Deprescribing Simulator")
st.markdown("Test clinical deprescribing interventions in real time to observe the reduction in GNN predicted fall risk:")

sim_col1, sim_col2 = st.columns([1, 1.5])

with sim_col1:
    candidate_drugs = [d for d in res["active_medications"] if d != "unknown"]
    if candidate_drugs:
        drug_to_deprescribe = st.selectbox(
            "Select a Medication to Simulate Deprescribing:",
            candidate_drugs
        )
        
        sim_result = engine.simulate_deprescribing(
            drug_list=res["active_medications"],
            drug_to_remove=drug_to_deprescribe,
            age=float(st.session_state.patient_age),
            creatinine_min=float(st.session_state.creatinine_min),
            creatinine_max=float(st.session_state.creatinine_max),
            creatinine_avg=float(st.session_state.creatinine_avg)
        )
    else:
        drug_to_deprescribe = None
        sim_result = None

with sim_col2:
    if sim_result:
        delta = sim_result["delta_pct"]
        st.markdown(f"### Simulation Results for Discontinuing `{drug_to_deprescribe.title()}`")
        
        m1, m2, m3 = st.columns(3)
        with m1:
            st.metric("Baseline Fall Risk", f"{sim_result['baseline_risk_pct']:.2f}%", delta=sim_result['baseline_tier'])
        with m2:
            st.metric("Post-Deprescribing Risk", f"{sim_result['deprescribed_risk_pct']:.2f}%", delta=sim_result['deprescribed_tier'])
        with m3:
            st.metric("Risk Delta", f"{delta:+.2f}%", delta=f"{delta:+.2f}%", delta_color="inverse" if delta < 0 else "normal")
            
        if delta < -1.0:
            st.success(f"🎯 **Deprescribing Benefit**: Discontinuing `{drug_to_deprescribe.title()}` reduces predicted fall probability by **{abs(delta):.2f}%**.")
        elif delta >= 0:
            st.info(f"Removing `{drug_to_deprescribe.title()}` leaves risk largely unchanged.")

st.markdown("---")

# ----------------- SECTION 5: CLINICIAN REVIEW AUDIT -----------------
st.header("5. Clinician Decision Review & Audit")
c_col1, c_col2, c_col3 = st.columns([1, 1, 2])

with c_col1:
    if st.button("✅ Accept & Queue Deprescribing Plan", type="primary", use_container_width=True):
        st.success("Deprescribing recommendation logged into simulated EHR order queue.")

with c_col2:
    if st.button("❌ Dismiss / Override Alert", use_container_width=True):
        st.warning("Alert override recorded for clinical audit review.")

with c_col3:
    st.caption("All CDSS recommendations are advisory and designed to support comprehensive geriatric medication reviews.")
