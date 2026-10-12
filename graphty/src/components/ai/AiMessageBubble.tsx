import { ActionIcon, Anchor, Box, Group, Paper, Text, Tooltip } from "@mantine/core";
import { AlertCircle, RefreshCw } from "lucide-react";
import React from "react";

/** Chat message structure */
export interface ChatMessage {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    /** When it was sent; the time is drawn only when known. */
    timestamp?: number;
    isError?: boolean;
    /** The helper that said it, when a helper did; drawn as a label above the message. */
    agent?: string;
    /** Whether the reader said it rather than typed it; drawn as a label above the message. */
    spoken?: boolean;
    /** The web pages the answer drew on, drawn as links under it. */
    sources?: readonly { readonly url: string; readonly title?: string }[];
}

/**
 * A source's address, when it is one a link may open: http or https only.
 * @param url - The address the provider reported.
 * @returns The parsed address, or undefined for anything else (a `javascript:` URL, garbage).
 */
function webAddress(url: string): URL | undefined {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed : undefined;
    } catch {
        return undefined;
    }
}

/**
 * The sources under an answer: a link per web address, plain text for anything else.
 * @param props - The sources.
 * @param props.sources - The sources, in order.
 * @returns The list.
 */
function SourceList({ sources }: { readonly sources: NonNullable<ChatMessage["sources"]> }): React.JSX.Element {
    return (
        <Box component="ul" aria-label="Sources" data-testid="ai-message-sources" m={0} mt={2} pl="md">
            {sources.map((source, index) => {
                const address = webAddress(source.url);
                return (
                    <Text component="li" key={index} size="xs" c="dimmed" style={{ overflowWrap: "anywhere" }}>
                        {address === undefined ? (
                            (source.title ?? source.url)
                        ) : (
                            <Anchor href={address.href} target="_blank" rel="noopener noreferrer" size="xs">
                                {source.title ?? address.host}
                            </Anchor>
                        )}
                    </Text>
                );
            })}
        </Box>
    );
}

interface AiMessageBubbleProps {
    /** The message to display */
    message: ChatMessage;
    /** Callback to retry a failed message */
    onRetry?: (message: ChatMessage) => void;
}

/**
 * Get background color based on message role and error state.
 * @param isUser - Whether this is a user message
 * @param isError - Whether this is an error message
 * @returns The CSS color value for the background
 */
function getBackgroundColor(isUser: boolean, isError: boolean): string {
    if (isUser) {
        return "var(--mantine-color-violet-light)";
    }

    if (isError) {
        return "var(--mantine-color-red-light)";
    }

    return "var(--mantine-color-default)";
}

/**
 * A single message bubble in the AI chat dialog.
 * Displays user messages on the right, assistant messages on the left.
 * Error messages show a retry button.
 * @param root0 - Component props
 * @param root0.message - The message to display
 * @param root0.onRetry - Callback to retry a failed message
 * @returns The message bubble component
 */
export function AiMessageBubble({ message, onRetry }: AiMessageBubbleProps): React.JSX.Element {
    const isUser = message.role === "user";
    const isError = message.isError ?? message.content.startsWith("Error:");

    return (
        <Box
            style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "85%",
            }}
        >
            {message.spoken === true && (
                <Text size="xs" c="dimmed" mb={2} ta="right" data-testid="ai-message-spoken">
                    Spoken
                </Text>
            )}
            {message.agent !== undefined && (
                <Text size="xs" c="dimmed" mb={2} data-testid="ai-message-agent">
                    {`Helper: ${message.agent}`}
                </Text>
            )}
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
                        <Text size="sm" style={{ flex: 1 }}>
                            {message.content}
                        </Text>
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
                    <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                        {message.content}
                    </Text>
                )}
            </Paper>
            {message.sources !== undefined && message.sources.length > 0 && <SourceList sources={message.sources} />}
            {message.timestamp !== undefined && (
                <Text size="xs" c="dimmed" mt={2} ta={isUser ? "right" : "left"}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
            )}
        </Box>
    );
}
