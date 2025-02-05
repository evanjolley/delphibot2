import { Modal, TextInput, Button, Stack, Text } from '@mantine/core';
import { useState } from 'react';

interface LoginModalProps {
  opened: boolean;
  onSubmit: (username: string) => void;
}

export function LoginModal({ opened, onSubmit }: LoginModalProps) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onSubmit(username.trim());
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={() => {}}
      title="Welcome to Delphi Twitter"
      centered
      closeOnClickOutside={false}
      closeOnEscape={false}
      withCloseButton={false}
      styles={{
        title: {
          fontSize: '1.4rem',
          fontWeight: 600,
        },
        header: {
          padding: '1.5rem 2rem 0.5rem 2rem',
        },
        body: {
          padding: '0 2rem 2rem 2rem',
        },
        content: {
          minWidth: '400px',
        }
      }}
    >
      <form onSubmit={handleSubmit}>
        <Stack>
          <Text size="md" c="dimmed">
            Please enter your username to continue
          </Text>
          <TextInput
            label="Username"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
          <Button type="submit" disabled={!username.trim()}>
            Continue
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}