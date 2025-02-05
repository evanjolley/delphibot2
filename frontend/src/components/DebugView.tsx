import { Paper, Stack, Title, Text, Code } from '@mantine/core';
import React from 'react';

interface DebugViewProps {
    currentStep: string;
    prompt?: string;
    response?: string;
    error?: string;
  }
  
export function DebugView({ currentStep, prompt, response, error }: DebugViewProps) {
    return (
      <Paper shadow="sm" p="md" withBorder>
        <Stack>
          <Title order={3}>Behind the Scenes</Title>
          
          <Text weight={500}>Current Step: {currentStep}</Text>
          
          {prompt && (
            <>
              <Text weight={500}>System Processing:</Text>
              <Code block>{prompt}</Code>
            </>
          )}
          
          {response && (
            <>
              <Text weight={500}>Results:</Text>
              <Code block>{response}</Code>
            </>
          )}
          
          {error && (
            <>
              <Text weight={500} color="red">Error:</Text>
              <Code block color="red">{error}</Code>
            </>
          )}
        </Stack>
      </Paper>
    );
  }