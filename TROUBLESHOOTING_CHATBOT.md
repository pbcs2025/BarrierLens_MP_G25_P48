# BarrierLens Chatbot Troubleshooting Guide

## Current Status ✓

Based on the diagnostic tests you ran:

1. **✓ Backend is ONLINE** (http://localhost:5000)
2. **✓ Ollama is RUNNING** (http://localhost:11434)
3. **✓ Simple Chat API is WORKING** (Test 3 passed)

## Most Likely Issue

The error you're seeing is probably in the **browser console**, not in the backend. Here's what to check:

### Step 1: Open Browser Console

1. Open your dashboard in the browser (http://localhost:5500)
2. Press **F12** to open Developer Tools
3. Click on the **Console** tab
4. Look for any **RED error messages**

### Step 2: Check for Common Browser Errors

Look for these specific errors in the console:

#### Error Type A: Data Files Not Loading
```
Failed to load resource: dashboard/assets/data/national_overview.json
```

**Solution:**
- The data files are not loading from the correct path
- This happens when the frontend path resolution is incorrect
- **FIX:** Open the chatbot and check if the files load from the Network tab

#### Error Type B: CORS Error
```
Access to fetch at 'http://localhost:5000/api/chat' from origin 'http://localhost:5500' has been blocked by CORS policy
```

**Solution:**
- Backend CORS is not allowing frontend
- This should NOT happen as CORS is configured
- If you see this, the backend needs to be restarted

#### Error Type C: API Module Not Loading
```
Uncaught ReferenceError: BarrierLensAPIService is not defined
```

**Solution:**
- The api-service.js file is not being loaded
- Check if `<script src="assets/js/api-service.js"></script>` exists in your HTML

#### Error Type D: Response Engine Error
```
Cannot read property 'processUserQuery' of undefined
```

**Solution:**
- The response-engine.js is not loading properly
- Check script loading order in HTML

## Step 3: Test in Browser

### Open Diagnostic Test Page

1. Open this file in your browser:
   ```
   file:///C:/Users/RABIYA BUSHRA/OneDrive/Attachments/Desktop/MajorProject/Implementation/BarrierLens_MP_G25_P48/test_chatbot_diagnostic.html
   ```

2. This page will automatically run 4 tests:
   - ✓ Backend Health
   - ✓ Ollama Status
   - ✓ Data Files Loading
   - ✓ API Service Module

3. Look for any **RED ✗** marks

4. Click **"Send Test Message"** button in Test 5

5. Type a message in Test 6 and click Send

### What You Should See:

- **All tests should show GREEN ✓**
- Test 5 should show a JSON response with `status: "success"`
- Test 6 should show the chatbot response

## Step 4: Fix Based on Error

### If Test 3 (Data Files) FAILS:

The data files are not loading. Two possible causes:

1. **Port mismatch**: You're running from a different port
2. **Path issue**: The files don't exist at that path

**Fix:**
```powershell
# Verify data files exist
Test-Path "dashboard/assets/data/national_overview.json"
Test-Path "dashboard/assets/data/state_summary.json"
```

If they don't exist, the data files are missing.

### If Test 4 (API Module) FAILS:

The api-service.js is not loading.

**Fix:**
```powershell
# Verify file exists
Test-Path "dashboard/assets/js/api-service.js"
```

If it exists, check your HTML file includes it:
```html
<script src="assets/js/api-service.js"></script>
```

### If Test 5 (Chat API) FAILS:

The backend is not responding correctly.

**Fix:**
1. Stop the backend (Ctrl+C in the terminal)
2. Restart it:
   ```powershell
   python backend/app.py
   ```
3. Wait for "Running on http://127.0.0.1:5000"
4. Try the test again

## Step 5: Check Your Actual Chatbot

After the diagnostic tests pass, open your actual chatbot:

1. Go to: `http://localhost:5500/dashboard/index.html`
2. Click the chatbot launcher button (bottom right)
3. Type: "What is BarrierLens?"
4. Click Send

### Expected Behavior:

- You should see a typing indicator (...)
- Then you should get a response from Ollama
- The response should be 2-3 paragraphs about BarrierLens

### If You Get "State summary dataset is not loaded":

This means the evidence payload is being sent with `status: "unavailable"`.

**This should be FIXED** by the changes we made to `response-engine.js`.

**To verify the fix worked:**
1. Press **Ctrl+Shift+R** to hard refresh the browser (clears cache)
2. Open Console (F12)
3. Try sending a message again
4. Check console for any errors

## Step 6: Manual Browser Test

Open browser console (F12) and paste this code:

```javascript
// Test 1: Check if modules are loaded
console.log('API Service:', window.BarrierLensAPIService);
console.log('Response Engine:', window.BarrierLensResponse);

// Test 2: Send a test message
fetch('http://localhost:5000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What is BarrierLens?',
    language: 'en'
  })
})
.then(r => r.json())
.then(data => console.log('Backend Response:', data))
.catch(err => console.error('Error:', err));
```

**What you should see:**
- API Service: Object with functions (sendChatMessage, predictBarrier, etc.)
- Response Engine: Object with functions (processUserQuery, etc.)
- Backend Response: Object with `status: "success"` and `answer: "..."`

## Common Solutions Summary

| Error | Solution |
|-------|----------|
| "State summary dataset is not loaded" | Hard refresh browser (Ctrl+Shift+R) |
| "Unable to connect to BarrierLens AI service" | Check backend is running on port 5000 |
| CORS error | Restart backend |
| Data files not loading | Check file paths and port |
| Module not defined | Check script tags in HTML |

## If Nothing Works

1. **Close all browser tabs** with the dashboard
2. **Stop both backend and Ollama**:
   - Backend: Ctrl+C in terminal 1
   - Ollama: Ctrl+C in terminal 2
3. **Restart in this order**:
   ```powershell
   # Terminal 1: Start Ollama
   ollama serve
   
   # Terminal 2: Start Backend (wait 5 seconds)
   python backend/app.py
   
   # Terminal 3: Start Frontend (wait 5 seconds)
   # Use Live Server or python -m http.server 5500
   ```
4. **Open browser in incognito/private mode**
5. **Go to http://localhost:5500/test_chatbot_diagnostic.html**
6. **Run all tests**
7. **If all pass, go to http://localhost:5500/dashboard/index.html**

## Getting Help

If you still have issues, provide:

1. Screenshot of browser console (F12 > Console tab)
2. Screenshot of the diagnostic test results
3. The exact error message you see in the chatbot
4. Output of: `Get-Process | Where-Object {$_.ProcessName -like "*ollama*" -or $_.ProcessName -like "*python*"}`

## Files Modified (For Reference)

The following files were modified to fix the integration:

1. `dashboard/assets/js/api-service.js`
   - Changed API URL to always use `http://localhost:5000/api`
   
2. `dashboard/assets/js/response-engine.js`
   - Only send evidence payload if `status === "verified"` and has data
   - This prevents "State summary dataset is not loaded" error

These changes ensure:
- Frontend always calls the correct backend URL
- Evidence is only sent when actually available
- Ollama always gets a chance to respond (even without evidence)
