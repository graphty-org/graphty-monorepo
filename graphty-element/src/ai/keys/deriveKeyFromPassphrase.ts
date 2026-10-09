/**
 * Derive an encryption key for saved AI keys from a reader's passphrase.
 * @module ai/keys/deriveKeyFromPassphrase
 */

/** PBKDF2 rounds: OWASP's 2023 figure for PBKDF2-HMAC-SHA256. */
const ITERATIONS = 600_000;

/** The salt used when the host passes none. */
const DEFAULT_SALT = "@graphty-ai-keys";

/**
 * Derive an encryption key from a passphrase the reader types, for
 * `ApiKeyManager.enablePersistence({ encryptionKey })`. Keys saved without one are only obscured:
 * the built-in key is public, so anyone with access to the page or the browser profile can read
 * them. Keys saved under a key derived from a passphrase the page never stores can only be read
 * by someone who knows the passphrase.
 *
 * The same passphrase and salt always give the same key, so a later page unlocks the keys by
 * deriving it again. The salt need not be secret; pass one per reader (an account id, or random
 * bytes the host keeps) so one guess cannot be tried against every reader at once.
 *
 * Uses WebCrypto PBKDF2-HMAC-SHA256 with 600,000 iterations, so it takes a noticeable fraction of
 * a second. While persistence is on, the manager keeps the derived key in `sessionStorage` until
 * the tab closes (see `PersistenceConfig.encryptionKey`).
 * @example
 * ```typescript
 * const keys = new ApiKeyManager();
 * keys.enablePersistence({ encryptionKey: await deriveKeyFromPassphrase(passphrase, userId) });
 * ```
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
