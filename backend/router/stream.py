from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse 
from job_queue.queue import job_queue
import json
import asyncio
from typing import AsyncGenerator