import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { AiStatus } from "@graphty/graphty-element/ai";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The element's assistant doors, as a stand-in element exposes them.
const mockStatusCallback = vi.fn();
const mockDoors = {
    enableAiControl: vi.fn().mockResolvedValue(undefined),
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

        // Wait a bit to ensure no async init happens
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(result.current.isReady).toBe(false);
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
            });
        });

        expect(getKey).toHaveBeenCalledWith("anthropic");
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
            } as AiStatus);
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
            mockStatusCallback({ state: "submitted" } as AiStatus);
        });
        expect(result.current.isProcessing).toBe(true);

        // Streaming
        act(() => {
            mockStatusCallback({ state: "streaming" } as AiStatus);
        });
        expect(result.current.isProcessing).toBe(true);

        // Executing a tool
        act(() => {
            mockStatusCallback({ state: "executing" } as AiStatus);
        });
        expect(result.current.isProcessing).toBe(true);

        // Ready again
        act(() => {
            mockStatusCallback({ state: "ready" } as AiStatus);
        });
        expect(result.current.isProcessing).toBe(false);

        // Failed
        act(() => {
            mockStatusCallback({ state: "error" } as AiStatus);
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
});
