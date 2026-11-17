/**
 * @file The limits a check uses when the caller names none.
 */

import type { ModelLimits } from "./types.js";

const MB = 1024 * 1024;

/** The limits a check uses when the caller names none. */
export const DEFAULT_MODEL_LIMITS: ModelLimits = Object.freeze({
    maxBytes: 1024 * MB,
    maxTextBytes: 8 * MB,
    maxTriangles: 20_000_000,
    maxTextureBytes: 1024 * MB,
    maxDecodedBytes: 1024 * MB,
    maxTextureSize: 2048,
    fetchTimeoutMs: 30_000,
    maxFiles: 10_000,
    maxNodes: 10_000,
    maxMeshes: 1_000,
    maxMaterials: 10_000,
    maxTextures: 10_000,
    maxAnimations: 10_000,
    maxMorphTargets: 64,
    maxJoints: 256,
});
