import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type {
    AiApprovalRequest,
    AiConversationSnapshot,
    AiQuestionRequest,
    AiStatus,
} from "@graphty/graphty-element/ai";
import type { AiCapabilities } from "@graphty/graphty-element/catalog";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The element's assistant doors, as a stand-in element exposes them, on a real EventTarget so the
// hook's listeners hear the events the test sends.
const mockStatusCallback = vi.fn();
const events = new EventTarget();
const mockDoors = {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    getAiConversation: vi.fn((): AiConversationSnapshot | null => null),
    getPendingAiApprovals: vi.fn((): readonly AiApprovalRequest[] => []),
    getPendingAiQuestions: vi.fn((): readonly AiQuestionRequest[] => []),
    answerAiQuestion: vi.fn().mockResolvedValue({ success: true, message: "", code: "AI_COMPLETED", params: {} }),
    resolveAiApproval: vi.fn().mockResolvedValue({ success: true, message: "", code: "AI_COMPLETED", params: {} }),
    newAiConversation: vi.fn().mockResolvedValue(null),
    clearAiHistory: vi.fn().mockResolvedValue(undefined),
    enableAiControl: vi.fn().mockResolvedValue(undefined),
    getAiCapabilities: vi.fn((): AiCapabilities | null => null),
    disableAiControl: vi.fn(),
    onAiStatusChange: vi.fn((callback: (status: AiStatus) => void) => {
        mockStatusCallback.mockImplementation(callback);
        return vi.fn(); // unsubscribe function
    }),
    aiCommand: vi.fn().mockResolvedValue({ success: true, message: "Done" }),
    cancelAiCommand: vi.fn(),
};
const mockElement = mockDoors as unknown as GraphtyElement;

describe("useAiManager", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockDoors.getAiConversation.mockReturnValue(null);
        mockDoors.getPendingAiApprovals.mockReturnValue([]);
        mockDoors.getPendingAiQuestions.mockReturnValue([]);
        mockDoors.getAiCapabilities.mockReturnValue(null);
        localStorage.removeItem("graphty.ai.webSearch.v1");
        localStorage.removeItem("graphty.ai.webFetch.v1");
        localStorage.removeItem("graphty.ai.inPageCode.v1");
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("initializes with default state", async () => {
        const { useAiManager } = await import("../useAiManager");
        const { result } = renderHook(() => useAiManager({}));

        expect(result.current.isReady).toBe(false);
        expect(result.current.isProcessing).toBe(false);
        expect(result.current.status).toBeNull();
        expect(result.current.currentProvider).toBeNull();
        expect(result.current.error).toBeNull();
    });

    it("uses defaultProvider when provided", async () => {
        const { useAiManager } = await import("../useAiManager");
        const { result } = renderHook(() => useAiManager({ defaultProvider: "openai" }));

        expect(result.current.currentProvider).toBe("openai");
    });

    it("stays not ready when no element is provided", async () => {
        const { useAiManager } = await import("../useAiManager");
        const { result } = renderHook(() => useAiManager({ defaultProvider: "openai" }));

        // Without an element the hook has nothing to enable: its only way to become ready is the
        // element's enableAiControl, so there is no later async step to wait for.
        expect(result.current.isReady).toBe(false);
        expect(mockDoors.enableAiControl).not.toHaveBeenCalled();
    });

    it("enables the element's assistant when an element is provided", async () => {
        const { useAiManager } = await import("../useAiManager");

        const { result } = renderHook(() =>
            useAiManager({
                element: mockElement,
                defaultProvider: "openai",
            }),
        );

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        expect(mockDoors.enableAiControl).toHaveBeenCalledWith({
            provider: "openai",
            apiKey: undefined,
            history: "browser",
            questions: true,
            approvals: { policy: expect.any(Function) },
        });
    });

    it("passes the API key to the element", async () => {
        const { useAiManager } = await import("../useAiManager");
        const getKey = vi.fn().mockReturnValue("test-api-key");

        renderHook(() =>
            useAiManager({
                element: mockElement,
                defaultProvider: "anthropic",
                getKey,
            }),
        );

        await waitFor(() => {
            expect(mockDoors.enableAiControl).toHaveBeenCalledWith({
                provider: "anthropic",
                apiKey: "test-api-key",
                history: "browser",
                questions: true,
                approvals: { policy: expect.any(Function) },
            });
        });

        expect(getKey).toHaveBeenCalledWith("anthropic");
    });

    describe("the in-browser provider", () => {
        it("hands it to the element with no key", async () => {
            const { useAiManager } = await import("../useAiManager");

            renderHook(() => useAiManager({ element: mockElement, defaultProvider: "webllm" }));

            await waitFor(() => {
                expect(mockDoors.enableAiControl).toHaveBeenCalledWith({
                    provider: "webllm",
                    apiKey: undefined,
                    history: "browser",
                    questions: true,
                    approvals: { policy: expect.any(Function) },
                });
            });
        });

        it("resolves the library the element loads to the real WebLLM, not a stand-in that throws", async () => {
            // graphty-element's WebLlmProvider imports @mlc-ai/web-llm lazily and calls these two.
            const webllm = await import("@mlc-ai/web-llm");

            expect(typeof webllm.CreateMLCEngine).toBe("function");
            expect(webllm.functionCallingModelIds.length).toBeGreaterThan(0);
        });
    });

    it("setProvider updates currentProvider", async () => {
        const { useAiManager } = await import("../useAiManager");
        const { result } = renderHook(() => useAiManager({ defaultProvider: "openai" }));

        act(() => {
            result.current.setProvider("anthropic");
        });

        expect(result.current.currentProvider).toBe("anthropic");
    });

    it("execute returns error when manager not initialized", async () => {
        const { useAiManager } = await import("../useAiManager");
        const { result } = renderHook(() => useAiManager({}));

        const execResult = await result.current.execute("test command");

        expect(execResult.success).toBe(false);
        expect(execResult.error?.message).toBe("AI Manager not initialized");
    });

    it("execute sends the message to the element", async () => {
        const { useAiManager } = await import("../useAiManager");

        const { result } = renderHook(() =>
            useAiManager({
                element: mockElement,
                defaultProvider: "openai",
            }),
        );

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        const execResult = await result.current.execute("set layout to force");

        expect(mockDoors.aiCommand).toHaveBeenCalledWith("set layout to force");
        expect(execResult.success).toBe(true);
    });

    it("execute handles errors gracefully", async () => {
        const { useAiManager } = await import("../useAiManager");
        mockDoors.aiCommand.mockRejectedValueOnce(new Error("API error"));

        const { result } = renderHook(() =>
            useAiManager({
                element: mockElement,
                defaultProvider: "openai",
            }),
        );

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        const execResult = await result.current.execute("test");

        expect(execResult.success).toBe(false);
        expect(execResult.error?.message).toBe("API error");
    });

    it("execute handles non-Error exceptions", async () => {
        const { useAiManager } = await import("../useAiManager");
        mockDoors.aiCommand.mockRejectedValueOnce("string error");

        const { result } = renderHook(() =>
            useAiManager({
                element: mockElement,
                defaultProvider: "openai",
            }),
        );

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        const execResult = await result.current.execute("test");

        expect(execResult.success).toBe(false);
        expect(execResult.error?.message).toBe("string error");
    });

    it("cancel cancels the element's command", async () => {
        const { useAiManager } = await import("../useAiManager");

        const { result } = renderHook(() =>
            useAiManager({
                element: mockElement,
                defaultProvider: "openai",
            }),
        );

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        act(() => {
            result.current.cancel();
        });

        expect(mockDoors.cancelAiCommand).toHaveBeenCalled();
    });

    it("clearError clears the error state", async () => {
        const { useAiManager } = await import("../useAiManager");

        const { result } = renderHook(() =>
            useAiManager({
                element: mockElement,
                defaultProvider: "openai",
            }),
        );

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        // Simulate an error through status change
        act(() => {
            mockStatusCallback({
                state: "error",
                error: new Error("Test error"),
            });
        });

        expect(result.current.error).not.toBeNull();

        act(() => {
            result.current.clearError();
        });

        expect(result.current.error).toBeNull();
    });

    it("updates isProcessing from the assistant's state", async () => {
        const { useAiManager } = await import("../useAiManager");

        const { result } = renderHook(() =>
            useAiManager({
                element: mockElement,
                defaultProvider: "openai",
            }),
        );

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        // Submitted
        act(() => {
            mockStatusCallback({ state: "submitted" });
        });
        expect(result.current.isProcessing).toBe(true);

        // Streaming
        act(() => {
            mockStatusCallback({ state: "streaming" });
        });
        expect(result.current.isProcessing).toBe(true);

        // Executing a tool
        act(() => {
            mockStatusCallback({ state: "executing" });
        });
        expect(result.current.isProcessing).toBe(true);

        // Ready again
        act(() => {
            mockStatusCallback({ state: "ready" });
        });
        expect(result.current.isProcessing).toBe(false);

        // Failed
        act(() => {
            mockStatusCallback({ state: "error" });
        });
        expect(result.current.isProcessing).toBe(false);
    });

    it("disables the element's assistant on unmount", async () => {
        const { useAiManager } = await import("../useAiManager");

        const { result, unmount } = renderHook(() =>
            useAiManager({
                element: mockElement,
                defaultProvider: "openai",
            }),
        );

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        unmount();

        expect(mockDoors.disableAiControl).toHaveBeenCalled();
    });

    it("syncs currentProvider with defaultProvider when currentProvider is null", async () => {
        const { useAiManager } = await import("../useAiManager");

        const { result, rerender } = renderHook(({ defaultProvider }) => useAiManager({ defaultProvider }), {
            initialProps: { defaultProvider: undefined as "openai" | undefined },
        });

        expect(result.current.currentProvider).toBeNull();

        rerender({ defaultProvider: "openai" });

        expect(result.current.currentProvider).toBe("openai");
    });

    describe("the conversation and its approvals", () => {
        const snapshot = (text: string, pending: readonly AiApprovalRequest[] = []): AiConversationSnapshot => ({
            id: "c1",
            key: "k",
            formatVersion: 1,
            messages: [{ id: "m1", role: "reader", text, via: "text" }],
            pending,
        });
        const request: AiApprovalRequest = {
            id: "req-1",
            gate: "replaces",
            calls: [{ tool: "edit_data", arguments: { action: "delete_all" } }],
            preview: { nodes: 3, edges: 1 },
        };

        it("reads the element's snapshot and pending approvals once the assistant is on", async () => {
            mockDoors.getAiConversation.mockReturnValue(snapshot("hello", [request]));
            mockDoors.getPendingAiApprovals.mockReturnValue([request]);
            const { useAiManager } = await import("../useAiManager");

            const { result } = renderHook(() => useAiManager({ element: mockElement, defaultProvider: "openai" }));

            await waitFor(() => {
                expect(result.current.conversation?.messages).toHaveLength(1);
            });
            expect(result.current.approvals.map((each) => each.id)).toEqual(["req-1"]);
        });

        it("reads them again on ai-conversation-changed, ai-approval-requested and ai-pending-resolved", async () => {
            mockDoors.getAiConversation.mockReturnValue(snapshot("first"));
            mockDoors.getPendingAiApprovals.mockReturnValue([]);
            const { useAiManager } = await import("../useAiManager");
            const { result } = renderHook(() => useAiManager({ element: mockElement, defaultProvider: "openai" }));
            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            mockDoors.getAiConversation.mockReturnValue(snapshot("second"));
            act(() => {
                events.dispatchEvent(new CustomEvent("ai-conversation-changed", { detail: { conversationId: "c1" } }));
            });
            expect(result.current.conversation?.messages[0]).toMatchObject({ text: "second" });

            mockDoors.getPendingAiApprovals.mockReturnValue([request]);
            act(() => {
                events.dispatchEvent(new CustomEvent("ai-approval-requested", { detail: { request, replayed: true } }));
            });
            expect(result.current.approvals).toEqual([request]);

            mockDoors.getPendingAiApprovals.mockReturnValue([]);
            act(() => {
                events.dispatchEvent(
                    new CustomEvent("ai-pending-resolved", {
                        detail: { id: "req-1", kind: "approval", code: "AI_COMPLETED", params: {} },
                    }),
                );
            });
            expect(result.current.approvals).toEqual([]);
        });

        it("reads the questions again on ai-question-asked and ai-pending-resolved, and answers them", async () => {
            const question: AiQuestionRequest = {
                id: "q-1",
                question: "Which department?",
                choices: ["Sales", "Ops"],
                multiple: false,
            };
            const { useAiManager } = await import("../useAiManager");
            const { result } = renderHook(() => useAiManager({ element: mockElement, defaultProvider: "openai" }));
            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });
            expect(result.current.questions).toEqual([]);

            mockDoors.getPendingAiQuestions.mockReturnValue([question]);
            act(() => {
                events.dispatchEvent(
                    new CustomEvent("ai-question-asked", { detail: { request: question, replayed: false } }),
                );
            });
            expect(result.current.questions).toEqual([question]);

            let answered: { code?: string } = {};
            await act(async () => {
                answered = await result.current.answerQuestion("q-1", "Sales");
            });
            expect(answered.code).toBe("AI_COMPLETED");
            expect(mockDoors.answerAiQuestion).toHaveBeenCalledWith("q-1", "Sales");

            mockDoors.getPendingAiQuestions.mockReturnValue([]);
            act(() => {
                events.dispatchEvent(
                    new CustomEvent("ai-pending-resolved", {
                        detail: { id: "q-1", kind: "question", code: "AI_COMPLETED", params: {} },
                    }),
                );
            });
            expect(result.current.questions).toEqual([]);
        });

        it("keeps a store failure the element reported", async () => {
            const { useAiManager } = await import("../useAiManager");
            const { result } = renderHook(() => useAiManager({ element: mockElement, defaultProvider: "openai" }));
            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            act(() => {
                events.dispatchEvent(
                    new CustomEvent("ai-conversation-changed", {
                        detail: {
                            conversationId: "c1",
                            code: "AI_STORAGE_FAILED",
                            params: { reason: "QuotaExceededError" },
                        },
                    }),
                );
            });

            expect(result.current.historyNotice).toEqual({
                code: "AI_STORAGE_FAILED",
                params: { reason: "QuotaExceededError" },
            });
        });

        it("answers approvals and starts and clears conversations through the element", async () => {
            const { useAiManager } = await import("../useAiManager");
            const { result } = renderHook(() => useAiManager({ element: mockElement, defaultProvider: "openai" }));
            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            let approved: { code?: string } = {};
            await act(async () => {
                approved = await result.current.resolveApproval("req-1", true);
                await result.current.resolveApproval("req-2", false);
                await result.current.newConversation();
                await result.current.clearHistory();
            });

            expect(approved.code).toBe("AI_COMPLETED");
            expect(mockDoors.resolveAiApproval).toHaveBeenNthCalledWith(1, "req-1", { approve: true });
            expect(mockDoors.resolveAiApproval).toHaveBeenNthCalledWith(2, "req-2", { approve: false });
            expect(mockDoors.newAiConversation).toHaveBeenCalledTimes(1);
            expect(mockDoors.clearAiHistory).toHaveBeenCalledTimes(1);
        });

        it("returns the element's result and keeps no copy of the message beside its conversation", async () => {
            const { useAiManager } = await import("../useAiManager");
            const { result } = renderHook(() => useAiManager({ element: mockElement, defaultProvider: "openai" }));
            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            mockDoors.aiCommand.mockResolvedValueOnce({
                success: false,
                message: "",
                code: "AI_PROVIDER_ERROR",
                params: { provider: "openai" },
            });
            let outcome: { code?: string } = {};
            await act(async () => {
                outcome = await result.current.execute("again");
            });

            expect(outcome.code).toBe("AI_PROVIDER_ERROR");
            // The transcript, the failed message included, is the element's conversation alone.
            expect(Object.keys(result.current)).not.toContain("failure");
            expect(Object.keys(result.current)).not.toContain("pendingInput");
        });
    });

    describe("the optional tools", () => {
        it("starts with every tool off and passes no tools to the element", async () => {
            const { useAiManager } = await import("../useAiManager");
            const { result } = renderHook(() => useAiManager({ element: mockElement, defaultProvider: "mock" }));

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });
            expect(result.current.toolSwitches).toEqual({ webSearch: false, webFetch: false, inPageCode: false });
            expect(mockDoors.enableAiControl.mock.calls[0][0]).not.toHaveProperty("tools");
        });

        it("saves a switch, and switches the assistant on again with that tool", async () => {
            const { useAiManager } = await import("../useAiManager");
            const { result } = renderHook(() => useAiManager({ element: mockElement, defaultProvider: "mock" }));
            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            act(() => {
                result.current.setToolSwitch("inPageCode", true);
            });

            await waitFor(() => {
                expect(mockDoors.enableAiControl).toHaveBeenLastCalledWith(
                    expect.objectContaining({ tools: { inPageCode: true } }),
                );
            });
            expect(localStorage.getItem("graphty.ai.inPageCode.v1")).toBe("on");
            expect(result.current.toolSwitches.inPageCode).toBe(true);
        });

        it("reads the reader's saved switches", async () => {
            localStorage.setItem("graphty.ai.webSearch.v1", "on");
            const { useAiManager } = await import("../useAiManager");
            renderHook(() => useAiManager({ element: mockElement, defaultProvider: "mock" }));

            await waitFor(() => {
                expect(mockDoors.enableAiControl).toHaveBeenCalledWith(
                    expect.objectContaining({ tools: { webSearch: true } }),
                );
            });
        });

        it("reports what the element says the provider can use", async () => {
            const capabilities: AiCapabilities = {
                provider: "mock",
                model: "mock",
                tools: { "web-search": "unsupported", "web-fetch": "unsupported", "in-page-code": "available" },
            };
            mockDoors.getAiCapabilities.mockReturnValue(capabilities);
            const { useAiManager } = await import("../useAiManager");
            const { result } = renderHook(() => useAiManager({ element: mockElement, defaultProvider: "mock" }));

            await waitFor(() => {
                expect(result.current.capabilities).toEqual(capabilities);
            });
        });

        it("notices each tool the element left out once, however often it says so", async () => {
            const { useAiManager } = await import("../useAiManager");
            const { result } = renderHook(() => useAiManager({ element: mockElement, defaultProvider: "mock" }));
            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            const unavailable = (): void => {
                events.dispatchEvent(
                    new CustomEvent("ai-capability-unavailable", {
                        detail: {
                            tool: "web-search",
                            code: "AI_HOSTED_TOOL_UNSUPPORTED",
                            params: { provider: "mock", model: "mock", tool: "web-search" },
                        },
                    }),
                );
            };
            act(() => {
                unavailable();
                unavailable();
            });

            expect(result.current.capabilityNotices).toEqual([
                {
                    code: "AI_HOSTED_TOOL_UNSUPPORTED",
                    params: { provider: "mock", model: "mock", tool: "web-search" },
                },
            ]);
        });
    });
});
