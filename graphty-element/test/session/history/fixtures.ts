/**
 * @file The round-trip fixtures: for every undoable op, one command per value of its argument's
 * discriminant, run, undone and redone by `round-trip.test.ts` (on a session) and
 * `test/browser/history-round-trip.test.ts` (on a real `Graph`, for fixtures tagged `renderer`).
 *
 * Both run them over the same small graph: nodes `n1`, `n2` and `n3`, edges `n1 -> n2` and
 * `n2 -> n3`, and a session that can run `degree` and `shortest-path`.
 *
 * The vocabulary test fails when an undoable op, or a value of its discriminant, has no fixture
 * here, and when an op that changes what is drawn has no fixture tagged `renderer`. A phase that
 * adds an op adds its fixtures (design/undo/undo-plan.md, "How to read this plan", rule 3).
 */

import type { LayerSpec } from "../../../src/catalog/types";
import type { SessionCommand } from "../../../src/session/planning";
import type { GraphSession } from "../../../src/session/types";

/** One command whose round trip is checked. */
export interface RoundTripFixture {
    /** What the case is, for the test title. */
    readonly name: string;
    /** The command, run through `session.execute`. */
    readonly command: SessionCommand;
    /** The value of the command's discriminant it covers, for an op that has one. */
    readonly variant?: string;
    /** Where it runs: on a session, on a renderer, or both. */
    readonly tags: readonly ("session" | "renderer")[];
    /**
     * State to build before the command, as steps of their own. The round trip is checked from
     * the state after them.
     */
    readonly before?: (session: GraphSession) => Promise<void>;
}

/** Both twins run every style and visibility fixture. */
const BOTH = ["session", "renderer"] as const;

/**
 * A node layer a fixture adds. Its id is minted from its name: "Fixture A" is `fixture-a_1`.
 * @param name - The layer's name.
 * @param color - The colour it paints every node.
 * @returns The specification.
 */
function nodeLayer(name: string, color: string): LayerSpec {
    return { name, target: "node", selector: { match: "everything" }, set: { "node.color": color } };
}

/**
 * Add layers, each as a step of its own, and wait for the picture.
 * @param specs - The layers.
 * @returns The fixture's `before`.
 */
function withLayers(...specs: LayerSpec[]): (session: GraphSession) => Promise<void> {
    return async (session) => {
        for (const spec of specs) {
            await session.styles.add(spec);
        }
    };
}

/**
 * Run an algorithm without the layers it would paint by itself, and wait for everything.
 * @param session - The session.
 * @param algorithm - What to run.
 * @param as - The run's id.
 * @param params - Its parameters.
 */
async function runQuietly(
    session: GraphSession,
    algorithm: string,
    as: string,
    params: Readonly<Record<string, unknown>> = {},
): Promise<void> {
    await session.runs.start(algorithm, params, { as, style: false });
    await session.styles.settled();
}

/** The id the fixture set below is minted: the slug of its name. */
const FIXTURE_SET = "set_fixture-set";

/**
 * Keep the fixture set, nodes `n1` and `n2`, as a step of its own.
 * @param session - The session.
 */
async function withFixtureSet(session: GraphSession): Promise<void> {
    await session.execute({
        op: "set.create",
        name: "Fixture set",
        definition: { kind: "fixed", nodes: ["n1", "n2"], reading: "induced" },
    });
}

/** The note the note fixtures edit: its id is minted, so it is known once `withFixtureNote` ran. */
const FIXTURE_NOTE = { id: "" };

/**
 * Write the fixture note, about node `n1`, as a step of its own.
 * @param session - The session.
 */
async function withFixtureNote(session: GraphSession): Promise<void> {
    FIXTURE_NOTE.id = session.notes.add({ text: "Fixture note", targets: [{ node: "n1" }] });
    await Promise.resolve();
}

/** A 5 by 5 PNG a skybox can be built from without a network. */
export const SKYBOX_PNG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";

/**
 * Set a label path, then add a layer, so the next settings edit is a step of its own rather than
 * a merge into this one.
 * @param session - The session.
 */
async function labelledThenLayer(session: GraphSession): Promise<void> {
    await session.config.set({ data: { knownFields: { nodeLabelPath: "name" } } });
    await session.styles.add(nodeLayer("Fixture A", "#ff0000"));
}

/** A small graph document the JSON data source reads, for the import fixtures. */
const IMPORTED = JSON.stringify({
    nodes: [{ id: "a", label: "A" }, { id: "b" }],
    edges: [{ src: "a", dst: "b" }],
});

/** Every fixture. */
export const FIXTURES: readonly RoundTripFixture[] = [
    {
        name: "data.apply add-nodes",
        variant: "add-nodes",
        tags: BOTH,
        command: { op: "data.apply", mutation: { kind: "add-nodes", records: [{ id: "n4", name: "four" }] } },
    },
    {
        name: "data.apply add-edges",
        variant: "add-edges",
        tags: BOTH,
        command: {
            op: "data.apply",
            mutation: { kind: "add-edges", records: [{ src: "n3", dst: "n1", kind: "back" }] },
        },
    },
    {
        name: "data.apply add-edges folding a repeat into the edge it repeats",
        variant: "add-edges",
        tags: ["session"],
        command: {
            op: "data.apply",
            mutation: { kind: "add-edges", records: [{ src: "n1", dst: "n2", weight: 3 }], repeated: "sum" },
        },
    },
    {
        name: "data.apply set-attributes",
        variant: "set-attributes",
        tags: BOTH,
        command: {
            op: "data.apply",
            mutation: { kind: "set-attributes", target: "node", ids: ["n1", "n2"], values: { type: "hub" } },
        },
    },
    {
        name: "data.apply update-rows on nodes",
        variant: "update-rows",
        tags: BOTH,
        command: {
            op: "data.apply",
            mutation: { kind: "update-rows", target: "node", rows: [{ id: "n3", values: { name: "three", t: 4 } }] },
        },
    },
    {
        name: "data.apply update-rows on edges",
        variant: "update-rows",
        tags: BOTH,
        command: {
            op: "data.apply",
            mutation: { kind: "update-rows", target: "edge", rows: [{ id: "1", values: { kind: "next" } }] },
        },
    },
    {
        name: "data.apply remove-nodes from the middle",
        variant: "remove-nodes",
        tags: BOTH,
        command: { op: "data.apply", mutation: { kind: "remove-nodes", ids: ["n2"] } },
    },
    {
        name: "data.apply remove-edges",
        variant: "remove-edges",
        tags: BOTH,
        command: { op: "data.apply", mutation: { kind: "remove-edges", ids: ["0"] } },
    },
    {
        name: "data.import replacing the graph",
        variant: "replace",
        tags: BOTH,
        command: { op: "data.import", source: { type: "json", config: { data: IMPORTED } }, mode: "replace" },
    },
    {
        name: "data.import merging into the graph",
        variant: "merge",
        tags: BOTH,
        command: { op: "data.import", source: { type: "json", config: { data: IMPORTED } }, mode: "merge" },
    },
    {
        name: "data.expand: a fetched neighbourhood, one edge of it already held",
        tags: BOTH,
        command: {
            op: "data.expand",
            seed: "n3",
            nodes: [{ id: "n5", name: "five" }],
            edges: [
                { src: "n3", dst: "n5" },
                { src: "n2", dst: "n3" },
            ],
        },
    },
    {
        name: "batch: nodes and edges as one step",
        tags: BOTH,
        command: {
            op: "batch",
            label: "Grew the graph",
            steps: [
                { op: "data.apply", mutation: { kind: "add-nodes", records: [{ id: "n4" }] } },
                { op: "data.apply", mutation: { kind: "add-edges", records: [{ src: "n3", dst: "n4" }] } },
            ],
        },
    },
    {
        name: "data.apply clear",
        variant: "clear",
        tags: BOTH,
        command: { op: "data.apply", mutation: { kind: "clear" } },
    },
    {
        name: "algo.run: the run, its result and the layer it paints",
        tags: BOTH,
        command: { op: "algo.run", algorithm: "degree", as: "fixture-deg" },
    },
    {
        name: "algo.run applying its suggested styles over a layer that would suppress them",
        tags: BOTH,
        before: withLayers(nodeLayer("Fixture A", "#ff0000")),
        command: { op: "algo.run", algorithm: "degree", as: "fixture-deg", applySuggestedStyles: true },
    },
    {
        // The plugin is registered by test/helpers/legacyPlugins.ts; only a renderer constructs one.
        name: "algo.legacy: a plugin writing results onto nodes, edges and the graph",
        tags: ["renderer"],
        command: { op: "algo.legacy", namespace: "fixture", type: "write-everywhere" },
    },
    {
        name: "algo.remove: a run and the layer bound to it",
        tags: BOTH,
        before: async (session) => {
            await session.runs.start("degree", {}, { as: "deg" });
            await session.styles.settled();
        },
        command: { op: "algo.remove", runId: "deg" },
    },
    {
        name: "style.patch add",
        variant: "add",
        tags: BOTH,
        command: { op: "style.patch", action: "add", spec: nodeLayer("Fixture A", "#ff0000") },
    },
    {
        name: "style.patch update",
        variant: "update",
        tags: BOTH,
        before: withLayers(nodeLayer("Fixture A", "#ff0000")),
        command: {
            op: "style.patch",
            action: "update",
            id: "fixture-a_1",
            patch: { set: { "node.color": "#00ff00" } },
        },
    },
    {
        name: "style.patch remove",
        variant: "remove",
        tags: BOTH,
        before: withLayers(nodeLayer("Fixture A", "#ff0000")),
        command: { op: "style.patch", action: "remove", id: "fixture-a_1" },
    },
    {
        name: "style.patch move",
        variant: "move",
        tags: BOTH,
        before: withLayers(nodeLayer("Fixture A", "#ff0000"), nodeLayer("Fixture B", "#0000ff")),
        command: { op: "style.patch", action: "move", id: "fixture-a_1", before: null },
    },
    {
        name: "style.patch removeBySource",
        variant: "removeBySource",
        tags: BOTH,
        before: withLayers(nodeLayer("Fixture A", "#ff0000"), nodeLayer("Fixture B", "#0000ff")),
        command: { op: "style.patch", action: "removeBySource", ids: ["fixture-a_1", "fixture-b_1"] },
    },
    {
        name: "style.patch highlight",
        variant: "highlight",
        tags: BOTH,
        before: (session) => runQuietly(session, "shortest-path", "route", { source: "n1", target: "n3" }),
        command: { op: "style.patch", action: "highlight", spec: { run: "route" } },
    },
    {
        name: "style.patch resolveToStatic",
        variant: "resolveToStatic",
        tags: BOTH,
        before: async (session) => {
            await runQuietly(session, "degree", "deg");
            await session.styles.encode({ run: "deg", channel: "node.color", name: "Fixture encoding" });
        },
        command: { op: "style.patch", action: "resolveToStatic", id: "fixture-encoding_1", channel: "node.color" },
    },
    {
        name: "style.encode",
        tags: BOTH,
        before: (session) => runQuietly(session, "degree", "deg"),
        command: { op: "style.encode", spec: { run: "deg", channel: "node.color", name: "Fixture encoding" } },
    },
    {
        name: "style.template",
        tags: BOTH,
        command: {
            op: "style.template",
            document: { version: 1, layers: [nodeLayer("Fixture T", "#00ffff")] },
            templateId: "fixture-template",
        },
    },
    {
        name: "visibility.set",
        tags: BOTH,
        // Only n2 has degree 2, so n1 and n3 are hidden, with both edges.
        command: { op: "visibility.set", filter: { kind: "degree", min: 2 } },
    },
    {
        name: "visibility.set clears a filter",
        tags: BOTH,
        // The layer ends the filter step, so clearing it is a step of its own, not a merge.
        before: async (session) => {
            await session.visibility.set({ kind: "degree", min: 2 });
            await session.styles.add(nodeLayer("Fixture A", "#ff0000"));
        },
        command: { op: "visibility.set", filter: null },
    },
    {
        name: "visibility.window",
        tags: BOTH,
        command: { op: "visibility.window", window: { attribute: "data.t", from: 0, to: 10 } },
    },
    {
        name: "visibility.context",
        tags: BOTH,
        before: async (session) => {
            await session.visibility.set({ kind: "degree", min: 2 });
        },
        command: { op: "visibility.context", show: true },
    },
    {
        name: "set.create: a fixed set",
        tags: ["session"],
        command: {
            op: "set.create",
            name: "Fixture set",
            definition: { kind: "fixed", nodes: ["n1", "n2"], reading: "induced" },
        },
    },
    {
        name: "set.create: a rule set",
        tags: ["session"],
        command: {
            op: "set.create",
            name: "Fixture rule",
            definition: { kind: "rule", where: { kind: "degree", min: 2 }, reading: "induced" },
        },
    },
    {
        name: "set.rename",
        tags: ["session"],
        before: withFixtureSet,
        command: { op: "set.rename", id: FIXTURE_SET, name: "Renamed set" },
    },
    {
        name: "set.redefine",
        tags: ["session"],
        before: withFixtureSet,
        command: {
            op: "set.redefine",
            id: FIXTURE_SET,
            definition: { kind: "fixed", nodes: ["n3"], reading: "induced" },
        },
    },
    {
        name: "set.members: add",
        tags: ["session"],
        before: withFixtureSet,
        command: { op: "set.members", id: FIXTURE_SET, add: { nodes: ["n3"] } },
    },
    {
        name: "set.members: remove",
        tags: ["session"],
        before: withFixtureSet,
        command: { op: "set.members", id: FIXTURE_SET, remove: { nodes: ["n1"] } },
    },
    {
        name: "set.remove",
        tags: ["session"],
        before: withFixtureSet,
        command: { op: "set.remove", id: FIXTURE_SET },
    },
    {
        name: "set.restore",
        tags: ["session"],
        before: async (session) => {
            await withFixtureSet(session);
            await session.execute({ op: "set.remove", id: FIXTURE_SET });
        },
        command: { op: "set.restore", id: FIXTURE_SET },
    },
    {
        name: "note.add",
        tags: ["session"],
        before: async (session) => {
            await session.config.set({ author: "Fixture author" });
            await session.runs.start("degree", undefined, { as: "deg", style: false });
        },
        command: {
            op: "note.add",
            note: {
                text: "A fixture note\nover two lines",
                targets: [
                    { node: "n1" },
                    { edge: { source: "n1", target: "n2", ordinal: 0, among: 1 } },
                    { graph: true },
                ],
                cites: [{ result: "deg" }],
                mediaType: "text/markdown",
                extensions: { "com.example.fixture": { done: true } },
            },
        },
    },
    {
        name: "note.update",
        tags: ["session"],
        before: withFixtureNote,
        command: {
            op: "note.update",
            get id() {
                return FIXTURE_NOTE.id;
            },
            patch: { text: "Edited fixture note", targets: [{ node: "n2" }], mediaType: "text/plain" },
        },
    },
    {
        name: "note.remove",
        tags: ["session"],
        before: withFixtureNote,
        command: {
            op: "note.remove",
            get id() {
                return FIXTURE_NOTE.id;
            },
        },
    },
    {
        name: "note.merge",
        tags: ["session"],
        before: withFixtureNote,
        command: {
            op: "note.merge",
            // A getter, because the held fixture note's id is minted when the fixture runs; the
            // document it returns is plain JSON, as mergeDocument requires.
            get document() {
                return {
                    kind: "graphty-notes",
                    version: 1,
                    name: "Fixture notes",
                    notes: [
                        {
                            id: "note_fixture-merged",
                            time: "2026-10-01T09:00:00.000Z",
                            targets: [{ node: "n1" }, { filterStep: "s1" }],
                            text: "A merged fixture note",
                            author: "Someone else",
                        },
                        // The held fixture note's id with other content: kept both, under a new id.
                        {
                            id: FIXTURE_NOTE.id,
                            time: "2026-10-01T09:00:00.000Z",
                            targets: [{ node: "n2" }],
                            text: "Another version",
                        },
                    ],
                };
            },
        },
    },
    {
        name: "data.declare",
        tags: BOTH,
        command: {
            op: "data.declare",
            column: { kind: "node", name: "name" },
            declaration: { measurement: "ordinal", order: ["a", "b"] },
        },
    },
    {
        name: "data.setSource",
        tags: ["session"],
        before: async (session) => {
            await session.data.import({ type: "json", config: { data: IMPORTED }, name: "first.json" });
        },
        command: { op: "data.setSource", source: { type: "json", name: "Renamed" } },
    },
    {
        name: "view.save",
        tags: ["session"],
        command: { op: "view.save", views: [{ name: "Fixture view", camera: { zoom: 2, pan: { x: 1, y: 2 } } }] },
    },
    {
        name: "view.remove",
        tags: ["session"],
        before: (session) => session.views.save([{ name: "Fixture view", camera: { zoom: 2 } }]),
        command: { op: "view.remove", names: ["Fixture view"] },
    },
    {
        name: "config.set a data-config leaf",
        variant: "data",
        tags: BOTH,
        command: { op: "config.set", values: { data: { knownFields: { nodeLabelPath: "name" } } } },
    },
    {
        name: "config.set the on-load algorithms, replaced whole",
        variant: "data",
        tags: ["session"],
        before: async (session) => {
            await session.config.set({ data: { algorithms: ["degree", "pagerank"] } });
            await session.styles.add(nodeLayer("Fixture A", "#ff0000"));
        },
        command: { op: "config.set", values: { data: { algorithms: ["betweenness"] } } },
    },
    {
        name: "config.set returns a setting to its default",
        variant: "data",
        tags: ["session"],
        before: labelledThenLayer,
        command: { op: "config.set", values: { data: { knownFields: { nodeLabelPath: undefined } } } },
    },
    {
        name: "config.set runAlgorithmsOnLoad",
        variant: "runAlgorithmsOnLoad",
        tags: BOTH,
        command: { op: "config.set", values: { runAlgorithmsOnLoad: true } },
    },
    {
        name: "config.set background colour",
        variant: "background",
        tags: BOTH,
        command: { op: "config.set", values: { background: { backgroundType: "color", color: "#101010" } } },
    },
    {
        name: "config.set background skybox",
        variant: "background",
        tags: BOTH,
        command: { op: "config.set", values: { background: { backgroundType: "skybox", data: SKYBOX_PNG } } },
    },
    {
        name: "config.set selectionStyle",
        variant: "selectionStyle",
        tags: BOTH,
        command: { op: "config.set", values: { selectionStyle: { color: "#00ff00", scale: 2 } } },
    },
    {
        name: "config.set author",
        variant: "author",
        tags: BOTH,
        command: { op: "config.set", values: { author: "Fixture author" } },
    },
    {
        name: "config.set name",
        variant: "name",
        tags: BOTH,
        command: { op: "config.set", values: { name: "Fixture project" } },
    },
    {
        name: "config.set layoutBehavior.preSteps",
        variant: "layoutBehavior",
        tags: BOTH,
        command: { op: "config.set", values: { layoutBehavior: { preSteps: 5 } } },
    },
    {
        name: "config.set layoutBehavior.stepMultiplier",
        variant: "layoutBehavior",
        tags: BOTH,
        command: { op: "config.set", values: { layoutBehavior: { stepMultiplier: 2 } } },
    },
    {
        name: "config.set layoutBehavior.minDelta",
        variant: "layoutBehavior",
        tags: BOTH,
        command: { op: "config.set", values: { layoutBehavior: { minDelta: 0.5 } } },
    },
    {
        name: "positions.set: one node placed",
        tags: BOTH,
        command: { op: "positions.set", entries: [{ id: "n2", x: 5, y: 6, z: 7 }] },
    },
    {
        name: "positions.set over most of the rows, kept as a capture",
        tags: BOTH,
        command: {
            op: "positions.set",
            entries: [
                { id: "n1", x: 1, y: 1, z: 1 },
                { id: "n3", x: 3, y: 3 },
            ],
        },
    },
    {
        name: "positions.pin: a node pinned",
        tags: BOTH,
        command: { op: "positions.pin", ids: ["n1"], pinned: true },
    },
    {
        name: "positions.pin: a pin released",
        tags: BOTH,
        before: (session) => session.positions.pin(["n1"]),
        command: { op: "positions.pin", ids: ["n1"], pinned: false },
    },
    {
        name: "layout.set: a new layout",
        tags: BOTH,
        command: { op: "layout.set", id: "spiral" },
    },
    {
        name: "layout.set: an alternate engine with its options",
        tags: ["session"],
        command: { op: "layout.set", id: "force", engine: "d3", options: { alphaMin: 0.2 } },
    },
    {
        name: "layout.set: a layout over part of the graph",
        tags: ["session"],
        command: { op: "layout.set", id: "force", scope: { nodes: ["n1", "n2"] } },
    },
    {
        name: "layout.scope: part of the graph",
        tags: ["session"],
        command: { op: "layout.scope", scope: { nodes: ["n1", "n2"] } },
    },
    {
        name: "layout.scope: back to the whole graph",
        tags: ["session"],
        before: async (session) => {
            await session.execute({ op: "layout.scope", scope: { nodes: ["n1"] } });
        },
        command: { op: "layout.scope", scope: "graph" },
    },
    {
        name: "view.dimension: 3D to 2D",
        tags: BOTH,
        command: { op: "view.dimension", dimension: "2d" },
    },
    {
        name: "view.dimension: 2D to 3D",
        tags: BOTH,
        before: async (session) => {
            await session.layout.setDimension("2d");
        },
        command: { op: "view.dimension", dimension: "3d" },
    },
];
