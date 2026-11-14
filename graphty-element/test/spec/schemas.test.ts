/**
 * @file The published specification of graphty documents version 2 (spec/): every JSON Schema
 * compiles, every example validates, every section file equals the matching section of the full
 * file, the worked example's hashes are the ones the specification defines, and the built-ins
 * registry (spec/builtins.md) names exactly what graphty-element's source accepts.
 */

import { createHash } from "node:crypto";
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

/** RFC 8785 canonical JSON for values with no non-finite numbers. */
function canon(value: Json): string {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map(canon).join(",")}]`;
    }
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canon(value[key])}`).join(",")}}`;
}

const sha = (text: string): string => `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;

const examples = (dir: string): string[] =>
    readdirSync(new URL(`examples/${dir}`, SPEC))
        .filter((file) => file.endsWith(".json"))
        .sort((a, b) => a.localeCompare(b));

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
            const full = readJson(new URL(`examples/${dir}${stem}.graphty.json`, SPEC));
            const sections = full.sections as Record<string, JsonObject>;
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

    it("refuse a section whose kind disagrees with its key, and a style that names an element", () => {
        const full = readJson(new URL("examples/card-fraud.graphty.json", SPEC));
        const sections = full.sections as Record<string, JsonObject>;
        const swapped = { ...full, sections: { ...sections, style: sections.recipe } };
        assert.notStrictEqual(errorsOf(swapped), "");
        const { style } = sections;
        const layers = style.layers as JsonObject[];
        const naming = {
            ...style,
            layers: [...layers, { id: "x", name: "x", selector: { match: "ids", nodes: [] }, set: {} }],
        };
        assert.notStrictEqual(errorsOf(naming), "");
    });

    it("carry the hashes the specification defines", () => {
        const data = readJson(new URL("examples/card-fraud.graphty-data.json", SPEC));
        const results = readJson(new URL("examples/card-fraud.graphty-results.json", SPEC));
        const view = readJson(new URL("examples/card-fraud.graphty-view.json", SPEC));
        const sources = data.sources as JsonObject[];
        const byId = new Map(sources.map((source) => [text(source.id), source]));
        const hashOf = (source: JsonObject): string => text((source.origin as JsonObject).hash);

        // The reader source and a network source hash the canonical JSON of their copies.
        const reader = byId.get("reader") as JsonObject;
        assert.strictEqual(hashOf(reader), sha(canon(reader.copy)));
        const activity = byId.get("activity") as JsonObject;
        assert.strictEqual(hashOf(activity), sha(canon(activity.copy)));

        // The fingerprint covers every input the build reads.
        const settings: JsonObject = {};
        for (const source of sources.filter((each) => each.kind !== "reader")) {
            const entry: JsonObject = {};
            for (const key of ["format", "options", "mapping", "settings"]) {
                if (source[key] !== undefined) {
                    entry[key] = source[key];
                }
            }
            settings[text(source.id)] = entry;
        }
        const types = (data.types as JsonObject[]).map(({ plainName: _plainName, ...rest }) => rest);
        const issues = data.issues as JsonObject;
        const fingerprint = sha(
            canon({
                sources: Object.fromEntries(sources.map((source) => [text(source.id), hashOf(source)])),
                settings,
                types,
                kept: issues.kept,
                joins: data.joins,
            }),
        );
        const bindsTo = results.bindsTo as JsonObject;
        assert.strictEqual(bindsTo.fingerprint, fingerprint);
        assert.deepEqual(bindsTo.sources, Object.fromEntries(sources.map((s) => [text(s.id), hashOf(s)])));

        // An edge without a key is named by the hash of its source row, without its ends and id.
        const edges = (activity.copy as JsonObject).edges as Record<string, Json[]>;
        const edgeMapping = (activity.mapping as JsonObject).edges as Record<string, string>;
        const skip = new Set([edgeMapping.edgeId, edgeMapping.source, edgeMapping.target]);
        const rowHash = (row: number): string => {
            const values: JsonObject = {};
            for (const [column, cells] of Object.entries(edges)) {
                if (!skip.has(column) && cells[row] !== null) {
                    values[column] = cells[row];
                }
            }
            return sha(canon({ source: "activity", row: values }));
        };
        const unkeyed = new Map<string, string>();
        edges[edgeMapping.edgeId].forEach((key, row) => {
            if (key === null) {
                unkeyed.set(
                    `${text(edges[edgeMapping.source][row])}>${text(edges[edgeMapping.target][row])}`,
                    rowHash(row),
                );
            }
        });
        const selected = ((view.selection as JsonObject).edges as JsonObject[])[0];
        const ends = `${text((selected.from as JsonObject).key)}>${text((selected.to as JsonObject).key)}`;
        assert.strictEqual(selected.h, unkeyed.get(ends));
    });

    it("hold equal-length output columns in every result run", () => {
        const results = readJson(new URL("examples/card-fraud.graphty-results.json", SPEC));
        for (const [id, run] of Object.entries(results.runs as Record<string, JsonObject>)) {
            for (const domain of ["nodes", "edges"]) {
                const outputs = run[domain] as JsonObject | undefined;
                if (outputs === undefined) {
                    continue;
                }
                const count = (outputs.refs as Json[]).length;
                for (const [field, values] of Object.entries(outputs.columns as Record<string, Json[]>)) {
                    assert.lengthOf(values, count, `${id}.${domain}.${field}`);
                }
            }
        }
    });
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
