import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors";
import { EventManager } from "../../../src/managers/EventManager";
import { OperationQueueManager } from "../../../src/managers/OperationQueueManager";
import { Dispatcher, queueScheduler, type UndoableDefinition } from "../../../src/session/project/Dispatcher";
import { executions, gates, setup } from "./fake-commands";

/**
 * Settle a promise into what it resolved or rejected with, so a test can assert on a rejection
 * without an unhandled one.
 */
function outcome(promise: Promise<unknown>): Promise<{ value?: unknown; error?: unknown }> {
    return promise.then(
        (value) => ({ value }),
        (error: unknown) => ({ error }),
    );
}

/** Let every queued microtask and one macrotask run. */
function tick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

function isAbort(error: unknown, reason: string): boolean {
    return error instanceof DOMException && error.name === "AbortError" && error.message.includes(`(${reason})`);
}

describe("the queued lane", () => {
    it("executes a queued command on its turn, lists it as pending until then, and records one step", async () => {
        const { dispatcher, queue } = setup();

        const done = outcome(dispatcher.dispatch({ op: "fake.import", name: "flights" }));

        assert.deepEqual(executions, []);
        assert.deepEqual(
            dispatcher.pending.map((item) => item.label),
            ["Loaded flights"],
        );
        await queue.next();

        assert.deepEqual(await done, { value: undefined });
        assert.deepEqual(executions, ["import:flights"]);
        assert.strictEqual(dispatcher.state.config.get("graph"), "flights");
        assert.deepEqual(
            dispatcher.history.steps.map((step) => step.label),
            ["Loaded flights"],
        );
        assert.lengthOf(dispatcher.pending, 0);
    });

    it("collapses two dispatches with one queued coalesce key into one execution and one step", async () => {
        const { dispatcher, queue } = setup();

        const first = outcome(dispatcher.dispatch({ op: "fake.import", name: "a", element: true }));
        const second = outcome(dispatcher.dispatch({ op: "fake.import", name: "b", element: true }));
        assert.strictEqual(queue.slots.length, 1);
        await queue.next();

        assert.deepEqual(executions, ["import:b"]);
        assert.deepEqual(await first, { value: undefined });
        assert.deepEqual(await second, { value: undefined });
        assert.strictEqual(dispatcher.state.config.get("graph"), "b");
        assert.deepEqual(
            dispatcher.history.steps.map((step) => step.label),
            ["Loaded b"],
        );
    });

    it("does not collapse into a slot that has started, or across different keys", async () => {
        const { dispatcher, queue } = setup();

        const first = outcome(dispatcher.dispatch({ op: "fake.import", name: "a", element: true, gate: "a" }));
        const turn = queue.next();
        const second = outcome(dispatcher.dispatch({ op: "fake.import", name: "b", element: true }));
        const plain = outcome(dispatcher.dispatch({ op: "fake.import", name: "c" }));
        assert.strictEqual(queue.slots.length, 3);

        gates.open("a");
        await turn;
        await queue.next();
        await queue.next();

        await Promise.all([first, second, plain]);
        assert.deepEqual(executions, ["import:a", "import:b", "import:c"]);
        assert.lengthOf(dispatcher.history.steps, 3);
    });

    it("treats a slot the queue obsoletes before it starts as cancelled: nothing runs or records", async () => {
        const { dispatcher, queue } = setup();

        const done = outcome(dispatcher.dispatch({ op: "fake.run", id: "r" }));
        queue.obsolete("algorithm-run");

        const { error } = await done;
        assert.isTrue(isAbort(error, "obsolete"), String(error));
        assert.deepEqual(executions, []);
        assert.lengthOf(dispatcher.pending, 0);
        assert.lengthOf(dispatcher.history.steps, 0);
    });

    it("rolls back, never seals, a partial draft when the queue obsoletes a running writer", async () => {
        const { dispatcher, queue, published } = setup();

        const done = outcome(dispatcher.dispatch({ op: "fake.import", name: "big", gate: "chunk" }));
        const turn = queue.next();
        await tick();
        assert.strictEqual(dispatcher.state.config.get("graph"), "big:partial");

        queue.obsolete("data-add");
        const { error } = await done;
        await turn;

        assert.isTrue(isAbort(error, "obsolete"), String(error));
        assert.isFalse(dispatcher.state.config.has("graph"));
        assert.lengthOf(dispatcher.history.steps, 0);
        assert.deepEqual(published, [{ slices: ["config"], cause: "rollback" }]);

        // The writer's tail, arriving late, writes nothing.
        gates.open("chunk");
        await tick();
        assert.isFalse(dispatcher.state.config.has("graph"));
        assert.lengthOf(dispatcher.history.steps, 0);
    });
});

describe("key holds", () => {
    it("fails a dispatch needing an id a transaction holds at once, naming the transaction", async () => {
        const { dispatcher } = setup();
        let held: unknown;

        await dispatcher.transaction("Assistant message", async (tx) => {
            await tx.dispatch({ op: "fake.add-node", id: "x" });
            held = (await outcome(dispatcher.dispatch({ op: "fake.pin", id: "x" }))).error;
        });

        assert.isTrue(isGraphtyError(held) && held.code === "E_HELD_BY_TRANSACTION", String(held));
        assert.isTrue(isGraphtyError(held) && held.details?.transaction === "Assistant message");
        assert.include((held as Error).message, "Assistant message");
        assert.isFalse(dispatcher.state.config.has("pin/x"));
        assert.deepEqual(
            dispatcher.history.steps.map((step) => step.label),
            ["Assistant message"],
        );
    });

    it("fails a queued command needing a slice a transaction holds when its turn comes", async () => {
        const { dispatcher, queue } = setup();
        let release: () => void = () => undefined;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });

        const running = dispatcher.transaction("Message", async (tx) => {
            await tx.dispatch({ op: "fake.add-node", id: "x" });
            await gate;
        });
        const edge = outcome(dispatcher.dispatch({ op: "fake.add-edge", source: "x", target: "y" }));
        await queue.next();

        const { error } = await edge;
        assert.isTrue(isGraphtyError(error) && error.code === "E_HELD_BY_TRANSACTION", String(error));
        assert.deepEqual(executions, []);
        release();
        await running;
    });

    it("settles a transaction whose fn awaits an outside door on a key tx wrote, instead of hanging", async () => {
        const { dispatcher } = setup();

        const result = await dispatcher.transaction("Message", async (tx) => {
            await tx.dispatch({ op: "fake.add-node", id: "x" });
            const pinned = await outcome(dispatcher.dispatch({ op: "fake.pin", id: "x" }));
            await tx.dispatch({ op: "fake.pin", id: "x" });
            return pinned.error === undefined ? "pinned outside" : "refused outside";
        });

        assert.strictEqual(result, "refused outside");
        assert.isTrue(dispatcher.state.config.get("pin/x"));
        assert.lengthOf(dispatcher.history.steps, 1);
    });

    it("makes a dispatch needing an id a chunked writer holds wait, and land when the writer commits", async () => {
        const { dispatcher, queue } = setup();

        const load = outcome(dispatcher.dispatch({ op: "fake.import", name: "big", gate: "chunk" }));
        const turn = queue.next();
        await tick();
        const pinned = outcome(dispatcher.dispatch({ op: "fake.pin", id: "x" }));
        await tick();

        assert.isFalse(dispatcher.state.config.has("pin/x"));
        assert.deepEqual(
            dispatcher.pending.map((item) => item.label),
            ["Loaded big", "Pinned x"],
        );

        gates.open("chunk");
        await turn;
        assert.deepEqual(await load, { value: undefined });
        assert.deepEqual(await pinned, { value: undefined });
        assert.isTrue(dispatcher.state.config.get("pin/x"));
        assert.deepEqual(
            dispatcher.history.steps.map((step) => step.label),
            ["Loaded big", "Pinned x"],
        );
        assert.lengthOf(dispatcher.pending, 0);
    });

    it("drops a dispatch waiting on a chunked writer that rolls back", async () => {
        const { dispatcher, queue } = setup();

        const load = outcome(dispatcher.dispatch({ op: "fake.import", name: "big", gate: "chunk" }));
        void queue.next();
        await tick();
        const pinned = outcome(dispatcher.dispatch({ op: "fake.pin", id: "x" }));
        queue.obsolete("data-add");

        assert.isTrue(isAbort((await load).error, "obsolete"));
        assert.isTrue(isAbort((await pinned).error, "rollback"));
        assert.isFalse(dispatcher.state.config.has("pin/x"));
        assert.isFalse(dispatcher.state.config.has("graph"));
        assert.lengthOf(dispatcher.history.steps, 0);
        assert.lengthOf(dispatcher.pending, 0);
    });

    it("holds per id, so a small command on another id proceeds beside a writer", async () => {
        const { dispatcher } = setup();

        await dispatcher.transaction("Message", async (tx) => {
            await tx.dispatch({ op: "fake.add-node", id: "x" });
            await dispatcher.dispatch({ op: "fake.pin", id: "y" });
        });

        assert.isTrue(dispatcher.state.config.get("pin/y"));
        assert.deepEqual(
            dispatcher.history.steps.map((step) => step.label),
            ["Pinned y", "Message"],
        );
    });
});

describe("queueScheduler over the element's operation queue", () => {
    interface Load {
        readonly op: "load";
        readonly name: string;
    }

    interface Compute {
        readonly op: "compute";
    }

    const load: UndoableDefinition<Load> = {
        op: "load",
        undo: { kind: "undoable", label: (c) => `Loaded ${c.name}` },
        moves: false,
        keys: () => ["graph"],
        lane: { kind: "queued", category: "data-add" },
        execute(c, ctx) {
            ctx.draft.config.set("graph", c.name);
        },
    };

    const compute: UndoableDefinition<Compute> = {
        op: "compute",
        undo: { kind: "undoable", label: () => "Ran degree" },
        moves: false,
        keys: () => ["runs/degree"],
        lane: { kind: "queued", category: "algorithm-run" },
        execute() {
            throw new Error("an obsoleted run never executes");
        },
    };

    it("runs queued commands on the real queue, and its obsolescence rules cancel with reason obsolete", async () => {
        const queue = new OperationQueueManager(new EventManager());
        const dispatcher = new Dispatcher({ definitions: [load, compute], scheduler: queueScheduler(queue) });

        const run = outcome(dispatcher.dispatch({ op: "compute" }));
        const loaded = outcome(dispatcher.dispatch({ op: "load", name: "flights" }));

        assert.isTrue(isAbort((await run).error, "obsolete"), String((await run).error));
        assert.deepEqual(await loaded, { value: undefined });
        assert.strictEqual(dispatcher.state.config.get("graph"), "flights");
        assert.deepEqual(
            dispatcher.history.steps.map((step) => step.label),
            ["Loaded flights"],
        );
        queue.dispose();
    });
});
