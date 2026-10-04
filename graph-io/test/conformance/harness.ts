/**
 * The conformance harness: every fixture under test/conformance/fixtures/<format>/ is read as
 * BYTES through importGraph() (so the byte-decoding layer is exercised, not a pre-decoded string)
 * and compared with the expected-result record in that format's manifest.json. The expectations
 * come from an independent reader (networkx, Graphviz, Python's json and csv modules) or from the
 * format's specification; tools/oracle.py regenerates the oracle-derived ones.
 *
 * checkFixture() and checkRoundTrip() return a list of problems (empty when the fixture conforms)
 * so the test file can assert on it and the report writer can summarise it.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { type Column, type GraphSnapshot, INVALID_INDEX, type NodeId } from "@graphty/graph-format";

import { collectBytes } from "../../src/common/writer.js";
import { importAllGraphs, importGraph, type ImportGraphResult, listGraphs, registry } from "../../src/registry.js";
import { SNIFF_HEAD_BYTES } from "../../src/sniff.js";
import { ImportError, type ImportReport } from "../../src/types.js";
import { compareSnapshots } from "../helpers/roundtrip.js";

/** test/conformance/fixtures. */
const FIXTURES_ROOT = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

/** A node attribute spot check: the column by name, or the column holding a role. */
interface AttrCheck {
    /** The node id. */
    readonly id: NodeId;
    /** The column name. */
    readonly column?: string;
    /** The column role ("label", "position", ...), when no name is given. */
    readonly role?: string;
    /**
     * The expected value; numbers compare with a relative tolerance of 1e-6, arrays element-wise;
     * null: the cell is unset and the column has no default (a value the reader must refuse).
     */
    readonly value: unknown;
}

/** An edge spot check: an edge between two node ids exists and, optionally, has this weight. */
interface EdgeCheck {
    /** The source id. */
    readonly source: NodeId;
    /** The target id. */
    readonly target: NodeId;
    /** The expected weight (1 when the edge has none). */
    readonly weight?: number;
}

/** An edge attribute check: the edge between two node ids has this value in the named column. */
interface EdgeAttrCheck {
    /** The source id. */
    readonly source: NodeId;
    /** The target id. */
    readonly target: NodeId;
    /** The column name; "weight" falls back to the weight role and the arc weights. */
    readonly column: string;
    /** The expected value, compared as in AttrCheck. */
    readonly value: unknown;
}

/** The expected result of importing one fixture. */
interface Expected {
    /** "pass": imports; "fail": throws ImportError; "any": either, but never a crash. */
    readonly outcome: "pass" | "fail" | "any";
    /** An issue code the report must contain (for "fail": the reason it failed). */
    readonly code?: string;
    /** Issue codes the report must not contain (for "any": what the file must not be rejected as). */
    readonly forbidCodes?: readonly string[];
    /** Node count. */
    readonly nodes?: number;
    /** Logical edge count: snapshot edges minus the extra halves of expanded mixed edges. */
    readonly edges?: number;
    /** Whether the snapshot is directed. */
    readonly directed?: boolean;
    /** How many graphs importAllGraphs() returns. */
    readonly graphs?: number;
    /** The names listGraphs() gives the graphs, in order (null for an unnamed graph). */
    readonly graphNames?: readonly (string | null)[];
    /** Node ids that must exist. */
    readonly nodeIds?: readonly NodeId[];
    /** Values the label-role column must hold (on some node). */
    readonly labels?: readonly string[];
    /** Node attribute spot checks. */
    readonly nodeAttrs?: readonly AttrCheck[];
    /** Edge spot checks. */
    readonly edgeChecks?: readonly EdgeCheck[];
    /** Edge attribute checks. */
    readonly edgeAttrs?: readonly EdgeAttrCheck[];
    /** Warning (or error) codes the report must contain. */
    readonly warnings?: readonly string[];
}

/** One fixture of a manifest. */
export interface Fixture {
    /** The path relative to the format directory. */
    readonly file: string;
    /** Where it came from (a URL with the commit, or "authored"). */
    readonly origin: string;
    /** Its licence. */
    readonly license: string;
    /** The upstream commit, release or retrieval date. */
    readonly version: string;
    /** What it exercises. */
    readonly exercises: string;
    /** What produced the expectation: "networkx-3.1", "graphviz-2.43", "python-json", "spec", ... */
    readonly oracle: string;
    /** Import options passed next to the format. */
    readonly options?: Readonly<Record<string, unknown>>;
    /** The expected result. */
    readonly expected: Expected;
    /** Set when graph-io does not meet the expectation today: the cause and its sources.md section. */
    readonly knownFailure?: string;
    /** Set when the import -> export -> import round trip does not hold today: the cause. */
    readonly roundTripFailure?: string;
    /** networkx-differential only: where networkx's own read-back departs from the spec, and why the expectation does not follow it. */
    readonly networkxDisagrees?: string;
    /** Where the oracle departs from the specification: what it does instead, and why the expectation follows the spec. */
    readonly oracleDisagrees?: string;
    /**
     * The format sniffing must rank first for this file with no format given (null: no format at
     * all). Every passing fixture of a SNIFF_CHECKED_FORMATS format is checked as its own format
     * without this field; set it to check a fixture of another format, or a different answer.
     */
    readonly sniffAs?: string | null;
}

/**
 * The formats whose every passing fixture must sniff as its own format, by its file name and by
 * its content alone: the formats added after importOptions() started naming the format, so their
 * sniffers are not exercised by the rest of the suite.
 */
const SNIFF_CHECKED_FORMATS: ReadonlySet<string> = new Set(["xgmml", "cx", "cx2", "cys", "obo"]);

/** A format's manifest.json. */
interface Manifest {
    /** The format name (the directory name). */
    readonly format: string;
    /** What the corpus covers. */
    readonly description: string;
    /** The fixtures. */
    readonly fixtures: readonly Fixture[];
}

/**
 * Every format manifest under fixtures/.
 * @returns the manifests, by format name
 */
export function loadManifests(): Manifest[] {
    return readdirSync(FIXTURES_ROOT, { withFileTypes: true })
        .filter((d) => d.isDirectory() && existsSync(join(FIXTURES_ROOT, d.name, "manifest.json")))
        .map((d) => d.name)
        .sort()
        .map((name) => JSON.parse(readFileSync(join(FIXTURES_ROOT, name, "manifest.json"), "utf-8")) as Manifest);
}

/**
 * The bytes of a fixture.
 * @param format - the format directory
 * @param fixture - the fixture
 * @returns the raw bytes
 */
function fixtureBytes(format: string, fixture: Fixture): Uint8Array {
    return new Uint8Array(readFileSync(join(FIXTURES_ROOT, format, fixture.file)));
}

/**
 * The import options of a fixture.
 * @param format - the format name
 * @param fixture - the fixture
 * @returns the options for importGraph()
 */
function importOptions(format: string, fixture: Fixture): Record<string, unknown> {
    return { format, filename: basename(fixture.file), ...fixture.options };
}

/**
 * The node index of an id, trying the other spelling of a numeric id (the canonical rule turns
 * "1" into 1 for text formats; JSON keeps both).
 * @param snapshot - the snapshot
 * @param id - the id as the oracle spells it
 * @returns the index, or -1
 */
function nodeIndex(snapshot: GraphSnapshot, id: NodeId): number {
    const spellings: NodeId[] = [id];
    if (typeof id === "string" && /^-?(0|[1-9][0-9]*)$/.test(id)) {
        spellings.push(Number(id));
    } else if (typeof id === "number") {
        spellings.push(String(id));
    }
    for (const spelling of spellings) {
        const index = snapshot.ids.indexOf(spelling);
        if (index !== INVALID_INDEX) {
            return index;
        }
    }
    return -1;
}

/**
 * A value as plain data: typed arrays become arrays.
 * @param value - a cell value
 * @returns the plain value
 */
function plain(value: unknown): unknown {
    if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
        return Array.from(value as unknown as ArrayLike<unknown>);
    }
    return value;
}

/**
 * Loose equality for spot checks: numbers within a relative 1e-6, arrays element-wise, records
 * key by key (a json cell; its string form would make any two records agree), null an unset cell,
 * anything else by its string form (so 1 and "1" of an inferred column agree).
 * @param expected - the oracle's value
 * @param actual - graph-io's value
 * @returns true when they agree
 */
function agrees(expected: unknown, actual: unknown): boolean {
    const a = plain(actual);
    // Object.is, not ===: no narrowing, so the string comparison below still sees an unknown
    if (Object.is(expected, null)) {
        // an unset cell, or a null inside a json record
        return a === undefined || a === null;
    }
    if (Array.isArray(expected)) {
        return Array.isArray(a) && a.length === expected.length && expected.every((e, i) => agrees(e, a[i]));
    }
    if (expected !== null && typeof expected === "object") {
        if (a === null || typeof a !== "object" || Array.isArray(a)) {
            return false;
        }
        const e = expected as Record<string, unknown>;
        const r = a as Record<string, unknown>;
        const keys = Object.keys(e);
        return keys.length === Object.keys(r).length && keys.every((k) => k in r && agrees(e[k], r[k]));
    }
    if (typeof expected === "number" && typeof a === "number") {
        if (Number.isNaN(expected)) {
            return Number.isNaN(a);
        }
        return expected === a || Math.abs(expected - a) <= 1e-6 * Math.max(1, Math.abs(expected));
    }
    return String(expected) === String(a);
}

/**
 * A cell as a reader sees it: the value of a set row, the declared default of an unset one (CX2,
 * GraphML and GEXF defaults answer for a missing value), else undefined.
 * @param column - the column
 * @param row - the row
 * @returns the value
 */
function cellOf(column: Column, row: number): unknown {
    if (column.isSet(row)) {
        return column.value(row);
    }
    return column.meta.default === undefined ? undefined : column.value(row);
}

/**
 * Compare an import result with the expectation's counts and spot checks.
 * @param expected - the expectation
 * @param result - the import result
 * @param problems - where mismatches are appended
 */
function checkResult(expected: Expected, result: ImportGraphResult, problems: string[]): void {
    const { snapshot, report } = result;
    const edges = snapshot.edgeCount - report.counts.expandedMixed;
    if (expected.nodes !== undefined && expected.nodes !== snapshot.nodeCount) {
        problems.push(`nodes: expected ${expected.nodes}, got ${snapshot.nodeCount}`);
    }
    if (expected.edges !== undefined && expected.edges !== edges) {
        problems.push(`edges: expected ${expected.edges}, got ${edges}`);
    }
    if (expected.directed !== undefined && expected.directed !== snapshot.directed) {
        problems.push(`directed: expected ${expected.directed}, got ${snapshot.directed}`);
    }
    for (const id of expected.nodeIds ?? []) {
        if (nodeIndex(snapshot, id) < 0) {
            problems.push(`node ${JSON.stringify(id)} missing`);
        }
    }
    if (expected.labels !== undefined) {
        const column = snapshot.nodes.byRole("label");
        const present = new Set<string>();
        for (let i = 0; column !== null && i < snapshot.nodeCount; i++) {
            if (column.isSet(i)) {
                present.add(String(column.value(i)));
            }
        }
        for (const label of expected.labels) {
            if (!present.has(label)) {
                problems.push(`label ${JSON.stringify(label)} missing${column === null ? " (no label column)" : ""}`);
            }
        }
    }
    for (const check of expected.nodeAttrs ?? []) {
        const where = check.column ?? `role:${check.role}`;
        const index = nodeIndex(snapshot, check.id);
        const column =
            check.column === undefined ? snapshot.nodes.byRole(check.role ?? "") : snapshot.nodes.get(check.column);
        if (index < 0 || column === null) {
            problems.push(
                `node ${JSON.stringify(check.id)} ${where}: ${index < 0 ? "no such node" : "no such column"}`,
            );
            continue;
        }
        const actual = cellOf(column, index);
        if (!agrees(check.value, actual)) {
            problems.push(
                `node ${JSON.stringify(check.id)} ${where}: expected ${JSON.stringify(check.value)}, got ${JSON.stringify(plain(actual))}`,
            );
        }
    }
    for (const check of expected.edgeChecks ?? []) {
        const name = `edge ${JSON.stringify(check.source)}->${JSON.stringify(check.target)}`;
        const arc = arcOf(snapshot, check.source, check.target);
        if (arc === INVALID_INDEX) {
            problems.push(`${name} missing`);
            continue;
        }
        if (check.weight !== undefined) {
            // parallel edges: any arc between the two nodes may carry the weight
            const weights = arcsBetween(snapshot, check.source, check.target).map((a) => weightOf(snapshot, a));
            if (!weights.some((w) => agrees(check.weight, w))) {
                problems.push(`${name} weight: expected ${check.weight}, got ${weights.join(", ")}`);
            }
        }
    }
    for (const check of expected.edgeAttrs ?? []) {
        const name = `edge ${JSON.stringify(check.source)}->${JSON.stringify(check.target)} ${check.column}`;
        const arc = arcOf(snapshot, check.source, check.target);
        if (arc === INVALID_INDEX) {
            problems.push(`${name}: no such edge`);
            continue;
        }
        const e = snapshot.arcToEdge[arc];
        const column = snapshot.edges.get(check.column);
        let actual: unknown;
        if (column !== null) {
            actual = cellOf(column, e);
        } else if (check.column === "weight") {
            actual = weightOf(snapshot, arc);
        } else {
            problems.push(`${name}: no such column`);
            continue;
        }
        if (!agrees(check.value, actual)) {
            problems.push(`${name}: expected ${JSON.stringify(check.value)}, got ${JSON.stringify(plain(actual))}`);
        }
    }
}

/**
 * The arc of an edge between two node ids, either orientation.
 * @param snapshot - the snapshot
 * @param source - the source id as the oracle spells it
 * @param target - the target id
 * @returns the arc, or INVALID_INDEX
 */
function arcOf(snapshot: GraphSnapshot, source: NodeId, target: NodeId): number {
    const u = nodeIndex(snapshot, source);
    const v = nodeIndex(snapshot, target);
    if (u < 0 || v < 0) {
        return INVALID_INDEX;
    }
    const arc = snapshot.findArc(u, v);
    // an undirected edge of an expanded mixed graph may be stored the other way round
    return arc === INVALID_INDEX ? snapshot.findArc(v, u) : arc;
}

/**
 * Every arc between two node ids, both ways round (an undirected edge of an expanded mixed graph
 * may be stored the other way round), in arc order.
 * @param snapshot - the snapshot
 * @param source - the source id
 * @param target - the target id
 * @returns the arc indices
 */
function arcsBetween(snapshot: GraphSnapshot, source: NodeId, target: NodeId): number[] {
    const u = nodeIndex(snapshot, source);
    const v = nodeIndex(snapshot, target);
    const arcs: number[] = [];
    if (u < 0 || v < 0) {
        return arcs;
    }
    for (const [from, to] of [
        [u, v],
        [v, u],
    ]) {
        for (let a = snapshot.rowPtr[from]; a < snapshot.rowPtr[from + 1]; a++) {
            if (snapshot.colIdx[a] === to) {
                arcs.push(a);
            }
        }
    }
    return arcs;
}

/**
 * The weight of an arc: the weight role column's value, else the arc weight, else 1.
 * @param snapshot - the snapshot
 * @param arc - the arc
 * @returns the weight
 */
function weightOf(snapshot: GraphSnapshot, arc: number): number {
    const e = snapshot.arcToEdge[arc];
    const column = snapshot.edges.byRole("weight");
    if (column?.isSet(e) === true) {
        return Number(column.value(e));
    }
    return snapshot.weights === null ? 1 : snapshot.weights[arc];
}

/**
 * The issue codes of a report, for the code / warnings / forbidCodes checks.
 * @param report - the report, or null
 * @returns the set of codes
 */
function codesOf(report: ImportReport | null): Set<string> {
    return new Set((report?.issues ?? []).map((i) => i.code));
}

/**
 * Import one fixture as bytes and compare it with its expectation.
 * @param format - the format directory
 * @param fixture - the fixture
 * @returns the problems found, empty when the fixture conforms
 */
export async function checkFixture(format: string, fixture: Fixture): Promise<string[]> {
    const problems: string[] = [];
    const { expected } = fixture;
    let result: ImportGraphResult | null = null;
    let failure: ImportError | null = null;
    try {
        result = await importGraph(fixtureBytes(format, fixture), importOptions(format, fixture));
    } catch (err) {
        if (!(err instanceof ImportError)) {
            const name = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
            return [`crashed instead of an ImportError: ${name.slice(0, 300)}`];
        }
        failure = err;
    }
    const report = result?.report ?? failure?.report ?? null;
    const codes = codesOf(report);
    const errors = (report?.issues ?? []).filter((i) => i.severity === "error").map((i) => i.code);
    if (expected.outcome === "pass") {
        if (result === null) {
            problems.push(`failed: ${[...new Set(errors)].join(", ")}: ${failure?.message.slice(0, 200) ?? ""}`);
        } else {
            checkResult(expected, result, problems);
        }
    } else if (expected.outcome === "fail" && result !== null) {
        problems.push(`imported (${result.snapshot.nodeCount} nodes) where a failure was expected`);
    }
    if (expected.code !== undefined && !codes.has(expected.code)) {
        problems.push(`issue ${expected.code} missing (got ${[...codes].join(", ") || "none"})`);
    }
    for (const code of expected.warnings ?? []) {
        if (!codes.has(code)) {
            problems.push(`issue ${code} missing`);
        }
    }
    for (const code of expected.forbidCodes ?? []) {
        if (codes.has(code)) {
            problems.push(`issue ${code} present`);
        }
    }
    if (expected.graphNames !== undefined && result !== null) {
        const listed = await listGraphs(fixtureBytes(format, fixture), importOptions(format, fixture));
        const names = listed?.map((g) => g.name) ?? null;
        if (JSON.stringify(names) !== JSON.stringify(expected.graphNames)) {
            problems.push(
                `graphNames: expected ${JSON.stringify(expected.graphNames)}, listGraphs gave ${JSON.stringify(names)}`,
            );
        }
    }
    if (expected.graphs !== undefined && result !== null) {
        const all = await importAllGraphs(fixtureBytes(format, fixture), importOptions(format, fixture));
        if (all.length !== expected.graphs) {
            problems.push(`graphs: expected ${expected.graphs}, importAllGraphs returned ${all.length}`);
        }
    }
    return problems;
}

/**
 * Whether a fixture takes part in the round trip: it is expected to import and does today, and
 * graph-io writes its format.
 * @param format - the format name
 * @param fixture - the fixture
 * @returns true when checkRoundTrip() applies
 */
export function roundTrips(format: string, fixture: Fixture): boolean {
    return fixture.expected.outcome === "pass" && fixture.knownFailure === undefined && registry.hasExporter(format);
}

/**
 * Import a fixture, export it in its own format and import that again. Without loss notes from
 * the exporter's check() the two snapshots must be equal; with notes, the declared losses are
 * allowed and only the shape (direction, node and edge counts) must survive.
 * @param format - the format name
 * @param fixture - the fixture
 * @returns the problems found, empty when the round trip holds
 */
export async function checkRoundTrip(format: string, fixture: Fixture): Promise<string[]> {
    try {
        const first = await importGraph(fixtureBytes(format, fixture), importOptions(format, fixture));
        const exporter = registry.exporter(format);
        // a session's node ids are Cytoscape SUIDs; a 2.x session's are names, which need new ones
        const options = format === "cys" ? { sanitizeIds: "mangle" as const } : {};
        const notes = exporter.check(first.snapshot, options);
        // a session is a zip archive: only export() writes it
        const written =
            format === "cys"
                ? await collectBytes(exporter.export(first.snapshot, options))
                : await exporter.exportToString(first.snapshot, options);
        // the exporter writes its own conventions, so the fixture's reading options do not apply;
        // a note that names the reading option a file needs (Typedef nodes) is followed
        const typedefs = notes.some((n) => n.code === "W_TYPEDEF_NODES");
        const second = await importGraph(written, typedefs ? { format, typedefs: "nodes" } : { format });
        if (notes.length === 0) {
            return compareSnapshots(first.snapshot, second.snapshot, { tolerance: 1e-9, limit: 5 }).map(
                (d) => d.message,
            );
        }
        return compareSnapshots(first.snapshot, second.snapshot, { limit: 1 })
            .filter((d) => d.path === "directed" || d.path === "nodeCount" || d.path === "edgeCount")
            .map((d) => `${d.message} (despite loss notes: ${notes.map((n) => n.code).join(", ")})`);
    } catch (err) {
        const name = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        return [`threw: ${name.slice(0, 300)}`];
    }
}

/**
 * The format sniffing must rank first for a fixture, or undefined when the fixture is not
 * sniff-checked.
 * @param format - the format name
 * @param fixture - the fixture
 * @returns the expected format (null: none), or undefined
 */
export function expectedSniff(format: string, fixture: Fixture): string | null | undefined {
    if (fixture.sniffAs !== undefined) {
        return fixture.sniffAs;
    }
    return SNIFF_CHECKED_FORMATS.has(format) && fixture.expected.outcome === "pass" ? format : undefined;
}

/**
 * Sniff a fixture with no format given, once with its file name and once by content alone, and
 * compare the top answer with the expected one.
 * @param format - the format directory
 * @param fixture - the fixture, sniff-checked (expectedSniff() is not undefined)
 * @returns the problems found, empty when both answers are right
 */
export function checkSniff(format: string, fixture: Fixture): string[] {
    const expected = expectedSniff(format, fixture);
    const head = fixtureBytes(format, fixture).subarray(0, SNIFF_HEAD_BYTES);
    const problems: string[] = [];
    for (const filename of [basename(fixture.file), null]) {
        const found = registry.sniff({ filename, head })?.format ?? null;
        if (found !== expected) {
            const how = filename === null ? "by content" : `as ${filename}`;
            problems.push(`sniffed ${how}: expected ${String(expected)}, got ${String(found)}`);
        }
    }
    return problems;
}
