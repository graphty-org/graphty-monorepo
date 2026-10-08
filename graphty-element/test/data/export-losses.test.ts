/**
 * @file An export's losses as coded facts (`ExportResult.losses`): every built-in writer reports
 * codes from the documented set (`ExportLossCode`) with the same two params, beside the deprecated
 * English `lossNotes`, and each reports only what the table or file it writes loses.
 */

import {
    CSV_LOSS,
    CX2_LOSS,
    DOT_LOSS,
    GEXF_LOSS,
    GML_LOSS,
    GRAPHML_LOSS,
    JSON_LOSS,
    LOSS,
    NEO4J_LOSS,
    PAJEK_LOSS,
    XGMML_LOSS,
} from "@graphty/graph-io";
import { assert, describe, it } from "vitest";

import { type ExportGraphOptions, type ExportLossCode, exportSession } from "../../src/data/export";
import { type Harness, makeSession } from "../session/helpers";

/** The documented set, read from the same tables `ExportLossCode` is built from. */
const DOCUMENTED: ReadonlySet<string> = new Set<string>([
    ...[
        LOSS,
        CSV_LOSS,
        CX2_LOSS,
        DOT_LOSS,
        GEXF_LOSS,
        GML_LOSS,
        GRAPHML_LOSS,
        JSON_LOSS,
        NEO4J_LOSS,
        PAJEK_LOSS,
        XGMML_LOSS,
    ]
        .flatMap((table): unknown[] => Object.values(table))
        .filter((code): code is string => typeof code === "string"),
    ...([
        "W_GRAPHTY_COLUMN_DROPPED",
        "W_GRAPHTY_NOTES",
        "W_GRAPHTY_TRUNCATED",
        "W_GRAPHTY_CSV_NEUTRALIZED",
        "W_WEIGHT_NOT_NUMERIC",
        "W_RESULT_FIELD_DROPPED",
    ] satisfies ExportLossCode[]),
]);

/** Every built-in writer, with the options that pick a table or a variant. */
const WRITERS: readonly [string, ExportGraphOptions][] = [
    ["json", {}],
    ["csv", {}],
    ["csv", { table: "nodes" }],
    ["csv", { table: "adjacency" }],
    ["csv", { variant: "neo4j" }],
    ["graphml", {}],
    ["gexf", {}],
    ["gml", {}],
    ["dot", {}],
    ["pajek", {}],
    ["xgmml", {}],
    ["cx2", {}],
];

/**
 * A graph that loses something in most formats: list and nested values, reserved columns on nodes
 * and edges, a self-loop and a parallel edge, and a note.
 * @returns The harness.
 */
function lossy(): Harness {
    const h = makeSession({ directed: false });
    h.add(
        [
            { id: "a", tags: ["x", "y"], meta: { deep: true }, "graphty.n": 1 },
            { id: "b", tags: ["z"], score: 2 },
            { id: "c d" },
        ],
        [
            { src: "a", dst: "b", hops: [1, 2], "graphty.e": 1 },
            { src: "a", dst: "b", hops: [3] },
            { src: "c d", dst: "c d" },
        ],
    );
    h.session.notes.add({ text: "look here", targets: [{ node: "a" }] });
    return h;
}

describe("export losses as coded facts", () => {
    for (const [format, options] of WRITERS) {
        it(`${format} ${JSON.stringify(options)}: documented codes, the same params, one per loss note`, () => {
            const h = lossy();
            const result = exportSession(h.session, format, options);

            assert.isNotEmpty(result.losses, "the graph loses something");
            assert.deepEqual(
                result.losses.map((loss) => loss.code),
                result.lossNotes.map((note) => note.code),
                "one fact per note, in order",
            );
            for (const loss of result.losses) {
                assert.isTrue(DOCUMENTED.has(loss.code), `${loss.code} is documented`);
                assert.deepEqual(Object.keys(loss.params).sort(), ["columns", "count"], loss.code);
                assert.isArray(loss.params.columns, loss.code);
                assert.isTrue(Object.isFrozen(loss) && Object.isFrozen(loss.params), loss.code);
            }

            h.session.dispose();
        });
    }

    it("names the columns of a loss, and every one of a loss about several", () => {
        const h = lossy();
        const result = exportSession(h.session, "csv");
        const byCode = (code: string): unknown[] => {
            const columns = result.losses.find((loss) => loss.code === code)?.params.columns;
            return Array.isArray(columns) ? [...columns] : [];
        };

        assert.deepEqual(byCode(CSV_LOSS.NODE_TABLE), ["tags", "meta", "score"]);
        assert.include(byCode("W_GRAPHTY_COLUMN_DROPPED"), "graphty.n");
        h.session.dispose();
    });

    it("the CSV node table reports no edge loss: no edge column, direction or self-loop", () => {
        const h = lossy();
        const edges = exportSession(h.session, "csv");
        const nodes = exportSession(h.session, "csv", { table: "nodes" });
        const columns = (losses: typeof nodes.losses): unknown[] => losses.flatMap((loss) => loss.params.columns);
        const codes = (losses: typeof nodes.losses): string[] => losses.map((loss) => loss.code);

        // The edge table does lose these, so their absence below is the scoping, not the graph.
        assert.include(columns(edges.losses), "graphty.e");
        assert.include(codes(edges.losses), CSV_LOSS.DIRECTION_DROPPED);

        assert.notInclude(columns(nodes.losses), "graphty.e");
        assert.notInclude(columns(nodes.losses), "hops");
        assert.notInclude(codes(nodes.losses), CSV_LOSS.DIRECTION_DROPPED);
        assert.notInclude(codes(nodes.losses), LOSS.SELF_LOOPS);
        assert.notInclude(codes(nodes.losses), LOSS.GRAPH_ATTRIBUTES);
        assert.notInclude(codes(nodes.losses), CSV_LOSS.NODE_TABLE);
        assert.include(columns(nodes.losses), "graphty.n", "the node table's own losses are still there");
        h.session.dispose();
    });
});
