import sys
from pathlib import Path
from typing import List, Dict, Tuple, Any, Optional
import json
import itertools
import numpy as np
import torch
from torch_geometric.data import Data, Batch

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.models.gnn_fall_model import RegimenGNNPredictor
from src.models.ddi_graph import DDISeverityEngine
from src.clinical_rules.safety_rules import audit_patient_medications, FRID_CATEGORIES, RENAL_RISK_MEDS

# Tabular clinical predictors matching graph_dataset.py
CLINICAL_TABULAR_COLS = [
    "age_at_admission",
    "unique_drug_count",
    "min_creatinine",
    "max_creatinine",
    "avg_creatinine",
    "benzodiazepines_and_z_drugs",
    "antipsychotics",
    "anticholinergics_and_antihistamines",
    "tricyclic_and_sedating_antidepressants",
    "vasodilators_and_alpha_blockers",
    "loop_diuretics",
    "opioids",
    "antiepileptics",
    "total_frid_classes",
    "cns_polypharmacy_flag",
    "renal_contraindication_flag"
]

# Training split normalization statistics from MIMIC-IV cohort
TAB_MEAN = np.array([77.21023171, 27.29023476, 1.11680548, 1.54736430, 1.31214371], dtype=np.float32)
TAB_STD = np.array([8.28022480, 14.39583831, 0.91389068, 1.46834935, 1.13869399], dtype=np.float32)


class GNNInferenceEngine:
    def __init__(
        self,
        checkpoint_path: str = "models/gnn_fall_model.pt",
        device: Optional[str] = None
    ):
        self.device = torch.device(device if device else ("cuda" if torch.cuda.is_available() else "cpu"))
        self.checkpoint_path = Path(checkpoint_path)
        
        self.drug_to_idx, self.idx_to_drug = self._load_vocabulary()
        self.num_unique_drugs = len(self.drug_to_idx)
        
        # Initialize DDI Severity Engine
        self.ddi_engine = DDISeverityEngine()
        
        # Load trained Regimen GNN model
        self.model = RegimenGNNPredictor(
            num_unique_drugs=self.num_unique_drugs,
            drug_emb_dim=32,
            gnn_hidden_dim=32,
            tabular_dim=len(CLINICAL_TABULAR_COLS),
            dense_hidden_dim=64
        ).to(self.device)
        
        if self.checkpoint_path.exists():
            state_dict = torch.load(self.checkpoint_path, map_location=self.device, weights_only=True)
            self.model.load_state_dict(state_dict)
            self.model.eval()
        else:
            print(f"[Warning] Checkpoint {self.checkpoint_path} not found. Running in uninitialized mode.")
            self.model.eval()

    def _load_vocabulary(self) -> Tuple[Dict[str, int], Dict[int, str]]:
        """Loads or constructs the 5034-drug vocabulary mapping."""
        vocab_cache = Path("data/processed/gnn_drug_vocab.json")
        if vocab_cache.exists():
            with open(vocab_cache, "r", encoding="utf-8") as f:
                drug_to_idx = json.load(f)
            idx_to_drug = {int(v): k for k, v in drug_to_idx.items()}
            return drug_to_idx, idx_to_drug
            
        parquet_path = Path("data/processed/geriatric_features_with_ddi.parquet")
        if parquet_path.exists():
            import polars as pl
            df = pl.read_parquet(parquet_path)
            all_drugs = sorted(list({d.lower().strip() for sublist in df["drug_name_list"].to_list() for d in sublist}))
            drug_to_idx = {drug: i for i, drug in enumerate(all_drugs)}
            vocab_cache.parent.mkdir(parents=True, exist_ok=True)
            with open(vocab_cache, "w", encoding="utf-8") as f:
                json.dump(drug_to_idx, f)
            idx_to_drug = {i: drug for drug, i in drug_to_idx.items()}
            return drug_to_idx, idx_to_drug
            
        # Fallback dummy vocab if parquet not available
        default_vocab = {f"drug_{i}": i for i in range(5034)}
        return default_vocab, {v: k for k, v in default_vocab.items()}

    def match_drug_to_vocab(self, query: str) -> Optional[str]:
        """Matches a user input query to a known drug in the vocabulary."""
        q = query.lower().strip()
        if not q:
            return None
        if q in self.drug_to_idx:
            return q
            
        # Substring prefix matching
        for d in self.drug_to_idx:
            if q == d or d.startswith(q) or f" {q} " in f" {d} " or f"({q})" in d:
                return d
                
        # Word token matching
        for d in self.drug_to_idx:
            if any(token == q for token in d.replace("*", " ").replace("(", " ").replace(")", " ").split()):
                return d
                
        return None

    def build_graph(
        self,
        drug_list: List[str],
        age: float = 75.0,
        creatinine_min: float = 1.0,
        creatinine_max: float = 1.4,
        creatinine_avg: float = 1.2
    ) -> Tuple[Data, List[str], Dict[str, Any]]:
        """Constructs a PyTorch Geometric Data graph matching the model expectations."""
        # 1. Standardize and match drug names
        matched_meds = []
        matched_indices = []
        for raw_med in drug_list:
            cleaned = raw_med.strip().lower()
            if not cleaned:
                continue
            matched = self.match_drug_to_vocab(cleaned)
            if matched:
                matched_meds.append(matched)
                matched_indices.append(self.drug_to_idx[matched])
            else:
                # If unknown, map to node index 0
                matched_meds.append(cleaned)
                matched_indices.append(0)

        if len(matched_indices) == 0:
            matched_meds = ["unknown"]
            matched_indices = [0]

        num_nodes = len(matched_indices)
        node_ids = torch.tensor(matched_indices, dtype=torch.long)

        # 2. Extract clinical safety flags via Beers 2023 & STOPP v3
        safety_audit = audit_patient_medications(matched_meds, creatinine_max)

        # 3. Form interaction edges from DDI Severity Engine
        known_ddi = self.ddi_engine.ddi_registry
        all_ddi_keywords = self.ddi_engine._all_known
        med_keywords = [[kw for kw in all_ddi_keywords if kw in m] for m in matched_meds]

        edge_list = []
        edge_weights = []
        edge_mechanisms = {}

        for i, j in itertools.combinations(range(num_nodes), 2):
            kws_i = med_keywords[i]
            kws_j = med_keywords[j]
            if not kws_i or not kws_j:
                continue

            weight = 0.0
            mech = ""
            for (k1, k2), (w, m) in known_ddi.items():
                if (k1 in kws_i and k2 in kws_j) or (k2 in kws_i and k1 in kws_j):
                    weight = w
                    mech = m
                    break

            if weight > 0.0:
                edge_list.append([i, j])
                edge_list.append([j, i])
                edge_weights.extend([weight, weight])
                pair_key = tuple(sorted([i, j]))
                edge_mechanisms[pair_key] = {
                    "weight": weight,
                    "mechanism": mech,
                    "drug_a": matched_meds[i],
                    "drug_b": matched_meds[j]
                }

        # Add self-loops (weight 0.1) for isolated node aggregation guarantee
        for i in range(num_nodes):
            edge_list.append([i, i])
            edge_weights.append(0.1)

        edge_index = torch.tensor(edge_list, dtype=torch.long).t().contiguous()
        edge_attr = torch.tensor(edge_weights, dtype=torch.float32).unsqueeze(1)

        # 4. Construct normalized tabular tensor
        cont_raw = np.array([age, float(len(matched_meds)), creatinine_min, creatinine_max, creatinine_avg], dtype=np.float32)
        cont_normalized = (cont_raw - TAB_MEAN) / TAB_STD
        
        bin_flags = np.array([
            float(safety_audit.get("benzodiazepines_and_z_drugs", 0)),
            float(safety_audit.get("antipsychotics", 0)),
            float(safety_audit.get("anticholinergics_and_antihistamines", 0)),
            float(safety_audit.get("tricyclic_and_sedating_antidepressants", 0)),
            float(safety_audit.get("vasodilators_and_alpha_blockers", 0)),
            float(safety_audit.get("loop_diuretics", 0)),
            float(safety_audit.get("opioids", 0)),
            float(safety_audit.get("antiepileptics", 0)),
            float(safety_audit.get("total_frid_classes", 0)),
            float(safety_audit.get("cns_polypharmacy_flag", 0)),
            float(safety_audit.get("renal_contraindication_flag", 0)),
        ], dtype=np.float32)

        clinical_tensor = torch.tensor(np.hstack([cont_normalized, bin_flags]), dtype=torch.float32).unsqueeze(0)

        data = Data(
            node_ids=node_ids,
            edge_index=edge_index,
            edge_attr=edge_attr,
            clinical_x=clinical_tensor,
            num_nodes=num_nodes
        )

        metadata = {
            "matched_meds": matched_meds,
            "safety_audit": safety_audit,
            "edge_mechanisms": edge_mechanisms,
            "unique_drug_count": len(matched_meds)
        }
        return data, matched_meds, metadata

    def predict(
        self,
        drug_list: List[str],
        age: float = 75.0,
        creatinine_min: float = 1.0,
        creatinine_max: float = 1.4,
        creatinine_avg: float = 1.2
    ) -> Dict[str, Any]:
        """Runs the Regimen GNN predictor and extracts attention-weighted interactions."""
        data, matched_meds, meta = self.build_graph(
            drug_list=drug_list,
            age=age,
            creatinine_min=creatinine_min,
            creatinine_max=creatinine_max,
            creatinine_avg=creatinine_avg
        )

        batch = Batch.from_data_list([data]).to(self.device)

        with torch.no_grad():
            logits, (edge_index_out, alpha) = self.model(batch)

        prob = float(torch.sigmoid(logits).cpu().item())
        prob_pct = round(prob * 100.0, 2)

        # Calibrated Clinical Risk Stratification Tier
        if prob_pct < 10.0:
            tier = "Low"
            color = "#2a9d8f"  # Teal
        elif prob_pct < 25.0:
            tier = "Moderate"
            color = "#e9c46a"  # Amber
        elif prob_pct < 40.0:
            tier = "High"
            color = "#f4a261"  # Orange
        else:
            tier = "Critical"
            color = "#e76f51"  # Crimson

        # Parse GATv2 edge attention weights
        ei_np = edge_index_out.cpu().numpy()
        alpha_np = alpha.cpu().numpy().ravel()

        attended_interactions = []
        seen_pairs = set()

        # Isolate pairwise interactions (excluding self-loops)
        non_self_idx = np.where(ei_np[0] != ei_np[1])[0]
        if len(non_self_idx) > 0:
            sorted_indices = non_self_idx[np.argsort(-alpha_np[non_self_idx])]
            for idx in sorted_indices:
                u, v = int(ei_np[0, idx]), int(ei_np[1, idx])
                pair_sorted = tuple(sorted([u, v]))
                if pair_sorted not in seen_pairs:
                    seen_pairs.add(pair_sorted)
                    drug_a = matched_meds[u]
                    drug_b = matched_meds[v]
                    att_val = float(alpha_np[idx])
                    
                    # Fetch pharmacological mechanism
                    mech_info = meta["edge_mechanisms"].get(pair_sorted, {})
                    mechanism = mech_info.get("mechanism", "Pharmacodynamic co-prescription interaction")
                    severity_w = mech_info.get("weight", 0.5)

                    attended_interactions.append({
                        "drug_a": drug_a,
                        "drug_b": drug_b,
                        "pair_name": f"{drug_a.title()} ↔ {drug_b.title()}",
                        "attention_weight": round(att_val, 4),
                        "severity_weight": round(severity_w, 2),
                        "adverse_mechanism": mechanism,
                        "u": u,
                        "v": v
                    })

        return {
            "predicted_probability": prob,
            "predicted_risk_pct": prob_pct,
            "risk_tier": tier,
            "risk_color": color,
            "active_medications": matched_meds,
            "attended_interactions": attended_interactions,
            "safety_audit": meta["safety_audit"],
            "raw_graph": {
                "num_nodes": data.num_nodes,
                "num_edges": data.edge_index.size(1),
                "edge_index": ei_np.tolist(),
                "alpha": alpha_np.tolist()
            }
        }

    def simulate_deprescribing(
        self,
        drug_list: List[str],
        drug_to_remove: str,
        age: float = 75.0,
        creatinine_min: float = 1.0,
        creatinine_max: float = 1.4,
        creatinine_avg: float = 1.2
    ) -> Dict[str, Any]:
        """Calculates risk delta after deprescribing a targeted drug."""
        baseline_res = self.predict(drug_list, age, creatinine_min, creatinine_max, creatinine_avg)
        
        target = drug_to_remove.lower().strip()
        reduced_list = [d for d in drug_list if target not in d.lower()]
        if not reduced_list:
            reduced_list = ["unknown"]

        deprescribed_res = self.predict(reduced_list, age, creatinine_min, creatinine_max, creatinine_avg)
        
        delta_prob = deprescribed_res["predicted_probability"] - baseline_res["predicted_probability"]
        delta_pct = round(delta_prob * 100.0, 2)
        
        return {
            "baseline_risk_pct": baseline_res["predicted_risk_pct"],
            "deprescribed_risk_pct": deprescribed_res["predicted_risk_pct"],
            "delta_pct": delta_pct,
            "removed_drug": drug_to_remove,
            "deprescribed_regimen": reduced_list,
            "baseline_tier": baseline_res["risk_tier"],
            "deprescribed_tier": deprescribed_res["risk_tier"]
        }

    @staticmethod
    def get_preset_cases() -> Dict[str, Dict[str, Any]]:
        """Provides realistic clinical case vignettes for rapid demonstration."""
        return {
            "Case 1: Severe CNS Depressant Polypharmacy": {
                "description": "82-year-old with insomnia and chronic pain prescribed multiple sedatives (Beers high risk).",
                "drugs": ["zolpidem", "trazodone", "oxycodone", "lorazepam", "gabapentin"],
                "age": 82,
                "creatinine_min": 1.2,
                "creatinine_max": 1.6,
                "creatinine_avg": 1.4
            },
            "Case 2: Orthostatic Hypotension & Vasodilator Cascade": {
                "description": "78-year-old on loop diuretics and vasodilators inducing precipitous postural hypotension.",
                "drugs": ["furosemide", "hydralazine", "metoprolol", "diltiazem"],
                "age": 78,
                "creatinine_min": 1.3,
                "creatinine_max": 1.9,
                "creatinine_avg": 1.6
            },
            "Case 3: Anticholinergic & Antipsychotic Sedation": {
                "description": "85-year-old with delirium given haloperidol, quetiapine, and diphenhydramine.",
                "drugs": ["diphenhydramine", "quetiapine", "haloperidol", "lorazepam"],
                "age": 85,
                "creatinine_min": 0.9,
                "creatinine_max": 1.2,
                "creatinine_avg": 1.1
            },
            "Case 4: Renal Contraindication with High-Risk NSAID": {
                "description": "74-year-old with severe renal impairment prescribed nephrotoxic NSAID and digoxin.",
                "drugs": ["ibuprofen", "furosemide", "digoxin", "lisinopril"],
                "age": 74,
                "creatinine_min": 2.1,
                "creatinine_max": 2.8,
                "creatinine_avg": 2.4
            },
            "Case 5: Low-Risk Guideline-Concordant Baseline": {
                "description": "68-year-old on well-tolerated chronic prevention without fall-risk-increasing drugs.",
                "drugs": ["acetaminophen", "atorvastatin", "metformin", "levothyroxine"],
                "age": 68,
                "creatinine_min": 0.7,
                "creatinine_max": 0.9,
                "creatinine_avg": 0.8
            }
        }

    def get_curated_med_list(self) -> List[str]:
        """Returns a prioritized list of high-risk geriatric and common medications."""
        curated_priority = [
            # High-risk FRID classes
            "lorazepam", "diazepam", "temazepam", "clonazepam", "alprazolam", "midazolam",
            "zolpidem", "trazodone", "mirtazapine", "paroxetine", "amitriptyline",
            "haloperidol", "quetiapine", "risperidone", "olanzapine", "aripiprazole",
            "diphenhydramine", "hydroxyzine", "promethazine", "meclizine", "oxybutynin",
            "morphine", "oxycodone", "hydromorphone", "fentanyl", "tramadol", "codeine",
            "gabapentin", "pregabalin", "carbamazepine", "phenytoin", "levetiracetam",
            "furosemide", "bumetanide", "torsemide",
            "hydralazine", "nitroglycerin", "metoprolol", "diltiazem", "digoxin", "clonidine",
            # Common baseline geriatric meds
            "acetaminophen", "aspirin", "atorvastatin", "metformin", "lisinopril",
            "amlodipine", "omeprazole", "pantoprazole", "levothyroxine", "insulin",
            "heparin", "docusate sodium", "senna", "potassium chloride", "polyethylene glycol",
            "ibuprofen", "naproxen", "warfarin", "ciprofloxacin"
        ]
        
        # Add any other drugs in vocabulary that match
        all_vocab = list(self.drug_to_idx.keys())
        seen = set(curated_priority)
        rest = [d for d in all_vocab if d not in seen and not d.startswith("*nf") and len(d) > 2]
        return curated_priority + sorted(rest[:500])

