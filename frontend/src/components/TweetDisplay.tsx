import { Paper, Stack, Text, Group, Button, Box } from '@mantine/core';
import React, { useState } from 'react';
import { Tweet, TweetInput } from '../types';
import TweetForm from './TweetForm';

interface ThreadedTweet extends Tweet {
  children?: ThreadedTweet[];
}

interface TweetDisplayProps {
  tweet: ThreadedTweet;
  onReply: (input: TweetInput) => Promise<void>;
  isLoading: boolean;
  isChild?: boolean;
}

export default function TweetDisplay({ tweet, onReply, isLoading, isChild = false }: TweetDisplayProps) {
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Just now';
      }
      return date.toLocaleString();
    } catch (error) {
      return 'Just now';
    }
  };

  const handleReply = async (input: TweetInput) => {
    await onReply(input);
    setReplyingToId(null);
  };

  const renderTweet = (tweet: ThreadedTweet, isChild: boolean) => (
    <Stack spacing="md">
      <Box
        style={{
          paddingLeft: isChild ? '2rem' : 0,
          position: 'relative',
          borderLeft: isChild ? '2px solid #e9ecef' : 'none',
          marginLeft: isChild ? '1rem' : 0,
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem'
        }}
      >
        <Stack spacing="xs">
          <Group spacing="xs">
            <Text size="sm" weight={500}>
              {tweet.author}
            </Text>
            <Text size="xs" color="dimmed">
              {formatDate(tweet.timestamp)}
            </Text>
          </Group>
          <Text>{tweet.text}</Text>
          
          <Group>
            <Button 
              variant="subtle" 
              size="xs"
              onClick={() => setReplyingToId(replyingToId === tweet.id ? null : tweet.id)}
            >
              Reply
            </Button>
          </Group>

          {replyingToId === tweet.id && (
            <Box pl={isChild ? 0 : "2rem"}>
              <TweetForm
                onSubmit={handleReply}
                disabled={isLoading}
                parentId={tweet.id}
              />
            </Box>
          )}

          {tweet.children && tweet.children.map(child => (
            <Box key={child.id}>
              {renderTweet(child, true)}
            </Box>
          ))}
        </Stack>
      </Box>
    </Stack>
  );

  return renderTweet(tweet, isChild);
}