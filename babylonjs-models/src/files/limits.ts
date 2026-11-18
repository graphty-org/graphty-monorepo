/**
 * @file The limits a check uses when the caller names none.
 */

import type { ModelLimits } from "./types.js";

const MB = 1024 * 1024;

/** The limits a check uses when the caller names none. */
export const DEFAULT_MODEL_LIMITS: ModelLimits = Object.freeze({
    maxBytes: 1024 * MB,
    // The longest string a browser holds (V8's 2^29 - 24 characters): longer text cannot be read.
    maxTextBytes: 2 ** 29 - 24,
    maxTriangles: 20_000_000,
    maxTextureBytes: 1024 * MB,
    maxDecodedBytes: 1024 * MB,
    maxTextureSize: 2048,
    fetchTimeoutMs: 30_000,
    maxFiles: 10_000,
    maxNodes: 10_000,
    maxMeshes: Number.POSITIVE_INFINITY,
    maxMaterials: 10_000,
    maxTextures: 10_000,
    maxAnimations: 10_000,
    maxMorphTargets: Number.POSITIVE_INFINITY,
    maxJoints: Number.POSITIVE_INFINITY,
});
