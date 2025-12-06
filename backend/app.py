import dotenv
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

#Import router
from router import ask, stream  

# Load environment variables
dotenv.load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Calquity API",
    description="Generative UI + RAG + Citations API",
    version="1.0.0"
)

#include routers
app.include_router(ask.router)
app.include_router(stream.router)


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "Calquity API is running",
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "endpoints":{
            "create_job": "POST /ask",
            "job_status": "GET /ask/{job_id}",
            "stream":"GET /stream/{job_id}"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "backend": "running",
        "version": "1.0.0"
    }

# Test Groq endpoint
@app.get("/test-groq")
async def test_groq():
    from groq import Groq
    
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {"error": "GROQ_API_KEY not configured"}
    
    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": "Say 'working' in one word"}],
            max_tokens=10
        )
        return {
            "status": "success",
            "response": response.choices[0].message.content
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

# Run server
if __name__ == "__main__":
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("BACKEND_PORT", 8000))
    
    print(f" Starting backendon {host}:{port}")
    print("Groq API Key: {'✓ Configured' if os.getenv('GROQ_API_KEY') else '✗ Not Set'}")
    
    uvicorn.run(
        "app:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )