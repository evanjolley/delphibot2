from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Tweet(BaseModel):
    id: str
    text: str
    author: str
    timestamp: datetime
    parent_id: Optional[str] = None
    is_existing: bool = False