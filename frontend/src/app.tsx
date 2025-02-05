import { Container, Stack, Paper, Text, Group, Button, Grid, Title, TextInput } from '@mantine/core';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import TweetForm from './components/TweetForm';
import TweetDisplay from './components/TweetDisplay';
import { BotStatus } from './components/BotStatus';
import { Tweet, TweetInput } from './types';
import { tweetApi, getBotStatus, toggleBot, createBot } from './api';
import React from 'react';
import { ConfirmationModal } from './components/ConfirmationModal';
import { DebugView } from './components/DebugView';
import { LoginModal } from './components/LoginModal';

interface ThreadedTweet extends Tweet {
  children?: ThreadedTweet[];
}

interface Bot {
  name: string;
  isActive: boolean;
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
  const [bots, setBots] = useState<Bot[]>([
    { name: 'delphibot', isActive: false }
  ]);
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
  const [username, setUsername] = useState('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(true);

  useEffect(() => {
    loadTweets();
    checkBotStatus();
  }, []);

  const checkBotStatus = async () => {
    try {
      const status = await getBotStatus();
      setBots(status.bots);
    } catch (error) {
      console.error('Failed to check bot status:', error);
    }
  };

  const handleToggleBot = async (botName: string) => {
    try {
      setIsToggling(true);
      const targetBot = bots.find(b => b.name === botName);
      
      if (!targetBot) {
        throw new Error('Bot not found');
      }

      const updatedBots = bots.map(bot => 
        bot.name === botName ? { ...bot, isActive: !bot.isActive } : bot
      );

      await toggleBot(botName, !targetBot.isActive);
      setBots(updatedBots);
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

  const handleAddBot = async (botName: string) => {
    try {
      if (bots.find(b => b.name.toLowerCase() === botName.toLowerCase())) {
        notifications.show({
          title: 'Error',
          message: `Bot '@${botName}' already exists`,
          color: 'red',
        });
        return;
      }
      
      const response = await createBot(botName);
      // Create a map of existing bot states
      const existingBotStates = new Map(
        bots.map(bot => [bot.name.toLowerCase(), bot.isActive])
      );
      
      // Map the response, preserving existing bot states
      const updatedBots = response.bots.map(bot => ({
        name: bot.name,
        isActive: existingBotStates.has(bot.name.toLowerCase()) 
          ? existingBotStates.get(bot.name.toLowerCase())! 
          : bot.active
      }));
      setBots(updatedBots);
    } catch (error: any) {
      console.error('Failed to create bot:', error);
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
      });
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

  const loadBots = async () => {
    try {
      const response = await getBotStatus();
      setBots(response.bots || []);
    } catch (error) {
      console.error('Failed to load bots:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load bots',
        color: 'red',
      });
    }
  };

  const handleTweetSubmit = async (input: TweetInput) => {
    try {
      const tweetInput = {
        ...input,
        author: username
      };

      const mentioned_bots = bots.filter(b => 
        input.text.toLowerCase().includes(`@${b.name.toLowerCase()}`)
      );

      if (bots.some(b => b.isActive) && mentioned_bots.length > 0) {
        setDebugInfo({
          currentStep: 'started',
          analysis_prompt: '',
          analysis_response: '',
          final_prompt: '',
          final_response: '',
          error: ''
        });
      }

      const response = await tweetApi.createTweet(tweetInput);
      setTweets(prevTweets => [response, ...prevTweets]);

      if (mentioned_bots.length > 0 && mentioned_bots.some(b => b.isActive)) {
        let pollCount = 0;
        const maxPolls = 30; // 30 seconds timeout
        
        const pollInterval = setInterval(async () => {
          try {
            pollCount++;
            const debug = await tweetApi.getDebugInfo(response.id);
            
            setDebugInfo({
              currentStep: debug.step,
              analysis_prompt: debug.analysis_prompt || '',
              analysis_response: debug.analysis_response || '',
              final_prompt: debug.final_prompt || '',
              final_response: debug.final_response || '',
              error: debug.error || ''
            });

            if (debug.step === 'completed' || debug.step === 'error' || pollCount >= maxPolls) {
              clearInterval(pollInterval);
              if (debug.step === 'completed') {
                await loadTweets();
              }
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

  useEffect(() => {
    if (!bots.some(b => b.isActive)) return;
    
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
        currentStep: '',
        analysis_prompt: '',
        analysis_response: '',
        final_prompt: '',
        final_response: '',
        error: ''
      });
    };
  }, [bots.some(b => b.isActive)]);

  const handleClearTweets = async () => {
    try {
      await tweetApi.clearTweets();
      
      // Update local bot state by keeping only existing bots
      const updatedBots = bots.filter(bot => 
        bot.name === 'delphibot' // Keep only the default bot
      );
      setBots(updatedBots);
      
      await loadTweets();
      setUsername('');
      setDebugInfo({
        currentStep: '',
        analysis_prompt: '',
        analysis_response: '',
        final_prompt: '',
        final_response: '',
        error: ''
      });
      notifications.show({
        title: 'Success',
        message: 'Tweets and bots cleared successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Failed to clear tweets and bots:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to clear tweets and bots',
        color: 'red',
      });
    } finally {
      setModalOpened(false);
    }
  };

  const threadedTweets = organizeThreads(tweets);

  return (
    <Container size={showDebug ? "xl" : "sm"} py="xl" style={{ position: 'relative' }}>
      <Stack spacing="xl">
        <Group style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
          <Title order={1} style={{ flex: 1 }}>Ask @delphibot</Title>
          <Group>
            <Button 
              variant="subtle"
              size="xs"
              compact
              onClick={() => setModalOpened(true)}
              color="red"
            >
              Reset
            </Button>
            <Button 
              variant="subtle"
              size="xs"
              compact
              onClick={() => setShowDebug(!showDebug)}
            >
              {showDebug ? 'Hide Demo' : 'Full Demo'}
            </Button>
          </Group>
        </Group>

        {showDebug ? (
          <Grid gutter="xl">
            <Grid.Col span={6} style={{ maxWidth: '600px' }}>
              <Stack spacing="xl">
                <Paper shadow="sm" p="md" withBorder>
                  <Group justify="space-between" align="center">
                    <BotStatus 
                      bots={bots}
                      onToggle={handleToggleBot}
                      onAddBot={handleAddBot}
                      isLoading={isToggling}
                    />
                  </Group>
                  
                </Paper>

                <Paper shadow="sm" p="md" withBorder>
                  <TweetForm 
                    onSubmit={handleTweetSubmit}
                    disabled={!username}
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
                botActive={bots.some(b => b.isActive)}
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
            <Paper shadow="sm" p="md" withBorder>
              <Stack spacing="md">
                <Group justify="space-between" align="center">
                  <BotStatus 
                    bots={bots}
                    onToggle={handleToggleBot}
                    onAddBot={handleAddBot}
                    isLoading={isToggling}
                  />
                </Group>
              </Stack>
            </Paper>

            <Paper shadow="sm" p="md" withBorder>
              <TweetForm 
                onSubmit={handleTweetSubmit}
                disabled={!username}
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
      </Stack>

      <ConfirmationModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        onConfirm={handleClearTweets}
        title="Clear Tweets"
        message="Are you sure you want to clear all created tweets? This action cannot be undone."
      />

      <LoginModal 
        opened={isLoginModalOpen} 
        onSubmit={(name) => {
          setUsername(name);
          setIsLoginModalOpen(false);
        }} 
      />
    </Container>
  );
}