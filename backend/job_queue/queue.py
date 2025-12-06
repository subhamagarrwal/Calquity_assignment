import asyncio
import uuid
from typing import Dict, Any, Optional
from datetime import datetime

class JobQueue:
    def __init__ (self):
        self.jobs: Dict[str, Dict[str, Any]]= {}
        self.queue: asyncio.Queue = asyncio.Queue()

    def create_job(self, query:str) -> str:
        job_id = str(uuid.uuid4())

        self.jobs[job_id] = {
            "job_id": job_id,
            "query": query,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "results": [],
            "error": None
        }

        #Add to queue for processing
        asyncio.create_task(self.queue.put(job_id))

        print("Created job:", job_id[8]," for query:", query[:50])
        return job_id
    
    def get_job(self, job_id:str)-> Optional[Dict[str, Any]]:
        return self.jobs.get(job_id)

    def update_job(self, job_id: str, updates: Dict[str, Any]):
        if job_id in self.jobs:
            self.jobs[job_id].update(updates)
    
    def set_status(self, job_id: str , status: str):

        if job_id in self.jobs:
            self.jobs[job_id]["status"] = status
            print(f"Job {job_id[8]}... status is now {status}")
        
    async def get_next_job(self) -> Optional[str]:
        """ Get next job from queue- async blocks until available"""
        return await self.queue.get()
    
#Global queue instance
job_queue = JobQueue()
