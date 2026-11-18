/**
 * @file The annotation ops, each one undoable step on the immediate lane:
 *
 * - `annotations.set`: replace every annotation (an empty list removes them all).
 * - `annotations.patch`: add one, change one by id, or remove one by id.
 *
 * The annotations are the `annotations` graph value (`../annotations`), so a project file saves
 * them and a replacing load sweeps them with the rest of the graph.
 */

import { GraphtyError } from "../../errors/GraphtyError";
import { ANNOTATIONS_VALUE, annotationsProblem, type DrawnAnnotation, drawnAnnotationsOf } from "../annotations";
import type { UndoableContext, UndoableDefinition } from "../project/Dispatcher";
import { serviceOf } from "./data";

/** `annotations.set`: replace every annotation. */
interface AnnotationsSetCommand {
    readonly op: "annotations.set";
    /** The annotations, in drawing order; an empty list removes them all. */
    readonly annotations: readonly DrawnAnnotation[];
    /** Scene units per annotation unit; 1 when absent. */
    readonly scale?: number;
}

/** `annotations.patch`: one change to one annotation. */
type AnnotationsPatchCommand =
    | { readonly op: "annotations.patch"; readonly action: "add"; readonly annotation: DrawnAnnotation }
    | {
          readonly op: "annotations.patch";
          readonly action: "update";
          readonly id: string;
          /** Applied over the annotation one key deep; its `id` and `kind` stay. */
          readonly patch: Readonly<Record<string, unknown>>;
      }
    | { readonly op: "annotations.patch"; readonly action: "remove"; readonly id: string };

/** Every annotation op. */
export type AnnotationsCommand = AnnotationsSetCommand | AnnotationsPatchCommand;

/**
 * A refusal of a malformed annotation command.
 * @param reason - What is wrong, as a code-like word.
 * @param details - The values it is about.
 * @returns The error.
 */
function refused(reason: string, details: Readonly<Record<string, unknown>> = {}): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_COMMAND",
        message: `The annotations cannot be kept (${reason}).`,
        source: "data",
        details: { reason, ...details },
    });
}

/**
 * Check and write the annotations.
 * @param annotations - The annotations.
 * @param scale - Scene units per annotation unit.
 * @param ctx - The command's context.
 */
function write(annotations: readonly unknown[], scale: number, ctx: UndoableContext): void {
    const problem = annotationsProblem(annotations);
    if (problem !== null) {
        throw refused(problem);
    }

    if (!Number.isFinite(scale) || scale <= 0) {
        throw refused("bad-scale", { scale });
    }

    const value =
        annotations.length === 0
            ? undefined
            : Object.freeze({ scale, annotations: Object.freeze([...(annotations as DrawnAnnotation[])]) });
    const service = serviceOf(ctx.services.data);
    if (service.values === undefined) {
        throw new GraphtyError({
            code: "E_UNSUPPORTED",
            message: "This session cannot write graph values, so it cannot keep annotations.",
            source: "data",
        });
    }

    service.values({ [ANNOTATIONS_VALUE]: value }, ctx.draft);
}

const annotationsSet: UndoableDefinition<AnnotationsSetCommand> = {
    op: "annotations.set",
    undo: {
        kind: "undoable",
        label: () => "Set the annotations",
        fact: (command) => ({
            code: "annotations.set",
            params: { count: Array.isArray(command.annotations) ? command.annotations.length : 0 },
        }),
    },
    moves: false,
    keys: () => [`graph/v:${ANNOTATIONS_VALUE}`],
    lane: { kind: "immediate" },
    execute: (command, ctx) => {
        write(command.annotations, command.scale ?? 1, ctx);
    },
};

/** What each annotation change is called in a history list. */
const PATCH_LABELS: Readonly<Record<AnnotationsPatchCommand["action"], string>> = {
    add: "Added an annotation",
    update: "Changed an annotation",
    remove: "Removed an annotation",
};

const annotationsPatch: UndoableDefinition<AnnotationsPatchCommand> = {
    op: "annotations.patch",
    variants: ["add", "update", "remove"],
    undo: {
        kind: "undoable",
        label: (command) => PATCH_LABELS[command.action],
        fact: (command) => ({
            code: "annotations.patch",
            params: {
                action: command.action,
                id: command.action === "add" ? ((command.annotation as { id?: string }).id ?? null) : command.id,
            },
        }),
    },
    moves: false,
    keys: () => [`graph/v:${ANNOTATIONS_VALUE}`],
    lane: { kind: "immediate" },
    execute: (command, ctx) => {
        const held = drawnAnnotationsOf(ctx.state.graph.values.get(ANNOTATIONS_VALUE));
        const list: readonly DrawnAnnotation[] = held?.annotations ?? [];
        const scale = held?.scale ?? 1;
        if (command.action === "add") {
            write([...list, command.annotation], scale, ctx);
            return;
        }

        const at = list.findIndex((each) => each.id === command.id);
        if (at === -1) {
            throw refused("no-such-annotation", { id: command.id, available: list.map((each) => each.id) });
        }

        if (command.action === "remove") {
            write([...list.slice(0, at), ...list.slice(at + 1)], scale, ctx);
            return;
        }

        const changed = { ...list[at], ...command.patch, id: list[at].id, kind: list[at].kind };
        write([...list.slice(0, at), changed, ...list.slice(at + 1)], scale, ctx);
    },
};

/** The annotation ops' definitions. */
export const ANNOTATIONS_DEFINITIONS = [annotationsSet, annotationsPatch] as const;
