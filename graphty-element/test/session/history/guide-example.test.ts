/**
 * @file The runnable example of the "Undo and history" guide (`docs/guide/undo.md`), kept here so
 * the documented code keeps working. The body of each test is the guide's code with its comments
 * turned into assertions; the guide imports from `@graphty/graphty-element/session`, which is this
 * module.
 */

import { assert, describe, it } from "vitest";

import { COMMANDS, isSessionCommand } from "../../../commands";
import { createGraphSession } from "../../../src/session";

describe("the undo guide's example", () => {
    it("undoes and redoes edits, one step each, and groups a transaction into one", async () => {
        const session = createGraphSession();

        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await session.data.addEdges([
            { source: "a", target: "b" },
            { source: "b", target: "c" },
        ]);
        await session.data.updateNodes([{ id: "a", values: { team: "red" } }]);

        assert.deepEqual(
            session.history.steps.map((step) => step.label),
            ["Added 3 nodes", "Added 2 edges", "Edited 1 node"],
        );
        assert.isTrue(session.canUndo);
        assert.strictEqual(session.history.nextUndo?.kind, "undo");

        const undone = await session.undo();
        assert.strictEqual(undone.kind, "undone");
        assert.isUndefined(session.data.node("a")?.team);
        assert.isTrue(session.canRedo);

        await session.redo();
        assert.strictEqual(session.data.node("a")?.team, "red");

        // Several changes, one step: everything dispatched through `tx` is undone together.
        await session.transaction("Grow the chain", async (tx) => {
            await tx.data.addNodes([{ id: "d" }]);
            await tx.data.addEdges([{ source: "c", target: "d" }]);
        });
        assert.strictEqual(session.history.steps.at(-1)?.label, "Grow the chain");
        assert.strictEqual(session.data.statistics().nodeCount, 4);

        await session.undo();
        assert.strictEqual(session.data.statistics().nodeCount, 3);
        assert.strictEqual(session.data.statistics().edgeCount, 2);

        // A throw rolls every change of the transaction back and records nothing.
        const before = session.history.steps.length;
        let caught: unknown;
        try {
            await session.transaction("Half done", async (tx) => {
                await tx.data.addNodes([{ id: "e" }]);
                throw new Error("changed my mind");
            });
        } catch (error) {
            caught = error;
        }
        assert.instanceOf(caught, Error);
        assert.isUndefined(session.data.node("e"));
        assert.strictEqual(session.history.steps.length, before);

        // Back to where the session started.
        await session.history.restoreTo(null);
        assert.strictEqual(session.data.statistics().nodeCount, 0);
        assert.strictEqual(session.history.position, 0);

        session.dispose();
    });

    it("tells a mirror what changed and why", async () => {
        const session = createGraphSession();
        const seen: string[] = [];
        const stop = session.on("project:changed", ({ slices, cause }) => {
            seen.push(`${cause}:${slices.join(",")}`);
        });

        await session.data.addNodes([{ id: "a" }]);
        await session.undo();
        stop();

        assert.deepEqual(seen, ["command:graph", "undo:graph"]);
        session.dispose();
    });

    it("publishes whether each op is a step", () => {
        assert.deepEqual(COMMANDS["style.patch"], { undo: "undoable" });
        assert.strictEqual(COMMANDS["view.camera"].undo, "exempt");
        assert.isTrue(isSessionCommand({ op: "layout.set", id: "circular" }));
        assert.isFalse(isSessionCommand({ op: "no.such-op" }));
    });
});
