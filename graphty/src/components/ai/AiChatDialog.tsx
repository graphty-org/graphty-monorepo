import {
    ActionIcon,
    Box,
    Button,
    Group,
    Loader,
    Paper,
    ScrollArea,
    Select,
    Stack,
    Text,
    Textarea,
    Title,
} from "@mantine/core";
import {GripVertical, Minimize2, Send, Settings, Sparkles, Square, X} from "lucide-react";
import React, {useCallback, useEffect, useRef, useState} from "react";

import type {ExecutionResult} from "../../hooks/useAiManager";
import type {AiStatus, ProviderType} from "../../types/ai";

/** Chat message structure */
interface ChatMessage {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
    status?: AiStatus;
}

/** Available provider option */
interface ProviderOption {
    value: ProviderType;
    label: string;
}

interface AiChatDialogProps {
    /** Whether the dialog is open */
    opened: boolean;
    /** Close the dialog */
    onClose: () => void;
    /** Open settings modal */
    onOpenSettings: () => void;
    /** Current AI status */
    status: AiStatus | null;
    /** Whether AI is processing */
    isProcessing: boolean;
    /** Execute a command */
    onExecute: (input: string) => Promise<ExecutionResult>;
    /** Cancel current execution */
    onCancel: () => void;
    /** Available providers */
    availableProviders: ProviderOption[];
    /** Current provider */
    currentProvider: ProviderType | null;
    /** Set the current provider */
    onProviderChange: (provider: ProviderType) => void;
}

/** Suggested quick actions */
const QUICK_ACTIONS = [
    {label: "Style nodes", prompt: "Make all nodes blue"},
    {label: "Run layout", prompt: "Apply force-directed layout"},
    {label: "Find nodes", prompt: "Find nodes with degree > 3"},
];

/** Dialog dimensions */
const DIALOG_WIDTH = 400;
const DIALOG_HEIGHT = 500;
const DIALOG_MIN_HEIGHT = 300;

export function AiChatDialog({
    opened,
    onClose,
    onOpenSettings,
    status,
    isProcessing,
    onExecute,
    onCancel,
    availableProviders,
    currentProvider,
    onProviderChange,
}: AiChatDialogProps): React.JSX.Element | null {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [position, setPosition] = useState({x: 0, y: 0});
    const [isMinimized, setIsMinimized] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({x: 0, y: 0});

    const dialogRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Initialize position to bottom-right
    useEffect(() => {
        if (opened && position.x === 0 && position.y === 0) {
            const savedPosition = localStorage.getItem("ai-dialog-position");
            if (savedPosition) {
                try {
                    const parsed = JSON.parse(savedPosition) as {x: number, y: number};
                    setPosition(parsed);
                } catch {
                    // Use default
                    setPosition({
                        x: window.innerWidth - DIALOG_WIDTH - 20,
                        y: window.innerHeight - DIALOG_HEIGHT - 20,
                    });
                }
            } else {
                setPosition({
                    x: window.innerWidth - DIALOG_WIDTH - 20,
                    y: window.innerHeight - DIALOG_HEIGHT - 20,
                });
            }
        }
    }, [opened, position.x, position.y]);

    // Save position to localStorage
    useEffect(() => {
        if (position.x !== 0 || position.y !== 0) {
            localStorage.setItem("ai-dialog-position", JSON.stringify(position));
        }
    }, [position]);

    // Focus input when opened
    useEffect(() => {
        if (opened && !isMinimized) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [opened, isMinimized]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [messages, status]);

    // Handle drag start
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest("[data-no-drag]")) {
            return;
        }

        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        });
    }, [position]);

    // Handle drag move
    useEffect(() => {
        if (!isDragging) {
            return undefined;
        }

        const handleMouseMove = (e: MouseEvent): void => {
            const newX = Math.max(0, Math.min(window.innerWidth - DIALOG_WIDTH, e.clientX - dragOffset.x));
            const newY = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.y));
            setPosition({x: newX, y: newY});
        };

        const handleMouseUp = (): void => {
            setIsDragging(false);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    const handleSubmit = useCallback(async() => {
        const trimmedInput = inputValue.trim();
        if (!trimmedInput || isProcessing) {
            return;
        }

        // Add user message
        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: trimmedInput,
            timestamp: Date.now(),
        };
        setMessages((prev) => [... prev, userMessage]);
        setInputValue("");

        // Execute the command
        const result = await onExecute(trimmedInput);

        // Add assistant message
        // Priority: message (tool result) > text/llmText (LLM response) > fallback
        const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: result.success ?
                result.message ?? result.text ?? result.llmText ?? "Command executed successfully." :
                `Error: ${result.error?.message ?? result.message ?? "Unknown error"}`,
            timestamp: Date.now(),
        };
        setMessages((prev) => [... prev, assistantMessage]);
    }, [inputValue, isProcessing, onExecute]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSubmit();
        } else if (e.key === "Escape") {
            if (isProcessing) {
                onCancel();
            } else {
                onClose();
            }
        }
    }, [handleSubmit, isProcessing, onCancel, onClose]);

    const handleQuickAction = useCallback((prompt: string) => {
        setInputValue(prompt);
        inputRef.current?.focus();
    }, []);

    if (!opened) {
        return null;
    }

    // Render minimized state
    if (isMinimized) {
        return (
            <Paper
                ref={dialogRef}
                shadow="md"
                radius="md"
                style={{
                    position: "fixed",
                    left: position.x,
                    top: position.y,
                    width: 200,
                    cursor: isDragging ? "grabbing" : "grab",
                    zIndex: 1000,
                    userSelect: "none",
                }}
                onMouseDown={handleDragStart}
            >
                <Group p="xs" gap="xs" justify="space-between">
                    <Group gap="xs">
                        <GripVertical size={14} color="var(--mantine-color-dimmed)" />
                        <Sparkles size={16} color="var(--mantine-color-violet-6)" />
                        <Text size="sm" fw={500}>AI Assistant</Text>
                    </Group>
                    <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={() => {
                            setIsMinimized(false);
                        }}
                        data-no-drag
                    >
                        <Minimize2 size={14} />
                    </ActionIcon>
                </Group>
            </Paper>
        );
    }

    return (
        <Paper
            ref={dialogRef}
            shadow="lg"
            radius="md"
            style={{
                position: "fixed",
                left: position.x,
                top: position.y,
                width: DIALOG_WIDTH,
                minHeight: DIALOG_MIN_HEIGHT,
                maxHeight: DIALOG_HEIGHT,
                display: "flex",
                flexDirection: "column",
                zIndex: 1000,
                overflow: "hidden",
            }}
        >
            {/* Header - Draggable */}
            <Box
                style={{
                    cursor: isDragging ? "grabbing" : "grab",
                    borderBottom: "1px solid var(--mantine-color-default-border)",
                    userSelect: "none",
                }}
                onMouseDown={handleDragStart}
            >
                <Group p="sm" justify="space-between">
                    <Group gap="xs">
                        <GripVertical size={16} color="var(--mantine-color-dimmed)" />
                        <Sparkles size={18} color="var(--mantine-color-violet-6)" />
                        <Title order={5}>AI Assistant</Title>
                    </Group>
                    <Group gap={4} data-no-drag>
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            color="gray"
                            onClick={onOpenSettings}
                            aria-label="AI Settings"
                        >
                            <Settings size={14} />
                        </ActionIcon>
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            color="gray"
                            onClick={() => {
                                setIsMinimized(true);
                            }}
                            aria-label="Minimize"
                        >
                            <Minimize2 size={14} />
                        </ActionIcon>
                        <ActionIcon
                            variant="subtle"
                            size="sm"
                            color="gray"
                            onClick={onClose}
                            aria-label="Close"
                        >
                            <X size={14} />
                        </ActionIcon>
                    </Group>
                </Group>
            </Box>

            {/* Messages */}
            <ScrollArea
                style={{flex: 1, minHeight: 150}}
                viewportRef={scrollAreaRef}
            >
                <Stack gap="sm" p="sm">
                    {messages.length === 0 && (
                        <Box ta="center" py="lg">
                            <Sparkles size={32} color="var(--mantine-color-dimmed)" />
                            <Text size="sm" c="dimmed" mt="sm">
                                Ask me to style, layout, or analyze your graph
                            </Text>
                        </Box>
                    )}

                    {messages.map((message) => (
                        <Box
                            key={message.id}
                            style={{
                                alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                                maxWidth: "85%",
                            }}
                        >
                            <Paper
                                p="xs"
                                radius="md"
                                style={{
                                    backgroundColor: message.role === "user" ?
                                        "var(--mantine-color-violet-light)" :
                                        "var(--mantine-color-default)",
                                }}
                            >
                                <Text size="sm">{message.content}</Text>
                            </Paper>
                        </Box>
                    ))}

                    {/* Processing indicator */}
                    {isProcessing && status && (
                        <Box style={{alignSelf: "flex-start", maxWidth: "85%"}}>
                            <Paper p="xs" radius="md" style={{backgroundColor: "var(--mantine-color-default)"}}>
                                <Group gap="xs">
                                    <Loader size="xs" />
                                    <Text size="sm" c="dimmed">
                                        {status.stage === "processing" && "Processing..."}
                                        {status.stage === "executingTool" && `Executing: ${status.toolCalls?.[0]?.name ?? "tool"}`}
                                        {status.stage === "streaming" && (status.streamedText ?? "Generating response...")}
                                    </Text>
                                </Group>
                            </Paper>
                        </Box>
                    )}
                </Stack>
            </ScrollArea>

            {/* Provider selector (if multiple) */}
            {availableProviders.length > 1 && (
                <Box px="sm" py="xs" style={{borderTop: "1px solid var(--mantine-color-default-border)"}}>
                    <Select
                        size="xs"
                        data={availableProviders}
                        value={currentProvider}
                        onChange={(v) => {
                            if (v) {
                                onProviderChange(v as ProviderType);
                            }
                        }}
                        leftSection={<Sparkles size={12} />}
                        styles={{input: {fontSize: "12px"}}}
                    />
                </Box>
            )}

            {/* Input area */}
            <Box p="sm" style={{borderTop: "1px solid var(--mantine-color-default-border)"}}>
                <Group gap="xs" align="flex-end">
                    <Textarea
                        ref={inputRef}
                        placeholder="Ask me to style or analyze your graph..."
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.currentTarget.value);
                        }}
                        onKeyDown={handleKeyDown}
                        autosize
                        minRows={1}
                        maxRows={4}
                        style={{flex: 1}}
                        styles={{
                            input: {
                                overflowY: "auto",
                            },
                        }}
                        disabled={isProcessing}
                    />
                    {isProcessing ? (
                        <ActionIcon
                            variant="light"
                            color="red"
                            size="lg"
                            onClick={onCancel}
                            aria-label="Cancel"
                        >
                            <Square size={16} />
                        </ActionIcon>
                    ) : (
                        <ActionIcon
                            variant="filled"
                            color="violet"
                            size="lg"
                            onClick={() => void handleSubmit()}
                            disabled={!inputValue.trim()}
                            aria-label="Send"
                        >
                            <Send size={16} />
                        </ActionIcon>
                    )}
                </Group>

                {/* Quick actions */}
                {messages.length === 0 && !isProcessing && (
                    <Group gap="xs" mt="sm">
                        {QUICK_ACTIONS.map((action) => (
                            <Button
                                key={action.label}
                                variant="light"
                                size="xs"
                                onClick={() => {
                                    handleQuickAction(action.prompt);
                                }}
                            >
                                {action.label}
                            </Button>
                        ))}
                    </Group>
                )}
            </Box>
        </Paper>
    );
}
