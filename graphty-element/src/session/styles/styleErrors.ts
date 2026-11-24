/**
 * The refusals the style stack rejects a call with, built in one place so every door spells them
 * the same way.
 */
import type { LayerId } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import type { CodedFactParam } from "../shared";
import type { Layer, ValidationResult } from "./Layer";
import type { Rows, StyleRowId } from "./tree";

/**
 * The refusal a call naming a layer the stack does not hold gets.
 * @param id - The id that was named.
 * @param known - Every id the stack does hold.
 * @returns The error to reject with.
 */
export function unknownLayer(id: LayerId, known: readonly LayerId[]): GraphtyError {
    return new GraphtyError({
        code: "E_UNKNOWN_LAYER",
        message: `There is no style layer with the id "${id}".`,
        source: "style",
        target: { kind: "layer", id },
        details: { id, known },
    });
}

/**
 * The refusal a call that would change a layer the reader locked gets.
 * @param layer - The layer it named.
 * @param row - The locked row: the layer's own, or a folder holding it.
 * @returns The error to reject with.
 */
export function readerLocked(layer: Layer, row: StyleRowId): GraphtyError {
    return new GraphtyError({
        code: "E_LOCKED",
        message: `"${layer.name}" is locked. Unlock it before changing it.`,
        source: "style",
        target: { kind: "layer", id: layer.id },
        details: { id: layer.id, row },
    });
}

/**
 * The refusal a call naming a row the style tree does not hold gets.
 * @param id - The id that was named.
 * @param rows - The tree.
 * @returns The error to reject with.
 */
export function unknownRow(id: StyleRowId, rows: Rows): GraphtyError {
    const known: string[] = [];
    const walk = (list: Rows): void => {
        for (const row of list) {
            known.push(row.id);
            walk(row.children ?? []);
        }
    };
    walk(rows);
    return new GraphtyError({
        code: "E_UNKNOWN_LAYER",
        message: `There is no style row with the id "${id}".`,
        source: "style",
        details: { id, known },
    });
}

/**
 * The refusal a specification the check rejected gets.
 *
 * The code is the FIRST problem's, so a consumer switching on it sees the reason a person would
 * name, and every problem travels in `details.errors` so a form can mark them all at once.
 * @param name - What the layer was called, for the message.
 * @param result - The verdict.
 * @returns The error to reject with.
 */
export function refusedSpec(name: string, result: ValidationResult): GraphtyError {
    const first = result.errors[0];

    return new GraphtyError({
        code: first?.code ?? "E_BAD_LAYER",
        message: `"${name}" cannot be a style layer: ${first?.message ?? "the specification is malformed."}`,
        source: "style",
        details: {
            errors: result.errors,
            unresolvedPaths: result.unresolvedPaths,
            // A refused data spec says why as a reason an editor switches on.
            ...(first?.reason === undefined ? {} : { reason: first.reason }),
            ...(first?.channels === undefined ? {} : { channels: first.channels }),
        },
    });
}

/**
 * The refusal a call the session cannot make sense of gets.
 * @param message - What is wrong, in a sentence.
 * @param details - The offending values, for an editor that points at them.
 * @returns The error to reject with.
 */
export function badCommand(message: string, details: Readonly<Record<string, unknown>>): GraphtyError {
    return new GraphtyError({ code: "E_BAD_COMMAND", message, source: "style", details });
}

/**
 * An error's details as a coded fact's params: the plain values only.
 * @param details - The details.
 * @returns The params.
 */
export function plainParams(details: unknown): Record<string, CodedFactParam> {
    const params: Record<string, CodedFactParam> = {};
    for (const [key, value] of Object.entries((details ?? {}) as Record<string, unknown>)) {
        const plain = (entry: unknown): boolean =>
            entry === null || ["string", "number", "boolean"].includes(typeof entry);
        if (plain(value) || (Array.isArray(value) && value.every((entry) => plain(entry)))) {
            params[key] = value as CodedFactParam;
        }
    }

    return params;
}

/**
 * The refusal a run-bound verb gets in a session that cannot look a run up.
 * @param verb - What was being attempted.
 * @returns The error to reject with.
 */
export function noRuns(verb: string): GraphtyError {
    return new GraphtyError({
        code: "E_UNSUPPORTED",
        message:
            `This session cannot look a run up, so styles.${verb}() has nothing to bind to. ` +
            "Add a layer of your own with styles.add() instead.",
        source: "style",
        details: { op: `styles.${verb}`, reason: "no runs are reachable from this session" },
    });
}
