from anthropic import Anthropic
from config import ANTHROPIC_API_KEY
from typing import List

class ClaudeService:
    def __init__(self):
        self.client = Anthropic(api_key=ANTHROPIC_API_KEY)

    async def generate_response(self, tweet_data):
        # First, analyze the request and context
        analysis_prompt = self._construct_analysis_prompt(tweet_data)
        request_analysis = await self._get_claude_response(analysis_prompt, is_analysis=True)
        
        # Then, generate the actual response using the analysis
        final_prompt = self._construct_final_prompt(tweet_data, request_analysis)
        response = await self._get_claude_response(final_prompt)
        
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
        
        prompt = "Analyze this tweet and explain what the user is asking for.\n\n"
        
        # Only add thread context if it's different from the current tweet
        if thread_context and thread_context.get('context'):
            previous_messages = [msg for msg in thread_context['context'] 
                               if msg != f"@{author}: {tweet_text}"]
            if previous_messages:
                prompt += "Thread context:\n"
                for msg in previous_messages:
                    prompt += f"{msg}\n\n"
        
        prompt += f"Tweet from @{author}: {tweet_text}\n\n"
        prompt += "Provide a clear explanation of what the user is requesting."
        
        return prompt

    def _construct_final_prompt(self, tweet_data, analysis):
        author = tweet_data.get('author', '')
        
        # If analysis is None or empty, extract the question from tweet_data
        if not analysis or analysis.strip() == 'None':
            analysis = f"User is asking: {tweet_data.get('tweet_text', '')}"
        
        prompt = f"""Context: You are responding on Twitter to @{author}.

Analysis of request: {analysis}

Your task: Provide a helpful response that:
1. Starts with @{author}
2. Is informative while being concise (max 280 characters)
3. Directly addresses the analyzed request

Write your response:"""
        
        return prompt

    async def _get_claude_response(self, prompt, is_analysis=False):
        try:
            system_message = (
                "You are an analysis assistant. Provide clear, direct explanations of what users are asking for." 
                if is_analysis else 
                "You are DelphiBot, an AI assistant focused on providing concise, helpful responses on Twitter. Respond directly to the user's question without any JSON formatting."
            )
            
            response = self.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=1000,
                system=system_message,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            return response.content[0].text
        
        except Exception as e:
            raise Exception(f"Failed to generate response: {str(e)}")

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