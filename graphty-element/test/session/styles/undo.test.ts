/**
 * @file Style edits under undo: every edit is one step, a colour picker's drag is one step, undo
 * puts back the identical stack without compiling anything, and a verb's `Run` handle keeps the
 * meaning the design gives it (an aborted signal writes nothing; a cancel after the call keeps
 * the edit).
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import type { LayerSpec } from "../../../src/catalog/types";
import { createElementSession } from "../../../src/session/GraphSession";
import * as selector from "../../../src/session/styles/selector";
import type { StyleChange } from "../../../src/session/styles/StylesApi";
import type { ElementSession } from "../../../src/session/types";

vi.mock("../../../src/session/styles/selector", async (original) => {
    const actual = await original<typeof import("../../../src/session/styles/selector")>();

    return { ...actual, compileSelector: vi.fn(actual.compileSelector) };
});

/** A layer painting every node red. */
const RED: LayerSpec = { name: "Red", target: "node", selector: { match: "everything" }, set: { "node.color": "#ff0000" } };

const sessions: ElementSession[] = [];

afterEach(() => {
    for (const session of sessions.splice(0)) {
        session.dispose();
    }
});

/**
 * A session whose coalescing clock the test moves.
 * @returns The session and its clock.
 */
function clocked(): { session: ElementSession; advance: (ms: number) => void } {
    let now = 0;
    const session = createElementSession({}, { now: () => now });
    sessions.push(session);

    return {
        session,
        advance: (ms) => {
            now += ms;
        },
    };
}

describe("a style edit in the history", () => {
    it("is one labelled step, and undo and redo move the stack", async () => {
        const { session } = clocked();
        const before = session.styles.compiled();

        const layer = await session.styles.add(RED);

        assert.deepEqual(
            session.history.steps.map((step) => step.label),
            ['Added layer "Red"'],
        );
        assert.deepEqual(session.history.steps[0]?.ops, ["style.patch"]);
        assert.deepEqual(session.history.steps[0]?.slices, ["styles"]);

        await session.undo();
        assert.strictEqual(session.styles.compiled(), before);
        assert.isUndefined(session.styles.get(layer.id));

        await session.redo();
        assert.strictEqual(session.styles.get(layer.id)?.name, "Red");
    });

    it("makes a 60-frame colour drag one step, and undo restores the identical stack", async () => {
        const { session, advance } = clocked();
        const layer = await session.styles.add(RED);
        const beforeDrag = session.styles.compiled();

        for (let frame = 0; frame < 60; frame++) {
            advance(16);
            void session.styles.update(layer.id, { set: { "node.color": `#00${frame.toString(16).padStart(2, "0")}00` } });
        }

        await session.styles.settled();

        assert.lengthOf(session.history.steps, 2, "the add, then the whole drag");
        assert.strictEqual(session.styles.get(layer.id)?.set?.["node.color"], "#003b00");

        await session.undo();

        assert.strictEqual(session.styles.compiled(), beforeDrag, "the identical stack, not a copy");
    });

    it("does not merge an edit made after the window has lapsed", async () => {
        const { session, advance } = clocked();
        const layer = await session.styles.add(RED);

        await session.styles.update(layer.id, { set: { "node.color": "#00ff00" } });
        advance(5000);
        await session.styles.update(layer.id, { set: { "node.color": "#0000ff" } });

        assert.lengthOf(session.history.steps, 3);
    });

    it("compiles nothing on undo or redo: the restored layers are the compiled ones", async () => {
        const { session } = clocked();
        const layer = await session.styles.add(RED);
        await session.styles.update(layer.id, { selector: { match: "expression", where: "data.weight > `1`" } });
        const compile = vi.mocked(selector.compileSelector);
        assert.isAbove(compile.mock.calls.length, 0, "the edits themselves compiled their selectors");
        compile.mockClear();

        await session.undo();
        await session.undo();
        await session.redo();
        await session.redo();

        assert.strictEqual(compile.mock.calls.length, 0);
    });

    it("keeps the caller's objects out of state: a changed spec changes nothing", async () => {
        const { session } = clocked();
        const spec: LayerSpec = { name: "Mine", target: "node", selector: { match: "everything" }, set: { "node.color": "#ff0000" } };
        const userData = { expanded: true };

        const layer = await session.styles.add({ ...spec, userData });
        (spec.set as Record<string, unknown>)["node.color"] = "#000000";

        assert.strictEqual(session.styles.get(layer.id)?.set?.["node.color"], "#ff0000");
        assert.isFrozen(session.styles.get(layer.id)?.set);
        assert.isFrozen(session.styles.get(layer.id)?.selector);
        assert.strictEqual(session.styles.get(layer.id)?.userData, userData, "userData is carried by reference");
        assert.isNotFrozen(userData);
    });

    it("publishes one change per edit and one per step undone, each saying what caused it", async () => {
        const { session } = clocked();
        const seen: StyleChange[] = [];
        const stop = session.on("style:changed", (change) => {
            seen.push(change);
        });

        const layer = await session.styles.add(RED);
        await session.styles.remove(layer.id);
        await session.history.restoreTo(null);
        await session.redo();
        stop();

        assert.deepEqual(
            seen.map((change) => change.cause),
            ["command", "command", "restore", "restore", "redo"],
        );
        assert.deepEqual(seen[0]?.layers, [layer.id]);
    });
});

describe("a style verb's run", () => {
    it("writes nothing when its signal is already aborted", async () => {
        const { session } = clocked();
        const controller = new AbortController();
        controller.abort();

        const run = session.styles.add(RED, undefined, { signal: controller.signal });
        const outcome = await run.then(
            () => "resolved",
            (error: unknown) => (error as Error).name,
        );

        assert.strictEqual(outcome, "AbortError");
        assert.lengthOf(session.history.steps, 0);
        assert.isFalse(session.canUndo);
    });

    it("keeps the edit and its step when cancelled after the call", async () => {
        const { session } = clocked();

        const run = session.styles.add(RED);
        run.cancel();
        const layer = await run;

        assert.strictEqual(session.styles.get(layer.id)?.name, "Red");
        assert.lengthOf(session.history.steps, 1);
    });

    it("is never pending work in the history", () => {
        const { session } = clocked();

        void session.styles.add(RED);

        assert.lengthOf(session.history.pending, 0);
    });
});
