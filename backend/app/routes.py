from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
from .models import Tweet
from .repository import TweetRepository
from .services.llm import ClaudeService
from config import ALLOWED_ORIGINS
from fastapi import BackgroundTasks
from dataclasses import dataclass, asdict
import json
from pathlib import Path
import uuid
from datetime import datetime, timezone

app = FastAPI()
tweet_repo = TweetRepository()
claude_service = ClaudeService()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class NewTweet(BaseModel):
    text: str
    author: str
    parent_id: Optional[str] = None

class BotStatus(BaseModel):
    botName: str
    active: bool

class NewBot(BaseModel):
    bot_name: str

BOTS_FILE = Path(__file__).parent.parent / "data" / "bots.json"

def _load_bots():
    if not BOTS_FILE.exists():
        return {"bots": {}}
    with open(BOTS_FILE, 'r') as f:
        return json.load(f)

def _save_bots(data):
    BOTS_FILE.parent.mkdir(exist_ok=True)
    with open(BOTS_FILE, 'w') as f:
        json.dump(data, f, default=str, indent=2)

def _clear_non_existing_bots():
    data = _load_bots()
    data["bots"] = {
        bot_id: bot_data 
        for bot_id, bot_data in data["bots"].items() 
        if bot_data.get("is_existing", False)
    }
    _save_bots(data)

@app.get("/")
async def get_bot_status():
    """Get all bots status"""
    data = _load_bots()
    return {"bots": [
        {
            "id": bot_id,
            "name": bot["name"],
            "active": bot["is_active"]
        } 
        for bot_id, bot in data["bots"].items()
    ]}

@app.post("/toggle")
async def toggle_bot_status(status: BotStatus):
    """Toggle a specific bot's active status"""
    try:
        data = _load_bots()
        bot_found = False
        
        for bot in data["bots"].values():
            if bot["name"].lower() == status.botName.lower():
                bot["is_active"] = status.active
                bot_found = True
                break
        
        if not bot_found:
            raise HTTPException(status_code=404, detail=f"Bot '{status.botName}' not found")
            
        _save_bots(data)
        return {"status": "success", "bots": [
            {
                "id": bot_id,
                "name": bot["name"],
                "isActive": bot["is_active"]
            } 
            for bot_id, bot in data["bots"].items()
        ]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/bots")
async def create_bot(bot_data: dict):
    try:
        data = _load_bots()
        
        # Check if we've reached the bot limit
        if len(data["bots"]) >= 3:
            raise HTTPException(
                status_code=400,
                detail="Maximum limit of 3 bots has been reached"
            )
        
        new_bot_name = bot_data["bot_name"].lower()
        if any(bot["name"].lower() == new_bot_name for bot in data["bots"].values()):
            raise HTTPException(
                status_code=400, 
                detail=f"Bot with name '{bot_data['bot_name']}' already exists"
            )
            
        new_bot = {
            "id": str(uuid.uuid4()),
            "name": bot_data["bot_name"],
            "is_active": False,  # New bots start as inactive
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_existing": False
        }
        
        # Add the new bot while preserving existing bots and their states
        data["bots"][new_bot["id"]] = new_bot
        _save_bots(data)
        
        return {"bots": list(data["bots"].values())}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tweets")
async def get_tweets():
    """Get all tweets for the feed"""
    return tweet_repo.get_all_tweets()

@app.get("/api/tweets/{tweet_id}")
async def get_tweet(tweet_id: str):
    """Get a specific tweet"""
    tweet = tweet_repo.get_tweet(tweet_id)
    if not tweet:
        raise HTTPException(status_code=404, detail="Tweet not found")
    return [tweet]

@dataclass
class DebugInfo:
    step: str
    analysis_prompt: Optional[str] = None
    analysis_response: Optional[str] = None
    final_prompt: Optional[str] = None
    final_response: Optional[str] = None
    error: Optional[str] = None

# Store debug info in memory (could be moved to a proper storage)
debug_store: Dict[str, Dict] = {}

@app.post("/api/tweets")
async def create_tweet(tweet_input: NewTweet, background_tasks: BackgroundTasks):
    try:
        new_tweet = tweet_repo.add_tweet(
            text=tweet_input.text,
            author=tweet_input.author,
            parent_id=tweet_input.parent_id
        )
        
        # Check for bot mentions
        mentioned_bots = [
            name.lower() for name in _extract_mentions(tweet_input.text)
        ]
        
        # Load active bots
        bots_data = _load_bots()
        active_bots = {
            bot["name"].lower(): bot
            for bot in bots_data["bots"].values()
            if bot["is_active"]
        }
        
        # Process mentions for active bots
        for bot_name in mentioned_bots:
            if bot_name in active_bots:
                background_tasks.add_task(
                    process_bot_response,
                    tweet_repo,
                    claude_service,
                    new_tweet
                )
                break
        
        return {"tweet": new_tweet}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _extract_mentions(text: str) -> List[str]:
    """Extract @mentions from text"""
    return [word[1:] for word in text.split() if word.startswith('@')]

@app.get("/api/debug/{tweet_id}")
async def get_debug_info(tweet_id: str):
    # Get all debug entries for this tweet
    tweet_debug_entries = {
        k: v for k, v in debug_store.items() 
        if k.startswith(f"{tweet_id}_")
    }
    
    if not tweet_debug_entries:
        return {
            "step": "started",
            "analysis_prompt": "",
            "analysis_response": "",
            "final_prompt": "",
            "final_response": "",
            "error": ""
        }
    
    # Get the first bot's debug info
    first_bot_debug = next(iter(tweet_debug_entries.values()))
    
    return {
        "step": first_bot_debug["step"],
        "analysis_prompt": first_bot_debug.get("analysis_prompt", ""),
        "analysis_response": first_bot_debug.get("analysis_response", ""),
        "final_prompt": first_bot_debug.get("final_prompt", ""),
        "final_response": first_bot_debug.get("final_response", ""),
        "error": first_bot_debug.get("error", "")
    }

async def update_debug_info(tweet_id: str, info: dict):
    debug_store[tweet_id] = info

async def process_bot_response(tweet_repo: TweetRepository, claude_service: ClaudeService, new_tweet: Tweet):
    try:
        # Get all active bots
        data = _load_bots()
        active_bots = {
            bot["name"].lower(): bot
            for bot in data["bots"].values()
            if bot["is_active"]
        }
        
        # Extract mentioned bots
        mentioned_bots = [
            name.lower() for name in _extract_mentions(new_tweet.text)
            if name.lower() in active_bots
        ]
        
        # Process response for each mentioned active bot
        for bot_name in mentioned_bots:
            # Update debug info for this bot
            debug_key = f"{new_tweet.id}_{bot_name}"
            await update_debug_info(debug_key, {
                "step": "analyzing_request",
                "analysis_prompt": "",
                "analysis_response": "",
                "final_prompt": "",
                "final_response": "",
                "error": ""
            })
            
            # Generate response using Claude for this specific bot
            response_data = await claude_service.generate_response({
                'tweet_text': new_tweet.text,
                'author': new_tweet.author,
                'thread_context': tweet_repo.get_thread_context(new_tweet.id),
                'bot_name': bot_name
            })
            
            # Create response tweet for this bot
            tweet_repo.add_tweet(
                text=response_data['final']['response'],
                author=bot_name,
                parent_id=new_tweet.id
            )
            
            # Update debug info for this bot
            await update_debug_info(debug_key, {
                "step": "completed",
                "analysis_prompt": response_data['analysis']['prompt'],
                "analysis_response": response_data['analysis']['response'],
                "final_prompt": response_data['final']['prompt'],
                "final_response": response_data['final']['response'],
                "error": ""
            })
            
    except Exception as e:
        print(f"Error processing bot response: {e}")
        await update_debug_info(new_tweet.id, {
            "step": "error",
            "analysis_prompt": "",
            "analysis_response": "",
            "final_prompt": "",
            "final_response": "",
            "error": str(e)
        })

@app.delete("/api/tweets/clear")
async def clear_tweets():
    """Clear all non-existing tweets and bots"""
    try:
        tweet_repo.clear_non_existing_tweets()
        _clear_non_existing_bots()
        return {"message": "All non-existing tweets and bots cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))