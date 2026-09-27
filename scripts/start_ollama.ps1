<#
.SYNOPSIS
Starts Ollama in Docker with GPU acceleration and pulls glm-5.3-flash:cloud
#>

$MODEL_NAME = "glm-5.3-flash:cloud"
$CONTAINER_NAME = "ollama-service"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       Starting Dockerized Ollama Service with GPU        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check if Docker daemon is running
$dockerStatus = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Docker daemon is not currently running." -ForegroundColor Red
    Write-Host "Please start Docker Desktop on your system and ensure WSL 2 / Hyper-V is enabled." -ForegroundColor Yellow
    Write-Host "Once Docker Desktop shows 'Engine running', re-run this script.`n" -ForegroundColor Yellow
    exit 1
}

# 2. Check if container already exists
$existing = docker ps -a -q -f name=$CONTAINER_NAME
if ($existing) {
    Write-Host "[1/3] Existing Ollama container found. Starting $CONTAINER_NAME..." -ForegroundColor Green
    docker start $CONTAINER_NAME | Out-Null
} else {
    Write-Host "[1/3] Creating and running new Ollama container with RTX GPU support..." -ForegroundColor Green
    # Attempt GPU run; fallback to standard CPU if nvidia-container-toolkit is not mapped
    docker run -d --gpus=all -v ollama_models:/root/.ollama -p 11434:11434 --name $CONTAINER_NAME ollama/ollama 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "GPU pass-through requires nvidia-container-toolkit in Docker. Starting container in standard mode..." -ForegroundColor Yellow
        docker run -d -v ollama_models:/root/.ollama -p 11434:11434 --name $CONTAINER_NAME ollama/ollama
    }
}

# 3. Wait for Ollama HTTP endpoint
Write-Host "[2/3] Waiting for Ollama API on http://localhost:11434..." -ForegroundColor Green
$attempts = 0
$ready = $false
while (-not $ready -and $attempts -lt 20) {
    Start-Sleep -Seconds 2
    try {
        $r = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2
        $ready = $true
    } catch {
        $attempts++
        Write-Host "  ... waiting for service readiness ($attempts/20)" -ForegroundColor Gray
    }
}

if (-not $ready) {
    Write-Host "[ERROR] Timed out waiting for Ollama service to respond." -ForegroundColor Red
    exit 1
}

# 4. Pull and run the requested GLM model
Write-Host "`n[3/3] Pulling and running model: $MODEL_NAME inside container..." -ForegroundColor Cyan
docker exec -it $CONTAINER_NAME ollama run $MODEL_NAME

Write-Host "`nOllama service is live on http://localhost:11434 with $MODEL_NAME ready!" -ForegroundColor Green
