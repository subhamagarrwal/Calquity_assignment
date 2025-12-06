from fastapi import APIRouter , HTTPException
from models.request import QueryRequest
from models.response import JobResponse, JobStatusResponse
from job_queue.queue import job_queue

router = APIRouter(
    prefix="/ask",
    tags=["Query"]

)

@router.post("",response_model=JobResponse)
async def create_query_job(request: QueryRequest):

    """Create a new query job"""

    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cant be empty")
    
    # Create job
    job_id = job_queue.create_job(request.query)

    return JobResponse(
        job_id=job_id,
        status="pending",
        message="Job created successfully"
    )

@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Get status of a job"""
    job = job_queue.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JobStatusResponse(
        job_id=job["job_id"],
        status=job["status"],
        query=job["query"],
        created_at=job["created_at"],
        error=job.get("error")
    )