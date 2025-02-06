import { Textarea, Button, Stack } from '@mantine/core';
import { useState } from 'react';
import { TweetInput } from '../types';
import React from 'react';

interface TweetFormProps {
  onSubmit: (input: TweetInput) => Promise<void>;
  disabled: boolean;
  parentId?: string;
  text: string;
  setText: (text: string) => void;
}

export default function TweetForm({ onSubmit, disabled, parentId, text, setText }: TweetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        text,
        author: '',
        parent_id: parentId
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <Textarea
          placeholder="What's happening?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isSubmitting || disabled}
          required
        />
        <Button 
          type="submit" 
          loading={isSubmitting}
          disabled={isSubmitting || disabled || !text}
        >
          {parentId ? 'Reply' : 'Tweet'}
        </Button>
      </Stack>
    </form>
  );
}