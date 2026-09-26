/**
 * @file Every command declares how it behaves under undo, and every undoable one is covered.
 *
 * `satisfies` in `commands.ts` makes an op with no `COMMANDS` entry a compile error; this checks
 * the rest at run time: the published table and the dispatcher's definitions agree op for op,
 * exempt ops say why, and every undoable op has a round-trip fixture for every value of its
 * argument's discriminant (read from the definition's `variants`, never written again here),
 * with a renderer fixture when it changes what is drawn. An op whose every door is still
 * `knownGap` is not yet reachable through the history, so its fixture checks are pending, named
 * with the phase that ports it. The checks that need a slice (design/undo/undo-design.md section
 * 12.2) are written here and skip, naming the phase that brings the slice.
 */

import { assert, describe, it } from "vitest";

import { type CommandMeta, COMMANDS } from "../../../commands";
import { DOOR_ROOTS, PHASES } from "../../../src/session/commands/doors";
import { DEFINITIONS } from "../../../src/session/commands/index";
import { FIXTURES } from "./fixtures";

/** The published table, as entries. */
const PUBLISHED = Object.entries(COMMANDS) as [string, CommandMeta][];

/**
 * The phase that ports the first door of `op`, when no door dispatches it yet.
 * @param op - The op.
 * @returns The phase, or null when some door dispatches it.
 */
function pendingPhase(op: string): string | null {
    const doors = DOOR_ROOTS.flatMap((root) => Object.values(root.doors ?? {}));
    if (doors.some((door) => (door.kind === "dispatches" || door.kind === "partial") && door.op === op)) {
        return null;
    }

    const phases = doors.flatMap((door) => (door.kind === "knownGap" && door.op === op ? [door.phase] : []));
    return phases.sort((a, b) => PHASES.indexOf(a) - PHASES.indexOf(b))[0] ?? null;
}

describe("the vocabulary", () => {
    it("has a definition for every published op, and a published entry for every definition", () => {
        const defined = DEFINITIONS.map((definition) => definition.op).sort();
        const published = PUBLISHED.map(([op]) => op).sort();

        assert.deepEqual(defined, published);
        assert.strictEqual(new Set(defined).size, defined.length, "one definition per op");
    });

    it("agrees with each definition on whether the op is undoable", () => {
        for (const definition of DEFINITIONS) {
            assert.strictEqual(COMMANDS[definition.op].undo, definition.undo.kind, definition.op);
        }
    });

    it("gives every exempt op a reason, in the table and in its definition", () => {
        for (const [op, meta] of PUBLISHED) {
            if (meta.undo === "exempt") {
                assert.isNotEmpty(meta.reason.trim(), op);
            }
        }

        for (const definition of DEFINITIONS) {
            if (definition.undo.kind === "exempt") {
                assert.isNotEmpty(definition.undo.reason.trim(), definition.op);
            }
        }
    });

    it("has fixtures only for ops in the vocabulary and values of their discriminant", () => {
        for (const fixture of FIXTURES) {
            const definition = DEFINITIONS.find((each) => each.op === fixture.command.op);
            assert.isDefined(definition, `${fixture.name} runs an op outside the vocabulary`);
            if (definition.variants !== undefined) {
                assert.include(definition.variants, fixture.variant, fixture.name);
            }
        }
    });

    for (const definition of DEFINITIONS.filter((each) => each.undo.kind === "undoable")) {
        const pending = pendingPhase(definition.op);
        const variants = definition.variants ?? [undefined];
        const covers = (tag: "session" | "renderer"): (string | undefined)[] =>
            variants.filter(
                (variant) =>
                    !FIXTURES.some(
                        (fixture) =>
                            fixture.command.op === definition.op &&
                            fixture.variant === variant &&
                            fixture.tags.includes(tag),
                    ),
            );

        const fixtureTitle = `${definition.op} has a round-trip fixture for every value of its discriminant`;
        if (pending === null) {
            it(fixtureTitle, () => {
                assert.deepEqual(covers("session"), [], `${definition.op}: values with no session fixture`);
            });
        } else {
            it.skip(`${fixtureTitle} (pending: its doors are ported in phase ${pending})`, () => undefined);
        }

        if (definition.draws === true) {
            const rendererTitle = `${definition.op} changes what is drawn, so it has a renderer fixture for every value`;
            if (pending === null) {
                it(rendererTitle, () => {
                    assert.deepEqual(covers("renderer"), [], `${definition.op}: values with no renderer fixture`);
                });
            } else {
                it.skip(`${rendererTitle} (pending: phase ${pending})`, () => undefined);
            }
        }
    }

    it.skip("exempt ops leave the state digest unchanged when dispatched (the first exempt op, view.camera, arrives in phase 9)", () =>
        undefined);

    it.skip("config.set names only ProjectConfig keys, and each exempt layout-behaviour key leaves the digest unchanged (phase 10)", () =>
        undefined);

    it.skip("every leaf of the DataConfig schema is a config slice key or exempt with a reason (phase 10)", () =>
        undefined);

    it.skip("view.immersive from 2D and from 3D, and layout.transport, leave the state digest unchanged (phase 17)", () =>
        undefined);

    it.skip("the dimension fields of Styles.config.graph are written only by the layout hook and agree with layout.dimension (phase 17)", () =>
        undefined);
});
