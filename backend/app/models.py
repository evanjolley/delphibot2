from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Tweet(BaseModel):
    id: str
    text: str
    author: str
    timestamp: datetime
    parent_id: Optional[str] = None
    thread_id: Optional[str] = None
    mentions: List[str] = []
    responses: List[str] = []
    is_existing: bool = False