/**
 * @file The `view` section codec, version 1 (spec/README.md 4.7, 5 and 8.2), behind the
 * `save-files-v2` experiment: what it writes validates against its schema, a session survives a
 * save and an open (state to section to state), a section survives an open and a save byte for
 * byte (section to state to section), runs rerun or restore as the open chooses, the layer order
 * comes back, and what does not bind or cannot run is reported and kept. Element references come
 * from a stand-in, so these tests do not depend on the data codec.
 */

import { readFileSync } from "node:fs";

import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { CameraState } from "../../../src/camera/types";
import { engineOptionsOf, FORCE_SAVED_OPTIONS } from "../../../src/catalog/layouts";
import type { RuleTree, RunId } from "../../../src/catalog/types";
import { dispatcherOf } from "../../../src/session/dispatchers";
import { markRecipeRun } from "../../../src/session/document2/codecs/results";
import { viewCodec } from "../../../src/session/document2/codecs/view";
import { cameraJson, cameraOf, pivotOfPose, poseOfPivot } from "../../../src/session/document2/codecs/viewParts";
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
import type { RunOutcome } from "../../../src/session/runs";
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
 * @param isDerived - Whether graphty-element minted a run's id.
 * @returns The section.
 */
async function save(
    session: GraphSession,
    problems: DocumentProblem[] = [],
    isDerived: (id: string) => boolean = () => false,
): Promise<JsonObject> {
    const context: WriteContext = {
        session,
        problems,
        refs: () => refsOf(session),
        dataId: () => DATA_ID,
        sections: new Set(["view"]),
        embed: {},
        isDerived,
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
 * @param derived - Collects the runs restored as minted by graphty-element.
 * @returns What the open reported.
 */
async function open(
    session: GraphSession,
    section: JsonObject,
    choices: OpenChoices = {},
    derived: string[] = [],
): Promise<DocumentProblem[]> {
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
            canned: choices.canned ?? new Map<RunId, RunOutcome>(),
            restoreDerived: (id) => {
                derived.push(id);
            },
        };
        await viewCodec.read(read, context);
    });
    return problems;
}

/**
 * The options the force layout's default engine declares with a default, less `dim`.
 * @param session - The session, for its catalog.
 * @returns The option names.
 */
function defaultedForce(session: GraphSession): string[] {
    const force = session.catalog.layouts().find((each) => each.id === "force");
    assert.isDefined(force);
    return engineOptionsOf(force, "ngraph")
        .filter((option) => option.default !== undefined && option.default !== null && option.name !== "dim")
        .map((option) => option.name);
}

/**
 * The history steps an open of a view holding only a layout record adds that set the layout.
 * @param session - The session.
 * @param layout - The layout record.
 * @returns How many of the open's steps set the layout.
 */
async function layoutStepsOpening(session: GraphSession, layout: JsonObject): Promise<number> {
    const before = session.history.steps.length;
    const section = { kind: "graphty-view", version: 1, bindsTo: { data: DATA_ID }, layout };
    assert.deepEqual(await open(session, section), []);
    return session.history.steps.slice(before).filter((step) => step.ops.includes("layout.set")).length;
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
    await session.visibility.set({ kind: "expression", where: "data.group == 'x'" });
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
 * A camera as the pose a file would hold, put back as a state and rounded: two states for the
 * same pose compare equal however they spell it (an orbit pivot, or a position and target).
 * @param camera - The camera state.
 * @returns The rounded state, or undefined for none.
 */
function poseOf(camera: CameraState | undefined): unknown {
    const state = camera === undefined ? undefined : cameraOf(cameraJson(camera))?.state;
    return JSON.parse(
        JSON.stringify(state ?? null, (_key, value: unknown) =>
            typeof value === "number" ? Math.round(value * 1e9) / 1e9 + 0 : value,
        ),
    ) as unknown;
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
        views: [...session.views].map(([name, view]) => [name, { ...view, camera: poseOf(view.camera) }]),
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
});

describe("view codec: writing", () => {
    it("writes every member it holds as the schema allows", async () => {
        const problems: DocumentProblem[] = [];
        const session = await fullSession();
        const section = await save(session, problems);
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
                    up: { x: 0, y: 1, z: 0 },
                    fov: 0.8,
                },
            },
            {
                name: "Flat",
                camera: { dimension: 2, controller: "2d", center: { x: 1, y: 2 }, halfWidth: 2.5, rotation: 0 },
            },
        ]);
        assert.deepEqual(section.visibility, {
            filter: { on: "nodes", where: "data.group == 'x'" },
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
            params: { source: { space: SPACE, key: "a" }, targetNode: null, maxDepth: null },
            scope: "graph",
        });
        // The arrangement is `id`, its engine provenance in `drawnBy`; `engine` the code that drew it.
        const layout = section.layout as JsonObject;
        const { options, drawnBy, ...rest } = layout as { options: JsonObject; drawnBy: JsonObject };
        const engine = layout.engine as { packages: JsonObject };
        assert.deepEqual(
            { ...rest, engine: Object.keys(engine.packages) },
            { id: "force", dimension: 3, engine: ["@graphty/graphty-element", "@graphty/layout"] },
        );
        // With no renderer, ForceAtlas2 steps the force layout drawnBy names as ngraph, and says so.
        assert.deepEqual(
            [(layout.engine as JsonObject).method, (layout.engine as JsonObject).accelerator],
            ["forceatlas2", "cpu"],
        );
        assert.strictEqual(drawnBy.engine, "ngraph");
        // Resolved: every option the engine declares with a default, less the dimension's own,
        // the arrangement's own in `options` and the engine's in `drawnBy.options`.
        assert.includeMembers([...FORCE_SAVED_OPTIONS], Object.keys(options));
        assert.sameMembers(
            [...Object.keys(options), ...Object.keys(drawnBy.options as JsonObject)],
            defaultedForce(session),
        );
        assert.deepEqual(section.hiddenColumns, [{ kind: "node", name: "group" }]);
    });

    it("opens a layout record that spells out the defaults in force without setting the layout again", async () => {
        const session = await sessionWithData();
        await session.layout.set("force", { options: { seed: 7 } });
        const layout = (await save(session)).layout as JsonObject;
        const drawnBy = layout.drawnBy as JsonObject;
        assert.include(Object.keys(drawnBy.options as JsonObject), "springLength", "the record is resolved");
        assert.strictEqual(await layoutStepsOpening(session, layout), 0);
        // A terse record naming only the seed in force is the same layout too.
        const terse = { ...layout, drawnBy: { engine: "ngraph" } };
        assert.strictEqual(await layoutStepsOpening(session, { ...terse, options: { seed: 7 } }), 0);
        // A record that differs sets it, with the options as the file holds them.
        assert.strictEqual(await layoutStepsOpening(session, { ...terse, options: { seed: 8 } }), 1);
        assert.deepEqual(session.layout.options, { seed: 8 });
    });

    it("opens a layout with the engine drawnBy names, or the default engine when this release lacks it", async () => {
        const session = await sessionWithData();
        const layout = (await save(session)).layout as JsonObject;
        const atlas = { id: "force", dimension: 3, engine: layout.engine, drawnBy: { engine: "forceatlas2" } };
        assert.strictEqual(await layoutStepsOpening(session, atlas), 1);
        assert.strictEqual(session.layout.engine, "forceatlas2");

        const gone = { ...atlas, options: { seed: 4 }, drawnBy: { engine: "com.example.gone" } };
        const section = { kind: "graphty-view", version: 1, bindsTo: { data: DATA_ID }, layout: gone };
        assert.deepEqual(await open(session, section), [
            {
                code: "W_LAYOUT_ENGINE_UNAVAILABLE",
                params: { section: "view", layout: "force", engine: "com.example.gone" },
            },
        ]);
        assert.deepEqual([session.layout.engine, session.layout.options.seed], ["ngraph", 4]);
    });

    it("writes the engine beside a run record's seed, and none for an unseeded run", async () => {
        const session = await sessionWithData();
        await session.runs.start("louvain", undefined, { as: "communities", style: false, seed: 1873 });
        await session.runs.start("degree", undefined, { as: "links", style: false });
        const section = await save(session);
        assert.deepEqual(invalid(section), []);
        const [seeded, unseeded] = section.runs as JsonObject[];
        assert.strictEqual(seeded.seed, 1873);
        const engine = seeded.engine as { packages: JsonObject; accelerator: string };
        assert.sameMembers(Object.keys(engine.packages), ["@graphty/graphty-element", "@graphty/algorithms"]);
        assert.strictEqual(engine.accelerator, "cpu");
        assert.notProperty(unseeded, "engine");
    });

    it("reports a seeded layout drawn again under other code, without comparing the hardware", async () => {
        const session = await sessionWithData();
        await session.layout.set("force", { options: { seed: 7 } });
        const layout = (await save(session)).layout as JsonObject;
        const engine = layout.engine as { packages: Record<string, string>; accelerator: string };
        const older = {
            ...engine,
            packages: { ...engine.packages, "@graphty/layout": "0.0.1" },
            accelerator: "webgpu",
        };
        const opened = await sessionWithData();
        const section = {
            kind: "graphty-view",
            version: 1,
            bindsTo: { data: DATA_ID },
            layout: { ...layout, engine: older },
        };
        const problems = await open(opened, section);
        assert.deepEqual(problems, [
            {
                code: "W_ENGINE_CHANGED",
                params: {
                    run: "layout",
                    key: "@graphty/layout",
                    was: "0.0.1",
                    now: engine.packages["@graphty/layout"],
                },
            },
        ]);
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

    it("keeps a degree filter and a members filter as rule trees, through a save and an open", async () => {
        // Neither has graph.filter's { on, where } form, so each is written as its rule tree.
        const cases: ((set: string) => RuleTree)[] = [
            () => ({ kind: "degree", min: 2 }),
            (set) => ({
                kind: "any",
                of: [
                    { kind: "neighborhood", seeds: ["a"], depth: 1 },
                    { kind: "member", of: { set } },
                ],
            }),
        ];
        for (const filterOf of cases) {
            const session = await sessionWithData();
            const saved = session.sets.create({ kind: "fixed", nodes: ["e"], reading: "induced" }, { name: "E" });
            await session.visibility.set(filterOf(saved));
            const problems: DocumentProblem[] = [];
            const section = await save(session, problems);
            assert.deepEqual(invalid(section), []);
            assert.deepEqual(problems, []);
            // A rule tree is told from graph.filter's { on, where } by its `kind`.
            assert.strictEqual(((section.visibility as JsonObject).filter as JsonObject).kind, filterOf(saved).kind);

            const reopened = await sessionWithData();
            assert.deepEqual(await open(reopened, section), []);
            const set = reopened.sets.list().find((each) => each.name === "E");
            assert.isDefined(set);
            assert.deepEqual(reopened.visibility.filter, filterOf(set.id));
        }
    });

    it("writes an element-minted run as derived, and restores it as the element's own", async () => {
        const session = await sessionWithData();
        await session.runs.start("degree", undefined, { as: "minted", style: false, scope: "graph" });
        const section = await save(session, [], (id) => id === "minted");
        assert.deepEqual(invalid(section), []);
        assert.strictEqual((section.runs as JsonObject[])[0].derived, true);
        const restored: string[] = [];
        await open(await sessionWithData(), section, {}, restored);
        assert.deepEqual(restored, ["minted"]);
    });

    it("writes a recipe-made run with its namespace and name", async () => {
        const session = await sessionWithData();
        await session.runs.start("degree", undefined, { as: "card_testing__links", style: false, scope: "graph" });
        const [handStarted] = (await save(session)).runs as JsonObject[];
        assert.notProperty(handStarted, "namespace", "an id shaped <ns>__<as> alone is not recipe-made");
        markRecipeRun(session, "card_testing__links");
        const [run] = (await save(session)).runs as JsonObject[];
        assert.deepEqual(run, {
            id: "card_testing__links",
            namespace: "card_testing",
            as: "links",
            algorithm: "degree",
            params: { direction: "total" },
            scope: "graph",
        });
    });
});

describe("view codec: the live camera and playhead", () => {
    it("writes a fresh session's camera and playhead from the session, not only from an opened file", async () => {
        const session = createGraphSession({ features: ["save-files-v2", "timeline"] });
        await session.data.addNodes(
            ["2026-11-09T00:00:00Z", "2026-11-10T00:00:00Z", "2026-11-11T00:00:00Z"].map((t, n) => ({
                id: `n${String(n)}`,
                t,
            })),
        );
        await session.time.setField({ nodes: { start: "t" } });
        await session.time.window({ from: Date.parse("2026-11-10T00:00:00Z"), to: Date.parse("2026-11-11T00:00:00Z") });
        // What a renderer gives the session: where its camera is now.
        dispatcherOf(session).services.camera = {
            move: () => Promise.resolve(),
            current: () => ({ position: { x: 1, y: 2, z: 3 }, target: { x: 0, y: 0, z: 0 } }),
            state: () => ({ position: { x: 1, y: 2, z: 3 }, target: { x: 0, y: 0, z: 0 } }),
        };
        const saved = await save(session);
        assert.deepEqual(saved.camera, {
            dimension: 3,
            controller: "orbit",
            position: { x: 1, y: 2, z: 3 },
            target: { x: 0, y: 0, z: 0 },
            up: { x: 0, y: 1, z: 0 },
        });
        assert.deepEqual(saved.timeline, { at: "2026-11-10T00:00:00.000Z" });
        assert.notProperty(saved.visibility, "filter", "no filter in force is left out");
        assert.deepEqual(invalid(saved), []);
        session.dispose();
    });
});

describe("view codec: opening", () => {
    it("keeps the playhead, and the camera of a session that draws nothing as read", async () => {
        const section = {
            kind: "graphty-view",
            version: 1,
            generator: { name: "graphty-element", version: "test" },
            bindsTo: { data: DATA_ID },
            camera: {
                dimension: 3,
                controller: "orbit",
                position: { x: 0, y: 4, z: 18 },
                target: { x: 0, y: 0, z: 0 },
            },
            timeline: { at: "2026-11-10T09:15:00.000Z" },
        };
        const opened = await sessionWithData();
        assert.deepEqual(await open(opened, section), []);
        const saved = await save(opened);
        assert.deepEqual(saved.timeline, { at: "2026-11-10T09:15:00.000Z" });
        assert.deepEqual(saved.camera, {
            dimension: 3,
            controller: "orbit",
            position: { x: 0, y: 4, z: 18 },
            target: { x: 0, y: 0, z: 0 },
        });
        assert.deepEqual(invalid(saved), []);
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
                              controllers: { "com.example.fly": { speed: 3 } },
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

    it("applies a saved view with an unknown controller by its pose, with the default controller", async () => {
        const opened = await sessionWithData();
        const problems = await open(opened, {
            kind: "graphty-view",
            version: 1,
            views: [
                {
                    name: "Fly",
                    camera: {
                        dimension: 2,
                        controller: "fly",
                        center: { x: 1, y: 2 },
                        halfWidth: 1.25,
                        rotation: 0.3,
                        controllers: { fly: { speed: 2 } },
                    },
                },
            ],
        });
        assert.deepEqual(problems, [
            { code: "W_CAMERA_CONTROLLER_UNKNOWN", params: { section: "view", controller: "fly" } },
        ]);
        assert.deepEqual(opened.views.get("Fly"), { camera: { pan: { x: 1, y: 2 }, zoom: 4, rotation: 0.3 } });
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

    it("writes no source for a layer the reader made, and reads a layer with none as reader-made", async () => {
        const opened = await sessionWithData();
        await open(opened, { kind: "graphty-view", version: 1, layers: [viewLayer("Mine")] });
        const mine = opened.styles.list().find((layer) => layer.name === "Mine");
        assert.deepEqual(mine?.source, { by: "user" });
        if (mine !== undefined) {
            await opened.styles.update(mine.id, { set: { "node.color": "#00ff00" } });
        }

        const [written] = (await save(opened)).layers as JsonObject[];
        assert.strictEqual(written.name, "Mine");
        assert.notProperty(written, "source");
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

describe("view codec: saved views keep every part", () => {
    /**
     * A session with a following view and a fixed view keeping every part beside its camera.
     * @returns The session.
     */
    async function viewsSession(): Promise<GraphSession> {
        const session = await sessionWithData();
        await session.positions.set([
            { id: "a", x: 1, y: 2, z: 3 },
            { id: "b", x: 4, y: 5, z: 6 },
        ]);
        await session.hidden.add(["e"]);
        await session.styles.add({
            name: "Suspects",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.color": "#c62828" },
        });
        await session.views.save([
            { name: "Above", follows: "topView", key: "1" },
            {
                name: "Kept",
                camera: { position: { x: 0, y: 4, z: 18 }, target: { x: 0, y: 0, z: 0 } },
                key: "2",
                include: ["filters", "layers", "hidden", "positions", "legend"],
                legend: true,
            },
        ]);
        return session;
    }

    /**
     * A saved view with its positions as text, so a NaN compares equal to itself.
     * @param session - The session.
     * @param name - The view's name.
     * @returns The view.
     */
    const viewOf = (session: GraphSession, name: string): unknown => {
        const view = session.views.get(name);
        return { ...view, camera: poseOf(view?.camera), positions: JSON.stringify(view?.positions) };
    };

    it("writes and reads follows, key, filters, layers, hidden, positions and the legend in version 2", async () => {
        const source = await viewsSession();
        const section = await save(source);
        assert.deepEqual(invalid(section), []);
        const [above, kept] = section.views as JsonObject[];
        assert.deepEqual(above, { name: "Above", follows: "topView", key: "1" });
        assert.deepEqual(kept.hidden, [{ space: SPACE, key: "e" }]);
        const positions = kept.positions as { order: unknown[]; xyz: unknown[] };
        assert.deepEqual(positions.order.slice(0, 2), [
            { space: SPACE, key: "a" },
            { space: SPACE, key: "b" },
        ]);
        assert.deepEqual(positions.xyz.slice(0, 6), [1, 2, 3, 4, 5, 6]);
        assert.isTrue(kept.legend);

        const opened = await sessionWithData();
        assert.deepEqual(await open(opened, section), []);
        for (const name of ["Above", "Kept"]) {
            assert.deepEqual(viewOf(opened, name), viewOf(source, name));
        }

        assert.deepEqual(await save(opened), section);
    });

    it("keeps every part through a version 1 project file", async () => {
        const source = await viewsSession();
        const target = createGraphSession();
        await target.project.open((await source.project.save()).text);
        for (const name of ["Above", "Kept"]) {
            assert.deepEqual(viewOf(target, name), viewOf(source, name));
        }
    });

    it("opens a version 2 file whose views hold only a name and a camera", async () => {
        const opened = await sessionWithData();
        const camera = { dimension: 2, controller: "2d", center: { x: 0, y: 0 }, halfWidth: 2.5 };
        assert.deepEqual(
            await open(opened, { kind: "graphty-view", version: 1, views: [{ name: "Old", camera }] }),
            [],
        );
        assert.deepEqual(opened.views.get("Old"), { camera: { pan: { x: 0, y: 0 }, zoom: 2, rotation: 0 } });
    });
});

describe("view codec: a refused expression or rule tree leaf fails only its holder", () => {
    it("keeps and reports a filter whose expression is refused, and writes it back", async () => {
        const opened = await sessionWithData();
        const visibility = { filter: { on: "nodes", where: "data.a > 5" } };
        const problems = await open(opened, { kind: "graphty-view", version: 1, visibility });
        assert.deepInclude(problems, {
            code: "W_UNKNOWN_MEMBER",
            params: { section: "view", pointer: "/sections/view/visibility/filter/where", reason: "E_BAD_SELECTOR" },
        });
        assert.isNull(opened.visibility.filter);
        assert.deepInclude((await save(opened)).visibility as JsonObject, visibility);
    });

    it("keeps and reports a set holding an unknown leaf kind, and loads the others", async () => {
        const opened = await sessionWithData();
        const odd = {
            id: "set_01JCBP1C9E2G4J6M8N0Q3S5V7Y",
            name: "Odd",
            definition: { kind: "rule", where: { kind: "future-leaf", x: 1 }, reading: "induced" },
        };
        const busy = {
            id: "set_01JCBP1C9E2G4J6M8N0Q3S5V7Z",
            name: "Busy",
            definition: { kind: "rule", where: { kind: "degree", min: 2 }, reading: "induced" },
        };
        const problems = await open(opened, { kind: "graphty-view", version: 1, sets: [odd, busy] });
        assert.deepInclude(problems, {
            code: "W_UNKNOWN_MEMBER",
            params: { section: "view", pointer: "/sections/view/sets/0/definition/where", reason: "E_BAD_SELECTOR" },
        });
        assert.deepEqual(
            opened.sets.list().map((set) => set.name),
            ["Busy"],
        );
        assert.deepEqual((await save(opened)).sets, [odd, busy]);
    });
});

describe("view codec: the camera is a neutral pose", () => {
    const validCamera = (camera: unknown): string[] => {
        const validate = ajv.getSchema(`${schemaUrl("graphty-view", 1)}#/$defs/camera`);
        assert.isDefined(validate);
        return validate(camera)
            ? []
            : (validate.errors ?? []).map((error) => `${error.instancePath} ${String(error.message)}`);
    };

    /**
     * A session whose renderer stand-in reports `state` and records every `view.camera` it is asked to carry out.
     * @param state - What the renderer says its camera is.
     * @returns The session and the moves.
     */
    async function drawing(
        state: CameraState = {},
    ): Promise<{ session: GraphSession; moves: { camera?: CameraState; viewRotation?: number }[] }> {
        const session = await sessionWithData();
        const moves: { camera?: CameraState; viewRotation?: number }[] = [];
        dispatcherOf(session).services.camera = {
            move: (command) => {
                moves.push({ camera: command.camera, viewRotation: session.config.viewRotation });
                return Promise.resolve();
            },
            current: () => state,
            state: () => state,
        };
        return { session, moves };
    }

    it("writes an orbit camera as its eye, target, up and fov, with no viewport inset and no orbit members", async () => {
        const target = { x: 1, y: 2, z: 3 };
        const pivotRotation = { x: 0.3, y: 1.1, z: 0.2 };
        const { session } = await drawing({
            mode: "3d",
            target,
            pivotRotation,
            cameraDistance: 12,
            fov: 0.8,
            // Where an inset-shifted camera stands: not the pose.
            position: { x: 40, y: 40, z: 40 },
        });
        const camera = (await save(session)).camera as JsonObject;
        assert.deepEqual(Object.keys(camera), ["dimension", "controller", "position", "target", "up", "fov"]);
        const forward = new Vector3(0, 0, 1).applyRotationQuaternion(
            Quaternion.RotationYawPitchRoll(pivotRotation.y, pivotRotation.x, pivotRotation.z),
        );
        const position = camera.position as { x: number; y: number; z: number };
        assert.closeTo(position.x, target.x - 12 * forward.x, 1e-9);
        assert.closeTo(position.y, target.y - 12 * forward.y, 1e-9);
        assert.closeTo(position.z, target.z - 12 * forward.z, 1e-9);
        assert.deepEqual(camera.target, target);
        assert.strictEqual(camera.fov, 0.8);
        assert.deepEqual(validCamera(camera), []);
    });

    it("writes a 2D camera as its center, half width and turn", async () => {
        const { session } = await drawing({ mode: "2d", zoom: 2, pan: { x: 1, y: 2 }, rotation: 0.5 });
        const { camera } = await save(session);
        assert.deepEqual(camera, {
            dimension: 2,
            controller: "2d",
            center: { x: 1, y: 2 },
            halfWidth: 2.5,
            rotation: 0.5,
        });
        assert.deepEqual(validCamera(camera), []);
    });

    it("opens a camera with a roll as a pivot that gives back its eye and its up", async () => {
        const { session, moves } = await drawing();
        const camera = {
            dimension: 3,
            controller: "orbit",
            position: { x: 4, y: 5, z: -6 },
            target: { x: 1, y: 0, z: 2 },
            up: { x: 0.3, y: 0.8, z: 0.1 },
        };
        assert.deepEqual(validCamera(camera), []);
        assert.deepEqual(await open(session, { kind: "graphty-view", version: 1, camera }), []);
        const state = moves[0]?.camera;
        assert.isDefined(state?.pivotRotation);
        assert.isDefined(state.cameraDistance);
        const back = poseOfPivot(camera.target, state.pivotRotation, state.cameraDistance);
        for (const axis of ["x", "y", "z"] as const) {
            assert.closeTo(back.position[axis], camera.position[axis], 1e-9);
        }

        // The up a file gives may lean along the line of sight; only its part across it counts.
        const sight = new Vector3(4 - 1, 5 - 0, -6 - 2).normalize();
        const given = new Vector3(camera.up.x, camera.up.y, camera.up.z);
        const across = given.subtract(sight.scale(Vector3.Dot(given, sight))).normalize();
        assert.closeTo(back.up.x, across.x, 1e-9);
        assert.closeTo(back.up.y, across.y, 1e-9);
        assert.closeTo(back.up.z, across.z, 1e-9);
    });

    it("opens a hand-written camera with only a position and a target, the world up and no fov", async () => {
        const { session, moves } = await drawing();
        const camera = { dimension: 3, position: { x: 0, y: 0, z: -10 }, target: { x: 0, y: 0, z: 0 } };
        assert.deepEqual(validCamera(camera), []);
        assert.deepEqual(await open(session, { kind: "graphty-view", version: 1, camera }), []);
        const state = moves[0]?.camera;
        assert.isDefined(state?.pivotRotation);
        assert.notProperty(state, "fov");
        const { up } = poseOfPivot(camera.target, state.pivotRotation, 10);
        assert.closeTo(up.x, 0, 1e-12);
        assert.closeTo(up.y, 1, 1e-12);
        assert.closeTo(up.z, 0, 1e-12);
    });

    it("applies a camera of an unknown controller by its pose, reports it, and writes it back as read", async () => {
        const { session, moves } = await drawing();
        const camera = {
            dimension: 3,
            controller: "com.example.fly",
            position: { x: 0, y: 1, z: 2 },
            target: { x: 0, y: 0, z: 0 },
            controllers: { "com.example.fly": { speed: 3 } },
        };
        const section = {
            kind: "graphty-view",
            version: 1,
            generator: { name: "graphty-element", version: "test" },
            bindsTo: { data: DATA_ID },
            camera,
        };
        assert.deepEqual(invalid(section), []);
        assert.deepEqual(await open(session, section), [
            { code: "W_CAMERA_CONTROLLER_UNKNOWN", params: { section: "view", controller: "com.example.fly" } },
        ]);
        assert.deepInclude(moves[0]?.camera, { position: camera.position, target: camera.target });
        assert.strictEqual(JSON.stringify((await save(session)).camera), JSON.stringify(camera));
    });

    it("opens a 2D file at the camera's turn: viewRotation first, then the camera", async () => {
        const { session, moves } = await drawing();
        const camera = { dimension: 2, controller: "2d", center: { x: 0, y: 0 }, halfWidth: 5, rotation: 0.5 };
        assert.deepEqual(await open(session, { kind: "graphty-view", version: 1, viewRotation: 90, camera }), []);
        assert.deepEqual(moves, [{ camera: { pan: { x: 0, y: 0 }, zoom: 1, rotation: 0.5 }, viewRotation: 90 }]);
    });

    it("writes no camera for a state with no pose, and refuses a camera with none", () => {
        assert.isUndefined(cameraJson({ position: { x: 1, y: 1, z: 1 }, target: { x: 1, y: 1, z: 1 } }));
        assert.isUndefined(cameraJson({ mode: "2d", zoom: 2 }));
        assert.isUndefined(cameraOf({ dimension: 3, position: { x: 0, y: 0, z: 1 } }));
        assert.isUndefined(cameraOf({ dimension: 2, center: { x: 0, y: 0 }, halfWidth: 0 }));
        const schema = (camera: unknown): boolean => validCamera(camera).length === 0;
        assert.isFalse(schema({ dimension: 3, position: { x: 0, y: 0, z: 1 }, target: { x: 0, y: 0, z: 0 }, zoom: 1 }));
        assert.isFalse(schema({ dimension: 2, center: { x: 0, y: 0 }, halfWidth: 1, fov: 1 }));
        assert.isFalse(schema({ dimension: 3, center: { x: 0, y: 0 }, halfWidth: 1 }));
    });
});

describe("camera pose math", () => {
    /** A seeded stream of numbers in [0, 1), so a failure repeats. */
    const random = (() => {
        let seed = 7;
        return (): number => {
            seed = (seed * 16807) % 2147483647;
            return seed / 2147483647;
        };
    })();

    /**
     * A Babylon.js pivot orientation, as `src/camera/orientation.ts` turns the orbit pivot.
     * @param angles - Pitch (x), yaw (y) and roll (z).
     * @returns The quaternion.
     */
    const pivotQuaternion = (angles: { x: number; y: number; z: number }): Quaternion =>
        Quaternion.RotationYawPitchRoll(angles.y, angles.x, angles.z);

    it("puts the eye and the up where Babylon.js's pivot rotation does", () => {
        for (let n = 0; n < 50; n++) {
            const angles = {
                x: (random() - 0.5) * Math.PI,
                y: (random() - 0.5) * 4 * Math.PI,
                z: (random() - 0.5) * 2 * Math.PI,
            };
            const target = { x: random() * 10, y: random() * 10, z: random() * 10 };
            const distance = 1 + random() * 20;
            const { position, up } = poseOfPivot(target, angles, distance);
            const turn = pivotQuaternion(angles);
            const forward = new Vector3(0, 0, 1).applyRotationQuaternion(turn);
            const babylonUp = new Vector3(0, 1, 0).applyRotationQuaternion(turn);
            assert.closeTo(position.x, target.x - distance * forward.x, 1e-9);
            assert.closeTo(position.y, target.y - distance * forward.y, 1e-9);
            assert.closeTo(position.z, target.z - distance * forward.z, 1e-9);
            assert.closeTo(up.x, babylonUp.x, 1e-9);
            assert.closeTo(up.y, babylonUp.y, 1e-9);
            assert.closeTo(up.z, babylonUp.z, 1e-9);
        }
    });

    it("finds the pivot rotation a pose came from, up to the sign of its quaternion", () => {
        for (let n = 0; n < 50; n++) {
            const angles = {
                x: (random() - 0.5) * 0.98 * Math.PI,
                y: (random() - 0.5) * 4 * Math.PI,
                z: (random() - 0.5) * 2 * Math.PI,
            };
            const target = { x: random(), y: random(), z: random() };
            const { position, up } = poseOfPivot(target, angles, 5);
            const found = pivotOfPose(position, target, up);
            const want = Quaternion.RotationYawPitchRoll(angles.y, angles.x, angles.z);
            const got = Quaternion.RotationYawPitchRoll(found.y, found.x, found.z);
            assert.closeTo(Math.abs(Quaternion.Dot(want, got)), 1, 1e-9);
        }
    });

    it("keeps the up at a pole, where the yaw is pi: looking straight down with up toward +z", () => {
        const target = { x: 0, y: 0, z: 0 };
        const position = { x: 0, y: 10, z: 0 };
        const found = pivotOfPose(position, target, { x: 0, y: 0, z: 1 });
        assert.strictEqual(found.y, Math.PI);
        assert.closeTo(found.x, Math.PI / 2, 1e-12);
        const back = poseOfPivot(target, found, 10);
        assert.closeTo(back.position.y, 10, 1e-9);
        assert.closeTo(back.up.x, 0, 1e-9);
        assert.closeTo(back.up.y, 0, 1e-9);
        assert.closeTo(back.up.z, 1, 1e-9);
        // With no up, the world up is along the line of sight there, so there is no roll.
        assert.strictEqual(pivotOfPose(position, target).z, 0);
    });
});

describe("view codec: what a hand-written or damaged section opens as", () => {
    const at = (key: string): JsonObject => ({ space: SPACE, key });
    const section = (body: JsonObject): JsonObject => ({ kind: "graphty-view", version: 1, ...body });
    const camera = { dimension: 3, controller: "orbit", position: { x: 0, y: 0, z: 9 }, target: { x: 0, y: 0, z: 0 } };

    it("opens only the saved views it can, and leaves out positions it cannot bind", async () => {
        const opened = await sessionWithData();
        const problems = await open(
            opened,
            section({
                views: [
                    "not a view",
                    { camera },
                    { name: "Nowhere" },
                    { name: "Broken", camera, positions: { order: "a", xyz: [] } },
                    {
                        name: "Kept",
                        camera,
                        positions: { order: [at("a"), at("gone"), at("b")], xyz: [1, 2, 3, 0, 0, 0, 4, "x", 6] },
                    },
                ],
            }),
        );
        assert.deepEqual(problems, [
            {
                code: "W_REFERENCE_UNBOUND",
                params: {
                    section: "view",
                    pointer: "/sections/view/views/4/positions/order/1",
                    ref: `{"key":"gone","space":"${SPACE}"}`,
                },
            },
        ]);
        assert.deepEqual([...opened.views.keys()], ["Broken", "Kept"]);
        assert.isUndefined(opened.views.get("Broken")?.positions);
        const positions = opened.views.get("Kept")?.positions;
        assert.deepEqual(positions?.order, ["a", "b"]);
        assert.deepEqual(positions?.xyz.slice(0, 4), [1, 2, 3, 4]);
        assert.isNaN(positions?.xyz[4]);
        assert.strictEqual(positions?.xyz[5], 6);
    });

    it("lists a run not run when its record has no algorithm, a scope it refuses, or a node it cannot bind", async () => {
        const opened = await sessionWithData();
        const runs = [
            { algorithm: "degree" },
            { id: "no-algorithm", scope: "graph" },
            { id: "odd-scope", algorithm: "degree", scope: "everything" },
            { id: "two-forms", algorithm: "degree", scope: { nodes: [], set: "x" } },
            { id: "bad-types", algorithm: "degree", scope: { types: [1] } },
            { id: "unbound", algorithm: "bfs", params: { source: at("gone") }, scope: "graph" },
        ];
        const problems = await open(opened, section({ runs }));
        assert.deepEqual(
            problems.filter((problem) => problem.code === "W_RUN_NOT_RUN").map((problem) => problem.params.run),
            ["no-algorithm", "odd-scope", "two-forms", "bad-types", "unbound"],
        );
        assert.deepEqual(opened.runs.list(), []);
        // Nothing ran, so the member is written back as read.
        assert.deepEqual((await save(opened)).runs, runs);
    });

    it("reruns a run scoped to a selection of nodes, under its saved id and name", async () => {
        const opened = await sessionWithData();
        const problems = await open(
            opened,
            section({
                runs: [{ id: "picked", name: "Picked", algorithm: "degree", scope: { nodes: [at("a"), at("b")] } }],
            }),
        );
        assert.deepEqual(problems, []);
        const run = opened.runs.get("picked");
        assert.strictEqual(run?.record.name, "Picked");
        assert.deepEqual([...(run?.scope.nodes ?? [])].sort(), ["a", "b"]);
    });

    it("reports a malformed pinned entry and a group it cannot collapse, and opens the rest", async () => {
        const opened = await sessionWithData();
        const problems = await open(
            opened,
            section({
                pinned: ["not an entry", { node: at("a") }, { node: at("b"), position: { x: 1, y: 2, z: 3 } }],
                groups: ["not a group", { groupBy: 1, group: "x" }, { groupBy: "group", group: { x: 1 } }],
            }),
        );
        assert.deepEqual(problems, [
            { code: "E_BAD_DOCUMENT", params: { section: "view", pointer: "/sections/view/groups/0" } },
            { code: "E_BAD_DOCUMENT", params: { section: "view", pointer: "/sections/view/groups/1" } },
            { code: "E_BAD_DOCUMENT", params: { section: "view", pointer: "/sections/view/groups/2" } },
        ]);
        assert.deepEqual([...opened.positions.pinned], ["b"]);
        assert.deepEqual(opened.groups.list(), []);
    });

    it("collapses a group again pinned where it stood, and reports an added edge it cannot read", async () => {
        const opened = await sessionWithData();
        const problems = await open(
            opened,
            section({
                groups: [
                    {
                        groupBy: "data.group",
                        group: "x",
                        position: { x: 5, y: 6, z: 7 },
                        pinned: true,
                        edges: ["not an edge", { edge: { load: "elsewhere", key: "k" }, from: at("e"), to: at("e") }],
                    },
                ],
            }),
        );
        assert.deepEqual(problems, [
            { code: "E_BAD_DOCUMENT", params: { section: "view", pointer: "/sections/view/groups/0/edges/0" } },
            { code: "E_BAD_DOCUMENT", params: { section: "view", pointer: "/sections/view/groups/0/edges/1" } },
        ]);
        assert.strictEqual(opened.groups.list().length, 1);
        assert.strictEqual(opened.positions.pinned.size, 1);
        const [stand] = [...opened.positions.pinned];
        assert.deepInclude(opened.positions.get(stand), { x: 5, y: 6, z: 7 });
    });

    it("skips a condition that is not an object, and creates a set with no name or id", async () => {
        const opened = await sessionWithData();
        const problems = await open(
            opened,
            section({
                visibility: { showContext: false, conditions: ["not a condition"], hidden: [] },
                sets: [{ definition: { kind: "fixed", nodes: [at("a")], reading: "induced" } }],
            }),
        );
        assert.deepEqual(problems, []);
        assert.deepEqual(opened.visibility.conditions, []);
        const [set] = opened.sets.list();
        assert.deepEqual(set.definition, { kind: "fixed", nodes: ["a"], reading: "induced" });
    });

    it("keeps a layer whose selector it refuses first in the stack, and orders only the ids it knows", async () => {
        const opened = await sessionWithData();
        const refusedLayer = { ...viewLayer("Odd"), selector: { match: "expression", where: "data.x ==" } };
        const problems = await open(
            opened,
            section({ layers: [refusedLayer, viewLayer("Plain")], order: [7, "Plain", "Odd"] }),
        );
        assert.deepEqual(
            problems.map((problem) => problem.code),
            ["W_UNKNOWN_MEMBER"],
        );
        assert.deepEqual(layerNames(opened).slice(-1), ["Plain"]);
        assert.deepEqual(
            ((await save(opened)).layers as JsonObject[]).map((layer) => layer.id),
            ["Odd", "Plain"],
        );
    });

    it("opens a layout record in 2D", async () => {
        const opened = await sessionWithData();
        assert.deepEqual(await open(opened, section({ layout: { id: "force", dimension: 2 } })), []);
        assert.strictEqual(opened.layout.dimension, "2d");
        assert.strictEqual(((await save(opened)).layout as JsonObject).dimension, 2);
    });
});

describe("view codec: writing what a session holds", () => {
    it("writes a selection-scoped run as its nodes", async () => {
        const session = await sessionWithData();
        await session.selection.apply({ nodes: ["a", "b"], edges: [] });
        await session.runs.start("degree", undefined, { style: false, scope: "selection" });
        const problems: DocumentProblem[] = [];
        const section = await save(session, problems);
        assert.deepEqual(invalid(section), []);
        assert.deepEqual(problems, []);
        const [run] = section.runs as JsonObject[];
        assert.deepEqual(run.scope, {
            nodes: [
                { space: SPACE, key: "a" },
                { space: SPACE, key: "b" },
            ],
        });
    });

    it("writes a run scoped to the visible graph while a condition hides nodes as not replayable", async () => {
        const session = await sessionWithData();
        await session.hidden.add(["e"]);
        await session.runs.start("degree", undefined, { style: false, scope: "visible" });
        const problems: DocumentProblem[] = [];
        const [run] = (await save(session, problems)).runs as JsonObject[];
        assert.strictEqual(run.replayable, false);
        assert.deepEqual(problems, [
            { code: "W_MEMBER_LEFT_OUT", params: { section: "view", pointer: "/runs/0/scope" } },
        ]);
    });

    it("writes a turned-off layer and its user data", async () => {
        const session = await sessionWithData();
        const layer = await session.styles.add({
            name: "Off",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.color": "#123456" },
            userData: { note: "kept" },
        });
        await session.styles.update(layer.id, { enabled: false });
        const section = await save(session);
        assert.deepEqual(invalid(section), []);
        const written = (section.layers as JsonObject[]).find((each) => each.name === "Off");
        assert.strictEqual(written?.enabled, false);
        assert.deepEqual(written?.userData, { note: "kept" });
    });
});
