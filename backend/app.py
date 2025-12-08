from dotenv import load_dotenv
import os

load_dotenv()
print(f"GROQ_API_KEY loaded: {bool(os.getenv('GROQ_API_KEY'))}")
print(f" GROQ_MODEL: {os.getenv('GROQ_MODEL')}")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from router.upload import router as upload_router
from router.stream import router as stream_router
import uvicorn
import shutil
import atexit
import tempfile

app = FastAPI(title="Calquity Backend")

# Define temp directory
TEMP_DIR = os.path.join(tempfile.gettempdir(), "calquity_pdfs")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Type"],
)

# Clean temp directory on startup
def cleanup_temp_files():
    """Delete temporary PDF storage on app start"""
    if os.path.exists(TEMP_DIR):
        try:
            shutil.rmtree(TEMP_DIR)
            print(f"🧹 Cleaned temp directory: {TEMP_DIR}")
        except Exception as e:
            print(f"⚠️ Failed to clean temp: {str(e)}")
    
    os.makedirs(TEMP_DIR, exist_ok=True)

# Clean on startup
cleanup_temp_files()

# Also clean on shutdown
def cleanup_on_exit():
    """Clean up when app shuts down"""
    if os.path.exists(TEMP_DIR):
        try:
            shutil.rmtree(TEMP_DIR)
            print(f"🧹 Cleaned temp on exit: {TEMP_DIR}")
        except Exception:
            pass

atexit.register(cleanup_on_exit)

# Include routers
app.include_router(upload_router)
app.include_router(stream_router)

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "groq_model": os.getenv("GROQ_MODEL")
    }

if __name__ == "__main__":
    if not os.getenv("GROQ_API_KEY"):
        print(" WARNING: GROQ_API_KEY is not set!")
    else:
        print(f" GROQ_API_KEY is configured")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)