import os
import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Load .env if present
from dotenv import load_dotenv
load_dotenv()

from huggingface_hub import HfApi
from transformers import AutoConfig, AutoProcessor
from src.explainability.medgemma_chat_model import MedGemmaChatModel
from src.explainability.langchain_explainer import LangChainClinicalExplainer


def test_medgemma_connection():
    print("=" * 70)
    print("   MEDGEMMA 1.5-4B & HUGGING FACE CONNECTION DIAGNOSTIC SUITE   ")
    print("=" * 70 + "\n")

    # 1. Verify Hugging Face Authentication Token
    token = os.environ.get("HF_TOKEN")
    print(f"[Step 1] Checking Hugging Face Token...")
    if not token:
        # Check cache
        from huggingface_hub import get_token
        token = get_token()

    if not token:
        print("  ❌ ERROR: No Hugging Face token found in environment or cache.")
        sys.exit(1)

    masked_token = token[:7] + "..." + token[-4:] if len(token) > 12 else "***"
    print(f"  ✓ Token found: {masked_token}")

    api = HfApi(token=token)
    user_info = api.whoami()
    print(f"  ✓ Authenticated as HF user: '{user_info.get('name')}' (Type: {user_info.get('type', 'user')})")

    # 2. Verify Access to Gated Model Repository
    model_id = "google/medgemma-1.5-4b-it"
    print(f"\n[Step 2] Verifying access to gated model '{model_id}'...")
    try:
        model_info = api.model_info(model_id)
        print(f"  ✓ Model repository confirmed accessible! (ID: {model_info.id})")
        print(f"  ✓ Gated status: {model_info.gated} (Access Granted)")
    except Exception as e:
        print(f"  ❌ Failed to verify model access: {e}")
        sys.exit(1)

    # 3. Verify AutoConfig & Architecture
    print(f"\n[Step 3] Fetching model configuration from Hugging Face Hub...")
    cfg = AutoConfig.from_pretrained(model_id, token=token)
    print(f"  ✓ Model Type: {cfg.model_type}")
    print(f"  ✓ Architectures: {cfg.architectures}")

    # 4. Verify Processor
    print(f"\n[Step 4] Initializing AutoProcessor for '{model_id}'...")
    processor = AutoProcessor.from_pretrained(model_id, token=token)
    print(f"  ✓ Processor class: {processor.__class__.__name__}")
    print(f"  ✓ Chat template available: {'chat_template' in dir(processor)}")

    # 5. Verify LangChain MedGemma Model Initialization
    print(f"\n[Step 5] Initializing LangChain MedGemmaChatModel wrapper...")
    chat_model = MedGemmaChatModel(model_id=model_id, hf_token=token)
    print(f"  ✓ LangChain Model Type: {chat_model._llm_type}")
    print(f"  ✓ Target Device: {chat_model.device_map}")
    print(f"  ✓ Target Dtype: {chat_model.torch_dtype}")

    # 6. Verify LangChain Explainer Integration
    print(f"\n[Step 6] Initializing LangChain Clinical Explainer...")
    explainer = LangChainClinicalExplainer()
    print(f"  ✓ LangChain Explainer initialized successfully!")
    print(f"  ✓ Connected to ChromaDB Knowledge Retriever ({explainer.retriever.collection.count()} guideline docs)")

    print("\n" + "=" * 70)
    print("   ALL CHECKS PASSED: MEDGEMMA 1.5-4B IS FULLY CONNECTED & AUTHENTICATED!  ")
    print("=" * 70)


if __name__ == "__main__":
    test_medgemma_connection()
