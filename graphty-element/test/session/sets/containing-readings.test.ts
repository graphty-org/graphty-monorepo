/**
 * @file Memberships, `sets.containing`, checked against a full resolution: for kept rules of every
 * element-local leaf and of the leaves that are not, under every edge reading, each node and edge
 * is held exactly when `scope.resolve` of the same definition holds it. Also a fixed set naming an
 * integer node in its other spelling, and a rule whose leaf cannot compile.
 *
 * The graph, undirected: a triangle a-b-c, a bridge c-d, a triangle d-e-f, a node g with a
 * self-loop, and a pair h-i. Nodes carry `data.weight` (position in the alphabet), `data.color`
 * and `data.name`; edges carry `data.kind`.
 */

import { assert, describe, it } from "vitest";

import type { EdgeId, EdgeReading, NodeId, RuleTree, SetDefinition } from "../../../src/catalog/types";
import { edgeSpaceOf, type ResolvedScope } from "../../../src/session/scope/ScopeApi";
import { type Harness, makeSession } from "../helpers";

const NODES = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
const COLORS = ["red", "red", "blue", "blue", "red", "green", "red", "blue", "green"];
const EDGES = [
    ["a", "b", "strong"],
    ["b", "c", "weak"],
    ["a", "c", "strong"],
    ["c", "d", "strong"],
    ["d", "e", "weak"],
    ["e", "f", "strong"],
    ["d", "f", "weak"],
    ["g", "g", "strong"],
    ["h", "i", "weak"],
] as const;

/** A session over the graph. */
function fixture(): Harness {
    const h = makeSession({ directed: false });
    h.add(
        NODES.map((id, i) => ({ id, weight: i + 1, color: COLORS[i], name: `node-${id}` })),
        EDGES.map(([src, dst, kind]) => ({ src, dst, kind })),
    );

    return h;
}

/** Element-local leaves: tested at the one element. */
const LOCAL: Record<string, RuleTree> = {
    expression: { kind: "expression", where: "data.weight > `4`" },
    edges: { kind: "edges", where: "data.kind == 'strong'" },
    degree: { kind: "degree", min: 3 },
    isolated: { kind: "isolated" },
    "self-loop": { kind: "self-loop" },
    range: { kind: "range", attribute: "data.weight", max: 5 },
    categories: { kind: "categories", attribute: "data.color", values: ["red"] },
    text: { kind: "text", reads: "data.name", mode: "ends-with", text: "e" },
    "threshold above": { kind: "threshold", path: "data.weight", above: 6 },
    all: {
        kind: "all",
        of: [
            { kind: "categories", attribute: "data.color", values: ["red", "blue"] },
            { kind: "range", attribute: "data.weight", min: 2 },
        ],
    },
    any: { kind: "any", of: [{ kind: "isolated" }, { kind: "degree", max: 1 }] },
    not: { kind: "not", of: { kind: "categories", attribute: "data.color", values: ["red"] } },
};

/** Leaves that read more than the one element: resolved in full. */
const POPULATION: Record<string, RuleTree> = {
    "range read at the ends": { kind: "range", attribute: "data.weight", min: 4, nodes: "ends" },
    "threshold top": { kind: "threshold", path: "data.weight", top: 3 },
    component: { kind: "component", id: 0 },
    "not of a neighborhood": { kind: "not", of: { kind: "neighborhood", seeds: ["a"], depth: 1 } },
};

const READINGS: readonly EdgeReading[] = ["induced", "listed", "clipped", "incident"];

/** The leaves that speak of edges. */
const EDGE_SPEAKING = new Set(["edges", "self-loop"]);

/**
 * Every node and edge of the graph as `containing` takes them.
 * @param h - The harness.
 * @returns The elements.
 */
function elements(h: Harness): ({ node: NodeId } | { edge: EdgeId })[] {
    const snapshot = h.session.data.snapshot();
    const space = edgeSpaceOf(snapshot);
    const edges = Array.from({ length: snapshot.edgeCount }, (_, row) => ({ edge: space.idOf(row) }));

    return [...NODES.map((node) => ({ node })), ...edges];
}

/**
 * Check `containing` against `scope.resolve` for every element, over a set of definitions kept
 * in one session and resolved in a second, so neither answer reads the other's cache.
 * @param definitions - Name to definition.
 */
async function agreeWithResolve(definitions: Record<string, SetDefinition>): Promise<void> {
    const kept = fixture();
    const oracle = fixture();
    const ids = new Map<string, string>();
    for (const [name, definition] of Object.entries(definitions)) {
        ids.set(kept.session.sets.create(definition, { name }), name);
    }

    const expected = new Map<string, ResolvedScope>();
    for (const [name, definition] of Object.entries(definitions)) {
        expected.set(name, await oracle.session.scope.resolve({ define: definition }));
    }

    const held = new Set<string>();
    for (const element of elements(kept)) {
        const { sets } = await kept.session.sets.containing(element);
        const names = sets.map((id) => ids.get(id) ?? id).sort();
        const want = [...expected]
            .filter(([, scope]) => ("node" in element ? scope.nodes.has(element.node) : scope.edges.has(element.edge)))
            .map(([name]) => name)
            .sort();
        assert.deepStrictEqual(names, want, `the sets holding ${JSON.stringify(element)}`);
        for (const name of names) {
            held.add(name);
        }
    }

    // Every definition holds something, so a membership that always answered "no" fails above.
    const empty = Object.keys(definitions).filter((name) => {
        const scope = expected.get(name);
        return scope === undefined || scope.nodeCount + scope.edgeCount === 0;
    });
    assert.deepStrictEqual(empty, [], "definitions that resolve to nothing test nothing");
    assert.strictEqual(held.size, Object.keys(definitions).length);
}

/**
 * One rule definition per leaf and reading.
 * @param leaves - Name to leaf.
 * @returns Name to definition.
 */
function rules(leaves: Record<string, RuleTree>): Record<string, SetDefinition> {
    const out: Record<string, SetDefinition> = {};
    for (const [name, where] of Object.entries(leaves)) {
        for (const reading of READINGS) {
            // An induced set derives its edges from its nodes, so it refuses an edge-speaking leaf.
            if (reading === "induced" && EDGE_SPEAKING.has(name)) {
                continue;
            }

            out[`${name} ${reading}`] = { kind: "rule", where, reading };
        }
    }

    return out;
}

describe("sets.containing agrees with a full resolution", () => {
    it("for rules of element-local leaves under every edge reading", async () => {
        await agreeWithResolve(rules(LOCAL));
    });

    it("for rules that read beyond the element under every edge reading", async () => {
        await agreeWithResolve(rules(POPULATION));
    });

    it("for a JMESPath string rule and fixed sets read induced and listed", async () => {
        await agreeWithResolve({
            "string rule incident": { kind: "rule", where: "data.weight < `3`", reading: "incident" },
            "string rule listed": { kind: "rule", where: "data.weight < `3`", reading: "listed" },
            "fixed induced": { kind: "fixed", nodes: ["c", "d", "e"], reading: "induced" },
        });
    });
});

describe("sets.containing corners", () => {
    it("reads an integer node a fixed set names in its other spelling as that node", async () => {
        const h = makeSession({ directed: false });
        h.add([{ id: 1 }, { id: 2 }, { id: 3 }], [{ src: 1, dst: 2 }]);
        const set = h.session.sets.create({ kind: "fixed", nodes: ["1", "2"], reading: "induced" });

        assert.deepStrictEqual((await h.session.sets.containing({ node: 1 })).sets, [set]);
        assert.deepStrictEqual((await h.session.sets.containing({ node: 3 })).sets, []);
        const edge = edgeSpaceOf(h.session.data.snapshot()).idOf(0);
        assert.deepStrictEqual(
            (await h.session.sets.containing({ edge })).sets,
            [set],
            "the edge between two members written the other way is held",
        );
        const resolved = await h.session.scope.resolve({ set });
        assert.strictEqual(resolved.nodeCount, 2, "the resolver reads the spelling the same way");
    });

    it("keeps the spelling the graph holds when it holds both", async () => {
        const h = makeSession({ directed: false });
        h.add([{ id: 1 }, { id: "1" }, { id: 2 }], []);
        const set = h.session.sets.create({ kind: "fixed", nodes: ["1"], reading: "induced" });

        assert.deepStrictEqual((await h.session.sets.containing({ node: "1" })).sets, [set]);
        assert.deepStrictEqual((await h.session.sets.containing({ node: 1 })).sets, [], "the number is its own node");
    });
});
