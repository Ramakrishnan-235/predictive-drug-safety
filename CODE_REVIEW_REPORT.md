# Code review and refactoring report

Date: 3 October 2026 (Asia/Calcutta)

Reviewed the working checkout on `main`, starting at `f23e3cd`, with three sub-agents covering the API, frontend, and model/explanation pipeline. The primary agent integrated their work, added regression tests, checked data utility paths, and verified the final build and HTTP behavior.

The fixes improve patient isolation, mutation correctness, failure handling, and the distinction between actual server results and demonstration data. The project still has the production and clinical-validity gaps listed below.

## Completed changes

| Area | Problem found | Result |
| --- | --- | --- |
| Patient identity | Unknown IDs returned a default patient's record or signed that patient's plans. | Exact ID/MRN lookup; unknown patient requests return 404. Census patients get their own available details without inheriting another patient's plans. |
| Request validation | Blank medications/actions and inconsistent clinical inputs reached inference; omitted fields inserted sample identities or drugs. | Shared schemas validate finite, nonnegative age, positive creatinine, ordered creatinine ranges, and nonblank values. Admission drugs, signing patient ID, and pipeline identity/medication source are explicit requirements. |
| Admissions | Inference failures produced synthetic risk values; admissions did not register consistent detail records. | Failures return errors before writes. Census, detail, and audit registration share a process-local lock. Parallel admissions get unique identifiers; duplicate active MRNs return 409. |
| Medication display | The first supplied drugs were labeled high-risk regardless of rules. | Complete canonical regimens are retained and deduplicated. High-risk lists use the existing per-medication safety audit. Missing measurements display as unavailable. |
| CPOE authorization | Empty/unknown actions could succeed, retries duplicated audits, and signing assigned hard-coded lower risk. | Actions are validated; repeat signing is safe; override reasons are recorded. Authorization preserves risk until treatment execution and recomputation. Responses report pending execution rather than claiming pharmacy/EHR transmission. |
| Ward metrics | Counts and risk distribution remained fixed after admission. | Census-derived counts/distribution update. Remaining operational KPI fixtures carry provenance metadata and display a demonstration label. |
| FHIR export | Missing IDs substituted another patient; the frontend fabricated a fallback export; references and birth dates were synthesized. | Selected-patient export uses exact identity. Ward export covers all census patients. References use unique UUID URLs; unknown birth dates/default medications are omitted. Copy/download require a successful API response. |
| GNN artifacts | Missing checkpoints ran randomly initialized weights; missing vocabulary produced dummy IDs or rebuilt from a patient parquet. | Checkpoint/vocabulary paths resolve from the project root. Missing/invalid artifacts fail explicitly. |
| Regimen simulation | Empty regimens exposed an `unknown` medication, duplicates inflated burden, and partial/empty removal strings removed unintended medications. | Public empty regimens stay empty; canonical names deduplicate; removal requires an active medication match. The graph retains its internal pooling node. `target_drug_removed` is available alongside the existing output key. |
| Explanations | Optional retrieval initialization could prevent fallback; medication lists were truncated; generated text could overwrite identity/risk; negative verification still appeared verified. | Lightweight shared recommendation schema; lazy optional initialization; complete medication lists; authoritative case context. Model review preserves negative responses and does not invent confidence or culprit drugs. Deterministic fallback identifies itself and requires clinician review. Cached model loading checks every shard and uses local files. |
| Frontend mutations | Failed saves fabricated success and replaced server IDs; the admission form lacked a save button; signing was local UI state. | Explicit asynchronous save/sign requests, error feedback, server IDs and zero values preserved, census/metric refresh, and patient-specific plans/audit confirmation. |
| Telemetry and UI | SSE cleanup leaked timers; demo pulses appeared live; sparse rows could break search; shrinking results could leave a blank page. | Upstream/timer cancellation; explicit demo provenance; safe presentation normalization; null-aware renal filters and pagination clamping. |
| Demonstration screens | Static SMR/trajectory values and unsupported compliance claims looked operational. | Sample screens and adjustment previews are labeled. Per-patient review opens the live drawer. Unsupported HIPAA/ISO compliance and EHR-transmission claims were removed. |
| Data utilities/testing | Cohort extraction and sanity checks used inconsistent raw directories; importing a utility eagerly required PyHealth; pytest failure did not fail the launcher. | Shared directory/table discovery supports standard/local layouts and compressed CSVs. PyHealth loading is deferred. The test launcher returns a nonzero exit on pytest failure. |

FHIR collection-bundle `total` was removed following the [HL7 R4 Bundle constraints](https://hl7.org/fhir/R4/bundle.html#constraints), which allow that field only for search/history bundles. This source check and the reference tests do not constitute full FHIR conformance validation.

## Main implementation locations

- [API lookup, admissions, pipeline, export and signing](<D:/Predictive Drug Safety/src/api/main.py:787>)
- [Shared request schemas](<D:/Predictive Drug Safety/src/api/schemas.py:13>), [state lock](<D:/Predictive Drug Safety/src/api/state.py:9>), [ward metrics/FHIR](<D:/Predictive Drug Safety/src/api/ward_data.py:281>)
- [GNN inference and simulation](<D:/Predictive Drug Safety/src/models/gnn_inference.py:44>)
- [Recommendation contract](<D:/Predictive Drug Safety/src/explainability/recommendation.py:1>), [lazy explainer](<D:/Predictive Drug Safety/src/explainability/llm_explainer.py:18>), [pipeline verification](<D:/Predictive Drug Safety/src/explainability/medgemma_pipeline.py:206>), [local model-cache checks](<D:/Predictive Drug Safety/src/explainability/medgemma_chat_model.py:59>)
- [Frontend request helper](<D:/Predictive Drug Safety/frontend/src/lib/api.ts:1>), [ward mutations](<D:/Predictive Drug Safety/frontend/src/hooks/useWardData.ts:44>), [patient drawer](<D:/Predictive Drug Safety/frontend/src/components/modals/PatientReviewDrawer.tsx:14>), [admission form](<D:/Predictive Drug Safety/frontend/src/components/modals/IngestAdmissionModal.tsx:1>)
- [Data-path discovery](<D:/Predictive Drug Safety/src/data_prep/paths.py:18>), [deferred PyHealth import](<D:/Predictive Drug Safety/src/data/__init__.py:5>), [test launcher](<D:/Predictive Drug Safety/run_tests.bat:1>)

## Verification

The original test baseline was **7 passed / 6 failed** after restoring the missing pytest runner. Several old tests expected response formats the actual API did not provide; those assertions were corrected to the real contracts, while retaining meaningful checks.

| Check | Final result |
| --- | --- |
| Python suite: `.venv\Scripts\python.exe -m pytest tests -q -o cache_dir=tmp/pytest-cache` | **72 passed**; one upstream Starlette/AnyIO deprecation warning |
| Python compilation: `python -m compileall -q src app scripts tests` | Passed |
| Frontend `npm.cmd test` | **10 passed**; Node emits a module-type detection warning |
| Frontend TypeScript / `npm.cmd run build` | Final source passed TypeScript and the production build |
| Frontend `npm.cmd run lint` | **0 errors / 1 warning**: TanStack Table is skipped by React Compiler (`PatientTriageTable.tsx:317`) |
| `git diff --check` with repository settings | Passed; Windows line-ending notices only |
| Real API over HTTP using local GNN artifacts | Health, 48-patient census, unknown-ID 404, prediction, exact simulation, invalid-target 422, 48-patient ward export, and SSE pulse passed |
| Production frontend over HTTP | Page and sample-placeholder label passed; live telemetry proxy returned the 48-patient backend pulse |
| Data utility imports | Passed without loading the optional PyHealth pipeline |

Added 59 Python regression cases and 10 frontend cases covering isolation, rejected mutations, repeat signing, concurrent IDs, explicit inputs, prediction failure, field normalization, model artifact failures, medication removal, truthful verification, incomplete model caches, request cancellation, and SSE cleanup.

The interactive browser tool failed to initialize (`trusted Node process exited unexpectedly`). Interactive UI flows therefore remain unverified; HTTP, unit/integration tests, types, and build are verified. Temporary test servers were stopped. Raw EHR cohort processing, model retraining, remote LLM inference, deployment, and EHR integration were not exercised.

## Remaining findings

| Priority | Finding and source evidence | Recommended follow-up |
| --- | --- | --- |
| P1 | API reads and signing have no authenticated clinician or authorization checks (`src/api/main.py:1267`). The caller supplies clinician identity. | Establish authentication/roles and derive audit actor from the authenticated session. |
| P1 | Ward state/audit are process-local and nondurable (`src/api/state.py:1`, `src/api/main.py:83`). The lock protects one process, not multiple workers or restarts. | Persistent patient/order/audit storage with transactional writes and repeat-safe request identifiers. |
| P1 | `predicted_probability` is derived from a hand-coded acuity score rather than the raw GNN sigmoid (`src/models/gnn_inference.py:340`, `:360`). The renal estimate is approximate (`:299`); source terminology implies calibration without calibration evidence. | Validate score meaning, renal input requirements, calibration and clinical outcomes before presenting clinical probabilities. |
| P1 | Training and inference use different DDI registries (`src/models/graph_dataset.py:81` vs `src/models/ddi_graph.py:13`); inference normalization is hard-coded (`gnn_inference.py:41`) while training recomputes it (`graph_dataset.py:105`). The saved checkpoint lacks a paired metadata manifest (`train_gnn.py:79`). | Version and package vocabulary, normalization, graph rules and weights together; verify reproducible training-to-inference parity. |
| P1 | Sedative taper directives differ across explainers (`clinical_explainer.py:67`, `llm_explainer.py:278`, `medgemma_pipeline.py:348`). | Clinician-reviewed source of truth for recommendations; these directives were preserved during the code refactor. |
| P2 | Unknown/empty graph nodes still use a learned drug embedding at index zero (`gnn_inference.py:140`). Public placeholder/count defects are fixed, but the underlying model representation remains ambiguous. | Define missing/unknown-regimen behavior and retrain with an explicit representation. |
| P2 | Legacy standalone CDS service uses a fixed feature vector and medication list regardless of request prefetch (`src/api/cds_service.py:78`). | Keep it clearly restricted to demonstrations or implement validated prefetch transformation. |
| P2 | Some KPI values, SMR/trajectory screens, and seeded patient details remain demonstration fixtures. Census patients without curated plans now correctly show no available plans rather than inheriting demo plans. | Supply real patient-specific measurements, trajectories and reviewed plans through the authoritative storage/integration path. |
| P2 | Missing-value imputation uses full-cohort medians before patient splitting (`src/models/dataset.py:58`, `src/models/graph_dataset.py:71`). | Fit imputation exclusively on the training split and persist preprocessing state. |
| P2 | Dependency/setup paths differ: `uv` project dependencies omit pytest/PyHealth/loguru present in `requirements.txt`; the existing environment lacked those packages. | Align runtime/optional/dev dependencies and verify clean setup. Pytest/pip were restored locally for this review; PyHealth baseline training remains unverified. |
| P2 | FHIR export correctness was checked for identity, references, coverage and bundle rules; full resource/profile/terminology validation remains absent. | Run an R4 validator and an integration contract check against the intended EHR. |

## Working-tree preservation

The checkout already contained changes to `.env.example`, `Makefile`, `README.md`, both configuration YAML files, `pyproject.toml`, `frontend/src/hooks/useWardData.ts`, untracked launch/setup scripts, and tests. Those changes were preserved. Targeted additions were made to the existing hook/tests and `run_tests.bat`; other pre-existing changes are not claimed as work from this review.

Changes remain in the working tree for review. No commit, push, deployment, or clinical-rule threshold/weight update was performed.
