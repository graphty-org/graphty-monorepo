/**
 * The sample library's words for a dataset's size, and graphty-element's own published limits
 * that decide whether a dataset is large, and whether the element opens it at all.
 */

import type { DatasetMeta } from "@graphty/graphty-element/catalog";
import { DEFAULT_LIMITS, type DefaultableLimits } from "@graphty/graphty-element/session";

/**
 * A count as the page writes it: "48,340".
 * @param count - The count.
 * @returns The words.
 */
export function countWords(count: number): string {
    return count.toLocaleString("en-US");
}

/**
 * A download size as the page writes it: "9.4 MB".
 * @param bytes - The size in bytes.
 * @returns The words.
 */
export function megabytes(bytes: number): string {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

/** The element's limits a size is judged against. */
type SizeLimits = Pick<DefaultableLimits, "renderCeiling" | "edgesDrawn" | "largeGraphThreshold">;

/**
 * Whether graphty-element holds a dataset this size: its ceilings, past which it declines the load.
 * @param dataset - The dataset.
 * @param limits - The ceilings in force; the start screens have no element, so the shipped ones by default.
 * @returns True when it does.
 */
export function fitsInBrowser(dataset: DatasetMeta, limits: SizeLimits = DEFAULT_LIMITS): boolean {
    return dataset.nodes <= limits.renderCeiling && dataset.edges <= limits.edgesDrawn;
}

/**
 * Whether a dataset is big enough that opening it is worth a word first: past the size at which
 * graphty-element starts drawing less detail.
 * @param dataset - The dataset.
 * @param limits - The limits in force; the shipped ones by default.
 * @returns True when it is.
 */
export function isLarge(dataset: DatasetMeta, limits: SizeLimits = DEFAULT_LIMITS): boolean {
    return dataset.nodes > limits.largeGraphThreshold || !fitsInBrowser(dataset, limits);
}
