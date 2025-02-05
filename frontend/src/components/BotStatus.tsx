import React, { useState } from 'react';
import { Switch, Group, Stack, TextInput, Button, Text } from '@mantine/core';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBotName.trim()) {
      onAddBot(newBotName.trim().toLowerCase());
      setNewBotName('');
    }
  };

  return (
    <Stack spacing="md">
      <form onSubmit={handleSubmit}>
        <Group align="flex-end">
          <TextInput
            label="Create New Bot"
            placeholder="Enter bot name"
            value={newBotName}
            onChange={(e) => setNewBotName(e.target.value)}
            required
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            disabled={isLoading}
            title={isAtLimit ? "Maximum limit of 3 bots reached" : ""}
          >
            Add Bot
          </Button>
        </Group>
      </form>

      <Stack spacing="xs">
        {bots.map((bot) => (
          <Switch
            key={bot.id}
            label={`@${bot.name}`}
            checked={bot.isActive}
            onChange={() => onToggle(bot.name)}
            disabled={isLoading}
            size="lg"
            color={bot.isActive ? 'green' : 'red'}
          />
        ))}
      </Stack>
    </Stack>
  );
}