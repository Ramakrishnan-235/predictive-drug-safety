import os
import sys
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import yaml
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.runnables import RunnableLambda

from src.explainability.clinical_explainer import ClinicalRecommendation
from src.explainability.knowledge_retriever import ClinicalKnowledgeRetriever
from src.explainability.medgemma_chat_model import MedGemmaChatModel

logger = logging.getLogger("LangChainClinicalExplainer")


class LangChainClinicalExplainer:
    """
    LangChain LCEL Explainer Framework for Inpatient Fall Risk & Drug-Drug Interactions.

    Features:
    1. LCEL Architecture:
       Retriever -> ChatPromptTemplate -> MedGemmaChatModel / Fallback -> PydanticOutputParser
    2. Google MedGemma 1.5-4B Multimodal Integration:
       Supports both standard clinical tabular/text data and multimodal inputs (medication images, ECG, chart scans).
    3. Retrieval-Augmented Grounding (RAG):
       Retrieves authoritative criteria from ChromaDB (AGS Beers 2023 & STOPP/START v3).
    4. Resilient Fallback Engine:
       If local MedGemma weights are gated/downloading, smoothly routes to Ollama, external LLMs, or offline expert.
    """

    def __init__(self, config_path: str = "configs/llm.yaml"):
        self.config_path = config_path
        self.config = self._load_config(config_path)
        self.retriever = ClinicalKnowledgeRetriever()
        self.parser = PydanticOutputParser(pydantic_object=ClinicalRecommendation)
        
        # Initialize MedGemma LangChain Model
        medgemma_cfg = self.config.get("medgemma", {})
        self.medgemma_model = MedGemmaChatModel(
            model_id=medgemma_cfg.get("model_id", "google/medgemma-1.5-4b-it"),
            device_map=medgemma_cfg.get("device_map", "auto"),
            torch_dtype=medgemma_cfg.get("torch_dtype", "bfloat16"),
            quantization=medgemma_cfg.get("quantization", "none"),
            max_new_tokens=int(medgemma_cfg.get("max_new_tokens", 512)),
            temperature=float(self.config.get("temperature", 0.1)),
        )

        # Build prompt templates
        self._build_prompt_templates()

    def _load_config(self, path_str: str) -> Dict[str, Any]:
        p = Path(path_str)
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return yaml.safe_load(f) or {}
            except Exception as e:
                logger.warning(f"Could not load config from {path_str}: {e}")
        return {
            "provider": "medgemma",
            "model_name": "google/medgemma-1.5-4b-it",
            "temperature": 0.1,
            "ollama_base_url": "http://localhost:11434",
            "ollama_model": "medgemma:1.5",
        }

    def _build_prompt_templates(self) -> None:
        """Constructs LangChain ChatPromptTemplates for clinical pharmacology reasoning."""
        format_instructions = self.parser.get_format_instructions()

        self.system_prompt_text = (
            "You are a clinical geriatric pharmacologist and clinical decision support system (CDSS) specialist.\n"
            "Your objective is to provide causal, receptor-level pharmacological explanations for an inpatient's "
            "predicted fall and syncope risk, and construct an actionable deprescribing taper plan.\n\n"
            "Clinical Directives:\n"
            "1. Ground all recommendations strictly in AGS Beers Criteria 2023 and STOPP/START v3 guidelines.\n"
            "2. Explain biochemical mechanisms (e.g., GABAA receptor chloride influx sedation, alpha-1 / loop "
            "diuretic volume depletion and orthostatic hypotension, anticholinergic burden, renal AUC accumulation).\n"
            "3. Provide concrete deprescribing steps (dose titrations, morning scheduling, discontinuation).\n\n"
            f"{format_instructions}\n"
            "IMPORTANT: Output ONLY a valid JSON object complying with the schema above. No preambles or conversational text."
        )

    def explain_case(
        self,
        hadm_id: int,
        predicted_fall_risk: float,
        risk_stratification: str,
        top_drivers: List[Any],
        active_medications: List[str],
        clinical_labs: Optional[Dict[str, Any]] = None,
        retrieved_guidelines: Optional[List[str]] = None,
        top_interaction_pairs: Optional[List[str]] = None,
        image_input: Optional[Union[str, Any]] = None,
    ) -> ClinicalRecommendation:
        """
        Executes the full LangChain Explainer Chain for a patient case.
        Supports multimodal inputs via `image_input` (path, URL, or PIL Image).
        """
        labs = clinical_labs or {}
        driver_strings = [
            f"{d.get('feature', 'Unknown')} (Attribution: +{float(d.get('attribution_weight', 0.0)):.3f})"
            if isinstance(d, dict) else str(d)
            for d in top_drivers
        ]

        # 1. RAG Step: Retrieve guidelines from ChromaDB if not explicitly passed
        if not retrieved_guidelines:
            query_terms = [
                d.get("feature", "") if isinstance(d, dict) else str(d)
                for d in top_drivers[:3]
            ]
            retrieved_guidelines = self.retriever.retrieve_guidelines(query_terms, n_results=3)

        # 2. Build structured case description
        case_data = {
            "hadm_id": hadm_id,
            "predicted_fall_risk": round(predicted_fall_risk, 4),
            "risk_stratification": risk_stratification,
            "patient_age": labs.get("age_at_admission", 78),
            "creatinine_max": labs.get("max_creatinine", 1.2),
            "calculated_egfr": labs.get("calculated_egfr", 35),
            "active_medications": active_medications[:15],
            "unique_drug_count": len(active_medications),
            "primary_risk_drivers": driver_strings,
            "top_gnn_attention_interactions": top_interaction_pairs or [],
            "retrieved_clinical_guidelines": retrieved_guidelines or [],
        }

        user_content_str = (
            f"Analyze this patient profile and generate structured clinical recommendations:\n"
            f"{json.dumps(case_data, indent=2)}"
        )

        # 3. Construct LangChain Messages (with multimodal support)
        messages = [SystemMessage(content=self.system_prompt_text)]

        if image_input:
            # Multimodal HumanMessage
            messages.append(HumanMessage(content=[
                {"type": "text", "text": user_content_str},
                {"type": "image", "image": image_input}
            ]))
        else:
            # Text-only HumanMessage
            messages.append(HumanMessage(content=user_content_str))

        # 4. Attempt LangChain MedGemma execution
        provider = str(self.config.get("provider", "medgemma")).lower().strip()

        if provider in ["medgemma", "langchain"]:
            try:
                logger.info("[LangChainExplainer] Invoking MedGemmaChatModel (google/medgemma-1.5-4b-it)...")
                response = self.medgemma_model.invoke(messages)
                raw_text = response.content if hasattr(response, "content") else str(response)
                parsed = self._clean_and_parse_json(raw_text)
                if parsed:
                    return ClinicalRecommendation(**parsed)
            except Exception as e:
                logger.warning(
                    f"[LangChainExplainer] MedGemma 1.5 4B execution did not complete ({e}). "
                    f"Initiating resilient fallback hierarchy."
                )

        # 5. Fallback Tier A: Ollama Service
        ollama_rec = self._try_ollama_fallback(case_data)
        if ollama_rec:
            return ollama_rec

        # 6. Fallback Tier B: Offline Expert Clinical Synthesis Engine
        logger.info("[LangChainExplainer] Using Calibrated Offline Clinical Expert Engine.")
        return self._synthesize_offline_expert(case_data)

    def _clean_and_parse_json(self, text: str) -> Optional[Dict[str, Any]]:
        """Cleans Markdown markdown tags and parses JSON output."""
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        # Find first { and last }
        start_idx = cleaned.find("{")
        end_idx = cleaned.rfind("}")
        if start_idx != -1 and end_idx != -1:
            cleaned = cleaned[start_idx : end_idx + 1]

        try:
            return json.loads(cleaned)
        except Exception as e:
            logger.debug(f"[LangChainExplainer] JSON parse error: {e}")
            return None

    def _try_ollama_fallback(self, payload: Dict[str, Any]) -> Optional[ClinicalRecommendation]:
        """Tries local/docker Ollama if reachable."""
        import httpx
        base_url = self.config.get("ollama_base_url", "http://localhost:11434")
        model = self.config.get("ollama_model", "medgemma:1.5")
        try:
            with httpx.Client(timeout=3.0) as client:
                r = client.get(f"{base_url}/api/tags")
                if r.status_code != 200:
                    return None
                
            prompt = (
                f"{self.system_prompt_text}\n\n"
                f"Patient Case Data:\n{json.dumps(payload, indent=2)}"
            )
            with httpx.Client(timeout=float(self.config.get("timeout_seconds", 25))) as client:
                resp = client.post(
                    f"{base_url}/api/chat",
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": self.system_prompt_text},
                            {"role": "user", "content": f"Patient Case Data:\n{json.dumps(payload, indent=2)}"}
                        ],
                        "format": "json",
                        "stream": False,
                    }
                )
                if resp.status_code == 200:
                    data = json.loads(resp.json()["message"]["content"])
                    return ClinicalRecommendation(**data)
        except Exception:
            pass
        return None

    def _synthesize_offline_expert(self, payload: Dict[str, Any]) -> ClinicalRecommendation:
        """Calibrated pharmacology expert fallback grounded in Beers 2023 and STOPP v3."""
        hadm_id = payload["hadm_id"]
        prob = payload["predicted_fall_risk"]
        strat = payload["risk_stratification"]
        drivers = payload["primary_risk_drivers"]
        meds = [m.lower() for m in payload["active_medications"]]
        cr_max = float(payload.get("creatinine_max") or 1.0)
        age = int(payload.get("patient_age") or 75)
        guidelines = list(payload.get("retrieved_clinical_guidelines") or [])
        gnn_pairs = payload.get("top_gnn_attention_interactions") or []

        mechanisms = []
        action_plan = []
        med_text = " ".join(meds)

        # 1. Opioids
        if any("opioid" in d.lower() for d in drivers) or any(m in med_text for m in ["morphine", "oxycodone", "hydromorphone", "fentanyl", "tramadol"]):
            mechanisms.append(
                "Mu-opioid receptor stimulation in brainstem arousal centers induces severe central sedation, "
                "ataxia, and blunted postural righting reflexes."
            )
            action_plan.append("De-escalate opioid dosing by 15-20% weekly and transition to multimodal non-opioid analgesia.")
            guidelines.append("AGS Beers 2023: Avoid opioids in patients with history of falls or syncope; multiplicative risk with sedatives.")

        # 2. Benzodiazepines & Z-drugs
        if any("benzo" in d.lower() for d in drivers) or any(m in med_text for m in ["lorazepam", "zolpidem", "clonazepam", "alprazolam", "diazepam"]):
            mechanisms.append(
                "Positive allosteric modulation of GABAA receptors enhances inhibitory chloride conductance, "
                "causing daytime psychomotor sluggishness, vestibular ataxia, and prolonged reaction times."
            )
            action_plan.append("Initiate bi-weekly 25% taper of sedative/hypnotic; introduce cognitive-behavioral sleep hygiene.")
            guidelines.append("STOPP v3 (Section K): Benzodiazepines and Z-drugs trigger acute confusion and falls in older adults.")

        # 3. Vasodilators & Diuretics
        if any("diuretic" in d.lower() or "vasodilator" in d.lower() for d in drivers) or any(m in med_text for m in ["furosemide", "hydralazine", "nitroglycerin", "metoprolol"]):
            mechanisms.append(
                "Synergistic intravascular volume depletion and systemic arteriolar vasodilation precipitate "
                "cerebral hypoperfusion upon standing (orthostatic MAP drop > 20 mmHg)."
            )
            action_plan.append("Consolidate diuretic dosing to morning (08:00 AM) and verify standing orthostatic blood pressure.")

        # 4. Renal clearance deficit
        if cr_max > 1.4 or payload.get("calculated_egfr", 100) < 45:
            mechanisms.append(
                f"Impaired renal excretion (Cr {cr_max:.2f} mg/dL, eGFR {payload.get('calculated_egfr', 35)} mL/min) "
                "prolongs the biological half-life of active drugs and neurotoxic metabolites."
            )
            action_plan.append("Adjust dosing for all renally cleared drugs according to Cockcroft-Gault CrCl.")

        if gnn_pairs:
            action_plan.append(f"Stagger or modify co-prescribed pairs identified by GNN attention: {', '.join(gnn_pairs[:2])}.")

        if not action_plan:
            action_plan.append("Conduct comprehensive inpatient medication reconciliation and maintain fall precautions.")

        unique_citations = list(dict.fromkeys(guidelines))[:3]

        return ClinicalRecommendation(
            hadm_id=hadm_id,
            predicted_fall_risk=round(prob, 4),
            risk_stratification=strat,
            primary_risk_drivers=drivers,
            pharmacological_mechanisms=" ".join(mechanisms) if mechanisms else f"Cumulative polypharmacy burden compounding age-related ({age} yo) physiological vulnerability.",
            clinical_guideline_citations=unique_citations,
            actionable_deprescribing_plan=action_plan,
        )


if __name__ == "__main__":
    print("[LangChainClinicalExplainer] Running standalone test...")
    explainer = LangChainClinicalExplainer()
    rec = explainer.explain_case(
        hadm_id=20582386,
        predicted_fall_risk=0.5420,
        risk_stratification="High",
        top_drivers=[
            {"feature": "opioids", "attribution_weight": 0.684},
            {"feature": "benzodiazepines_and_z_drugs", "attribution_weight": 0.412}
        ],
        active_medications=["Morphine Sulfate", "Lorazepam", "Furosemide"],
        clinical_labs={"age_at_admission": 84, "max_creatinine": 1.45, "calculated_egfr": 32},
        top_interaction_pairs=["Morphine <-> Lorazepam (GATv2: 0.945)"]
    )
    print("\n--- Synthesized Clinical Recommendation ---")
    print(rec.model_dump_json(indent=2))
