/**
 * @file The limits a check uses when the caller names none.
 */

import type { ModelLimits } from "./types.js";

const MB = 1024 * 1024;

/** The limits a check uses when the caller names none. */
export const DEFAULT_MODEL_LIMITS: ModelLimits = Object.freeze({
    maxBytes: 32 * MB,
    maxTextBytes: 8 * MB,
    maxTriangles: 1_000_000,
    maxTextureBytes: 128 * MB,
    maxDecodedBytes: 256 * MB,
    maxTextureSize: 2048,
    fetchTimeoutMs: 30_000,
});
