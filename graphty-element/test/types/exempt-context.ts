/**
 * @file Compile-only: an exempt command cannot write project state.
 *
 * `tsc --noEmit` (the package's lint) checks this file. Each `@ts-expect-error` below is the
 * assertion: if an exempt command's context ever gains a draft, or state becomes writable
 * through it, the directive is unused and the compile fails.
 */

import type { ExemptDefinition, UndoableDefinition } from "../../src/session/project/Dispatcher";

interface Select {
    readonly op: "select";
    readonly id: string;
}

export const exemptCannotWrite: ExemptDefinition<Select> = {
    op: "select",
    undo: { kind: "exempt", reason: "Selection is not a step" },
    moves: false,
    keys: () => [],
    lane: { kind: "immediate" },
    execute(_command, ctx) {
        // @ts-expect-error an exempt command's context has no draft
        ctx.draft.styles = [];
        // @ts-expect-error project state is read-only outside a draft
        ctx.state.styles = [];
    },
};

export const undoableCanWrite: UndoableDefinition<Select> = {
    op: "select",
    undo: { kind: "undoable", label: (c) => `Selected ${c.id}` },
    moves: false,
    keys: () => ["styles"],
    lane: { kind: "immediate" },
    execute(_command, ctx) {
        ctx.draft.styles = [];
    },
};
