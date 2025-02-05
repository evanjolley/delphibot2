import React, { useState } from 'react';
import { Switch, Group, Stack, TextInput, Button, Text, Paper, Grid } from '@mantine/core';

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

export function BotStatus({ bots, onToggle, onAddBot, isLoading }: BotStatusProps) {
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
        margin: '0 auto'
      }}
    >
      <Grid.Col 
        span={5} 
        style={{ 
          display: 'flex',
          alignItems: 'center'  // This centers the content vertically
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
            />
            <Button 
              type="submit" 
              disabled={isLoading || isAtLimit}
              title={isAtLimit ? "Maximum limit of 3 bots reached" : ""}
              fullWidth
            >
              Add Bot
            </Button>
          </Stack>
        </form>
      </Grid.Col>

      <Grid.Col span={5}>
        <Stack spacing="xs">
          {bots.map((bot) => (
            <Paper 
              key={bot.id} 
              p="xs" 
              withBorder 
              style={{ 
                backgroundColor: 'var(--mantine-color-gray-0)',
                height: '36px',  // Fixed height
                display: 'flex',
                alignItems: 'center' 
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
                    height: '24px'  // Fixed height for switch
                  },
                  label: {
                    paddingLeft: '8px',
                    fontSize: '0.9rem',
                    lineHeight: '24px'  // Match the switch height
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
                height: '36px',  // Match active bot height
                display: 'flex',
                alignItems: 'center',
                opacity: 0.5
              }}
            >
              <Text size="sm" color="dimmed">Empty Bot Slot</Text>
            </Paper>
          ))}
        </Stack>
      </Grid.Col>
    </Grid>
  );
}