import { assert, describe, it } from "vitest";

import { Dispatcher } from "../../../src/session/project/Dispatcher";
import { setup } from "./fake-commands";

/**
 * Wire a dispatcher's events, a derivation hook and the caller into one log, in the order they
 * happen.
 */
function trace(dispatcher: Dispatcher, log: string[]): void {
    for (const slice of ["styles", "config"] as const) {
        dispatcher.lane.register(slice, () => {
            log.push(`pass:${slice}`);
        });
    }

    dispatcher.events.project = (change) => log.push(`project:${change.cause}:${change.slices.join(",")}`);
    dispatcher.events.history = (reason) => log.push(`history:${reason}`);
    dispatcher.events.derived = (change) => log.push(`domain:${change.cause}:${change.slices.join(",")}`);
}

describe("event order", () => {
    it("publishes project:changed and history:changed at once, the domain events after the pass, the promise last", async () => {
        const { dispatcher } = setup();
        const log: string[] = [];
        trace(dispatcher, log);

        const done = dispatcher.dispatch({ op: "fake.styles", name: "a" }).then(() => log.push("promise"));
        assert.deepEqual(log, ["project:command:styles", "history:record"], "synchronous events before any pass");
        await done;
        assert.deepEqual(log, [
            "project:command:styles",
            "history:record",
            "pass:styles",
            "domain:command:styles",
            "promise",
        ]);
    });

    it("keeps the same order for undo and redo, which act at call time", async () => {
        const { dispatcher } = setup();
        await dispatcher.dispatch({ op: "fake.styles", name: "a" });
        const log: string[] = [];
        trace(dispatcher, log);

        const undone = dispatcher.undo().then((outcome) => log.push(`promise:${outcome.kind}`));
        assert.deepEqual(log, ["project:undo:styles", "history:undo"]);
        assert.strictEqual(dispatcher.history.position, 0);
        await undone;
        assert.deepEqual(log.slice(2), ["pass:styles", "domain:undo:styles", "promise:undone"]);

        log.length = 0;
        await dispatcher.redo().then((outcome) => log.push(`promise:${outcome.kind}`));
        assert.deepEqual(log, [
            "project:redo:styles",
            "history:redo",
            "pass:styles",
            "domain:redo:styles",
            "promise:redone",
        ]);
    });

    it("publishes one domain event per step undone when one pass covers several", async () => {
        const { dispatcher, clock } = setup();
        await dispatcher.dispatch({ op: "fake.styles", name: "a" });
        clock.advance(5000);
        await dispatcher.dispatch({ op: "fake.config", key: "bg", value: "red" });
        const log: string[] = [];
        trace(dispatcher, log);

        const first = dispatcher.undo();
        const second = dispatcher.undo();
        await Promise.all([first, second]);
        assert.deepEqual(log, [
            "project:undo:config",
            "history:undo",
            "project:undo:styles",
            "history:undo",
            "pass:config",
            "pass:styles",
            "domain:undo:config",
            "domain:undo:styles",
        ]);
    });

    it("runs an undo called from a history:changed listener after the current call returns", async () => {
        const { dispatcher, clock } = setup();
        await dispatcher.dispatch({ op: "fake.styles", name: "a" });
        clock.advance(5000);
        await dispatcher.dispatch({ op: "fake.styles", name: "b" });
        const log: string[] = [];
        let nested: Promise<unknown> | undefined;
        dispatcher.events.history = (reason) => {
            log.push(`history:${reason}:${dispatcher.history.position}`);
            nested ??= dispatcher.undo().then((outcome) => log.push(`nested:${outcome.kind}`));
        };

        const outer = dispatcher.undo();
        log.push("returned");
        assert.deepEqual(log, ["history:undo:1", "returned"], "the nested undo has not acted yet");
        assert.strictEqual(dispatcher.history.position, 1);
        await outer;
        await nested;
        assert.deepEqual(log, ["history:undo:1", "returned", "history:undo:0", "nested:undone"]);
        assert.strictEqual(dispatcher.history.position, 0);
    });

    it("publishes a rollback of live writes with cause rollback, and rejects after the pass", async () => {
        const { dispatcher, queue } = setup();
        const log: string[] = [];
        trace(dispatcher, log);

        const load = dispatcher
            .dispatch({ op: "fake.import", name: "big", gate: "g" })
            .catch(() => log.push("rejected"));
        void queue.next();
        await new Promise((resolve) => setTimeout(resolve, 0));
        log.length = 0;
        const outcome = await dispatcher.undo();
        assert.strictEqual(outcome.kind, "cancelled");
        await load;
        assert.deepEqual(log, [
            "project:rollback:config",
            "history:pending",
            "pass:config",
            "domain:rollback:config",
            "rejected",
        ]);
    });

    it("restores to a step and to the baseline in one pass, with cause restore", async () => {
        const { dispatcher, clock } = setup();
        const ids: string[] = [];
        for (const name of ["a", "b", "c"]) {
            await dispatcher.dispatch({ op: "fake.styles", name });
            ids.push(dispatcher.history.steps.at(-1)?.id ?? "");
            clock.advance(5000);
        }

        const log: string[] = [];
        trace(dispatcher, log);
        const outcome = await dispatcher.restoreTo(ids[0]);
        assert.strictEqual(outcome.kind, "restored");
        assert.deepEqual(log, [
            "project:restore:styles",
            "history:restore",
            "pass:styles",
            "domain:restore:styles",
            "domain:restore:styles",
        ]);
        assert.strictEqual(dispatcher.history.position, 1);

        log.length = 0;
        await dispatcher.restoreTo(ids[2]);
        assert.strictEqual(dispatcher.history.position, 3);
        await dispatcher.restoreTo(null);
        assert.strictEqual(dispatcher.history.position, 0);
        assert.deepEqual(await dispatcher.restoreTo(null), { kind: "nothing" });
    });

    it("clears the history, cancelling pending work, with reason clear", async () => {
        const { dispatcher } = setup();
        await dispatcher.dispatch({ op: "fake.styles", name: "a" });
        const run = dispatcher.dispatch({ op: "fake.run", id: "r1" }).catch((error: unknown) => error);
        await new Promise((resolve) => setTimeout(resolve, 0));
        const log: string[] = [];
        trace(dispatcher, log);

        dispatcher.clear();
        assert.lengthOf(dispatcher.history.steps, 0);
        assert.lengthOf(dispatcher.pending, 0);
        assert.instanceOf(await run, DOMException);
        assert.deepEqual(log, ["history:pending", "history:clear"]);
    });
});
