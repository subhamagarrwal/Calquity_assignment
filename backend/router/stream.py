from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.rag import rag_system
from services.llm import llm_service
from services.job_manager import job_manager
from typing import AsyncGenerator
import json
import asyncio

router = APIRouter()

class QueryRequest(BaseModel):
    query: str

@router.post("/ask")
async def create_job(request: QueryRequest):
    """Create a new streaming job"""
    job_id = job_manager.create_job(request.query)
    return {"job_id": job_id, "status": "created"}

async def process_job_stream(job_id: str) -> AsyncGenerator[str, None]:
    """Process job and stream results with text + visualization"""
    
    try:
        job = job_manager.get_job(job_id)
        if not job:
            yield f"event: error\ndata: Job not found\n\n"
            return
        
        query = job.get("query", "")
        
        # Step 1: Search
        yield f"event: tool_call\ndata: {json.dumps({'message': '🔍 Searching documents...'})}\n\n"
        await asyncio.sleep(0.1)
        
        job_manager.update_status(job_id, "processing")
        
        # Step 2: Retrieve chunks
        chunks = rag_system.search(query, k=5)
        print(f"✓ Retrieved {len(chunks)} chunks for query: '{query[:50]}...'")
        
        yield f"event: tool_call\ndata: {json.dumps({'message': f'📄 Found {len(chunks)} relevant pages'})}\n\n"
        
        if not chunks:
            yield f"event: text\ndata: No relevant content found.\n\n"
            yield f"event: end\ndata: complete\n\n"
            return
        
        # Step 3: Analyze
        yield f"event: tool_call\ndata: {json.dumps({'message': '🔎 Analyzing content...'})}\n\n"
        await asyncio.sleep(0.1)
        
        # Step 4: Generate response with streaming
        yield f"event: tool_call\ndata: {json.dumps({'message': '🤖 Generating response...'})}\n\n"
        
        token_count = 0
        citation_count = 0
        component_sent = False
        
        print(f"🔄 Starting combined stream for job {job_id[:8]}...")
        
        # Use the new combined streaming method
        async for item in llm_service.stream_with_visualization(query, chunks):
            item_type = item.get("type")
            content = item.get("content")
            
            if item_type == "text":
                token_count += 1
                yield f"event: text\ndata: {json.dumps(content)}\n\n"
                if token_count % 20 == 0:
                    print(f"   Streamed {token_count} tokens...")
            
            elif item_type == "citation":
                citation_count += 1
                yield f"event: citation\ndata: {json.dumps(content)}\n\n"
            
            elif item_type == "component" and not component_sent:
                component_sent = True
                yield f"event: tool_call\ndata: {json.dumps({'message': '📊 Creating visualization...'})}\n\n"
                yield f"event: component\ndata: {json.dumps(content)}\n\n"
                print(f"📊 Sent visualization: {content.get('component', 'Unknown')}")
            
            elif item_type == "error":
                yield f"event: error\ndata: {content}\n\n"
        
        print(f"✓ Stream complete: {token_count} tokens, {citation_count} citations")
        
        job_manager.update_status(job_id, "completed")
        yield f"event: end\ndata: complete\n\n"
        
    except Exception as e:
        print(f"❌ Stream error: {str(e)}")
        import traceback
        traceback.print_exc()
        yield f"event: error\ndata: {str(e)}\n\n"

@router.get("/stream/{job_id}")
async def stream_job(job_id: str):
    """SSE endpoint for streaming job results"""
    return StreamingResponse(
        process_job_stream(job_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

@router.get("/jobs")
async def list_jobs():
    """List all active jobs"""
    return {"jobs": job_manager.get_all_jobs()}

@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    """Delete a job"""
    job_manager.delete_job(job_id)
    return {"message": f"Deleted job {job_id}"}