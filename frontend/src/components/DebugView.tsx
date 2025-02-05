import { Paper, Stack, Title, Text, Code, Divider } from '@mantine/core';
import React from 'react';

interface DebugViewProps {
    botActive: boolean;
    currentStep: string;
    analysis_prompt: string;
    analysis_response: string;
    final_prompt: string;
    final_response: string;
    error: string;
}
  
export function DebugView({ 
    botActive,
    currentStep, 
    analysis_prompt,
    analysis_response,
    final_prompt,
    final_response,
    error 
}: DebugViewProps) {
    if (!botActive) {
        return (
            <Paper shadow="sm" p="md" withBorder>
                <Stack spacing="md">
                    <Title order={3}>Behind the Scenes</Title>
                    <Text size="lg" color="dimmed">
                        Bot is currently inactive. Turn on the bot to see debug information.
                    </Text>
                </Stack>
            </Paper>
        );
    }

    const getStepDisplay = (step: string) => {
        switch(step) {
            case 'monitoring':
                return '👀 Bot active, monitoring for new tweets...';
            case 'started':
                return '🤔 Processing tweet...';
            case 'completed':
                return '✅ Response posted successfully';
            case 'error':
                return '❌ Error occurred';
            default:
                return step;
        }
    };

    return (
        <Paper shadow="sm" p="md" withBorder>
            <Stack spacing="md">
                <Title order={3}>Behind the Scenes</Title>
                
                <Text weight={500} size="lg" color={currentStep === 'error' ? 'red' : undefined}>
                    Status: {getStepDisplay(currentStep)}
                </Text>
                
                {analysis_prompt && analysis_response && (
                    <>
                        <Divider label="Step 1: Analysis Phase" labelPosition="center" />
                        <Text weight={500}>Analysis Prompt:</Text>
                        <Code block>{analysis_prompt}</Code>
                        <Text weight={500}>Perceived Intent:</Text>
                        <Code block>{analysis_response}</Code>
                    </>
                )}
                
                {final_prompt && final_response && (
                    <>
                        <Divider label="Step 2: Response Generation" labelPosition="center" />
                        <Text weight={500}>Response Prompt:</Text>
                        <Code block>{final_prompt}</Code>
                        <Text weight={500}>Final Response:</Text>
                        <Code block>{final_response}</Code>
                    </>
                )}
                
                {error && (
                    <>
                        <Divider label="Error" labelPosition="center" color="red" />
                        <Text weight={500} color="red">Error:</Text>
                        <Code block color="red">{error}</Code>
                    </>
                )}
            </Stack>
        </Paper>
    );
}