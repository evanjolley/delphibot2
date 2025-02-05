import { Container, Stack, Title, Paper, Text, Center, Loader, Group, Button, Grid } from '@mantine/core';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import TweetForm from './components/TweetForm';
import TweetDisplay from './components/TweetDisplay';
import { BotStatus } from './components/BotStatus';
import { Tweet, TweetInput } from './types';
import { tweetApi, getBotStatus, toggleBot, processTweet } from './api';
import React from 'react';
import { ConfirmationModal } from './components/ConfirmationModal';
import { DebugView } from './components/DebugView';

interface ThreadedTweet extends Tweet {
  children?: ThreadedTweet[];
}

const organizeThreads = (tweets: Tweet[]): ThreadedTweet[] => {
  const tweetMap = new Map<string, ThreadedTweet>();
  const rootTweets: ThreadedTweet[] = [];

  // First pass: create ThreadedTweet objects
  tweets.forEach(tweet => {
    tweetMap.set(tweet.id, { ...tweet, children: [] });
  });

  // Second pass: organize into tree structure
  tweets.forEach(tweet => {
    const threadedTweet = tweetMap.get(tweet.id)!;
    if (tweet.parent_id && tweetMap.has(tweet.parent_id)) {
      const parent = tweetMap.get(tweet.parent_id)!;
      parent.children?.push(threadedTweet);
    } else {
      rootTweets.push(threadedTweet);
    }
  });

  return rootTweets;
};

export default function App() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [error, setError] = useState<string>();
  const [botActive, setBotActive] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    currentStep: '',
    analysis_prompt: '',
    analysis_response: '',
    final_prompt: '',
    final_response: '',
    error: ''
  });

  useEffect(() => {
    loadTweets();
    checkBotStatus();
  }, []);

  const checkBotStatus = async () => {
    try {
      const status = await getBotStatus();
      setBotActive(status.active);
    } catch (error) {
      console.error('Failed to check bot status:', error);
    }
  };

  const handleToggleBot = async () => {
    try {
      setIsToggling(true);
      await toggleBot(!botActive);
      setBotActive(!botActive);
      notifications.show({
        title: 'Bot Status Updated',
        message: !botActive ? 'Bot has been activated' : 'Bot has been deactivated',
        color: !botActive ? 'green' : 'red',
      });
    } catch (error) {
      console.error('Failed to toggle bot:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to toggle bot status',
        color: 'red',
      });
    } finally {
      setIsToggling(false);
    }
  };

  const loadTweets = async () => {
    try {
      const response = await tweetApi.getTweets();
      setTweets(response || []);
      setError(undefined);
    } catch (err) {
      console.error('Failed to load tweets:', err);
      setError('Failed to load tweets');
      setTweets([]);
    }
  };

  const handleTweetSubmit = async (input: TweetInput) => {
    try {
      // Initial state when tweet is submitted
      setDebugInfo({
        currentStep: 'started',
        analysis_prompt: '',
        analysis_response: '',
        final_prompt: '',
        final_response: '',
        error: ''
      });

      // Create tweet
      const response = await tweetApi.createTweet(input);
      setTweets(prevTweets => [response, ...prevTweets]);

      // Only process bot response if bot is active and tweet mentions bot
      if (botActive && input.text.toLowerCase().includes('@delphibot')) {
        const pollInterval = setInterval(async () => {
          try {
            const debug = await tweetApi.getDebugInfo(response.id);
            
            switch (debug.step) {
              case 'started':
                setDebugInfo({
                  currentStep: 'started',
                  analysis_prompt: '',
                  analysis_response: '',
                  final_prompt: '',
                  final_response: '',
                  error: ''
                });
                break;

              case 'completed':
                clearInterval(pollInterval);
                const updatedTweets = await tweetApi.getTweets();
                setTweets(updatedTweets);
                setDebugInfo({
                  currentStep: 'completed',
                  analysis_prompt: debug.analysis_prompt || '',
                  analysis_response: debug.analysis_response || '',
                  final_prompt: debug.final_prompt || '',
                  final_response: debug.final_response || '',
                  error: ''
                });
                break;

              case 'error':
                clearInterval(pollInterval);
                setDebugInfo(prev => ({
                  ...prev,
                  currentStep: 'error',
                  error: debug.error || 'Failed to process bot response'
                }));
                break;
            }
          } catch (error) {
            clearInterval(pollInterval);
            setDebugInfo(prev => ({
              ...prev,
              currentStep: 'error',
              error: 'Failed to get debug information'
            }));
          }
        }, 1000);
      }

      setError(undefined);
    } catch (err) {
      console.error('Failed to submit tweet:', err);
      setDebugInfo(prev => ({
        ...prev,
        currentStep: 'error',
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      }));
      notifications.show({
        title: 'Error',
        message: 'Failed to submit tweet',
        color: 'red',
      });
    }
  };

  // Completely separate bot monitoring
  useEffect(() => {
    if (!botActive) return;
    
    setDebugInfo({
      currentStep: 'monitoring',
      analysis_prompt: '',
      analysis_response: '',
      final_prompt: '',
      final_response: '',
      error: ''
    });
    
    const checkInterval = setInterval(async () => {
      await loadTweets();
    }, 2000);

    return () => {
      clearInterval(checkInterval);
      setDebugInfo({
        currentStep: 'Bot inactive',
        analysis_prompt: '',
        analysis_response: '',
        final_prompt: '',
        final_response: '',
        error: ''
      });
    };
  }, [botActive]);

  const handleClearTweets = async () => {
    try {
      await tweetApi.clearTweets();
      await loadTweets();
      notifications.show({
        title: 'Success',
        message: 'Tweets cleared successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Failed to clear tweets:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to clear tweets',
        color: 'red',
      });
    } finally {
      setModalOpened(false);
    }
  };

  const threadedTweets = organizeThreads(tweets);

  return (
    <Container size={showDebug ? "xl" : "sm"} py="xl">
      {showDebug ? (
        <Grid gutter="xl">
          <Grid.Col span={6} style={{ maxWidth: '600px' }}>
            <Stack spacing="xl">
              <Group position="apart">
                <Title order={1}>Delphi Tweet Feed</Title>
                <Button 
                  variant="subtle"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  Hide Demo
                </Button>
              </Group>

              <Paper shadow="sm" p="md" withBorder>
                <Group justify="space-between" align="center">
                  <BotStatus 
                    isActive={botActive}
                    onToggle={handleToggleBot}
                    isLoading={isToggling}
                  />
                  <Button 
                    color="red" 
                    variant="outline"
                    onClick={() => setModalOpened(true)}
                  >
                    Clear Tweets
                  </Button>
                </Group>
              </Paper>

              <Paper shadow="sm" p="md" withBorder>
                <TweetForm 
                  onSubmit={handleTweetSubmit}
                  disabled={false}
                />
              </Paper>

              <Stack spacing="md">
                {error ? (
                  <Paper shadow="sm" p="md" withBorder>
                    <Text color="red">{error}</Text>
                  </Paper>
                ) : (
                  threadedTweets.map(tweet => (
                    <Paper key={tweet.id} shadow="sm" p="md" withBorder>
                      <TweetDisplay
                        tweet={tweet}
                        onReply={handleTweetSubmit}
                        isLoading={false}
                      />
                    </Paper>
                  ))
                )}
              </Stack>
            </Stack>
          </Grid.Col>

          <Grid.Col span={6}>
            <DebugView
              botActive={botActive}
              currentStep={debugInfo.currentStep}
              analysis_prompt={debugInfo.analysis_prompt}
              analysis_response={debugInfo.analysis_response}
              final_prompt={debugInfo.final_prompt}
              final_response={debugInfo.final_response}
              error={debugInfo.error}
            />
          </Grid.Col>
        </Grid>
      ) : (
        <Stack spacing="xl">
          <Group position="apart">
            <Title order={1}>Delphi Tweet Feed</Title>
            <Button 
              variant="subtle"
              onClick={() => setShowDebug(!showDebug)}
            >
              Full Demo
            </Button>
          </Group>

          <Paper shadow="sm" p="md" withBorder>
            <Group justify="space-between" align="center">
              <BotStatus 
                isActive={botActive}
                onToggle={handleToggleBot}
                isLoading={isToggling}
              />
              <Button 
                color="red" 
                variant="outline"
                onClick={() => setModalOpened(true)}
              >
                Clear Tweets
              </Button>
            </Group>
          </Paper>

          <Paper shadow="sm" p="md" withBorder>
            <TweetForm 
              onSubmit={handleTweetSubmit}
              disabled={false}
            />
          </Paper>

          <Stack spacing="md">
            {error ? (
              <Paper shadow="sm" p="md" withBorder>
                <Text color="red">{error}</Text>
              </Paper>
            ) : (
              threadedTweets.map(tweet => (
                <Paper key={tweet.id} shadow="sm" p="md" withBorder>
                  <TweetDisplay
                    tweet={tweet}
                    onReply={handleTweetSubmit}
                    isLoading={false}
                  />
                </Paper>
              ))
            )}
          </Stack>
        </Stack>
      )}

      <ConfirmationModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        onConfirm={handleClearTweets}
        title="Clear Tweets"
        message="Are you sure you want to clear all created tweets? This action cannot be undone."
      />
    </Container>
  );
}