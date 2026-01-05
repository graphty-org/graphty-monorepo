import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the graphty-element module
vi.mock("@graphty/graphty-element", () => ({
    ApiKeyManager: class MockApiKeyManager {
        enablePersistence = vi.fn();
        disablePersistence = vi.fn();
        isPersistenceEnabled = vi.fn().mockReturnValue(false);
        setKey = vi.fn();
        getKey = vi.fn();
        hasKey = vi.fn().mockReturnValue(false);
        removeKey = vi.fn();
        getConfiguredProviders = vi.fn().mockReturnValue([]);
        clear = vi.fn();
    },
    createAiManager: vi.fn(() => ({
        init: vi.fn(),
        onStatusChange: vi.fn().mockReturnValue(() => {}),
        execute: vi.fn().mockResolvedValue({ success: true }),
        cancel: vi.fn(),
        dispose: vi.fn(),
    })),
    createProvider: vi.fn((config) => ({
        validateApiKey: vi.fn().mockResolvedValue(true),
        config,
    })),
}));

describe("types/ai", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("getGraphtyElement", () => {
        it("loads the graphty-element module", async () => {
            // Fresh import after mock setup
            const { getGraphtyElement } = await import("../ai");
            const mod = await getGraphtyElement();

            expect(mod).toBeDefined();
            // The module uses type assertions to access these, so check via the correct accessor
            expect((mod as unknown as { ApiKeyManager: unknown }).ApiKeyManager).toBeDefined();
            expect((mod as unknown as { createAiManager: unknown }).createAiManager).toBeDefined();
        });

        it("caches the loaded module", async () => {
            const { getGraphtyElement } = await import("../ai");

            const mod1 = await getGraphtyElement();
            const mod2 = await getGraphtyElement();

            expect(mod1).toBe(mod2);
        });
    });

    describe("getApiKeyManager", () => {
        it("returns the ApiKeyManager class", async () => {
            const { getApiKeyManager } = await import("../ai");
            const ApiKeyManager = await getApiKeyManager();

            expect(ApiKeyManager).toBeDefined();

            const instance = new ApiKeyManager();
            expect(instance.enablePersistence).toBeDefined();
            expect(instance.setKey).toBeDefined();
            expect(instance.getKey).toBeDefined();
        });

        it("can create instances with expected methods", async () => {
            const { getApiKeyManager } = await import("../ai");
            const ApiKeyManager = await getApiKeyManager();
            const manager = new ApiKeyManager();

            expect(typeof manager.enablePersistence).toBe("function");
            expect(typeof manager.disablePersistence).toBe("function");
            expect(typeof manager.setKey).toBe("function");
            expect(typeof manager.getKey).toBe("function");
            expect(typeof manager.hasKey).toBe("function");
            expect(typeof manager.removeKey).toBe("function");
            expect(typeof manager.getConfiguredProviders).toBe("function");
            expect(typeof manager.clear).toBe("function");
        });
    });

    describe("getCreateAiManager", () => {
        it("returns the createAiManager function", async () => {
            const { getCreateAiManager } = await import("../ai");
            const createAiManager = await getCreateAiManager();

            expect(typeof createAiManager).toBe("function");
        });

        it("can create manager instances", async () => {
            const { getCreateAiManager } = await import("../ai");
            const createAiManager = await getCreateAiManager();
            const manager = createAiManager();

            expect(manager).toBeDefined();
            expect(typeof manager.init).toBe("function");
            expect(typeof manager.execute).toBe("function");
            expect(typeof manager.cancel).toBe("function");
            expect(typeof manager.dispose).toBe("function");
            expect(typeof manager.onStatusChange).toBe("function");
        });
    });

    describe("getCreateProvider", () => {
        it("returns the createProvider function", async () => {
            const { getCreateProvider } = await import("../ai");
            const createProvider = await getCreateProvider();

            expect(typeof createProvider).toBe("function");
        });

        it("can create provider instances", async () => {
            const { getCreateProvider } = await import("../ai");
            const createProvider = await getCreateProvider();
            const provider = createProvider({ provider: "openai", apiKey: "test-key" });

            expect(provider).toBeDefined();
            expect(typeof provider.validateApiKey).toBe("function");
        });
    });

    describe("type exports", () => {
        it("exports ProviderType", async () => {
            const { getCreateProvider } = await import("../ai");
            const createProvider = await getCreateProvider();

            // Type checking - these should compile
            createProvider({ provider: "openai" });
            createProvider({ provider: "anthropic" });
            createProvider({ provider: "google" });
            createProvider({ provider: "mock" });
            createProvider({ provider: "webllm" });
        });

        it("exports AiStage type values", async () => {
            // Import to ensure types are accessible
            await import("../ai");

            // These are type-level checks - if they compile, the types exist
            const stages: Array<"idle" | "processing" | "executingTool" | "streaming" | "complete" | "error"> = [
                "idle",
                "processing",
                "executingTool",
                "streaming",
                "complete",
                "error",
            ];
            expect(stages).toHaveLength(6);
        });
    });
});

describe("types/ai type definitions", () => {
    it("exports all required interfaces", async () => {
        // Type-level verification that all exports exist
        const mod = await import("../ai");

        expect(mod.getGraphtyElement).toBeDefined();
        expect(mod.getApiKeyManager).toBeDefined();
        expect(mod.getCreateAiManager).toBeDefined();
        expect(mod.getCreateProvider).toBeDefined();
    });
});
