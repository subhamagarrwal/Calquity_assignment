from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse 
from job_queue.queue import job_queue
from services.rag import rag_system
from services.llm import llm_service
import json
import asyncio
from typing import AsyncGenerator

router = APIRouter(
    prefix="/stream",
    tags=["Streaming"]
)

async def process_job_stream(job_id: str) -> AsyncGenerator[str, None]:
    """Process job and stream SSE events with components"""
    
    job = job_queue.get_job(job_id)
    
    if not job:
        yield f"event: error\ndata: {json.dumps({'message': 'Job not found'})}\n\n"
        return
    
    query = job["query"]
    job_queue.set_status(job_id, "processing")
    
    try:
        # Step 1: Searching documents
        yield f"event: tool_call\ndata: {json.dumps({'message': '🔍 Searching documents...'})}\n\n"
        await asyncio.sleep(0.1)
        
        # Retrieve relevant chunks
        context_chunks = rag_system.retrieve(query, top_k=3)
        
        if not context_chunks:
            yield f"event: tool_call\ndata: {json.dumps({'message': '⚠️ No documents found. Please upload PDFs first.'})}\n\n"
            yield f"data: {json.dumps({'text': 'No documents available. Please upload PDFs to get started.'})}\n\n"
            job_queue.set_status(job_id, "completed")
            yield f"event: end\ndata: {json.dumps({'done': True})}\n\n"
            return
        
        # Step 2: Reading relevant pages
        yield f"event: tool_call\ndata: {json.dumps({'message': f'📄 Found {len(context_chunks)} relevant pages'})}\n\n"
        await asyncio.sleep(0.1)
        
        # Step 3: Analyzing content
        yield f"event: tool_call\ndata: {json.dumps({'message': '🔎 Analyzing content...'})}\n\n"
        await asyncio.sleep(0.1)
        
        # Step 4: Generating response
        yield f"event: tool_call\ndata: {json.dumps({'message': '🤖 Generating response...'})}\n\n"
        
        # Step 5: Stream LLM response
        full_response = ""
        token_count = 0
        
        print(f"🔄 Starting LLM stream for job {job_id[:8]}...")
        
        async for token in llm_service.stream_response(query, context_chunks):
            full_response += token
            token_count += 1
            
            # Send each token immediately
            yield f"data: {json.dumps({'text': token})}\n\n"
            
            # Debug every 10 tokens
            if token_count % 10 == 0:
                print(f"   Streamed {token_count} tokens...")
        
        print(f"✓ Completed streaming {token_count} tokens")
        print(f"📝 Full response length: {len(full_response)}")
        
        # Step 6: Extract and send citations
        citations = llm_service.extract_citations(full_response)
        if citations:
            print(f"📚 Found {len(citations)} citations")
            yield f"event: tool_call\ndata: {json.dumps({'message': '📚 Found citations'})}\n\n"
            
            for citation in citations:
                yield f"event: citation\ndata: {json.dumps(citation)}\n\n"
        
        # Step 7: Extract and send components
        components = llm_service.extract_components(full_response)
        if components:
            print(f"📊 Found {len(components)} components")
            yield f"event: tool_call\ndata: {json.dumps({'message': '📊 Generating visualizations...'})}\n\n"
            
            for component in components:
                print(f"   Sending component: {component.get('name', 'unknown')}")
                yield f"event: component\ndata: {json.dumps(component)}\n\n"
        
        # Mark complete
        job_queue.set_status(job_id, "completed")
        job_queue.update_job(job_id, {"response": full_response})
        yield f"event: end\ndata: {json.dumps({'done': True})}\n\n"
        
        print(f"✓ Job {job_id[:8]}... completed")
        
    except Exception as e:
        print(f"✗ Error in job {job_id[:8]}: {str(e)}")
        import traceback
        traceback.print_exc()
        
        job_queue.set_status(job_id, "error")
        job_queue.update_job(job_id, {"error": str(e)})
        yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"

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