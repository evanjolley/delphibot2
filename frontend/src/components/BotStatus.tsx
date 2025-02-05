import React from 'react';
import { Switch, Group } from '@mantine/core';

interface BotStatusProps {
  isActive: boolean;
  onToggle: () => void;
  isLoading?: boolean;
}

export function BotStatus({ isActive, onToggle, isLoading }: BotStatusProps) {
  return (
    <Group justify="space-between">
      <Switch
        label="Bot Status"
        checked={isActive}
        onChange={onToggle}
        disabled={isLoading}
        size="lg"
        color={isActive ? 'green' : 'red'}
      />
    </Group>
  );
}