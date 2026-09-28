/**
 * @file The failure and repeat policies of the graph-io import helper: how an importer's report
 * reaches a data source's error aggregator, how a file that must be read whole fails, and how the
 * scratch builder treats a repeated node declaration and an untyped JSON value.
 *
 * The importer here pushes a fixed graph, so every number below is a fact about the helper and not
 * about any one format's parser.
 */
import type { GraphSink } from "@graphty/graph-format";
import { type GraphImporter, type ImportReport, ImportReportBuilder } from "@graphty/graph-io";
import { assert, describe, it } from "vitest";

import { ErrorAggregator } from "../../src/data/ErrorAggregator.js";
import {
    aggregateErrors,
    columnsMapping,
    importDocument,
    importWhole,
    toRecords,
} from "../../src/data/graph-io-import.js";
import { isGraphtyError } from "../../src/errors/index.js";

/**
 * An importer that declares node "a" twice with different labels, writes a value that differs in
 * type between two nodes, and reports one error on line 7 and one warning. With `abort` it gives up
 * after the error instead of finishing.
 * @param abort - throw the importer's failure instead of returning its report
 * @returns the importer
 */
function fixedImporter(abort = false): GraphImporter {
    return {
        format: "fixed",
        extensions: [],
        mimeTypes: [],
        import(_input, sink: GraphSink): Promise<ImportReport> {
            const report = new ImportReportBuilder("fixed", 100);
            sink.setNodeValue("label", sink.addNode("a"), "first");
            sink.setNodeValue("value", sink.addNode("b"), 42);
            sink.setNodeValue("value", sink.addNode("c"), "n/a");
            const again = sink.addNode("a");
            sink.setNodeValue("label", again, "second");
            sink.setNodeValue("extra", again, 1);
            sink.addEdge("a", "b");
            report.warning("coercion", "W_FIXED", "a warning stays in the report");
            report.error("missing-value", "E_MISSING_ENDPOINT", "edge 2 has no target", { line: 7, element: "e2" });
            return abort ? Promise.reject(report.abort("gave up")) : Promise.resolve(report.finish());
        },
    };
}

describe("the graph-io import helper's policies", () => {
    it("copies only the report's errors, in the element's wording for a missing endpoint", async () => {
        const imported = await importDocument(fixedImporter(), "doc", {});
        const errors = new ErrorAggregator();
        aggregateErrors(imported.report, errors);

        const copied = errors.getErrors();
        assert.strictEqual(copied.length, 1);
        assert.strictEqual(copied[0].message, "Missing target: edge 2 has no target");
        assert.strictEqual(copied[0].line, 7);
        assert.strictEqual(copied[0].field, "e2");
    });

    it("stops at the aggregator's limit only when asked to", async () => {
        const imported = await importDocument(fixedImporter(), "doc", {});

        aggregateErrors(imported.report, new ErrorAggregator(0));
        assert.throws(() => {
            aggregateErrors(imported.report, new ErrorAggregator(0), true);
        }, /Too many errors/);
    });

    it("turns a file that must be read whole and was not into E_PARSE_FAILED naming the line", async () => {
        const errors = new ErrorAggregator();
        let thrown: unknown;
        try {
            await importWhole(fixedImporter(true), "doc", {}, errors);
        } catch (error) {
            thrown = error;
        }

        assert.isTrue(isGraphtyError(thrown));
        if (!isGraphtyError(thrown)) {
            return;
        }

        assert.strictEqual(thrown.code, "E_PARSE_FAILED");
        assert.strictEqual(thrown.details.line, 7);
        assert.include(thrown.message, "line 7");
        assert.strictEqual(errors.getErrorCount(), 1);
    });

    it("lets a repeated declaration overwrite the first unless the first is to win", async () => {
        const merged = await importDocument(fixedImporter(), "doc", {});
        const first = await importDocument(fixedImporter(), "doc", {}, [], { firstDeclarationWins: true });

        const labelOf = (imported: typeof merged): unknown =>
            toRecords(imported, columnsMapping(imported.snapshot)).nodes.find((node) => node.id === "a");
        assert.deepStrictEqual(labelOf(merged), { id: "a", label: "second", extra: 1 });
        assert.deepStrictEqual(labelOf(first), { id: "a", label: "first" });
    });

    it("keeps each value's own type in verbatim mode", async () => {
        const inferred = await importDocument(fixedImporter(), "doc", {});
        const verbatim = await importDocument(fixedImporter(), "doc", {}, [], { verbatim: true });

        const values = (imported: typeof inferred): unknown[] =>
            toRecords(imported, columnsMapping(imported.snapshot)).nodes.map((node) => node.value);
        assert.deepStrictEqual(values(inferred), [undefined, "42", "n/a"]);
        assert.deepStrictEqual(values(verbatim), [undefined, 42, "n/a"]);
    });

    it("hands over a record for every node, declared or only named by an edge, when asked", async () => {
        const imported = await importDocument(fixedImporter(), "doc", {});
        const edgeOnly: GraphImporter = {
            ...fixedImporter(),
            import(_input, sink: GraphSink): Promise<ImportReport> {
                sink.addNode("a");
                sink.addEdge("a", "z");
                return Promise.resolve(new ImportReportBuilder("fixed", 100).finish());
            },
        };
        const partial = await importDocument(edgeOnly, "doc", {});

        assert.deepStrictEqual(
            toRecords(partial, columnsMapping(partial.snapshot)).nodes.map((node) => node.id),
            ["a"],
        );
        assert.deepStrictEqual(
            toRecords(partial, columnsMapping(partial.snapshot), true).nodes.map((node) => node.id),
            ["a", "z"],
        );
        assert.strictEqual(imported.declared.size, 3);
    });
});
