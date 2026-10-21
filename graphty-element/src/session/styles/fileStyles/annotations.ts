/**
 * @file The annotations a file draws beside its graph (shapes, text notes, arrows), kept as a
 * graph value by the load that read them, so undo, redo and a replacing load take them with the
 * rest of the graph. The renderer draws whatever the value holds.
 */

import type { GraphAnnotation, ImageAnnotation } from "@graphty/graph-io/styles";

/** One annotation the element draws: a shape, a text, an arrow or a picture. */
export type DrawnAnnotation = GraphAnnotation | ImageAnnotation;

/** The graph value a load's annotations are kept under. */
export const ANNOTATIONS_VALUE = "annotations";

/** A load's annotations, as the graph value holds them. */
export interface DrawnAnnotations {
    /** Scene units per file unit: the scale the file's stored node positions are drawn at. */
    readonly scale: number;
    /** The annotations, in the file's convention: y up, file units. */
    readonly annotations: readonly DrawnAnnotation[];
}

/**
 * The annotations a graph value holds, read defensively: anything else reads as none.
 * @param value - The graph value.
 * @returns The annotations, or null.
 */
export function drawnAnnotationsOf(value: unknown): DrawnAnnotations | null {
    const v = value as Partial<DrawnAnnotations> | null | undefined;
    return typeof v?.scale === "number" && Array.isArray(v.annotations) ? (v as DrawnAnnotations) : null;
}
