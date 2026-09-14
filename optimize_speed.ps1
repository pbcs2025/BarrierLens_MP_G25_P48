# BarrierLens Chatbot Speed Optimization Script
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "BARRIERLENS SPEED OPTIMIZATION" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Current performance issue: Response time ~107 seconds" -ForegroundColor Yellow
Write-Host "Cause: CPU is slow at running llama3.2:3b model`n" -ForegroundColor Yellow

Write-Host "Choose optimization option:`n" -ForegroundColor White

Write-Host "[1] QUICK FIX - Reduce max tokens (50% faster, 2 min)" -ForegroundColor Green
Write-Host "    Result: ~40-50 second responses`n" -ForegroundColor Gray

Write-Host "[2] RECOMMENDED - Switch to smaller model (3x faster, 5 min)" -ForegroundColor Cyan
Write-Host "    Result: ~20-30 second responses`n" -ForegroundColor Gray

Write-Host "[3] BOTH - Do both optimizations (best, 5 min)" -ForegroundColor Yellow
Write-Host "    Result: ~15-20 second responses`n" -ForegroundColor Gray

Write-Host "[4] Check GPU - See if you have GPU for acceleration" -ForegroundColor Magenta
Write-Host "    If yes: 2-5 second responses possible`n" -ForegroundColor Gray

$choice = Read-Host "Enter choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host "`n[OPTION 1] Reducing max tokens..." -ForegroundColor Cyan
        
        $envPath = ".env"
        if (Test-Path $envPath) {
            $content = Get-Content $envPath -Raw
            if ($content -match "MAX_TOKENS") {
                $content = $content -replace "MAX_TOKENS=\d+", "MAX_TOKENS=150"
            } else {
                $content += "`nMAX_TOKENS=150"
            }
            Set-Content $envPath $content
        } else {
            @"
MAX_TOKENS=150
OLLAMA_TIMEOUT=60
"@ | Out-File $envPath
        }
        
        Write-Host "  ✓ Updated .env file" -ForegroundColor Green
        Write-Host "`nNext steps:" -ForegroundColor Yellow
        Write-Host "1. Stop backend (Ctrl+C)" -ForegroundColor White
        Write-Host "2. Run: python backend/app.py" -ForegroundColor White
        Write-Host "3. Test chatbot - should be ~50% faster`n" -ForegroundColor White
    }
    
    "2" {
        Write-Host "`n[OPTION 2] Downloading smaller model..." -ForegroundColor Cyan
        Write-Host "This will take 2-3 minutes...`n" -ForegroundColor Yellow
        
        ollama pull llama3.2:1b
        
        $envPath = ".env"
        if (Test-Path $envPath) {
            $content = Get-Content $envPath -Raw
            if ($content -match "OLLAMA_MODEL") {
                $content = $content -replace "OLLAMA_MODEL=.*", "OLLAMA_MODEL=llama3.2:1b"
            } else {
                $content += "`nOLLAMA_MODEL=llama3.2:1b"
            }
            Set-Content $envPath $content
        } else {
            "OLLAMA_MODEL=llama3.2:1b" | Out-File $envPath
        }
        
        Write-Host "`n  ✓ Downloaded llama3.2:1b" -ForegroundColor Green
        Write-Host "  ✓ Updated .env file" -ForegroundColor Green
        Write-Host "`nNext steps:" -ForegroundColor Yellow
        Write-Host "1. Stop backend (Ctrl+C)" -ForegroundColor White
        Write-Host "2. Run: python backend/app.py" -ForegroundColor White
        Write-Host "3. Test chatbot - should be 2-3x faster`n" -ForegroundColor White
    }
    
    "3" {
        Write-Host "`n[OPTION 3] Applying both optimizations..." -ForegroundColor Cyan
        Write-Host "Downloading smaller model (2-3 minutes)...`n" -ForegroundColor Yellow
        
        ollama pull llama3.2:1b
        
        $envPath = ".env"
        $newContent = @"
# Ollama Configuration (Optimized for Speed)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:1b
OLLAMA_TIMEOUT=60
MAX_TOKENS=150

# Backend Configuration
PORT=5000
HOST=0.0.0.0
DEBUG=False
CORS_ORIGINS=*
"@
        
        Set-Content $envPath $newContent
        
        Write-Host "`n  ✓ Downloaded llama3.2:1b" -ForegroundColor Green
        Write-Host "  ✓ Updated .env file with optimized settings" -ForegroundColor Green
        Write-Host "`nOptimizations applied:" -ForegroundColor Yellow
        Write-Host "  - Model: llama3.2:3b → llama3.2:1b (3x faster)" -ForegroundColor Gray
        Write-Host "  - Max tokens: 384 → 150 (shorter responses)" -ForegroundColor Gray
        Write-Host "  - Timeout: 120s → 60s (faster failure)" -ForegroundColor Gray
        Write-Host "`nNext steps:" -ForegroundColor Yellow
        Write-Host "1. Stop backend (Ctrl+C)" -ForegroundColor White
        Write-Host "2. Run: python backend/app.py" -ForegroundColor White
        Write-Host "3. Test chatbot - should be 15-20 seconds per response`n" -ForegroundColor White
    }
    
    "4" {
        Write-Host "`n[OPTION 4] Checking for GPU..." -ForegroundColor Cyan
        
        try {
            $gpu = Get-WmiObject Win32_VideoController | Select-Object Name, AdapterRAM
            Write-Host "`nGPU Information:" -ForegroundColor Yellow
            $gpu | Format-Table
            
            if ($gpu.Name -like "*NVIDIA*") {
                Write-Host "✓ NVIDIA GPU detected!" -ForegroundColor Green
                Write-Host "`nTo enable GPU acceleration:" -ForegroundColor Yellow
                Write-Host "1. Install CUDA: https://developer.nvidia.com/cuda-downloads" -ForegroundColor White
                Write-Host "2. Reinstall Ollama (will auto-detect CUDA)" -ForegroundColor White
                Write-Host "3. Restart Ollama service" -ForegroundColor White
                Write-Host "4. You'll get 2-5 second responses!`n" -ForegroundColor Green
            } elseif ($gpu.Name -like "*AMD*") {
                Write-Host "⚠ AMD GPU detected" -ForegroundColor Yellow
                Write-Host "AMD GPU acceleration for Ollama is experimental." -ForegroundColor Gray
                Write-Host "Recommend using Option 3 (smaller model + reduced tokens)`n" -ForegroundColor White
            } else {
                Write-Host "✗ No dedicated GPU detected" -ForegroundColor Red
                Write-Host "You're running on CPU only (integrated graphics)" -ForegroundColor Gray
                Write-Host "Recommend using Option 3 (smaller model + reduced tokens)`n" -ForegroundColor White
            }
        } catch {
            Write-Host "Could not detect GPU information`n" -ForegroundColor Red
        }
        
        Write-Host "Check NVIDIA GPU with CUDA:" -ForegroundColor Yellow
        try {
            nvidia-smi 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ CUDA is available!`n" -ForegroundColor Green
            }
        } catch {
            Write-Host "✗ nvidia-smi not found (CUDA not installed)`n" -ForegroundColor Gray
        }
    }
    
    default {
        Write-Host "`nInvalid choice. Please run again and choose 1-4.`n" -ForegroundColor Red
    }
}
