/**
 * @file The `view` section codec, version 1 (spec/README.md 4.7, 5 and 8.2), behind the
 * `save-files-v2` experiment: what it writes validates against its schema, a session survives a
 * save and an open (state to section to state), a section survives an open and a save byte for
 * byte (section to state to section), runs rerun or restore as the open chooses, the layer order
 * comes back, and what does not bind or cannot run is reported and kept. Element references come
 * from a stand-in, so these tests do not depend on the data codec.
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
import { answeringFromProject, type CannedOutcomes } from "../../../src/session/projectFile";
import { finishAtOnce } from "../runs/harness";

const SPEC = new URL("../../../spec/", import.meta.url);
const readJson = (path: string): JsonObject => JSON.parse(readFileSync(new URL(path, SPEC), "utf8")) as JsonObject;

const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
addFormats(ajv);
ajv.addSchema(readJson("schemas/common/v2.json"));
ajv.addSchema(readJson("schemas/graphty-view/v1.json"));

const SPACE = "source:src_01JCBP1C9E2G4J6M8N0Q3S5V7Y";
const LOAD = "src_01JCBP1C9E2G4J6M8N0Q3S5V7Y";
const DATA_ID = "d1a7c0de-0001-4000-8000-000000000001";
const SET_ID = /^set_[0-9A-HJKMNP-TV-Z]{26}$/;

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
 * Stand-in element references: a node is its id in one space, an edge `<source>-><target>` from one
 * source.
 * @param session - The session.
 * @returns The references.
 */
function refsOf(session: GraphSession): ElementRefs {
    const node = (ref: unknown): string | undefined => {
        const held = ref as { space?: unknown; key?: unknown } | null;
        const id = held?.space === SPACE ? held.key : undefined;
        return typeof id === "string" && session.data.node(id) !== undefined ? id : undefined;
    };
    const keyOf = (edge: { source: unknown; target: unknown }): string =>
        `${String(edge.source)}->${String(edge.target)}`;
    return {
        nodeRef: (id) => (session.data.node(id) === undefined ? undefined : { space: SPACE, key: String(id) }),
        edgeRef: (id) => {
            const edge = session.data.edge(id);
            return edge === undefined ? undefined : { load: LOAD, key: keyOf(edge) };
        },
        node,
        edge: (ref) => {
            const held = ref as { load?: unknown; key?: unknown } | null;
            return held?.load === LOAD ? session.data.edges().find((edge) => keyOf(edge) === held.key)?.id : undefined;
        },
    };
}

/**
 * A session holding five nodes and four edges.
 * @param canned - Where saved outcomes wait for the runs an open starts, as the project's own map does.
 * @returns The session.
 */
async function sessionWithData(canned: CannedOutcomes = new Map()): Promise<GraphSession> {
    const session = createGraphSession({
        features: ["save-files-v2"],
        runs: { execute: answeringFromProject(finishAtOnce, canned) },
    });
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
 * @param problems - Collects what the save reports.
 * @returns The section.
 */
async function save(session: GraphSession, problems: DocumentProblem[] = []): Promise<JsonObject> {
    const context: WriteContext = {
        session,
        problems,
        refs: () => refsOf(session),
        dataId: () => DATA_ID,
        sections: new Set(["view"]),
        embed: {},
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

/** What an open is told beside the section. */
interface OpenChoices {
    readonly rerun?: boolean;
    readonly canned?: ReadContext["canned"];
    readonly style?: boolean;
}

/**
 * Open a view section into a session, as framing hands it to the codec.
 * @param session - The session.
 * @param section - The section.
 * @param choices - Whether runs rerun, the saved outcomes waiting, and whether a style section loads too.
 * @returns What the open reported.
 */
async function open(session: GraphSession, section: JsonObject, choices: OpenChoices = {}): Promise<DocumentProblem[]> {
    const header = new Set<string>(HEADER_MEMBERS);
    const read: ReadSection = {
        header: Object.fromEntries(
            Object.entries(section).filter(([key]) => header.has(key)),
        ) as unknown as SectionHeader,
        body: Object.fromEntries(Object.entries(section).filter(([key]) => !header.has(key))),
        pointer: "/sections/view",
    };
    const problems: DocumentProblem[] = [];
    const style: ReadSection = { header: { kind: "graphty-style", version: 2 }, body: {}, pointer: "/sections/style" };
    await session.transaction("open", async (tx) => {
        const context: ReadContext = {
            session,
            problems,
            refs: () => refsOf(session),
            dataId: () => DATA_ID,
            sections: new Set(["view"]),
            tx,
            rerun: choices.rerun ?? true,
            dataMode: "replace",
            restored: new Set(),
            other: (name) => (name === "style" && choices.style === true ? style : undefined),
            canned: choices.canned ?? new Map(),
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
    await session.runs.start("bfs", { source: "a" }, { style: false, scope: "graph" });
    session.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" }, { name: "Picked" });
    session.sets.create({ kind: "path", nodes: ["a", "b", "c"] }, { name: "Walk" });
    session.sets.create(
        { kind: "rule", where: { kind: "neighborhood", seeds: ["c"], depth: 1 }, reading: "induced" },
        { name: "Around c" },
    );
    session.sets.create({ kind: "rule", where: { kind: "degree", min: 2 }, reading: "induced" }, { name: "Busy" });
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
            .filter((layer) => !layer.locked)
            .map((layer) => ({ name: layer.name, selector: layer.selector, set: layer.set })),
        runs: session.runs.list().map((run) => ({ id: run.id, algorithm: run.algorithm, source: run.params.source })),
        layout: { id: session.layout.id, dimension: session.layout.dimension },
    };
}

/**
 * The names of the layers a consumer can move, bottom first.
 * @param session - The session.
 * @returns The names.
 */
const layerNames = (session: GraphSession): string[] =>
    session.styles
        .list()
        .filter((layer) => !layer.locked)
        .map((layer) => layer.name);

/**
 * The file id of the layer with a name.
 * @param session - The session.
 * @param name - The name.
 * @returns The id the view writes for it.
 */
function idOf(session: GraphSession, name: string): string {
    const layer = session.styles.list().find((each) => each.name === name);
    return name === "Mine" ? String(layer?.id) : name;
}

/**
 * A view layer naming node a.
 * @param id - Its id and name.
 * @returns The layer.
 */
const viewLayer = (id: string): JsonObject => ({
    id,
    name: id,
    target: "node",
    selector: { match: "ids", nodes: [{ space: SPACE, key: "a" }] },
    set: { "node.color": "#ff0000" },
    source: { by: "user" },
});

describe("view codec: writing", () => {
    it("writes every member it holds as the schema allows", async () => {
        const problems: DocumentProblem[] = [];
        const section = await save(await fullSession(), problems);
        assert.deepEqual(invalid(section), []);
        assert.deepEqual(problems, []);
        assert.deepEqual(Object.keys(section).slice(4), [
            "views",
            "selection",
            "pinned",
            "sets",
            "visibility",
            "viewRotation",
            "framing",
            "hiddenColumns",
            "order",
            "layers",
            "runs",
            "layout",
        ]);
        assert.deepEqual(section.selection, {
            nodes: [
                { space: SPACE, key: "a" },
                { space: SPACE, key: "c" },
            ],
            edges: [{ load: LOAD, key: "a->b" }],
        });
        assert.deepEqual(section.pinned, [{ node: { space: SPACE, key: "b" }, position: { x: 1, y: 2, z: 0 } }]);
        const sets = section.sets as { id: string; name: string; definition: JsonObject }[];
        // Every set, the rule set naming no element included, each under a minted `set_` ULID.
        assert.deepEqual(
            sets.map((set) => [set.name, set.definition.kind]),
            [
                ["Picked", "fixed"],
                ["Walk", "path"],
                ["Around c", "rule"],
                ["Busy", "rule"],
            ],
        );
        assert.isTrue(sets.every((set) => SET_ID.test(set.id)));
        assert.deepEqual(sets[0].definition.nodes, [
            { space: SPACE, key: "a" },
            { space: SPACE, key: "b" },
        ]);
        assert.deepEqual(section.views, [
            {
                name: "Top",
                camera: {
                    dimension: 3,
                    controller: "orbit",
                    position: { x: 0, y: 4, z: 18 },
                    target: { x: 0, y: 0, z: 0 },
                    fov: 0.8,
                },
            },
            { name: "Flat", camera: { dimension: 2, controller: "2d", pan: { x: 1, y: 2 }, zoom: 2, rotation: 0 } },
        ]);
        assert.deepEqual(section.visibility, {
            filter: { kind: "degree", min: 0 },
            showContext: true,
            conditions: [],
            hidden: [{ space: SPACE, key: "e" }],
        });
        const [layer] = section.layers as JsonObject[];
        assert.notProperty(layer, "after");
        assert.notProperty(layer, "kind");
        assert.deepEqual(layer.selector, {
            match: "ids",
            nodes: [
                { space: SPACE, key: "a" },
                { space: SPACE, key: "b" },
            ],
        });
        assert.include(section.order as string[], layer.id);
        const runs = section.runs as JsonObject[];
        assert.strictEqual(runs.length, 1);
        assert.deepEqual(runs[0], {
            id: runs[0].id,
            algorithm: "bfs",
            // The node option is a reference; the others are the params as the element holds them.
            params: { source: { space: SPACE, key: "a" }, targetNode: null },
            scope: "graph",
        });
        assert.deepEqual(section.layout, { id: "force", engine: "ngraph", options: {}, dimension: 3 });
        assert.deepEqual(section.hiddenColumns, [{ kind: "node", name: "group" }]);
    });

    it("writes a run the visible graph narrowed as not replayable, and reports it", async () => {
        const session = await sessionWithData();
        await session.visibility.set({ kind: "degree", min: 2 });
        await session.runs.start("degree", undefined, { style: false });
        const problems: DocumentProblem[] = [];
        const section = await save(session, problems);
        assert.deepEqual(invalid(section), []);
        const [run] = section.runs as JsonObject[];
        assert.strictEqual(run.scope, "graph");
        assert.strictEqual(run.replayable, false);
        assert.deepEqual(problems, [
            { code: "W_MEMBER_LEFT_OUT", params: { section: "view", pointer: "/runs/0/scope" } },
        ]);
    });

    it("writes a recipe-made run with its namespace and name", async () => {
        const session = await sessionWithData();
        await session.runs.start("degree", undefined, { as: "card_testing__links", style: false, scope: "graph" });
        const [run] = (await save(session)).runs as JsonObject[];
        assert.deepEqual(run, {
            id: "card_testing__links",
            namespace: "card_testing",
            as: "links",
            algorithm: "degree",
            scope: "graph",
        });
    });
});

describe("view codec: opening", () => {
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

    it("keeps and reports references that bind nowhere, and keeps a camera of an unknown controller", async () => {
        const section = await save(await fullSession());
        (section.selection as { nodes: unknown[] }).nodes.push({ space: SPACE, key: "gone" });
        const ordered = Object.fromEntries(
            ["kind", "version", "generator", "bindsTo", ...viewCodec.members].flatMap((key) => {
                const value =
                    key === "camera"
                        ? {
                              dimension: 3,
                              controller: "com.example.fly",
                              position: { x: 0, y: 1, z: 2 },
                              target: { x: 0, y: 0, z: 0 },
                              fov: 1,
                              speed: 3,
                          }
                        : section[key];
                return value === undefined ? [] : [[key, value]];
            }),
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

    it("applies a saved view with an unknown controller by the members its dimension's controller reads", async () => {
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
                        position: { x: 1, y: 2, z: 3 },
                        target: { x: 0, y: 0, z: 0 },
                        fov: 0.5,
                        zoom: 4,
                        speed: 2,
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

    it("lists a run as not run when rerun is off and no saved results wait, and keeps it", async () => {
        const section = await save(await fullSession());
        const opened = await sessionWithData();
        const problems = await open(opened, section, { rerun: false });
        const [run] = section.runs as JsonObject[];
        assert.deepInclude(problems, { code: "W_RUN_NOT_RUN", params: { run: String(run.id) } });
        assert.isUndefined(opened.runs.get(String(run.id)));
        assert.deepEqual((await save(opened)).runs, section.runs);
    });

    it("never reruns a run recorded as not replayable: restores saved results, else lists it not run", async () => {
        const saved = await sessionWithData();
        await saved.runs.start("degree", undefined, { as: "links", style: false, scope: "graph" });
        const section = await save(saved);
        (section.runs as JsonObject[])[0].replayable = false;

        const without = await sessionWithData();
        assert.deepInclude(await open(without, section), { code: "W_RUN_NOT_RUN", params: { run: "links" } });
        assert.isUndefined(without.runs.get("links"));

        const run = saved.runs.get("links");
        const outcome = run?.result;
        assert.isDefined(run);
        assert.isDefined(outcome);
        const canned: CannedOutcomes = new Map([
            ["links", { result: outcome, summary: outcome.summary(), caveats: run.record.caveats, fields: run.fields }],
        ]);
        const restored = await sessionWithData(canned);
        assert.deepEqual(await open(restored, section, { canned }), []);
        assert.strictEqual(restored.runs.get("links")?.result, outcome);
        assert.strictEqual(canned.size, 0);
    });

    it("stops the replay of a run whose scope form it does not know, and keeps the record", async () => {
        const opened = await sessionWithData();
        const record = { id: "typed", algorithm: "degree", scope: { types: ["account"] } };
        const problems = await open(opened, { kind: "graphty-view", version: 1, runs: [record] });
        assert.deepEqual(problems, [{ code: "W_RUN_NOT_RUN", params: { run: "typed" } }]);
        assert.deepEqual((await save(opened)).runs, [record]);
    });

    it("arranges the stack by order: the layers it names bottom first, the rest above them", async () => {
        const opened = await sessionWithData();
        await opened.styles.add({ name: "Mine", selector: { match: "everything" }, set: { "node.color": "#000000" } });
        await open(
            opened,
            {
                kind: "graphty-view",
                version: 1,
                order: ["Top", "Low"],
                layers: [viewLayer("Low"), viewLayer("Top")],
            },
            { style: true },
        );
        assert.deepEqual(layerNames(opened), ["Top", "Low", "Mine"]);
    });

    it("with no style section, arranges only the view's own layers, above the rest", async () => {
        const opened = await sessionWithData();
        await opened.styles.add({ name: "Mine", selector: { match: "everything" }, set: { "node.color": "#000000" } });
        await open(opened, {
            kind: "graphty-view",
            version: 1,
            order: ["Top", "Mine", "Low"],
            layers: [viewLayer("Low"), viewLayer("Top")],
        });
        assert.deepEqual(layerNames(opened), ["Mine", "Top", "Low"]);
        // Unchanged since the open, so written back as read, for the next open with a style section.
        assert.deepEqual((await save(opened)).order, ["Top", "Mine", "Low"]);
        const top = opened.styles.list().find((layer) => layer.name === "Top");
        assert.isDefined(top);
        await opened.styles.move(top.id, null);
        assert.deepEqual((await save(opened)).order, [idOf(opened, "Mine"), "Low", "Top"]);
    });

    it("opens the worked example on other data, binding nothing and writing it back unchanged", async () => {
        const example = readJson("examples/card-fraud.graphty-view.json");
        assert.deepEqual(invalid(example), []);
        const opened = await sessionWithData();
        const problems = await open(opened, example);
        assert.isTrue(problems.some((problem) => problem.code === "W_REFERENCE_UNBOUND"));
        // Recorded as not replayable with no saved results, and a route whose ends bind nowhere.
        for (const run of ["card_testing__pagerank", "card_testing__communities", "route"]) {
            assert.deepInclude(problems, { code: "W_RUN_NOT_RUN", params: { run } });
        }

        const header = ["$schema", "kind", "version", "modified", "generator", "bindsTo"];
        const body = (section: JsonObject): JsonObject =>
            Object.fromEntries(Object.entries(section).filter(([key]) => !header.includes(key)));
        assert.strictEqual(JSON.stringify(body(await save(opened))), JSON.stringify(body(example)));
    });
});
