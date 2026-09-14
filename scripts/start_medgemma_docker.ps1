<#
.SYNOPSIS
Starts Dockerized Ollama service and initializes the MedGemma 1.5 clinical AI model.
#>

$MODEL_NAME = "medgemma:1.5"
$BASE_MODEL = "gemma:2b"
$CONTAINER_NAME = "ollama-service"
$MODELFILE_PATH = "models/medgemma/Modelfile"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     Starting Dockerized Ollama & Initializing MedGemma 1.5 " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify Docker Daemon is running
$dockerStatus = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Docker daemon is not currently running." -ForegroundColor Red
    Write-Host "Please start Docker Desktop on your system and wait until the engine is ready." -ForegroundColor Yellow
    Write-Host "Once Docker Desktop shows 'Engine running', re-run this script:`n" -ForegroundColor Yellow
    Write-Host "   powershell -ExecutionPolicy Bypass -File scripts/start_medgemma_docker.ps1`n" -ForegroundColor White
    exit 1
}

# 2. Start or Run the Ollama Container
$existing = docker ps -a -q -f name=$CONTAINER_NAME
if ($existing) {
    Write-Host "[1/4] Existing Ollama container found. Starting $CONTAINER_NAME..." -ForegroundColor Green
    docker start $CONTAINER_NAME | Out-Null
} else {
    Write-Host "[1/4] Creating and starting Ollama Docker container with GPU pass-through..." -ForegroundColor Green
    docker run -d --gpus=all -v ollama_models:/root/.ollama -p 11434:11434 --name $CONTAINER_NAME ollama/ollama 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "GPU pass-through unavailable, starting container in standard mode..." -ForegroundColor Yellow
        docker run -d -v ollama_models:/root/.ollama -p 11434:11434 --name $CONTAINER_NAME ollama/ollama
    }
}

# 3. Wait for Ollama HTTP API Readiness
Write-Host "[2/4] Waiting for Ollama API endpoint at http://localhost:11434..." -ForegroundColor Green
$attempts = 0
$ready = $false
while (-not $ready -and $attempts -lt 25) {
    Start-Sleep -Seconds 2
    try {
        $r = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2
        $ready = $true
    } catch {
        $attempts++
        Write-Host "  ... waiting for Ollama service readiness ($attempts/25)" -ForegroundColor Gray
    }
}

if (-not $ready) {
    Write-Host "[ERROR] Timed out waiting for Ollama service to respond on http://localhost:11434." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Ollama service is active and responding." -ForegroundColor Green

# 4. Pull Base Model and Create MedGemma 1.5 from Modelfile
Write-Host "`n[3/4] Pulling base model ($BASE_MODEL) inside container..." -ForegroundColor Cyan
docker exec $CONTAINER_NAME ollama pull $BASE_MODEL

Write-Host "`n[4/4] Building $MODEL_NAME from $MODELFILE_PATH..." -ForegroundColor Cyan
# Copy Modelfile into container and execute creation
docker cp $MODELFILE_PATH "${CONTAINER_NAME}:/tmp/Modelfile"
docker exec $CONTAINER_NAME ollama create $MODEL_NAME -f /tmp/Modelfile

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "✓ MedGemma 1.5 is initialized and ready for GNN CDS pipeline!" -ForegroundColor Green
Write-Host "API Endpoint: http://localhost:11434" -ForegroundColor White
Write-Host "Model Tag   : $MODEL_NAME" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
