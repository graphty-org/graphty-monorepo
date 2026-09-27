/**
 * @file A path set's kind (design/sets/sets-design.md section 4.4): each step is one logical edge,
 * keyed on the edges it names or, for a `null` step, on its end pair; the most specific of
 * `cycle`, `simple`, `trail` and `walk` is returned.
 */

import { assert, describe, it } from "vitest";

import { parseSetDefinition } from "../../../src/catalog/sets/parse";
import type { EdgeMember, NodeId, SetDefinition } from "../../../src/catalog/types";
import { pathKind } from "../../../src/session/sets/path";
import { createSetsApi } from "../../../src/session/sets/SetsApi";

type Path = Extract<SetDefinition, { kind: "path" }>;

/**
 * A canonical path.
 * @param nodes - The walk.
 * @param edges - The steps' edges.
 * @param directed - Whether direction counts.
 * @returns The definition.
 */
function path(nodes: NodeId[], edges?: (EdgeMember | EdgeMember[] | null)[], directed?: boolean): Path {
    return parseSetDefinition({
        kind: "path",
        nodes,
        ...(edges === undefined ? {} : { edges }),
        ...(directed === undefined ? {} : { directed }),
    }) as Path;
}

const e = (source: NodeId, target: NodeId, id: string): EdgeMember => ({ source, target, id });

describe("pathKind", () => {
    it("names a walk with no repeated node simple", () => {
        assert.strictEqual(pathKind(path(["a", "b", "c"])), "simple");
        assert.strictEqual(pathKind(path(["a"])), "simple", "a single node is a simple path of no steps");
    });

    it("names a walk that repeats a node but no edge a trail", () => {
        // a-b-c-a-d: a repeats, and a is not only the closing end.
        assert.strictEqual(pathKind(path(["a", "b", "c", "a", "d"])), "trail");
    });

    it("names a closed trail a cycle", () => {
        assert.strictEqual(pathKind(path(["a", "b", "c", "a"])), "cycle");
    });

    it("names a walk that repeats an edge a walk", () => {
        assert.strictEqual(pathKind(path(["a", "b", "c", "b"])), "walk", "b-c then c-b repeat one undirected pair");
    });

    it("reads A-e1-B-e2-A over two distinct parallel edges as a cycle", () => {
        assert.strictEqual(pathKind(path(["A", "B", "A"], [e("A", "B", "e1"), e("A", "B", "e2")])), "cycle");
    });

    it("reads A-e1-B-e1-A, out and back over one edge, as a walk", () => {
        assert.strictEqual(pathKind(path(["A", "B", "A"], [e("A", "B", "e1"), e("A", "B", "e1")])), "walk");
    });

    it("keys a null step on its pair: unordered unless directed", () => {
        assert.strictEqual(
            pathKind(path(["A", "B", "A"], [null, null])),
            "walk",
            "undirected, both steps are the pair {A, B}",
        );
        assert.strictEqual(
            pathKind(path(["A", "B", "A"], [null, null], true)),
            "cycle",
            "directed, A->B and B->A are two pairs",
        );
        assert.strictEqual(
            pathKind(path(["A", "B", "A"], [e("A", "B", "e1"), null])),
            "cycle",
            "a named step and a null step never share a key",
        );
    });

    it("keeps the number 1 and the string '1' apart", () => {
        assert.strictEqual(pathKind(path([1, "1"])), "simple");
    });

    it("is published on session.sets for path sets only", () => {
        const sets = createSetsApi({ edgeMember: () => undefined });
        const cycle = sets.create({ kind: "path", nodes: ["a", "b", "c", "a"] });
        const fixed = sets.create({ kind: "fixed", nodes: ["a"], reading: "induced" });
        assert.strictEqual(sets.pathKind(cycle), "cycle");
        assert.isUndefined(sets.pathKind(fixed));
        assert.isUndefined(sets.pathKind("set_missing"));
    });
});
