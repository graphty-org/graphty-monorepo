import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../test/test-utils";
import { AiMessageBubble, type ChatMessage } from "../AiMessageBubble";

describe("AiMessageBubble", () => {
    const createMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
        id: "msg-1",
        role: "user",
        content: "Hello",
        timestamp: Date.now(),
        ...overrides,
    });

    describe("user messages", () => {
        it("renders user message content", () => {
            const message = createMessage({ content: "Hello, AI!" });
            render(<AiMessageBubble message={message} />);

            expect(screen.getByText("Hello, AI!")).toBeInTheDocument();
        });

        it("renders user message in Paper component", () => {
            const message = createMessage({ role: "user" });
            render(<AiMessageBubble message={message} />);

            const paper = screen.getByText("Hello").closest(".mantine-Paper-root");
            expect(paper).toBeInTheDocument();
        });

        it("renders user messages", () => {
            const message = createMessage({ role: "user" });
            render(<AiMessageBubble message={message} />);

            // User messages should render
            expect(screen.getByText("Hello")).toBeInTheDocument();
        });
    });

    describe("assistant messages", () => {
        it("renders assistant message content", () => {
            const message = createMessage({ role: "assistant", content: "Hello! How can I help?" });
            render(<AiMessageBubble message={message} />);

            expect(screen.getByText("Hello! How can I help?")).toBeInTheDocument();
        });

        it("renders assistant message in Paper component", () => {
            const message = createMessage({ role: "assistant" });
            render(<AiMessageBubble message={message} />);

            const paper = screen.getByText("Hello").closest(".mantine-Paper-root");
            expect(paper).toBeInTheDocument();
        });

        it("renders assistant messages", () => {
            const message = createMessage({ role: "assistant" });
            render(<AiMessageBubble message={message} />);

            expect(screen.getByText("Hello")).toBeInTheDocument();
        });
    });

    describe("error messages", () => {
        it("renders error message content", () => {
            const message = createMessage({ role: "assistant", content: "Error occurred", isError: true });
            render(<AiMessageBubble message={message} />);

            expect(screen.getByText("Error occurred")).toBeInTheDocument();
        });

        it("renders error messages starting with Error:", () => {
            const message = createMessage({ role: "assistant", content: "Error: Something went wrong" });
            render(<AiMessageBubble message={message} />);

            expect(screen.getByText("Error: Something went wrong")).toBeInTheDocument();
        });

        it("shows retry button for error messages when onRetry provided", () => {
            const message = createMessage({ role: "assistant", isError: true, content: "Failed" });
            render(<AiMessageBubble message={message} onRetry={vi.fn()} />);

            expect(screen.getByRole("button")).toBeInTheDocument();
        });

        it("does not show retry button when onRetry not provided", () => {
            const message = createMessage({ role: "assistant", isError: true, content: "Failed" });
            render(<AiMessageBubble message={message} />);

            expect(screen.queryByRole("button")).not.toBeInTheDocument();
        });

        it("calls onRetry with message when retry button clicked", () => {
            const onRetry = vi.fn();
            const message = createMessage({ role: "assistant", isError: true, content: "Failed" });
            render(<AiMessageBubble message={message} onRetry={onRetry} />);

            const button = screen.getByRole("button");
            fireEvent.click(button);

            expect(onRetry).toHaveBeenCalledTimes(1);
            expect(onRetry).toHaveBeenCalledWith(message);
        });

        it("does not show retry button for user error messages", () => {
            const message = createMessage({ role: "user", isError: true, content: "My error" });
            render(<AiMessageBubble message={message} onRetry={vi.fn()} />);

            // User messages don't get retry button even with isError
            expect(screen.queryByRole("button")).not.toBeInTheDocument();
        });
    });

    describe("timestamp", () => {
        it("displays formatted timestamp", () => {
            const timestamp = new Date("2024-01-15T10:30:00").getTime();
            const message = createMessage({ timestamp });
            render(<AiMessageBubble message={message} />);

            // Check that time is displayed (format depends on locale)
            const timeElement = screen.getByText(/\d{1,2}:\d{2}/);
            expect(timeElement).toBeInTheDocument();
        });

        it("displays timestamp for user messages", () => {
            const message = createMessage({ role: "user" });
            render(<AiMessageBubble message={message} />);

            const timeElement = screen.getByText(/\d{1,2}:\d{2}/);
            expect(timeElement).toBeInTheDocument();
        });

        it("displays timestamp for assistant messages", () => {
            const message = createMessage({ role: "assistant" });
            render(<AiMessageBubble message={message} />);

            const timeElement = screen.getByText(/\d{1,2}:\d{2}/);
            expect(timeElement).toBeInTheDocument();
        });
    });

    describe("system messages", () => {
        it("renders system messages like assistant messages", () => {
            const message = createMessage({ role: "system", content: "System notification" });
            render(<AiMessageBubble message={message} />);

            expect(screen.getByText("System notification")).toBeInTheDocument();
        });
    });

    describe("max width constraint", () => {
        it("renders message content", () => {
            const message = createMessage();
            render(<AiMessageBubble message={message} />);

            expect(screen.getByText("Hello")).toBeInTheDocument();
        });
    });

    describe("sources", () => {
        it("lists each web source as a link that opens apart from the page, named by title or host", () => {
            render(
                <AiMessageBubble
                    message={createMessage({
                        role: "assistant",
                        content: "Paris",
                        sources: [
                            { url: "https://example.org/fr", title: "France" },
                            { url: "http://cities.example.com/list" },
                        ],
                    })}
                />,
            );

            const titled = screen.getByRole("link", { name: "France" });
            expect(titled).toHaveAttribute("href", "https://example.org/fr");
            expect(titled).toHaveAttribute("target", "_blank");
            expect(titled).toHaveAttribute("rel", "noopener noreferrer");
            expect(screen.getByRole("link", { name: "cities.example.com" })).toHaveAttribute(
                "href",
                "http://cities.example.com/list",
            );
        });

        it("draws an address that is not http or https as plain text, never a link", () => {
            render(
                <AiMessageBubble
                    message={createMessage({
                        role: "assistant",
                        content: "Paris",
                        sources: [{ url: "javascript:alert(1)" }, { url: "data:text/html,hi", title: "Data" }],
                    })}
                />,
            );

            expect(screen.queryAllByRole("link")).toHaveLength(0);
            expect(screen.getByText("javascript:alert(1)")).toBeInTheDocument();
            expect(screen.getByText("Data")).toBeInTheDocument();
        });

        it("draws no list for a message without sources", () => {
            render(<AiMessageBubble message={createMessage({ role: "assistant" })} />);

            expect(screen.queryByTestId("ai-message-sources")).not.toBeInTheDocument();
        });
    });
});
