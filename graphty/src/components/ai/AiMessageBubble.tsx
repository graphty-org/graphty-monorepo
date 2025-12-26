import {ActionIcon, Box, Group, Paper, Text, Tooltip} from "@mantine/core";
import {AlertCircle, RefreshCw} from "lucide-react";
import React from "react";

import type {AiStatus} from "../../types/ai";

/** Chat message structure */
export interface ChatMessage {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
    status?: AiStatus;
    isError?: boolean;
}

interface AiMessageBubbleProps {
    /** The message to display */
    message: ChatMessage;
    /** Callback to retry a failed message */
    onRetry?: (message: ChatMessage) => void;
}

/**
 * A single message bubble in the AI chat dialog.
 * Displays user messages on the right, assistant messages on the left.
 * Error messages show a retry button.
 */
/** Get background color based on message role and error state */
function getBackgroundColor(isUser: boolean, isError: boolean): string {
    if (isUser) {
        return "var(--mantine-color-violet-light)";
    }

    if (isError) {
        return "var(--mantine-color-red-light)";
    }

    return "var(--mantine-color-default)";
}

export function AiMessageBubble({message, onRetry}: AiMessageBubbleProps): React.JSX.Element {
    const isUser = message.role === "user";
    const isError = message.isError ?? message.content.startsWith("Error:");

    return (
        <Box
            style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "85%",
            }}
        >
            <Paper
                p="xs"
                radius="md"
                style={{
                    backgroundColor: getBackgroundColor(isUser, isError),
                }}
            >
                {isError && !isUser ? (
                    <Group gap="xs" wrap="nowrap">
                        <AlertCircle size={16} color="var(--mantine-color-red-6)" />
                        <Text size="sm" style={{flex: 1}}>{message.content}</Text>
                        {onRetry && (
                            <Tooltip label="Retry">
                                <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    size="sm"
                                    onClick={() => {
                                        onRetry(message);
                                    }}
                                >
                                    <RefreshCw size={14} />
                                </ActionIcon>
                            </Tooltip>
                        )}
                    </Group>
                ) : (
                    <Text size="sm">{message.content}</Text>
                )}
            </Paper>
            <Text size="xs" c="dimmed" mt={2} ta={isUser ? "right" : "left"}>
                {new Date(message.timestamp).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})}
            </Text>
        </Box>
    );
}
