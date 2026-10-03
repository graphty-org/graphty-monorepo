/**
 * @file A small graph for the notes tests: nodes `a`, `b`, `c` and the number `11`, edges
 * `a -> b`, `b -> c` and two parallel `c -> 11`, and a session whose runs finish at once.
 */

import { isGraphtyError } from "../../../src/errors";
import { type Harness, makeSession } from "../helpers";
import { finishAtOnce } from "../runs/harness";

/**
 * Build the harness.
 * @param directed - Whether the graph is directed.
 * @returns The harness.
 */
export function notesHarness(directed = true): Harness {
    const harness = makeSession({ directed, runs: { execute: finishAtOnce } });
    harness.add(
        [{ id: "a" }, { id: "b" }, { id: "c" }, { id: 11 }],
        [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "c", dst: 11 },
            { src: "c", dst: 11 },
        ],
    );

    return harness;
}

/** What a refused call threw: its code and its `details`. */
export interface Refusal {
    readonly code: string;
    readonly details: Readonly<Record<string, unknown>>;
}

/**
 * Call something that should throw a `GraphtyError`.
 * @param call - The call.
 * @returns The code and details, or null when it did not throw.
 */
export function refusalOf(call: () => unknown): Refusal | null {
    try {
        call();
    } catch (error) {
        if (!isGraphtyError(error)) {
            throw error;
        }

        return { code: error.code, details: (error.details ?? {}) as Record<string, unknown> };
    }

    return null;
}
