/**
 * @file Kept sets as steps: every write door is one undoable step through the dispatcher, redo
 * puts back the id that was minted, the issued-id register and the order high-water mark are
 * never rewound, and what reads a set -- a style layer, the visibility filter, the resolution
 * cache -- follows undo and redo exactly as it follows a forward write
 * (design/sets/undo-integration.md sections 1 to 3 and 6).
 */

import { assert, describe, it } from "vitest";

import type { LayerSpec, NodeId, Scope } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import type { ScopeResolver } from "../../../src/session/scope";
import type { ElementSession } from "../../../src/session/types";
import { makeSession } from "../helpers";

const RED = "#ff0000";

/**
 * A session over a, b and c with a -> b.
 * @returns The session.
 */
function sessionOf(): ReturnType<typeof makeSession>["session"] {
    const harness = makeSession();
    harness.add([{ id: "a" }, { id: "b" }, { id: "c" }], [{ src: "a", dst: "b" }]);
    return harness.session;
}

/**
 * The code a call refused with.
 * @param call - The call.
 * @returns The code, or null when it did not refuse.
 */
function codeOf(call: () => unknown): string | null {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not-a-graphty-error";
    }

    return null;
}

/**
 * The ids a session's last passes painted red, sorted.
 * @param session - The session.
 * @returns The ids.
 */
function red(session: ElementSession): NodeId[] {
    const snapshot = session.data.snapshot();
    const found: NodeId[] = [];
    for (let index = 0; index < snapshot.nodeCount; index++) {
        if (session.paint.styleOf("node", index)["node.color"]?.hex === RED) {
            found.push(snapshot.ids.idOf(index));
        }
    }

    return found.sort();
}

/**
 * Settles at the end of the next paint pass: a layer naming a set repaints the rows whose
 * membership moved in a pass of its own, after the change that moved them.
 * @param session - The session.
 * @returns The promise.
 */
function nextPaint(session: ElementSession): Promise<void> {
    return new Promise((resolve) => {
        const stop = session.paint.onPainted(() => {
            stop();
            resolve();
        });
    });
}

/**
 * A layer painting a scope red.
 * @param scope - The scope.
 * @returns The layer.
 */
function redLayer(scope: Scope): LayerSpec {
    return { name: "Painted", selector: { match: "member", of: scope }, set: { "node.color": RED } };
}

describe("kept sets under undo", () => {
    it("brings a create back under the same id on redo, and puts a removed set back where it was listed", async () => {
        const session = sessionOf();
        const first = session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "First" });
        const second = session.sets.create({ kind: "fixed", nodes: ["b"], reading: "induced" }, { name: "Second" });

        await session.undo();
        assert.deepEqual(
            session.sets.list().map((set) => set.id),
            [first],
        );
        await session.redo();
        assert.deepEqual(
            session.sets.list().map((set) => set.id),
            [first, second],
            "redo puts back the id that was minted",
        );

        session.sets.remove(first);
        await session.undo();
        assert.deepEqual(
            session.sets.list().map((set) => set.id),
            [first, second],
            "undoing a removal lists the set where it was",
        );
        assert.strictEqual(
            session.history.steps[session.history.position]?.label,
            'Removed the set "First"',
            "the removal is the step to redo",
        );
        session.dispose();
    });

    it("never gives a new set the id of an undone or restored one: the register does not rewind", async () => {
        const session = sessionOf();
        const undone = session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "Core" });
        await session.undo();
        const next = session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "Core" });
        assert.notStrictEqual(next, undone, "an undone create's id stays issued");

        session.sets.remove(next);
        const again = session.sets.create({ kind: "fixed", nodes: ["b"], reading: "induced" }, { name: "Core" });
        assert.notStrictEqual(again, next, "a removed set's id stays issued");
        assert.notStrictEqual(again, undone);

        // Undo the create and the removal: the removed set is back, under its own id and order.
        await session.undo();
        await session.undo();
        assert.deepEqual(
            session.sets.list().map((set) => set.id),
            [next],
        );
        const later = session.sets.create({ kind: "fixed", nodes: ["c"], reading: "induced" }, { name: "Later" });
        assert.notStrictEqual(later, again, "nor does an undone create's");
        assert.isAbove(
            session.sets.get(later)?.order ?? 0,
            3,
            "and an order past every order held, the undone create's included",
        );
        session.dispose();
    });

    it("registers nothing a transaction that then fails created", async () => {
        const session = sessionOf();
        const failed = await session
            .transaction("Two sets", (tx) => {
                tx.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "Kept" });
                throw new Error("the rest of the transaction failed");
            })
            .then(
                () => null,
                (error: unknown) => (error as Error).message,
            );

        assert.strictEqual(failed, "the rest of the transaction failed");
        assert.deepEqual(session.sets.list(), []);
        assert.lengthOf(session.history.steps, 0);
        const id = session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "Kept" });
        assert.strictEqual(id, "set_kept", "the id the rolled-back create minted was never issued");
        session.dispose();
    });

    it("gives back the identical frozen record after a redefine is undone, and the cache hits it", async () => {
        const session = sessionOf();
        const id = session.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" }, { name: "Core" });
        const before = session.sets.get(id);
        const scope = session.scope as ScopeResolver;
        const resolved = scope.resolveNow({ set: id });

        session.sets.redefine(id, { kind: "fixed", nodes: ["c"], reading: "induced" });
        assert.strictEqual(scope.resolveNow({ set: id }).nodeCount, 1);
        await session.undo();

        assert.strictEqual(session.sets.get(id), before, "the same object, not an equal one");
        assert.isTrue(Object.isFrozen(before));
        assert.strictEqual(scope.resolveNow({ set: id }).digest, resolved.digest);
        session.dispose();
    });

    it("repaints a layer naming the set on undo of a redefine, and back on redo", async () => {
        const session = sessionOf() as ElementSession;
        const id = session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "Core" });
        await session.styles.add(redLayer({ set: id }));
        await session.styles.settled();
        assert.deepEqual(red(session), ["a"]);

        let painted = nextPaint(session);
        session.sets.redefine(id, { kind: "fixed", nodes: ["b", "c"], reading: "induced" });
        await painted;
        assert.deepEqual(red(session), ["b", "c"]);

        painted = nextPaint(session);
        await session.undo();
        await painted;
        assert.deepEqual(red(session), ["a"], "undo repaints what the set held before");

        painted = nextPaint(session);
        await session.redo();
        await painted;
        assert.deepEqual(red(session), ["b", "c"], "and redo what it holds after");
        session.dispose();
    });

    it("keeps a filter over a set right across redefine, undo and redo", async () => {
        const session = sessionOf();
        const id = session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "Core" });
        await session.visibility.set({ kind: "member", of: { set: id } });
        assert.strictEqual(session.visibility.summary.visibleNodes, 1);

        session.sets.redefine(id, { kind: "fixed", nodes: ["a", "b", "c"], reading: "induced" });
        assert.strictEqual(session.visibility.summary.visibleNodes, 3);

        await session.undo();
        assert.strictEqual(session.visibility.summary.visibleNodes, 1, "the masks the set's old members make");
        await session.redo();
        assert.strictEqual(
            session.visibility.summary.visibleNodes,
            3,
            "not the masks kept for the filter step before the redefine",
        );
        await session.undo();
        await session.undo();
        assert.strictEqual(session.visibility.summary.visibleNodes, 3, "no filter: everything shows");
        await session.redo();
        assert.strictEqual(session.visibility.summary.visibleNodes, 1, "the filter step's own masks again");
        session.dispose();
    });

    it("tells set:changed for undo and redo, and nothing for a rollback", async () => {
        const session = sessionOf();
        const heard: string[] = [];
        session.on("set:changed", (change) => {
            heard.push(`${change.change}:${change.cause}`);
        });

        session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "Core" });
        await session.undo();
        await session.redo();
        await session
            .transaction("Refused", (tx) => {
                tx.sets.create({ kind: "fixed", nodes: ["b"], reading: "induced" }, { name: "Gone" });
                throw new Error("refused");
            })
            .catch(() => undefined);

        assert.deepEqual(heard, ["created:command", "removed:undo", "created:redo"]);
        session.dispose();
    });

    it("answers from the slice at once, not from a cache taken before an undo", async () => {
        const session = sessionOf();
        const scope = session.scope as ScopeResolver;
        const id = session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "Core" });
        assert.strictEqual(scope.resolveNow({ set: id }).nodeCount, 1);

        const undone = session.undo();
        assert.strictEqual(
            codeOf(() => scope.resolveNow({ set: id })),
            "E_BAD_COMMAND",
        );
        await undone;

        const redone = session.redo();
        assert.strictEqual(scope.resolveNow({ set: id }).nodeCount, 1);
        await redone;
        session.dispose();
    });

    it("records a promoted selection as one set.create, and undo forgets it", async () => {
        const session = sessionOf();
        await session.selection.apply({ nodes: ["a", "c"] });

        const id = session.selection.promote("Picked");

        assert.lengthOf(session.history.steps, 1);
        assert.deepEqual(session.history.steps[0]?.ops, ["set.create"]);
        await session.undo();
        assert.deepEqual(session.sets.list(), []);
        await session.redo();
        assert.strictEqual(session.sets.list()[0]?.id, id);
        assert.deepEqual(session.sets.get(id)?.createdFrom, { kind: "selection" });
        session.dispose();
    });

    it("forwards the deprecated saved-scope doors to the set ops", async () => {
        const session = sessionOf();
        const id = session.scope.save("Core", { nodes: ["a", "b"] });
        assert.deepEqual(session.history.steps.at(-1)?.ops, ["set.create"]);

        session.scope.remove(id);
        assert.deepEqual(session.history.steps.at(-1)?.ops, ["set.remove"]);
        await session.undo();
        assert.deepEqual(
            session.scope.list().map((saved) => saved.id),
            [id],
        );
        session.dispose();
    });

    it("mints the id through execute, and refuses an id, an order or an origin from the caller", async () => {
        const session = sessionOf();

        const id = await session.execute({
            op: "set.create",
            name: "Core",
            definition: { kind: "fixed", nodes: ["a"], reading: "induced" },
        });
        assert.strictEqual(id, "set_core");

        for (const extra of [{ id: "set_mine" }, { order: 7 }, { createdFrom: { kind: "user" } }]) {
            const refused = await session
                .execute({
                    op: "set.create",
                    name: "Other",
                    definition: { kind: "fixed", nodes: ["b"], reading: "induced" },
                    ...extra,
                })
                .then(
                    () => null,
                    (error: unknown) => (isGraphtyError(error) ? error.code : "not-a-graphty-error"),
                );
            assert.strictEqual(refused, "E_BAD_COMMAND", JSON.stringify(extra));
        }

        assert.lengthOf(session.history.steps, 1, "a refused create records nothing");
        session.dispose();
    });
});
