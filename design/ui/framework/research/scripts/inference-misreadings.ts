/**
 * Runs graphty-element's own readers over graph files and prints, per file, what the element
 * decided without asking: the format, the direction (declared by the file or defaulted), the
 * endpoint columns, which record key became the edge weight, and the numeric edge columns it left
 * as plain attributes. It also measures reciprocity (the share of ordered node pairs whose reverse
 * pair is also present), so a symmetric edge list read as directed shows up.
 *
 * Run from the graphty-element folder so its dependencies resolve:
 *   cd graphty-element && npx tsx ../design/ui/framework/research/scripts/inference-misreadings.ts <files...>
 *
 * It reads files only; it writes nothing.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";

import { DataSource } from "../../../../../graphty-element/src/data/DataSource";
import { resolveEndpoints } from "../../../../../graphty-element/src/data/endpoints";
import { detectFormat } from "../../../../../graphty-element/src/data/format-detection";
import { resolveEdgeWeight } from "../../../../../graphty-element/src/data/ingest";
import "../../../../../graphty-element/src/data/index";

interface Row {
    file: string;
    format: string | null;
    declared: string;
    readDirected: boolean | null;
    nodes: number;
    edges: number;
    endpoints: string;
    reciprocity: number | null;
    weightFrom: string;
    otherNumericEdgeKeys: string[];
    errors: number;
    failure: string | null;
}

async function inspect(path: string): Promise<Row> {
    const text = readFileSync(path, "utf8");
    const file = basename(path);
    const row: Row = {
        file,
        format: detectFormat(file, text.slice(0, 4096)),
        declared: "none",
        readDirected: null,
        nodes: 0,
        edges: 0,
        endpoints: "-",
        reciprocity: null,
        weightFrom: "-",
        otherNumericEdgeKeys: [],
        errors: 0,
        failure: null,
    };
    if (row.format === null) {
        row.failure = "format not recognised";
        return row;
    }
    const source = DataSource.get(row.format, { data: text });
    if (source === null) {
        row.failure = `no reader for ${row.format}`;
        return row;
    }
    const edges: Record<string, unknown>[] = [];
    try {
        for await (const chunk of source.getData()) {
            row.nodes += chunk.nodes.length;
            edges.push(...(chunk.edges as unknown as Record<string, unknown>[]));
        }
    } catch (err) {
        row.failure = err instanceof Error ? err.message.slice(0, 160) : String(err);
    }
    const declared = source.declaredDirection;
    if (declared !== null) {
        row.declared = `${declared.directed ? "directed" : "undirected"} (${declared.statedBy})`;
    }
    // Under the element's default `data.directed: "auto"`, a silent file is read as directed.
    row.readDirected = declared === null ? true : declared.directed;
    row.edges = edges.length;
    const errorCount = (source as unknown as { errorAggregator: { getErrorCount(): number } }).errorAggregator;
    row.errors = errorCount.getErrorCount();
    if (edges.length === 0) {
        return row;
    }
    let ends;
    try {
        ends = resolveEndpoints(edges, { source: null, target: null });
    } catch (err) {
        row.failure = `endpoints: ${err instanceof Error ? err.message.slice(0, 120) : String(err)}`;
        return row;
    }
    row.endpoints = `${ends.source}/${ends.target}`;
    const pairs = new Set<string>();
    for (const e of edges) {
        const u = String(e[ends.source]);
        const v = String(e[ends.target]);
        if (u !== v) {
            pairs.add(`${u}\u0000${v}`);
        }
    }
    let mutual = 0;
    for (const p of pairs) {
        const [u, v] = p.split("\u0000");
        if (pairs.has(`${v}\u0000${u}`)) {
            mutual++;
        }
    }
    row.reciprocity = pairs.size === 0 ? null : mutual / pairs.size;
    const tally = { path: 0, legacy: 0, default: 0 };
    const numericKeys = new Set<string>();
    for (const e of edges) {
        tally[resolveEdgeWeight(e, "weight").source]++;
        for (const [k, val] of Object.entries(e)) {
            if (typeof val === "number" && k !== ends.source && k !== ends.target) {
                numericKeys.add(k);
            }
        }
    }
    row.weightFrom =
        tally.path > 0 ? `"weight" (${tally.path})` : tally.legacy > 0 ? `"value" (${tally.legacy})` : "none (all 1)";
    row.otherNumericEdgeKeys = [...numericKeys].filter(
        (k) => !(k === "weight" && tally.path > 0) && !(k === "value" && tally.path === 0 && tally.legacy > 0),
    );
    return row;
}

const rows: Row[] = [];
for (const path of process.argv.slice(2)) {
    rows.push(await inspect(path));
}
console.log(JSON.stringify(rows, null, 1));
