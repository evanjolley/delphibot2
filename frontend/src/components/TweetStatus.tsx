import { Paper, Text, Group, Stack, Loader, Anchor } from '@mantine/core';
import React from 'react';

export type TweetState = 'idle' | 'generating' | 'success' | 'error';

interface TweetStatusProps {
  state: TweetState;
  error?: string;
  tweetId?: string;
}

export function TweetStatus({ state, error, tweetId }: TweetStatusProps) {
  const getStatusContent = () => {
    switch (state) {
      case 'generating':
        return (
          <Group>
            <Loader size="sm" />
            <Text>Processing tweet and generating response...</Text>
          </Group>
        );
      case 'success':
        return (
          <Stack>
            <Text c="green">Reply posted successfully!</Text>
            {tweetId && (
              <Anchor 
                href={`https://x.com/i/status/${tweetId}`} 
                target="_blank"
                rel="noopener noreferrer"
              >
                View reply on X
              </Anchor>
            )}
          </Stack>
        );
      case 'error':
        return (
          <Text c="red">
            Error: {error}
          </Text>
        );
      default:
        return null;
    }
  };

  if (state === 'idle') return null;

  return (
    <Paper shadow="sm" p="md" withBorder>
      <Stack>
        {getStatusContent()}
      </Stack>
    </Paper>
  );
}