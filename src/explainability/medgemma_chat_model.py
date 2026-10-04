import os
import sys
import logging
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from io import BytesIO
import base64

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import torch
from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    ChatMessage,
    HumanMessage,
    SystemMessage,
)
from langchain_core.outputs import ChatGeneration, ChatResult
from pydantic import Field
from PIL import Image
import requests

logger = logging.getLogger("MedGemmaChatModel")


class MedGemmaChatModel(BaseChatModel):
    """
    LangChain BaseChatModel implementation for Google's MedGemma 1.5 4B Instruct:
    'google/medgemma-1.5-4b-it' (Multimodal Image-Text Foundation Model).

    Capabilities:
    - Multimodal understanding: processes clinical text, labs, and optional images (charts, ECGs, pill bottles).
    - Memory-efficient execution: leverages `device_map='auto'`, bfloat16/float16, and optional 4-bit quantization.
    - Native LangChain LCEL integration: works with ChatPromptTemplate, PydanticOutputParser, and Runnables.
    - Graceful error reporting: clear feedback if Hugging Face gated repo access or token is missing.
    """

    model_id: str = Field(default="google/medgemma-1.5-4b-it")
    device_map: str = Field(default="auto")
    torch_dtype: str = Field(default="bfloat16")
    quantization: str = Field(default="none")  # "4bit", "8bit", "none"
    max_new_tokens: int = Field(default=512)
    temperature: float = Field(default=0.1)
    hf_token: Optional[str] = Field(default=None)

    # Internal cached model and processor handles
    _processor: Any = None
    _model: Any = None
    _is_loaded: bool = False

    model_config = {"arbitrary_types_allowed": True}

    @property
    def _llm_type(self) -> str:
        return "medgemma-1.5-4b-multimodal"

    def is_weights_cached(self) -> bool:
        """Require actual weight files, including every shard referenced by an index."""
        try:
            from huggingface_hub import try_to_load_from_cache
            for filename in ["model.safetensors", "pytorch_model.bin"]:
                cached = try_to_load_from_cache(self.model_id, filename)
                if isinstance(cached, str) and Path(cached).is_file():
                    return True
            for filename in ["model.safetensors.index.json", "pytorch_model.bin.index.json"]:
                cached = try_to_load_from_cache(self.model_id, filename)
                if not isinstance(cached, str) or not Path(cached).is_file():
                    continue
                with open(cached, "r", encoding="utf-8") as index_file:
                    index = json.load(index_file)
                shards = set(index.get("weight_map", {}).values())
                if not shards:
                    continue
                shard_paths = [try_to_load_from_cache(self.model_id, shard) for shard in shards]
                if all(isinstance(path, str) and Path(path).is_file() for path in shard_paths):
                    return True
            return False
        except Exception:
            return False

    def _load_model_and_processor(self) -> None:
        """Loads model and processor on-demand to optimize memory and startup latency."""
        if self._is_loaded and self._model is not None and self._processor is not None:
            return

        if not self.is_weights_cached():
            raise RuntimeError(
                f"Weights for '{self.model_id}' are not yet fully cached locally. "
                "Routing through calibrated Clinical Expert Engine to avoid synchronous HTTP timeouts."
            )

        from transformers import AutoProcessor, AutoModelForMultimodalLM

        token = self.hf_token or os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_HUB_TOKEN")

        # Resolve torch dtype
        if self.torch_dtype == "bfloat16" and torch.cuda.is_available() and torch.cuda.is_bf16_supported():
            resolved_dtype = torch.bfloat16
        elif torch.cuda.is_available():
            resolved_dtype = torch.float16
        else:
            resolved_dtype = torch.float32

        # Optional Quantization configuration
        quant_kwargs = {}
        if self.quantization == "4bit":
            try:
                from transformers import BitsAndBytesConfig
                quant_kwargs["quantization_config"] = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_compute_dtype=resolved_dtype,
                    bnb_4bit_quant_type="nf4",
                    bnb_4bit_use_double_quant=True,
                )
                logger.info("[MedGemmaChatModel] Configured 4-bit BitsAndBytes quantization.")
            except ImportError:
                logger.warning("[MedGemmaChatModel] bitsandbytes not available; continuing in standard precision.")
        elif self.quantization == "8bit":
            try:
                from transformers import BitsAndBytesConfig
                quant_kwargs["quantization_config"] = BitsAndBytesConfig(load_in_8bit=True)
                logger.info("[MedGemmaChatModel] Configured 8-bit BitsAndBytes quantization.")
            except ImportError:
                logger.warning("[MedGemmaChatModel] bitsandbytes not available; continuing in standard precision.")

        logger.info(f"[MedGemmaChatModel] Loading processor for {self.model_id}...")
        try:
            self._processor = AutoProcessor.from_pretrained(
                self.model_id,
                token=token,
                local_files_only=True,
            )
        except Exception as e:
            msg = str(e)
            if "401" in msg or "403" in msg or "GatedRepo" in msg or "gated" in msg.lower():
                raise RuntimeError(
                    f"Access to '{self.model_id}' requires Hugging Face authentication and license acceptance.\n"
                    f"1. Visit https://huggingface.co/{self.model_id} and accept the MedGemma terms.\n"
                    f"2. Run 'hf auth login' or export HF_TOKEN=<your_token>.\n"
                    f"Original error: {e}"
                ) from e
            raise

        logger.info(f"[MedGemmaChatModel] Loading multimodal model {self.model_id} (device_map={self.device_map})...")
        try:
            self._model = AutoModelForMultimodalLM.from_pretrained(
                self.model_id,
                device_map=self.device_map,
                torch_dtype=resolved_dtype,
                token=token,
                local_files_only=True,
                **quant_kwargs,
            )
            self._is_loaded = True
            logger.info(f"[MedGemmaChatModel] Successfully initialized {self.model_id}.")
        except Exception as e:
            msg = str(e)
            if "401" in msg or "403" in msg or "GatedRepo" in msg or "gated" in msg.lower():
                raise RuntimeError(
                    f"Access to '{self.model_id}' requires Hugging Face authentication and license acceptance.\n"
                    f"1. Visit https://huggingface.co/{self.model_id} and accept the MedGemma terms.\n"
                    f"2. Run 'hf auth login' or export HF_TOKEN=<your_token>.\n"
                    f"Original error: {e}"
                ) from e
            raise

    def _convert_messages_to_medgemma_format(self, messages: List[BaseMessage]) -> List[Dict[str, Any]]:
        """
        Converts LangChain BaseMessages to MedGemma chat template format:
        [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": <PIL.Image or url>},
                    {"type": "text", "text": "..."}
                ]
            }
        ]
        """
        formatted_messages = []
        system_prompt_parts = []

        for msg in messages:
            if isinstance(msg, SystemMessage):
                system_prompt_parts.append(str(msg.content))
            elif isinstance(msg, HumanMessage):
                user_content_items = []
                # Prepend any system instructions to the first human turn
                if system_prompt_parts:
                    system_prefix = "\n\n".join(system_prompt_parts) + "\n\n"
                    system_prompt_parts.clear()
                else:
                    system_prefix = ""

                if isinstance(msg.content, str):
                    user_content_items.append({
                        "type": "text",
                        "text": f"{system_prefix}{msg.content}"
                    })
                elif isinstance(msg.content, list):
                    # Multimodal content block in LangChain
                    text_appended = False
                    for item in msg.content:
                        if isinstance(item, dict):
                            item_type = item.get("type")
                            if item_type == "text":
                                text_str = item.get("text", "")
                                if not text_appended and system_prefix:
                                    text_str = f"{system_prefix}{text_str}"
                                    text_appended = True
                                user_content_items.append({"type": "text", "text": text_str})
                            elif item_type in ["image_url", "image"]:
                                img_val = item.get("image_url") or item.get("image")
                                pil_img = self._resolve_pil_image(img_val)
                                if pil_img is not None:
                                    user_content_items.append({"type": "image", "image": pil_img})
                                elif isinstance(img_val, str) and img_val.startswith("http"):
                                    user_content_items.append({"type": "image", "url": img_val})
                            else:
                                user_content_items.append(item)
                        elif isinstance(item, str):
                            user_content_items.append({"type": "text", "text": item})

                formatted_messages.append({
                    "role": "user",
                    "content": user_content_items
                })
            elif isinstance(msg, AIMessage):
                formatted_messages.append({
                    "role": "assistant",
                    "content": [{"type": "text", "text": str(msg.content)}]
                })
            else:
                formatted_messages.append({
                    "role": "user",
                    "content": [{"type": "text", "text": str(msg.content)}]
                })

        return formatted_messages

    def _resolve_pil_image(self, val: Any) -> Optional[Image.Image]:
        """Resolves image strings (URL, file path, base64) or Image object to PIL.Image."""
        if isinstance(val, Image.Image):
            return val
        if isinstance(val, dict) and "url" in val:
            val = val["url"]
        if not isinstance(val, str):
            return None

        # Base64 string
        if val.startswith("data:image"):
            try:
                base64_data = val.split(",")[1]
                return Image.open(BytesIO(base64.b64decode(base64_data))).convert("RGB")
            except Exception as e:
                logger.warning(f"[MedGemmaChatModel] Failed to decode base64 image: {e}")
                return None

        # Local file path
        p = Path(val)
        if p.exists() and p.is_file():
            try:
                return Image.open(p).convert("RGB")
            except Exception as e:
                logger.warning(f"[MedGemmaChatModel] Failed to load local image file '{val}': {e}")
                return None

        # Remote URL
        if val.startswith("http://") or val.startswith("https://"):
            try:
                resp = requests.get(val, timeout=10)
                if resp.status_code == 200:
                    return Image.open(BytesIO(resp.content)).convert("RGB")
            except Exception as e:
                logger.warning(f"[MedGemmaChatModel] Failed to download image from '{val}': {e}")
                return None

        return None

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        """Executes inference using MedGemma 1.5 4B multimodal pipeline."""
        self._load_model_and_processor()

        medgemma_msgs = self._convert_messages_to_medgemma_format(messages)

        # Apply MedGemma chat template
        inputs = self._processor.apply_chat_template(
            medgemma_msgs,
            add_generation_prompt=True,
            tokenize=True,
            return_dict=True,
            return_tensors="pt",
        )

        device = getattr(self._model, "device", "cuda" if torch.cuda.is_available() else "cpu")
        inputs = {k: v.to(device) for k, v in inputs.items()}

        max_tokens = kwargs.get("max_new_tokens", self.max_new_tokens)
        temp = kwargs.get("temperature", self.temperature)

        with torch.no_grad():
            outputs = self._model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                do_sample=temp > 0.0,
                temperature=temp if temp > 0.0 else None,
            )

        # Extract only the newly generated tokens
        input_len = inputs["input_ids"].shape[-1]
        new_tokens = outputs[0][input_len:]
        decoded_text = self._processor.decode(new_tokens, skip_special_tokens=True).strip()

        message = AIMessage(content=decoded_text)
        generation = ChatGeneration(message=message)
        return ChatResult(generations=[generation])


if __name__ == "__main__":
    print("[MedGemmaChatModel] Smoke test module definition...")
    model = MedGemmaChatModel(model_id="google/medgemma-1.5-4b-it")
    print(f"Model initialized (lazy mode): {model._llm_type}")
