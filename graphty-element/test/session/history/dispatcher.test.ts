import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors";
import { selections, setup, stackName } from "./fake-commands";

describe("dispatch", () => {
    it("records a plain dispatch as one step, labelled by its definition", async () => {
        const { dispatcher, published } = setup();

        const result = await dispatcher.dispatch({ op: "fake.styles", name: "hubs" });

        assert.strictEqual(result, "hubs");
        assert.strictEqual(stackName(dispatcher), "hubs");
        const { steps } = dispatcher.history;
        assert.lengthOf(steps, 1);
        assert.strictEqual(steps[0].label, "Styled hubs");
        assert.deepEqual(steps[0].ops, ["fake.styles"]);
        assert.deepEqual(steps[0].slices, ["styles"]);
        assert.deepEqual(published, [{ slices: ["styles"], cause: "command" }]);

        dispatcher.history.undo();
        assert.isNull(stackName(dispatcher));
        dispatcher.history.redo();
        assert.strictEqual(stackName(dispatcher), "hubs");
    });

    it("writes before it returns, so a getter sees the write without awaiting", () => {
        const { dispatcher } = setup();

        void dispatcher.dispatch({ op: "fake.styles", name: "now" });

        assert.strictEqual(stackName(dispatcher), "now");
    });

    it("runs an exempt command without a step and without a draft", async () => {
        const { dispatcher, published } = setup();
        selections.length = 0;

        await dispatcher.dispatch({ op: "fake.select", id: "n1" });

        assert.deepEqual(
            selections.map((c) => c.id),
            ["n1"],
        );
        assert.lengthOf(dispatcher.history.steps, 0);
        assert.lengthOf(published, 0);
    });

    it("coalesces equal keys within the window, and not after it", async () => {
        const { dispatcher, clock } = setup();

        await dispatcher.dispatch({ op: "fake.config", key: "bg", value: "red" });
        clock.advance(100);
        await dispatcher.dispatch({ op: "fake.config", key: "bg", value: "blue" });
        assert.lengthOf(dispatcher.history.steps, 1);

        clock.advance(5000);
        await dispatcher.dispatch({ op: "fake.config", key: "bg", value: "green" });
        assert.lengthOf(dispatcher.history.steps, 2);

        dispatcher.history.undo();
        assert.strictEqual(dispatcher.state.config.get("bg"), "blue");
        dispatcher.history.undo();
        assert.isFalse(dispatcher.state.config.has("bg"));
    });

    it("resolves a late door against state when it executes, and records the concrete command", async () => {
        const { dispatcher } = setup();
        await dispatcher.dispatch({ op: "fake.styles", name: "base" });

        await dispatcher.dispatch((state) => ({
            op: "fake.config",
            key: "seen",
            value: (state.styles[0] as unknown as { name: string }).name,
        }));

        assert.strictEqual(dispatcher.state.config.get("seen"), "base");
        assert.deepEqual(dispatcher.history.steps[1].ops, ["fake.config"]);
    });

    it("hands execute a frozen copy of the arguments, never the caller's object", async () => {
        const { dispatcher } = setup();
        selections.length = 0;
        const command = { op: "fake.select" as const, id: "n1" };

        await dispatcher.dispatch(command);
        command.id = "changed";

        assert.notStrictEqual(selections[0], command);
        assert.isTrue(Object.isFrozen(selections[0]));
        assert.strictEqual(selections[0].id, "n1");
    });

    it("rejects an op with no definition, and records nothing", async () => {
        const { dispatcher } = setup();

        const error = await dispatcher.dispatch({ op: "fake.nothing" }).catch((e: unknown) => e);

        assert.isTrue(isGraphtyError(error) && error.code === "E_BAD_COMMAND");
        assert.lengthOf(dispatcher.history.steps, 0);
    });

    it("leaves no step and unchanged state when a command throws after writing, and publishes the revert", async () => {
        const { dispatcher, published } = setup();
        await dispatcher.dispatch({ op: "fake.config", key: "bg", value: "red" });
        published.length = 0;

        const error = await dispatcher.dispatch({ op: "fake.fail-after-write", key: "bg" }).catch((e: unknown) => e);

        assert.match(String(error), /failed after writing/);
        assert.strictEqual(dispatcher.state.config.get("bg"), "red");
        assert.lengthOf(dispatcher.history.steps, 1);
        assert.deepEqual(published, [{ slices: ["config"], cause: "rollback" }]);
    });

    it("publishes nothing when a command throws before its first write", async () => {
        const { dispatcher, published } = setup();

        const error = await dispatcher.dispatch({ op: "fake.fail-before-write" }).catch((e: unknown) => e);

        assert.match(String(error), /failed before writing/);
        assert.lengthOf(dispatcher.history.steps, 0);
        assert.lengthOf(published, 0);
        assert.strictEqual(dispatcher.state.config.size, 0);
    });

    it("discards the redo tail when a new step is recorded after an undo", async () => {
        const { dispatcher } = setup();
        await dispatcher.dispatch({ op: "fake.styles", name: "a" });
        await dispatcher.dispatch({ op: "fake.styles", name: "b" });
        dispatcher.history.undo();

        await dispatcher.dispatch({ op: "fake.styles", name: "c" });

        assert.deepEqual(
            dispatcher.history.steps.map((step) => step.label),
            ["Styled a", "Styled c"],
        );
    });
});
