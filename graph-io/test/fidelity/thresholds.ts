/**
 * The style fidelity comparer's pass thresholds, one per scored property. A per-element value
 * passes when it is within its threshold; a property passes when every judged element does.
 * Distances are fractions of the reference drawing's diagonal; ratios are subject over reference
 * after the fitted scale; colors are CIEDE2000 differences.
 */
export const THRESHOLDS = {
    /** Node center residual after the similarity fit, over the reference diagonal. */
    position: 0.01,
    /** Drawn width and height ratio, each. */
    sizeRatio: [0.85, 1.18],
    /** Fill, border, label, edge and background colors. */
    colorDeltaE: 3,
    /** Fill and edge opacity, absolute. */
    opacity: 0.05,
    borderWidthRatio: [0.67, 1.5],
    fontSizeRatio: [0.8, 1.25],
    edgeWidthRatio: [0.67, 1.5],
    /** Discrete Frechet distance between the drawn edge paths, over the reference diagonal. */
    edgePath: 0.02,
    /** Points each edge path is resampled to, by arc length, before the Frechet distance. */
    pathSamples: 32,
    /** A group's member set must be equal. */
    groupJaccard: 1,
    /** Group box (and annotation box) intersection over union. */
    groupIoU: 0.8,
    /** Kendall tau of drawing order over the node pairs whose reference boxes overlap. */
    zOrderTau: 0.9,
} as const;
