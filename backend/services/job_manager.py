from typing import Dict, Optional
import uuid
from datetime import datetime

class JobManager:
    """Manage streaming job states"""
    
    _instance: Optional['JobManager'] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._jobs = {}
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, '_jobs'):
            self._jobs: Dict[str, Dict] = {}
    
    def create_job(self, query: str) -> str:
        """Create a new job and return its ID"""
        job_id = str(uuid.uuid4())
        self._jobs[job_id] = {
            "id": job_id,
            "query": query,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        print(f"✓ Created job {job_id[:8]}... for query: '{query[:50]}...'")
        return job_id
    
    def get_job(self, job_id: str) -> Optional[Dict]:
        """Get job by ID"""
        return self._jobs.get(job_id)
    
    def update_status(self, job_id: str, status: str):
        """Update job status"""
        if job_id in self._jobs:
            self._jobs[job_id]["status"] = status
            self._jobs[job_id]["updated_at"] = datetime.now().isoformat()
            print(f"✓ Job {job_id[:8]}... status: {status}")
    
    def delete_job(self, job_id: str):
        """Delete a job"""
        if job_id in self._jobs:
            del self._jobs[job_id]
            print(f"✓ Deleted job {job_id[:8]}...")
    
    def get_all_jobs(self) -> Dict[str, Dict]:
        """Get all jobs"""
        return self._jobs
    
    def cleanup_old_jobs(self, max_age_seconds: int = 3600):
        """Remove jobs older than max_age_seconds"""
        from datetime import datetime, timedelta
        
        now = datetime.now()
        to_delete = []
        
        for job_id, job in self._jobs.items():
            created = datetime.fromisoformat(job["created_at"])
            if (now - created).total_seconds() > max_age_seconds:
                to_delete.append(job_id)
        
        for job_id in to_delete:
            self.delete_job(job_id)
        
        if to_delete:
            print(f"🧹 Cleaned up {len(to_delete)} old jobs")

# Singleton instance
job_manager = JobManager()