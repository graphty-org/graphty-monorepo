/**
 * @file The session input tick (design/sets/sets-design.md 6.2): every attribute-revision bump,
 * mask-version bump, execution-token mint and freeze advances it, and nothing else does.
 */

import { assert, describe, it } from "vitest";

import { inputCountersOf, writeAttributes } from "../../src/session/attributes";
import { inputCountersOfSession } from "../../src/session/GraphSession";
import type { ElementSession } from "../../src/session/types";
import { type Harness, makeSession } from "./helpers";
import { finishAtOnce } from "./runs/harness";

/**
 * A settled session: data frozen and every lazily synced model read once.
 * @returns the harness
 */
function settled(): Harness {
    const harness = makeSession({ runs: { execute: finishAtOnce } });
    harness.add(
        [
            { id: "a", type: "host" },
            { id: "b", type: "user" },
        ],
        [{ src: "a", dst: "b" }],
    );
    readEverything(harness);

    return harness;
}

/**
 * Read what a panel reads, none of which is an input change.
 * @param harness - the session
 */
function readEverything(harness: Harness): void {
    const { session } = harness;
    session.data.snapshot();
    void session.status;
    void session.visibility.summary;
    void session.visibility.nodes;
    void session.selection.nodes;
    void session.results.roots;
    session.runs.list();
    session.data.attributes();
    session.data.statistics();
}

/**
 * The session's tick.
 * @param harness - the session
 * @returns the tick
 */
function tick(harness: Harness): number {
    return inputCountersOfSession(harness.session).tick.value;
}

describe("the input tick", () => {
    it("is the store owner's, shared with the session", () => {
        const harness = settled();
        assert.strictEqual(inputCountersOfSession(harness.session), inputCountersOf(harness.store));
        harness.session.dispose();
    });

    it("does not move for reads", () => {
        const harness = settled();
        const before = tick(harness);
        readEverything(harness);
        readEverything(harness);
        assert.strictEqual(tick(harness), before);
        harness.session.dispose();
    });

    it("advances on a freeze", () => {
        const harness = settled();
        const before = tick(harness);
        harness.add([{ id: "c" }]);
        assert.strictEqual(tick(harness), before, "a mutation alone does not freeze");
        harness.session.data.snapshot();
        assert.strictEqual(tick(harness), before + 1);
        harness.session.dispose();
    });

    it("advances on an attribute-revision bump", () => {
        const harness = settled();
        const before = tick(harness);
        writeAttributes(inputCountersOfSession(harness.session).edges, {}, { weight: 2 });
        assert.strictEqual(tick(harness), before + 1);
        harness.session.dispose();
    });

    it("advances by exactly the selection and visibility mask-version bumps", async () => {
        const harness = settled();
        const session = harness.session as ElementSession;
        const versions = (): number =>
            session.selection.nodeMembers().version +
            session.selection.edgeMembers().version +
            session.visibility.masks.nodes().version +
            session.visibility.masks.edges().version;

        const steps: (() => PromiseLike<unknown>)[] = [
            () => session.selection.apply({ nodes: ["a"] }),
            () => session.visibility.set({ kind: "categories", attribute: "data.type", values: ["host"] }),
            () => session.selection.apply({ nodes: ["a"] }),
            () => session.visibility.set(null),
        ];
        for (const [index, step] of steps.entries()) {
            const before = { tick: tick(harness), versions: versions() };
            await step();
            const bumps = versions() - before.versions;
            assert.isAbove(bumps, 0, `step ${index} moves a mask`);
            assert.strictEqual(tick(harness) - before.tick, bumps, `step ${index}`);
        }

        harness.session.dispose();
    });

    it("advances once per execution token minted, and once each time the result it stamps is published or cleared", async () => {
        const harness = settled();
        const before = tick(harness);
        const run = harness.session.runs.start("degree", undefined, { style: false });
        await run;
        // The mint at the start, the publish at the end.
        assert.strictEqual(tick(harness), before + 2);
        await run.rerun();
        // Queued for the re-run clears the result, then a mint and a publish.
        assert.strictEqual(tick(harness), before + 5);
        harness.session.dispose();
    });
});
