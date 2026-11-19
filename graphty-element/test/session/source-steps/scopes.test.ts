/**
 * @file Scopes, readable paths and the type selector under the source-steps experiment (design
 * section 3.9, 8.4 to 8.6), ported from the reference model's scope-inside-visible,
 * type-filter-is-judged, phases 10 and review-round-5 "Select nodes on an edge-list source" cases.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import { full } from "./scenario";

/**
 * A Source scope as the Analyze popover writes it: inside the visible graph (design 8.6).
 * @param source - The source.
 * @param side - Which half it keeps.
 * @returns The scope.
 */
const sourceScope = (source: string, side: "nodes" | "edges") =>
    ({
        define: {
            kind: "rule",
            where: {
                kind: "all",
                of: [
                    { kind: "member", of: "visible" },
                    { kind: "source", sources: [source], side },
                ],
            },
            reading: side === "edges" ? "listed" : "clipped",
        },
    }) as const;

/**
 * A Type scope inside the visible graph.
 * @param types - The types.
 * @returns The scope.
 */
const typeScope = (types: readonly string[]) =>
    ({
        define: {
            kind: "rule",
            where: {
                kind: "all",
                of: [
                    { kind: "member", of: "visible" },
                    { kind: "expression", where: types.map((t) => `graphty.type == '${t}'`).join(" || ") },
                ],
            },
            reading: "clipped",
        },
    }) as const;

/**
 * The nodes of a session shown now.
 * @param session - The session.
 * @returns Their ids.
 */
async function shownNodes(session: GraphSession): Promise<Set<string>> {
    return new Set([...(await session.scope.resolve("visible")).nodes].map(String));
}

describe("source-steps: scopes and readable paths", () => {
    it("lists the readable paths and reads them in rules (design 3.9)", async () => {
        const { session, t } = await full();
        const paths = session.data
            .readableValues()
            .filter((v) => v.from === "element")
            .map((v) => `${v.on}:${v.path}`);
        for (const path of ["node:graphty.type", "node:graphty.space", "node:graphty.key", "edge:graphty.load"]) {
            assert.include(paths, path);
        }
        // They are the element's facts, not data columns.
        assert.notInclude(
            session.data.attributes().map((a) => a.name),
            "graphty.type",
        );
        const loads = session.data.valueCounts("graphty.load", { kind: "edge" });
        // Its four transfers and the two device edges extracted from it.
        assert.strictEqual(loads.values.find((v) => v.value === t)?.count, 6);
        session.dispose();
    });

    it("{ types } is the nodes of those types and the edges between them", async () => {
        const { session } = await full();
        const accounts = await session.scope.count({ types: ["account"] });
        assert.strictEqual(accounts.edges, 0, "Type: account has no edges on an account-merchant graph");
        assert.isAbove(accounts.nodes, 0);
        const both = await session.scope.count({ types: ["account", "merchant"] });
        // The four transfers and bank B's X-1; X-2 ends on B-7, which no end rule types.
        assert.strictEqual(both.edges, 5);
        session.dispose();
    });

    it("the type selector paints the elements of the listed types", async () => {
        const { session } = await full();
        const layer = await session.styles.add({
            name: "Devices",
            target: "node",
            selector: { match: "type", types: ["device"] },
            set: { "node.color": "#ff0000" },
        });
        assert.strictEqual(session.styles.counts(layer.id).matched, 2);
        session.dispose();
    });

    it("Type and Source scopes leave out what a filter hides (scope-inside-visible)", async () => {
        const { session, t } = await full();
        const before = [
            await session.scope.count(typeScope(["account", "merchant"])),
            await session.scope.count(sourceScope(t, "edges")),
        ];
        await session.visibility.addCondition({
            effect: "keep",
            source: t,
            rule: { kind: "range", attribute: "data.amount", min: 8 },
        });
        const after = [
            await session.scope.count(typeScope(["account", "merchant"])),
            await session.scope.count(sourceScope(t, "edges")),
        ];
        for (const [i, scope] of after.entries()) {
            assert.isBelow(scope.edges, before[i].edges, `scope ${String(i)} still counts hidden edges`);
        }
        session.dispose();
    });

    it("a graph-wide condition on graphty.type is judged, not held (type-filter-is-judged)", async () => {
        const { session } = await full();
        await session.visibility.addCondition({
            effect: "keep",
            rule: { kind: "categories", attribute: "graphty.type", values: ["account"] },
        });
        const shown = await shownNodes(session);
        assert.isFalse(shown.has("D-1") || shown.has("D-2"), "device nodes stay shown");
        session.dispose();
    });

    it("phase 10: a Source scope holds the source's edges and their ends", async () => {
        const { session, b } = await full();
        const scope = await session.scope.count(sourceScope(b, "edges"));
        assert.strictEqual(scope.edges, 2);
        session.dispose();
    });

    it("Select nodes on an edge-list source selects the nodes its edge ends created (review-round-5 3.1)", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        await session.data.import(
            { type: "csv", config: { data: "from,to\np1,p2\np2,p3\n" }, name: "knows.csv" },
            { edges: { from: { column: "from" }, to: { column: "to" } } },
        );
        const [{ key: id }] = session.data.sources();
        assert.strictEqual((await session.scope.count(sourceScope(id, "nodes"))).nodes, 3);
        const loads = session.data.valueCounts("graphty.load", { kind: "node" });
        assert.deepStrictEqual(
            loads.values.map((v) => [v.value, v.count]),
            [[id, 3]],
        );
        session.dispose();
    });
});
