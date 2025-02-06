export interface TweetInput {
    text: string;
    author: string;
    parent_id?: string;
}

export interface Bot {
    id: string;
    name: string;
    isActive: boolean;
    timestamp: string;
    isExisting?: boolean;
}

export interface Tweet {
    id: string;
    text: string;
    author: string;
    timestamp: string;
    parent_id?: string;
}
