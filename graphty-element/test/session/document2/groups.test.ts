/**
 * @file Collapsed groups in version 2 save files, behind the `save-files-v2` experiment: the data
 * section holds the graph expanded (the members, their edges, coordinates and pins), the view
 * section holds the collapses as decisions, and an open makes them again in the saved order.
 */

import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { EdgeId, NodeId } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { schemaUrl } from "../../../src/session/document2/framing";
import type { JsonObject } from "../../../src/session/document2/types";

const SPEC = new URL("../../../spec/", import.meta.url);
const readJson = (path: string): JsonObject => JSON.parse(readFileSync(new URL(path, SPEC), "utf8")) as JsonObject;
const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
addFormats(ajv);
ajv.addSchema(readJson("schemas/common/v2.json"));
ajv.addSchema(readJson("schemas/graphty-view/v1.json"));

/**
 * Validation errors of a view section against its schema.
 * @param view - The section.
 * @returns The errors, empty when it validates.
 */
function invalid(view: JsonObject): string[] {
    const validate = ajv.getSchema(schemaUrl("graphty-view", 1));
    assert.isDefined(validate);
    return validate(view)
        ? []
        : (validate.errors ?? []).map((error) => `${error.instancePath} ${String(error.message)}`);
}

const ON = { features: ["save-files-v2"] };
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const X = { groupBy: "data.team", group: "x" } as const;
const Y = { groupBy: "data.team", group: "y" } as const;

/**
 * Two teams and a loner: team x is a, b, c; team y is d, e; f is alone. b is pinned.
 * @returns The session.
 */
async function graph(): Promise<GraphSession> {
    const session = createGraphSession(ON);
    // Loaded from a file, so each node is named by its key and opens under the same id.
    await session.data.import({
        type: "json",
        config: {
            data: JSON.stringify({
                nodes: [
                    { id: "a", team: "x" },
                    { id: "b", team: "x" },
                    { id: "c", team: "x" },
                    { id: "d", team: "y" },
                    { id: "e", team: "y" },
                    { id: "f", team: "z" },
                ],
                edges: [
                    { source: "a", target: "b" },
                    { source: "b", target: "c" },
                    { source: "c", target: "d" },
                    { source: "d", target: "e" },
                    { source: "e", target: "f" },
                    { source: "a", target: "f", weight: 3 },
                ],
            }),
        },
        name: "teams.json",
    });
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
 * Everything a round trip must give back: nodes, edges (as `source>target`), coordinates and pins.
 * @param session - The session.
 * @returns A comparable picture.
 */
function picture(session: GraphSession): unknown {
    const { ids } = session.data.snapshot();
    const point = { x: 0, y: 0, z: 0 };
    return {
        nodes: session.data
            .nodes()
            .map((node) => String(node.id))
            .sort(),
        edges: session.data
            .edges()
            .map((edge) => `${String(edge.source)}>${String(edge.target)}`)
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
 * Save a session as a version 2 full file with results, so the coordinates are saved.
 * @param session - The session.
 * @returns The file's text and what the save reported.
 */
async function save(session: GraphSession): Promise<{ text: string; problems: readonly unknown[] }> {
    const saved = await session.project.save({ format: 2, results: true });
    return { text: saved.text, problems: saved.report.leftOut };
}

/**
 * Open a version 2 file in a new session, the saved coordinates restored rather than laid out.
 * @param text - The file.
 * @returns The session.
 */
async function open(text: string): Promise<GraphSession> {
    const opened = createGraphSession(ON);
    const report = await opened.project.open(text, { rerun: false });
    // A recipe is kept, not applied, on an open: the only note an open of a full file gives.
    assert.deepEqual(
        report.problems.filter((problem) => problem.code !== "W_RECIPE_NOT_APPLIED"),
        [],
    );
    return opened;
}

/**
 * A section of a saved full file.
 * @param text - The file.
 * @param name - The section.
 * @returns Its body.
 */
function section(text: string, name: string): JsonObject {
    return ((JSON.parse(text) as JsonObject).sections as Record<string, JsonObject>)[name];
}

/**
 * The id of the edge added to a node standing in for a group.
 * @param session - The session.
 * @param node - The node standing in.
 * @returns The edge's id.
 */
function addedEdge(session: GraphSession, node: NodeId): EdgeId {
    const edge = session.data
        .edges({ scope: "graph" })
        .find((each) => (each.source === node || each.target === node) && each["_group.count"] === undefined);
    assert.isDefined(edge);
    return edge.id;
}

/**
 * Each edge standing in for others as `source>target count weight`, sorted.
 * @param session - The session.
 * @returns The edges.
 */
function aggregates(session: GraphSession): string[] {
    return session.data
        .edges({ scope: "graph" })
        .filter((edge) => edge["_group.count"] !== undefined)
        .map(
            (edge) =>
                `${String(edge.source)}>${String(edge.target)} ${String(edge["_group.count"])} ${String(edge["_group.weight"])}`,
        )
        .sort();
}

/**
 * Check that expanding a group is refused for the edges added to its node.
 * @param session - The session.
 * @param ref - The group.
 */
async function refusedExpand(session: GraphSession, ref: typeof X): Promise<void> {
    let details: unknown;
    try {
        await session.groups.expand(ref);
    } catch (error) {
        details = isGraphtyError(error) && error.code === "E_BAD_COMMAND" ? error.details : undefined;
    }

    assert.lengthOf((details as { edges: unknown[] } | undefined)?.edges ?? [], 1);
}

describe("collapsed groups in version 2 save files", () => {
    it("saves the graph expanded and the collapse in view, and collapses it again on open", async () => {
        const session = await graph();
        const before = picture(session);
        await session.groups.collapse(X);
        const collapsed = picture(session);
        const list = session.groups.list();
        const { text, problems } = await save(session);
        session.dispose();

        assert.deepEqual(problems, []);
        assert.notInclude(JSON.stringify(section(text, "data")), "group:");
        assert.deepEqual(section(text, "view").groups, [
            { groupBy: "data.team", group: "x", position: { x: 3, y: 2, z: 0 } },
        ]);
        assert.deepEqual(invalid(section(text, "view")), []);

        const opened = await open(text);
        assert.deepEqual(picture(opened), collapsed);
        assert.deepEqual(opened.groups.list(), list);
        await opened.groups.expand(X);
        assert.deepEqual(picture(opened), before);
        opened.dispose();
    });

    it("collapses a collapse of collapsed groups again in order, and expands back to the members", async () => {
        const session = await graph();
        const before = picture(session);
        await session.groups.collapse(X);
        await session.groups.collapse(Y);
        const outer = { groupBy: "data._group.by", group: "data.team" } as const;
        await session.groups.collapse(outer);
        const collapsed = picture(session);
        const { text, problems } = await save(session);
        session.dispose();

        assert.deepEqual(problems, []);
        const opened = await open(text);
        assert.deepEqual(picture(opened), collapsed);
        await opened.groups.expand(outer);
        await opened.groups.expand(Y);
        await opened.groups.expand(X);
        assert.deepEqual(picture(opened), before);
        opened.dispose();
    });

    it("carries a version 1 file's collapses across its migration", async () => {
        const session = await graph();
        const before = picture(session);
        await session.groups.collapse(X);
        const collapsed = picture(session);
        const { text } = await session.project.save();
        session.dispose();

        const opened = createGraphSession(ON);
        const report = await opened.project.open(text, { migrate: true, rerun: false });
        assert.notInclude(
            report.problems.map((problem) => problem.code),
            "E_BAD_DOCUMENT",
        );
        assert.deepEqual(picture(opened), collapsed);
        const saved = await opened.project.save({ format: 2 });
        assert.deepEqual(section(saved.text, "view").groups, [
            { groupBy: "data.team", group: "x", position: { x: 3, y: 2, z: 0 } },
        ]);
        await opened.groups.expand(X);
        assert.deepEqual(picture(opened), before);
        opened.dispose();
    });

    it("saves an edge added to a node standing in for a group with its collapse, and adds it again on open", async () => {
        const session = await graph();
        const node = await session.groups.collapse(X);
        await session.data.addEdges([{ source: node, target: "e", weight: 2 }]);
        const edge = addedEdge(session, node);
        await session.selection.apply({ edges: [edge] });
        const collapsed = picture(session);
        const { text, problems } = await save(session);
        session.dispose();

        assert.deepEqual(problems, []);
        const view = section(text, "view");
        assert.deepEqual(invalid(view), []);
        const [entry] = (view.groups as JsonObject[])[0].edges as JsonObject[];
        assert.deepEqual(entry.from, { groupBy: "data.team", group: "x" });
        assert.deepEqual(entry.to, { space: (entry.to as JsonObject).space, key: "e" });
        assert.strictEqual((entry.edge as JsonObject).load, "reader");
        assert.match(String((entry.edge as JsonObject).key), ULID);
        assert.deepEqual(entry.columns, { weight: 2 });
        assert.notInclude(JSON.stringify(section(text, "data")), "group:");
        assert.notInclude(JSON.stringify(section(text, "data")), String((entry.edge as JsonObject).key));

        const opened = await open(text);
        assert.deepEqual(picture(opened), collapsed);
        const back = addedEdge(opened, node);
        assert.strictEqual(opened.data.edge(back)?.weight, 2);
        assert.deepEqual([...opened.selection.edges], [back]);
        const again = await save(opened);
        assert.deepEqual(section(again.text, "view"), view);
        await refusedExpand(opened, X);
        opened.dispose();
    });

    it("puts an edge between two groups' nodes on the later collapse", async () => {
        const session = await graph();
        const x = await session.groups.collapse(X);
        const y = await session.groups.collapse(Y);
        await session.data.addEdges([{ source: x, target: y, weight: 5 }]);
        const collapsed = picture(session);
        const { text, problems } = await save(session);
        session.dispose();

        assert.deepEqual(problems, []);
        const groups = section(text, "view").groups as JsonObject[];
        assert.isUndefined(groups[0].edges);
        const [entry] = groups[1].edges as JsonObject[];
        assert.deepEqual([entry.from, entry.to], [X, Y]);
        assert.deepEqual(invalid(section(text, "view")), []);

        const opened = await open(text);
        assert.deepEqual(picture(opened), collapsed);
        assert.strictEqual(opened.data.edge(addedEdge(opened, x))?.weight, 5);
        opened.dispose();
    });

    it("makes a collapse that swallowed an added edge after the edge's group, not in graph order", async () => {
        const session = createGraphSession(ON);
        await session.data.import({
            type: "json",
            config: {
                data: JSON.stringify({
                    nodes: [
                        { id: "a", team: "x" },
                        { id: "b", team: "x" },
                        { id: "d", kind: "k" },
                        { id: "e", kind: "k" },
                        { id: "f" },
                    ],
                    edges: [
                        { source: "a", target: "b" },
                        { source: "b", target: "d" },
                        { source: "d", target: "e" },
                        { source: "e", target: "f" },
                        { source: "a", target: "f" },
                    ],
                }),
            },
            name: "kinds.json",
        });
        const before = picture(session);
        const x = await session.groups.collapse(X);
        await session.data.addEdges([{ source: x, target: "d", weight: 4 }]);
        const kind = { groupBy: "data.kind", group: "k" } as const;
        await session.groups.collapse(kind);
        const outer = { groupBy: "data._group.by", group: "data.team" } as const;
        await session.groups.collapse(outer);
        const collapsed = picture(session);
        const sums = aggregates(session);
        const { text, problems } = await save(session);
        session.dispose();

        assert.deepEqual(problems, []);
        const groups = section(text, "view").groups as JsonObject[];
        assert.deepEqual(
            groups.map(({ groupBy, group }) => ({ groupBy, group })),
            [X, kind, outer],
        );
        assert.lengthOf(groups[0].edges as unknown[], 1);
        assert.deepEqual(invalid(section(text, "view")), []);

        const opened = await open(text);
        assert.deepEqual(picture(opened), collapsed);
        assert.deepEqual(aggregates(opened), sums);
        await opened.groups.expand(outer);
        await opened.groups.expand(kind);
        assert.strictEqual(opened.data.edge(addedEdge(opened, x))?.weight, 4);
        await opened.data.removeEdges([addedEdge(opened, x)]);
        await opened.groups.expand(X);
        assert.deepEqual(picture(opened), before);
        opened.dispose();
    });

    it("adds an edge to a collapsed group's node again before the collapse holding that node", async () => {
        const session = await graph();
        const x = await session.groups.collapse(X);
        await session.data.addEdges([{ source: x, target: "f" }]);
        const outer = { groupBy: "data._group.by", group: "data.team" } as const;
        await session.groups.collapse(outer);
        const collapsed = picture(session);
        const sums = aggregates(session);
        const { text, problems } = await save(session);
        session.dispose();

        assert.deepEqual(problems, []);
        const opened = await open(text);
        assert.deepEqual(picture(opened), collapsed);
        assert.deepEqual(aggregates(opened), sums);
        await opened.groups.expand(outer);
        assert.include((picture(opened) as { edges: string[] }).edges, `${x}>f`);
        opened.dispose();
    });

    it("carries a version 1 file's edges added to a collapsed group across its migration", async () => {
        const session = await graph();
        const node = await session.groups.collapse(X);
        await session.data.addEdges([{ source: node, target: "e", weight: 2 }]);
        const collapsed = picture(session);
        const { text } = await session.project.save();
        session.dispose();

        const opened = createGraphSession(ON);
        const report = await opened.project.open(text, { migrate: true, rerun: false });
        const codes = report.problems.map((problem) => problem.code);
        assert.notInclude(codes, "E_BAD_DOCUMENT");
        assert.notInclude(JSON.stringify(report.problems), "/groups/added");
        assert.deepEqual(picture(opened), collapsed);
        const saved = await opened.project.save({ format: 2 });
        const [entry] = (section(saved.text, "view").groups as JsonObject[])[0].edges as JsonObject[];
        assert.deepEqual(entry.from, { groupBy: "data.team", group: "x" });
        assert.strictEqual((entry.edge as JsonObject).load, "reader");
        assert.match(String((entry.edge as JsonObject).key), ULID);
        opened.dispose();
    });

    it("reports an added edge naming a collapse not yet made, or a node bound nowhere, and goes on", async () => {
        const session = await graph();
        const x = await session.groups.collapse(X);
        const y = await session.groups.collapse(Y);
        await session.data.addEdges([
            { source: x, target: y },
            { source: y, target: "f" },
        ]);
        const { text } = await save(session);
        session.dispose();

        const file = JSON.parse(text) as JsonObject;
        const groups = ((file.sections as Record<string, JsonObject>).view.groups as JsonObject[]).map((each) => ({
            ...each,
        }));
        // The x-y edge moved onto x's collapse names y's, which is made after it; the y-f edge's
        // end names a node the data does not hold.
        const [between, toF] = groups[1].edges as JsonObject[];
        groups[0] = { ...groups[0], edges: [between] };
        groups[1] = { ...groups[1], edges: [{ ...toF, to: { ...(toF.to as JsonObject), key: "nowhere" } }] };
        (file.sections as Record<string, JsonObject>).view.groups = groups;

        const opened = createGraphSession(ON);
        const report = await opened.project.open(JSON.stringify(file), { rerun: false });
        assert.deepInclude(report.problems, {
            code: "E_BAD_DOCUMENT",
            params: { section: "view", pointer: "/sections/view/groups/0/edges/0" },
        });
        assert.include(
            report.problems.map((problem) => `${problem.code} ${String(problem.params.pointer)}`),
            "W_REFERENCE_UNBOUND /sections/view/groups/1/edges/0/to",
        );
        assert.lengthOf(opened.groups.list(), 2);
        opened.dispose();
    });

    it("reports the collapses as left out of a save that writes the data without view", async () => {
        const session = await graph();
        await session.groups.collapse(X);
        const saved = await session.project.save({ format: 2, sections: ["data"] });
        session.dispose();

        assert.deepInclude(saved.report.leftOut, {
            code: "W_MEMBER_LEFT_OUT",
            params: { kind: "graphty-session", field: "groups" },
        });
        assert.notInclude(saved.text, "group:");
    });
});
