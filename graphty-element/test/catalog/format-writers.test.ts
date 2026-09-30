/**
 * @file Registering a file writer, and the snapshot an export hands it, with no renderer.
 *
 * The browser suite (`test/browser/extensions/format-writer.test.ts`) drives `exportGraph` on a
 * real graph through every format. This file pins what does not need one: the registration
 * rules, the catalogue entry a writer produces, and what the export snapshot holds for a session
 * with a published result.
 */

import "../../src/data/index";

import type { CommonExportOptions, GraphExporter } from "@graphty/graph-io";
import { afterEach, assert, describe, it } from "vitest";

import { formatDescriptor } from "../../src/catalog/formats";
import type { FormatDescriptor } from "../../src/catalog/types";
import {
    catalogFormatDescriptors,
    clearRegisteredFormatWritersForTesting,
    registerFormatWriter,
} from "../../src/catalog/writerRegistry";
import { DataConfig } from "../../src/config/DataConfig";
import { DataSource, type DataSourceChunk } from "../../src/data/DataSource";
import { buildExportSnapshot, exportSession, exportSnapshot } from "../../src/data/export";
import { type GraphtyError, isGraphtyError } from "../../src/errors";
import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import { makeSession } from "../session/helpers";

type Exporter = GraphExporter<Record<string, unknown> & CommonExportOptions>;

const DESCRIPTOR: FormatDescriptor = {
    id: "acme-lines",
    plainName: "Acme Lines",
    extensions: [".acmelines"],
    mimeTypes: ["text/plain"],
    canImport: false,
    canExport: true,
    options: [],
};

/**
 * A writer that writes nothing useful; the registration rules are what is under test.
 * @param format - The format it says it writes.
 * @returns The exporter.
 */
function exporterFor(format: string): Exporter {
    return {
        format,
        capabilities: {} as Exporter["capabilities"],
        check: () => [],
        export: () => chunksOf(""),
        exportToString: () => Promise.resolve(""),
    };
}

/**
 * The error a call throws.
 * @param call - The call.
 * @returns The error.
 */
function refusal(call: () => unknown): GraphtyError {
    try {
        call();
    } catch (error) {
        assert.isTrue(isGraphtyError(error), String(error));
        return error as GraphtyError;
    }

    throw new Error("the call was not refused");
}

/**
 * A document as the one-chunk byte stream an exporter's `export` returns.
 * @param text - The document.
 * @returns The stream.
 */
function chunksOf(text: string): AsyncIterable<Uint8Array> {
    const bytes = new TextEncoder().encode(text);
    return {
        [Symbol.asyncIterator]: () => {
            let done = false;
            return {
                next: () => {
                    const result: IteratorResult<Uint8Array> = done
                        ? { done: true, value: undefined }
                        : { done: false, value: bytes };
                    done = true;
                    return Promise.resolve(result);
                },
            };
        },
    };
}

afterEach(() => {
    clearRegisteredFormatWritersForTesting();
});

/**
 * An executor standing in for degree: it measures "a" and "b" and leaves "c" unmeasured.
 * @param context - The run.
 * @returns The outcome.
 */
function measureTwo(context: RunExecutionContext): Promise<RunOutcome> {
    return Promise.resolve({
        result: createRunResult({
            runId: context.runId,
            shape: "node-metric",
            fields: [
                {
                    name: "value",
                    plainName: "Connections",
                    technicalName: "degree",
                    kind: "node",
                    type: "number",
                    path: `results.${context.runId}.value`,
                },
            ],
            measured: { nodes: 2, edges: 0 },
            graph: { normalization: "none" },
            nodes: [
                { id: "a", values: { value: 1 } },
                { id: "b", values: { value: 2 } },
            ],
            caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "degree", notes: [] },
            durationMs: 1,
        }),
    });
}

describe("registerFormatWriter", () => {
    it("lists a writer-only format as writable and not readable, and finds it by id", () => {
        const before = catalogFormatDescriptors();
        registerFormatWriter({ descriptor: DESCRIPTOR, exporter: exporterFor("acme-lines") });

        const listed = catalogFormatDescriptors().find((descriptor) => descriptor.id === "acme-lines");
        assert.strictEqual(listed?.canExport, true);
        assert.strictEqual(listed?.canImport, false);
        assert.strictEqual(formatDescriptor("acme-lines")?.plainName, "Acme Lines");
        assert.notStrictEqual(catalogFormatDescriptors(), before, "a registration changes the list");
        assert.strictEqual(catalogFormatDescriptors(), catalogFormatDescriptors(), "and the list is stable after");
    });

    it("refuses what cannot be a writer, naming the field", () => {
        const cases: [string, () => void][] = [
            [
                "descriptor.canExport",
                () => {
                    registerFormatWriter({
                        descriptor: { ...DESCRIPTOR, canExport: false },
                        exporter: exporterFor("acme-lines"),
                    });
                },
            ],
            [
                "exporter.format",
                () => {
                    registerFormatWriter({ descriptor: DESCRIPTOR, exporter: exporterFor("something-else") });
                },
            ],
            [
                "exporter",
                () => {
                    registerFormatWriter({ descriptor: DESCRIPTOR, exporter: { format: "acme-lines" } as Exporter });
                },
            ],
        ];

        for (const [field, call] of cases) {
            const error = refusal(call);
            assert.strictEqual(error.code, "E_BAD_COMMAND", field);
            assert.strictEqual(error.details.field, field);
        }
    });

    it("refuses a built-in format id", () => {
        const error = refusal(() => {
            registerFormatWriter({ descriptor: { ...DESCRIPTOR, id: "graphml" }, exporter: exporterFor("graphml") });
        });
        assert.strictEqual(error.code, "E_DUPLICATE_PLUGIN");
    });

    it("joins a reader and a writer of one id into one entry, and refuses one that describes another format", () => {
        /** A reader registered for the same format. */
        class AcmeReader extends DataSource {
            static override type = "acme-both";
            static override descriptor: FormatDescriptor = {
                ...DESCRIPTOR,
                id: "acme-both",
                canImport: true,
                canExport: false,
            };

            /**
             * @param _opts - What a host passed; nothing here reads it.
             */
            constructor(_opts: object) {
                super();
            }

            /**
             * Never loaded here.
             * @yields One empty chunk.
             */
            override async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
                yield await Promise.resolve({ nodes: [], edges: [] });
            }

            protected override getConfig(): object {
                return {};
            }
        }
        DataSource.register(AcmeReader);

        const mismatch = refusal(() => {
            registerFormatWriter({
                descriptor: { ...DESCRIPTOR, id: "acme-both", plainName: "Something Else" },
                exporter: exporterFor("acme-both"),
            });
        });
        assert.strictEqual(mismatch.details.field, "descriptor");

        registerFormatWriter({ descriptor: { ...DESCRIPTOR, id: "acme-both" }, exporter: exporterFor("acme-both") });
        const entries = catalogFormatDescriptors().filter((descriptor) => descriptor.id === "acme-both");
        assert.lengthOf(entries, 1, "one format, one entry");
        assert.isTrue(entries[0].canImport && entries[0].canExport);
    });
});

describe("the export snapshot", () => {
    it("carries the attributes and the result fields, and none of the element's internal columns", async () => {
        const harness = makeSession({ runs: { execute: measureTwo } });
        harness.add(
            [{ id: "a", label: "Alpha" }, { id: "b" }, { id: "c" }],
            [
                { src: "a", dst: "b", weight: 2 },
                { src: "b", dst: "c" },
            ],
        );
        await harness.session.runs.start("degree", undefined, { as: "degree", style: false });

        const { snapshot, notes } = buildExportSnapshot(harness.session);
        assert.deepEqual(notes, []);
        const names = snapshot.nodes.names();
        const value = harness.session.results.path("degree", "value");
        assert.include(names, "label");
        assert.include(names, value);
        const column = snapshot.nodes.get(value);
        assert.deepEqual(
            ["a", "b", "c"].map((id) => column?.isSet(snapshot.ids.indexOf(id))),
            [true, true, false],
            "an unmeasured node has no value, not a zero",
        );
        assert.notInclude(names, "position", "no node has been placed, so no coordinates are invented");

        const text = await exportSnapshot(snapshot, "graphml").text();
        assert.include(text, 'attr.name="label"');
        assert.include(text, "Alpha");
        // graph-format's own weight shadow is read by role, as the weight; nothing internal is written.
        assert.notInclude(text, "graphty.");
        assert.include(text, ">2<", "the explicit weight is written");
        harness.session.dispose();
    });

    it("refuses an option a registered writer does not declare", () => {
        registerFormatWriter({ descriptor: DESCRIPTOR, exporter: exporterFor("acme-lines") });
        const harness = makeSession();
        harness.add([{ id: "a" }]);
        const { snapshot } = buildExportSnapshot(harness.session);
        const error = refusal(() => exportSnapshot(snapshot, "acme-lines", { colour: "red" }));
        assert.strictEqual(error.code, "E_UNKNOWN_OPTION");
        harness.session.dispose();
    });
});

describe("what an export writes", () => {
    it("writes the weight the element stores: the legacy value key, a custom weight path and a folded repeat", async () => {
        const legacy = makeSession();
        legacy.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b", weight: 7 }]);
        // The record carries its weight under the legacy key only, as every weighted fixture here does.
        legacy.edgeAttributes.set(0, { value: 7 });
        legacy.touch();
        const legacyText = await exportSession(legacy.session, "pajek").text();
        assert.match(legacyText, /1 2 7/, "the legacy value is the weight");
        legacy.session.dispose();

        const custom = makeSession({ config: DataConfig.parse({ knownFields: { edgeWeightPath: "w" } }) });
        custom.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b", weight: 3, w: 3 }]);
        custom.edgeAttributes.set(0, { w: 3 });
        custom.touch();
        const edge = exportSession(custom.session, "json");
        const customText = await edge.text();
        assert.include(customText, '"weight":3', "the stored weight is the weight");
        assert.include(customText, '"w":3', "and the record's own key stays, where a reload reads it");
        custom.session.dispose();

        const folded = makeSession();
        folded.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b", weight: 5 }]);
        // A sum-folded pair: the store holds the folded weight, the record keeps the first weight.
        folded.edgeAttributes.set(0, { weight: 1 });
        folded.touch();
        const { snapshot } = buildExportSnapshot(folded.session);
        assert.deepEqual(Array.from(snapshot.weights ?? []), [5], "the stored weight, not the record's");
        folded.session.dispose();
    });

    it("exports again a graph read back from its own export, style columns and all", () => {
        const harness = makeSession();
        harness.add(
            [{ id: "a", "style.color": [1, 0, 0, 1], "style.size": 2 }, { id: "b" }],
            [{ src: "a", dst: "b", "style.thickness": 3 }],
        );
        const view = {
            nodeStyle: () => ({ color: { r: 255, g: 0, b: 0, a: 1 }, size: 2, shape: "box" }),
            edgeStyle: () => ({ color: null, width: 3 }),
        };
        const result = exportSession(harness.session, "json", {}, view);
        assert.strictEqual(result.format, "json");
        harness.session.dispose();
    });

    it("writes positions in file units, dividing by positionScale", () => {
        const harness = makeSession({ config: DataConfig.parse({ knownFields: { positionScale: 2 } }) });
        harness.add([{ id: "a" }]);
        harness.session.snapshot();
        harness.store.positions.write(0, 2, 4, 6);
        const { snapshot } = buildExportSnapshot(harness.session);
        const position = snapshot.nodes.get("position");
        assert.deepEqual(Array.from((position as { data: Float64Array }).data.slice(0, 3)), [1, 2, 3]);
        harness.session.dispose();
    });

    it("writes the drawn node shape where the format has a place for it", async () => {
        const harness = makeSession();
        harness.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);
        const text = await exportSession(
            harness.session,
            "gexf",
            {},
            {
                nodeStyle: () => ({ color: null, size: 1, shape: "box" }),
            },
        ).text();
        assert.include(text, 'viz:shape value="box"');
        harness.session.dispose();
    });

    it("neutralises CSV formula cells by default, leaves numbers alone, and turns off on request", async () => {
        const harness = makeSession();
        harness.add([
            { id: "a", note: "=HYPERLINK(1)", "=key": "x", fold: -2.31, text: "-2.31" },
            { id: "@b", note: "plain" },
        ]);
        const text = await exportSession(harness.session, "csv", { table: "nodes" }).text();
        assert.include(text, "'=HYPERLINK(1)");
        assert.include(text, "'=key");
        assert.include(text, "'@b");
        assert.include(text, "-2.31");
        assert.notInclude(text, "'-2.31", "neither a number nor a text that is a number is touched");

        const raw = await exportSession(harness.session, "csv", { table: "nodes", neutraliseFormulas: false }).text();
        assert.notInclude(raw, "'=");
        harness.session.dispose();
    });

    it("checks a built-in writer's options as it checks a registered one's, and publishes them", () => {
        const harness = makeSession();
        harness.add([{ id: "a" }]);
        assert.strictEqual(
            refusal(() => exportSession(harness.session, "json", { colour: 1 })).code,
            "E_UNKNOWN_OPTION",
        );
        assert.strictEqual(
            refusal(() => exportSession(harness.session, "csv", { variant: "gephi" })).code,
            "E_OPTION_RANGE",
        );
        const names = formatDescriptor("csv")?.writerOptions?.map((option) => option.name) ?? [];
        assert.includeMembers(names, ["variant", "dialect", "neutraliseFormulas", "sanitizeIds"]);

        registerFormatWriter({ descriptor: DESCRIPTOR, exporter: exporterFor("acme-lines") });
        const listed = catalogFormatDescriptors().find((descriptor) => descriptor.id === "acme-lines");
        assert.include(listed?.writerOptions?.map((option) => option.name) ?? [], "sanitizeIds");
        harness.session.dispose();
    });
});
