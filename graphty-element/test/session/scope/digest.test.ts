/**
 * @file The `d1:` membership digest (design/sets/sets-design.md section 6.4): a masked sum over
 * the hash columns, versioned, lazy and memoised on the resolution.
 */

import { assert, describe, it } from "vitest";

import { EMPTY_SUM, hashNodeId, type LanePair, membershipDigestOf, memberSum } from "../../../src/catalog/sets/hash";
import type { NodeId } from "../../../src/catalog/types";
import { identityColumnsOf } from "../../../src/data/edgeIdentity";
import { createScopeApi, edgeSpaceOf, ElementMask, nodeSpaceOf } from "../../../src/session/scope/index";
import { resolveCounters } from "../../../src/session/sets/resolve";
import { edgeBetween, type Harness, makeSession, type NodeRow } from "../helpers";

/** A session with a path a - b - c and an isolated d. */
function harness(nodes: readonly NodeRow[] = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]): Harness {
    const made = makeSession();
    made.add(nodes, [
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
    ]);

    return made;
}

describe("the d1 membership digest", () => {
    it("is d1: and sixteen hex digits", () => {
        const h = harness();
        const scope = createScopeApi({ snapshot: () => h.store.getSnapshot() });

        assert.match(scope.resolveNow("graph").digest, /^d1:[0-9a-f]{16}$/);
        assert.match(scope.resolveNow({ nodes: [] }).digest, /^d1:[0-9a-f]{16}$/);
        h.session.dispose();
    });

    it("is equal for one membership reached by different specifications", () => {
        const h = harness();
        const snapshot = h.store.getSnapshot();
        const space = nodeSpaceOf(snapshot);
        const selected = new ElementMask<NodeId>(() => space);
        selected.grow(snapshot.nodeCount);
        selected.add(selected.indexOf("a"));
        selected.add(selected.indexOf("b"));
        const scope = createScopeApi({ snapshot: () => h.store.getSnapshot(), selection: { nodes: () => selected } });
        const saved = scope.save("pair", { nodes: ["b", "a"] });

        const byList = scope.resolveNow({ nodes: ["a", "b"] }).digest;

        assert.strictEqual(
            scope.resolveNow({ nodes: ["b", "a", "gone"] }).digest,
            byList,
            "order and missing ids are not membership",
        );
        assert.strictEqual(scope.resolveNow("selection").digest, byList);
        assert.strictEqual(scope.resolveNow({ set: saved }).digest, byList);
        assert.strictEqual(
            scope.resolveNow({ nodes: ["a", "b", "c", "d"] }).digest,
            scope.resolveNow("graph").digest,
            "every node is the whole graph",
        );
        h.session.dispose();
    });

    it("moves when one element joins or leaves", () => {
        const h = harness();
        const scope = createScopeApi({ snapshot: () => h.store.getSnapshot() });

        const two = scope.resolveNow({ nodes: ["a", "b"] }).digest;
        assert.notStrictEqual(scope.resolveNow({ nodes: ["a", "b", "d"] }).digest, two, "a node joined");
        assert.notStrictEqual(scope.resolveNow({ nodes: ["a"] }).digest, two, "a node and its edge left");
        assert.notStrictEqual(scope.resolveNow({ nodes: ["a", "c"] }).digest, two);
        h.session.dispose();
    });

    it("keeps a node half apart from an edge half with the same sum", () => {
        const sum = hashNodeId("x");
        assert.notStrictEqual(
            membershipDigestOf({ count: 1, sum }, { count: 0, sum: EMPTY_SUM }),
            membershipDigestOf({ count: 0, sum: EMPTY_SUM }, { count: 1, sum }),
        );
    });

    it('tells the number 1 from the string "1"', () => {
        const numeric = harness([{ id: 1 }, { id: 2 }]);
        const textual = harness([{ id: "1" }, { id: "2" }]);
        const left = createScopeApi({ snapshot: () => numeric.store.getSnapshot() });
        const right = createScopeApi({ snapshot: () => textual.store.getSnapshot() });

        assert.notStrictEqual(left.resolveNow({ nodes: [1] }).digest, right.resolveNow({ nodes: ["1"] }).digest);
        numeric.session.dispose();
        textual.session.dispose();
    });

    it("is not built until read, and is built once per resolution", () => {
        const h = harness();
        const scope = createScopeApi({ snapshot: () => h.store.getSnapshot() });

        const before = resolveCounters.digestSums;
        const first = scope.resolveNow({ nodes: ["a", "b"] });
        assert.strictEqual(resolveCounters.digestSums - before, 0, "resolving sums nothing");

        const { digest } = first;
        assert.strictEqual(resolveCounters.digestSums - before, 1);
        assert.strictEqual(first.digest, digest);

        const again = scope.resolveNow({ nodes: ["a", "b"] });
        assert.notStrictEqual(again, first, "a fresh object per call");
        assert.strictEqual(again.digest, digest);
        assert.strictEqual(resolveCounters.digestSums - before, 1, "two objects over one resolution share one sum");

        h.add([{ id: "e" }]);
        assert.strictEqual(
            scope.resolveNow({ nodes: ["a", "b"] }).digest,
            digest,
            "survives a freeze that kept the membership",
        );
        assert.strictEqual(resolveCounters.digestSums - before, 2, "a new snapshot is a new resolution");
        h.session.dispose();
    });

    it("is the masked sum of the node and edge hash columns", () => {
        const h = harness();
        const snapshot = h.store.getSnapshot();
        const scope = createScopeApi({ snapshot: () => h.store.getSnapshot() });
        const { nodeHash, edgeHash } = identityColumnsOf(snapshot);
        const ab = edgeSpaceOf(snapshot).indexOf(edgeBetween(h, "a", "b"));
        const lanes = (column: Uint32Array, rows: number[]): LanePair =>
            memberSum(rows.map((row) => ({ a: column[2 * row], b: column[2 * row + 1] })));
        const rows = [snapshot.ids.indexOf("a"), snapshot.ids.indexOf("b")];

        assert.strictEqual(
            scope.resolveNow({ nodes: ["a", "b"] }).digest,
            membershipDigestOf({ count: 2, sum: lanes(nodeHash, rows) }, { count: 1, sum: lanes(edgeHash, [ab]) }),
        );
        h.session.dispose();
    });
});
