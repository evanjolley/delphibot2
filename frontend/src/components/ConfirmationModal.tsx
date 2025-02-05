import { Modal, Button, Group, Text, Stack } from '@mantine/core';
import React from 'react';

interface ConfirmationModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export function ConfirmationModal({ opened, onClose, onConfirm, title, message }: ConfirmationModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      centered
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
        },
        inner: {
          padding: '20px'
        }
      }}
    >
      <Text size="md" c="dimmed" style={{ lineHeight: 1.6, marginBottom: '2rem' }}>
        {message}
      </Text>
      
      <Group justify="flex-end" gap="md" style={{ padding: '0 0.5rem' }}>
        <Button 
          variant="light" 
          onClick={onClose}
          size="md"
          style={{ minWidth: 120 }}
        >
          Cancel
        </Button>
        <Button 
          color="red" 
          onClick={onConfirm}
          size="md"
          style={{ minWidth: 120 }}
        >
          Confirm
        </Button>
      </Group>
    </Modal>
  );
}