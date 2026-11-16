/**
 * @file Annotations: shapes, texts, arrows and pictures drawn beside the graph, kept as one graph
 * value so undo, redo, a project file and a replacing load take them with the rest of the graph.
 * Any caller writes them through the `annotations.set` and `annotations.patch` commands (a load
 * that reads a file's annotations included); the renderer draws whatever the value holds.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { GraphAnnotation, ImageAnnotation } from "@graphty/graph-io/styles";

/**
 * One annotation the element draws: a shape, a text, an arrow or a picture, in the graph's own
 * convention (y up), in units the value's `scale` turns into scene units.
 */
export type DrawnAnnotation = GraphAnnotation | ImageAnnotation;

/** The graph value the annotations are kept under. */
export const ANNOTATIONS_VALUE = "annotations";

/** The annotations, as the graph value holds them. */
export interface DrawnAnnotations {
    /** Scene units per annotation unit. */
    readonly scale: number;
    /** The annotations, in drawing order. */
    readonly annotations: readonly DrawnAnnotation[];
}

/** The kinds of annotation the element draws. */
const KINDS: ReadonlySet<string> = new Set(["shape", "text", "arrow", "image"]);

/**
 * The annotations a graph value holds, read defensively: anything else reads as none.
 * @param value - The graph value.
 * @returns The annotations, or null.
 */
export function drawnAnnotationsOf(value: unknown): DrawnAnnotations | null {
    const v = value as Partial<DrawnAnnotations> | null | undefined;
    return typeof v?.scale === "number" && Array.isArray(v.annotations) ? (v as DrawnAnnotations) : null;
}

/**
 * Why a list of annotations cannot be kept, or null when it can: each one an object with a
 * non-empty string id no other one shares, and a kind the element draws.
 * @param annotations - The annotations, from anywhere.
 * @returns A reason code, or null.
 */
export function annotationsProblem(annotations: unknown): string | null {
    if (!Array.isArray(annotations)) {
        return "not-a-list";
    }

    const ids = new Set<string>();
    for (const each of annotations as unknown[]) {
        if (typeof each !== "object" || each === null || Array.isArray(each)) {
            return "not-an-annotation";
        }

        const { id, kind } = each as { id?: unknown; kind?: unknown };
        if (typeof id !== "string" || id === "") {
            return "bad-id";
        }

        if (typeof kind !== "string" || !KINDS.has(kind)) {
            return "bad-kind";
        }

        if (ids.has(id)) {
            return "repeated-id";
        }

        ids.add(id);
    }

    return null;
}
