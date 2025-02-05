from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
from .models import Tweet
from .repository import TweetRepository
from .services.llm import ClaudeService
from config import ALLOWED_ORIGINS
from fastapi import BackgroundTasks
from dataclasses import dataclass
import json

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
    active: bool

# Initialize bot status with default False
bot_active = False

@app.get("/")
async def get_bot_status():
    """Get the current bot status"""
    return {"active": bot_active}

@app.post("/toggle")
async def toggle_bot_status(status: BotStatus):
    """Toggle the bot's active status"""
    global bot_active
    bot_active = status.active
    return {"active": bot_active}

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
debug_store: Dict[str, DebugInfo] = {}

@app.post("/api/tweets")
async def create_tweet(tweet: NewTweet, background_tasks: BackgroundTasks):
    """Create a new tweet and process bot response if needed"""
    # Create the tweet immediately
    new_tweet = tweet_repo.add_tweet(
        text=tweet.text,
        author=tweet.author,
        parent_id=tweet.parent_id
    )
    
    # Only process bot response if bot is active
    if bot_active and "@delphibot" in tweet.text.lower():
        debug_store[new_tweet.id] = DebugInfo(step="started")
        background_tasks.add_task(process_bot_response, tweet_repo, claude_service, new_tweet)
    
    return {"tweet": new_tweet}

@app.get("/api/debug/{tweet_id}")
async def get_debug_info(tweet_id: str):
    return debug_store.get(tweet_id, {})

async def process_bot_response(tweet_repo: TweetRepository, claude_service: ClaudeService, new_tweet: Tweet):
    try:
        # Initial state
        debug_store[new_tweet.id] = DebugInfo(step="started")
        
        context = tweet_repo.get_thread_context(new_tweet.id)
        
        # Analysis phase
        debug_store[new_tweet.id].step = "analyzing_request"
        analysis_prompt = claude_service._construct_analysis_prompt({
            "author": new_tweet.author,
            "tweet_text": new_tweet.text,
            "thread_context": context
        })
        debug_store[new_tweet.id].analysis_prompt = analysis_prompt
        
        # Get analysis and store it
        analysis = await claude_service._get_claude_response(analysis_prompt)
        debug_store[new_tweet.id].analysis_response = analysis
        
        # Generation phase
        debug_store[new_tweet.id].step = "generating_response"
        final_prompt = claude_service._construct_final_prompt({
            "author": new_tweet.author,
            "tweet_text": new_tweet.text
        }, analysis)
        debug_store[new_tweet.id].final_prompt = final_prompt
        
        response_text = await claude_service._get_claude_response(final_prompt)
        debug_store[new_tweet.id].final_response = response_text
        debug_store[new_tweet.id].step = "completed"
        
        # Create bot response tweet
        bot_tweet = tweet_repo.add_tweet(
            text=response_text,  # Use the response text directly
            author="delphibot",
            parent_id=new_tweet.id
        )
        
    except Exception as e:
        debug_store[new_tweet.id].step = "error"
        debug_store[new_tweet.id].error = str(e)

@app.delete("/api/tweets/clear")
async def clear_tweets():
    """Clear all non-existing tweets"""
    tweet_repo.clear_non_existing_tweets()
    return {"status": "success"}