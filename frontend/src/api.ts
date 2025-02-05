import axios from 'axios';
import { TweetInput, BotStatus, Tweet } from './types';

const api = axios.create({
  baseURL: 'http://localhost:8000'
});

export const getBotStatus = async () => {
  const response = await api.get('/');
  return response.data;
};

export const toggleBot = async (active: boolean) => {
  const response = await api.post('/toggle', { active } as BotStatus);
  return response.data;
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
    const response = await api.post('/api/tweets', tweet);
    return response.data.tweet || response.data;
  },
  
  clearTweets: async (): Promise<void> => {
    await api.delete('/api/tweets/clear');
  }
};