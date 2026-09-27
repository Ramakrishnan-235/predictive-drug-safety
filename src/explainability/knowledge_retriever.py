import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import chromadb
from chromadb.utils import embedding_functions
from typing import List, Dict

CHROMA_PATH = Path("data/chroma_clinical_kb")

# Seed expert clinical evidence for fall risks and drug interactions
CLINICAL_KNOWLEDGE_DOCS = [
    {
        "id": "beers_cns_polypharmacy",
        "topic": "cns_polypharmacy_flag",
        "content": "2023 AGS Beers Criteria: Concurrent use of 3 or more CNS-active agents (antipsychotics, benzodiazepines, Z-drugs, sedating antidepressants, opioids, antiepileptics) substantially elevates fall and fracture risk due to additive sedation and cerebellar ataxia."
    },
    {
        "id": "stopp_benzodiazepines",
        "topic": "benzodiazepines_and_z_drugs",
        "content": "STOPP v3 (Section K): Benzodiazepines and Z-drugs cause central psychomotor impairment, delayed reaction times, and nocturnal confusion in older adults. Tapering to discontinuation or switching to non-pharmacological sleep hygiene is strongly recommended."
    },
    {
        "id": "ddi_sedation_hypotension",
        "topic": "w_ddi_score",
        "content": "Pharmacodynamic Synergism: Concomitant administration of vasodilators/diuretics (e.g., furosemide) with CNS depressants (e.g., lorazepam) precipitates orthostatic hypotension and syncope upon standing, sharply increasing mechanical fall events."
    },
    {
        "id": "renal_clearance_impairment",
        "topic": "renal_contraindication_flag",
        "content": "Renal Clearance Impairment: Elevated serum creatinine (>1.5 mg/dL) slows renal clearance of active drug metabolites (e.g., gabapentin, digoxin, active opioid glucuronides), leading to systemic drug accumulation and heightened neurotoxicity."
    },
    {
        "id": "stopp_loop_diuretics",
        "topic": "loop_diuretics",
        "content": "STOPP v3: Loop diuretics used as first-line for hypertension without heart failure cause rapid volume depletion, urinary urgency incontinence, and postprandial dizziness, precipitating falls during transit to bathroom facilities."
    }
]


class ClinicalKnowledgeRetriever:
    def __init__(self):
        CHROMA_PATH.mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(path=str(CHROMA_PATH))
        self.embed_fn = embedding_functions.DefaultEmbeddingFunction()
        self.collection = self.client.get_or_create_collection(
            name="geriatric_safety_guidelines",
            embedding_function=self.embed_fn
        )
        self._seed_knowledge_base()

    def _seed_knowledge_base(self):
        if self.collection.count() == 0:
            self.collection.add(
                ids=[doc["id"] for doc in CLINICAL_KNOWLEDGE_DOCS],
                documents=[doc["content"] for doc in CLINICAL_KNOWLEDGE_DOCS],
                metadatas=[{"topic": doc["topic"]} for doc in CLINICAL_KNOWLEDGE_DOCS]
            )

    def retrieve_guidelines(self, query_terms: List[str], n_results: int = 3) -> List[str]:
        query_text = " ".join(query_terms)
        results = self.collection.query(
            query_texts=[query_text],
            n_results=min(n_results, self.collection.count())
        )
        return results["documents"][0] if results["documents"] else []


if __name__ == "__main__":
    retriever = ClinicalKnowledgeRetriever()
    print(f"ChromaDB seeded successfully. Document count: {retriever.collection.count()}")
    test_terms = ["renal_contraindication_flag", "creatinine", "clearance"]
    retrieved = retriever.retrieve_guidelines(test_terms, n_results=2)
    print(f"\nRetrieved {len(retrieved)} guidelines for terms {test_terms}:")
    for i, doc in enumerate(retrieved, 1):
        print(f"{i}. {doc}\n")
