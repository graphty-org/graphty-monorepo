/**
 * @file The `view` section codec, version 1 (spec 4.7, 5 and 7), behind the `save-files-v2`
 * experiment: what it writes validates against its schema, a session survives a save and an open
 * (state to section to state), a section survives an open and a save byte for byte (section to state
 * to section), and what does not bind or cannot run is reported and kept. Element references come
 * from a stand-in, since the data codec's are not built yet.
 */

import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { viewCodec } from "../../../src/session/document2/codecs/view";
import { schemaUrl } from "../../../src/session/document2/framing";
import {
    type DocumentProblem,
    type ElementRefs,
    HEADER_MEMBERS,
    type JsonObject,
    type ReadContext,
    type ReadSection,
    type SectionHeader,
    type WriteContext,
} from "../../../src/session/document2/types";
import { finishAtOnce } from "../runs/harness";

const SPEC = new URL("../../../spec/", import.meta.url);
const readJson = (path: string): JsonObject => JSON.parse(readFileSync(new URL(path, SPEC), "utf8")) as JsonObject;

const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
addFormats(ajv);
ajv.addSchema(readJson("schemas/common/v2.json"));
ajv.addSchema(readJson("schemas/graphty-view/v1.json"));

const SPACE = "source:test";
const DATA_ID = "d1a7c0de-0001-4000-8000-000000000001";

/**
 * Validation errors of a view section against its schema.
 * @param section - The section.
 * @returns The errors, empty when it validates.
 */
function invalid(section: JsonObject): string[] {
    const validate = ajv.getSchema(schemaUrl("graphty-view", 1));
    assert.isDefined(validate);
    return validate(section)
        ? []
        : (validate.errors ?? []).map((error) => `${error.instancePath} ${String(error.message)}`);
}

/**
 * Stand-in element references: a node is `source:test` plus its id, an edge its two ends plus
 * `<source>-><target>` as its key.
 * @param session - The session.
 * @returns The references.
 */
function refsOf(session: GraphSession): ElementRefs {
    const node = (ref: unknown): string | undefined => {
        const held = ref as { space?: unknown; key?: unknown } | null;
        const id = held?.space === SPACE ? held.key : undefined;
        return typeof id === "string" && session.data.node(id) !== undefined ? id : undefined;
    };
    return {
        nodeRef: (id) => (session.data.node(id) === undefined ? undefined : { space: SPACE, key: String(id) }),
        edgeRef: (id) => {
            const edge = session.data.edge(id);
            return edge === undefined
                ? undefined
                : {
                      from: { space: SPACE, key: String(edge.source) },
                      to: { space: SPACE, key: String(edge.target) },
                      key: `${String(edge.source)}->${String(edge.target)}`,
                  };
        },
        node,
        edge: (ref) => {
            const held = ref as { from?: unknown; to?: unknown } | null;
            const [from, to] = [node(held?.from), node(held?.to)];
            return session.data.edges().find((edge) => edge.source === from && edge.target === to)?.id;
        },
    };
}

/**
 * A session holding five nodes and four edges.
 * @returns The session.
 */
async function sessionWithData(): Promise<GraphSession> {
    const session = createGraphSession({ features: ["save-files-v2"], runs: { execute: finishAtOnce } });
    await session.data.addNodes(["a", "b", "c", "d", "e"].map((id) => ({ id, group: id === "e" ? "y" : "x" })));
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
        { source: "c", target: "d" },
        { source: "d", target: "e" },
    ]);
    return session;
}

/**
 * The view section a session writes, with the header framing would write.
 * @param session - The session.
 * @returns The section.
 */
async function save(session: GraphSession): Promise<JsonObject> {
    const context: WriteContext = {
        session,
        problems: [],
        refs: () => refsOf(session),
        dataId: () => DATA_ID,
        sections: new Set(["view"]),
        embed: {},
        // The runs these tests start are named by the element, so they are written under `session`.
        isDerived: () => true,
        bindsTo: () => Promise.resolve({ data: DATA_ID }),
    };
    const { body } = await viewCodec.write(context);
    return {
        kind: "graphty-view",
        version: 1,
        generator: { name: "graphty-element", version: "test" },
        bindsTo: { data: DATA_ID },
        ...body,
    };
}

/**
 * Open a view section into a session, as framing hands it to the codec.
 * @param session - The session.
 * @param section - The section.
 * @param rerun - Whether runs rerun.
 * @returns What the open reported.
 */
async function open(session: GraphSession, section: JsonObject, rerun = true): Promise<DocumentProblem[]> {
    const header = new Set<string>(HEADER_MEMBERS);
    const read: ReadSection = {
        header: Object.fromEntries(
            Object.entries(section).filter(([key]) => header.has(key)),
        ) as unknown as SectionHeader,
        body: Object.fromEntries(Object.entries(section).filter(([key]) => !header.has(key))),
        pointer: "/sections/view",
    };
    const problems: DocumentProblem[] = [];
    await session.transaction("open", async (tx) => {
        const context: ReadContext = {
            session,
            problems,
            refs: () => refsOf(session),
            dataId: () => DATA_ID,
            sections: new Set(["view"]),
            tx,
            rerun,
            dataMode: "replace",
            restored: new Set(),
            other: () => undefined,
            canned: new Map(),
            restoreDerived: () => undefined,
        };
        await viewCodec.read(read, context);
    });
    return problems;
}

/**
 * A session with something in every member the session holds state for.
 * @returns The session.
 */
async function fullSession(): Promise<GraphSession> {
    const session = await sessionWithData();
    const ab = session.data.edges().find((edge) => edge.source === "a" && edge.target === "b");
    assert.isDefined(ab);
    session.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" }, { name: "Picked" });
    session.sets.create({ kind: "path", nodes: ["a", "b", "c"] }, { name: "Walk" });
    session.sets.create(
        { kind: "rule", where: { kind: "neighborhood", seeds: ["c"], depth: 1 }, reading: "induced" },
        { name: "Around c" },
    );
    await session.selection.apply({ nodes: ["a", "c"], edges: [ab.id] });
    await session.positions.set([{ id: "b", x: 1, y: 2, z: 0 }]);
    await session.positions.pin(["b"]);
    await session.visibility.set({ kind: "degree", min: 0 });
    session.visibility.showContext = true;
    await session.hidden.add(["e"]);
    await session.views.save([
        { name: "Top", camera: { position: { x: 0, y: 4, z: 18 }, target: { x: 0, y: 0, z: 0 }, fov: 0.8 } },
        { name: "Flat", camera: { pan: { x: 1, y: 2 }, zoom: 2, rotation: 0 } },
    ]);
    await session.config.set({ viewRotation: 90, framing: { extent: "drawn", padding: 0.1 } });
    await session.data.setHidden([{ kind: "node", name: "group" }], true);
    await session.runs.start("bfs", { source: "a" }, { style: false });
    await session.styles.add({
        name: "Suspects",
        selector: { match: "ids", nodes: ["a", "b"] },
        set: { "node.color": "#c62828" },
    });
    return session;
}

/**
 * What a test compares of a session's view state, with minted ids left out.
 * @param session - The session.
 * @returns The state.
 */
function stateOf(session: GraphSession): unknown {
    const edgeName = (id: string): string => {
        const edge = session.data.edge(id);
        return `${String(edge?.source)}->${String(edge?.target)}`;
    };
    return {
        selection: { nodes: [...session.selection.nodes].sort(), edges: [...session.selection.edges].map(edgeName) },
        pins: [...session.positions.pinned].map((id) => [id, session.positions.get(id)]),
        sets: session.sets.list().map((set) => ({ name: set.name, definition: set.definition })),
        filter: session.visibility.filter,
        showContext: session.visibility.showContext,
        hidden: [...session.hidden.ids],
        views: [...session.views],
        viewRotation: session.config.viewRotation,
        framing: session.config.framing,
        hiddenColumns: session.data.hiddenColumns(),
        layers: session.styles
            .list()
            .filter((layer) => layer.source.by !== "element")
            .map((layer) => ({ name: layer.name, selector: layer.selector, set: layer.set })),
        runs: session.runs.list().map((run) => ({ id: run.id, algorithm: run.algorithm, source: run.params.source })),
    };
}

describe("view codec", () => {
    it("writes every member it holds as the schema allows", async () => {
        const section = await save(await fullSession());
        assert.deepEqual(invalid(section), []);
        assert.deepEqual(Object.keys(section).slice(4), [
            "views",
            "selection",
            "placed",
            "sets",
            "visibility",
            "viewRotation",
            "framing",
            "hiddenColumns",
            "layers",
            "runs",
        ]);
        assert.deepEqual(section.selection, {
            nodes: [
                { space: SPACE, key: "a" },
                { space: SPACE, key: "c" },
            ],
            edges: [{ from: { space: SPACE, key: "a" }, to: { space: SPACE, key: "b" }, key: "a->b" }],
        });
        assert.deepEqual(section.placed, [{ node: { space: SPACE, key: "b" }, position: [1, 2, 0], pinned: true }]);
        const sets = section.sets as JsonObject[];
        // The rule set naming no element belongs to the recipe (spec 5 rule 1).
        assert.deepEqual(
            sets.map((set) => [set.name, set.kind]),
            [
                ["Picked", "fixed"],
                ["Walk", "path"],
                ["Around c", "rule"],
            ],
        );
        assert.deepEqual(section.views, [
            {
                name: "Top",
                camera: { dimension: 3, controller: "orbit", position: [0, 4, 18], target: [0, 0, 0], fov: 0.8 },
            },
            { name: "Flat", camera: { dimension: 2, controller: "2d", pan: [1, 2], zoom: 2, rotation: 0 } },
        ]);
        const [layer] = section.layers as JsonObject[];
        assert.strictEqual(layer.after, "bottom");
        assert.deepEqual(layer.selector, {
            match: "ids",
            nodes: [
                { space: SPACE, key: "a" },
                { space: SPACE, key: "b" },
            ],
        });
        const runs = section.runs as Record<string, JsonObject>;
        assert.deepEqual(Object.keys(runs), ["session__bfs"]);
        assert.deepEqual(runs.session__bfs.params, { source: { space: SPACE, key: "a" } });
        assert.strictEqual(runs.session__bfs.style, false);
        assert.deepEqual(section.hiddenColumns, [{ kind: "node", name: "group" }]);
    });

    it("gives a session back as it was saved (state to section to state)", async () => {
        const saved = await fullSession();
        const section = await save(saved);
        const opened = await sessionWithData();
        const problems = await open(opened, section);
        assert.deepEqual(problems, []);
        assert.deepEqual(stateOf(opened), stateOf(saved));
    });

    it("writes back what it opened byte for byte (section to state to section)", async () => {
        const section = await save(await fullSession());
        const opened = await sessionWithData();
        await open(opened, section);
        assert.strictEqual(JSON.stringify(await save(opened)), JSON.stringify(section));
    });

    it("keeps and reports references that bind nowhere, an unknown camera controller, xr and the timeline", async () => {
        const section = await save(await fullSession());
        const selection = section.selection as { nodes: unknown[] };
        selection.nodes.push({ space: SPACE, key: "gone" });
        const changed: JsonObject = {
            ...section,
            camera: {
                dimension: 3,
                controller: "com.example.fly",
                position: [0, 1, 2],
                target: [0, 0, 0],
                fov: 1,
                "com.example.fly": { speed: 3 },
            },
            xr: { center: [0, 1, 0], scale: 0.5, rotation: [0, 0.6, 0] },
            timeline: { at: "2026-11-10T09:15:00Z" },
        };
        const ordered = Object.fromEntries(
            ["kind", "version", "generator", "bindsTo", ...viewCodec.members].flatMap((key) =>
                changed[key] === undefined ? [] : [[key, changed[key]]],
            ),
        );
        assert.deepEqual(invalid(ordered), []);
        const opened = await sessionWithData();
        const problems = await open(opened, ordered);
        assert.deepInclude(problems, {
            code: "W_REFERENCE_UNBOUND",
            params: {
                section: "view",
                pointer: "/sections/view/selection/nodes/2",
                ref: `{"key":"gone","space":"${SPACE}"}`,
            },
        });
        assert.deepInclude(problems, {
            code: "W_CAMERA_CONTROLLER_UNKNOWN",
            params: { section: "view", controller: "com.example.fly" },
        });
        assert.deepEqual([...opened.selection.nodes].sort(), ["a", "c"]);
        assert.strictEqual(JSON.stringify(await save(opened)), JSON.stringify(ordered));
    });

    it("applies a saved view with an unknown controller by its shared pose", async () => {
        const opened = await sessionWithData();
        const problems = await open(opened, {
            kind: "graphty-view",
            version: 1,
            views: [
                {
                    name: "Fly",
                    camera: {
                        dimension: 3,
                        controller: "fly",
                        position: [1, 2, 3],
                        target: [0, 0, 0],
                        fov: 0.5,
                        fly: { speed: 2 },
                    },
                },
            ],
        });
        assert.deepEqual(problems, [
            { code: "W_CAMERA_CONTROLLER_UNKNOWN", params: { section: "view", controller: "fly" } },
        ]);
        assert.deepEqual(opened.views.get("Fly"), {
            position: { x: 1, y: 2, z: 3 },
            target: { x: 0, y: 0, z: 0 },
            fov: 0.5,
        });
    });

    it("lists a run as not run when rerun is off and no outputs wait, and keeps it", async () => {
        const section = await save(await fullSession());
        const opened = await sessionWithData();
        const problems = await open(opened, section, false);
        assert.deepInclude(problems, { code: "W_RUN_NOT_RUN", params: { run: "session__bfs" } });
        assert.isUndefined(opened.runs.get("bfs"));
        assert.deepEqual((await save(opened)).runs, section.runs);
    });

    it("puts layers at their after places: bottom below the reader's layers, an unknown after on top", async () => {
        const opened = await sessionWithData();
        await opened.styles.add({ name: "Mine", selector: { match: "everything" }, set: { "node.color": "#000000" } });
        const layer = (id: string, after: string): JsonObject => ({
            id,
            name: id,
            after,
            target: "node",
            kind: "highlight",
            selector: { match: "ids", nodes: [{ space: SPACE, key: "a" }] },
            set: { "node.color": "#ff0000" },
            source: { by: "user" },
        });
        await open(opened, {
            kind: "graphty-view",
            version: 1,
            layers: [layer("Low", "bottom"), layer("Top", "nowhere"), layer("Mid", "Low")],
        });
        const names = opened.styles
            .list()
            .filter((entry) => entry.source.by !== "element")
            .map((entry) => entry.name);
        assert.deepEqual(names, ["Low", "Mid", "Mine", "Top"]);
    });

    it("opens the worked example's view section on other data, binding nothing and writing it back unchanged", async () => {
        const example = readJson("examples/card-fraud.graphty-view.json");
        assert.deepEqual(invalid(example), []);
        const opened = await sessionWithData();
        const problems = await open(opened, example);
        assert.isTrue(problems.some((problem) => problem.code === "W_REFERENCE_UNBOUND"));
        assert.deepInclude(problems, { code: "W_RUN_NOT_RUN", params: { run: "session__route" } });
        const header = ["$schema", "kind", "version", "modified", "generator", "bindsTo"];
        const resaved = await save(opened);
        const body = (section: JsonObject): JsonObject =>
            Object.fromEntries(Object.entries(section).filter(([key]) => !header.includes(key)));
        const ordered = Object.fromEntries(
            viewCodec.members.flatMap((key) => (example[key] === undefined ? [] : [[key, example[key]]])),
        );
        assert.strictEqual(JSON.stringify(body(resaved)), JSON.stringify(ordered));
    });
});
