/**
 * @file `sets.createPath("selection")`: an unambiguous chain of selected edges becomes a path in
 * walk order, and anything else is refused saying why (design/sets/sets-design.md sections 4.4,
 * 13.3 and 15.2).
 */

import { assert, describe, it } from "vitest";

import type { EdgeMember } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { edgeBetween, type EdgeRow, type Harness, makeSession } from "../helpers";
import { builtInRuns } from "./algorithms";

/** A session over the given edges; nodes are their endpoints plus any extra ids. */
function harnessOf(
    edges: readonly [string, string][],
    directed: boolean | "auto" = "auto",
    extra: readonly string[] = [],
): Harness {
    const harness = makeSession({ directed });
    const ids = [...new Set([...edges.flat(), ...extra])];
    harness.add(
        ids.map((id) => ({ id })),
        edges.map(([src, dst]): EdgeRow => ({ src, dst })),
    );

    return harness;
}

/**
 * Why a createPath call was refused, or null when it was not.
 * @param call - The call.
 * @returns The code and `details.why`.
 */
async function refusalOf(
    call: () => Promise<unknown>,
): Promise<{ code: string; reason: unknown; why: unknown } | null> {
    try {
        await call();
    } catch (error) {
        if (!isGraphtyError(error)) {
            throw error;
        }

        const details = error.details as { reason?: unknown; why?: unknown } | undefined;

        return { code: error.code, reason: details?.reason, why: details?.why };
    }

    return null;
}

const CHAIN: [string, string][] = [
    ["a", "b"],
    ["b", "c"],
    ["c", "d"],
    ["c", "e"],
    ["f", "g"],
];

describe("sets.createPath: an unambiguous chain", () => {
    it("orders the selected edges into a walk, whatever order they were selected in", async () => {
        const h = harnessOf(CHAIN);
        await h.session.selection.apply({
            edges: [edgeBetween(h, "c", "d"), edgeBetween(h, "a", "b"), edgeBetween(h, "b", "c")],
        });

        const id = await h.session.sets.createPath("selection", { name: "Route" });

        const set = h.session.sets.get(id);
        const definition = set?.definition;
        assert.strictEqual(definition?.kind, "path");
        assert.deepStrictEqual(definition?.kind === "path" ? definition.nodes : null, ["a", "b", "c", "d"]);
        const steps = definition?.kind === "path" ? (definition.edges ?? []) : [];
        assert.deepStrictEqual(
            steps.map((step) => {
                const member = step as EdgeMember;
                return `${String(member.source)}-${String(member.target)}`;
            }),
            ["a-b", "b-c", "c-d"],
        );
        assert.deepStrictEqual(set?.createdFrom, { kind: "selection" });
        assert.strictEqual(h.session.sets.pathKind(id), "simple");
        const count = await h.session.scope.count({ set: id });
        assert.deepStrictEqual([count.nodes, count.edges], [4, 3]);
    });

    it("starts at the end from which every step follows its edge's direction", async () => {
        const h = harnessOf(
            [
                ["d", "c"],
                ["c", "b"],
                ["b", "a"],
            ],
            true,
        );
        await h.session.selection.apply({
            edges: [edgeBetween(h, "b", "a"), edgeBetween(h, "d", "c"), edgeBetween(h, "c", "b")],
        });

        const id = await h.session.sets.createPath("selection");

        const definition = h.session.sets.get(id)?.definition;
        assert.deepStrictEqual(definition?.kind === "path" ? definition.nodes : null, ["d", "c", "b", "a"]);
    });

    it("makes parallel edges between one pair one step naming both", async () => {
        const h = harnessOf([
            ["a", "b"],
            ["a", "b"],
            ["b", "c"],
        ]);
        const snapshot = h.session.data.snapshot();
        const all: string[] = [];
        for (let row = 0; row < snapshot.edgeCount; row++) {
            all.push(String(snapshot.edges.byRole("id")?.value(row)));
        }

        await h.session.selection.apply({ edges: all });
        const id = await h.session.sets.createPath("selection");

        const definition = h.session.sets.get(id)?.definition;
        const steps = definition?.kind === "path" ? (definition.edges ?? []) : [];
        assert.deepStrictEqual(definition?.kind === "path" ? definition.nodes : null, ["a", "b", "c"]);
        assert.isTrue(Array.isArray(steps[0]) && steps[0].length === 2, "the first step names both parallel edges");
        assert.isFalse(Array.isArray(steps[1]));
        assert.strictEqual((await h.session.scope.count({ set: id })).edges, 3);
    });

    it("makes one selected node and no edges a zero-length path", async () => {
        const h = harnessOf(CHAIN);
        await h.session.selection.apply({ nodes: ["c"] });

        const id = await h.session.sets.createPath("selection");

        assert.deepStrictEqual(h.session.sets.get(id)?.definition, { kind: "path", nodes: ["c"] });
    });

    it("accepts the chain's own nodes selected beside its edges", async () => {
        const h = harnessOf(CHAIN);
        await h.session.selection.apply({ nodes: ["a", "b"], edges: [edgeBetween(h, "a", "b")] });

        const id = await h.session.sets.createPath("selection");

        const definition = h.session.sets.get(id)?.definition;
        assert.deepStrictEqual(definition?.kind === "path" ? definition.nodes : null, ["a", "b"]);
    });
});

describe("sets.createPath: an ambiguous selection is refused, saying why", () => {
    const cases: { name: string; edges: [string, string][]; nodes?: string[]; why: string }[] = [
        { name: "nothing selected", edges: [], why: "no-edges" },
        { name: "two nodes and no edges", edges: [], nodes: ["a", "b"], why: "no-edges" },
        {
            name: "a node joining three selected edges",
            edges: [
                ["b", "c"],
                ["c", "d"],
                ["c", "e"],
            ],
            why: "branch",
        },
        {
            name: "edges in two pieces",
            edges: [
                ["a", "b"],
                ["f", "g"],
            ],
            why: "disconnected",
        },
        { name: "a node off the chain", edges: [["a", "b"]], nodes: ["e"], why: "off-path-nodes" },
    ];

    for (const c of cases) {
        it(`refuses ${c.name}`, async () => {
            const h = harnessOf(CHAIN);
            await h.session.selection.apply({
                nodes: c.nodes ?? [],
                edges: c.edges.map(([s, t]) => edgeBetween(h, s, t)),
            });

            assert.deepStrictEqual(await refusalOf(() => h.session.sets.createPath("selection")), {
                code: "E_BAD_COMMAND",
                reason: "ambiguous-path",
                why: c.why,
            });
            assert.deepStrictEqual(h.session.sets.list(), []);
        });
    }

    it("refuses a cycle, which has no first node", async () => {
        const h = harnessOf([
            ["a", "b"],
            ["b", "c"],
            ["c", "a"],
        ]);
        await h.session.selection.apply({
            edges: [edgeBetween(h, "a", "b"), edgeBetween(h, "b", "c"), edgeBetween(h, "c", "a")],
        });

        assert.deepStrictEqual(await refusalOf(() => h.session.sets.createPath("selection")), {
            code: "E_BAD_COMMAND",
            reason: "ambiguous-path",
            why: "cycle",
        });
    });

    it("refuses a loop", async () => {
        const h = harnessOf([
            ["a", "a"],
            ["a", "b"],
        ]);
        await h.session.selection.apply({ edges: [edgeBetween(h, "a", "a"), edgeBetween(h, "a", "b")] });

        assert.strictEqual((await refusalOf(() => h.session.sets.createPath("selection")))?.why, "self-loop");
    });

    it("refuses a source other than the selection", async () => {
        const h = harnessOf(CHAIN);

        assert.strictEqual(
            (await refusalOf(() => h.session.sets.createPath("graph" as "selection")))?.code,
            "E_BAD_COMMAND",
        );
    });
});

describe("sets.createPath from a shortest-path offer", () => {
    it("names the one parallel edge the route took at each step, never a group", async () => {
        let harness: Harness | null = null;
        const h = makeSession({ directed: true, runs: { execute: builtInRuns(() => harness as Harness) } });
        harness = h;
        h.add(
            ["a", "b", "c"].map((id) => ({ id })),
            [
                { src: "a", dst: "b", weight: 4 },
                { src: "a", dst: "b", weight: 1 },
                { src: "b", dst: "c", weight: 1 },
            ],
        );
        const run = h.session.runs.start(
            "shortest-path",
            { method: "dijkstra", source: "a", target: "c" },
            { scope: "graph", style: false },
        );
        await run;
        const offer = h.session.sets.offers(run.id).offers.find((entry) => entry.path);
        assert.isDefined(offer);

        const id = await h.session.sets.createPath(offer);
        const definition = h.session.sets.get(id)?.definition as unknown as {
            nodes: string[];
            edges: (EdgeMember | EdgeMember[])[];
        };

        assert.deepStrictEqual(definition.nodes, ["a", "b", "c"]);
        assert.isTrue(
            definition.edges.every((step) => !Array.isArray(step)),
            "one edge per step",
        );
        // Edges added in the session carry minted ids in the order they arrived: e0 is a-b at 4.
        assert.deepStrictEqual(
            definition.edges.map((step) => (step as EdgeMember).id),
            ["graphty:e1", "graphty:e2"],
            "the second a-b edge, the cheaper one, then the only b-c edge",
        );
    });
});
