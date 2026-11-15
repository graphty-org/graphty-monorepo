/**
 * @file `session.groups`: collapsing a group to one node and expanding it again round-trips the
 * members' records, coordinates, pins, edges and styles; the stand-in node and edges carry the
 * neutral facts; undo, redo, save and open, two groups at once and a re-run all keep it whole.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";
import { algorithmByKey } from "../../src/catalog/algorithms";
import { isGraphtyError } from "../../src/errors";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";
import { withConsumerStrictState } from "./helpers";

const RED = "#ff0000";

/**
 * A grouping run that puts team x in group 0 and everyone else in group 1; asked for an edge
 * metric, one that scores each edge by its position (1, 2, ...).
 * @param session - Reads the graph the run is over.
 * @param context - The run.
 * @returns Its outcome.
 */
function teams(session: () => GraphSession, context: RunExecutionContext): Promise<RunOutcome> {
    const fields = (algorithmByKey(context.algorithm)?.fields ?? []).map((field) => ({
        ...field,
        path: `results.${context.runId}.${field.name}`,
    }));
    const nodes = session().data.nodes();
    const edges = session().data.edges();
    const caveats = {
        exact: true,
        direction: "as-loaded",
        precision: "f64",
        method: "teams",
        facts: [],
        notes: [],
    } as const;
    if (algorithmByKey(context.algorithm)?.shape === "edge-metric") {
        return Promise.resolve({
            result: createRunResult({
                runId: context.runId,
                shape: "edge-metric",
                fields,
                measured: { nodes: nodes.length, edges: edges.length },
                edges: edges.map((edge, at) => ({ id: edge.id, values: { value: at + 1 } })),
                caveats,
                durationMs: 1,
            }),
        });
    }

    return Promise.resolve({
        result: createRunResult({
            runId: context.runId,
            shape: "community",
            fields,
            measured: { nodes: nodes.length, edges: session().data.edges().length },
            nodes: nodes.map((node) => ({ id: node.id, values: { group: node.team === "x" ? 0 : 1 } })),
            caveats,
            durationMs: 1,
        }),
    });
}

/**
 * Two pieces joined by nothing, plus a hub: team x is a, b, c; team y is d, e; f is alone.
 * a-b, b-c, c-d, d-e, e-f, a-f (weight 3), and c-a.
 * @returns The session.
 */
async function graph(): Promise<GraphSession> {
    const session: GraphSession = createGraphSession({
        runs: { execute: (context) => teams(() => session, context) },
    });
    await session.data.addNodes([
        { id: "a", team: "x", name: "A" },
        { id: "b", team: "x", name: "B" },
        { id: "c", team: "x", name: "C" },
        { id: "d", team: "y", name: "D" },
        { id: "e", team: "y", name: "E" },
        { id: "f", team: "z", name: "F" },
    ]);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
        { source: "c", target: "d", kind: "bridge" },
        { source: "d", target: "e" },
        { source: "e", target: "f" },
        { source: "a", target: "f", weight: 3 },
        { source: "c", target: "a" },
    ]);
    await session.positions.set([
        { id: "a", x: 1, y: 2, z: 0 },
        { id: "b", x: 3, y: 4, z: 0 },
        { id: "c", x: 5, y: 0, z: 0 },
        { id: "d", x: 7, y: 1, z: 0 },
        { id: "e", x: 9, y: 1, z: 0 },
        { id: "f", x: 0, y: 9, z: 0 },
    ]);
    await session.positions.pin(["b"]);
    return session;
}

/**
 * A JSON replacer leaving out an edge's element-assigned id, wherever the edge is kept.
 * @param key - The key.
 * @param value - Its value.
 * @returns The value, or nothing for an edge's id.
 */
function withoutEdgeIds(this: Record<string, unknown>, key: string, value: unknown): unknown {
    return key === "id" && "source" in this && "target" in this ? undefined : value;
}

/**
 * Everything a round trip must give back: nodes, edges (without their element-assigned ids, also
 * where a collapsed node keeps them), coordinates and pins.
 * @param session - The session.
 * @returns A comparable picture.
 */
function picture(session: GraphSession): unknown {
    const { ids } = session.data.snapshot();
    const point = { x: 0, y: 0, z: 0 };
    return {
        nodes: session.data
            .nodes()
            .map((node) => JSON.stringify(node, withoutEdgeIds))
            .sort(),
        edges: session.data
            .edges()
            .map(({ id: _id, ...edge }) => JSON.stringify(edge))
            .sort(),
        positions: session.data
            .nodes()
            .map((node) => {
                session.positions.read(ids.indexOf(node.id), point);
                return `${String(node.id)}@${String(point.x)},${String(point.y)},${String(point.z)}`;
            })
            .sort(),
        pinned: [...session.positions.pinned].map(String).sort(),
    };
}

/**
 * Each edge as `source>target count weight`, sorted.
 * @param session - The session.
 * @returns The edges.
 */
function edges(session: GraphSession): string[] {
    return session.data
        .edges()
        .map((edge) =>
            [`${String(edge.source)}>${String(edge.target)}`, edge["_group.count"], edge["_group.weight"]]
                .filter((each) => each !== undefined)
                .map(String)
                .join(" "),
        )
        .sort();
}

const X = { groupBy: "data.team", group: "x" } as const;
const Y = { groupBy: "data.team", group: "y" } as const;

describe("collapsing a group", () => {
    it("replaces the members with one node at their centre and sums their outside edges", async () => {
        const session = await graph();
        const node = await session.groups.collapse(X);

        assert.deepEqual(
            session.data
                .nodes()
                .map((each) => each.id)
                .sort(),
            ["d", "e", "f", node].sort(),
        );
        const record = session.data.node(node);
        assert.strictEqual(record?.["_group.size"], 3);
        assert.strictEqual(record?.["_group.by"], "data.team");
        assert.strictEqual(record?.["_group.value"], "x");
        // c-d stays one edge; a-f carries its weight; a-b, b-c and c-a are inside and go.
        assert.deepEqual(edges(session), [`${node}>d 1 1`, `${node}>f 1 3`, "d>e", "e>f"].sort());
        const point = { x: 0, y: 0, z: 0 };
        session.positions.read(session.data.snapshot().ids.indexOf(node), point);
        assert.deepEqual(point, { x: 3, y: 2, z: 0 });
        assert.deepEqual(session.groups.list(), [{ groupBy: "data.team", group: "x", node, size: 3 }]);
        // The facts are columns a layer can read; what the expand puts back is not.
        const columns = session.data.attributes().map((each) => each.path);
        assert.includeMembers(columns, ["data._group.size", "data._group.count", "data._group.weight"]);
        assert.notInclude(columns, "data._group.restore");
        session.dispose();
    });

    it("expands back to exactly the graph it collapsed: records, edges, coordinates, pins and styles", async () => {
        const session = await graph();
        await session.styles.add({
            name: "Team x",
            target: "node",
            selector: { match: "rule", where: { kind: "categories", attribute: "data.team", values: ["x"] } },
            set: { "node.color": RED },
        });
        await session.styles.settled();
        const color = (id: string): unknown =>
            (session.styles.explain({ node: id }).merged as Record<string, { hex?: string } | undefined>)["node.color"]
                ?.hex;
        const before = picture(session);
        assert.strictEqual(color("a"), RED);

        await session.groups.collapse(X);
        await session.groups.expand(X);
        await session.styles.settled();

        assert.deepEqual(picture(session), before);
        assert.strictEqual(color("a"), RED);
        assert.notStrictEqual(color("d"), RED);
        assert.deepEqual(session.groups.list(), []);
        session.dispose();
    });

    it("collapses a run's group, named by the run", async () => {
        const session = await graph();
        const run = await session.runs.start("components", {}, { style: false });
        const group = 0;
        const before = picture(session);
        const node = await session.groups.collapse({ run, group });

        assert.strictEqual(session.data.node(node)?.["_group.size"], 3);
        assert.strictEqual(session.data.node(node)?.["_group.by"], session.results.path(run));

        // A run started again over the collapsed graph changes nothing the expand puts back.
        await session.runs.start("components", {}, { style: false });
        await session.groups.expand({ run, group });
        assert.deepEqual(picture(session), before);
        session.dispose();
    });

    it("is one undo step each way, and redo collapses again", async () => {
        const session = await graph();
        const before = picture(session);
        const node = await session.groups.collapse(X);
        const collapsed = picture(session);
        assert.deepEqual(session.history.steps.at(-1)?.fact, {
            code: "groups.collapse",
            params: { groupBy: "data.team", group: "x", size: 3 },
        });

        await session.undo();
        assert.deepEqual(picture(session), before);
        await session.redo();
        assert.deepEqual(picture(session), collapsed);

        await session.groups.expand(X);
        assert.strictEqual(session.history.steps.at(-1)?.fact.code, "groups.expand");
        await session.undo();
        assert.isDefined(session.data.node(node));
        assert.deepEqual(picture(session), collapsed);
        session.dispose();
    });

    it("joins the transaction it is called in", async () => {
        const session = await graph();
        const steps = session.history.steps.length;
        await session.transaction("Tidy", async (tx) => {
            await tx.groups.collapse(X);
            await tx.data.updateNodes([{ id: "f", values: { name: "Eff" } }]);
        });
        assert.strictEqual(session.history.steps.length, steps + 1);
        assert.lengthOf(session.groups.list(), 1);
        await session.undo();
        assert.deepEqual(session.groups.list(), []);
        assert.strictEqual(session.data.node("f")?.name, "F");
        session.dispose();
    });

    it("saves the graph expanded and the collapse as a decision, made again on open", async () => {
        const session = await graph();
        const run = await session.runs.start("components", {}, { style: false });
        const path = session.results.path(run);
        await session.styles.add({
            name: "Group 0",
            target: "node",
            selector: { match: "rule", where: { kind: "categories", attribute: path, values: ["0"] } },
            set: { "node.color": RED },
        });
        const before = picture(session);
        await session.groups.collapse({ run, group: 0 });
        const collapsed = picture(session);
        const { text } = await session.project.save();
        session.dispose();

        // The file holds every member, and no node or edge standing in for them.
        const saved = JSON.parse(text) as { members: { kind: string; graph?: { nodes: { id: string }[] } }[] };
        const data = saved.members.find((member) => member.kind === "graphty-data");
        assert.deepEqual(data?.graph?.nodes.map((node) => node.id).sort(), ["a", "b", "c", "d", "e", "f"]);

        const opened: GraphSession = createGraphSession({
            runs: { execute: (context) => teams(() => opened, context) },
        });
        const { problems } = await opened.project.open(text);
        assert.deepEqual(problems, []);
        assert.deepEqual(picture(opened), collapsed);
        // The open is the step; the collapse made inside it is not one of its own.
        assert.notStrictEqual(opened.history.steps.at(-1)?.fact.code, "groups.collapse");

        await opened.groups.expand({ run, group: 0 });
        await opened.styles.settled();
        assert.deepEqual(picture(opened), before);
        const [reopened] = opened.runs.list();
        assert.strictEqual(reopened.result?.node("a")?.group, 0);
        const color = (id: string): unknown =>
            (opened.styles.explain({ node: id }).merged as Record<string, { hex?: string } | undefined>)["node.color"]
                ?.hex;
        assert.strictEqual(color("a"), RED);
        assert.notStrictEqual(color("d"), RED);
        opened.dispose();
    });

    it("keeps a run's edge values across a collapse and expand, and through save and open", async () => {
        const session = await graph();
        await session.runs.start("edge-betweenness", {}, { style: false });
        // Each edge as `source>target=value`, read from the run by the edge's id.
        const scores = (on: GraphSession): string[] => {
            const [{ result }] = on.runs.list();
            return on.data
                .edges()
                .map((edge) => `${String(edge.source)}>${String(edge.target)}=${String(result?.edge(edge.id)?.value)}`)
                .sort();
        };
        const before = scores(session);
        assert.notInclude(before.join(), "undefined");

        await session.groups.collapse(X);
        await session.groups.expand(X);
        assert.deepEqual(scores(session), before);

        await session.groups.collapse(X);
        const { text } = await session.project.save();
        session.dispose();
        const opened: GraphSession = createGraphSession({
            runs: { execute: (context) => teams(() => opened, context) },
        });
        assert.deepEqual((await opened.project.open(text)).problems, []);
        await opened.groups.expand(X);
        assert.deepEqual(scores(opened), before);
        opened.dispose();
    });

    it("opens a collapsed node moved by hand where it was left, with its pin", async () => {
        const session = await graph();
        const node = await session.groups.collapse(X);
        await session.positions.set([{ id: node, x: 20, y: -4, z: 1 }]);
        await session.positions.pin([node]);
        const collapsed = picture(session);
        const { text } = await session.project.save();
        session.dispose();

        const opened = createGraphSession();
        assert.deepEqual((await opened.project.open(text)).problems, []);
        assert.deepEqual(picture(opened), collapsed);
        assert.isTrue(opened.positions.pinned.has(node));
        opened.dispose();
    });

    it("saves a collapse of collapsed groups unfolded to the members, and opens it in order", async () => {
        const session = await graph();
        const before = picture(session);
        await session.groups.collapse(X);
        await session.groups.collapse(Y);
        // The two collapsed nodes share their `_group.by`: one group of groups.
        const outer = { groupBy: "data._group.by", group: "data.team" } as const;
        const node = await session.groups.collapse(outer);
        assert.strictEqual(session.data.node(node)?.["_group.size"], 2);
        const collapsed = picture(session);
        const { text } = await session.project.save();
        session.dispose();

        const saved = JSON.parse(text) as { members: { kind: string; graph?: { nodes: { id: string }[] } }[] };
        const data = saved.members.find((member) => member.kind === "graphty-data");
        assert.deepEqual(data?.graph?.nodes.map((each) => each.id).sort(), ["a", "b", "c", "d", "e", "f"]);

        const opened = createGraphSession();
        assert.deepEqual((await opened.project.open(text)).problems, []);
        assert.deepEqual(picture(opened), collapsed);
        await opened.groups.expand(outer);
        await opened.groups.expand(Y);
        await opened.groups.expand(X);
        assert.deepEqual(picture(opened), before);
        opened.dispose();
    });

    it("sums an undirected graph's edges both ways round into one per pair", async () => {
        const session = await graph();
        await session.config.set({ data: { directed: false } });
        await session.data.addEdges([{ source: "f", target: "a" }]);
        const node = await session.groups.collapse(X);
        // a-f (weight 3) and f-a are one pair.
        assert.deepEqual(edges(session), [`${node}>d 1 1`, `${node}>f 2 4`, "d>e", "e>f"].sort());
        session.dispose();
    });

    it("refuses to expand a collapsed node holding an edge added to it, and saves that edge", async () => {
        const session = await graph();
        const node = await session.groups.collapse(X);
        await session.data.addEdges([{ source: node, target: "e", kind: "added" }]);
        let code: string | undefined;
        try {
            await session.groups.expand(X);
        } catch (error) {
            code = isGraphtyError(error) ? error.code : "other";
        }
        assert.strictEqual(code, "E_BAD_COMMAND");

        const collapsed = picture(session);
        const { text } = await session.project.save();
        const opened = createGraphSession();
        await opened.project.open(text);
        assert.deepEqual(picture(opened), collapsed);
        session.dispose();
        opened.dispose();
    });

    it("holds two groups at once, expanded in either order", async () => {
        for (const order of [
            [X, Y],
            [Y, X],
        ]) {
            const session = await graph();
            const before = picture(session);
            const x = await session.groups.collapse(X);
            const y = await session.groups.collapse(Y);

            // c-d became one edge between the two collapsed nodes; e-f still counts once.
            assert.deepEqual(edges(session), [`${x}>${y} 1 1`, `${x}>f 1 3`, `${y}>f 1 1`].sort());

            await session.groups.expand(order[0]);
            await session.groups.expand(order[1]);
            assert.deepEqual(picture(session), before);
            session.dispose();
        }
    });

    it("refuses a group with no member, and one collapsed already or not at all", async () => {
        const session = await graph();
        const refused = async (call: () => Promise<unknown>): Promise<string | undefined> => {
            try {
                await call();
            } catch (error) {
                return isGraphtyError(error) ? error.code : "other";
            }
            return undefined;
        };

        assert.strictEqual(
            await refused(() => session.groups.collapse({ groupBy: "data.team", group: "q" })),
            "E_BAD_COMMAND",
        );
        assert.strictEqual(await refused(() => session.groups.expand(X)), "E_BAD_COMMAND");
        await session.groups.collapse(X);
        assert.strictEqual(await refused(() => session.groups.collapse(X)), "E_BAD_COMMAND");
        session.dispose();
    });

    it("does work linear in the graph to collapse and to expand", async () => {
        for (const door of ["collapse", "expand"] as const) {
            await assertScalesLinearly(
                (size) =>
                    withConsumerStrictState(async () => {
                        const session = createGraphSession();
                        const ids = Array.from({ length: size }, (_, at) => `n${String(at)}`);
                        // Half the nodes are team x; a path joins every node.
                        await session.data.addNodes(ids.map((id, at) => ({ id, team: at % 2 === 0 ? "x" : "y" })));
                        await session.data.addEdges(ids.slice(1).map((id, at) => ({ source: ids[at], target: id })));
                        if (door === "expand") {
                            await session.groups.collapse(X);
                        }
                        const visits = await visitsDuring(() => session.groups[door](X));
                        session.dispose();
                        return visits;
                    }),
                { sizes: [200, 800], growth: "linear", counter: `elements visited by GroupsApi.${door}` },
            );
        }
    });
});
