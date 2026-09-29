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
import { DataSource, type DataSourceChunk } from "../../src/data/DataSource";
import { buildExportSnapshot, exportSnapshot } from "../../src/data/export";
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
