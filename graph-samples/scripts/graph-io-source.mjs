/**
 * Read a dataset source with graph-io's own importer (from graph-io/dist), so the datasets built
 * from Cytoscape sessions, CX2 networks and OBO ontologies are read exactly as graphty reads them,
 * and every hosted build runs the importers on real files.
 *
 * The result is the DatasetData shape of src/datasets/build.ts: a simple graph (self-loops are
 * dropped and parallel edges merged, as every graph-samples dataset is simple), external ids, and
 * the node columns a spec asks for. Needs a built graph-format and graph-io.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = (pkg, file) => pathToFileURL(path.resolve(packageRoot, "..", pkg, "dist", file)).href;
const { GraphBuilder } = await import(dist("graph-format", "graph-format.js"));
const graphIo = await import(dist("graph-io", "graph-io.js"));

/**
 * Import a file with one of graph-io's importers.
 * @param {string} file - the source file
 * @param {string} format - the graph-io format name ("cys", "cx2", "obo", ...)
 * @returns {Promise<import("@graphty/graph-format").GraphSnapshot>} the snapshot
 */
export async function importSource(file, format) {
    const importer = graphIo.registry.importer(format);
    const builder = new GraphBuilder({ directed: true, weightDtype: "f64" });
    const report = await importer.import(new Uint8Array(readFileSync(file)), builder, { ids: "string" });
    if (report.errorCount > 0) {
        throw new Error(
            `${file}: ${report.errorCount} import errors, first: ${report.issues.find((i) => i.severity === "error")?.message}`,
        );
    }
    return builder.freeze();
}

/**
 * A column's value at a row, or undefined when the row has none.
 * @param {object} snapshot - the snapshot
 * @param {string} name - the node column
 * @param {number} row - the node index
 * @returns {unknown} the value
 */
function cell(snapshot, name, row) {
    const column = snapshot.nodes.get(name);
    return column === null || !column.isSet(row) ? undefined : column.value(row);
}

/**
 * The dataset of a snapshot.
 *
 * spec.id names the node column used as each node's id when its values are all present and
 * distinct (else the source's own ids are kept); spec.columns maps an output column to how it is
 * made: { from, dtype: "string" | "f64" | "dict" | "u8", role?, missing? } or
 * { position: 0 | 1, dtype: "f64" } for x or y of the saved position (stored y-up by graph-io).
 * @param {object} snapshot - the imported graph
 * @param {{ id?: string, columns: Record<string, object> }} spec - what to keep
 * @returns {{ data: object, dropped: { loops: number, parallel: number } }} the DatasetData and what was dropped
 */
export function datasetOf(snapshot, spec) {
    const n = snapshot.nodeCount;
    let ids = Array.from({ length: n }, (_, i) => String(snapshot.ids.idOf(i)));
    if (spec.id !== undefined) {
        const named = Array.from({ length: n }, (_, i) => cell(snapshot, spec.id, i));
        if (named.every((v) => typeof v === "string" && v !== "") && new Set(named).size === n) {
            ids = named;
        }
    }
    const edges = [];
    const seen = new Set();
    let loops = 0;
    let parallel = 0;
    for (let e = 0; e < snapshot.edgeCount; e++) {
        const a = snapshot.edgeSource(e);
        const b = snapshot.edgeTarget(e);
        if (a === b) {
            loops++;
            continue;
        }
        const key = `${a},${b}`;
        if (seen.has(key)) {
            parallel++;
            continue;
        }
        seen.add(key);
        edges.push(a, b);
    }
    const columns = {};
    for (const [name, how] of Object.entries(spec.columns)) {
        const raw = Array.from({ length: n }, (_, i) => {
            if (how.position !== undefined) {
                const point = cell(snapshot, "position", i);
                return point === undefined ? undefined : Number(point[how.position]);
            }
            const first = cell(snapshot, how.from, i);
            return first === undefined && how.fallback !== undefined ? cell(snapshot, how.fallback, i) : first;
        });
        switch (how.dtype) {
            case "f64":
                // rounded to 3 decimals, so f32 file coordinates show no float noise; a missing value is
                // null, which buildDataset() loads as NaN
                columns[name] = {
                    dtype: "f64",
                    values: raw.map((v) => (v === undefined ? null : Math.round(Number(v) * 1000) / 1000)),
                };
                break;
            case "u8":
                columns[name] = { dtype: "u8", values: raw.map((v) => (v === true ? 1 : 0)) };
                break;
            case "dict": {
                const values = raw.map((v) => (v === undefined ? how.missing : String(v)));
                const categories = [...new Set(values)].sort();
                columns[name] = { dtype: "dict", categories, codes: values.map((v) => categories.indexOf(v)) };
                break;
            }
            default:
                columns[name] = {
                    dtype: "string",
                    ...(how.role === undefined ? {} : { role: how.role }),
                    values: raw.map((v, i) => (v === undefined ? ids[i] : String(v))),
                };
        }
    }
    return {
        data: { directed: snapshot.directed, nodeCount: n, ids, edges, weights: null, columns },
        dropped: { loops, parallel },
    };
}

/**
 * The fromEdgeArrays input of a dataset: what scripts/build-hosted.mjs publishes.
 * @param {object} data - a DatasetData from datasetOf()
 * @returns {object} directed, nodeCount, ids, src, dst and the node columns
 */
export function edgeArraysOf(data) {
    const m = data.edges.length / 2;
    const src = new Uint32Array(m);
    const dst = new Uint32Array(m);
    for (let e = 0; e < m; e++) {
        src[e] = data.edges[2 * e];
        dst[e] = data.edges[2 * e + 1];
    }
    const nodeColumns = {};
    for (const [name, column] of Object.entries(data.columns)) {
        switch (column.dtype) {
            case "dict":
                nodeColumns[name] = {
                    data: column.codes.map((code) => column.categories[code]),
                    decl: { dtype: "dict", options: column.categories },
                };
                break;
            case "string":
                nodeColumns[name] = { data: column.values, decl: { dtype: "string", role: column.role } };
                break;
            case "u8":
                nodeColumns[name] = Uint8Array.from(column.values);
                break;
            default:
                nodeColumns[name] = Float64Array.from(column.values, (value) => value ?? Number.NaN);
        }
    }
    return { directed: data.directed, nodeCount: data.nodeCount, ids: data.ids, src, dst, nodeColumns };
}
