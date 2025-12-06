from pydantic import BaseModel
from typing import Optional

class JobResponse(BaseModel):
    """Response model for /ask endpoint"""
    job_id: str
    status: str
    message: str
    

class JobStatusResponse(BaseModel):
    """Response model for job status check"""
    job_id: str
    status: str
    query: str
    created_at: str
    error: Optional[str] = None
    