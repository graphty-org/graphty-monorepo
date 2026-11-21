/**
 * @file The version 1 migration (spec 9.1), behind the `save-files-v2` experiment: version 1
 * files graphty-element writes today (saved with format 1, from the sessions the project-file tests
 * build) become version 2 full files that validate against the schemas, with every positional edge
 * reference an element reference, base64 columns plain numbers, and each member in its section.
 */

import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import type { RunId } from "../../../src/catalog/types";
import { migrateDocument1, migrateSection } from "../../../src/session/document2/migration";
import type { DocumentProblem, JsonObject } from "../../../src/session/document2/types";
import { baseSession, sessionWithRuns } from "../../helpers/project-session";

const SPEC = new URL("../../../spec/", import.meta.url);
const readJson = (path: string): JsonObject => JSON.parse(readFileSync(new URL(path, SPEC), "utf8")) as JsonObject;
const ON = { features: ["save-files-v2"] };

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
    // A filter that hides nothing selected: hiding an element deselects it.
    await session.visibility.set({ kind: "expression", where: "data.dept >= `1`" });
    await session.data.declare({ kind: "node", name: "dept" }, { measurement: "categorical" });
    await session.data.setValueLabel("data.dept", 1, "Research");
    return session;
}

/**
 * Give a version 1 file's runs their results as columns, as a build from before runs were saved
 * as commands wrote them (today's builds save the command only and compute the run again on open),
 * so the migration of such a file is covered.
 * @param v1 - The version 1 file.
 * @param session - The session that saved it.
 */
function withSavedResults(v1: JsonObject, session: GraphSession): void {
    const results = (v1.members as JsonObject[]).find((member) => member.kind === "graphty-results");
    const columnsOf = (rows: (Readonly<Record<string, unknown>> | undefined)[]): JsonObject => {
        const fields = new Set(rows.flatMap((row) => (row === undefined ? [] : Object.keys(row))));
        return Object.fromEntries([...fields].map((field) => [field, rows.map((row) => row?.[field] ?? null)]));
    };
    for (const run of (results?.runs ?? []) as JsonObject[]) {
        const result = session.results.get(String(run.id));
        assert.isDefined(result);
        const nodes = session.data.nodes().filter((node) => result.node(node.id) !== undefined);
        run.fields = result.fields;
        run.nodes = {
            ids: nodes.map((node) => node.id),
            columns: columnsOf(nodes.map((node) => result.node(node.id))),
        };
        run.edges = { columns: columnsOf(session.data.edges().map((edge) => result.edge(edge.id))) };
    }
}

/**
 * A version 1 file of a session, saved with format 1, migrated.
 * @param session - The session.
 * @param savedResults - Whether the file holds its runs' results, as an older build's did.
 * @returns The version 1 file, the version 2 file and what the migration reported.
 */
async function migrated(
    session: GraphSession,
    savedResults = false,
): Promise<{ v1: JsonObject; v2: JsonObject; sections: Record<string, JsonObject>; problems: DocumentProblem[] }> {
    const v1 = JSON.parse((await session.project.save({ format: 1 })).text) as JsonObject;
    if (savedResults) {
        withSavedResults(v1, session);
    }

    const problems: DocumentProblem[] = [];
    const v2 = migrateDocument1(v1, problems);
    assert.isDefined(v2);
    return { v1, v2, sections: v2.sections as Record<string, JsonObject>, problems };
}

/**
 * Whether a value is an edge reference (spec 6.2): exactly `load` and `key`.
 * @param value - The value.
 * @returns True for `{ load, key }`.
 */
function isEdgeRef(value: unknown): boolean {
    const ref = value as { load?: unknown; key?: unknown };
    return (
        typeof ref === "object" &&
        Object.keys(ref).join(",") === "load,key" &&
        typeof ref.load === "string" &&
        typeof ref.key === "string"
    );
}

const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;

describe("a version 1 project file, migrated", () => {
    it("reads a session layout named by its engine as the arrangement, the engine's own options in drawnBy", async () => {
        const session = await baseSession();
        const v1 = JSON.parse((await session.project.save({ format: 1 })).text) as JsonObject;
        const member = (v1.members as JsonObject[]).find((each) => each.kind === "graphty-session");
        assert.isDefined(member);
        member.layout = { id: "ngraph", options: { seed: 3, springLength: 20 }, dimension: "3d" };
        const v2 = migrateDocument1(v1, []);
        const { view } = v2?.sections as Record<string, JsonObject>;
        assert.deepStrictEqual(invalid(view), []);
        const { engine, ...layout } = view.layout as JsonObject;
        // Only the release that saved the file is known: no other package, no accelerator.
        const { version } = v1.generator as { version: string };
        assert.deepStrictEqual(engine, { packages: { "@graphty/graphty-element": version } });
        assert.deepStrictEqual(layout, {
            id: "force",
            options: { seed: 3 },
            drawnBy: { engine: "ngraph", options: { springLength: 20 } },
            dimension: 3,
        });
        session.dispose();
    });

    it("is a version 2 full file every section of which validates, each reported as upgraded", async () => {
        const session = await busySession();
        const { v2, sections, problems } = await migrated(session);
        assert.deepStrictEqual(invalid(v2), []);
        assert.deepStrictEqual(Object.keys(sections), ["data", "style", "settings", "results", "notes", "view"]);
        for (const section of Object.values(sections)) {
            assert.deepStrictEqual(invalid(section), [], String(section.kind));
        }

        assert.deepStrictEqual(
            problems
                .filter((problem) => problem.code === "W_SECTION_UPGRADED")
                .map((problem) => [problem.params.section, problem.params.from, problem.params.to]),
            [
                ["data", 1, 2],
                ["style", 1, 2],
                ["settings", 1, 1],
                ["results", 1, 2],
                ["notes", 1, 2],
                ["view", 1, 1],
            ],
        );
        session.dispose();
    });

    it("turns every positional edge reference into an element reference", async () => {
        const session = await busySession();
        const { sections } = await migrated(session, true);
        const { view, results, notes, data } = sections;
        const graph = data.graph as { nodes: JsonObject[]; links: JsonObject[] };
        const keyOf = new Map(graph.nodes.map((node) => [node.id, node["graphty.key"]]));
        const ends = new Map(
            graph.links.map((link) => [
                `${String(link["graphty.load"])} ${String(link["graphty.key"])}`,
                `${String(keyOf.get(link.source))}>${String(keyOf.get(link.target))}`,
            ]),
        );
        const endsOf = (ref: unknown): string | undefined => {
            const { load, key } = ref as { load: string; key: string };
            return ends.get(`${load} ${key}`);
        };

        // The selection named the edge at position 1 of `links`: b to c.
        const selected = (view.selection as { edges: unknown[] }).edges;
        assert.lengthOf(selected, 1);
        assert.isTrue(isEdgeRef(selected[0]));
        assert.strictEqual(endsOf(selected[0]), "b>c");
        // A link with no id is keyed by its ends, numbered over the links between them in order.
        assert.strictEqual((selected[0] as { key: string }).key, "b|c#1");

        // Each run's edge values, by position in version 1, are now by reference, each an edge the data holds.
        const run = (results.runs as Record<string, { edges: { refs: unknown[] }; bindsTo: JsonObject }>).reader__links;
        assert.lengthOf(run.edges.refs, 2);
        for (const ref of run.edges.refs) {
            assert.isTrue(isEdgeRef(ref));
            assert.isDefined(endsOf(ref));
        }

        // The run records the build it ran on and the copy ids, which equal the data's.
        assert.strictEqual(run.bindsTo.build, data.build);
        const copies = Object.fromEntries(
            (data.sources as JsonObject[]).map((source): [string, unknown] => [
                String(source.id),
                (source.origin as JsonObject).copy,
            ]),
        );
        assert.deepStrictEqual(run.bindsTo.sources, copies);

        // A note on an edge, by its ends, names it by reference too.
        const targets = (notes.notes as { targets: JsonObject[] }[]).flatMap((note) => note.targets);
        const edge = targets.find((target) => target.edge !== undefined);
        assert.isTrue(isEdgeRef(edge?.edge));
        assert.isDefined(endsOf(edge?.edge), "the note's edge is one the data holds");
        session.dispose();
    });

    it("puts each member in its section: the data, the look, the settings and the view", async () => {
        const session = await busySession();
        const { sections } = await migrated(session, true);
        const { data, style, settings, results, view } = sections;
        const [reader, source] = data.sources as JsonObject[];
        const space = `source:${String(source.id)}`;
        assert.match(String(source.id), /^src_[0-9A-HJKMNP-TV-Z]{26}$/);
        assert.strictEqual(source.kind, "derived");
        assert.match(String((source.origin as JsonObject).copy), ULID);
        assert.deepStrictEqual(reader, {
            id: "reader",
            kind: "reader",
            origin: reader.origin,
            copy: { operations: [] },
        });
        assert.deepStrictEqual(data.joins, [{ op: "join.add", source: source.id }]);
        const mapping = source.mapping as { nodes: JsonObject; edges: JsonObject };
        assert.deepStrictEqual(mapping.nodes, { key: "id", space });
        assert.include(mapping.edges, { sourceSpace: space, targetSpace: space });
        assert.match(String(data.build), ULID);

        // The style keeps the layers that name no element; the one picking node a moves to view.
        assert.deepStrictEqual(
            (style.layers as JsonObject[]).map((layer) => layer.name),
            ["Connections", "Dept 1"],
        );
        assert.deepStrictEqual(
            (style.valueLabels as JsonObject[]).map((label) => label.path),
            ["data.dept"],
        );
        const picked = (view.layers as JsonObject[])[0];
        assert.deepStrictEqual(picked.selector, { match: "ids", nodes: [{ space, key: "a" }] });
        assert.notProperty(picked, "after");
        assert.deepStrictEqual(view.order, [...(style.layers as JsonObject[]).map((layer) => layer.id), picked.id]);

        // Every set is in the view, by a set_<ULID> id; every run is a view run record; no recipe.
        assert.deepStrictEqual(
            (view.sets as JsonObject[]).map((set) => [set.name, (set.definition as JsonObject).kind]),
            [
                ["Core", "fixed"],
                ["Dept one", "rule"],
                ["Around b", "rule"],
            ],
        );
        for (const set of view.sets as JsonObject[]) {
            assert.match(String(set.id), /^set_[0-9A-HJKMNP-TV-Z]{26}$/);
        }

        assert.deepStrictEqual(
            (view.runs as JsonObject[]).map((run) => [run.id, run.algorithm, run.scope]),
            [["reader__links", "degree", "graph"]],
        );
        assert.include(view.layout as JsonObject, { dimension: 3 });
        assert.notProperty(view.layout as JsonObject, "algorithm");
        assert.isUndefined(sections.recipe);
        assert.strictEqual((settings.settings as JsonObject).layoutStepsBeforeDraw, 0);
        assert.notProperty(settings.settings as JsonObject, "layoutBehavior.preSteps");

        // Base64 columns are plain numbers; the pinned node is pinned, the rest is the layout's output.
        assert.deepStrictEqual(view.pinned, [{ node: { space, key: "a" }, position: { x: 1, y: 2, z: 3 } }]);
        const run = (results.runs as Record<string, { nodes: { columns: { value: unknown[] } } }>).reader__links;
        assert.deepStrictEqual(run.nodes.columns.value, [1, 2, 1]);
        // The filter in force in graph.filter's form (spec 4.7 rule 4).
        assert.deepStrictEqual(view.visibility, {
            filter: { on: "nodes", where: "data.dept >= `1`" },
            showContext: false,
        });
        session.dispose();
    });

    it("keys a file's loads, keeps their records, and keys its keyless rows by their ends", async () => {
        const session = sessionWithRuns();
        await session.data.import({ type: "gml", config: { data: GML } });
        const { v1, sections } = await migrated(session);
        assert.deepStrictEqual(invalid(sections.data), []);
        const source = (sections.data.sources as JsonObject[])[1];
        const metadata = source.metadata as { "version-1": { loads: JsonObject } };
        const v1Sources = (v1.members as JsonObject[]).find((member) => member.kind === "graphty-sources");
        assert.deepStrictEqual(metadata["version-1"].loads, v1Sources);

        // Two parallel 2-3 edges, told apart by their number. The graph is undirected and a multigraph.
        const graph = sections.data.graph as JsonObject;
        assert.isFalse(graph.directed);
        assert.isTrue(graph.multigraph);
        assert.deepStrictEqual(
            (graph.nodes as JsonObject[]).map((node) => node["graphty.key"]),
            ["1", "2", "3"],
        );
        assert.deepStrictEqual(
            (graph.links as JsonObject[]).map((link) => link["graphty.key"]),
            ["1|2#1", "2|3#1", "2|3#2"],
        );
        session.dispose();
    });

    it("migrates a network load to one derived source with no format, options or ledger", async () => {
        const url = "https://files.example.com/data/graph.csv";
        vi.stubGlobal("fetch", () => Promise.resolve(new Response("source,target\nAva,Ben\n", { status: 200 })));
        try {
            const session = createGraphSession(ON);
            await session.data.import({ source: "url", config: { url } });
            const { v1, sections } = await migrated(session);
            assert.isDefined((v1.members as JsonObject[]).find((member) => member.kind === "graphty-sources"));
            assert.deepStrictEqual(invalid(sections.data), []);
            const loaded = (sections.data.sources as JsonObject[]).filter((source) => source.kind !== "reader");
            assert.lengthOf(loaded, 1);
            const [source] = loaded;
            assert.strictEqual(source.kind, "derived");
            assert.notProperty(source, "format");
            assert.notProperty(source, "options");
            assert.notProperty(source.origin as JsonObject, "ledger");
            session.dispose();
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it("opens a run of the version 1 key scc as components with strength strong, and saves components", async () => {
        const session = await baseSession();
        await session.runs.start("components", { strength: "strong" }, { as: "parts", style: false });
        const v1 = JSON.parse((await session.project.save({ format: 1 })).text) as JsonObject;
        session.dispose();
        const runs = (v1.members as JsonObject[]).flatMap((member) =>
            Array.isArray(member.runs) ? (member.runs as JsonObject[]) : [],
        );
        assert.isNotEmpty(runs);
        for (const run of runs) {
            run.algorithm = "scc";
            delete (run.params as JsonObject).strength;
        }

        const reader = sessionWithRuns(ON.features);
        const report = await reader.project.open(JSON.stringify(v1), { migrate: true });
        assert.include(
            report.problems.map((problem) => problem.code),
            "W_NAME_UPGRADED",
        );
        const [run] = reader.runs.list();
        assert.strictEqual(run.algorithm, "components");
        assert.strictEqual(run.params.strength, "strong");
        const saved = JSON.parse((await reader.project.save({ format: 2 })).text) as JsonObject;
        const { view } = saved.sections as Record<string, JsonObject>;
        assert.deepStrictEqual(
            (view.runs as JsonObject[]).map((record) => record.algorithm),
            ["components"],
        );
        reader.dispose();
    });

    it("writes the same file every time, so its ids and references are stable", async () => {
        const session = await busySession();
        const v1 = JSON.parse((await session.project.save({ format: 1 })).text) as JsonObject;
        const once = JSON.stringify(migrateDocument1(v1, []));
        assert.strictEqual(JSON.stringify(migrateDocument1(structuredClone(v1), [])), once);
        session.dispose();
    });
});

describe("version 1 file styles, carried over as columns", () => {
    /**
     * A version 1 file whose session kept a GEXF load's looks beside its data: a fill on `a`, a
     * width on the second edge, and one id the data lacks; a layer paints the fill.
     * @param clash - Give `b` a `color` column of its own first, so the look takes another name.
     * @returns The file's text.
     */
    async function withLooks(clash = false): Promise<string> {
        const session = await baseSession();
        if (clash) {
            await session.data.updateNodes([{ id: "b", values: { color: "blue" } }]);
        }

        await session.styles.add({
            name: "File fill",
            target: "node",
            selector: { match: "has", path: "data.fillx" },
            encode: { "node.color": { by: "data.fillx", scale: "passthrough" } },
        });
        const text = (await session.project.save({ format: 1 })).text.replaceAll(
            "data.fillx",
            "graphty.style.gexf.node.color",
        );
        session.dispose();
        const v1 = JSON.parse(text) as { members: JsonObject[] };
        const member = v1.members.find((each) => each.kind === "graphty-session") as JsonObject;
        member.fileStyles = [
            {
                importId: "i1",
                namespace: "gexf",
                format: "gexf",
                columns: [
                    { kind: "node", key: "color", ids: ["a", "zz"], values: ["#ff0000", "#00ff00"] },
                    { kind: "edge", key: "width", ids: [1], values: [4] },
                ],
            },
        ];
        return JSON.stringify(v1);
    }

    /**
     * What node `a` is drawn with.
     * @param session - The session.
     * @returns The color.
     */
    const fillOfA = (session: GraphSession): string | undefined =>
        (session.styles.explain({ node: "a" }).merged["node.color"] as { hex?: string } | undefined)?.hex;

    it("migrates the looks into the derived copy as columns a load would name, the layer reading them", async () => {
        const problems: DocumentProblem[] = [];
        const v2 = migrateDocument1(JSON.parse(await withLooks()) as JsonObject, problems);
        assert.isDefined(v2);
        assert.deepStrictEqual(invalid(v2), []);
        const sections = v2.sections as Record<string, JsonObject>;
        const record = (sections.data.sources as JsonObject[]).find((each) => each.kind === "derived") as JsonObject;
        const copy = record.copy as { nodes: Record<string, unknown[]>; edges: Record<string, unknown[]> };
        assert.strictEqual(copy.nodes.color[copy.nodes.id.indexOf("a")], "#ff0000");
        assert.deepStrictEqual(copy.edges.width, [null, 4]);
        assert.include(JSON.stringify(sections.style.layers), "data.color");
        assert.notInclude(JSON.stringify(v2.sections), "graphty.style.");
        assert.notDeepInclude(problems, {
            code: "W_MEMBER_LEFT_OUT",
            params: { kind: "graphty-session", pointer: "/fileStyles" },
        });
        assert.deepInclude(problems, {
            code: "W_MEMBER_LEFT_OUT",
            params: { kind: "graphty-session", pointer: "/fileStyles/0/columns/0/ids/1" },
        });
    });

    it("names a look column beside a column the data already holds, as a load does", () => {
        return withLooks(true).then((text) => {
            const v2 = migrateDocument1(JSON.parse(text) as JsonObject, []) as JsonObject;
            const { data } = v2.sections as Record<string, JsonObject>;
            const record = (data.sources as JsonObject[]).find((each) => each.kind === "derived") as JsonObject;
            const { nodes } = record.copy as { nodes: Record<string, unknown[]> };
            assert.strictEqual(nodes["color (gexf)"][nodes.id.indexOf("a")], "#ff0000");
            assert.strictEqual(nodes.color[nodes.id.indexOf("b")], "blue");
        });
    });

    it("opens the same file as before and migrated with the same columns, painting the fill", async () => {
        const text = await withLooks();
        const before = createGraphSession();
        const report = await before.project.open(text);
        assert.deepInclude(report.problems, {
            code: "W_MEMBER_LEFT_OUT",
            params: { slice: "graph", pointer: "/fileStyles/0/columns/0/ids/1" },
        });
        const migrated = createGraphSession(ON);
        await migrated.project.open(text, { migrate: true });
        assert.strictEqual(before.data.node("a")?.color, "#ff0000");
        assert.deepStrictEqual(migrated.data.node("a"), before.data.node("a"));
        assert.strictEqual(before.data.edges()[1].width, 4);
        assert.strictEqual(fillOfA(before)?.toLowerCase(), "#ff0000");
        assert.strictEqual(fillOfA(migrated)?.toLowerCase(), "#ff0000");
        before.dispose();
        migrated.dispose();
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

    it("keeps a style's id, and drops and reports its styleVersion", () => {
        const problems: DocumentProblem[] = [];
        const v2 = migrateDocument1(
            {
                kind: "graphty-style",
                version: 1,
                id: "org.example.look",
                styleVersion: "1.2.0",
                name: "A look",
                layers: [{ name: "All", selector: { match: "everything" }, set: { "node.color": "#123456" } }],
            },
            problems,
        );
        const { style } = v2?.sections as Record<string, JsonObject>;
        assert.deepStrictEqual(invalid(style), []);
        assert.deepInclude(style, { id: "org.example.look", name: "A look" });
        assert.notProperty(style, "revision");
        assert.deepInclude(problems, {
            code: "W_MEMBER_LEFT_OUT",
            params: { kind: "graphty-style", pointer: "/styleVersion" },
        });
    });

    it("writes version 1 expressions and rootless paths the way version 2 reads them", () => {
        const set = { "node.color": "#123456" };
        const layers = [
            { name: "P", selector: { match: "expression", where: "padj < 0.05" }, set },
            { name: "Q", selector: { match: "expression", where: "confidence >= 0.4 && data.x == true" }, set },
            {
                name: "S",
                selector: { match: "everything" },
                encode: { "node.size": { by: "score", scale: "linear" } },
                source: { by: "run", runId: "reader__links", algorithm: "degree" },
            },
            { name: "U", selector: { match: "expression", where: "data.a[0] == 1" }, set },
        ];
        const v2 = migrateDocument1({ kind: "graphty-style", version: 1, layers }, []);
        const { style } = v2?.sections as Record<string, JsonObject>;
        assert.deepStrictEqual(invalid(style), []);
        const [p, q, scored, unparsed] = style.layers as JsonObject[];
        assert.deepEqual(p.selector, { match: "expression", where: "data.padj < `0.05`" });
        assert.deepEqual(q.selector, { match: "expression", where: "data.confidence >= `0.4` && data.x == true" });
        assert.deepEqual(scored.encode, { "node.size": { by: "data.score", scale: "linear" } });
        assert.strictEqual((scored.source as JsonObject).by, "run");
        assert.deepEqual(unparsed.selector, { match: "expression", where: "data.a[0] == 1" }, "carried as written");

        const recipe = migrateDocument1(
            { kind: "graphty-recipe", version: 1, commands: [{ op: "graph.filter", where: "padj < 0.05" }] },
            [],
        )?.sections as Record<string, JsonObject>;
        assert.deepStrictEqual(invalid(recipe.recipe), []);
        assert.deepEqual((recipe.recipe.commands as JsonObject[])[0], {
            op: "graph.filter",
            where: "data.padj < `0.05`",
        });
    });

    it("keeps a version 1 recipe's id, drops its recipeVersion, and writes every run's style", () => {
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
        assert.deepStrictEqual((recipe.commands as JsonObject[])[1], { op: "layout.set", id: "force", dimension: 3 });
        assert.deepInclude(recipe, { id: "org.example.hubs" });
        assert.notProperty(recipe, "revision");
        assert.deepStrictEqual((recipe.commands as JsonObject[])[0].style, true);
    });

    it("keeps a version 1 recipe's unknown op that says narrows: false, and the replay goes on past it", async () => {
        const v1 = {
            kind: "graphty-recipe",
            version: 1,
            commands: [
                { op: "org.example.motif-census", as: "motifs", narrows: false },
                { op: "algo.run", algorithm: "degree", as: "hubs" },
            ],
        };
        const v2 = migrateDocument1(structuredClone(v1), []);
        const { recipe } = v2?.sections as Record<string, JsonObject>;
        assert.deepStrictEqual(invalid(recipe), []);
        assert.deepStrictEqual((recipe.commands as JsonObject[])[0], v1.commands[0]);

        const session = await baseSession(["save-files-v2"]);
        const report = await session.recipes.apply(JSON.stringify(v1));
        assert.deepInclude(
            report.problems.map((problem) => problem.code),
            "E_UNKNOWN_COMMAND",
        );
        assert.isTrue(
            session.runs.list().some((run) => run.id.endsWith("__hubs")),
            "the algo.run after it ran",
        );
        session.dispose();
    });

    it("carries terse run params and layout options as read; a save after the open writes them resolved", async () => {
        const v1 = {
            kind: "graphty-recipe",
            version: 1,
            commands: [
                { op: "algo.run", algorithm: "pagerank", as: "rank", params: { dampingFactor: 0.5 } },
                { op: "layout.set", id: "force", dimension: 3, options: { seed: 3 } },
            ],
        };
        const v2 = migrateDocument1(structuredClone(v1), []);
        const { recipe } = v2?.sections as Record<string, JsonObject>;
        assert.deepStrictEqual(invalid(recipe), []);
        const commands = recipe.commands as JsonObject[];
        assert.deepStrictEqual(commands[0].params, { dampingFactor: 0.5 });
        assert.deepStrictEqual(commands[1].options, { seed: 3 });

        const session = await baseSession(["save-files-v2"]);
        await session.recipes.apply(JSON.stringify(v1));
        const saved = JSON.parse((await session.project.save({ format: 2, rewriteRecipe: true })).text) as JsonObject;
        const sections = saved.sections as Record<string, JsonObject>;
        const written = (sections.recipe.commands as JsonObject[]).filter((command) => command.op !== "graph.filter");
        const rank = written.find((command) => command.op === "algo.run");
        assert.deepStrictEqual(rank?.params, {
            dampingFactor: 0.5,
            directed: true,
            maxIterations: 100,
            tolerance: 0.000001,
            useDelta: true,
        });
        const layout = written.find((command) => command.op === "layout.set") as JsonObject;
        const options = layout.options as JsonObject;
        const engines = (layout.drawnBy as JsonObject).options as JsonObject;
        assert.strictEqual(options.seed, 3);
        assert.include(Object.keys(engines), "springLength", "the engine's defaults are written");
        assert.notProperty(options, "dim", "the dimension says it");
        session.dispose();
    });

    it("reads a version 1 layout named by a deprecated name as its arrangement, the engine in drawnBy", () => {
        const v2 = migrateDocument1(
            { kind: "graphty-recipe", version: 1, commands: [{ op: "layout.set", id: "force-2d" }] },
            [],
        );
        const { recipe } = v2?.sections as Record<string, JsonObject>;
        assert.deepStrictEqual(invalid(recipe), []);
        assert.deepStrictEqual((recipe.commands as JsonObject[])[0], {
            op: "layout.set",
            id: "force",
            drawnBy: { engine: "arf" },
            dimension: 3,
        });
    });

    it("writes each saved view's camera as the neutral pose, with no camera state members", async () => {
        const session = await baseSession();
        const v1 = JSON.parse((await session.project.save({ format: 1 })).text) as JsonObject;
        const member = (v1.members as JsonObject[]).find((each) => each.kind === "graphty-session");
        assert.isDefined(member);
        member.views = [
            {
                // What getCameraState gives: the orbit pivot beside a position an inset shifted.
                name: "Orbit",
                camera: {
                    mode: "3d",
                    type: "arcRotate",
                    position: { x: 50, y: 50, z: 50 },
                    target: { x: 0, y: 0, z: 0 },
                    pivotRotation: { x: 0, y: Math.PI, z: 0 },
                    cameraDistance: 10,
                    fov: 0.8,
                },
            },
            { name: "Flat", camera: { pan: { x: 1, y: 2 }, zoom: 2, rotation: 0.4 } },
            { name: "Angles", camera: { alpha: 0, beta: Math.PI / 2, radius: 4, target: { x: 1, y: 0, z: 0 } } },
            { name: "Zoom only", camera: { zoom: 2 } },
        ];
        const v2 = migrateDocument1(v1, []);
        const { view } = v2?.sections as Record<string, JsonObject>;
        assert.deepStrictEqual(invalid(view), []);
        const [orbit, flat, angles, ...rest] = view.views as { name: string; camera: JsonObject }[];
        assert.deepStrictEqual(Object.keys(orbit.camera), [
            "dimension",
            "controller",
            "position",
            "target",
            "up",
            "fov",
        ]);
        assert.include(orbit.camera, { dimension: 3, controller: "orbit", fov: 0.8 });
        // Yaw pi puts the eye on +z of the target: target - 10 * (0, 0, -1).
        const position = orbit.camera.position as { x: number; y: number; z: number };
        assert.closeTo(position.x, 0, 1e-9);
        assert.closeTo(position.y, 0, 1e-9);
        assert.closeTo(position.z, 10, 1e-9);
        assert.deepStrictEqual(flat.camera, {
            dimension: 2,
            controller: "2d",
            center: { x: 1, y: 2 },
            halfWidth: 2.5,
            rotation: 0.4,
        });
        const eye = angles.camera.position as { x: number; y: number; z: number };
        assert.closeTo(eye.x, 5, 1e-9);
        assert.closeTo(eye.y, 0, 1e-9);
        assert.closeTo(eye.z, 0, 1e-9);
        assert.notProperty(angles.camera, "fov", "version 1 had none");
        assert.deepStrictEqual(rest, [], "a 2D zoom with no pan has no center, so it is left out");
        session.dispose();
    });

    it("leaves alone what it does not migrate: a data file, an unknown kind, a version 2 file, notes with no data", () => {
        assert.isUndefined(migrateDocument1({ nodes: [], links: [] }, []));
        assert.isUndefined(migrateDocument1({ kind: "com.example.thing", version: 1 }, []));
        assert.isUndefined(migrateDocument1({ kind: "graphty-document", version: 2, sections: {} }, []));
        assert.isUndefined(migrateDocument1({ kind: "graphty-notes", version: 1, notes: [] }, []));
        assert.isUndefined(migrateSection("notes", { kind: "graphty-notes", version: 1, notes: [] }, []));
        assert.isUndefined(migrateSection("style", { kind: "graphty-style", version: 2, layers: [] }, []));
    });

    it("carries what version 1 kept and reports each member it cannot carry", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", label: null },
            { id: "b", label: "B" },
        ]);
        await session.data.addEdges([{ source: "a", target: "b" }]);
        const v1 = JSON.parse((await session.project.save()).text) as JsonObject;
        const members = v1.members as JsonObject[];
        const member = (kind: string): JsonObject => members.find((each) => each.kind === kind) as JsonObject;
        const state = member("graphty-session");
        ((state.config as JsonObject).data as JsonObject).knownFields = { timePath: "year", edgeWeightPath: "w" };
        state.visibility = {
            filter: null,
            window: { attribute: "year", from: 1990, to: 2000 },
            windowRaw: true,
            showContext: false,
            conditions: {
                version: 1,
                list: [
                    { id: "x", effect: "exclude", on: true, rule: { kind: "everything" } },
                    { id: "y", effect: "keep", on: false, rule: { kind: "everything" } },
                ],
            },
        };
        state.valueLabels = [{ path: "selected", value: true, label: "Picked" }];
        // A second data member (the version 1 reader takes the first) and an extension's member.
        members.push({ ...member("graphty-data"), graph: { nodes: [{ id: "z" }], links: [] } });
        members.push({ kind: "org.example.lab", version: 1 });

        const problems: DocumentProblem[] = [];
        const migrated = migrateDocument1(v1, problems);
        assert.isDefined(migrated);
        const sections = migrated.sections as Record<string, JsonObject>;

        // No data key is a setting: a known field naming no column of the data is reported.
        const settings = sections.settings.settings as JsonObject;
        assert.isFalse(Object.keys(settings).some((key) => key.startsWith("data.")));
        assert.deepStrictEqual(invalid(sections.settings), []);
        // The first data member, and an explicit null kept as a json null rather than unset.
        const copy = ((sections.data.sources as JsonObject[])[1].copy as JsonObject).nodes as JsonObject;
        assert.deepEqual(copy.label, [null, "B"]);
        const declared = (((sections.data.sources as JsonObject[])[1].columns as JsonObject).nodes as JsonObject)
            .label as JsonObject;
        assert.strictEqual(declared.dtype, "json");
        // Every condition is kept as one plain list; the window's raw flag is not written.
        const visibility = sections.view.visibility as JsonObject;
        assert.isNull(visibility.filter);
        assert.lengthOf(visibility.conditions as unknown[], 2);
        assert.notProperty(visibility.window as JsonObject, "raw");
        assert.deepStrictEqual(invalid(sections.view), []);

        const leftOut = problems
            .filter((problem) => problem.code === "W_MEMBER_LEFT_OUT")
            .map((problem) => `${String(problem.params.kind)}${String(problem.params.pointer)}`);
        assert.includeMembers(leftOut, [
            "graphty-session/config/data/knownFields/timePath",
            "graphty-session/config/data/knownFields/edgeWeightPath",
            "graphty-session/valueLabels/0",
            `graphty-data/members/${String(members.length - 2)}`,
            `org.example.lab/members/${String(members.length - 1)}`,
        ]);
    });
});

describe("version 1 weight, time and location settings", () => {
    it("become the migrated source's roles where its rows carry the column, unreported", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", year: 1990, until: 2000, lat: 1, lon: 2 },
            { id: "b", year: 1995, until: 2001, lat: 3, lon: 4 },
        ]);
        await session.data.addEdges([{ source: "a", target: "b", cost: 3 }]);
        const v1 = JSON.parse((await session.project.save()).text) as JsonObject;
        const state = (v1.members as JsonObject[]).find((each) => each.kind === "graphty-session") as JsonObject;
        ((state.config as JsonObject).data as JsonObject).knownFields = {
            nodeTimePath: "year",
            nodeTimeUnit: "year",
            nodeTimeEndPath: "until",
            nodeLatitudePath: "lat",
            nodeLongitudePath: "lon",
            edgeWeightPath: "cost",
            edgeWeightMeaning: "distance",
            edgeTimePath: "missing",
        };
        const problems: DocumentProblem[] = [];
        const migrated = migrateDocument1(v1, problems);
        assert.isDefined(migrated);
        const { data } = migrated.sections as Record<string, JsonObject>;
        const source = (data.sources as JsonObject[]).find((each) => each.kind !== "reader") as JsonObject;
        const mapping = source.mapping as JsonObject;
        assert.deepInclude(mapping.nodes as JsonObject, {
            time: "year",
            timeUnit: "year",
            timeEnd: "until",
            latitude: "lat",
            longitude: "lon",
        });
        assert.deepInclude(mapping.edges as JsonObject, { weight: "cost", weightMeaning: "distance" });
        assert.notProperty(mapping.edges as JsonObject, "time", "no column, no role");
        const leftOut = problems.map((problem) => String(problem.params.pointer));
        assert.include(leftOut, "/config/data/knownFields/edgeTimePath");
        assert.notInclude(leftOut, "/config/data/knownFields/nodeTimePath");
        assert.notInclude(leftOut, "/config/data/knownFields/edgeWeightMeaning");
        session.dispose();
    });
});

describe("a timed version 1 file saved before what lies outside the window had a state", () => {
    it("draws what lies outside as the playback said, through layers selecting the state", async () => {
        const session = createGraphSession({ features: ["save-files-v2"] });
        await session.config.set({ startingRows: true, timelineHiddenLook: "ghost" });
        const nodes = Array.from({ length: 10 }, (_, i) => ({ id: `s${String(i)}`, step: i }));
        await session.data.import({ type: "json", config: { data: JSON.stringify({ nodes, edges: [] }) } });
        await session.time.setField({ nodes: { start: "step" } });
        await session.time.window({ from: 3, to: 6 });
        await session.time.setSettings({ outside: "ghost", missing: "outside" });
        const { text } = await session.project.save({ format: 1 });
        session.dispose();
        // As an older writer wrote it: no outsideByLayers mark, the layers reading "ghosted" and
        // setting no visible, and the playback saying how what lies outside draws.
        const before = (outside: "hide" | "ghost"): string =>
            text
                .replace(',"outsideByLayers":true', "")
                .replaceAll('"state":"outsideWindow"', '"state":"ghosted"')
                .replaceAll(',"node.visible":true', "")
                .replaceAll(',"edge.visible":true', "")
                .replace('"playback":{"missing":"outside"}', `"playback":{"missing":"outside","outside":"${outside}"}`);
        assert.include(before("ghost"), '"outside":"ghost"');

        for (const outside of ["hide", "ghost"] as const) {
            const opened = createGraphSession({ features: ["save-files-v2"] });
            const report = await opened.project.open(before(outside), { migrate: true, rerun: false });
            assert.notInclude(
                report.problems.map((problem) => problem.code),
                "W_UNKNOWN_MEMBER",
            );
            const rows = opened.styles.list().filter((layer) => layer.name === "Timeline Hidden");
            assert.isNotEmpty(rows);
            for (const layer of rows) {
                assert.deepEqual(layer.selector, { match: "state", state: "outsideWindow" });
            }

            assert.strictEqual(opened.time.settings.outside, outside, `saved ${outside}`);
            opened.dispose();
        }
    });
});
