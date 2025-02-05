import axios, { AxiosError } from 'axios';
import { TweetInput, BotStatus, Tweet } from './types';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add error interceptor
api.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const getBotStatus = async () => {
  const response = await api.get('/');
  return response.data;
};

export const toggleBot = async (botName: string, active: boolean) => {
  try {
    const response = await api.post('/toggle', { 
      botName, 
      active 
    });
    return response.data;
  } catch (error) {
    console.error('Error toggling bot:', error);
    throw error;
  }
};

export const createBot = async (botName: string) => {
  try {
    const response = await api.post('/bots', { bot_name: botName });
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || 'Error creating bot';
    console.error('Error creating bot:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const processTweet = async (input: TweetInput) => {
  const response = await api.post('/api/process-tweet', input);
  return response.data;
};

export const tweetApi = {
  getTweets: async (): Promise<Tweet[]> => {
    const response = await api.get('/api/tweets');
    return response.data;
  },
  
  createTweet: async (tweet: TweetInput): Promise<Tweet> => {
    try {
      const response = await api.post('/api/tweets', tweet);
      return response.data.tweet || response.data;
    } catch (error) {
      console.error('Error creating tweet:', error);
      throw error;
    }
  },
  
  clearTweets: async (): Promise<void> => {
    await api.delete('/api/tweets/clear');
  },

  getDebugInfo: async (tweetId: string) => {
    const response = await api.get(`/api/debug/${tweetId}`);
    return response.data;
  }
};