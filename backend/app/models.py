from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Tweet(BaseModel):
    id: str
    text: str
    author: str
    timestamp: datetime
    parent_id: Optional[str] = None  # ID of parent tweet if this is a reply
    is_existing: bool = False  # Tracks base tweets

class Bot(BaseModel):
    id: str
    name: str
    is_active: bool
    timestamp: datetime
    is_existing: bool = False  # yes for DelphiBot