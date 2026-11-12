/**
 * @file Where the key manager finds `encrypt-storage`, the optional peer it persists keys with.
 *
 * The package is never imported statically by anything the root entry point reaches: a consumer's
 * bundler resolves the static imports of a lazily loaded chunk at build time, so that would fail
 * the build of every consumer without it (issue #3278). Nor is it loaded with a top-level await,
 * which a bundler targeting an es2020 browser refuses. Instead it is registered here, from one
 * of two places:
 *
 * - `loadEncryptStorage()`, the literal `await import()` inside `try` that the root entry point's
 *   asynchronous routes (`Graph.createApiKeyManager`, `Graph.enableAiControl`) await before they
 *   construct a key manager;
 * - `withEncryptStorage.ts`, a static import for the `./ai` and `./credentials` entry points,
 *   whose consumers construct `ApiKeyManager` synchronously and declared the peer by importing
 *   them.
 */

import type { EncryptStorage } from "encrypt-storage";

import { missingPackage } from "../missingPackage";

let encryptStorageClass: typeof EncryptStorage | undefined;
let loadError: unknown;

/**
 * Register the package's class.
 * @param registered - `EncryptStorage`
 */
export function useEncryptStorage(registered: typeof EncryptStorage): void {
    encryptStorageClass = registered;
}

/**
 * Load the package, once. Where it is not installed, persistence throws `E_MISSING_PACKAGE`
 * and keys stay in memory.
 */
export async function loadEncryptStorage(): Promise<void> {
    if (encryptStorageClass !== undefined) {
        return;
    }
    try {
        encryptStorageClass = (await import("encrypt-storage")).EncryptStorage;
    } catch (error) {
        loadError = error;
    }
}

/**
 * The registered class.
 * @returns `EncryptStorage`
 * @throws A `GraphtyError` with `E_MISSING_PACKAGE` when it was neither registered nor loaded.
 */
export function encryptStorage(): typeof EncryptStorage {
    if (encryptStorageClass === undefined) {
        throw missingPackage("encrypt-storage", "api-key-persistence", loadError);
    }
    return encryptStorageClass;
}
