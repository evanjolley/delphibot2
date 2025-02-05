export interface TweetInput {
    text: string;
    author: string;
    parent_id?: string;
}

export interface BotStatus {
    active: boolean;
}

export interface Tweet {
    id: string;
    text: string;
    author: string;
    timestamp: string;
    parent_id?: string;
    thread_id?: string;
    mentions: string[];
    responses: string[];
}

export interface TweetResponse {
    status: 'success' | 'error';
    message?: string;
    tweets: Tweet[];
}

export interface ThreadedTweet extends Tweet {
    children?: ThreadedTweet[];
}