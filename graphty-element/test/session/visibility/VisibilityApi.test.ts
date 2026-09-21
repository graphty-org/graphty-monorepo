import { assert, describe, it } from "vitest";

import type { NodeId, Path } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { createScopeApi } from "../../../src/session/scope/index";
import {
    createVisibilityApi,
    type Filter,
    type FilterResult,
    type FilterValueSource,
    type SessionVisibilityApi,
    type VisibilityApi,
    type VisibilityChange,
    type VisibilitySources,
    type VisibilitySummary,
} from "../../../src/session/visibility/index";
import { edgeBetween, type EdgeRow, type Harness, makeSession, type NodeRow } from "../helpers";

function harnessOf(nodes: readonly NodeRow[], edges: readonly EdgeRow[] = []): Harness {
    const harness = makeSession();
    harness.add(nodes, edges);

    return harness;
}

/** Reads the bags the harness kept, addressing them by the `data.` paths a filter uses. */
function valuesOf(harness: Harness): FilterValueSource {
    const key = (path: Path): string => path.replace(/^data\./, "");

    return {
        nodeValue: (index, path) => harness.nodeAttributes.get(index)?.[key(path)],
        edgeValue: (index, path) => harness.edgeAttributes.get(index)?.[key(path)],
    };
}

/** A visibility model over a harness, with whatever capabilities the test wants to add. */
function modelOf(harness: Harness, extra: Partial<VisibilitySources> = {}): SessionVisibilityApi {
    return createVisibilityApi({
        snapshot: () => harness.store.getSnapshot(),
        values: valuesOf(harness),
        ...extra,
    });
}

/** Only hosts. */
const HOSTS: Filter = { kind: "categories", attribute: "data.type", values: ["host"] };

/** How much is showing, read through the consumer surface a third party sees. */
function summaryOf(visibility: VisibilityApi): VisibilitySummary {
    return visibility.summary;
}

/** The code a call refused with, or null when it did not refuse. */
function codeOf(call: () => unknown): string | null {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not-a-graphty-error";
    }

    return null;
}

/** Await a run that is expected to be cancelled, and answer with the error's name. */
async function nameOfRejection(awaitable: PromiseLike<unknown>): Promise<string> {
    try {
        await awaitable;
    } catch (error) {
        return error instanceof Error ? error.name : "not-an-error";
    }

    return "resolved";
}

describe("what is visible before anything hides anything", () => {
    it("shows the whole graph, with no filter and no window", () => {
        const harness = harnessOf([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);
        const visibility = modelOf(harness);

        assert.deepStrictEqual(summaryOf(visibility), {
            totalEdges: 1,
            totalNodes: 2,
            visibleEdges: 1,
            visibleNodes: 2,
        });
        assert.strictEqual(visibility.filter, null);
        assert.strictEqual(visibility.window, null);
        assert.isTrue(visibility.isVisible("a"));
        assert.isTrue(visibility.isVisible(edgeBetween(harness, "a", "b")));
        harness.session.dispose();
    });

    it("answers for an element the graph does not hold rather than throwing", () => {
        const harness = harnessOf([{ id: "a" }]);
        const visibility = modelOf(harness);

        assert.isFalse(visibility.isVisible("gone"));
        assert.isFalse(visibility.isVisible(7));
        harness.session.dispose();
    });
});

describe("applying a filter", () => {
    it("hides what it does not match, and reports the counts", async () => {
        const harness = harnessOf(
            [
                { id: "a", type: "host" },
                { id: "b", type: "host" },
                { id: "c", type: "service" },
            ],
            [
                { src: "a", dst: "b" },
                { src: "b", dst: "c" },
            ],
        );
        const visibility = modelOf(harness);

        const result: FilterResult = await visibility.set(HOSTS);

        assert.deepStrictEqual(result.visible, { edges: 1, nodes: 2 });
        assert.deepStrictEqual(result.total, { edges: 2, nodes: 3 });
        assert.deepStrictEqual([...visibility.nodes].sort(), ["a", "b"]);
        assert.deepStrictEqual([...visibility.edges], [edgeBetween(harness, "a", "b")], "b:c lost an endpoint");
        assert.isFalse(visibility.isVisible("c"));
        assert.strictEqual(visibility.filter, HOSTS);
        harness.session.dispose();
    });

    it("writes one byte per node, whatever the answer's size is", async () => {
        const harness = harnessOf([
            { id: "a", type: "host" },
            { id: "b", type: "service" },
            { id: "c", type: "service" },
        ]);
        const visibility = modelOf(harness);

        await visibility.set(HOSTS);
        const mask = visibility.nodeMask();

        assert.strictEqual(mask.length, 3, "the mask is the element count, not the visible count");
        assert.deepStrictEqual([...mask], [1, 0, 0]);
        harness.session.dispose();
    });

    it("hands back a detached copy of the bytes", async () => {
        const harness = harnessOf([{ id: "a", type: "host" }]);
        const visibility = modelOf(harness);

        await visibility.set(HOSTS);
        const mask = visibility.nodeMask();
        mask[0] = 0;

        assert.isTrue(visibility.isVisible("a"), "writing into the copy cannot change the model");
        harness.session.dispose();
    });

    it("clears back to the whole graph with null", async () => {
        const harness = harnessOf([
            { id: "a", type: "host" },
            { id: "b", type: "service" },
        ]);
        const visibility = modelOf(harness);

        await visibility.set(HOSTS);
        await visibility.set(null);

        assert.strictEqual(visibility.filter, null);
        assert.strictEqual(visibility.summary.visibleNodes, 2);
        harness.session.dispose();
    });

    it("reports a path nothing answered instead of a silent zero", async () => {
        const harness = harnessOf([{ id: "a" }, { id: "b" }]);
        const visibility = modelOf(harness);

        const result = await visibility.set({ kind: "range", attribute: "data.rank", min: 1 });

        assert.strictEqual(result.visible.nodes, 0);
        assert.deepStrictEqual(result.unresolvedPaths, ["data.rank"]);
        harness.session.dispose();
    });

    it("refuses a malformed filter at the call that offered it", () => {
        const harness = harnessOf([{ id: "a" }]);
        const visibility = modelOf(harness);

        assert.strictEqual(codeOf(() => visibility.set({ kind: "nope" } as unknown as Filter)), "E_BAD_COMMAND");
        assert.strictEqual(visibility.summary.visibleNodes, 1, "a refused filter changed nothing");
        harness.session.dispose();
    });

    it("refuses a dry run, and says what to ask instead", () => {
        const harness = harnessOf([{ id: "a" }]);
        const visibility = modelOf(harness);

        assert.strictEqual(codeOf(() => visibility.set(HOSTS, { dryRun: true })), "E_UNSUPPORTED");
        harness.session.dispose();
    });
});

describe("a filter and a window are two producers of one model", () => {
    it("composes them, and leaves each one standing when the other is cleared", async () => {
        const harness = harnessOf([
            { id: "a", type: "host", at: 1 },
            { id: "b", type: "host", at: 90 },
            { id: "c", type: "service", at: 1 },
        ]);
        const visibility = modelOf(harness);

        await visibility.set(HOSTS);
        assert.deepStrictEqual([...visibility.nodes].sort(), ["a", "b"]);

        await visibility.setWindow({ attribute: "data.at", from: 0, to: 10 });
        assert.deepStrictEqual([...visibility.nodes], ["a"], "a host, inside the window");
        assert.strictEqual(visibility.filter, HOSTS, "setting a window left the filter alone");

        await visibility.set(null);
        assert.deepStrictEqual([...visibility.nodes].sort(), ["a", "c"], "the window is still in force");

        await visibility.setWindow(null);
        assert.strictEqual(visibility.summary.visibleNodes, 3);
        harness.session.dispose();
    });
});

describe("the lazy id sets", () => {
    it("hands back the same object until the membership changes", async () => {
        const harness = harnessOf([
            { id: "a", type: "host" },
            { id: "b", type: "service" },
        ]);
        const visibility = modelOf(harness);

        const before = visibility.nodes;

        assert.strictEqual(visibility.nodes, before, "a read of an unchanged set costs nothing");

        await visibility.set(HOSTS);

        assert.notStrictEqual(visibility.nodes, before);
        harness.session.dispose();
    });

    it("refuses to be written to rather than silently ignoring the write", () => {
        const harness = harnessOf([{ id: "a" }]);
        const visibility = modelOf(harness);
        const ids = visibility.nodes as Set<NodeId>;

        assert.strictEqual(codeOf(() => ids.add("b")), "E_READONLY");
        assert.strictEqual(codeOf(() => ids.clear()), "E_READONLY");
        harness.session.dispose();
    });
});

describe("when the graph moves underneath a filter", () => {
    it("re-applies the filter to what is there now", async () => {
        const harness = harnessOf([
            { id: "a", type: "host" },
            { id: "b", type: "service" },
        ]);
        const visibility = modelOf(harness);

        await visibility.set(HOSTS);
        assert.strictEqual(visibility.summary.visibleNodes, 1);

        harness.add([{ id: "d", type: "host" }, { id: "e", type: "service" }]);

        assert.deepStrictEqual([...visibility.nodes].sort(), ["a", "d"], "the new host shows, the new service does not");
        assert.strictEqual(visibility.summary.totalNodes, 4);
        harness.session.dispose();
    });

    it("shows a node that arrives while nothing is filtering", () => {
        const harness = harnessOf([{ id: "a" }]);
        const visibility = modelOf(harness);

        assert.strictEqual(visibility.summary.visibleNodes, 1);

        harness.add([{ id: "b" }], [{ src: "a", dst: "b" }]);

        assert.strictEqual(visibility.summary.visibleNodes, 2);
        assert.strictEqual(visibility.summary.visibleEdges, 1);
        harness.session.dispose();
    });
});

describe("a pass is a run", () => {
    it("carries the scope, the shape and the caveats a reader needs", async () => {
        const harness = harnessOf([{ id: "a", type: "host" }, { id: "b" }]);
        const visibility = modelOf(harness);

        const run = visibility.set(HOSTS);
        await run;

        assert.strictEqual(run.shape, "fact", "a pass publishes counts, not a set of elements to paint");
        assert.strictEqual(run.algorithm, "visibility.set");
        assert.strictEqual(run.scope.spec, "graph", "a filter is evaluated over everything it could show");
        assert.isTrue(run.caveats.filterScope);
        assert.isFalse(run.caveats.windowScope);
        assert.strictEqual(run.status, "succeeded");
        assert.strictEqual(run.stale, null);
        assert.deepStrictEqual(run.fields, [], "the mask is not a result bag");
        harness.session.dispose();
    });

    it("changes nothing when it is cancelled", async () => {
        const harness = harnessOf([
            { id: "a", type: "host" },
            { id: "b", type: "service" },
        ]);
        const visibility = modelOf(harness);

        const run = visibility.set(HOSTS);
        run.cancel("no longer wanted");

        assert.strictEqual(await nameOfRejection(run), "AbortError");
        assert.strictEqual(visibility.summary.visibleNodes, 2, "the masks were never written");
        assert.strictEqual(visibility.filter, null);
        harness.session.dispose();
    });

    it("is replaced by the next instruction rather than queued behind it", async () => {
        // A slider being dragged makes one pass per frame; only the last one's answer matters.
        const harness = harnessOf([
            { id: "a", type: "host" },
            { id: "b", type: "service" },
        ]);
        const visibility = modelOf(harness);

        const first = visibility.set(HOSTS);
        const second = visibility.set({ kind: "categories", attribute: "data.type", values: ["service"] });

        assert.strictEqual(await nameOfRejection(first), "AbortError");
        await second;
        assert.deepStrictEqual([...visibility.nodes], ["b"]);
        harness.session.dispose();
    });

    it("reports determinate progress while it walks", async () => {
        const harness = harnessOf([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);
        const visibility = modelOf(harness);
        const fractions: (number | null)[] = [];

        await visibility.set(HOSTS, {
            onProgress: (progress) => {
                fractions.push(progress.fraction);
            },
        });

        assert.isAtLeast(fractions.length, 1);
        assert.strictEqual(fractions.at(-1), 1, "a finished pass reports a full bar, never a guess");
        harness.session.dispose();
    });
});

describe("telling a host what changed", () => {
    it("announces each change with what produced it", async () => {
        const harness = harnessOf([
            { id: "a", type: "host", at: 1 },
            { id: "b", type: "service", at: 1 },
        ]);
        const changes: VisibilityChange[] = [];
        const visibility = modelOf(harness, {
            onChange: (change) => {
                changes.push(change);
            },
        });

        await visibility.set(HOSTS);
        await visibility.setWindow({ attribute: "data.at", from: 0, to: 10 });
        await visibility.set(null);
        visibility.showContext = true;

        assert.deepStrictEqual(
            changes.map((change) => change.filterKind),
            ["categories", "window", "none", "context"],
        );
        assert.deepStrictEqual(changes[0].visible, { edges: 0, nodes: 1 });
        assert.strictEqual(changes.at(-1)?.visible.nodes, 2, "the context flag hides nothing");
        harness.session.dispose();
    });

    it("says nothing when the context flag is set to what it already is", () => {
        const harness = harnessOf([{ id: "a" }]);
        const changes: VisibilityChange[] = [];
        const visibility = modelOf(harness, {
            onChange: (change) => {
                changes.push(change);
            },
        });

        assert.isFalse(visibility.showContext, "hidden nodes vanish until a reader asks otherwise");

        visibility.showContext = false;

        assert.deepStrictEqual(changes, []);
        harness.session.dispose();
    });
});

describe("what the scope resolver reads", () => {
    it("narrows the visible scope to the masks, including the edges", async () => {
        const harness = harnessOf(
            [
                { id: "a", type: "host" },
                { id: "b", type: "host" },
                { id: "c", type: "service" },
            ],
            [
                { src: "a", dst: "b" },
                { src: "b", dst: "c" },
            ],
        );
        const visibility = modelOf(harness);
        const scope = createScopeApi({
            snapshot: () => harness.store.getSnapshot(),
            visibility: visibility.masks,
        });

        await visibility.set(HOSTS);
        const resolved = await scope.resolve("visible");

        assert.deepStrictEqual([...resolved.nodes].sort(), ["a", "b"]);
        assert.deepStrictEqual([...resolved.edges], [edgeBetween(harness, "a", "b")]);
        assert.notStrictEqual(
            resolved.digest,
            (await scope.resolve("graph")).digest,
            "the visible scope is not the whole graph any more",
        );
        harness.session.dispose();
    });
});
