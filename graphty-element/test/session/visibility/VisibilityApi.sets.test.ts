/**
 * @file The visibility filter follows the sets it names (design/sets/sets-design.md sections 4.3,
 * 5.3 and 11). Redefining a named set moves the visible masks with no new `visibility.set`;
 * removing one detaches the filter's leaf and nothing throws, in the filter or in a layer naming
 * the same set; the studio's "without S" is a rule; `usedBy` lists the filter; and an item the
 * filter holds is captured when its run re-runs, and the filter's own compile reads the capture.
 *
 * The graph: the path a-b-c-d-e.
 */

import { assert, describe, it } from "vitest";

import type { EdgeId, Filter, LayerSpec, NodeId, SetDefinition, SetDefinitionInput } from "../../../src/catalog/types";
import { setsNotifierOfSession, setsOfSession } from "../../../src/session/GraphSession";
import { resultExecutionOf } from "../../../src/session/results/ResultsApi";
import type { SessionRunsApi } from "../../../src/session/runs";
import { itemKeyOf } from "../../../src/session/sets/captures";
import { setsStoreOf } from "../../../src/session/sets/SetsApi";
import type { ElementSet } from "../../../src/session/sets/types";
import type { ElementSession } from "../../../src/session/types";
import { edgeBetween, type Harness, makeSession } from "../helpers";
import { finishAtOnce } from "../runs/harness";
import { type Published, publishing } from "./results";

/**
 * The path a-b-c-d-e, frozen.
 * @param runs - The run executor.
 * @returns The harness.
 */
function path(runs: NonNullable<Parameters<typeof makeSession>[0]>["runs"] = { execute: finishAtOnce }): Harness {
    const h = makeSession({ directed: false, runs });
    h.add(
        ["a", "b", "c", "d", "e"].map((id) => ({ id })),
        ["ab", "bc", "cd", "de"].map(([src, dst]) => ({ src, dst })),
    );
    h.session.data.snapshot();

    return h;
}

/**
 * The visible nodes, sorted.
 * @param h - The harness.
 * @returns The ids.
 */
function shown(h: Harness): NodeId[] {
    return [...h.session.visibility.nodes].sort();
}

/**
 * The visible edges, as sorted `"ab"` pairs.
 * @param h - The harness.
 * @returns The pairs.
 */
function shownEdges(h: Harness): string[] {
    const byId = new Map<EdgeId, string>();
    for (const pair of ["ab", "bc", "cd", "de"]) {
        byId.set(edgeBetween(h, pair[0], pair[1]), pair);
    }

    return [...h.session.visibility.edges].map((id) => byId.get(id) ?? id).sort();
}

describe("the visibility filter follows the sets it names", () => {
    it("redefining a named set moves the visible masks and announces it, with no new visibility.set", async () => {
        const h = path();
        const id = h.session.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" });
        await h.session.visibility.set({ kind: "scope", scope: { set: id } });
        assert.deepStrictEqual(shown(h), ["a", "b"]);
        const kinds: string[] = [];
        h.session.on("visibility:changed", (change) => kinds.push(change.filterKind));

        h.session.sets.redefine(id, { kind: "fixed", nodes: ["c", "d", "e"], reading: "induced" });

        assert.deepStrictEqual(shown(h), ["c", "d", "e"], "synchronously, before any await");
        assert.deepStrictEqual(shownEdges(h), ["cd", "de"]);
        assert.deepStrictEqual(kinds, ["scope"]);
    });

    it("a rename moves nothing and announces nothing", async () => {
        const h = path();
        const id = h.session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" }, { name: "S" });
        await h.session.visibility.set({ kind: "scope", scope: { set: id } });
        const kinds: string[] = [];
        h.session.on("visibility:changed", (change) => kinds.push(change.filterKind));

        h.session.sets.rename(id, "T");

        assert.deepStrictEqual(kinds, []);
        assert.deepStrictEqual(shown(h), ["a"]);
    });

    it("removing a set the filter and a layer both name throws nowhere; the filter's leaf speaks nothing", async () => {
        const h = path();
        const id = h.session.sets.create({ kind: "fixed", nodes: ["b", "c"], reading: "induced" });
        const layer: LayerSpec = { name: "Painted", selector: { match: "scope", scope: { set: id } }, set: { "node.color": "#ff0000" } };
        await h.session.styles.add(layer);
        const session = h.session as ElementSession;
        await session.paint.repaintAll(session.styles.compiled(), { signal: new AbortController().signal, report: () => undefined });
        await h.session.visibility.set({ kind: "not", of: { kind: "scope", scope: { set: id } } });
        assert.deepStrictEqual(shown(h), ["a", "d", "e"]);

        h.session.sets.remove(id);
        await new Promise((resolve) => setTimeout(resolve, 0));

        // A removed set holds nothing, so "not S" shows everything: deleting a set never blanks the graph.
        assert.deepStrictEqual(shown(h), ["a", "b", "c", "d", "e"]);
        assert.deepStrictEqual(shownEdges(h), ["ab", "bc", "cd", "de"]);
        await session.paint.repaintAll(session.styles.compiled(), { signal: new AbortController().signal, report: () => undefined });
    });

    const LOOP: SetDefinition = { kind: "rule", where: { kind: "scope", scope: "visible" }, reading: "clipped" };

    it("a loop a load or an undo makes through the filter neither re-evaluates for ever nor reads the masks it writes", async () => {
        const h = path();
        const id = h.session.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" });
        await h.session.visibility.set({ kind: "not", of: { kind: "scope", scope: { set: id } } });

        // The door refuses the loop; a load or an undo writes the store directly and can make one.
        assert.throws(() => h.session.sets.redefine(id, LOOP));
        const store = setsStoreOf(setsOfSession(h.session));
        store.transact(() => {
            store.put({ ...(store.get(id) as ElementSet), definition: LOOP });
        });

        // The filter's leaf now closes a loop and speaks nothing, so "not S" shows everything.
        assert.deepStrictEqual(shown(h), ["a", "b", "c", "d", "e"]);
        assert.strictEqual(setsNotifierOfSession(h.session).pending, 0, "nothing re-queued itself");
        await new Promise((resolve) => setTimeout(resolve, 0));
        assert.deepStrictEqual(shown(h), ["a", "b", "c", "d", "e"]);
    });

    it("the studio's \"without S\": S's nodes and every edge touching them removed, whatever S's reading", async () => {
        const cases: { name: string; define: (h: Harness) => SetDefinitionInput; hidden: string[] }[] = [
            { name: "induced", define: () => ({ kind: "fixed", nodes: ["b"], reading: "induced" }), hidden: ["b"] },
            // Listed: its nodes are b plus the endpoints of its edge c-d.
            { name: "listed", define: (h) => ({ kind: "fixed", nodes: ["b"], edges: [edgeBetween(h, "c", "d")], reading: "listed" }), hidden: ["b", "c", "d"] },
            { name: "rule", define: () => ({ kind: "rule", where: { kind: "degree", min: 2 }, reading: "clipped" }), hidden: ["b", "c", "d"] },
        ];

        for (const { name, define, hidden } of cases) {
            const h = path();
            const id = h.session.sets.create(define(h));
            const without: Filter = {
                kind: "scope",
                scope: { define: { kind: "rule", where: { kind: "not", of: { kind: "scope", scope: { set: id } } }, reading: "clipped" } },
            };
            await h.session.visibility.set(without);

            const rest = ["a", "b", "c", "d", "e"].filter((node) => !hidden.includes(node));
            assert.deepStrictEqual(shown(h), rest, name);
            const kept = ["ab", "bc", "cd", "de"].filter((pair) => !hidden.includes(pair[0]) && !hidden.includes(pair[1]));
            assert.deepStrictEqual(shownEdges(h), kept, name);
        }
    });

    it("usedBy lists the filter, once, and stops when the filter no longer names the set", async () => {
        const h = path();
        const id = h.session.sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" });
        await h.session.visibility.set({ kind: "any", of: [{ kind: "scope", scope: { set: id } }, { kind: "not", of: { kind: "scope", scope: { set: id } } }] });

        assert.deepStrictEqual(h.session.sets.usedBy(id), [{ kind: "filter", label: "Visibility filter" }]);

        await h.session.visibility.set(null);
        assert.deepStrictEqual(h.session.sets.usedBy(id), []);
    });

    it("an item the filter holds is captured when its run re-runs, and the filter's compile reads the capture", async () => {
        const first: Published = { shape: "community", nodes: new Map(Object.entries({ a: { group: 0 }, b: { group: 0 }, c: { group: 1 }, d: { group: 1 }, e: { group: 1 } })) };
        const second: Published = { shape: "community", nodes: new Map(Object.entries({ a: { group: 1 }, b: { group: 0 }, c: { group: 0 }, d: { group: 0 }, e: { group: 0 } })) };
        const table = new Map<string, Published>([["louv", first]]);
        const h = path({ execute: publishing(table) });
        const run = h.session.runs.start("degree", undefined, { as: "louv", scope: "graph", style: false });
        await run;
        const execution = resultExecutionOf(h.session.results, "louv") as string;
        const key = { field: "group", value: 1 };
        await h.session.visibility.set({ kind: "item", item: { run: "louv", key, execution } });
        assert.deepStrictEqual(shown(h), ["c", "d", "e"]);

        table.set("louv", second);
        await run.rerun();

        const held = (h.session.runs as SessionRunsApi).heldOf("louv");
        assert.deepStrictEqual(Object.fromEntries(held.get(execution) ?? []), { [itemKeyOf(key)]: { nodes: ["c", "d", "e"] } });

        // A freeze makes the filter compile again; the held execution is no longer current, so it
        // reads what was captured rather than nothing (or the new group 1, a).
        h.add([{ id: "f" }]);
        h.session.data.snapshot();
        assert.deepStrictEqual(shown(h), ["c", "d", "e"]);
    });
});
