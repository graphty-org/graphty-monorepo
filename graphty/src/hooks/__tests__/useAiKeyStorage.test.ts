import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Create mock ApiKeyManager instance
const createMockApiKeyManager = () => ({
    ready: vi.fn().mockResolvedValue(undefined),
    enablePersistence: vi.fn().mockResolvedValue(undefined),
    disablePersistence: vi.fn(),
    isPersistenceEnabled: vi.fn().mockReturnValue(false),
    setKey: vi.fn(),
    getKey: vi.fn(),
    hasKey: vi.fn().mockReturnValue(false),
    removeKey: vi.fn(),
    getConfiguredProviders: vi.fn().mockReturnValue([]),
    clear: vi.fn(),
    getDefaultProvider: vi.fn().mockReturnValue(null),
    setDefaultProvider: vi.fn(),
});

let mockApiKeyManagerInstance = createMockApiKeyManager();

// Mock ApiKeyManager class. The hook calls it with `new`, so the implementation is a function
// expression: Vitest 4 constructs a mock through its implementation, and an arrow cannot be.
const MockApiKeyManager = vi.fn(function () {
    return mockApiKeyManagerInstance;
});

// Mock the types/ai module
vi.mock("../../types/ai", async (importOriginal) => {
    const original = await importOriginal<typeof import("../../types/ai")>();
    return {
        ...original,
        getApiKeyManager: vi.fn().mockResolvedValue(MockApiKeyManager),
    };
});

describe("useAiKeyStorage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockApiKeyManagerInstance = createMockApiKeyManager();
        MockApiKeyManager.mockImplementation(function () {
            return mockApiKeyManagerInstance;
        });
        sessionStorage.clear();
    });

    afterEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
    });

    it("reports ready only after the manager has restored an earlier page's keys", async () => {
        let finishRestore = (): void => undefined;
        mockApiKeyManagerInstance.ready.mockReturnValue(
            new Promise<undefined>((resolve) => {
                finishRestore = () => resolve(undefined);
            }),
        );
        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());
        await waitFor(() => expect(MockApiKeyManager).toHaveBeenCalled());
        expect(result.current.isReady).toBe(false);

        mockApiKeyManagerInstance.getConfiguredProviders.mockReturnValue(["openai"]);
        await act(async () => {
            finishRestore();
            await Promise.resolve();
        });

        await waitFor(() => expect(result.current.isReady).toBe(true));
        expect(result.current.configuredProviders).toEqual(["openai"]);
    });

    it("initializes with default state", async () => {
        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        expect(result.current.isReady).toBe(false);
        expect(result.current.configuredProviders).toEqual([]);
        expect(result.current.hasAnyProvider).toBe(false);
        expect(result.current.isPersistenceEnabled).toBe(false);
    });

    it("becomes ready after async initialization", async () => {
        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });
    });

    it("does not initialize when disabled", async () => {
        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage({ disabled: true }));

        // Wait a bit
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(result.current.isReady).toBe(false);
        expect(MockApiKeyManager).not.toHaveBeenCalled();
    });

    it("getKey returns key from manager", async () => {
        mockApiKeyManagerInstance.getKey.mockReturnValue("test-key");

        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        const key = result.current.getKey("openai");

        expect(key).toBe("test-key");
        expect(mockApiKeyManagerInstance.getKey).toHaveBeenCalledWith("openai");
    });

    it("setKey calls manager.setKey", async () => {
        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        act(() => {
            result.current.setKey("openai", "new-key");
        });

        expect(mockApiKeyManagerInstance.setKey).toHaveBeenCalledWith("openai", "new-key");
        // getConfiguredProviders is called to refresh
        expect(mockApiKeyManagerInstance.getConfiguredProviders).toHaveBeenCalled();
    });

    it("removeKey calls manager.removeKey", async () => {
        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        act(() => {
            result.current.removeKey("openai");
        });

        expect(mockApiKeyManagerInstance.removeKey).toHaveBeenCalledWith("openai");
        expect(mockApiKeyManagerInstance.getConfiguredProviders).toHaveBeenCalled();
    });

    it("hasKey returns result from manager", async () => {
        mockApiKeyManagerInstance.hasKey.mockReturnValue(true);

        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        const hasKey = result.current.hasKey("anthropic");

        expect(hasKey).toBe(true);
        expect(mockApiKeyManagerInstance.hasKey).toHaveBeenCalledWith("anthropic");
    });

    it("clearAll calls manager.clear and refreshes providers", async () => {
        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        act(() => {
            result.current.clearAll();
        });

        expect(mockApiKeyManagerInstance.clear).toHaveBeenCalled();
    });

    it("enablePersistence passes a custom encryption key to the element", async () => {
        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        mockApiKeyManagerInstance.isPersistenceEnabled.mockReturnValue(true);
        act(() => {
            result.current.enablePersistence("  my-custom-password ");
        });

        expect(mockApiKeyManagerInstance.enablePersistence).toHaveBeenCalledWith({
            encryptionKey: "my-custom-password",
        });
        expect(sessionStorage.length).toBe(0);
        expect(result.current.isPersistenceEnabled).toBe(true);
    });

    it("enablePersistence with no or empty key leaves the default to the element", async () => {
        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        act(() => {
            result.current.enablePersistence("");
            result.current.enablePersistence();
        });

        expect(mockApiKeyManagerInstance.enablePersistence).toHaveBeenNthCalledWith(1, { encryptionKey: undefined });
        expect(mockApiKeyManagerInstance.enablePersistence).toHaveBeenNthCalledWith(2, { encryptionKey: undefined });
    });

    it("disablePersistence passes through and updates state", async () => {
        mockApiKeyManagerInstance.isPersistenceEnabled.mockReturnValue(true);

        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            expect(result.current.isPersistenceEnabled).toBe(true);
        });

        mockApiKeyManagerInstance.isPersistenceEnabled.mockReturnValue(false);
        act(() => {
            result.current.disablePersistence();
        });

        expect(mockApiKeyManagerInstance.disablePersistence).toHaveBeenCalledWith(undefined);
        expect(result.current.isPersistenceEnabled).toBe(false);
    });

    it("reads the persistence and default provider the element restored", async () => {
        mockApiKeyManagerInstance.isPersistenceEnabled.mockReturnValue(true);
        mockApiKeyManagerInstance.getDefaultProvider.mockReturnValue("anthropic");

        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        expect(result.current.isPersistenceEnabled).toBe(true);
        expect(result.current.defaultProvider).toBe("anthropic");
        expect(mockApiKeyManagerInstance.enablePersistence).not.toHaveBeenCalled();
    });

    it("setDefaultProvider writes through the element", async () => {
        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        mockApiKeyManagerInstance.getDefaultProvider.mockReturnValue("google");
        act(() => {
            result.current.setDefaultProvider("google");
        });

        expect(mockApiKeyManagerInstance.setDefaultProvider).toHaveBeenCalledWith("google");
        expect(result.current.defaultProvider).toBe("google");
    });

    it("hasAnyProvider returns true when providers are configured", async () => {
        mockApiKeyManagerInstance.getConfiguredProviders.mockReturnValue(["openai", "anthropic"]);

        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        expect(result.current.hasAnyProvider).toBe(true);
        expect(result.current.configuredProviders).toEqual(["openai", "anthropic"]);
    });
});
