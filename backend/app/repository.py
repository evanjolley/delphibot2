import json
from datetime import datetime, timezone
import uuid
from pathlib import Path
from .models import Tweet
from typing import List, Optional, Dict, Any

class TweetRepository:
    def __init__(self):
        self.data_file = Path(__file__).parent.parent / "data" / "tweets.json"
        self.tweets = self._load_tweets()
    
    def _load_tweets(self):
        if not self.data_file.exists():
            return {}
        with open(self.data_file, 'r') as f:
            data = json.load(f)
            return {id: Tweet(**tweet_data) for id, tweet_data in data['tweets'].items()}
    
    def _save_tweets(self):
        data = {
            'tweets': {
                id: tweet.dict() for id, tweet in self.tweets.items()
            }
        }
        self.data_file.parent.mkdir(exist_ok=True)
        with open(self.data_file, 'w') as f:
            json.dump(data, f, default=str, indent=2)
    
    def get_all_tweets(self):
        # Return tweets sorted by timestamp, newest first
        return sorted(
            self.tweets.values(),
            key=lambda t: t.timestamp.replace(tzinfo=timezone.utc) if t.timestamp.tzinfo is None else t.timestamp,
            reverse=True
        )
    
    def get_tweet(self, tweet_id: str):
        return self.tweets.get(tweet_id)
    
    def get_thread(self, thread_id: str):
        return [t for t in self.tweets.values() if t.thread_id == thread_id]
    
    def add_tweet(self, text: str, author: str, parent_id: Optional[str] = None):
        tweet_id = str(uuid.uuid4())
        thread_id = None
        
        # If text is JSON, extract display_text
        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict) and 'display_text' in parsed:
                text = parsed['display_text']
        except json.JSONDecodeError:
            pass  # Use text as is if not JSON
        
        if parent_id:
            parent_tweet = self.tweets.get(parent_id)
            if parent_tweet:
                thread_id = parent_tweet.thread_id or parent_id
                parent_tweet.responses.append(tweet_id)
                self.tweets[parent_id] = parent_tweet
        
        new_tweet = Tweet(
            id=tweet_id,
            text=text,
            author=author,
            timestamp=datetime.now(timezone.utc),
            parent_id=parent_id,
            thread_id=thread_id,
            mentions=self._extract_mentions(text)
        )
        
        self.tweets[tweet_id] = new_tweet
        self._save_tweets()
        return new_tweet
    
    def _extract_mentions(self, text: str) -> List[str]:
        # Remove any punctuation after the mention
        return [word[1:].rstrip(',.!?') for word in text.split() if word.startswith('@')]

    def get_tweet_chain(self, tweet_id: str):
        """Get the chain of tweets leading up to the given tweet"""
        chain = []
        current_tweet = self.tweets.get(tweet_id)
        
        # Walk up the chain through parent_ids
        while current_tweet:
            chain.append(current_tweet)
            if current_tweet.parent_id:
                current_tweet = self.tweets.get(current_tweet.parent_id)
            else:
                break
            
        # Reverse so it's in chronological order
        return list(reversed(chain))

    def clear_non_existing_tweets(self):
        self.tweets = {
            id: tweet for id, tweet in self.tweets.items()
            if tweet.is_existing
        }
        self._save_tweets()

    def get_thread_context(self, tweet_id: str) -> Dict[str, Any]:
        """Get comprehensive thread context for a tweet"""
        chain = self.get_tweet_chain(tweet_id)
        
        return {
            'tweets': [tweet.text for tweet in chain],
            'authors': [tweet.author for tweet in chain],
            'context': self._extract_thread_context(chain)
        }
    
    def _extract_thread_context(self, chain: List[Tweet]) -> str:
        """Extract a readable context from the tweet chain"""
        context = []
        for tweet in chain:
            context.append(f"@{tweet.author}: {tweet.text}")
        return context