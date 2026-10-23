import { createHash } from "node:crypto";

/**
 * The bytes of a file graphty.app already publishes, when they are exactly the ones recorded in the
 * repository (their SHA-256), else null: missing, unreachable or different bytes are never used.
 * @param {string} url - the published file
 * @param {string | undefined} sha256 - the checksum the repository records for it
 * @param {typeof fetch} [fetchImpl] - fetch, replaceable in tests
 * @returns {Promise<Buffer | null>} the verified bytes, or null
 */
export async function publishedCopy(url, sha256, fetchImpl = fetch) {
    if (sha256 === undefined) {
        return null;
    }
    try {
        const response = await fetchImpl(url, { headers: { "User-Agent": "graphty-graph-samples-build-hosted" } });
        if (!response.ok) {
            return null;
        }
        const bytes = Buffer.from(await response.arrayBuffer());
        return createHash("sha256").update(bytes).digest("hex") === sha256 ? bytes : null;
    } catch {
        return null;
    }
}
