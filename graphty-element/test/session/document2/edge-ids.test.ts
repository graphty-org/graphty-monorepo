/**
 * @file Edge ids in version 2 save files, behind the `save-files-v2` experiment: every edge, from
 * any source, has the same element-assigned id after a save and a reopen, through the data
 * section's `edgeIds` member (spec 6.2).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { EdgeId } from "../../../src/catalog/types";
import type { JsonObject } from "../../../src/session/document2/types";

const ON = { features: ["save-files-v2"] };
const TEAM_X = { groupBy: "data.team", group: "x" } as const;

/**
 * Every edge in the graph, aggregates standing in for a collapsed group's edges left out, as
 * `id:source>target`, sorted.
 * @param session - The session.
 * @returns The edges.
 */
function edges(session: GraphSession): string[] {
    return session.data
        .edges({ scope: "graph" })
        .filter((edge) => edge["_group.count"] === undefined)
        .map((edge) => `${edge.id}:${String(edge.source)}>${String(edge.target)}`)
        .sort();
}

/**
 * Save as a version 2 full file.
 * @param session - The session.
 * @returns The file's text.
 */
async function save(session: GraphSession): Promise<string> {
    return (await session.project.save({ format: 2, results: true })).text;
}

/**
 * Open a version 2 file into a session.
 * @param text - The file.
 * @param into - The session to open into; a new one when absent.
 * @returns The session and the codes of what the open reported, the kept recipe aside.
 */
async function open(text: string, into?: GraphSession): Promise<{ session: GraphSession; problems: unknown[] }> {
    const session = into ?? createGraphSession(ON);
    const report = await session.project.open(text, { rerun: false, discard: true });
    return {
        session,
        problems: report.problems.filter((problem) => problem.code !== "W_RECIPE_NOT_APPLIED"),
    };
}

/**
 * The data section of a saved full file.
 * @param text - The file.
 * @returns Its body.
 */
function data(text: string): JsonObject {
    return ((JSON.parse(text) as JsonObject).sections as Record<string, JsonObject>).data;
}

/**
 * The file with its data section changed.
 * @param text - The file.
 * @param change - Changes the data section in place.
 * @returns The changed file.
 */
function withData(text: string, change: (section: JsonObject) => void): string {
    const file = JSON.parse(text) as JsonObject;
    change((file.sections as Record<string, JsonObject>).data);
    return JSON.stringify(file);
}

/**
 * Edges from a JSON file, a CSV file and by hand, with some removed and more added after, so
 * the ids have gaps and creation order is not join order.
 * @returns The session.
 */
async function mixed(): Promise<GraphSession> {
    const session = createGraphSession(ON);
    await session.data.import({
        type: "json",
        config: {
            data: JSON.stringify({
                nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
                edges: [
                    { source: "a", target: "b" },
                    { source: "b", target: "c" },
                    { source: "c", target: "a" },
                ],
            }),
        },
        name: "abc.json",
    });
    await session.data.addEdges([{ source: "a", target: "c" }]);
    await session.data.import(
        { type: "csv", config: { data: "source,target\nc,d\nd,e\ne,c\n" }, name: "cde.csv" },
        { mode: "merge" },
    );
    const remove = session.data
        .edges()
        .filter((edge) => `${String(edge.source)}>${String(edge.target)}` === "b>c" || edge.source === "d")
        .map((edge) => edge.id);
    await session.data.removeEdges(remove);
    await session.data.addEdges([
        { source: "e", target: "a" },
        { source: "b", target: "e" },
    ]);
    return session;
}

describe("edge ids in a version 2 save", () => {
    it("gives every edge, from a file, CSV rows or by hand, the id it had after removals", async () => {
        const session = await mixed();
        const before = edges(session);
        const text = await save(session);
        session.dispose();

        const { session: opened, problems } = await open(text);
        assert.deepEqual(problems, []);
        assert.deepEqual(edges(opened), before);
        // A new edge never reuses an id, a restored one or a removed one.
        const highest = Math.max(...before.map((edge) => Number(edge.split(":")[0])));
        await opened.data.addEdges([{ source: "a", target: "e" }]);
        const added = opened.data.edges().find((edge) => edge.source === "a" && edge.target === "e");
        assert.isDefined(added);
        assert.isAbove(Number(added.id), highest);
        opened.dispose();
    });

    it("writes the same file on every save, and a reopened session writes it again", async () => {
        const session = await mixed();
        const first = data(await save(session));
        const second = data(await save(session));
        assert.deepEqual(second, first);
        assert.isObject(first.edgeIds);

        const { session: opened } = await open(await save(session));
        assert.deepEqual(data(await save(opened)).edgeIds, first.edgeIds);
        session.dispose();
        opened.dispose();
    });

    it("keeps the ids of a collapsed group's members and of an edge added to its node", async () => {
        const session = createGraphSession(ON);
        await session.data.import({
            type: "json",
            config: {
                data: JSON.stringify({
                    nodes: [
                        { id: "a", team: "x" },
                        { id: "b", team: "x" },
                        { id: "c", team: "y" },
                        { id: "d", team: "y" },
                    ],
                    edges: [
                        { source: "a", target: "b" },
                        { source: "b", target: "c" },
                        { source: "c", target: "d" },
                    ],
                }),
            },
            name: "teams.json",
        });
        await session.data.removeEdges([session.data.edges()[0].id]);
        await session.data.addEdges([{ source: "a", target: "b" }]);
        const expanded = edges(session);
        const node = await session.groups.collapse(TEAM_X);
        await session.data.addEdges([{ source: node, target: "d" }]);
        const collapsed = edges(session);
        const text = await save(session);
        session.dispose();

        const { session: opened, problems } = await open(text);
        assert.deepEqual(problems, []);
        assert.deepEqual(edges(opened), collapsed);
        opened.dispose();

        // Without the added edge the group expands again, each member edge under its own id.
        const file = JSON.parse(text) as JsonObject;
        const { view } = file.sections as Record<string, JsonObject>;
        delete (view.groups as JsonObject[])[0].edges;
        const { session: again } = await open(JSON.stringify(file));
        await again.groups.expand(TEAM_X);
        assert.deepEqual(edges(again), expanded);
        again.dispose();
    });

    it("opens into an element that already holds edges under the file's ids, replacing them", async () => {
        const session = await mixed();
        const saved = edges(session);
        const text = await save(session);
        session.dispose();

        const busy = createGraphSession(ON);
        await busy.data.addNodes([{ id: "p" }, { id: "q" }]);
        await busy.data.addEdges(Array.from({ length: 12 }, () => ({ source: "p", target: "q" })));
        const held = busy.data.edges().map((edge) => Number(edge.id));
        const { problems } = await open(text, busy);
        assert.deepEqual(problems, []);
        assert.deepEqual(edges(busy), saved);
        await busy.data.addEdges([{ source: "a", target: "e" }]);
        const added = busy.data.edges().find((edge) => edge.source === "a" && edge.target === "e");
        assert.isDefined(added);
        // Past every id the element issued, its earlier edges' included.
        assert.isAbove(Number(added.id), Math.max(...held));
        busy.dispose();
    });

    it("opens a file saved without edge ids, each edge given a fresh id", async () => {
        const session = await mixed();
        const text = withData(await save(session), (section) => {
            delete section.edgeIds;
        });
        const ends = edges(session)
            .map((edge) => edge.split(":")[1])
            .sort();
        session.dispose();

        const { session: opened, problems } = await open(text);
        assert.deepEqual(problems, []);
        assert.deepEqual(
            edges(opened)
                .map((edge) => edge.split(":")[1])
                .sort(),
            ends,
        );
        opened.dispose();
    });

    it("gives a fresh id to an edge saved with an id another edge took, and reports it", async () => {
        const session = await mixed();
        const text = await save(session);
        session.dispose();
        let pointer = "";
        let taken: EdgeId = "";
        const changed = withData(text, (section) => {
            const [load, keys] = Object.entries(section.edgeIds as Record<string, Record<string, EdgeId>>)[0];
            const [first, second] = Object.keys(keys);
            taken = keys[first];
            keys[second] = taken;
            pointer = `/edgeIds/${load}/${second}`;
        });

        const { session: opened, problems } = await open(changed);
        assert.deepEqual(problems, [{ code: "W_MEMBER_LEFT_OUT", params: { section: "data", pointer } }]);
        const ids = opened.data.edges().map((edge) => edge.id);
        assert.strictEqual(new Set(ids).size, ids.length);
        assert.include(ids, taken);
        opened.dispose();
    });
});
