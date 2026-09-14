# 🚀 BarrierLens Services Startup Guide

## Quick Start (3 Terminals Required)

### ⚡ TERMINAL 1: Start Ollama

Open PowerShell or CMD and run:

```bash
ollama serve
```

**Expected Output:**
```
time=... level=INFO source=server.go:... msg="Ollama server running"
```

**Keep this terminal open!**

---

### ⚡ TERMINAL 2: Start Backend

Open a **new** PowerShell or CMD and run:

```bash
cd "c:\Users\RABIYA BUSHRA\OneDrive\Attachments\Desktop\MajorProject\Implementation\BarrierLens_MP_G25_P48\backend"
python app.py
```

**Expected Output:**
```
Starting BarrierLens Ollama Backend on 0.0.0.0:5000
 * Running on http://127.0.0.1:5000
```

**Keep this terminal open!**

---

### ⚡ TERMINAL 3: Open Frontend

Open a **new** PowerShell or CMD and run:

```bash
cd "c:\Users\RABIYA BUSHRA\OneDrive\Attachments\Desktop\MajorProject\Implementation\BarrierLens_MP_G25_P48\dashboard"

# Option 1: Simple HTTP server (recommended)
python -m http.server 8000

# Then open browser to: http://localhost:8000
```

**Alternative:** Just open `index.html` directly in your browser:
```bash
start index.html
```

---

## 🔍 Verify Everything is Running

### Check Ollama (Terminal 1)

```bash
# In PowerShell
Invoke-WebRequest -Uri "http://localhost:11434/" -UseBasicParsing

# Or in CMD
curl http://localhost:11434/
```

**Expected:** Should not give an error

### Check Backend (Terminal 2)

```bash
# In PowerShell
Invoke-RestMethod -Uri "http://localhost:5000/api/health"

# Or in CMD
curl http://localhost:5000/api/health
```

**Expected:**
```json
{
  "status": "healthy",
  "service": "BarrierLens Research Intelligence Assistant Backend",
  "version": "1.0.0"
}
```

### Check Frontend (Browser)

Open: `http://localhost:8000` (if using python server)  
OR: Open `index.html` directly

Click the chatbot button (bottom right corner)

---

## 🧪 Test the Chatbot

### Test 1: Basic Query
Type: **"What is BarrierLens?"**

Expected: Intelligent response from Ollama about the NFHS-5 research platform

### Test 2: Barrier Types
Type: **"What are the three types of barriers?"**

Expected: List of Household, Logistic, and Facility barriers

### Test 3: Follow-up (Tests History)
Type: **"Why is the first one important?"**

Expected: Response should reference the previous answer about barriers

### Test 4: Project-Specific
Type: **"Why does BarrierLens use SHAP?"**

Expected: Specific answer about SHAP explainability in the project

---

## ⚠️ Troubleshooting

### Problem: "Ollama is NOT running"

**Solution:**
```bash
# Check if Ollama is installed
ollama --version

# If not installed, install from: https://ollama.ai/

# Pull the model
ollama pull llama3.2:3b

# Start Ollama
ollama serve
```

### Problem: "Backend connection refused"

**Solution:**
```bash
# Check Python is installed
python --version

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Start backend
python app.py
```

### Problem: "Module not found" error

**Solution:**
```bash
# Install missing dependencies
cd backend
pip install flask flask-cors ollama python-dotenv
```

### Problem: Chatbot shows "Unable to connect..."

**Cause:** Backend or Ollama is not running

**Solution:**
1. Check Terminal 1: Is Ollama still running?
2. Check Terminal 2: Is Backend still running?
3. Restart both if needed

### Problem: Frontend can't reach backend

**Cause:** CORS or port issue

**Solution:**
1. Make sure backend shows: `Running on http://127.0.0.1:5000`
2. Open browser console (F12) and check for errors
3. If CORS error, backend should handle it automatically

---

## 📌 Port Reference

| Service | Port | URL |
|---------|------|-----|
| Ollama | 11434 | http://localhost:11434 |
| Backend | 5000 | http://localhost:5000 |
| Frontend | 8000 | http://localhost:8000 (if using python server) |

---

## 🛑 Stopping Services

### Stop Ollama (Terminal 1)
Press `Ctrl + C`

### Stop Backend (Terminal 2)
Press `Ctrl + C`

### Stop Frontend Server (Terminal 3)
Press `Ctrl + C`

---

## 💡 Tips

1. **Keep all 3 terminals open** while using the chatbot
2. **Check Terminal 2** (backend) for request logs
3. **Use browser console (F12)** to see any frontend errors
4. **Restart backend** if you make config changes
5. **Ollama takes ~5-10 seconds** for first response (loading model)

---

## 📝 Summary Commands

### Startup Sequence

```bash
# Terminal 1
ollama serve

# Terminal 2 (new terminal)
cd backend
python app.py

# Terminal 3 (new terminal)
cd dashboard
python -m http.server 8000
# Then open: http://localhost:8000
```

### Quick Test

```bash
# Check everything is running
curl http://localhost:11434/        # Ollama
curl http://localhost:5000/api/health  # Backend
```

Then open browser and test chatbot!

---

**Ready to go! 🎉**
