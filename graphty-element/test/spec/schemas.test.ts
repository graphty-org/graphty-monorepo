/**
 * @file The published specification of graphty documents version 2 (spec/): every JSON Schema
 * compiles, every example validates, every section file equals the matching section of the full
 * file, the schemas refuse the members the design removed, the worked example keeps the rules on
 * keys, build and copy ids and spaces, and the built-ins registry (spec/builtins.md) names exactly
 * what graphty-element's source accepts. The schemas hold defaults only for members the format
 * owns, the built-ins never change a name's definition, and the examples write resolved values.
 */

import { readdirSync, readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it } from "vitest";

import { algorithmKeyOf, BUILT_IN_ALGORITHMS } from "../../src/catalog/algorithms";
import { LABEL_LOOKS } from "../../src/catalog/label-looks";
import { layoutEntry } from "../../src/catalog/layouts";
import { SCALE_DESCRIPTORS } from "../../src/catalog/scales";
import { EdgeArrowTypes, EdgeLineTypes, EdgeOutlineTypes } from "../../src/config/EdgeStyle";
import {
    NodeBorderPositions,
    NodeBorderStyles,
    NodeLabelFits,
    NodeMeshDetails,
    NodeModelCenters,
    NodeModelFits,
    NodeModelUpAxes,
    NodeShapes,
    NodeSizeModes,
} from "../../src/config/NodeStyle";
import { PARSE_OPTIONS } from "../../src/session/document2/codecs/parseOptions";
import { OVERFLOW_PATTERNS, OVERFLOW_SHAPES } from "../../src/session/styles/encoding";
import { TRANSITION_PRESETS } from "../../src/transitions/presets";

const SPEC = new URL("../../spec/", import.meta.url);
const SCHEMA_URL = "https://graphty.app/schema/documents/";
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = Record<string, Json>;

/**
 * A JSON value as text: a string as it is, anything else as JSON.
 * @param value - The value.
 * @returns The text.
 */
const text = (value: Json | undefined): string => (typeof value === "string" ? value : JSON.stringify(value));

const readJson = (url: URL): JsonObject => JSON.parse(readFileSync(url, "utf8")) as JsonObject;

/** Every schema file, by path under spec/schemas/. */
function schemaFiles(): string[] {
    return readdirSync(new URL("schemas/", SPEC), { recursive: true, encoding: "utf8" })
        .filter((file) => file.endsWith(".json"))
        .sort((a, b) => a.localeCompare(b));
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
addFormats(ajv);
for (const file of schemaFiles()) {
    ajv.addSchema(readJson(new URL(`schemas/${file}`, SPEC)));
}

/**
 * Validate a document against the schema its kind and version name.
 * @param doc - The document.
 * @returns The errors, as text; empty when valid.
 */
function errorsOf(doc: JsonObject): string {
    const id = `${SCHEMA_URL}${text(doc.kind)}/v${text(doc.version)}.json`;
    const validate = ajv.getSchema(id);
    assert.isDefined(validate, `a schema for ${id}`);
    return validate?.(doc) === true ? "" : ajv.errorsText(validate?.errors, { separator: "\n" });
}

const examples = (dir: string): string[] =>
    readdirSync(new URL(`examples/${dir}`, SPEC))
        .filter((file) => file.endsWith(".json"))
        .sort((a, b) => a.localeCompare(b));

/** The worked example's full file, read fresh so a test may change it. */
const cardFraud = (): JsonObject => readJson(new URL("examples/card-fraud.graphty.json", SPEC));
const sectionsOf = (full: JsonObject): Record<string, JsonObject> => full.sections as Record<string, JsonObject>;

describe("the version 2 schemas", () => {
    it("compile, each under the $id its path names", () => {
        for (const file of schemaFiles()) {
            const schema = readJson(new URL(`schemas/${file}`, SPEC));
            assert.strictEqual(schema.$id, `${SCHEMA_URL}${file}`, file);
            assert.isFunction(ajv.getSchema(text(schema.$id)), file);
        }
    });

    it("hold a schema for the wrapper and every section kind at its version", () => {
        const files = schemaFiles();
        for (const name of [
            "graphty-document/v2.json",
            "graphty-data/v2.json",
            "graphty-style/v2.json",
            "graphty-recipe/v2.json",
            "graphty-settings/v1.json",
            "graphty-results/v2.json",
            "graphty-notes/v2.json",
            "graphty-view/v1.json",
        ]) {
            assert.include(files, name);
        }
    });
});

/**
 * The current version's schema files: the newest version of each kind, not the older ones the
 * migration reads.
 * @returns The paths under spec/schemas/.
 */
function currentSchemaFiles(): string[] {
    const newest = new Map<string, { file: string; version: number }>();
    for (const file of schemaFiles()) {
        const [kind, name] = file.split("/");
        const version = Number(/^v(\d+)\.json$/.exec(name)?.[1]);
        if ((newest.get(kind)?.version ?? 0) < version) {
            newest.set(kind, { file, version });
        }
    }
    return [...newest.values()].map((each) => each.file);
}

/**
 * Every `default` keyword under a schema value, as `<file>#<pointer>` and its value.
 * @param value - The schema value.
 * @param at - Its pointer.
 * @param found - Collects what is found.
 */
function defaultsIn(value: Json, at: string, found: [string, Json][]): void {
    if (Array.isArray(value)) {
        value.forEach((entry, index) => defaultsIn(entry, `${at}/${index}`, found));
        return;
    }

    if (value === null || typeof value !== "object") {
        return;
    }

    for (const [key, entry] of Object.entries(value)) {
        const pointer = `${at}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
        // A member named "default" under `properties` is a member, not the keyword.
        if (key === "default" && !at.endsWith("/properties")) {
            found.push([pointer, entry]);
        } else {
            defaultsIn(entry, pointer, found);
        }
    }
}

describe("defaults in the version 2 schemas", () => {
    it("hold default keywords only for format-owned members", () => {
        const found: [string, Json][] = [];
        for (const file of currentSchemaFiles()) {
            defaultsIn(readJson(new URL(`schemas/${file}`, SPEC)), file, found);
        }

        // Spec 9 rule 9: every other default belongs to code the format does not version.
        assert.deepEqual(
            new Map(found),
            new Map<string, Json>([
                ["common/v2.json/$defs/joinStep/properties/viaEnd/default", "target"],
                ["common/v2.json/$defs/joinStep/properties/ignoreCase/default", false],
                ["common/v2.json/$defs/joinStep/properties/ignoreSpaces/default", false],
                ["common/v2.json/$defs/graphFilter/properties/on/default", "nodes"],
                ["graphty-data/v2.json/properties/repeatedEdges/default", "keep"],
                [
                    "graphty-data/v2.json/properties/sources/items/else/properties/settings/properties/duplicateIds/default",
                    "first",
                ],
                [
                    "graphty-data/v2.json/properties/sources/items/else/properties/settings/properties/unmatched/default",
                    "add",
                ],
                ["graphty-notes/v2.json/properties/notes/items/properties/mediaType/default", "text/plain"],
                ["graphty-view/v1.json/properties/runs/items/properties/replayable/default", true],
            ]),
        );
    });
});

describe("the examples", () => {
    it("name their schema in $schema, derived from their kind and version, and validate by it", () => {
        for (const dir of ["", "minimal/"]) {
            for (const file of examples(dir)) {
                const doc = readJson(new URL(`examples/${dir}${file}`, SPEC));
                assert.strictEqual(doc.$schema, `${SCHEMA_URL}${text(doc.kind)}/v${text(doc.version)}.json`, file);
                const validate = ajv.getSchema(text(doc.$schema));
                assert.isDefined(validate, `${dir}${file}`);
                assert.isTrue(validate?.(doc), `${dir}${file}: ${ajv.errorsText(validate?.errors)}`);
            }
        }
    });

    it("write no source on a layer the reader made: by user is refused", () => {
        const view = sectionsOf(cardFraud()).view as { layers: JsonObject[] };
        assert.isTrue(view.layers.some((layer) => !("source" in layer)));
        view.layers[0].source = { by: "user" };
        assert.notStrictEqual(errorsOf(view), "");
    });

    it("cut out of a full file give the section files, member for member and in order", () => {
        for (const [dir, stem] of [
            ["", "card-fraud"],
            ["minimal/", "minimal"],
        ] as const) {
            const sections = sectionsOf(readJson(new URL(`examples/${dir}${stem}.graphty.json`, SPEC)));
            for (const file of examples(dir).filter((each) => each.startsWith(`${stem}.graphty-`))) {
                const key = file.slice(`${stem}.graphty-`.length, -".json".length);
                const alone = readJson(new URL(`examples/${dir}${file}`, SPEC));
                assert.strictEqual(alone.kind, `graphty-${key}`, file);
                if (key in sections) {
                    assert.strictEqual(JSON.stringify(alone), JSON.stringify(sections[key]), file);
                }
            }
        }
    });

    it("let the key decide: a known key holding another kind is held, never a refusal of the file", () => {
        const full = cardFraud();
        const sections = sectionsOf(full);
        const swapped = { ...full, sections: { ...sections, style: sections.recipe } };
        assert.strictEqual(errorsOf(swapped), "");
    });

    it("hold the key, build and copy ids the design mints", () => {
        const { data, results } = sectionsOf(cardFraud());
        assert.match(text(data.build), ULID);
        const sources = data.sources as JsonObject[];
        const copies = Object.fromEntries(
            sources.map((source) => [text(source.id), text((source.origin as JsonObject).copy)]),
        );
        for (const source of sources) {
            const copy = copies[text(source.id)];
            if (source.kind === "reader") {
                assert.strictEqual(source.id, "reader");
                assert.match(copy, ULID);
            } else {
                assert.match(text(source.id), /^src_[0-9A-HJKMNP-TV-Z]{26}$/);
                assert.match(
                    copy,
                    ["file", "url", "sample"].includes(text(source.kind)) ? /^sha256:[0-9a-f]{64}$/ : ULID,
                );
            }
        }
        const records = [...Object.values(results.runs as Record<string, JsonObject>), results.layout as JsonObject];
        for (const record of records) {
            const binds = record.bindsTo as JsonObject;
            assert.strictEqual(binds.build, data.build);
            assert.deepEqual(binds.sources, copies);
        }
    });

    it("key a keyless edge row <from>|<to>#<n>, and write every space", () => {
        const { data } = sectionsOf(cardFraud());
        const links = (data.graph as JsonObject).links as JsonObject[];
        const nodes = (data.graph as JsonObject).nodes as JsonObject[];
        for (const source of (data.sources as JsonObject[]).filter((each) => each.kind !== "reader")) {
            const id = text(source.id);
            const mapping = source.mapping as Record<string, Record<string, Json>>;
            const tables = source.copy as Record<string, Record<string, Json[]>>;
            if (mapping.nodes !== undefined) {
                // A node key is always in a written space; a keyless node row in source:<id>.
                const space = mapping.nodes.key === undefined ? `source:${id}` : text(mapping.nodes.space);
                const keys = tables.nodes[text(mapping.nodes.key)];
                for (const key of keys) {
                    const node = nodes.find((each) => each["graphty.key"] === key && each["graphty.space"] === space);
                    assert.isDefined(node, `${id} node ${text(key)} in ${space}`);
                }
            }
            if (tables.edges === undefined) {
                continue;
            }
            const cells = tables.edges[text(mapping.edges.edgeId)];
            const [from, to] = [tables.edges[text(mapping.edges.source)], tables.edges[text(mapping.edges.target)]];
            // A keyless row is keyed by its ends as read, numbered over the keyless rows between them.
            const counts = new Map<string, number>();
            const expected = cells.map((cell, row) => {
                if (cell !== null && cell !== "") {
                    return text(cell);
                }
                const pair = `${text(from[row])}|${text(to[row])}`;
                counts.set(pair, (counts.get(pair) ?? 0) + 1);
                return `${pair}#${String(counts.get(pair))}`;
            });
            const actual = links.filter((link) => link["graphty.load"] === id).map((link) => text(link["graphty.key"]));
            assert.sameMembers(actual, expected, id);
        }
    });

    it("hold equal-length output columns in every result run and in the layout", () => {
        const { results } = sectionsOf(cardFraud());
        const outputs: [string, JsonObject][] = [];
        for (const [id, run] of Object.entries(results.runs as Record<string, JsonObject>)) {
            for (const domain of ["nodes", "edges"]) {
                if (run[domain] !== undefined) {
                    outputs.push([`${id}.${domain}`, run[domain] as JsonObject]);
                }
            }
        }
        outputs.push(["layout.nodes", (results.layout as JsonObject).nodes as JsonObject]);
        for (const [where, output] of outputs) {
            const count = (output.refs as Json[]).length;
            for (const [field, values] of Object.entries(output.columns as Record<string, Json[]>)) {
                assert.lengthOf(values, count, `${where}.${field}`);
            }
        }
    });
});

/** A change to one section of the worked example that the schemas must refuse. */
interface Mutation {
    readonly name: string;
    readonly section: string;
    readonly change: (section: JsonObject) => void;
}

const first = (list: Json): JsonObject => (list as JsonObject[])[0];
const sourceAt = (data: JsonObject, index: number): JsonObject => (data.sources as JsonObject[])[index];

const MUTATIONS: Mutation[] = [
    {
        name: "an edge reference by ends and row hash (h, n)",
        section: "notes",
        change: (notes) => {
            const target = first(first(notes.notes).targets);
            Object.assign(target, { edge: { from: {}, to: {}, h: `sha256:${"0".repeat(64)}`, n: 0 } });
        },
    },
    {
        name: "a fingerprint in bindsTo",
        section: "results",
        change: (results) => {
            Object.assign(results.bindsTo as JsonObject, { fingerprint: `sha256:${"0".repeat(64)}` });
        },
    },
    {
        name: "a revision in the header",
        section: "style",
        change: (style) => Object.assign(style, { revision: "1.0.0" }),
    },
    { name: "a layer kind", section: "style", change: (style) => Object.assign(first(style.layers), { kind: "base" }) },
    { name: "a re-key log", section: "data", change: (data) => Object.assign(data, { rekeys: [] }) },
    { name: 'copy: "graph"', section: "data", change: (data) => Object.assign(sourceAt(data, 1), { copy: "graph" }) },
    {
        name: "a replaced time",
        section: "data",
        change: (data) => Object.assign(sourceAt(data, 1), { replaced: "2026-11-14T18:00:00.000Z" }),
    },
    {
        name: "per-source direction",
        section: "data",
        change: (data) => Object.assign(sourceAt(data, 2).settings as JsonObject, { directed: true }),
    },
    {
        name: "a hand-chosen source id",
        section: "data",
        change: (data) => Object.assign(sourceAt(data, 1), { id: "accounts" }),
    },
    {
        name: "the four reader-edit sets",
        section: "data",
        change: (data) => Object.assign(sourceAt(data, 0), { copy: { edits: [], added: [], removed: [], merges: [] } }),
    },
    {
        name: "issues.fixed",
        section: "data",
        change: (data) => Object.assign(data.issues as JsonObject, { fixed: [] }),
    },
    {
        name: "a join.link choice",
        section: "data",
        change: (data) => Object.assign(first(data.joins), { link: { column: "mcc" } }),
    },
    {
        name: "a type entry's domain",
        section: "data",
        change: (data) => Object.assign(first(data.types), { domain: "node" }),
    },
    { name: "an XR placement", section: "view", change: (view) => Object.assign(view, { xr: {} }) },
    { name: "placed positions", section: "view", change: (view) => Object.assign(view, { placed: [] }) },
    {
        name: "a layer anchor (after)",
        section: "view",
        change: (view) => Object.assign(first(view.layers), { after: "base" }),
    },
    {
        name: "a view run without its id",
        section: "view",
        change: (view) => {
            delete first(view.runs).id;
        },
    },
    {
        name: "a view run with style",
        section: "view",
        change: (view) => Object.assign(first(view.runs), { style: false }),
    },
    {
        name: "a view run over the bare selection",
        section: "view",
        change: (view) => Object.assign(first(view.runs), { scope: "selection" }),
    },
    {
        name: "a raw-window flag",
        section: "view",
        change: (view) => Object.assign((view.visibility as JsonObject).window as JsonObject, { raw: true }),
    },
    {
        name: "a role-keyed column dependency",
        section: "style",
        change: (style) => {
            const columns = (style.dependencies as JsonObject).columns as JsonObject[];
            columns[0] = { role: "weight", schema: { type: "number" } };
        },
    },
    {
        name: "a run's engine without packages",
        section: "results",
        change: (results) => {
            const run = Object.values(results.runs as JsonObject)[0] as JsonObject;
            run.engine = { accelerator: "cpu" };
        },
    },
    {
        name: "a run's engine with no package",
        section: "results",
        change: (results) => {
            const run = Object.values(results.runs as JsonObject)[0] as JsonObject;
            run.engine = { packages: {}, accelerator: "cpu" };
        },
    },
    {
        name: "a layout's engine in the fixed element, algorithms and layout shape",
        section: "results",
        change: (results) => {
            (results.layout as JsonObject).engine = { element: "3.40.0", algorithms: "2.1.2", layout: "1.10.5" };
        },
    },
    {
        name: "an accelerator in a run's caveats",
        section: "results",
        change: (results) => {
            const run = Object.values(results.runs as JsonObject)[0] as JsonObject;
            Object.assign(run.caveats as JsonObject, { accelerator: "cpu" });
        },
    },
    {
        name: "a seeded view run record with no engine",
        section: "view",
        change: (view) => {
            const seeded = (view.runs as JsonObject[]).find((run) => run.seed !== undefined);
            delete (seeded as JsonObject).engine;
        },
    },
    {
        name: "a layout record's versions (engine holds the code that drew it)",
        section: "results",
        change: (results) => Object.assign(results.layout as JsonObject, { versions: {} }),
    },
    {
        name: "a seed in a run's caveats",
        section: "results",
        change: (results) => {
            const run = Object.values(results.runs as JsonObject)[0] as JsonObject;
            Object.assign(run.caveats as JsonObject, { seed: 1 });
        },
    },
    {
        name: "a camera type beside its controller",
        section: "view",
        change: (view) => Object.assign(view.camera as JsonObject, { type: "arcRotate" }),
    },
    {
        // A filter is graph.filter's { on, where } or a rule tree, told apart by structure.
        name: "a visibility filter that is neither graph.filter's { on, where } nor a rule tree",
        section: "view",
        change: (view) => Object.assign(view.visibility as JsonObject, { filter: { on: "nodes" } }),
    },
    {
        name: "a view layout naming its layout in engine",
        section: "view",
        change: (view) => Object.assign(view.layout as JsonObject, { engine: "ngraph" }),
    },
    {
        name: "a view layout naming its engine in algorithm",
        section: "view",
        change: (view) => Object.assign(view.layout as JsonObject, { algorithm: "ngraph" }),
    },
    {
        name: "a recipe layout.set naming its engine in algorithm",
        section: "recipe",
        change: (recipe) => {
            const commands = recipe.commands as JsonObject[];
            const layout = commands.find((command) => command.op === "layout.set");
            Object.assign(layout as JsonObject, { algorithm: "ngraph" });
        },
    },
    {
        name: "a recipe layout.set with an engine",
        section: "recipe",
        change: (recipe) => {
            const commands = recipe.commands as JsonObject[];
            const layout = commands.find((command) => command.op === "layout.set");
            Object.assign(layout as JsonObject, { engine: "ngraph" });
        },
    },
    {
        name: "a network origin member outside its closed list",
        section: "data",
        change: (data) => Object.assign(sourceAt(data, 2).origin as JsonObject, { mediaType: "application/json" }),
    },
    ...(["compare", "membership", "action"] as const).map((member): Mutation => ({
        name: `the reserved join step member ${member}`,
        section: "data",
        change: (data) => Object.assign(first(data.joins), { [member]: {} }),
    })),
    {
        name: "the reserved mapping.many on a join step",
        section: "data",
        change: (data) =>
            (data.joins as JsonObject[]).push({
                op: "join.node-values",
                source: text(sourceAt(data, 1).id),
                mapping: { many: true },
            }),
    },
    {
        name: "a space beginning graph:",
        section: "data",
        change: (data) => {
            const mapping = sourceAt(data, 1).mapping as Record<string, JsonObject>;
            Object.assign(mapping.nodes, { space: "graph:people" });
        },
    },
    {
        name: "the reserved reader merge",
        section: "data",
        change: (data) => {
            const reader = (data.sources as JsonObject[]).find((each) => each.kind === "reader") as JsonObject;
            ((reader.copy as JsonObject).operations as JsonObject[]).push({
                op: "merge",
                into: { space: "account", key: "acct-7" },
                from: { space: "account", key: "acct-8" },
            });
        },
    },
    {
        name: "graphty.types as a binding path",
        section: "style",
        change: (style) => {
            const layer = (style.layers as JsonObject[]).find((each) => each.encode !== undefined) as JsonObject;
            Object.assign((layer.encode as Record<string, JsonObject>)["node.color"], { by: "graphty.types" });
        },
    },
    {
        name: "unmapped on a binding with no map",
        section: "style",
        change: (style) => {
            const layer = (style.layers as JsonObject[]).find((each) => each.encode !== undefined) as JsonObject;
            Object.assign((layer.encode as Record<string, JsonObject>)["node.color"], { unmapped: "skip" });
        },
    },
    {
        name: "a reserved named member on a source leaf",
        section: "view",
        change: (view) =>
            Object.assign(view.visibility as JsonObject, {
                filter: { kind: "source", sources: ["src_01JCBP0A7Q3M5V8X2K4N6R9T1W"], named: true },
            }),
    },
    {
        name: "a style selector that names an element",
        section: "style",
        change: (style) => Object.assign(first(style.layers), { selector: { match: "ids", nodes: [] } }),
    },
];

describe("readable paths, map bindings and several graphs", () => {
    it("take a readable path and unmapped: skip on a map", () => {
        const { style } = sectionsOf(cardFraud());
        const layer = (style.layers as JsonObject[]).find((each) => each.encode !== undefined) as JsonObject;
        (layer.encode as Record<string, Json>)["node.color"] = {
            by: "graphty.type",
            scale: "passthrough",
            map: { account: "#0072b2" },
            unmapped: "skip",
        };
        assert.strictEqual(errorsOf(style), "");
    });

    it("write graphs only with two or more, the first naming the top-level graph", () => {
        const two = readJson(new URL("examples/minimal/minimal-graphs.graphty.json", SPEC));
        assert.strictEqual(errorsOf(two), "");
        const graphs = two.graphs as JsonObject[];
        for (const [what, change] of [
            ["one graph", (doc: JsonObject) => (doc.graphs = [graphs[0]])],
            ["sections on the first", (doc: JsonObject) => (doc.graphs = [{ ...graphs[0], sections: {} }, graphs[1]])],
            [
                "a later graph without sections",
                (doc: JsonObject) => (doc.graphs = [graphs[0], { id: graphs[1].id, name: graphs[1].name }]),
            ],
            [
                "an id that is no graph_ ULID",
                (doc: JsonObject) => (doc.graphs = [{ ...graphs[0], id: "people" }, graphs[1]]),
            ],
            [
                "a style section in a later graph",
                (doc: JsonObject) =>
                    (doc.graphs = [
                        graphs[0],
                        { ...graphs[1], sections: { ...(graphs[1].sections as JsonObject), style: {} } },
                    ]),
            ],
        ] as const) {
            const copy = JSON.parse(JSON.stringify(two)) as JsonObject;
            change(copy);
            assert.notStrictEqual(errorsOf(copy), "", what);
        }
    });

    it("take a graph entry's unknown member and a later graph's unknown section key", () => {
        const two = readJson(new URL("examples/minimal/minimal-graphs.graphty.json", SPEC));
        const graphs = two.graphs as JsonObject[];
        graphs[1] = {
            ...graphs[1],
            color: "teal",
            sections: { ...(graphs[1].sections as JsonObject), "org.example.timeline": { kind: "x", version: 1 } },
        };
        assert.strictEqual(errorsOf(two), "");
    });
});

describe("must-understand members of closed objects", () => {
    /**
     * The worked example's data section with a change to its first file source.
     * @param change - What to change on the source.
     * @returns The errors.
     */
    const sourceErrors = (change: (source: JsonObject) => void): string => {
        const { data } = sectionsOf(cardFraud());
        change((data.sources as JsonObject[]).find((source) => source.kind === "file") as JsonObject);
        return errorsOf(data);
    };

    it("take a member a closed object lists in ignorable, and refuse it unlisted", () => {
        assert.strictEqual(
            sourceErrors((source) => Object.assign(source, { future: 1, ignorable: ["future"] })),
            "",
        );
        assert.notStrictEqual(
            sourceErrors((source) => Object.assign(source, { future: 1 })),
            "",
        );
        assert.notStrictEqual(
            sourceErrors((source) => Object.assign(source, { extensions: { "Not.Reverse.Domain": 1 } })),
            "",
        );
    });

    it("take narrows: false on a command, known op or not", () => {
        const { recipe } = sectionsOf(cardFraud());
        const commands = recipe.commands as JsonObject[];
        commands[0] = { ...commands[0], narrows: false };
        commands.push({ op: "org.example.motif-census", as: "motifs", narrows: false });
        assert.strictEqual(errorsOf(recipe), "");
        commands[0] = { ...commands[0], narrows: true };
        assert.notStrictEqual(errorsOf(recipe), "");
    });
});

describe("the schemas refuse what the design removed", () => {
    for (const mutation of MUTATIONS) {
        it(mutation.name, () => {
            const section = sectionsOf(cardFraud())[mutation.section];
            assert.strictEqual(errorsOf(section), "", "the example is valid before the change");
            mutation.change(section);
            assert.notStrictEqual(errorsOf(section), "", mutation.name);
        });
    }
});

/** One row of a registry table: the name and its normative Definition column. */
interface RegistryRow {
    readonly name: string;
    readonly definition: string;
}

/**
 * The rows of each `<!-- registry: <list> -->` table of spec/builtins.md, in order. The
 * informative "Drawn today" column is not read.
 * @returns The lists, by name.
 */
function registryRows(): Map<string, RegistryRow[]> {
    const lists = new Map<string, RegistryRow[]>();
    let current: RegistryRow[] | undefined;
    for (const line of readFileSync(new URL("builtins.md", SPEC), "utf8").split("\n")) {
        const marker = /^<!-- registry: ([A-Za-z]+) -->$/.exec(line);
        if (marker !== null) {
            current = [];
            lists.set(marker[1], current);
            continue;
        }
        const row = /^\| `([^`]+)` +\|(.*)\|$/.exec(line);
        if (row !== null) {
            current?.push({ name: row[1], definition: row[2].split(" | ")[0].trim() });
        } else if (line.startsWith("#")) {
            current = undefined;
        }
    }
    return lists;
}

/**
 * The names in each registry table, in order.
 * @returns The lists, by name.
 */
function registryLists(): Map<string, string[]> {
    return new Map([...registryRows()].map(([list, rows]) => [list, rows.map((row) => row.name)]));
}

describe("the built-ins registry", () => {
    const CODE: Record<string, readonly string[]> = {
        nodeShapes: NodeShapes.options,
        edgeArrows: EdgeArrowTypes.options,
        edgeLines: EdgeLineTypes.options,
        edgeOutlines: EdgeOutlineTypes.options,
        transitions: TRANSITION_PRESETS.map((preset) => preset.descriptor.id),
        overflowShapes: OVERFLOW_SHAPES,
        overflowPatterns: OVERFLOW_PATTERNS,
        labelLooks: LABEL_LOOKS.map((look) => look.id),
        nodeBorderStyles: NodeBorderStyles.options,
        nodeBorderPositions: NodeBorderPositions.options,
        nodeSizeModes: NodeSizeModes.options,
        nodeLabelFits: NodeLabelFits.options,
        nodeMeshDetails: NodeMeshDetails.options,
        nodeModelUpAxes: NodeModelUpAxes.options,
        nodeModelFits: NodeModelFits.options,
        nodeModelCenters: NodeModelCenters.options,
        parseOptions: Object.keys(PARSE_OPTIONS),
        scales: SCALE_DESCRIPTORS.map((scale) => scale.name),
    };

    it("lists exactly the names the source accepts, list for list", () => {
        const lists = registryLists();
        assert.sameMembers([...lists.keys()], Object.keys(CODE));
        for (const [list, names] of lists) {
            assert.deepEqual(names, [...CODE[list]], list);
        }
    });

    it("gives each parse option the formats graphty-element reads it for", () => {
        for (const row of registryRows().get("parseOptions") ?? []) {
            const { formats } = PARSE_OPTIONS[row.name];
            const cell = row.definition.replaceAll("`", "");
            assert.strictEqual(cell, formats === "*" ? "*" : formats.join(", "), row.name);
        }
    });

    it("are immutable: every version 2 name keeps its place and its definition", () => {
        // Spec 9 rule 5: a list only gains names at its end, and a name never changes meaning.
        const frozen = readJson(new URL("builtins-v2.json", import.meta.url)) as unknown as Record<
            string,
            RegistryRow[]
        >;
        const lists = registryRows();
        for (const [list, rows] of Object.entries(frozen)) {
            const current = lists.get(list);
            assert.isDefined(current, list);
            assert.deepEqual(current.slice(0, rows.length), rows, list);
        }
    });
});

/**
 * The options a declared option list gives a default, by name.
 * @param options - The options.
 * @param options.name - An option's name.
 * @param options.default - Its default.
 * @returns Their names.
 */
const defaulted = (options: readonly { name: string; default?: unknown }[]): string[] =>
    options.filter((option) => option.default !== undefined).map((option) => option.name);

/**
 * The options an algorithm declares with a default, a legacy key (`dijkstra`) read as the
 * algorithm it names.
 * @param algorithm - The algorithm, as a file names it.
 * @returns Their names.
 */
function algorithmDefaults(algorithm: Json | undefined): string[] {
    const key = algorithmKeyOf(text(algorithm), BUILT_IN_ALGORITHMS)?.key;
    const descriptor = BUILT_IN_ALGORITHMS.find((each) => each.key === key);
    assert.isDefined(descriptor, text(algorithm));
    return defaulted(descriptor.options);
}

/**
 * The options a layout's engine declares with a default that a file writes: all but the one it
 * derives from the dimension, and those whose default is null (off unless asked).
 * @param layout - The layout record or command.
 * @returns Their names.
 */
function layoutDefaults(layout: JsonObject): string[] {
    const entry = layoutEntry(text(layout.id));
    const drawnBy = (layout.drawnBy ?? {}) as JsonObject;
    const wanted = drawnBy.engine ?? entry?.descriptor.engine;
    const engine = entry?.implementations.find((each) => each.engine === wanted);
    assert.isDefined(engine, text(wanted));
    return defaulted(engine.options.filter((option) => option.default !== null && option.name !== "dim"));
}

/**
 * A layout record's option values, its own and its engine's together (README 5 rule 9).
 * @param layout - The layout record or command.
 * @returns The values.
 */
const layoutValues = (layout: JsonObject): JsonObject => ({
    ...((layout.options ?? {}) as JsonObject),
    ...(((layout.drawnBy ?? {}) as JsonObject).options as JsonObject | undefined),
});

describe("the examples write resolved values", () => {
    const files = [
        ...examples("").map((file) => `examples/${file}`),
        ...examples("minimal").map((file) => `examples/minimal/${file}`),
    ];
    /** Every section an example holds, as a section file or inside a full file. */
    const sections = files.flatMap((file): JsonObject[] => {
        const doc = readJson(new URL(file, SPEC));
        return doc.kind === "graphty-document" ? Object.values(sectionsOf(doc)) : [doc];
    });
    const ofKind = (kind: string): JsonObject[] => sections.filter((section) => section.kind === kind);

    it("name every defaulted option in each run and layout", () => {
        let checked = 0;
        const check = (where: string, values: Json | undefined, wanted: string[]): void => {
            const held = Object.keys((values ?? {}) as JsonObject);
            for (const name of wanted) {
                assert.include(held, name, where);
            }
            checked += 1;
        };
        for (const recipe of ofKind("graphty-recipe")) {
            for (const command of recipe.commands as JsonObject[]) {
                if (command.op === "algo.run") {
                    check(`recipe ${text(command.as)}`, command.params, algorithmDefaults(command.algorithm));
                } else if (command.op === "layout.set") {
                    check("recipe layout.set", layoutValues(command), layoutDefaults(command));
                }
            }
        }
        for (const results of ofKind("graphty-results")) {
            for (const [id, run] of Object.entries((results.runs ?? {}) as Record<string, JsonObject>)) {
                check(`results ${id}`, run.params, algorithmDefaults(run.algorithm));
            }
            if (results.layout !== undefined) {
                check(
                    "results layout",
                    layoutValues(results.layout as JsonObject),
                    layoutDefaults(results.layout as JsonObject),
                );
            }
        }
        for (const view of ofKind("graphty-view")) {
            for (const run of (view.runs ?? []) as JsonObject[]) {
                check(`view ${text(run.id)}`, run.params, algorithmDefaults(run.algorithm));
            }
            if (view.layout !== undefined) {
                check(
                    "view layout",
                    layoutValues(view.layout as JsonObject),
                    layoutDefaults(view.layout as JsonObject),
                );
            }
        }
        assert.isAbove(checked, 0);
    });
});

describe("rule tree leaves (README 4.8.3)", () => {
    const validate = ajv.getSchema(`${SCHEMA_URL}common/v2.json#/$defs/reusableRuleTree`);
    const valid = (tree: JsonObject): boolean => validate?.(tree) === true;

    it("closes each known leaf with its members", () => {
        assert.isTrue(valid({ kind: "range", attribute: "data.age", min: 18 }));
        assert.isFalse(valid({ kind: "range" }), "a range names its attribute");
        assert.isFalse(valid({ kind: "range", attribute: "data.age", bogus: 1 }), "a range is closed");
        assert.isFalse(valid({ kind: "range", attribute: "age" }), "a path has a root");
        assert.isTrue(valid({ kind: "text", reads: "id", mode: "exact", text: "a" }));
        assert.isFalse(valid({ kind: "threshold", path: "data.x", top: 3, above: 1 }), "exactly one cut");
        assert.isTrue(valid({ kind: "all", of: [{ kind: "degree", min: 2 }, { kind: "isolated" }] }));
    });

    it("leaves an unknown leaf kind open", () => {
        assert.isTrue(valid({ kind: "future-leaf", x: 1 }));
    });
});
