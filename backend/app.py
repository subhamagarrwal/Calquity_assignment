from dotenv import load_dotenv
import os

# Load .env BEFORE importing anything else
load_dotenv()
print(f"🔑 GROQ_API_KEY loaded: {bool(os.getenv('GROQ_API_KEY'))}")
print(f"📋 GROQ_MODEL: {os.getenv('GROQ_MODEL')}")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from router import ask, stream, upload
from services.pdf_loader import pdf_loader
import shutil
import atexit

app = FastAPI(title="Calquity Backend")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Clean temp directory on startup
def cleanup_temp_files():
    """Delete temporary PDF storage on app start"""
    if os.path.exists(pdf_loader.calquity_dir):
        try:
            shutil.rmtree(pdf_loader.calquity_dir)
            print(f"🧹 Cleaned temp directory: {pdf_loader.calquity_dir}")
        except Exception as e:
            print(f"⚠️ Failed to clean temp: {str(e)}")
    
    os.makedirs(pdf_loader.calquity_dir, exist_ok=True)

# Clean on startup
cleanup_temp_files()

# Also clean on shutdown
def cleanup_on_exit():
    """Clean up when app shuts down"""
    if os.path.exists(pdf_loader.calquity_dir):
        try:
            shutil.rmtree(pdf_loader.calquity_dir)
            print(f"🧹 Cleaned temp on exit: {pdf_loader.calquity_dir}")
        except Exception:
            pass

atexit.register(cleanup_on_exit)

# Include routers
app.include_router(ask.router)
app.include_router(stream.router)
app.include_router(upload.router)

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "groq_model": os.getenv("GROQ_MODEL")
    }

if __name__ == "__main__":
    import uvicorn
    
    # Check if API key is set
    if not os.getenv("GROQ_API_KEY"):
        print("\n" + "="*60)
        print("⚠️  WARNING: GROQ_API_KEY is not set!")
        print("="*60)
        print("Get your free API key from: https://console.groq.com/keys")
        print("Then add it to backend/.env file:")
        print('GROQ_API_KEY=gsk_your_key_here')
        print("="*60 + "\n")
    else:
        print(f"✅ GROQ_API_KEY is configured")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)