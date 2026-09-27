/**
 * @file Which undoable ops are not yet reachable through the history: every door that will
 * dispatch one is still a `knownGap` in the door list (`src/session/commands/doors.ts`), so no
 * round-trip fixture can reach it. The vocabulary test reports them, and the no-skips test fails
 * while the list is not empty.
 */

import { DOOR_ROOTS, PHASES } from "../../../src/session/commands/doors";
import { DEFINITIONS } from "../../../src/session/commands/index";

/**
 * The phase that ports the first door of `op`, when no door dispatches it yet.
 * @param op - The op.
 * @returns The phase, or null when some door dispatches it.
 */
export function pendingPhase(op: string): string | null {
    const doors = DOOR_ROOTS.flatMap((root) => Object.values(root.doors ?? {}));
    if (doors.some((door) => (door.kind === "dispatches" || door.kind === "partial") && door.op === op)) {
        return null;
    }

    const phases = doors.flatMap((door) => (door.kind === "knownGap" && door.op === op ? [door.phase] : []));
    return phases.sort((a, b) => PHASES.indexOf(a) - PHASES.indexOf(b))[0] ?? null;
}

/**
 * Every undoable op still pending, with the phase that ports it.
 * @returns The ops, as `op (phase N)`.
 */
export function pendingOps(): string[] {
    return DEFINITIONS.filter((definition) => definition.undo.kind === "undoable").flatMap((definition) => {
        const phase = pendingPhase(definition.op);
        return phase === null ? [] : [`${definition.op} (phase ${phase})`];
    });
}
