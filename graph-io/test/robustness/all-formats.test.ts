/**
 * Robustness conditions every importer shares, run per format: one code for an empty input, a
 * sink that fills up, a sink that throws a non-Error, lone surrogates and control characters in
 * ids, a DOS end-of-file marker, and the error limit and warning cap on large files.
 */

import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { MAX_TEXT_LENGTH } from "../../src/common/input.js";
import { MAX_WARNINGS_PER_CODE } from "../../src/common/report.js";
import { csvImporter } from "../../src/formats/csv/index.js";
import { dotImporter } from "../../src/formats/dot/index.js";
import { gmlImporter } from "../../src/formats/gml/index.js";
import { graphmlImporter } from "../../src/formats/graphml/index.js";
import { jsonImporter } from "../../src/formats/json/index.js";
import { pajekImporter } from "../../src/formats/pajek/index.js";
import { importGraph } from "../../src/registry.js";
import { type GraphImporter } from "../../src/types.js";
import { cappedSink, codes, importFailure, rejection } from "./helpers.js";

const SURROGATE = String.fromCharCode(0xd800);
const SOH = String.fromCharCode(0x01);
const SUB = String.fromCharCode(0x1a);

/** A thrown value that is not an Error (typed as one only to be throwable). */
const NOT_AN_ERROR = "sink exploded" as unknown as Error;

/** Four nodes, three edges, in each format whose importer a sink can fill up. */
const THREE_EDGES: readonly [string, GraphImporter, string][] = [
    ["dot", dotImporter, "digraph { a -> b; b -> c; c -> d }"],
    ["gml", gmlImporter, "graph [ directed 1 node [ id 1 ] node [ id 2 ] node [ id 3 ] node [ id 4 ] edge [ source 1 target 2 ] edge [ source 2 target 3 ] edge [ source 3 target 4 ] ]"],
    ["json", jsonImporter, JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }], links: [{ source: "a", target: "b" }] })],
    ["graphml", graphmlImporter, '<graphml xmlns="http://graphml.graphdrawing.org/xmlns"><graph edgedefault="directed"><node id="a"/><node id="b"/><node id="c"/><node id="d"/><edge source="a" target="b"/></graph></graphml>'],
    ["pajek", pajekImporter, '*Vertices 4\n1 "a"\n2 "b"\n3 "c"\n4 "d"\n*Arcs\n1 2\n2 3\n3 4\n'],
    ["csv", csvImporter, "source,target\na,b\nb,c\nc,d\n"],
];

describe("robustness: one code for an empty input", () => {
    it("gives E_EMPTY_INPUT for an empty input in every format", async () => {
        for (const format of ["graphml", "gexf", "gml", "pajek", "neo4j", "csv", "json", "dot", "xgmml", "cx", "cx2", "obo", "cys"]) {
            const err = await importFailure(importGraph(format === "cys" ? new Uint8Array(0) : "", { format }));
            expect([format, codes(err.report)]).toEqual([format, ["E_EMPTY_INPUT"]]);
        }
    });

    it("gives E_EMPTY_INPUT for whitespace-only CSV and Neo4j (CSV resolved with E_MISSING_ENDPOINT)", async () => {
        for (const format of ["csv", "neo4j", "gml", "graphml"]) {
            const err = await importFailure(importGraph("  \n\t\r\n", { format }));
            expect([format, codes(err.report)]).toEqual([format, ["E_EMPTY_INPUT"]]);
            expect(err.message).toContain("only whitespace");
        }
    });

    it("still reads an empty CSV adjacency table as the empty graph", async () => {
        const { snapshot, report } = await importGraph("", { format: "csv", table: "adjacency" });
        expect(snapshot.nodeCount).toBe(0);
        expect(report.issues).toEqual([]);
    });
});

describe("robustness: the caller's sink", () => {
    it("stops at once with E_TOO_LARGE when the sink is full, keeping what it holds, in every format", async () => {
        for (const [format, importer, text] of THREE_EDGES) {
            const sink = cappedSink(2);
            const err = await importFailure(importer.import(text, sink));
            expect([format, codes(err.report)]).toEqual([format, ["E_TOO_LARGE"]]);
            expect(err.details.code).toBe("E_TOO_LARGE");
            expect(err.report.issues[0].category).toBe("unsupported");
            expect(err.report.truncated).toBe(false);
            // one issue: the import stopped at the first refusal (it went on before, recording one
            // E_TOO_LARGE per later element, and Pajek cascaded into E_PAJEK_OUTSIDE_SECTION); the
            // sink keeps its partial graph
            expect(sink.nodeCount).toBeGreaterThanOrEqual(2);
        }
    });

    it("lets a non-Error the sink throws propagate unchanged", async () => {
        for (const [format, importer, text] of THREE_EDGES) {
            const sink = new GraphBuilder({ directed: true, weightDtype: "f64" });
            sink.addNode = (): never => {
                throw NOT_AN_ERROR;
            };
            sink.addEdge = (): never => {
                throw NOT_AN_ERROR;
            };
            expect([format, await rejection(importer.import(text, sink))]).toEqual([format, "sink exploded"]);
        }
    });
});

describe("robustness: what an id may hold", () => {
    it("skips an element whose id is a lone surrogate with E_INVALID_ID in CSV, DOT and GML", async () => {
        const cases: [string, string][] = [
            ["csv", `source,target\n${SURROGATE},b\nc,d\n`],
            ["dot", `digraph { "${SURROGATE}" -> b; c -> d }`],
            ["gml", `graph [ node [ id "${SURROGATE}" ] node [ id "c" ] node [ id "d" ] edge [ source "c" target "d" ] ]`],
        ];
        for (const [format, text] of cases) {
            const { snapshot, report } = await importGraph(text, { format });
            expect([format, codes(report).filter((c) => c.startsWith("E_"))]).toEqual([format, ["E_INVALID_ID"]]);
            expect(snapshot.ids.toArray()).not.toContain(SURROGATE);
            expect(snapshot.ids.toArray()).toEqual(expect.arrayContaining(["c", "d"]));
        }
    });

    it("rejects a lone surrogate in a Pajek label as a bad label value (Pajek ids are vertex numbers)", async () => {
        const { snapshot, report } = await importGraph(`*Vertices 2\n1 "${SURROGATE}"\n2 "b"\n*Arcs\n1 2\n`, { format: "pajek" });
        expect(codes(report)).toEqual(["E_COLUMN_TYPE"]);
        expect(report.issues[0].line).toBe(2);
        expect(snapshot.edgeCount).toBe(1);
    });

    it("warns about a control character in an id in CSV, DOT, GML and Pajek; the id keeps it", async () => {
        const cases: [string, string, string][] = [
            ["csv", `source,target\na${SOH},b\n`, `a${SOH}`],
            ["dot", `digraph { "a${SOH}" -> b }`, `a${SOH}`],
            ["gml", `graph [ node [ id "a${SOH}" ] node [ id "b" ] ]`, `a${SOH}`],
            ["pajek", `*Vertices 2 \n1 "a${SOH}"\n2 "b"\n*Arcs\n1 2\n`, "1"],
        ];
        for (const [format, text, id] of cases) {
            const { snapshot, report } = await importGraph(text, { format });
            const warning = report.issues.find((i) => i.code === "W_CONTROL_CHARACTER");
            expect([format, warning?.element]).toEqual([format, "U+0001"]);
            expect(snapshot.ids.toArray().map(String)).toContain(id);
        }
    });

    it("ignores a trailing Ctrl-Z in Pajek, CSV and GML with a warning, never as part of the last id", async () => {
        const cases: [string, string, string][] = [
            ["pajek", `*Vertices 2\n1 "a"\n2 "b"\n*Arcs\n1 2${SUB}`, "2"],
            ["csv", `source,target\na,b${SUB}`, "b"],
            ["gml", `graph [ node [ id 1 ] node [ id 2 ] ]${SUB}`, "2"],
        ];
        for (const [format, text, last] of cases) {
            const { snapshot, report } = await importGraph(text, { format });
            expect([format, codes(report)]).toEqual([format, ["W_CONTROL_CHARACTER"]]);
            expect(String(snapshot.ids.toArray().at(-1))).toBe(last);
        }
    });
});

describe("robustness: the error limit and the warning cap on large files", () => {
    it("keeps every error under errorLimit Infinity (200,000 malformed rows)", async () => {
        const rows = 200_000;
        const text = `source,target,weight\n${"a,b,x\n".repeat(rows)}`;
        const { report } = await importGraph(text, { format: "csv", errorLimit: Infinity });
        expect(report.errorCount).toBe(rows);
        expect(report.issues.filter((i) => i.code === "E_INVALID_WEIGHT")).toHaveLength(rows);
        expect(report.truncated).toBe(false);
    });

    it("keeps the first warnings of one code and counts the rest in one W_ISSUES_SUPPRESSED", async () => {
        const rows = 100_000;
        const { snapshot, report } = await importGraph(`id\n${"a\n".repeat(rows)}`, { format: "csv", table: "nodes" });
        expect(snapshot.nodeCount).toBe(1);
        expect(report.issues.filter((i) => i.code === "W_DUPLICATE_NODE")).toHaveLength(MAX_WARNINGS_PER_CODE);
        const summary = report.issues.filter((i) => i.code === "W_ISSUES_SUPPRESSED");
        expect(summary).toHaveLength(1);
        expect(summary[0].element).toBe("W_DUPLICATE_NODE");
        expect(summary[0].message).toContain(`${rows - 1 - MAX_WARNINGS_PER_CODE} more`);
        expect(report.warningCount).toBe(report.issues.length);
    });
});

describe("robustness: text longer than one JavaScript string", () => {
    const piece = "x".repeat(16 * 1024 * 1024);
    const count = Math.ceil(MAX_TEXT_LENGTH / piece.length) + 1;

    async function* longText(first: string, separator: string): AsyncGenerator<string> {
        yield first;
        for (let i = 0; i < count; i++) {
            yield separator + piece;
        }
        await Promise.resolve();
    }

    it("refuses a GML or DOT document longer than one string with E_TOO_LARGE, not a raw RangeError", async () => {
        for (const [format, first] of [
            ["gml", "graph [ comment "],
            ["dot", "digraph { "],
        ] as const) {
            const err = await importFailure(importGraph(longText(first, ""), { format }));
            expect([format, codes(err.report)]).toEqual([format, ["E_TOO_LARGE"]]);
            expect(err.report.issues[0].category).toBe("unsupported");
        }
    });

    it("refuses a line longer than one string with E_TOO_LARGE naming the line (Pajek, OBO)", async () => {
        for (const [format, first] of [
            ["pajek", "*Vertices 1\n1 "],
            ["obo", "format-version: 1.2\n\n[Term]\nid: X:1\nname: "],
        ] as const) {
            const err = await importFailure(importGraph(longText(first, ""), { format }));
            expect([format, codes(err.report)]).toEqual([format, ["E_TOO_LARGE"]]);
            expect(err.message).toContain("a line is longer than");
            expect(err.report.issues[0].line).toBeGreaterThan(1);
        }
    });
});
