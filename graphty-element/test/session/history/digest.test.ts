import { assert, describe, it } from "vitest";

import { dispatcherOf } from "../../../src/session/GraphSession";
import { stateDigest } from "../../../src/session/project/digest";
import { createProjectStore } from "../../../src/session/project/draft";
import { createProjectState } from "../../../src/session/project/state";
import { makeSession } from "../helpers";

describe("the state digest", () => {
    it("is equal whatever order map and set entries went in", () => {
        const one = createProjectState({
            config: new Map<string, unknown>([
                ["a", 1],
                ["b", { y: 2, x: 1 }],
            ]),
            sets: new Map(),
            pins: new Set(["n1", "n2"]),
            views: new Map([
                ["home", { zoom: 1 }],
                ["far", { zoom: 4 }],
            ]),
        });
        const two = createProjectState({
            config: new Map<string, unknown>([
                ["b", { x: 1, y: 2 }],
                ["a", 1],
            ]),
            pins: new Set(["n2", "n1"]),
            views: new Map([
                ["far", { zoom: 4 }],
                ["home", { zoom: 1 }],
            ]),
        });

        assert.strictEqual(stateDigest(one), stateDigest(two));
    });

    it("changes when a value changes, and comes back when the change is undone", () => {
        const store = createProjectStore(createProjectState());
        const before = stateDigest(store.state);

        const draft = store.open();
        draft.config.set("background.color", "red");
        draft.visibility.set("showContext", true);
        const patch = draft.seal();
        const after = stateDigest(store.state);

        assert.notStrictEqual(after, before);
        store.applyBackward(patch);
        assert.strictEqual(stateDigest(store.state), before);
        store.applyForward(patch);
        assert.strictEqual(stateDigest(store.state), after);
    });

    it("leaves the positions lane out unless asked, and hashes its coordinates and pin bytes when asked", async () => {
        const { session, store } = makeSession();
        await session.data.addNodes([{ id: "a" }]);
        const { state } = dispatcherOf(session);
        const digests = (): string[] => [
            stateDigest(state, { snapshot: session.snapshot() }),
            stateDigest(state, { snapshot: session.snapshot(), arrangement: true }),
        ];
        const [plain, lane] = digests();

        store.positions.write(0, 1, 2, 3);
        const [placedPlain, placed] = digests();
        assert.strictEqual(placedPlain, plain, "without the lane, a coordinate is not content");
        assert.notStrictEqual(placed, lane, "with it, the coordinate is");

        store.positions.setPinned(0, true);
        assert.notStrictEqual(digests()[1], placed, "and so is the pin byte");
        session.dispose();
    });

    it("ignores functions, which are derived from data it does hash", () => {
        const one = createProjectState({ config: new Map<string, unknown>([["k", { v: 1, test: () => true }]]) });
        const two = createProjectState({ config: new Map<string, unknown>([["k", { v: 1, test: () => false }]]) });

        assert.strictEqual(stateDigest(one), stateDigest(two));
    });
});
