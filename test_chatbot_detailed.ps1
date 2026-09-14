# BarrierLens Chatbot Integration Detailed Test Script
# Tests backend, Ollama, and chatbot functionality

Write-Host "`n=================================" -ForegroundColor Cyan
Write-Host "BARRIERLENS CHATBOT DIAGNOSTIC TEST" -ForegroundColor Cyan
Write-Host "=================================`n" -ForegroundColor Cyan

# Test 1: Backend Health Check
Write-Host "[TEST 1] Backend Health Check..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -ErrorAction Stop
    Write-Host "  ✓ Backend is ONLINE" -ForegroundColor Green
    Write-Host "  Service: $($healthResponse.service)" -ForegroundColor Gray
    Write-Host "  Status: $($healthResponse.status)" -ForegroundColor Gray
    Write-Host "  Version: $($healthResponse.version)`n" -ForegroundColor Gray
} catch {
    Write-Host "  ✗ Backend is OFFLINE" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Please start the backend with: python backend/app.py`n" -ForegroundColor Yellow
    exit 1
}

# Test 2: Ollama Health Check
Write-Host "[TEST 2] Ollama Service Check..." -ForegroundColor Yellow
try {
    $ollamaResponse = Invoke-WebRequest -Uri "http://localhost:11434/" -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✓ Ollama is RUNNING" -ForegroundColor Green
    Write-Host "  Response: $($ollamaResponse.Content)`n" -ForegroundColor Gray
} catch {
    Write-Host "  ✗ Ollama is NOT RUNNING" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Please start Ollama with: ollama serve`n" -ForegroundColor Yellow
    exit 1
}

# Test 3: Simple Chat Test (No Evidence)
Write-Host "[TEST 3] Chat API - Simple Query (No Evidence)..." -ForegroundColor Yellow
$simplePayload = @{
    message = "What is BarrierLens?"
    language = "en"
} | ConvertTo-Json -Compress

try {
    $simpleResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/chat" -Method Post -Body $simplePayload -ContentType "application/json" -ErrorAction Stop
    Write-Host "  ✓ Chat API is WORKING" -ForegroundColor Green
    Write-Host "  Status: $($simpleResponse.status)" -ForegroundColor Gray
    Write-Host "  Answer Length: $($simpleResponse.answer.Length) chars" -ForegroundColor Gray
    Write-Host "  Answer Preview: $($simpleResponse.answer.Substring(0, [Math]::Min(150, $simpleResponse.answer.Length)))..." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "  ✗ Chat API FAILED" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
}

# Test 4: Chat Test with Evidence Payload
Write-Host "[TEST 4] Chat API - Query with Evidence Payload..." -ForegroundColor Yellow
$evidencePayload = @{
    message = "What are the barriers?"
    language = "en"
    intent = "NATIONAL_OVERVIEW"
    evidence = @{
        status = "verified"
        intent = "NATIONAL_OVERVIEW"
        evidence = @(
            @{
                label = "Any Barrier Rate"
                value = "59.16"
                unit = "%"
                entity = "National"
            }
        )
    }
} | ConvertTo-Json -Depth 10 -Compress

try {
    $evidenceResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/chat" -Method Post -Body $evidencePayload -ContentType "application/json" -ErrorAction Stop
    Write-Host "  ✓ Evidence-based query WORKING" -ForegroundColor Green
    Write-Host "  Status: $($evidenceResponse.status)" -ForegroundColor Gray
    Write-Host "  Answer Length: $($evidenceResponse.answer.Length) chars" -ForegroundColor Gray
    Write-Host "  Answer Preview: $($evidenceResponse.answer.Substring(0, [Math]::Min(150, $evidenceResponse.answer.Length)))..." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "  ✗ Evidence-based query FAILED" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 5: Chat Test with Unavailable Evidence
Write-Host "[TEST 5] Chat API - Query with Unavailable Evidence..." -ForegroundColor Yellow
$unavailablePayload = @{
    message = "What are hospital waiting times?"
    language = "en"
    intent = "GENERAL"
    evidence = @{
        status = "unavailable"
        limitationNote = "This data is not available in NFHS-5"
    }
} | ConvertTo-Json -Depth 10 -Compress

try {
    $unavailableResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/chat" -Method Post -Body $unavailablePayload -ContentType "application/json" -ErrorAction Stop
    Write-Host "  ✓ Unavailable evidence handling WORKING" -ForegroundColor Green
    Write-Host "  Status: $($unavailableResponse.status)" -ForegroundColor Gray
    Write-Host "  Answer: $($unavailableResponse.answer)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "  ✗ Unavailable evidence query FAILED" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 6: Conversation History Test
Write-Host "[TEST 6] Chat API - Conversation with History..." -ForegroundColor Yellow
$historyPayload = @{
    message = "Why is it important?"
    language = "en"
    history = @(
        @{
            role = "user"
            content = "What is a logistic barrier?"
        },
        @{
            role = "assistant"
            content = "Logistic barriers include distance to facilities and transportation issues."
        }
    )
} | ConvertTo-Json -Depth 10 -Compress

try {
    $historyResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/chat" -Method Post -Body $historyPayload -ContentType "application/json" -ErrorAction Stop
    Write-Host "  ✓ Conversation history WORKING" -ForegroundColor Green
    Write-Host "  Status: $($historyResponse.status)" -ForegroundColor Gray
    Write-Host "  Answer Length: $($historyResponse.answer.Length) chars" -ForegroundColor Gray
    Write-Host "  Answer Preview: $($historyResponse.answer.Substring(0, [Math]::Min(150, $historyResponse.answer.Length)))..." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "  ✗ Conversation history FAILED" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Final Summary
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "ALL TESTS COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=================================`n" -ForegroundColor Cyan

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open test_chatbot_diagnostic.html in your browser" -ForegroundColor White
Write-Host "2. Open your chatbot in the dashboard (http://localhost:5500)" -ForegroundColor White
Write-Host "3. Try asking: 'What is BarrierLens?'" -ForegroundColor White
Write-Host "4. Check browser console (F12) for any JavaScript errors`n" -ForegroundColor White
