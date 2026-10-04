# ==============================================================================
# GeriSafe CDSS - Developer Makefile
# ==============================================================================

.PHONY: help setup setup-backend setup-frontend backend frontend streamlit test test-gnn test-llm smoke-test docker-up docker-down lint clean

PYTHON := .venv/Scripts/python
UVICORN := .venv/Scripts/uvicorn
STREAMLIT := .venv/Scripts/streamlit
NPM := npm

help:
	@echo "GeriSafe CDSS Automation Commands:"
	@echo "  make setup          - Install all Python (.venv) and Node.js dependencies"
	@echo "  make setup-backend  - Install Python dependencies via uv / pip"
	@echo "  make setup-frontend - Install Next.js dependencies in frontend/"
	@echo "  make backend        - Launch FastAPI backend service on port 8000"
	@echo "  make frontend       - Launch Next.js clinical dashboard on port 3000"
	@echo "  make streamlit      - Launch standalone Streamlit explorer on port 8501"
	@echo "  make test           - Run full test and verification suite"
	@echo "  make test-gnn       - Verify GNN model inference and deprescribing simulator"
	@echo "  make test-llm       - Run LLM clinical explainer audit"
	@echo "  make smoke-test     - Run 2-epoch RETAIN pipeline smoke test"
	@echo "  make docker-up      - Start Ollama MedGemma container"
	@echo "  make docker-down    - Stop Ollama MedGemma container"
	@echo "  make clean          - Remove Python bytecode and build artifacts"

setup: setup-backend setup-frontend

setup-backend:
	@echo "==> Setting up Python virtual environment and dependencies..."
	uv sync || pip install -r requirements.txt

setup-frontend:
	@echo "==> Installing frontend dependencies..."
	cd frontend && $(NPM) install

backend:
	@echo "==> Starting FastAPI backend server on http://127.0.0.1:8000..."
	$(UVICORN) src.api.main:app --reload --host 127.0.0.1 --port 8000

frontend:
	@echo "==> Starting Next.js clinical dashboard on http://localhost:3000..."
	cd frontend && $(NPM) run dev

streamlit:
	@echo "==> Starting Streamlit research explorer on http://localhost:8501..."
	$(STREAMLIT) run app/gnn_app.py

test: test-gnn test-llm
	@echo "==> Running Pytest suite..."
	$(PYTHON) -m pytest tests -v

test-gnn:
	@echo "==> Running GNN inference & simulation verification..."
	$(PYTHON) scripts/test_gnn_inference.py

test-llm:
	@echo "==> Running LLM explainer audit..."
	$(PYTHON) src/explainability/test_llm_explainer.py

smoke-test:
	@echo "==> Running PyHealth RETAIN baseline smoke test..."
	$(PYTHON) scripts/smoke_test.py

docker-up:
	docker compose up -d

docker-down:
	docker compose down

lint:
	cd frontend && $(NPM) run lint

clean:
	@echo "==> Cleaning cache directories..."
	rm -rf __pycache__ src/**/__pycache__ .pytest_cache frontend/.next
