from anthropic import Anthropic
from config import ANTHROPIC_API_KEY
from typing import List

class ClaudeService:
    def __init__(self):
        self.client = Anthropic(api_key=ANTHROPIC_API_KEY)

    async def generate_response(self, tweet_data):
        # First, analyze the request and context
        analysis_prompt = self._construct_analysis_prompt(tweet_data)
        request_analysis = await self._get_claude_response(analysis_prompt)
        
        # Then, generate the actual response using the analysis
        final_prompt = self._construct_final_prompt(tweet_data, request_analysis)
        response = await self._get_claude_response(final_prompt, tweet_data)
        
        return {
            'analysis': {
                'prompt': analysis_prompt,
                'response': request_analysis
            },
            'final': {
                'prompt': final_prompt,
                'response': response
            }
        }

    def _construct_analysis_prompt(self, tweet_data):
        author = tweet_data.get('author', '')
        tweet_text = tweet_data.get('tweet_text', '')
        thread_context = tweet_data.get('thread_context', {})
        
        prompt = "Analyze this tweet interaction and explain what the user is asking for.\n\n"
        
        if thread_context and thread_context.get('context'):
            prompt += "Thread context:\n"
            for msg in thread_context['context']:
                prompt += f"{msg}\n"
        
        prompt += f"\nCurrent tweet from @{author}: {tweet_text}\n"
        prompt += "\nProvide a clear explanation of what the user is requesting."
        
        return prompt

    def _construct_final_prompt(self, tweet_data, analysis):
        author = tweet_data.get('author', '')
        
        prompt = f"""Context: You are responding on Twitter to @{author}.

Analysis of request: {analysis}

Your task: Provide a helpful response that:
1. Starts with @{author}
2. Is informative while being concise
3. Directly addresses the analyzed request"""
        
        return prompt

    async def _get_claude_response(self, prompt, tweet_data=None):
        try:
            response = self.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=1000,
                system="You are DelphiBot, an AI assistant focused on product, growth, and business advice. Always start your response by addressing the user with @username format using their author name. Your responses should be informative while being concise and tweet-length.",
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            # Extract author from tweet_data and ensure response starts with correct @mention
            response_text = response.content[0].text
            if tweet_data and tweet_data.get('author'):
                author = tweet_data.get('author')
                if not response_text.startswith(f"@{author}"):
                    response_text = f"@{author} {response_text.lstrip('@username ')}"
            
            return response_text
            
        except Exception as e:
            raise Exception(f"Failed to generate response: {str(e)}")

    def _construct_prompt(self, tweet_data):
        author = tweet_data.get('author', '')
        tweet_text = tweet_data.get('tweet_text', '')
        
        # Analyze if this is a direct question or thread response
        is_thread_response = "above" in tweet_text.lower() or "thread" in tweet_text.lower()
        
        # Analyze mentions to detect bot interaction
        mentions = self._extract_mentions(tweet_text)
        is_bot_mention = "lennybot" in mentions
        
        prompt = f"""Context: You are responding on Twitter to @{author}.

Tweet: {tweet_text}"""
        
        if tweet_data.get('thread_context'):
            thread_analysis = self._analyze_thread_context(
                tweet_text,
                tweet_data['thread_context']
            )
            
            prompt += f"""

Thread Analysis:
{thread_analysis}

Thread Context:
"""
            for tweet in tweet_data['thread_context']:
                prompt += f"- {tweet}\n"

        prompt += f"\nProvide a helpful response that:"
        prompt += f"\n1. Starts with @{author}"
        prompt += "\n2. Is informative while being concise"
        prompt += "\n3. Addresses the specific question or context"
        
        return prompt

    def _analyze_thread_context(self, trigger_tweet: str, thread_context: List[str]) -> str:
        """Analyze the thread context to understand the conversation flow"""
        analysis_prompt = f"""Analyze this Twitter conversation:

Previous tweets:
{chr(10).join(f'- {tweet}' for tweet in thread_context)}

User's question/comment:
{trigger_tweet}

Provide a brief analysis of:
1. What is the main topic being discussed?
2. What specific aspect is the user asking about?
3. What context is needed to give an informed response?

Format your response in a clear, concise way."""

        try:
            response = self.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=500,
                messages=[{"role": "user", "content": analysis_prompt}]
            )
            return response.content[0].text
        except Exception as e:
            return f"Error analyzing thread: {str(e)}"

    def _extract_mentions(self, text: str) -> List[str]:
        """Extract @mentions from text"""
        return [word[1:].lower() for word in text.split() if word.startswith('@')]