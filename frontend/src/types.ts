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
}
