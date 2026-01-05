# Feature Design: AI Key Persistence API

## Overview

- **User Value**: Users can optionally persist API keys across sessions with encrypted storage, eliminating the need to re-enter keys on each page load.
- **Technical Value**: Exposes existing `ApiKeyManager` persistence capabilities through the public `AiManagerConfig` API, enabling React/Vue/vanilla JS wrappers to leverage built-in key management without reimplementing storage.

## Problem Statement

The `AiManager` internally uses `ApiKeyManager` which supports encrypted key persistence, but this functionality is not accessible through the public API:

1. `ApiKeyManager` is private inside `AiManager`
2. No way to configure persistence via `enableAiControl()` or `AiManagerConfig`
3. External apps must reimplement key storage or store keys insecurely

## Proposed Solution

### API Changes

#### 1. Extend `AiManagerConfig`

```typescript
// src/ai/AiManager.ts

export interface KeyPersistenceConfig {
    /** Enable encrypted key persistence */
    enabled: boolean;
    /** Encryption key for AES encryption (min 10 characters) */
    encryptionKey: string;
    /** Storage backend (default: "localStorage") */
    storage?: "localStorage" | "sessionStorage";
    /** Storage key prefix (default: "@graphty-ai-keys") */
    prefix?: string;
}

export interface AiManagerConfig {
    provider: ProviderType;
    apiKey?: string;
    model?: string;
    registerBuiltinCommands?: boolean;
    providerInstance?: LlmProvider;

    // NEW: Key persistence configuration
    keyPersistence?: KeyPersistenceConfig;
}
```

#### 2. Expose `ApiKeyManager` via getter

```typescript
// src/ai/AiManager.ts

class AiManager {
    // Change from private to allow external key management
    private apiKeyManager: ApiKeyManager;

    /**
     * Get the API key manager for external key operations.
     * Useful for managing keys before AI is fully initialized.
     */
    getApiKeyManager(): ApiKeyManager {
        return this.apiKeyManager;
    }
}
```

#### 3. Add Graph-level access

```typescript
// src/Graph.ts

/**
 * Get the API key manager for configuring keys before enabling AI.
 * Returns null if AI has never been enabled.
 */
getApiKeyManager(): ApiKeyManager | null {
    return this.aiManager?.getApiKeyManager() ?? null;
}

/**
 * Create a standalone ApiKeyManager for key management without enabling AI.
 * Useful for settings UIs that configure keys before AI activation.
 */
static createApiKeyManager(): ApiKeyManager {
    return new ApiKeyManager();
}
```

### Implementation Changes

#### `AiManager.init()` modification

```typescript
// src/ai/AiManager.ts

init(graph: Graph, config: AiManagerConfig): void {
    if (this.initialized) {
        return;
    }

    this.graph = graph;
    this.disposed = false;

    // NEW: Configure key persistence if specified
    if (config.keyPersistence?.enabled) {
        this.apiKeyManager.enablePersistence({
            encryptionKey: config.keyPersistence.encryptionKey,
            storage: config.keyPersistence.storage ?? "localStorage",
            prefix: config.keyPersistence.prefix,
        });
    }

    // Set API key if provided (will be persisted if persistence enabled)
    if (config.apiKey) {
        this.apiKeyManager.setKey(config.provider, config.apiKey);
    }

    // ... rest of existing init logic
}
```

### Usage Examples

#### Basic usage with persistence

```typescript
await graph.enableAiControl({
    provider: "openai",
    apiKey: "sk-...",
    keyPersistence: {
        enabled: true,
        encryptionKey: "user-provided-secret",
    }
});
```

#### Manage keys before enabling AI

```typescript
// Create standalone key manager for settings UI
const keyManager = Graph.createApiKeyManager();

// Configure persistence
keyManager.enablePersistence({
    encryptionKey: userSecret,
    storage: "localStorage"
});

// Store keys from settings form
keyManager.setKey("openai", openaiKey);
keyManager.setKey("anthropic", anthropicKey);

// Later, enable AI (keys already stored)
await graph.enableAiControl({
    provider: "openai",
    keyPersistence: {
        enabled: true,
        encryptionKey: userSecret,
    }
    // No apiKey needed - will load from persisted storage
});
```

#### Check configured providers

```typescript
const keyManager = graph.getApiKeyManager();
const providers = keyManager?.getConfiguredProviders() ?? [];
// ["openai", "anthropic"]
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/ai/AiManager.ts` | Add `KeyPersistenceConfig`, extend `AiManagerConfig`, add `getApiKeyManager()`, update `init()` |
| `src/ai/index.ts` | Export `KeyPersistenceConfig` type |
| `src/Graph.ts` | Add `getApiKeyManager()` method, add static `createApiKeyManager()` |

## Test Plan

### Unit Tests: `AiManager.test.ts`

```typescript
describe("AiManager key persistence", () => {
    it("should not enable persistence by default", () => {
        const manager = new AiManager();
        manager.init(mockGraph, { provider: "mock" });

        const keyManager = manager.getApiKeyManager();
        expect(keyManager.isPersistenceEnabled()).toBe(false);
    });

    it("should enable persistence when configured", () => {
        const manager = new AiManager();
        manager.init(mockGraph, {
            provider: "mock",
            keyPersistence: {
                enabled: true,
                encryptionKey: "test-secret-key",
            }
        });

        const keyManager = manager.getApiKeyManager();
        expect(keyManager.isPersistenceEnabled()).toBe(true);
    });

    it("should persist API key when persistence enabled", () => {
        const manager = new AiManager();
        manager.init(mockGraph, {
            provider: "openai",
            apiKey: "sk-test",
            keyPersistence: {
                enabled: true,
                encryptionKey: "test-secret-key",
                storage: "sessionStorage",
            }
        });

        const keyManager = manager.getApiKeyManager();
        expect(keyManager.hasKey("openai")).toBe(true);
        expect(keyManager.getKey("openai")).toBe("sk-test");
    });

    it("should use custom storage prefix", () => {
        const manager = new AiManager();
        manager.init(mockGraph, {
            provider: "mock",
            keyPersistence: {
                enabled: true,
                encryptionKey: "test-secret-key",
                prefix: "@my-app-keys",
            }
        });

        // Verify prefix is used (may need to check localStorage directly)
    });

    it("should load persisted keys on re-init", () => {
        // First init with persistence
        const manager1 = new AiManager();
        manager1.init(mockGraph, {
            provider: "openai",
            apiKey: "sk-test",
            keyPersistence: {
                enabled: true,
                encryptionKey: "test-secret-key",
            }
        });
        manager1.dispose();

        // Second init should load persisted key
        const manager2 = new AiManager();
        manager2.init(mockGraph, {
            provider: "openai",
            keyPersistence: {
                enabled: true,
                encryptionKey: "test-secret-key",
            }
        });

        const keyManager = manager2.getApiKeyManager();
        expect(keyManager.getKey("openai")).toBe("sk-test");
    });

    it("should expose ApiKeyManager via getter", () => {
        const manager = new AiManager();
        manager.init(mockGraph, { provider: "mock" });

        const keyManager = manager.getApiKeyManager();
        expect(keyManager).toBeInstanceOf(ApiKeyManager);
    });
});
```

### Unit Tests: `Graph.test.ts`

```typescript
describe("Graph AI key management", () => {
    it("should return null for getApiKeyManager before AI enabled", () => {
        const graph = new Graph(element);
        expect(graph.getApiKeyManager()).toBeNull();
    });

    it("should return ApiKeyManager after AI enabled", async () => {
        const graph = new Graph(element);
        await graph.enableAiControl({ provider: "mock" });

        const keyManager = graph.getApiKeyManager();
        expect(keyManager).not.toBeNull();
    });

    it("should create standalone ApiKeyManager via static method", () => {
        const keyManager = Graph.createApiKeyManager();
        expect(keyManager).toBeInstanceOf(ApiKeyManager);
        expect(keyManager.isPersistenceEnabled()).toBe(false);
    });
});
```

### Integration Tests

```typescript
describe("AI key persistence integration", () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it("should persist keys across Graph instances", async () => {
        const element = document.createElement("div");

        // First graph - save key
        const graph1 = new Graph(element);
        await graph1.enableAiControl({
            provider: "openai",
            apiKey: "sk-test-key",
            keyPersistence: {
                enabled: true,
                encryptionKey: "my-secret",
            }
        });
        graph1.dispose();

        // Second graph - key should be available
        const graph2 = new Graph(element);
        await graph2.enableAiControl({
            provider: "openai",
            keyPersistence: {
                enabled: true,
                encryptionKey: "my-secret",
            }
        });

        const keyManager = graph2.getApiKeyManager();
        expect(keyManager?.getKey("openai")).toBe("sk-test-key");
    });

    it("should not decrypt with wrong encryption key", async () => {
        const element = document.createElement("div");

        // Save with one key
        const graph1 = new Graph(element);
        await graph1.enableAiControl({
            provider: "openai",
            apiKey: "sk-test-key",
            keyPersistence: {
                enabled: true,
                encryptionKey: "correct-secret",
            }
        });
        graph1.dispose();

        // Try to load with wrong key
        const graph2 = new Graph(element);
        await graph2.enableAiControl({
            provider: "openai",
            keyPersistence: {
                enabled: true,
                encryptionKey: "wrong-secret",
            }
        });

        const keyManager = graph2.getApiKeyManager();
        // Should not have the key (decryption failed silently)
        expect(keyManager?.hasKey("openai")).toBe(false);
    });
});
```

## Security Considerations

1. **Encryption key responsibility**: Users must provide their own encryption key. Document that this should be derived from user input (password) or stored securely.

2. **Key exposure prevention**: `ApiKeyManager` already implements `toString()` returning `[REDACTED]` to prevent accidental logging.

3. **Storage choice**: Default to `localStorage` but allow `sessionStorage` for more ephemeral storage needs.

4. **Clear keys**: Expose ability to clear all stored keys via `apiKeyManager.clear()`.

## Backward Compatibility

- All changes are additive
- `keyPersistence` is optional, defaults to disabled (current behavior)
- Existing code continues to work unchanged

## Export Changes

Add to `src/ai/index.ts`:
```typescript
export type { KeyPersistenceConfig } from "./AiManager";
```

## Implementation Checklist

- [ ] Add `KeyPersistenceConfig` interface to `AiManager.ts`
- [ ] Extend `AiManagerConfig` with `keyPersistence` option
- [ ] Add `getApiKeyManager()` method to `AiManager`
- [ ] Update `AiManager.init()` to configure persistence
- [ ] Add `getApiKeyManager()` to `Graph`
- [ ] Add static `Graph.createApiKeyManager()` method
- [ ] Export `KeyPersistenceConfig` from `src/ai/index.ts`
- [ ] Add unit tests for `AiManager` persistence
- [ ] Add unit tests for `Graph` key manager access
- [ ] Add integration tests for cross-instance persistence
- [ ] Update API documentation
