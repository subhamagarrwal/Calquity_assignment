from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse 
from job_queue.queue import job_queue
import json
import asyncio
from typing import AsyncGenerator

router = APIRouter(
    prefix="/stream",
    tags=["Streaming"]
)

async def process_job_stream(job_id: str) -> AsyncGenerator[str, None]:
    """Process job and stream SSE events"""
    
    job = job_queue.get_job(job_id)
    
    if not job:
        yield f"event: error\ndata: {json.dumps({'message': 'Job not found'})}\n\n"
        return
    
    query = job["query"]
    job_queue.set_status(job_id, "processing")
    
    try:
        # Step 1: Searching
        yield f"event: tool_call\ndata: {json.dumps({'message': '🔍 Searching documents...'})}\n\n"
        await asyncio.sleep(1)
        
        # Step 2: Reading
        yield f"event: tool_call\ndata: {json.dumps({'message': '📄 Reading PDF pages...'})}\n\n"
        await asyncio.sleep(1)
        
        # Step 3: Analyzing
        yield f"event: tool_call\ndata: {json.dumps({'message': '🔎 Analyzing content...'})}\n\n"
        await asyncio.sleep(0.8)
        
        # Step 4: Generating
        yield f"event: tool_call\ndata: {json.dumps({'message': '🤖 Generating response...'})}\n\n"
        await asyncio.sleep(0.5)
        
        # Step 5: Stream response
        response_text = (
            f"Based on your query: '{query}', here is what I found. "
            "This is a Phase 3 test response demonstrating SSE streaming. "
            "In Phase 6, this will be replaced with real LLM output from Groq. "
            "The system is working correctly and streaming word-by-word."
        )
        
        words = response_text.split()
        for word in words:
            yield f"data: {json.dumps({'text': word + ' '})}\n\n"
            await asyncio.sleep(0.05)
        
        yield f"data: {json.dumps({'text': '\\n'})}\n\n"
        
        # Mark complete
        job_queue.set_status(job_id, "completed")
        yield f"event: end\ndata: {json.dumps({'done': True})}\n\n"
        
        print(f"✓ Job {job_id[:8]}... completed")
        
    except Exception as e:
        job_queue.set_status(job_id, "error")
        job_queue.update_job(job_id, {"error": str(e)})
        yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
        print(f"✗ Job {job_id[:8]}... failed: {str(e)}")

@router.get("/{job_id}")
async def stream_job_results(job_id: str):
    """Stream job results via Server-Sent Events"""
    
    job = job_queue.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return StreamingResponse(
        process_job_stream(job_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )