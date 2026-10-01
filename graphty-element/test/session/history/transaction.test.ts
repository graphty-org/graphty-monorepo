import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors";
import type { TransactionScope } from "../../../src/session/project/Dispatcher";
import { setup, stackName } from "./fake-commands";

/** Let every queued microtask and one macrotask run. */
function tick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("transaction", () => {
    it("records every dispatch through tx as one step with the transaction's label and provenance", async () => {
        const { dispatcher, published } = setup();

        const result = await dispatcher.transaction(
            "Load flights",
            async (tx) => {
                await tx.dispatch({ op: "fake.styles", name: "a" });
                await tick();
                await tx.dispatch({ op: "fake.config", key: "bg", value: "red" });
                return 42;
            },
            { provenance: { via: "assistant" } },
        );

        assert.strictEqual(result, 42);
        const { steps } = dispatcher.history;
        assert.lengthOf(steps, 1);
        assert.strictEqual(steps[0].label, "Load flights");
        assert.deepEqual(steps[0].ops, ["fake.styles", "fake.config"]);
        assert.deepEqual([...steps[0].slices].sort(), ["config", "styles"]);
        assert.deepEqual(steps[0].provenance, { via: "assistant" });
        assert.deepEqual(published, [{ slices: ["styles", "config"], cause: "command" }]);

        dispatcher.history.undo();
        assert.isNull(stackName(dispatcher));
        assert.isFalse(dispatcher.state.config.has("bg"));
    });

    it("makes a dispatch outside tx while fn runs its own step, by origin not by time", async () => {
        const { dispatcher } = setup();

        await dispatcher.transaction("Outer", async (tx) => {
            await tx.dispatch({ op: "fake.styles", name: "inside" });
            await dispatcher.dispatch({ op: "fake.config", key: "bg", value: "outside" });
        });

        assert.deepEqual(
            dispatcher.history.steps.map((step) => step.label),
            ["Set bg", "Outer"],
        );
    });

    it("rejects a tx dispatch made after fn settled with E_TRANSACTION_CLOSED", async () => {
        const { dispatcher } = setup();
        let kept: TransactionScope | undefined;

        await dispatcher.transaction("Done", (tx) => {
            kept = tx;
        });
        const error = await kept?.dispatch({ op: "fake.styles", name: "late" }).catch((e: unknown) => e);

        assert.isTrue(isGraphtyError(error) && error.code === "E_TRANSACTION_CLOSED", String(error));
        assert.isNull(stackName(dispatcher));
    });

    it("rolls everything back when fn throws, records nothing, and rethrows", async () => {
        const { dispatcher, published } = setup();
        await dispatcher.dispatch({ op: "fake.config", key: "bg", value: "before" });
        published.length = 0;

        const error = await dispatcher
            .transaction("Fails", async (tx) => {
                await tx.dispatch({ op: "fake.styles", name: "a" });
                await tx.dispatch({ op: "fake.config", key: "bg", value: "during" });
                await tx.dispatch({ op: "fake.styles", name: "b" });
                throw new Error("fn failed");
            })
            .catch((e: unknown) => e);

        assert.match(String(error), /fn failed/);
        assert.isNull(stackName(dispatcher));
        assert.strictEqual(dispatcher.state.config.get("bg"), "before");
        assert.lengthOf(dispatcher.history.steps, 1);
        assert.deepEqual(published, [{ slices: ["styles", "config"], cause: "rollback" }]);
    });

    it("rejects later tx dispatches with AbortError once fn has thrown", async () => {
        const { dispatcher } = setup();
        let kept: TransactionScope | undefined;

        await dispatcher
            .transaction("Fails", (tx) => {
                kept = tx;
                throw new Error("fn failed");
            })
            .catch(() => undefined);
        const error = await kept?.dispatch({ op: "fake.styles", name: "tail" }).catch((e: unknown) => e);

        assert.strictEqual((error as Error).name, "AbortError");
        assert.isNull(stackName(dispatcher));
    });

    it("rolls back at once on abort, rejects the transaction, and refuses fn's tail with AbortError", async () => {
        const { dispatcher } = setup();
        let release: () => void = () => undefined;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        let signalSeen: AbortSignal | undefined;
        let tail: unknown;

        const running = dispatcher.transaction("Aborted", async (tx, signal) => {
            signalSeen = signal;
            await tx.dispatch({ op: "fake.styles", name: "a" });
            dispatcher.abort(tx);
            await gate;
            tail = await tx.dispatch({ op: "fake.styles", name: "tail" }).catch((e: unknown) => e);
        });

        const error = await running.catch((e: unknown) => e);
        assert.strictEqual((error as Error).name, "AbortError");
        assert.isTrue(signalSeen?.aborted);
        assert.isNull(stackName(dispatcher));

        release();
        await tick();
        assert.strictEqual((tail as Error).name, "AbortError");
        assert.isNull(stackName(dispatcher));
        assert.lengthOf(dispatcher.history.steps, 0);
    });

    it("keeps a failing member's revert to that member, and the transaction goes on", async () => {
        const { dispatcher } = setup();

        await dispatcher.transaction("Partial", async (tx) => {
            await tx.dispatch({ op: "fake.config", key: "bg", value: "red" });
            await tx.dispatch({ op: "fake.fail-after-write", key: "bg" }).catch(() => undefined);
            await tx.dispatch({ op: "fake.fail-after-write", key: "fg" }).catch(() => undefined);
        });

        assert.strictEqual(dispatcher.state.config.get("bg"), "red");
        assert.isFalse(dispatcher.state.config.has("fg"));
        assert.lengthOf(dispatcher.history.steps, 1);
        dispatcher.history.undo();
        assert.isFalse(dispatcher.state.config.has("bg"));
    });

    it("records nothing for a transaction with no patches", async () => {
        const { dispatcher, published } = setup();

        await dispatcher.transaction("Empty", async (tx) => {
            await tx.dispatch({ op: "fake.select", id: "n1" });
        });

        assert.lengthOf(dispatcher.history.steps, 0);
        assert.lengthOf(published, 0);
    });

    it("flattens a nested transaction into the outermost one", async () => {
        const { dispatcher } = setup();

        await dispatcher.transaction("Outer", async (tx) => {
            await tx.dispatch({ op: "fake.styles", name: "a" });
            const inner = await tx.transaction("Inner", async (innerTx) => {
                await innerTx.dispatch({ op: "fake.config", key: "bg", value: "red" });
                return "inner";
            });
            assert.strictEqual(inner, "inner");
        });

        const { steps } = dispatcher.history;
        assert.lengthOf(steps, 1);
        assert.strictEqual(steps[0].label, "Outer");
        assert.deepEqual(steps[0].ops, ["fake.styles", "fake.config"]);
    });

    it("lets a reader's edit take over a key an open transaction wrote, so the transaction's rollback keeps it", async () => {
        const { dispatcher } = setup();

        const error = await dispatcher
            .transaction("Message", async (tx) => {
                await tx.dispatch({ op: "fake.styles", name: "message" });
                await dispatcher.dispatch({ op: "fake.styles", name: "reader" });
                throw new Error("message failed");
            })
            .catch((e: unknown) => e);

        assert.match(String(error), /message failed/);
        assert.strictEqual(stackName(dispatcher), "reader");
        assert.lengthOf(dispatcher.history.steps, 1);
        dispatcher.history.undo();
        assert.isNull(stackName(dispatcher));
    });
});
