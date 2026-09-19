/** ForceAtlas2 defaults (design 7.14, 7.17, 7.19); the same values as the GPU package's FA2_DEFAULTS. */
export const FA2_DEFAULTS = Object.freeze({
    maxIter: 100,
    jitterTolerance: 1,
    scalingRatio: 2,
    gravity: 1,
    strongGravity: false,
    distributedAction: false,
    linlog: false,
    dissuadeHubs: false,
    dim: 2 as 2 | 3,
    scale: 1,
    settleThreshold: 0.001,
    settleWindow: 10,
    iterationsPerStep: 1,
});
/** The distance floor `max(d, 0.01)` of design 7.2 (webgpu-graph-algorithms/src/constants.ts:110). */
export const FA2_DISTANCE_FLOOR = 0.01;
/** The square of FA2_DISTANCE_FLOOR. */
export const FA2_DISTANCE_FLOOR_SQ = 0.0001;
/** The coincident threshold `d^2 < 1e-8` of design 7.2 (webgpu-graph-algorithms/src/constants.ts:114). */
export const FA2_COINCIDENT_SQ = 1e-8;
/** The lane count of the oracle's fold order (webgpu-graph-algorithms/src/constants.ts:9 WORKGROUP_SIZE); kept so the two f64 transcriptions sum in the same order. */
export const FA2_FOLD_LANES = 256;
