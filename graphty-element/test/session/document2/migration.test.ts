/**
 * @file The version 1 migration (spec 9.1), behind the `save-files-v2` experiment: version 1
 * files graphty-element writes today (saved with format 1, from the sessions the project-file tests
 * build) become version 2 full files that validate against the schemas, with every positional edge
 * reference an element reference, base64 columns plain numbers, and each member in its section.
 */

import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it } from "vitest";

import type { GraphSession } from "../../../session";
import type { RunId } from "../../../src/catalog/types";
import { migrateDocument1, migrateSection } from "../../../src/session/document2/migration";
import type { DocumentProblem, JsonObject } from "../../../src/session/document2/types";
import { baseSession, sessionWithRuns } from "../../helpers/project-session";

const SPEC = new URL("../../../spec/", import.meta.url);
const readJson = (path: string): JsonObject => JSON.parse(readFileSync(new URL(path, SPEC), "utf8")) as JsonObject;

const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
addFormats(ajv);
for (const file of [
    "common/v2.json",
    ...["data", "style", "recipe", "results", "notes", "document"].map((kind) => `graphty-${kind}/v2.json`),
    "graphty-settings/v1.json",
    "graphty-view/v1.json",
]) {
    ajv.addSchema(readJson(`schemas/${file}`));
}

/**
 * The schema errors of a document, against the schema its kind and version name.
 * @param document - The document.
 * @returns The errors, empty when it validates.
 */
function invalid(document: JsonObject): string[] {
    const validate = ajv.getSchema(
        `https://graphty.app/schema/documents/${String(document.kind)}/v${String(document.version)}.json`,
    );
    assert.isDefined(validate);
    return validate(document)
        ? []
        : (validate.errors ?? []).map((error) => `${error.instancePath} ${String(error.message)}`);
}

const GML = `graph [
  node [ id 1 label "a" ]
  node [ id 2 label "b" ]
  node [ id 3 label "c" ]
  edge [ source 1 target 2 ]
  edge [ source 2 target 3 ]
  edge [ source 2 target 3 ]
]`;

/**
 * A session holding one of each thing a version 1 file saves.
 * @returns The session.
 */
async function busySession(): Promise<GraphSession> {
    const session = await baseSession();
    await session.runs.start("degree", undefined, { as: "links", style: false });
    await session.styles.encode({ run: "links" as RunId, channel: "node.color" });
    await session.styles.add({
        name: "Dept 1",
        target: "node",
        selector: { match: "expression", where: "data.dept == `1`" },
        set: { "node.color": "#ff9900" },
    });
    await session.styles.add({
        name: "Picked",
        target: "node",
        selector: { match: "ids", nodes: ["a"] },
        set: { "node.size": 3 },
    });
    const edges = session.data.edges();
    session.sets.create({ kind: "fixed", nodes: ["a", "b"], reading: "induced" }, { name: "Core" });
    session.sets.create({ kind: "rule", where: "data.dept == `1`", reading: "induced" }, { name: "Dept one" });
    session.sets.create(
        { kind: "rule", where: { kind: "neighborhood", seeds: ["b"], depth: 1 }, reading: "induced" },
        { name: "Around b" },
    );
    session.notes.add({ text: "b is the hub", targets: [{ node: "b" }] });
    session.notes.add({ text: "the second link", targets: [{ edge: edges[1].id }] });
    await session.views.save([
        { name: "Overview", camera: { position: { x: 0, y: 0, z: 10 }, target: { x: 0, y: 0, z: 0 } } },
    ]);
    await session.positions.set([{ id: "a", x: 1, y: 2, z: 3 }]);
    await session.positions.pin(["a"]);
    await session.selection.apply({ nodes: ["c"], edges: [edges[1].id] });
    await session.visibility.set({ kind: "degree", min: 1 });
    await session.data.declare({ kind: "node", name: "dept" }, { measurement: "categorical" });
    await session.data.setValueLabel("data.dept", 1, "Research");
    return session;
}

/**
 * A version 1 file of a session, saved with format 1, migrated.
 * @param session - The session.
 * @returns The version 1 file, the version 2 file and what the migration reported.
 */
async function migrated(
    session: GraphSession,
): Promise<{ v1: JsonObject; v2: JsonObject; sections: Record<string, JsonObject>; problems: DocumentProblem[] }> {
    const v1 = JSON.parse((await session.project.save({ format: 1 })).text) as JsonObject;
    const problems: DocumentProblem[] = [];
    const v2 = migrateDocument1(v1, problems);
    assert.isDefined(v2);
    return { v1, v2, sections: v2.sections as Record<string, JsonObject>, problems };
}

/**
 * Whether a value is an edge reference (spec 6.2).
 * @param value - The value.
 * @returns True for `{ from, to, key }` or `{ from, to, h, n }`.
 */
function isEdgeRef(value: unknown): boolean {
    const ref = value as { from?: unknown; to?: unknown; key?: unknown; h?: unknown; n?: unknown };
    const end = (node: unknown): boolean =>
        typeof (node as { space?: unknown } | undefined)?.space === "string" &&
        typeof (node as { key?: unknown }).key === "string";
    return (
        end(ref.from) &&
        end(ref.to) &&
        (typeof ref.key === "string" ||
            (typeof ref.h === "string" && /^sha256:[0-9a-f]{64}$/.test(ref.h) && ref.n === 0))
    );
}

describe("a version 1 project file, migrated", () => {
    it("is a version 2 full file every section of which validates, each reported as upgraded", async () => {
        const session = await busySession();
        const { v2, sections, problems } = await migrated(session);
        assert.deepStrictEqual(invalid(v2), []);
        assert.deepStrictEqual(Object.keys(sections), [
            "data",
            "style",
            "recipe",
            "settings",
            "results",
            "notes",
            "view",
        ]);
        for (const section of Object.values(sections)) {
            assert.deepStrictEqual(invalid(section), [], String(section.kind));
        }

        assert.deepStrictEqual(
            problems.map((problem) => [problem.code, problem.params.section, problem.params.from, problem.params.to]),
            [
                ["W_SECTION_UPGRADED", "data", 1, 2],
                ["W_SECTION_UPGRADED", "style", 1, 2],
                ["W_SECTION_UPGRADED", "recipe", 1, 2],
                ["W_SECTION_UPGRADED", "settings", 1, 1],
                ["W_SECTION_UPGRADED", "results", 1, 2],
                ["W_SECTION_UPGRADED", "notes", 1, 2],
                ["W_SECTION_UPGRADED", "view", 1, 1],
            ],
        );
        session.dispose();
    });

    it("turns every positional edge reference into an element reference", async () => {
        const session = await busySession();
        const { sections } = await migrated(session);
        const { view, results, notes, data } = sections;
        const graph = data.graph as { nodes: JsonObject[]; links: JsonObject[] };
        const keyOf = new Map(graph.nodes.map((node) => [node.id, node["graphty.key"]]));
        const pairs = graph.links.map((link) => `${String(keyOf.get(link.source))}>${String(keyOf.get(link.target))}`);

        // The selection named the edge at position 1 of `links`: b to c.
        const selected = (view.selection as { edges: { from: { key: string }; to: { key: string } }[] }).edges;
        assert.lengthOf(selected, 1);
        assert.isTrue(isEdgeRef(selected[0]));
        assert.deepStrictEqual([selected[0].from.key, selected[0].to.key], ["b", "c"]);

        // Each run's edge values, by position in version 1, are now by reference, each an edge the data holds.
        const run = (
            results.runs as Record<string, { edges: { refs: { from: { key: string }; to: { key: string } }[] } }>
        ).reader__links;
        assert.lengthOf(run.edges.refs, 2);
        for (const ref of run.edges.refs) {
            assert.isTrue(isEdgeRef(ref));
            assert.include(pairs, `${ref.from.key}>${ref.to.key}`);
        }

        // A note on an edge, by its ends, names it by reference too.
        const targets = (notes.notes as { targets: JsonObject[] }[]).flatMap((note) => note.targets);
        const edge = targets.find((target) => target.edge !== undefined);
        assert.isTrue(isEdgeRef(edge?.edge));
        assert.deepInclude(targets, {
            node: { space: (selected[0].from as unknown as { space: string }).space, key: "b" },
        });
        session.dispose();
    });

    it("puts each member in its section: the data, the look, the analysis, the settings and the view", async () => {
        const session = await busySession();
        const { sections } = await migrated(session);
        const { data, style, recipe, settings, results, view } = sections;
        const source = (data.sources as JsonObject[])[0];
        const space = `source:${String(source.id)}`;
        assert.strictEqual(source.kind, "derived");
        assert.deepStrictEqual(data.joins, [{ op: "join.add", source: source.id }]);
        assert.deepStrictEqual((source.mapping as { nodes: JsonObject }).nodes, { key: "id", space });

        // The style keeps the layers that name no element; the one picking node a moves to view.
        assert.deepStrictEqual(
            (style.layers as JsonObject[]).map((layer) => layer.name),
            ["Connections", "Dept 1"],
        );
        assert.deepStrictEqual(style.valueLabels, [{ column: "dept", value: "1", label: "Research" }]);
        const picked = (view.layers as JsonObject[])[0];
        assert.deepStrictEqual(picked.selector, { match: "ids", nodes: [{ space, key: "a" }] });
        assert.strictEqual(picked.after, (style.layers as JsonObject[])[1].id);

        // The recipe holds the run, the rule set naming no element and the layout; the view, the others.
        const ops = (recipe.commands as JsonObject[]).map((command) => command.op);
        assert.deepStrictEqual(ops, ["set.define", "algo.run", "layout.set"]);
        assert.strictEqual(recipe.namespace, "reader");
        assert.deepStrictEqual(
            (view.sets as JsonObject[]).map((set) => [set.name, set.kind]),
            [
                ["Core", "fixed"],
                ["Around b", "rule"],
            ],
        );
        assert.strictEqual(settings.settings && (settings.settings as JsonObject)["layoutBehavior.preSteps"], 0);

        // Base64 columns are plain numbers.
        assert.deepStrictEqual(view.placed, [{ node: { space, key: "a" }, position: [1, 2, 3], pinned: true }]);
        const run = (results.runs as Record<string, { nodes: { columns: { value: unknown[] } } }>).reader__links;
        assert.deepStrictEqual(run.nodes.columns.value, [1, 2, 1]);
        assert.deepStrictEqual(view.visibility, { filter: { kind: "degree", min: 1 }, showContext: false });
        session.dispose();
    });

    it("keys a file's loads, keeps their records, and hashes its rows", async () => {
        const session = sessionWithRuns();
        await session.data.import({ type: "gml", config: { data: GML } });
        const { v1, sections } = await migrated(session);
        assert.deepStrictEqual(invalid(sections.data), []);
        const source = (sections.data.sources as JsonObject[])[0];
        const metadata = source.metadata as { "version-1": { loads: JsonObject } };
        const v1Sources = (v1.members as JsonObject[]).find((member) => member.kind === "graphty-sources");
        assert.deepStrictEqual(metadata["version-1"].loads, v1Sources);
        assert.match(String((source.origin as JsonObject).hash), /^sha256:[0-9a-f]{64}$/);

        // Two parallel b-c edges: one hash, told apart by n. The graph is undirected and a multigraph.
        const graph = sections.data.graph as JsonObject;
        assert.isFalse(graph.directed);
        assert.isTrue(graph.multigraph);
        assert.deepStrictEqual(
            (graph.nodes as JsonObject[]).map((node) => node["graphty.key"]),
            ["1", "2", "3"],
        );
        session.dispose();
    });

    it("writes the same file every time, so its hashes and references are stable", async () => {
        const session = await busySession();
        const v1 = JSON.parse((await session.project.save({ format: 1 })).text) as JsonObject;
        const once = JSON.stringify(migrateDocument1(v1, []));
        assert.strictEqual(JSON.stringify(migrateDocument1(structuredClone(v1), [])), once);
        session.dispose();
    });
});

describe("a version 1 document of one kind, migrated", () => {
    it("migrates the kind-less style graphty-element 2.x wrote, leaving out and reporting a layer naming elements", async () => {
        const session = await busySession();
        const { problems: _ignored, ...style } = session.styles.toDocument() as unknown as JsonObject;
        assert.isUndefined(style.kind);
        const problems: DocumentProblem[] = [];
        const v2 = migrateDocument1(style, problems);
        assert.isDefined(v2);
        assert.deepStrictEqual(invalid(v2), []);
        const section = (v2.sections as Record<string, JsonObject>).style;
        assert.lengthOf(section.layers as unknown[], 2);
        assert.deepInclude(problems, {
            code: "W_ELEMENT_NAMING_LEFT_OUT",
            params: { section: "style", pointer: "/layers/2" },
        });

        // The same style met as a version 1 section inside a version 2 file is upgraded to the same bytes.
        const upgraded = migrateSection("style", { kind: "graphty-style", ...style }, []);
        assert.strictEqual(JSON.stringify(upgraded), JSON.stringify(section));
        session.dispose();
    });

    it("turns a style's id and styleVersion into the header's id and revision", () => {
        const v2 = migrateDocument1(
            {
                kind: "graphty-style",
                version: 1,
                id: "org.example.look",
                styleVersion: "1.2.0",
                name: "A look",
                layers: [{ name: "All", selector: { match: "everything" }, set: { "node.color": "#123456" } }],
            },
            [],
        );
        const { style } = v2?.sections as Record<string, JsonObject>;
        assert.deepStrictEqual(invalid(style), []);
        assert.deepInclude(style, { id: "org.example.look", revision: "1.2.0", name: "A look" });
    });

    it("turns a version 1 recipe's id and recipeVersion into id and revision, and writes every run's style", () => {
        const v2 = migrateDocument1(
            {
                kind: "graphty-recipe",
                version: 1,
                id: "org.example.hubs",
                recipeVersion: "2.0.0",
                commands: [
                    { op: "algo.run", algorithm: "degree", as: "hubs" },
                    { op: "layout.set", id: "force" },
                ],
            },
            [],
        );
        const { recipe } = v2?.sections as Record<string, JsonObject>;
        assert.deepStrictEqual(invalid(recipe), []);
        assert.deepInclude(recipe, { id: "org.example.hubs", revision: "2.0.0" });
        assert.deepStrictEqual((recipe.commands as JsonObject[])[0].style, true);
    });

    it("leaves alone what it does not migrate: a data file, an unknown kind, a version 2 file, notes with no data", () => {
        assert.isUndefined(migrateDocument1({ nodes: [], links: [] }, []));
        assert.isUndefined(migrateDocument1({ kind: "com.example.thing", version: 1 }, []));
        assert.isUndefined(migrateDocument1({ kind: "graphty-document", version: 2, sections: {} }, []));
        assert.isUndefined(migrateDocument1({ kind: "graphty-notes", version: 1, notes: [] }, []));
        assert.isUndefined(migrateSection("notes", { kind: "graphty-notes", version: 1, notes: [] }, []));
        assert.isUndefined(migrateSection("style", { kind: "graphty-style", version: 2, layers: [] }, []));
    });
});
