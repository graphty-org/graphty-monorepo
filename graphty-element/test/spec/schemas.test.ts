/**
 * @file The published specification of graphty documents version 2 (spec/): every JSON Schema
 * compiles, every example validates, every section file equals the matching section of the full
 * file, the schemas refuse the members the design removed, the worked example keeps the rules on
 * keys, build and copy ids and spaces, and the built-ins registry (spec/builtins.md) names exactly
 * what graphty-element's source accepts.
 */

import { readdirSync, readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { assert, describe, it } from "vitest";

import { LABEL_LOOKS } from "../../src/catalog/label-looks";
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

describe("the examples", () => {
    it("validate against the schema their kind and version name, and their $schema is derived from them", () => {
        for (const dir of ["", "minimal/"]) {
            for (const file of examples(dir)) {
                const doc = readJson(new URL(`examples/${dir}${file}`, SPEC));
                assert.strictEqual(errorsOf(doc), "", `${dir}${file}`);
                if (doc.$schema !== undefined) {
                    assert.strictEqual(doc.$schema, `${SCHEMA_URL}${text(doc.kind)}/v${text(doc.version)}.json`);
                }
            }
        }
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

    it("key a keyless edge row <copy id>#<row from 0>, and write every space", () => {
        const { data } = sectionsOf(cardFraud());
        const links = (data.graph as JsonObject).links as JsonObject[];
        const nodes = (data.graph as JsonObject).nodes as JsonObject[];
        for (const source of (data.sources as JsonObject[]).filter((each) => each.kind !== "reader")) {
            const id = text(source.id);
            const copyId = text((source.origin as JsonObject).copy);
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
            const expected = cells.map((cell, row) => (cell === null || cell === "" ? `${copyId}#${row}` : text(cell)));
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
        name: "a style selector that names an element",
        section: "style",
        change: (style) => Object.assign(first(style.layers), { selector: { match: "ids", nodes: [] } }),
    },
];

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

/**
 * The names in each `<!-- registry: <list> -->` table of spec/builtins.md, in order.
 * @returns The lists, by name.
 */
function registryLists(): Map<string, string[]> {
    const lists = new Map<string, string[]>();
    let current: string[] | undefined;
    for (const line of readFileSync(new URL("builtins.md", SPEC), "utf8").split("\n")) {
        const marker = /^<!-- registry: ([A-Za-z]+) -->$/.exec(line);
        if (marker !== null) {
            current = [];
            lists.set(marker[1], current);
            continue;
        }
        const row = /^\| `([^`]+)` +\|/.exec(line);
        if (row !== null) {
            current?.push(row[1]);
        } else if (line.startsWith("#")) {
            current = undefined;
        }
    }
    return lists;
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
    };

    it("lists exactly the names the source accepts, list for list", () => {
        const lists = registryLists();
        assert.sameMembers([...lists.keys()], Object.keys(CODE));
        for (const [list, names] of lists) {
            assert.deepEqual(names, [...CODE[list]], list);
        }
    });
});
