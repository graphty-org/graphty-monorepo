import { assert, describe, it } from "vitest";

import { executions, gates, setup, stackName } from "./fake-commands";

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

function isAbort(error: unknown, reason?: string): boolean {
    return (
        error instanceof DOMException &&
        error.name === "AbortError" &&
        (reason === undefined || error.message.includes(`(${reason})`))
    );
}

function labels(items: readonly { label: string }[]): string[] {
    return items.map((item) => item.label);
}

describe("history.pending", () => {
    it("lists queued work and open transactions in dispatch order, as one frozen array between changes", async () => {
        const { dispatcher } = setup();
        let release: () => void = () => undefined;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });

        const run = outcome(dispatcher.dispatch({ op: "fake.run", id: "degree" }));
        const message = dispatcher.transaction("Message", () => gate);

        const { pending } = dispatcher;
        assert.deepEqual(labels(pending), ["Ran degree", "Message"]);
        assert.isTrue(Object.isFrozen(pending) && Object.isFrozen(pending[0]));
        assert.strictEqual(dispatcher.pending, pending);
        assert.match(pending[0].since, /^\d{4}-\d{2}-\d{2}T/);

        await dispatcher.dispatch({ op: "fake.styles", name: "a" });
        assert.strictEqual(dispatcher.pending, pending, "an immediate step changes nothing pending");

        release();
        await message;
        assert.notStrictEqual(dispatcher.pending, pending);
        assert.deepEqual(labels(dispatcher.pending), ["Ran degree"]);
        dispatcher.cancel(dispatcher.pending[0].id);
        await run;
    });
});

describe("undo while work is pending", () => {
    it("cancels the newest pending work first, one press at a time, before undoing a step", async () => {
        const { dispatcher } = setup();
        await dispatcher.dispatch({ op: "fake.styles", name: "a" });
        const older = outcome(dispatcher.dispatch({ op: "fake.run", id: "older" }));
        const newer = outcome(dispatcher.dispatch({ op: "fake.run", id: "newer" }));

        const first = await dispatcher.undo();
        assert.strictEqual(first.kind, "cancelled");
        assert.deepEqual(first.kind === "cancelled" ? labels(first.pending) : [], ["Ran newer"]);
        assert.isTrue(isAbort((await newer).error, "undo"));
        assert.strictEqual(stackName(dispatcher), "a");

        const second = await dispatcher.undo();
        assert.deepEqual(second.kind === "cancelled" ? labels(second.pending) : [], ["Ran older"]);
        assert.isTrue(isAbort((await older).error, "undo"));

        const third = await dispatcher.undo();
        assert.strictEqual(third.kind, "undone");
        assert.isNull(stackName(dispatcher));
        assert.deepEqual(executions, []);
        assert.strictEqual((await dispatcher.undo()).kind, "nothing");
    });

    it("leaves work dispatched before the top step running through an undo and a redo", async () => {
        const { dispatcher, queue } = setup();
        const run = outcome(dispatcher.dispatch({ op: "fake.run", id: "betweenness", gate: "b" }));
        const turn = queue.next();
        await dispatcher.dispatch({ op: "fake.styles", name: "colour" });

        assert.strictEqual((await dispatcher.undo()).kind, "undone");
        assert.deepEqual(labels(dispatcher.pending), ["Ran betweenness"]);
        assert.strictEqual((await dispatcher.redo()).kind, "redone");
        assert.deepEqual(labels(dispatcher.pending), ["Ran betweenness"]);

        gates.open("b");
        await turn;
        assert.deepEqual(await run, { value: "betweenness" });
        assert.deepEqual(labels(dispatcher.history.steps), ["Styled colour", "Ran betweenness"]);
    });

    it("keeps an edit that would coalesce into the top step out of it once work was queued after that step", async () => {
        const { dispatcher } = setup();
        await dispatcher.dispatch({ op: "fake.config", key: "filter", value: "1" });
        const run = outcome(dispatcher.dispatch({ op: "fake.run", id: "slow" }));
        await dispatcher.dispatch({ op: "fake.config", key: "filter", value: "2" });
        assert.deepEqual(labels(dispatcher.history.steps), ["Set filter", "Set filter"], "a step of its own");

        assert.strictEqual((await dispatcher.undo()).kind, "undone", "the edit after the run goes first");
        assert.deepEqual(labels(dispatcher.pending), ["Ran slow"], "and the run survives it");
        assert.strictEqual((await dispatcher.undo()).kind, "cancelled", "then the run");
        assert.isTrue(isAbort((await run).error, "undo"));
    });

    it("records late work on top after an undo, discarding the redo tail", async () => {
        const { dispatcher, queue } = setup();
        const run = outcome(dispatcher.dispatch({ op: "fake.run", id: "slow", gate: "s" }));
        const turn = queue.next();
        await dispatcher.dispatch({ op: "fake.styles", name: "colour" });
        await dispatcher.undo();

        gates.open("s");
        await turn;
        await run;
        assert.deepEqual(labels(dispatcher.history.steps), ["Ran slow"]);
        assert.strictEqual(dispatcher.history.position, 1);
    });

    it("on redo, cancels only work dispatched after the undo", async () => {
        const { dispatcher } = setup();
        const before = outcome(dispatcher.dispatch({ op: "fake.run", id: "before" }));
        await dispatcher.dispatch({ op: "fake.styles", name: "a" });
        await dispatcher.undo();
        const after = outcome(dispatcher.dispatch({ op: "fake.run", id: "after" }));

        const first = await dispatcher.redo();
        assert.deepEqual(first.kind === "cancelled" ? labels(first.pending) : [], ["Ran after"]);
        assert.isTrue(isAbort((await after).error, "redo"));

        assert.strictEqual((await dispatcher.redo()).kind, "redone");
        assert.strictEqual(stackName(dispatcher), "a");
        assert.deepEqual(labels(dispatcher.pending), ["Ran before"]);
        dispatcher.cancel(dispatcher.pending[0].id);
        await before;
    });

    it("rule 0: aborts an open transaction holding an id the top step touched, then undoes the step", async () => {
        const { dispatcher } = setup();
        let release: () => void = () => undefined;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });

        // The message opens first, the reader adds x (a step), then the message writes on x.
        const message = outcome(
            dispatcher.transaction("Message", async (tx) => {
                await gate;
                await tx.dispatch({ op: "fake.pin", id: "x" });
                await new Promise(() => undefined);
            }),
        );
        await dispatcher.dispatch({ op: "fake.add-node", id: "x" });
        release();
        await tick();
        assert.isTrue(dispatcher.state.config.get("pin/x"));

        assert.deepEqual(dispatcher.nextUndo?.kind, "cancel");
        const first = await dispatcher.undo();
        assert.deepEqual(first.kind === "cancelled" ? labels(first.pending) : [], ["Message"]);
        assert.isTrue(isAbort((await message).error));
        assert.isFalse(dispatcher.state.config.has("pin/x"));
        assert.isTrue(dispatcher.state.config.get("node/x"));

        assert.strictEqual((await dispatcher.undo()).kind, "undone");
        assert.isFalse(dispatcher.state.config.has("node/x"));
    });

    it("rule 0: aborts an open transaction that has written graph rows since the top step", async () => {
        const { dispatcher } = setup();
        let release: () => void = () => undefined;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });

        const message = outcome(
            dispatcher.transaction("Message", async (tx) => {
                await gate;
                await tx.dispatch({ op: "fake.add-node", id: "z" });
                await new Promise(() => undefined);
            }),
        );
        await dispatcher.dispatch({ op: "fake.add-node", id: "y" });
        release();
        await tick();

        const first = await dispatcher.undo();
        assert.deepEqual(first.kind === "cancelled" ? labels(first.pending) : [], ["Message"]);
        assert.isTrue(isAbort((await message).error));
        assert.isFalse(dispatcher.state.config.has("node/z"));
    });

    it("rule 0 leaves an older transaction whose graph writes predate the step and touch other ids", async () => {
        const { dispatcher } = setup();
        let release: () => void = () => undefined;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });

        const message = dispatcher.transaction("Message", async (tx) => {
            await tx.dispatch({ op: "fake.add-node", id: "q" });
            await gate;
        });
        await dispatcher.dispatch({ op: "fake.add-node", id: "x" });

        assert.strictEqual((await dispatcher.undo()).kind, "undone");
        assert.isFalse(dispatcher.state.config.has("node/x"));
        assert.deepEqual(labels(dispatcher.pending), ["Message"]);
        release();
        await message;
        assert.deepEqual(labels(dispatcher.history.steps), ["Message"]);
    });
});

describe("history.nextUndo", () => {
    it("names what the next press will do, and is the identical value between changes", async () => {
        const { dispatcher } = setup();
        const nextUndo = (): typeof dispatcher.nextUndo => dispatcher.nextUndo;
        assert.isNull(nextUndo());

        await dispatcher.dispatch({ op: "fake.styles", name: "a" });
        const next = nextUndo();
        assert.strictEqual(next?.kind, "undo");
        assert.strictEqual(next?.kind === "undo" ? next.step.label : "", "Styled a");
        assert.strictEqual(nextUndo(), next);

        const run = outcome(dispatcher.dispatch({ op: "fake.run", id: "degree" }));
        const cancel = nextUndo();
        assert.strictEqual(cancel?.kind, "cancel");
        assert.deepEqual(cancel?.kind === "cancel" ? labels(cancel.pending) : [], ["Ran degree"]);
        assert.isTrue(Object.isFrozen(cancel));

        await dispatcher.undo();
        await run;
        assert.strictEqual(nextUndo()?.kind, "undo");
    });
});

describe("history.cancel", () => {
    it("cancels one pending item and every later item sharing its keys, and leaves the rest", async () => {
        const { dispatcher, queue } = setup();
        const nodes = outcome(dispatcher.dispatch({ op: "fake.import", name: "nodes" }));
        const run = outcome(dispatcher.dispatch({ op: "fake.run", id: "degree" }));
        const edge = outcome(dispatcher.dispatch({ op: "fake.add-edge", source: "x", target: "y" }));
        const [first] = dispatcher.pending;

        const cancelled = dispatcher.cancel(first.id);

        assert.deepEqual(labels(cancelled), ["Loaded nodes", "Added x-y"]);
        assert.isTrue(isAbort((await nodes).error, "cancel"));
        assert.isTrue(isAbort((await edge).error, "cancel"));
        assert.deepEqual(labels(dispatcher.pending), ["Ran degree"]);
        assert.deepEqual(dispatcher.cancel("pending-unknown"), []);

        await queue.next();
        assert.deepEqual(await run, { value: "degree" });
        assert.deepEqual(executions, ["run:degree"]);
    });

    it("cancels a waiting dispatch without running it", async () => {
        const { dispatcher, queue } = setup();
        const load = outcome(dispatcher.dispatch({ op: "fake.import", name: "big", gate: "chunk" }));
        const turn = queue.next();
        await tick();
        const pinned = outcome(dispatcher.dispatch({ op: "fake.pin", id: "x" }));

        const cancelled = dispatcher.cancel(dispatcher.pending[1].id);
        assert.deepEqual(labels(cancelled), ["Pinned x"]);
        assert.isTrue(isAbort((await pinned).error, "cancel"));

        gates.open("chunk");
        await turn;
        await load;
        assert.isFalse(dispatcher.state.config.has("pin/x"));
        assert.deepEqual(labels(dispatcher.history.steps), ["Loaded big"]);
    });
});

describe("deferred members", () => {
    it("waits for a transaction's non-run queued members before recording it", async () => {
        const { dispatcher, queue } = setup();

        const message = dispatcher.transaction("Message", (tx) => {
            void tx.dispatch({ op: "fake.import", name: "flights" });
            void tx.dispatch({ op: "fake.styles", name: "a" });
        });
        await tick();
        assert.lengthOf(dispatcher.history.steps, 0);

        await queue.next();
        await message;
        assert.deepEqual(labels(dispatcher.history.steps), ["Message"]);
        assert.deepEqual(dispatcher.history.steps[0].ops, ["fake.styles", "fake.import"]);
    });

    it("joins a run still going when fn settles to the transaction's step when it finishes", async () => {
        const { dispatcher, queue } = setup();
        let run: Promise<{ value?: unknown; error?: unknown }> | undefined;

        await dispatcher.transaction("Message", async (tx) => {
            run = outcome(tx.dispatch({ op: "fake.run", id: "degree", gate: "d" }));
            await tx.dispatch({ op: "fake.styles", name: "a" });
        });
        assert.deepEqual(labels(dispatcher.history.steps), ["Message"]);
        assert.deepEqual(labels(dispatcher.pending), ["Ran degree"]);

        const turn = queue.next();
        gates.open("d");
        await turn;

        assert.deepEqual(await run, { value: "degree" });
        assert.deepEqual(labels(dispatcher.history.steps), ["Message"]);
        assert.deepEqual(dispatcher.history.steps[0].ops, ["fake.styles", "fake.run"]);
        assert.lengthOf(dispatcher.pending, 0);

        await dispatcher.undo();
        assert.isNull(stackName(dispatcher));
        assert.isFalse(dispatcher.state.runs.has("degree"));
    });

    it("cancels a deferred member with the first press, and undoes its step with the second", async () => {
        const { dispatcher } = setup();
        let run: Promise<{ value?: unknown; error?: unknown }> | undefined;

        await dispatcher.transaction("Load", async (tx) => {
            run = outcome(tx.dispatch({ op: "fake.run", id: "degree" }));
            await tx.dispatch({ op: "fake.styles", name: "a" });
        });

        const first = await dispatcher.undo();
        assert.deepEqual(first.kind === "cancelled" ? labels(first.pending) : [], ["Ran degree"]);
        assert.isTrue(isAbort((await run)?.error, "undo"));
        assert.strictEqual(stackName(dispatcher), "a");

        assert.strictEqual((await dispatcher.undo()).kind, "undone");
        assert.isNull(stackName(dispatcher));
        assert.deepEqual(executions, []);
    });

    it("records a deferred member as its own step after the transaction's when others are on top", async () => {
        const { dispatcher, queue } = setup();

        await dispatcher.transaction("Load", async (tx) => {
            void tx.dispatch({ op: "fake.run", id: "degree" });
            await tx.dispatch({ op: "fake.styles", name: "a" });
        });
        const [load] = dispatcher.history.steps;
        await dispatcher.dispatch({ op: "fake.config", key: "bg", value: "red" });
        await queue.next();

        assert.deepEqual(labels(dispatcher.history.steps), ["Load", "Set bg", "Ran degree"]);
        assert.deepEqual(dispatcher.history.steps[2].provenance, { after: load.id });
    });

    it("cancels a transaction's queued members when it aborts, so they never execute", async () => {
        const { dispatcher, queue } = setup();
        let run: Promise<{ value?: unknown; error?: unknown }> | undefined;

        const failed = await outcome(
            dispatcher.transaction("Message", async (tx) => {
                run = outcome(tx.dispatch({ op: "fake.run", id: "degree" }));
                await tx.dispatch({ op: "fake.styles", name: "a" });
                throw new Error("the model failed");
            }),
        );

        assert.match(String(failed.error), /the model failed/);
        assert.isTrue(isAbort((await run)?.error, "rollback"));
        assert.strictEqual(queue.slots.length, 0);
        assert.deepEqual(executions, []);
        assert.isNull(stackName(dispatcher));
        assert.lengthOf(dispatcher.pending, 0);
    });
});
