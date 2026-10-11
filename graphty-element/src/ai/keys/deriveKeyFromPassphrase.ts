/**
 * Derive the encryption key for saved AI keys from a reader's passphrase. Internal: hosts reach it
 * through `ApiKeyManager.enablePersistenceWithPassphrase`, which keeps the result in memory only.
 * @module ai/keys/deriveKeyFromPassphrase
 */

/** PBKDF2 rounds: OWASP's 2023 figure for PBKDF2-HMAC-SHA256. */
const ITERATIONS = 600_000;

/** The salt used when the host passes none. */
const DEFAULT_SALT = "@graphty-ai-keys";

/**
 * Derive a key from a passphrase with WebCrypto PBKDF2-HMAC-SHA256. The same passphrase and salt
 * always give the same key.
 * @param passphrase - What the reader typed. Must not be empty.
 * @param salt - A per-reader value, not secret (default: a fixed salt shared by every reader)
 * @returns A 64-character hex key
 * @throws Error if the passphrase is empty
 */
export async function deriveKeyFromPassphrase(passphrase: string, salt: string = DEFAULT_SALT): Promise<string> {
    if (passphrase.length === 0) {
        throw new Error("Passphrase cannot be empty");
    }

    const encoder = new TextEncoder();
    const material = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations: ITERATIONS },
        material,
        256,
    );
    return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
