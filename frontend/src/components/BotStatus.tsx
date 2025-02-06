import React, { useState, memo } from 'react';
import { Switch, Stack, TextInput, Button, Text, Paper, Grid } from '@mantine/core';

interface Bot {
  id: string;
  name: string;
  isActive: boolean;
}

interface BotStatusProps {
  bots: Bot[];
  onToggle: (botName: string) => void;
  onAddBot: (botName: string) => void;
  isLoading?: boolean;
}

export const BotStatus = memo(function BotStatus({ bots, onToggle, onAddBot, isLoading }: BotStatusProps) {
  const [newBotName, setNewBotName] = useState('');
  const isAtLimit = bots.length >= 3;
  const emptySlots = 3 - bots.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBotName.trim()) {
      onAddBot(newBotName.trim().toLowerCase());
      setNewBotName('');
    }
  };

  return (
    <Grid 
      gutter="md" 
      justify="space-between" 
      align="stretch" 
      style={{ 
        width: '90%',
        margin: '0 auto',
        minHeight: '150px'
      }}
    >
      <Grid.Col 
        span={5} 
        style={{ 
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <Stack>
            <TextInput
              label="Create New Bot"
              placeholder="Enter bot name"
              value={newBotName}
              onChange={(e) => setNewBotName(e.target.value)}
              required
              disabled={isLoading || isAtLimit}
              maxLength={15}
              error={newBotName.length > 15 ? "Bot name must be 15 characters or less" : ""}
            />
            <Button 
              type="submit" 
              disabled={isLoading || isAtLimit || !newBotName.trim()}
              title={isAtLimit ? "Maximum limit of 3 bots reached" : ""}
              fullWidth
            >
              Add Bot
            </Button>
          </Stack>
        </form>
      </Grid.Col>

      <Grid.Col span={5}>
        <Stack spacing="md" style={{ minHeight: '120px' }}>
          <div style={{ 
            transition: 'all 0.2s ease-in-out',
            minHeight: '144px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            {bots.map((bot) => (
              <Paper 
                key={bot.id} 
                p="xs" 
                withBorder 
                style={{ 
                  backgroundColor: 'var(--mantine-color-gray-0)',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <Switch
                  label={`@${bot.name}`}
                  checked={bot.isActive}
                  onChange={() => onToggle(bot.name)}
                  disabled={isLoading}
                  size="md"
                  color={bot.isActive ? 'green' : 'red'}
                  styles={{
                    root: {
                      display: 'flex',
                      alignItems: 'center',
                      height: '24px'
                    },
                    label: {
                      paddingLeft: '8px',
                      fontSize: '0.9rem',
                      lineHeight: '24px'
                    }
                  }}
                />
              </Paper>
            ))}
            {Array.from({ length: emptySlots }).map((_, index) => (
              <Paper
                key={`empty-${index}`}
                p="xs"
                withBorder
                style={{
                  backgroundColor: 'var(--mantine-color-gray-0)',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: 0.5,
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <Text size="sm" color="dimmed">Bot Slot</Text>
              </Paper>
            ))}
          </div>
        </Stack>
      </Grid.Col>
    </Grid>
  );
});