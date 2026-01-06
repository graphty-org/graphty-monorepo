import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AiStatus } from "../../types/ai";

// Create mock manager
const mockStatusCallback = vi.fn();
const mockManager = {
    init: vi.fn(),
    onStatusChange: vi.fn((callback) => {
        mockStatusCallback.mockImplementation(callback);
        return vi.fn(); // unsubscribe function
    }),
    execute: vi.fn().mockResolvedValue({ success: true, message: "Done" }),
    cancel: vi.fn(),
    dispose: vi.fn(),
};

const mockCreateAiManager = vi.fn(() => mockManager);

// Mock the types/ai module
vi.mock("../../types/ai", async (importOriginal) => {
    const original = await importOriginal<typeof import("../../types/ai")>();
    return {
        ...original,
        getCreateAiManager: vi.fn().mockResolvedValue(mockCreateAiManager),
    };
});

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

    it("stays not ready when graph is not provided", async () => {
        const { useAiManager } = await import("../useAiManager");
        const { result } = renderHook(() => useAiManager({ defaultProvider: "openai" }));

        // Wait a bit to ensure no async init happens
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(result.current.isReady).toBe(false);
    });

    it("initializes manager when graph is provided", async () => {
        const { useAiManager } = await import("../useAiManager");
        const mockGraph = { nodes: [], edges: [] };

        const { result } = renderHook(() =>
            useAiManager({
                graph: mockGraph,
                defaultProvider: "openai",
            }),
        );

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        expect(mockCreateAiManager).toHaveBeenCalled();
        expect(mockManager.init).toHaveBeenCalledWith(mockGraph, {
            provider: "openai",
            apiKey: undefined,
        });
    });

    it("passes API key to manager init", async () => {
        const { useAiManager } = await import("../useAiManager");
        const mockGraph = { nodes: [], edges: [] };
        const getKey = vi.fn().mockReturnValue("test-api-key");

        renderHook(() =>
            useAiManager({
                graph: mockGraph,
                defaultProvider: "anthropic",
                getKey,
            }),
        );

        await waitFor(() => {
            expect(mockManager.init).toHaveBeenCalledWith(mockGraph, {
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

    it("execute calls manager.execute when initialized", async () => {
        const { useAiManager } = await import("../useAiManager");
        const mockGraph = { nodes: [], edges: [] };

        const { result } = renderHook(() =>
            useAiManager({
                graph: mockGraph,
                defaultProvider: "openai",
            }),
        );

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        const execResult = await result.current.execute("set layout to force");

        expect(mockManager.execute).toHaveBeenCalledWith("set layout to force");
        expect(execResult.success).toBe(true);
    });

    it("execute handles errors gracefully", async () => {
        const { useAiManager } = await import("../useAiManager");
        const mockGraph = { nodes: [], edges: [] };
        mockManager.execute.mockRejectedValueOnce(new Error("API error"));

        const { result } = renderHook(() =>
            useAiManager({
                graph: mockGraph,
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
        const mockGraph = { nodes: [], edges: [] };
        mockManager.execute.mockRejectedValueOnce("string error");

        const { result } = renderHook(() =>
            useAiManager({
                graph: mockGraph,
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

    it("cancel calls manager.cancel", async () => {
        const { useAiManager } = await import("../useAiManager");
        const mockGraph = { nodes: [], edges: [] };

        const { result } = renderHook(() =>
            useAiManager({
                graph: mockGraph,
                defaultProvider: "openai",
            }),
        );

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        act(() => {
            result.current.cancel();
        });

        expect(mockManager.cancel).toHaveBeenCalled();
    });

    it("clearError clears the error state", async () => {
        const { useAiManager } = await import("../useAiManager");
        const mockGraph = { nodes: [], edges: [] };

        const { result } = renderHook(() =>
            useAiManager({
                graph: mockGraph,
                defaultProvider: "openai",
            }),
        );

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        // Simulate an error through status change
        act(() => {
            mockStatusCallback({
                stage: "error",
                error: new Error("Test error"),
            } as AiStatus);
        });

        expect(result.current.error).not.toBeNull();

        act(() => {
            result.current.clearError();
        });

        expect(result.current.error).toBeNull();
    });

    it("updates isProcessing based on status stage", async () => {
        const { useAiManager } = await import("../useAiManager");
        const mockGraph = { nodes: [], edges: [] };

        const { result } = renderHook(() =>
            useAiManager({
                graph: mockGraph,
                defaultProvider: "openai",
            }),
        );

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        // Processing stage
        act(() => {
            mockStatusCallback({ stage: "processing" } as AiStatus);
        });
        expect(result.current.isProcessing).toBe(true);

        // Streaming stage
        act(() => {
            mockStatusCallback({ stage: "streaming" } as AiStatus);
        });
        expect(result.current.isProcessing).toBe(true);

        // ExecutingTool stage
        act(() => {
            mockStatusCallback({ stage: "executingTool" } as AiStatus);
        });
        expect(result.current.isProcessing).toBe(true);

        // Complete stage
        act(() => {
            mockStatusCallback({ stage: "complete" } as AiStatus);
        });
        expect(result.current.isProcessing).toBe(false);

        // Idle stage
        act(() => {
            mockStatusCallback({ stage: "idle" } as AiStatus);
        });
        expect(result.current.isProcessing).toBe(false);
    });

    it("disposes manager on unmount", async () => {
        const { useAiManager } = await import("../useAiManager");
        const mockGraph = { nodes: [], edges: [] };

        const { result, unmount } = renderHook(() =>
            useAiManager({
                graph: mockGraph,
                defaultProvider: "openai",
            }),
        );

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        unmount();

        expect(mockManager.dispose).toHaveBeenCalled();
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
