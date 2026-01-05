import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ENCRYPTION_KEY_STORAGE } from "../../utils/ai-storage";

// Create mock ApiKeyManager instance
const createMockApiKeyManager = () => ({
    enablePersistence: vi.fn(),
    disablePersistence: vi.fn(),
    isPersistenceEnabled: vi.fn().mockReturnValue(false),
    setKey: vi.fn(),
    getKey: vi.fn(),
    hasKey: vi.fn().mockReturnValue(false),
    removeKey: vi.fn(),
    getConfiguredProviders: vi.fn().mockReturnValue([]),
    clear: vi.fn(),
});

let mockApiKeyManagerInstance = createMockApiKeyManager();

// Mock ApiKeyManager class
const MockApiKeyManager = vi.fn(() => mockApiKeyManagerInstance);

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
        MockApiKeyManager.mockImplementation(() => mockApiKeyManagerInstance);
        sessionStorage.clear();
    });

    afterEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
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

    it("enablePersistence with custom password stores in sessionStorage", async () => {
        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        act(() => {
            result.current.enablePersistence("my-custom-password");
        });

        expect(mockApiKeyManagerInstance.enablePersistence).toHaveBeenCalled();
        expect(sessionStorage.getItem(ENCRYPTION_KEY_STORAGE)).toBe("my-custom-password");
        expect(result.current.isPersistenceEnabled).toBe(true);
    });

    it("enablePersistence with empty password uses default and does not store", async () => {
        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        act(() => {
            result.current.enablePersistence("");
        });

        expect(mockApiKeyManagerInstance.enablePersistence).toHaveBeenCalled();
        expect(sessionStorage.getItem(ENCRYPTION_KEY_STORAGE)).toBeNull();
        expect(result.current.isPersistenceEnabled).toBe(true);
    });

    it("enablePersistence with undefined uses default password", async () => {
        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        act(() => {
            result.current.enablePersistence();
        });

        expect(mockApiKeyManagerInstance.enablePersistence).toHaveBeenCalled();
        expect(sessionStorage.getItem(ENCRYPTION_KEY_STORAGE)).toBeNull();
    });

    it("disablePersistence clears sessionStorage and updates state", async () => {
        sessionStorage.setItem(ENCRYPTION_KEY_STORAGE, "stored-key");

        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        // First enable
        act(() => {
            result.current.enablePersistence("test");
        });

        expect(result.current.isPersistenceEnabled).toBe(true);

        // Then disable
        act(() => {
            result.current.disablePersistence(true);
        });

        expect(mockApiKeyManagerInstance.disablePersistence).toHaveBeenCalledWith(true);
        expect(sessionStorage.getItem(ENCRYPTION_KEY_STORAGE)).toBeNull();
        expect(result.current.isPersistenceEnabled).toBe(false);
    });

    it("disablePersistence defaults clearStorage to false", async () => {
        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        act(() => {
            result.current.disablePersistence();
        });

        expect(mockApiKeyManagerInstance.disablePersistence).toHaveBeenCalledWith(false);
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

    it("restores persistence from sessionStorage on init", async () => {
        // Simulate stored encryption key
        sessionStorage.setItem(ENCRYPTION_KEY_STORAGE, "stored-password");

        // First call with default password fails (no keys)
        mockApiKeyManagerInstance.getConfiguredProviders.mockReturnValueOnce([]);
        // After trying stored password, we have keys
        mockApiKeyManagerInstance.getConfiguredProviders.mockReturnValue(["openai"]);

        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        // Should have tried to enable persistence with stored key
        expect(mockApiKeyManagerInstance.enablePersistence).toHaveBeenCalled();
    });

    it("clears stale encryption key when decryption fails", async () => {
        sessionStorage.setItem(ENCRYPTION_KEY_STORAGE, "bad-password");

        // Default password returns no keys
        mockApiKeyManagerInstance.getConfiguredProviders.mockReturnValue([]);

        // Second enablePersistence call throws (bad stored password)
        mockApiKeyManagerInstance.enablePersistence
            .mockImplementationOnce(() => {}) // Default password call
            .mockImplementationOnce(() => {
                throw new Error("Decryption failed");
            });

        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            // Session storage should be cleared
            expect(sessionStorage.getItem(ENCRYPTION_KEY_STORAGE)).toBeNull();
        });
    });

    it("returns keyManager instance", async () => {
        const { useAiKeyStorage } = await import("../useAiKeyStorage");
        const { result } = renderHook(() => useAiKeyStorage());

        await waitFor(() => {
            expect(result.current.isReady).toBe(true);
        });

        expect(result.current.keyManager).toBe(mockApiKeyManagerInstance);
    });
});
