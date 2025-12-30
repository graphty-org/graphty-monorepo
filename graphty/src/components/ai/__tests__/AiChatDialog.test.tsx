import {beforeEach, describe, expect, it, vi} from "vitest";

import {fireEvent, render, screen, waitFor} from "../../../test/test-utils";
import {AiChatDialog} from "../AiChatDialog";

// Mock localStorage
const createLocalStorageMock = (): Storage & {clear: () => void} => {
    let store = new Map<string, string>();
    return {
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            store.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
            store.delete(key);
        }),
        clear: vi.fn(() => {
            store = new Map();
        }),
        get length() {
            return store.size;
        },
        key: vi.fn((index: number) => {
            const keys = Array.from(store.keys());

            return keys[index] ?? null;
        }),
    };
};

const localStorageMock = createLocalStorageMock();
Object.defineProperty(window, "localStorage", {value: localStorageMock});

describe("AiChatDialog", () => {
    const defaultProps = {
        opened: true,
        onClose: vi.fn(),
        onOpenSettings: vi.fn(),
        status: null,
        isProcessing: false,
        onExecute: vi.fn().mockResolvedValue({success: true, message: "Done"}),
        onCancel: vi.fn(),
        availableProviders: [{value: "openai" as const, label: "OpenAI"}],
        currentProvider: "openai" as const,
        onProviderChange: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
    });

    describe("rendering", () => {
        it("renders dialog when opened", () => {
            render(<AiChatDialog {...defaultProps} />);

            expect(screen.getByText("AI Assistant")).toBeInTheDocument();
        });

        it("does not render when closed", () => {
            render(<AiChatDialog {...defaultProps} opened={false} />);

            expect(screen.queryByText("AI Assistant")).not.toBeInTheDocument();
        });

        it("shows empty state message when no messages", () => {
            render(<AiChatDialog {...defaultProps} />);

            expect(screen.getByText(/ask me to style, layout, or analyze/i)).toBeInTheDocument();
        });

        it("shows quick action buttons", () => {
            render(<AiChatDialog {...defaultProps} />);

            expect(screen.getByRole("button", {name: /style nodes/i})).toBeInTheDocument();
            expect(screen.getByRole("button", {name: /run layout/i})).toBeInTheDocument();
            expect(screen.getByRole("button", {name: /find nodes/i})).toBeInTheDocument();
        });

        it("shows input textarea", () => {
            render(<AiChatDialog {...defaultProps} />);

            expect(screen.getByPlaceholderText(/ask me to style or analyze/i)).toBeInTheDocument();
        });
    });

    describe("header controls", () => {
        it("shows settings button", () => {
            render(<AiChatDialog {...defaultProps} />);

            expect(screen.getByRole("button", {name: /ai settings/i})).toBeInTheDocument();
        });

        it("shows minimize button", () => {
            render(<AiChatDialog {...defaultProps} />);

            expect(screen.getByRole("button", {name: /minimize/i})).toBeInTheDocument();
        });

        it("shows close button", () => {
            render(<AiChatDialog {...defaultProps} />);

            expect(screen.getByRole("button", {name: /close/i})).toBeInTheDocument();
        });

        it("calls onOpenSettings when settings button clicked", () => {
            const onOpenSettings = vi.fn();
            render(<AiChatDialog {...defaultProps} onOpenSettings={onOpenSettings} />);

            fireEvent.click(screen.getByRole("button", {name: /ai settings/i}));

            expect(onOpenSettings).toHaveBeenCalledTimes(1);
        });

        it("calls onClose when close button clicked", () => {
            const onClose = vi.fn();
            render(<AiChatDialog {...defaultProps} onClose={onClose} />);

            fireEvent.click(screen.getByRole("button", {name: /close/i}));

            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe("message submission", () => {
        it("sends message when submit button clicked", async() => {
            const onExecute = vi.fn().mockResolvedValue({success: true, message: "Done"});
            render(<AiChatDialog {...defaultProps} onExecute={onExecute} />);

            const input = screen.getByPlaceholderText(/ask me to style or analyze/i);
            fireEvent.change(input, {target: {value: "Make nodes blue"}});

            const sendButton = screen.getByRole("button", {name: /send/i});
            fireEvent.click(sendButton);

            await waitFor(() => {
                expect(onExecute).toHaveBeenCalledWith("Make nodes blue");
            });
        });

        it("sends message when Enter is pressed", async() => {
            const onExecute = vi.fn().mockResolvedValue({success: true, message: "Done"});
            render(<AiChatDialog {...defaultProps} onExecute={onExecute} />);

            const input = screen.getByPlaceholderText(/ask me to style or analyze/i);
            fireEvent.change(input, {target: {value: "Make nodes blue"}});
            fireEvent.keyDown(input, {key: "Enter"});

            await waitFor(() => {
                expect(onExecute).toHaveBeenCalledWith("Make nodes blue");
            });
        });

        it("does not send message when Shift+Enter is pressed", async() => {
            const onExecute = vi.fn().mockResolvedValue({success: true, message: "Done"});
            render(<AiChatDialog {...defaultProps} onExecute={onExecute} />);

            const input = screen.getByPlaceholderText(/ask me to style or analyze/i);
            fireEvent.change(input, {target: {value: "Make nodes blue"}});
            fireEvent.keyDown(input, {key: "Enter", shiftKey: true});

            // Wait a bit to ensure no call was made
            await new Promise((resolve) => setTimeout(resolve, 100));
            expect(onExecute).not.toHaveBeenCalled();
        });

        it("displays user message after submission", async() => {
            const onExecute = vi.fn().mockResolvedValue({success: true, message: "Done"});
            render(<AiChatDialog {...defaultProps} onExecute={onExecute} />);

            const input = screen.getByPlaceholderText(/ask me to style or analyze/i);
            fireEvent.change(input, {target: {value: "Make nodes blue"}});
            fireEvent.click(screen.getByRole("button", {name: /send/i}));

            await waitFor(() => {
                expect(screen.getByText("Make nodes blue")).toBeInTheDocument();
            });
        });

        it("displays assistant response after execution", async() => {
            const onExecute = vi.fn().mockResolvedValue({success: true, message: "Nodes styled successfully"});
            render(<AiChatDialog {...defaultProps} onExecute={onExecute} />);

            const input = screen.getByPlaceholderText(/ask me to style or analyze/i);
            fireEvent.change(input, {target: {value: "Make nodes blue"}});
            fireEvent.click(screen.getByRole("button", {name: /send/i}));

            await waitFor(() => {
                expect(screen.getByText("Nodes styled successfully")).toBeInTheDocument();
            });
        });

        it("clears input after submission", async() => {
            const onExecute = vi.fn().mockResolvedValue({success: true, message: "Done"});
            render(<AiChatDialog {...defaultProps} onExecute={onExecute} />);

            const input = screen.getByPlaceholderText(/ask me to style or analyze/i);
            fireEvent.change(input, {target: {value: "Make nodes blue"}});
            fireEvent.click(screen.getByRole("button", {name: /send/i}));

            await waitFor(() => {
                expect(input).toHaveValue("");
            });
        });
    });

    describe("quick actions", () => {
        it("populates input when quick action clicked", () => {
            render(<AiChatDialog {...defaultProps} />);

            fireEvent.click(screen.getByRole("button", {name: /style nodes/i}));

            const input = screen.getByPlaceholderText(/ask me to style or analyze/i);
            expect(input).toHaveValue("Make all nodes blue");
        });
    });

    describe("processing state", () => {
        it("disables input while processing", () => {
            render(<AiChatDialog {...defaultProps} isProcessing={true} />);

            const input = screen.getByPlaceholderText(/ask me to style or analyze/i);
            expect(input).toBeDisabled();
        });

        it("shows cancel button while processing", () => {
            render(<AiChatDialog {...defaultProps} isProcessing={true} />);

            expect(screen.getByRole("button", {name: /cancel/i})).toBeInTheDocument();
        });

        it("calls onCancel when cancel button clicked", () => {
            const onCancel = vi.fn();
            render(<AiChatDialog {...defaultProps} isProcessing={true} onCancel={onCancel} />);

            fireEvent.click(screen.getByRole("button", {name: /cancel/i}));

            expect(onCancel).toHaveBeenCalledTimes(1);
        });
    });

    describe("provider selector", () => {
        it("shows provider selector when multiple providers available", () => {
            const props = {
                ... defaultProps,
                availableProviders: [
                    {value: "openai" as const, label: "OpenAI"},
                    {value: "anthropic" as const, label: "Anthropic"},
                ],
            };
            render(<AiChatDialog {...props} />);

            // There should be two textboxes: the provider selector and the chat input
            const textboxes = screen.getAllByRole("textbox");
            expect(textboxes.length).toBeGreaterThanOrEqual(2);
        });

        it("does not show provider selector when only one provider", () => {
            render(<AiChatDialog {...defaultProps} />);

            // Should only have the chat input textbox, not a provider selector
            const textboxes = screen.getAllByRole("textbox");
            expect(textboxes).toHaveLength(1);
        });
    });

    describe("minimize functionality", () => {
        it("minimizes dialog when minimize button clicked", async() => {
            render(<AiChatDialog {...defaultProps} />);

            const minimizeButton = screen.getByRole("button", {name: /minimize/i});
            fireEvent.click(minimizeButton);

            await waitFor(() => {
                // The main dialog title should still be visible but in minimized form
                expect(screen.getByText("AI Assistant")).toBeInTheDocument();
                // But the input should not be visible
                expect(screen.queryByPlaceholderText(/ask me to style or analyze/i)).not.toBeInTheDocument();
            });
        });
    });

    describe("keyboard shortcuts", () => {
        it("closes dialog on Escape when not processing", () => {
            const onClose = vi.fn();
            render(<AiChatDialog {...defaultProps} onClose={onClose} />);

            const input = screen.getByPlaceholderText(/ask me to style or analyze/i);
            fireEvent.keyDown(input, {key: "Escape"});

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it("cancels execution on Escape when processing", () => {
            const onCancel = vi.fn();
            const onClose = vi.fn();
            render(<AiChatDialog {...defaultProps} isProcessing={true} onCancel={onCancel} onClose={onClose} />);

            const input = screen.getByPlaceholderText(/ask me to style or analyze/i);
            fireEvent.keyDown(input, {key: "Escape"});

            expect(onCancel).toHaveBeenCalledTimes(1);
            expect(onClose).not.toHaveBeenCalled();
        });
    });
});
