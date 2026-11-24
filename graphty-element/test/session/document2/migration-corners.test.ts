/**
 * @file The version 1 migration (spec 9.1) of what a hand-edited or older version 1 file may hold
 * and today's saves never write: set members by edge, path sets, runs keyed by namespace, narrowed
 * or seeded, note targets that bind and ones that do not, the session's visibility, selection,
 * columns, collapsed groups, views and layout as an older build wrote them, recipe documents, bare
 * members, extension members and duplicates. Each is read the way the spec says, or reported.
 */

import { assert, describe, it } from "vitest";

import { migrateDocument1 } from "../../../src/session/document2/migration";
import type { DocumentProblem, JsonObject } from "../../../src/session/document2/types";
import { baseSession } from "../../helpers/project-session";

interface Migrated {
    readonly v2: JsonObject;
    readonly sections: Record<string, JsonObject>;
    readonly problems: DocumentProblem[];
}

/**
 * A version 1 file of the three-node, two-edge session, with one run of degree called `links`.
 * @returns The file.
 */
async function v1File(): Promise<{ members: JsonObject[] } & JsonObject> {
    const session = await baseSession();
    await session.runs.start("degree", undefined, { as: "links", style: false });
    const file = JSON.parse((await session.project.save({ format: 1 })).text) as { members: JsonObject[] } & JsonObject;
    session.dispose();
    return file;
}

/**
 * A member of a version 1 file.
 * @param file - The file.
 * @param kind - The member's kind.
 * @returns The member.
 */
function member(file: { members: JsonObject[] }, kind: string): JsonObject {
    const found = file.members.find((each) => each.kind === kind);
    assert.isDefined(found, kind);
    return found;
}

/**
 * A version 1 file migrated.
 * @param file - The file.
 * @returns The version 2 file, its sections and the problems reported.
 */
function migrated(file: JsonObject): Migrated {
    const problems: DocumentProblem[] = [];
    const v2 = migrateDocument1(file, problems);
    assert.isDefined(v2);
    return { v2, sections: v2.sections as Record<string, JsonObject>, problems };
}

/**
 * The pointers of the members a migration left out, as `<kind> <pointer>`.
 * @param problems - The problems.
 * @returns The pointers.
 */
function leftOut(problems: readonly DocumentProblem[]): string[] {
    return problems
        .filter((problem) => problem.code === "W_MEMBER_LEFT_OUT")
        .map((problem) => `${String(problem.params.kind)} ${String(problem.params.pointer)}`);
}

/** Set ids in the version 2 grammar (`set_` and a ULID). */
const FIXED = `set_${"0".repeat(25)}1`;
const PATH = `set_${"0".repeat(25)}2`;
const BARE = `set_${"0".repeat(25)}3`;

describe("version 1 sets, migrated to the view", () => {
    it("writes fixed and path sets' edges as references, drops what binds nothing, and keeps directed", async () => {
        const file = await v1File();
        member(file, "graphty-session").sets = [
            {
                id: FIXED,
                definition: {
                    kind: "fixed",
                    nodes: ["a", "b", { id: "a" }],
                    edges: [{ source: "a", target: "b", ordinal: 0 }, { source: "a", target: "c" }, "a-b"],
                    reading: "listed",
                },
            },
            {
                id: PATH,
                name: "Route",
                definition: {
                    kind: "path",
                    nodes: ["a", "b", "c"],
                    edges: [
                        [
                            { source: "a", target: "b" },
                            { source: "c", target: "a" },
                        ],
                        null,
                        { source: "b", target: "c" },
                        { source: "c", target: "a" },
                    ],
                    directed: true,
                },
            },
            { id: BARE, name: "Bare" },
        ];
        const { sections } = migrated(file);
        const sets = sections.view.sets as JsonObject[];
        // Ids the version 2 grammar accepts are kept.
        assert.deepStrictEqual(
            sets.map((set) => [set.id, set.name]),
            [
                [FIXED, ""],
                [PATH, "Route"],
                [BARE, "Bare"],
            ],
        );

        const fixed = sets[0].definition as JsonObject;
        assert.strictEqual(fixed.kind, "fixed");
        assert.strictEqual(fixed.reading, "listed");
        // A node id that is no id, the edges the data does not hold and what is no member go.
        assert.lengthOf(fixed.nodes as unknown[], 2);
        assert.lengthOf(fixed.edges as unknown[], 1);

        const path = sets[1].definition as JsonObject;
        assert.strictEqual(path.kind, "path");
        assert.strictEqual(path.directed, true);
        assert.lengthOf(path.nodes as unknown[], 3);
        const [parallel, gap, step, missing] = path.edges as unknown[];
        // A step of parallel edges keeps the ones the data holds; a gap stays a gap, as does a
        // step whose edge the data does not hold.
        assert.lengthOf(parallel as unknown[], 1);
        assert.isNull(gap);
        assert.isObject(step);
        assert.isNull(missing);

        // A set with no definition reads as a rule set, read induced.
        assert.deepStrictEqual(
            { kind: (sets[2].definition as JsonObject).kind, reading: (sets[2].definition as JsonObject).reading },
            { kind: "rule", reading: "induced" },
        );
    });

    it("mints a set id the version 2 grammar accepts for one it does not", async () => {
        const file = await v1File();
        member(file, "graphty-session").sets = [
            { id: "my set!", name: "Odd", definition: { kind: "fixed", nodes: ["a"], reading: "induced" } },
        ];
        const { sections } = migrated(file);
        const [set] = sections.view.sets as JsonObject[];
        assert.match(String(set.id), /^set_[0-9A-HJKMNP-TV-Z]{26}$/);
        assert.notStrictEqual(set.id, "my set!");
        assert.strictEqual(set.name, "Odd");
    });
});

describe("version 1 runs, migrated", () => {
    it("names runs by their namespace, keeps name, params and seed, and marks narrowed runs unreplayable", async () => {
        const file = await v1File();
        const results = member(file, "graphty-results");
        results.runs = [
            {
                id: "lab__deg",
                derived: false,
                algorithm: "degree",
                name: "Degree",
                params: { mode: "in" },
                seed: 7,
                durationMs: 12,
                graph: { nodes: 3, edges: 2 },
                caveats: { filterScope: true },
            },
            { id: "made", derived: true, algorithm: "degree", scope: "selection", caveats: { seed: 3 } },
            { id: "Bad Name!", derived: false, algorithm: "degree", params: {}, durationMs: -1, scope: { set: BARE } },
        ];
        const { sections, problems } = migrated(file);
        const runs = sections.view.runs as JsonObject[];
        assert.deepStrictEqual(
            runs.map((run) => [run.namespace, run.id]),
            [
                ["lab", "lab__deg"],
                ["session", "session__made"],
                ["reader", `reader__${String(runs[2].as)}`],
            ],
        );
        assert.notStrictEqual(runs[2].as, "Bad Name!");

        const [first, second, third] = runs;
        assert.strictEqual(first.name, "Degree");
        assert.deepStrictEqual(first.params, { mode: "in" });
        assert.strictEqual(first.seed, 7);
        assert.isDefined(first.engine);
        assert.strictEqual(first.replayable, false);
        assert.strictEqual(first.scope, "graph");

        // A run over the selection has no version 2 scope: the whole graph, unreplayable, reported.
        assert.strictEqual(second.scope, "graph");
        assert.strictEqual(second.replayable, false);
        assert.strictEqual(second.seed, 3);
        assert.include(leftOut(problems), "graphty-results /runs/1/scope");

        // No params, no seed: neither written; a scope over a set is kept.
        assert.notProperty(third, "params");
        assert.notProperty(third, "seed");
        assert.notProperty(third, "replayable");
        assert.deepStrictEqual(third.scope, { set: BARE });

        const entries = sections.results.runs as Record<string, JsonObject>;
        assert.strictEqual(entries.lab__deg.durationMs, 12);
        assert.deepStrictEqual(entries.lab__deg.graph, { nodes: 3, edges: 2 });
        assert.isNull(entries.lab__deg.seed);
        assert.strictEqual(entries.session__made.seed, 3);
        const thirdEntry = entries[String(third.id)];
        assert.notProperty(thirdEntry, "durationMs");
        assert.notProperty(thirdEntry, "graph");
    });
});

describe("version 1 notes, migrated", () => {
    it("binds node, edge, result and item targets and cites, and keeps what cannot bind as version-1", async () => {
        const file = await v1File();
        member(file, "graphty-notes").notes = [
            {
                id: "note_1",
                text: "targets",
                targets: [
                    { node: "a" },
                    { node: null },
                    { edge: { source: "a", target: "b" } },
                    { edge: { source: "a", target: "c" } },
                    { result: "links" },
                    { item: { run: "links", key: { node: "a" } } },
                    { item: { result: "links", key: { node: "b" } } },
                    { set: "set_core" },
                ],
                cites: [{ run: "links" }, { result: "lab__x" }],
            },
        ];
        const { sections } = migrated(file);
        const [note] = sections.notes.notes as JsonObject[];
        const targets = note.targets as JsonObject[];
        assert.deepStrictEqual(
            targets.map((target) => Object.keys(target)[0]),
            ["node", "version-1", "edge", "version-1", "result", "item", "item", "set"],
        );
        assert.deepStrictEqual(targets[1], { "version-1": { node: null } });
        assert.deepStrictEqual(targets[3], { "version-1": { edge: { source: "a", target: "c" } } });
        assert.strictEqual(targets[4].result, "reader__links");
        assert.deepStrictEqual(targets[5].item, { result: "reader__links", key: { node: "a" } });
        assert.deepStrictEqual(targets[6].item, { result: "reader__links", key: { node: "b" } });
        assert.deepStrictEqual(note.cites, [{ result: "reader__links" }, { result: "lab__x" }]);
    });
});

describe("a version 1 session member's view, migrated", () => {
    it("reads visibility, selection, hidden columns, views, rotation, framing and a 2d layout", async () => {
        const file = await v1File();
        const session = member(file, "graphty-session");
        session.visibility = {
            filter: { kind: "edges", where: "weight > `2`" },
            steps: [{ rule: { kind: "isolated" } }],
            showContext: true,
            // A node the data does not hold keeps its reference (spec 6.3); a value that is no id goes.
            hidden: ["c", "zz", { id: "c" }],
            conditions: { list: [{ id: "c1", rule: { kind: "neighborhood", seeds: ["a"], depth: 1 } }] },
            window: { attribute: "when", from: 1, to: 2, raw: { from: "x" } },
        };
        session.columns = { hidden: ["node:dept", "edge:weight", "dept", "graph:x", 5] };
        session.views = [
            { name: "Front", camera: { position: { x: 0, y: 0, z: 10 }, target: { x: 0, y: 0, z: 0 } } },
            { camera: { position: { x: 1, y: 0, z: 10 }, target: { x: 0, y: 0, z: 0 } } },
            { name: "No camera" },
        ];
        session.layout = { id: "circular", dimension: "2d" };
        (session.config as JsonObject).viewRotation = { x: 0, y: 1 };
        (session.config as JsonObject).framing = { padding: 2 };
        (session.config as JsonObject).madeUp = { deep: 1 };
        member(file, "graphty-view-state").selection = { nodes: ["a"], edges: [1, 9, "x"] };
        const { sections, problems } = migrated(file);
        const { view } = sections;
        const visibility = view.visibility as JsonObject;
        assert.deepStrictEqual(visibility.filter, { on: "edges", where: "data.weight > `2`" });
        assert.strictEqual(visibility.showContext, true);
        assert.lengthOf(visibility.hidden as unknown[], 2);
        assert.lengthOf(visibility.conditions as unknown[], 1);
        assert.deepStrictEqual(visibility.window, { attribute: "data.when", from: 1, to: 2 });
        assert.include(leftOut(problems), "graphty-session /visibility/steps");

        const selection = view.selection as JsonObject;
        assert.lengthOf(selection.nodes as unknown[], 1);
        assert.lengthOf(selection.edges as unknown[], 1);

        assert.deepStrictEqual(view.hiddenColumns, [
            { kind: "node", name: "dept" },
            { kind: "edge", name: "weight" },
        ]);
        assert.deepStrictEqual(
            (view.views as JsonObject[]).map((each) => each.name),
            ["Front", ""],
        );
        assert.deepStrictEqual(view.viewRotation, { x: 0, y: 1 });
        assert.deepStrictEqual(view.framing, { padding: 2 });
        const layout = view.layout as JsonObject;
        assert.strictEqual(layout.id, "circular");
        assert.strictEqual(layout.dimension, 2);
        assert.notProperty(layout, "drawnBy");
        assert.include(leftOut(problems), "graphty-session /config/madeUp/deep");
    });

    it("reads a filter that is a rule tree as its bound rule, and no filter as null", async () => {
        const file = await v1File();
        member(file, "graphty-session").visibility = {
            filter: {
                kind: "any",
                of: [
                    { kind: "member", of: { nodes: ["a"] } },
                    { kind: "not", of: { kind: "isolated" } },
                ],
            },
        };
        const filtered = migrated(file).sections.view.visibility as JsonObject;
        const filter = filtered.filter as JsonObject;
        assert.strictEqual(filter.kind, "any");
        const [memberLeaf, notLeaf] = filter.of as JsonObject[];
        assert.lengthOf((memberLeaf.of as JsonObject).nodes as unknown[], 1);
        assert.deepStrictEqual(notLeaf, { kind: "not", of: { kind: "isolated" } });

        member(file, "graphty-session").visibility = { filter: "nothing" };
        assert.isNull((migrated(file).sections.view.visibility as JsonObject).filter);
    });

    it("puts collapsed groups and the edges added to them in the view, reporting an edge that stands for none", async () => {
        const file = await v1File();
        member(file, "graphty-session").groups = {
            version: 1,
            collapsed: [
                { groupBy: "data.dept", group: 1, position: { x: 1, y: 2, z: 3 }, pinned: true },
                { groupBy: "data.dept", group: 2 },
                { groupBy: 5, group: 1 },
                { groupBy: "data.dept", group: { not: "plain" } },
            ],
            added: [
                { source: "group:data.dept=1", target: "b", weight: 4 },
                { source: "a", target: "c" },
                { source: "group:data.dept=2", target: { id: "b" } },
            ],
        };
        const { sections, problems } = migrated(file);
        const groups = sections.view.groups as JsonObject[];
        assert.lengthOf(groups, 2);
        assert.deepStrictEqual(groups[0].position, { x: 1, y: 2, z: 3 });
        assert.strictEqual(groups[0].pinned, true);
        const [edge] = groups[0].edges as JsonObject[];
        assert.deepStrictEqual(edge.from, { groupBy: "data.dept", group: 1 });
        assert.notProperty(groups[1], "edges");
        assert.notProperty(groups[1], "pinned");
        assert.includeMembers(leftOut(problems), [
            "graphty-session /groups/added/1",
            "graphty-session /groups/added/2",
        ]);
    });

    it("places no node when the arrangement's columns do not decode", async () => {
        const file = await v1File();
        Object.assign(member(file, "graphty-arrangement"), { ids: ["a", "zz"], x: "no", y: [], z: [], pins: ["a"] });
        const { sections } = migrated(file);
        assert.notProperty(sections.view, "pinned");
    });
});

describe("version 1 layers and value labels, migrated", () => {
    it("names a layer with no id by its place and keeps run and data value labels", async () => {
        const file = await v1File();
        member(file, "graphty-style").layers = [
            { target: "node", selector: { match: "everything" }, set: { "node.size": 2 } },
            { id: "", name: 5, target: "node", selector: { match: "everything" }, set: { "node.size": 3 } },
        ];
        member(file, "graphty-session").valueLabels = [
            { path: "data.dept", value: 1, label: "Research" },
            { path: "store.graphty.links.value", value: 2, label: "Two" },
            { path: "graphty.x", value: 1, label: "Other" },
            { path: "data.dept", value: { no: 1 }, label: "Bad" },
        ];
        const { sections, problems } = migrated(file);
        const layers = sections.style.layers as JsonObject[];
        assert.deepStrictEqual(
            layers.map((layer) => [layer.id, layer.name]),
            [
                ["layer-1", ""],
                ["layer-2", ""],
            ],
        );
        assert.deepStrictEqual(sections.style.valueLabels, [
            { path: "data.dept", value: 1, label: "Research" },
            { path: "store.graphty.links.value", value: 2, label: "Two" },
        ]);
        assert.includeMembers(leftOut(problems), ["graphty-session /valueLabels/2", "graphty-session /valueLabels/3"]);
    });

    it("carries the style's shaders and the assets beside it, and drops what lacks an id", async () => {
        const file = await v1File();
        Object.assign(member(file, "graphty-style"), {
            shaders: [
                { id: "glow", text: "void main() {}" },
                { id: 3, text: "x" },
            ],
            styleVersion: 4,
            name: "Look",
        });
        file.members.push({
            kind: "graphty-assets",
            version: 1,
            assets: [{ id: "asset_1", sha256: "ab".repeat(32), name: "a.glb" }, { id: "asset_2" }],
        });
        const { sections, problems } = migrated(file);
        assert.deepStrictEqual(sections.style.shaders, [{ id: "glow", text: "void main() {}" }]);
        assert.deepStrictEqual(
            (sections.style.assets as JsonObject[]).map((asset) => asset.id),
            ["asset_1"],
        );
        assert.strictEqual(sections.style.name, "Look");
        assert.include(leftOut(problems), "graphty-style /styleVersion");
    });
});

describe("the members of a version 1 file", () => {
    it("reports an extension's member, a second member of a kind and assets with no style", async () => {
        const file = await v1File();
        file.members = file.members.filter((each) => each.kind !== "graphty-style");
        file.members.push(
            { kind: "acme-extra", version: 1 },
            { kind: "graphty-notes", version: 1, notes: [] },
            { kind: "graphty-assets", version: 1, assets: [] },
            "not a member" as unknown as JsonObject,
        );
        file.extensions = { acme: { keep: true } };
        file.name = "Saved";
        const count = file.members.length;
        const { v2, problems } = migrated(file);
        assert.includeMembers(leftOut(problems), [
            `acme-extra /members/${String(count - 4)}`,
            `graphty-notes /members/${String(count - 3)}`,
            "graphty-assets ",
        ]);
        assert.deepStrictEqual(v2.extensions, { acme: { keep: true } });
        assert.strictEqual(v2.name, "Saved");
    });

    it("reads the kind-less style graphty-element 2.x wrote, with this element as its generator", () => {
        const { v2, sections } = migrated({
            version: 1,
            layers: [{ id: "big", target: "node", selector: { match: "everything" }, set: { "node.size": 2 } }],
        });
        assert.deepStrictEqual(Object.keys(sections), ["style"]);
        assert.strictEqual((v2.generator as JsonObject).name, "graphty-element");
        assert.deepStrictEqual(
            (sections.style.layers as JsonObject[]).map((layer) => layer.id),
            ["big"],
        );
    });

    it("leaves a file that is no version 1 document to be read as before", () => {
        assert.isUndefined(migrateDocument1({ kind: "graphty-document", version: 3, members: [] }, []));
        assert.isUndefined(migrateDocument1({ kind: "something-else", version: 1 }, []));
        // A recipe snapshot holds no commands and makes no section.
        assert.isUndefined(migrateDocument1({ kind: "graphty-recipe", version: 1, name: "Snapshot" }, []));
    });

    it("reads a bare recipe document: algo.run writes its style, layout.set names its arrangement", () => {
        const problems: DocumentProblem[] = [];
        const v2 = migrateDocument1(
            {
                kind: "graphty-recipe",
                version: 1,
                recipeVersion: 2,
                name: "Steps",
                namespace: "lab",
                commands: [
                    { op: "algo.run", algorithm: "degree" },
                    { op: "algo.run", algorithm: "degree", style: false },
                    { op: "layout.set", id: "ngraph", dimension: "2d", description: "spring" },
                    { op: "layout.set", id: "circular", options: { scale: 2 }, dimension: 3 },
                    { op: "layout.set", dimension: 2 },
                    { op: "styles.clear" },
                ],
                styles: {
                    version: 1,
                    layers: [{ id: "big", target: "node", selector: { match: "everything" }, set: { "node.size": 2 } }],
                },
            },
            problems,
        );
        assert.isDefined(v2);
        const { recipe, style } = v2.sections as Record<string, JsonObject>;
        assert.strictEqual(recipe.namespace, "lab");
        assert.strictEqual(recipe.name, "Steps");
        const commands = recipe.commands as JsonObject[];
        assert.strictEqual(commands[0].style, true);
        assert.strictEqual(commands[1].style, false);
        assert.deepStrictEqual(commands[2], {
            op: "layout.set",
            description: "spring",
            id: "force",
            drawnBy: { engine: "ngraph" },
            dimension: 2,
        });
        assert.deepStrictEqual(commands[3], { op: "layout.set", id: "circular", options: { scale: 2 }, dimension: 3 });
        assert.deepStrictEqual(commands[4], { op: "layout.set", id: "", dimension: 2 });
        assert.deepStrictEqual(commands[5], { op: "styles.clear" });
        // The recipe's own styles become the style section when the file holds no style member.
        assert.deepStrictEqual(
            (style.layers as JsonObject[]).map((layer) => layer.id),
            ["big"],
        );
        assert.include(leftOut(problems), "graphty-recipe /recipeVersion");
    });
});
