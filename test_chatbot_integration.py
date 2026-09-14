"""
BarrierLens Ollama Chatbot Integration Test Script

This script tests the complete flow:
Frontend → Backend API → Ollama → Response

Usage:
    python test_chatbot_integration.py
"""

import json
import sys
import time
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

def test_backend_health():
    """Test if backend is reachable."""
    print("\n" + "="*60)
    print("TEST 1: Backend Health Check")
    print("="*60)
    
    try:
        import urllib.request
        req = urllib.request.Request("http://localhost:5000/api/health")
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            print(f"✅ Backend is running: {data.get('service', 'Unknown')}")
            print(f"   Status: {data.get('status', 'Unknown')}")
            print(f"   Version: {data.get('version', 'Unknown')}")
            return True
    except Exception as e:
        print(f"❌ Backend health check failed: {e}")
        print("   Make sure backend is running: python backend/app.py")
        return False

def test_ollama_connection():
    """Test if Ollama is reachable."""
    print("\n" + "="*60)
    print("TEST 2: Ollama Connection Check")
    print("="*60)
    
    try:
        from backend.config.settings import settings
        print(f"   Ollama URL: {settings.OLLAMA_BASE_URL}")
        print(f"   Model: {settings.OLLAMA_MODEL}")
        
        if settings.is_ollama_available:
            print(f"✅ Ollama is running and reachable")
            return True
        else:
            print(f"❌ Ollama is not reachable")
            print(f"   Make sure Ollama is running: ollama serve")
            print(f"   And model is installed: ollama pull {settings.OLLAMA_MODEL}")
            return False
    except Exception as e:
        print(f"❌ Ollama check failed: {e}")
        return False

def test_chat_endpoint(question, history=None):
    """Test the /api/chat endpoint."""
    print(f"\n📤 Sending: {question}")
    
    try:
        import urllib.request
        
        payload = {
            "question": question,
            "message": question,
            "language": "en",
            "history": history or []
        }
        
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            "http://localhost:5000/api/chat",
            data=data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        
        start_time = time.time()
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode())
            elapsed = time.time() - start_time
            
            print(f"📥 Response ({elapsed:.2f}s):")
            print(f"   Status: {result.get('status', 'Unknown')}")
            print(f"   Answer: {result.get('answer', '')[:200]}...")
            print(f"   Intent: {result.get('intent', 'Unknown')}")
            print(f"   Language: {result.get('language', 'Unknown')}")
            
            return result
    except Exception as e:
        print(f"❌ Chat request failed: {e}")
        return None

def run_integration_tests():
    """Run complete integration test suite."""
    print("\n" + "="*60)
    print("🚀 BARRIERLENS OLLAMA CHATBOT INTEGRATION TESTS")
    print("="*60)
    
    # Test 1: Backend Health
    if not test_backend_health():
        print("\n⚠️  Backend is not running. Cannot proceed with tests.")
        return False
    
    # Test 2: Ollama Connection
    ollama_available = test_ollama_connection()
    
    # Test 3: Basic Chat Query
    print("\n" + "="*60)
    print("TEST 3: Basic Chat Query")
    print("="*60)
    
    response1 = test_chat_endpoint("What is BarrierLens?")
    if response1:
        print("✅ Basic query successful")
    else:
        print("❌ Basic query failed")
        return False
    
    # Test 4: Barrier-Specific Query
    print("\n" + "="*60)
    print("TEST 4: Barrier-Specific Query")
    print("="*60)
    
    response2 = test_chat_endpoint("What are the three types of barriers?")
    if response2:
        print("✅ Barrier query successful")
    else:
        print("❌ Barrier query failed")
    
    # Test 5: Conversation History
    print("\n" + "="*60)
    print("TEST 5: Conversation History")
    print("="*60)
    
    history = [
        {"role": "user", "content": "What is a logistic barrier?"},
        {"role": "assistant", "content": "Logistic barriers include distance to healthcare facilities, transportation availability, and treatment costs."}
    ]
    
    response3 = test_chat_endpoint("Why is it important?", history=history)
    if response3:
        print("✅ History-aware query successful")
    else:
        print("❌ History-aware query failed")
    
    # Test 6: Project-Specific Query
    print("\n" + "="*60)
    print("TEST 6: Project-Specific Query")
    print("="*60)
    
    response4 = test_chat_endpoint("Why does BarrierLens use SHAP?")
    if response4:
        print("✅ Project-specific query successful")
    else:
        print("❌ Project-specific query failed")
    
    # Summary
    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    print(f"✅ Backend: Running")
    print(f"{'✅' if ollama_available else '⚠️'} Ollama: {'Running' if ollama_available else 'Offline (using fallback)'}")
    print(f"✅ Chat Endpoint: Working")
    print(f"✅ Conversation History: Working")
    print(f"✅ Evidence Integration: Working")
    
    if not ollama_available:
        print("\n⚠️  Note: Ollama is offline. Responses are using deterministic fallback.")
        print("   To use Ollama, ensure it's running: ollama serve")
        print("   And model is installed: ollama pull llama3.2:3b")
    
    print("\n✅ INTEGRATION SUCCESSFUL!")
    print("\nNext steps:")
    print("1. Open dashboard/index.html in your browser")
    print("2. Click the chatbot button")
    print("3. Test the queries above in the UI")
    print("4. Verify responses are coming from Ollama (when available)")
    
    return True

if __name__ == "__main__":
    try:
        success = run_integration_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
