/**
 * The style verification harness: imports a file with its styles and checks that the planned rules reproduce what
 * the file's reader read, element by element (design 7.1), and, for a format that writes styles, that exporting and
 * importing again gives the same rules and values back (design 10.7). A format takes part by registering itself
 * from a module in `test/styles/formats/`; its committed corpus lives in `test/corpus/styles/<name>/`.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";

import type { GraphSnapshot } from "@graphty/graph-format";

import { createRegistry, type FormatRegistry, type ImportGraphOptions } from "../../src/registry.js";
import {
    type ExtractedStyles,
    extractStyles,
    isStyleValue,
    MAX_STYLE_RULES,
    resolveStyles,
    STYLE_PROPERTIES,
    StyleBudget,
    type StyleNote,
    StyleNotes,
    type StyleProperty,
    type StyleRule,
    type StyleTarget,
    type StyleValue,
    toolDefaults,
    writeStyleBlock,
} from "../../src/styles/internal.js";
import { readStyleValues } from "../../src/styles/io/generic.js";
import { heldEdgeRows } from "../../src/styles/plan/features.js";
import { isShortPredicate, matches, refSource, resolveRules, within } from "../../src/styles/plan/resolve.js";
import type { GraphImporter, ImportReport, LossNote } from "../../src/types.js";

/** The committed style corpus, one directory per format. */
export const STYLE_CORPUS = resolve(import.meta.dirname, "../corpus/styles");

const TARGETS: readonly StyleTarget[] = ["node", "edge"];

/** A graph as an importer read it: what `extractStyles()` takes. */
export interface LoadedGraph {
    /** The graph. */
    readonly snapshot: GraphSnapshot;
    /** The importer that read it. */
    readonly importer: GraphImporter;
    /** The report its `import()` returned (the original object, which carries what the import kept for styles). */
    readonly report: ImportReport;
    /** What `importGraph(..., { styles: true })` returned for it, when it was read that way. */
    readonly imported?: ExtractedStyles | null;
}

/** One input of the harness. */
export interface StyleInput {
    /** A name that identifies it in failures and in RESULTS.md. */
    readonly name: string;
    /** Reads it; a rejection is recorded as an import failure, not a style failure. */
    load(): Promise<LoadedGraph>;
    /** The file's bytes, when it is a file (for mutants). */
    readonly bytes?: Uint8Array;
}

/** How a format writes styles, for the round trip. */
export interface StyleWriter {
    /** The registry holding the format's exporter and importer; defaults to `createRegistry()`. */
    registry?(): FormatRegistry;
    /** The format name to export with. */
    readonly format: string;
    /** The format name to import the written file with; defaults to `format`. */
    readonly importFormat?: string;
    /** Export options beside `styles` (GraphML's `sanitizeIds: "mangle"` for node ids that are not XML names). */
    readonly options?: Readonly<Record<string, unknown>>;
    /**
     * Changes one element's value in the format's own style slot of a written file, as another program would, or
     * returns null when the file has no such value.
     */
    editNative?(written: Uint8Array): Uint8Array | null;
    /** Replaces the `graphty.styles` block of a written file with `change(block)`. */
    replaceBlock?(written: Uint8Array, change: (block: string) => string): Uint8Array;
}

/** A format taking part in the harness. */
export interface StyleFormat {
    /** Its corpus directory under `test/corpus/styles/`, and its name in RESULTS.md. */
    readonly name: string;
    /** The graph-io format its corpus files are read as; defaults to `name`. */
    readonly format?: string;
    /** Whether to read the corpus directory; defaults to true. */
    readonly corpus?: boolean;
    /** Which corpus files are inputs (by path relative to the directory); defaults to every file. */
    accepts?(rel: string): boolean;
    /** The registry its files are read with; defaults to `createRegistry()`. */
    registry?(): FormatRegistry;
    /** Inputs made by code, read beside the corpus. */
    inputs?(): readonly StyleInput[];
    /** Reads one corpus file another way than through `importGraph()` (the Cytoscape.js stylesheet sets). */
    load?(name: string, bytes: Uint8Array): Promise<LoadedGraph>;
    /** How the format writes styles; absent for a format with no style writer yet. */
    readonly writer?: StyleWriter;
    /** Hostile copies of each styled file to check as well (design 7.4); defaults to none. */
    readonly mutantsPerFile?: number;
}

const FORMATS = new Map<string, StyleFormat>();

/**
 * Adds a format to the harness. Called by a module in `test/styles/formats/`.
 * @param format - the format
 */
export function registerStyleFormat(format: StyleFormat): void {
    FORMATS.set(format.name, format);
}

/**
 * Loads every module in `test/styles/formats/` and returns the formats they registered, by name.
 * @returns the formats
 */
export async function styleFormats(): Promise<readonly StyleFormat[]> {
    const dir = resolve(import.meta.dirname, "formats");
    for (const f of readdirSync(dir).sort()) {
        if (f.endsWith(".ts")) {
            await import(pathToFileURL(join(dir, f)).href);
        }
    }
    return [...FORMATS.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Every committed file of a corpus directory (recursively), except its SOURCES.md, relative to it.
 * @param dir - the directory
 * @returns the relative paths, sorted
 */
export function corpusFiles(dir: string): string[] {
    const out: string[] = [];
    const walk = (d: string): void => {
        for (const e of readdirSync(d, { withFileTypes: true })) {
            const p = join(d, e.name);
            if (e.isDirectory()) {
                walk(p);
            } else if (p !== join(dir, "SOURCES.md")) {
                out.push(relative(dir, p));
            }
        }
    };
    try {
        if (statSync(dir).isDirectory()) {
            walk(dir);
        }
    } catch {
        return [];
    }
    return out.sort();
}

/**
 * A corpus file's bytes, decompressed when it is stored as `.gz`, and its name without `.gz`.
 * @param path - the file
 * @returns the bytes and the file name the importer is told
 */
export function readCorpusFile(path: string): { readonly bytes: Uint8Array; readonly filename: string } {
    const raw = readFileSync(path);
    if (path.endsWith(".gz")) {
        return { bytes: new Uint8Array(gunzipSync(raw)), filename: basename(path).slice(0, -3) };
    }
    return { bytes: new Uint8Array(raw), filename: basename(path) };
}

/**
 * Imports a file with its styles through a registry and keeps the importer's own report, which carries what the
 * import kept for its styles (`importGraph()` hands back a copy without it).
 * @param registry - the registry
 * @param format - the format to read it as
 * @param bytes - the file
 * @param options - other import options
 * @returns the graph as read
 */
export async function importForStyles(
    registry: FormatRegistry,
    format: string,
    bytes: Uint8Array,
    options: ImportGraphOptions = {},
): Promise<LoadedGraph> {
    const real = registry.importer(format);
    let report: ImportReport | null = null;
    const watched: GraphImporter = Object.create(real, {
        import: {
            value: async (...args: Parameters<GraphImporter["import"]>): Promise<ImportReport> => {
                report = await real.import(...args);
                return report;
            },
        },
    }) as GraphImporter;
    registry.registerImporter(watched);
    try {
        const result = await registry.importGraph(bytes, { errorLimit: Infinity, ...options, format, styles: true });
        if (report === null) {
            throw new Error(`${format}: the importer's import() was not called`);
        }
        return { snapshot: result.snapshot, importer: real, report, imported: result.styles ?? null };
    } finally {
        registry.registerImporter(real);
    }
}

/**
 * The inputs of a format: its corpus files, then its inputs made by code.
 * @param format - the format
 * @returns the inputs
 */
export function formatInputs(format: StyleFormat): StyleInput[] {
    const out: StyleInput[] = [];
    if (format.corpus !== false) {
        const dir = join(STYLE_CORPUS, format.name);
        for (const rel of corpusFiles(dir).filter((r) => format.accepts?.(r) ?? true)) {
            const { bytes, filename } = readCorpusFile(join(dir, rel));
            out.push(fileInput(format, `${format.name}/${rel}`, bytes, filename));
        }
    }
    out.push(...(format.inputs?.() ?? []));
    return out;
}

/**
 * One file as an input of a format.
 * @param format - the format
 * @param name - its name in failures and RESULTS.md
 * @param bytes - its bytes
 * @param filename - the name the importer is told
 * @returns the input
 */
export function fileInput(format: StyleFormat, name: string, bytes: Uint8Array, filename: string): StyleInput {
    return {
        name,
        bytes,
        load: () =>
            format.load !== undefined
                ? format.load(filename, bytes)
                : importForStyles(format.registry?.() ?? createRegistry(), format.format ?? format.name, bytes, {
                      filename,
                  }),
    };
}

/** What one input gave: the counts and measures RESULTS.md records. */
export interface StyleResult {
    /** The input's name. */
    readonly name: string;
    /** "ok", or the code the import was rejected with. */
    import: string;
    /** Element counts. */
    nodes: number;
    edges: number;
    /** Whether the file has styles. */
    styled: boolean;
    /** Rules per target. */
    nodeRules: number;
    edgeRules: number;
    /** Elements whose value is the writing tool's default. */
    toolValues: number;
    /** Values that differ from their property's most common value. */
    varying: number;
    /** ...of which come from a rule that only copies values (an unexplained passthrough or the exceptions). */
    opaque: number;
    /** ...of which come from the exceptions rule. */
    exceptions: number;
    /** Values that match only within a rounding a note names for the element. */
    approximated: number;
    /** Declared rules that select no element. */
    declaredEmpty: number;
    /** Distinct note codes. */
    notes: string[];
}

/** What checking one input found. */
interface StyleCheck {
    /** The counts and measures. */
    readonly result: StyleResult;
    /** Everything that is wrong, one line each, naming the element and property. */
    readonly failures: string[];
}

/** The per-element truth: each property's canonical value, by element index. */
type StyleTruthValues = Partial<
    Record<StyleTarget, Readonly<Record<string, readonly (StyleValue | null)[] | undefined>>>
>;

/**
 * Text that is the same for the same value: object members in key order and Maps as sorted entries, so two
 * extractions compare equal exactly when they hold the same rules, columns, features and fingerprint.
 * @param value - the value
 * @returns its text
 */
function stableJson(value: unknown): string {
    return JSON.stringify(value, (_k, v: unknown) => {
        if (v instanceof Map) {
            return { "<map>": [...(v as Map<unknown, unknown>).entries()] };
        }
        if (typeof v === "bigint") {
            return `${v.toString()}n`;
        }
        if (v !== null && typeof v === "object" && !Array.isArray(v)) {
            const sorted: Record<string, unknown> = {};
            for (const k of Object.keys(v).sort()) {
                sorted[k] = (v as Record<string, unknown>)[k];
            }
            return sorted;
        }
        return v;
    });
}

/**
 * What is not plain JSON in a value: undefined members, non-finite numbers, functions, Maps, Sets, class instances.
 * @param value - the value
 * @returns one line per problem, with its path
 */
function nonJson(value: unknown): string[] {
    const out: string[] = [];
    const stack: [unknown, string][] = [[value, "$"]];
    while (stack.length > 0 && out.length < 8) {
        const [v, path] = stack.pop() as [unknown, string];
        if (v === null || typeof v === "string" || typeof v === "boolean") {
            continue;
        }
        if (typeof v === "number") {
            if (!Number.isFinite(v)) {
                out.push(`${path} is ${String(v)}`);
            }
            continue;
        }
        if (typeof v !== "object") {
            out.push(`${path} is ${typeof v}`);
            continue;
        }
        if (Array.isArray(v)) {
            v.forEach((x, i) => stack.push([x, `${path}[${String(i)}]`]));
            continue;
        }
        const proto = Object.getPrototypeOf(v) as unknown;
        if (proto !== Object.prototype && proto !== null) {
            out.push(`${path} is not a plain object`);
            continue;
        }
        for (const [k, x] of Object.entries(v)) {
            if (x === undefined) {
                out.push(`${path}.${k} is undefined`);
            } else {
                stack.push([x, `${path}.${k}`]);
            }
        }
    }
    return out;
}

/**
 * How an element is named in a failure: its id and index.
 * @param snapshot - the graph
 * @param target - nodes or edges
 * @param i - the index
 * @returns the name
 */
function elementName(snapshot: GraphSnapshot | undefined, target: StyleTarget, i: number): string {
    if (snapshot === undefined) {
        return `${target} ${String(i)}`;
    }
    if (target === "node") {
        return `node ${JSON.stringify(snapshot.ids.idOf(i))} (index ${String(i)})`;
    }
    const s = snapshot.ids.idOf(snapshot.edgeSource(i));
    const t = snapshot.ids.idOf(snapshot.edgeTarget(i));
    return `edge ${String(i)} (${JSON.stringify(s)} -> ${JSON.stringify(t)})`;
}

/** Whether a rule only copies values: the exceptions, or a passthrough nothing explains. */
function opaqueRule(rule: StyleRule): boolean {
    return rule.role === "exceptions" || (rule.role === "passthrough" && rule.facts?.reason === "NO_EXPLANATION");
}

/**
 * Checks styles against the per-element truth the reader read (design 7.1): every property resolves to the file's
 * value, or, where the file has none, to the writing tool's default from the tool-defaults table; a value differs
 * only within a rounding a note names for that element; no rule but the tool's defaults paints an element the file
 * left unstyled; the visibility is the file's; at most 16 rules per target with predicates of at most 8 terms; only
 * W_STYLE_ note codes; plain JSON.
 * @param ex - the styles
 * @param truth - each element's value per property
 * @param snapshot - the graph, to read data columns and degrees from and to name elements
 * @param name - the input's name, for the result
 * @returns the result and the failures
 */
export function checkStyles(
    ex: ExtractedStyles,
    truth: StyleTruthValues,
    snapshot: GraphSnapshot | undefined,
    name = "styles",
): StyleCheck {
    const failures: string[] = [];
    const fail = (line: string): void => {
        if (failures.length < 40) {
            failures.push(line);
        }
    };
    const result = emptyResult(name);
    result.styled = true;
    result.nodes = ex.fingerprint.nodes;
    result.edges = ex.fingerprint.edges;
    result.notes = [...new Set(ex.styles.notes.map((n) => n.code))].sort();
    for (const code of result.notes) {
        if (!code.startsWith("W_STYLE_")) {
            fail(`a note has the code ${code}, which is not a W_STYLE_ code`);
        }
    }
    for (const problem of nonJson(ex.styles)) {
        fail(`the styles are not plain JSON: ${problem}`);
    }
    const tool = ex.styles.source.tool === null ? null : toolDefaults(ex.styles.source.tool);
    for (const target of TARGETS) {
        const rules = ex.styles.rules.filter((r) => r.target === target);
        if (target === "node") {
            result.nodeRules = rules.length;
        } else {
            result.edgeRules = rules.length;
        }
        if (rules.length > MAX_STYLE_RULES) {
            fail(`${String(rules.length)} ${target} rules, over the bound of ${String(MAX_STYLE_RULES)}`);
        }
        if (new Set(rules.map((r) => r.id)).size !== rules.length) {
            fail(`two ${target} rules share an id`);
        }
        const n = target === "node" ? ex.fingerprint.nodes : ex.fingerprint.edges;
        const src = refSource(target, n, ex.columns[target], ex.features[target], snapshot);
        for (const r of rules) {
            if (!isShortPredicate(r.where)) {
                fail(`rule ${r.id} selects with a predicate that is not a short form of at most 8 terms`);
            }
            if (r.origin === "declared") {
                let any = false;
                for (let i = 0; i < n && !any; i++) {
                    any = matches(r.where, src, i);
                }
                if (!any && n > 0) {
                    result.declaredEmpty++;
                }
            }
            // a file graphty wrote carries the writing tool's rules in its block, not in the table of "graphty"
            if (r.origin === "tool" && ex.styles.source.tool !== "graphty") {
                checkToolRule(r, target, tool, fail);
            }
        }
        const t = truth[target] ?? {};
        const properties = new Set<string>(Object.keys(t));
        for (const r of rules) {
            for (const p of [...Object.keys(r.set ?? {}), ...Object.keys(r.map ?? {})]) {
                properties.add(p);
            }
        }
        for (const p of [...properties].sort()) {
            const values = carried(ex, target, p, t[p], fail);
            if (values !== null) {
                checkProperty(ex, target, p, values, rules, src, snapshot, result, fail);
            }
        }
    }
    return { result, failures };
}

/**
 * The file's values of a property as the planner takes them: a property outside the vocabulary is not carried, and a
 * value of the wrong kind is no value; each only with a note that says so, for the property or for that element.
 * @param ex - the styles
 * @param target - nodes or edges
 * @param property - the property
 * @param values - the reader's values
 * @param fail - records a failure
 * @returns the values to check, or null when the property is not carried
 */
function carried(
    ex: ExtractedStyles,
    target: StyleTarget,
    property: string,
    values: readonly (StyleValue | null)[] | undefined,
    fail: (line: string) => void,
): readonly (StyleValue | null)[] | undefined | null {
    const noted = (code: string): StyleNote[] =>
        ex.styles.notes.filter((n) => n.code === code && n.params.target === target && n.params.property === property);
    if (!STYLE_PROPERTIES[target].has(property) && !property.startsWith("graphty:")) {
        if (values?.some((v) => v !== null) === true && noted("W_STYLE_NOT_CARRIED").length === 0) {
            fail(`${target} ${property} is not a style property, and no W_STYLE_NOT_CARRIED note says so`);
        }
        return null;
    }
    if (values === undefined) {
        return values;
    }
    const bad = new Set(noted("W_STYLE_BAD_VALUE").flatMap((n) => (Array.isArray(n.elements) ? n.elements : [])));
    return values.map((v, i) => {
        if (v === null || isStyleValue(target, property, v)) {
            return v;
        }
        if (!bad.has(i)) {
            fail(
                `${target} ${String(i)} ${property}: the reader's value ${JSON.stringify(v)} is not a ${property}, and no note names the element`,
            );
        }
        return null;
    });
}

/**
 * A rule of the writing tool's defaults only sets values, and one that applies to every element sets exactly the
 * defaults of the tool-defaults table. A tool whose defaults are themselves a stylesheet (Cytoscape.js draws
 * selected nodes and compound parents its own way) also has conditional default rules, which the table does not
 * list.
 * @param rule - the rule
 * @param target - nodes or edges
 * @param tool - the tool's defaults
 * @param fail - records a failure
 */
function checkToolRule(
    rule: StyleRule,
    target: StyleTarget,
    tool: ReturnType<typeof toolDefaults>,
    fail: (line: string) => void,
): void {
    // a default that is itself per element (Gephi's edge in its source node's color and as thick as its weight,
    // Graphviz's node named by its name) maps a style column
    const perElement = new Set(["SOURCE_NODE_COLOR", "EDGE_WEIGHT", "NODE_NAME"]);
    if (rule.map !== undefined && !perElement.has(rule.facts?.reason ?? "")) {
        fail(`the tool-defaults rule ${rule.id} maps values instead of setting them`);
    }
    if (!("all" in rule.where)) {
        return;
    }
    const table = (tool?.[target] ?? {}) as Readonly<Record<string, { readonly value: unknown } | undefined>>;
    for (const [p, v] of Object.entries(rule.set ?? {})) {
        const want = table[p]?.value;
        if (want !== v) {
            fail(
                `the tool-defaults rule ${rule.id} sets ${target} ${p} to ${JSON.stringify(v)}, the table says ${JSON.stringify(want)}`,
            );
        }
    }
}

/**
 * Checks one property of one target, element by element, and adds to the measures.
 * @param ex - the styles
 * @param target - nodes or edges
 * @param property - the property
 * @param fileValues - the file's values, or undefined when the file has none
 * @param rules - the target's rules
 * @param src - the reference source
 * @param snapshot - the graph
 * @param result - the measures to add to
 * @param fail - records a failure
 */
function checkProperty(
    ex: ExtractedStyles,
    target: StyleTarget,
    property: string,
    fileValues: readonly (StyleValue | null)[] | undefined,
    rules: readonly StyleRule[],
    src: ReturnType<typeof refSource>,
    snapshot: GraphSnapshot | undefined,
    result: StyleResult,
    fail: (line: string) => void,
): void {
    const { n } = src;
    const writes = (r: StyleRule): boolean =>
        Object.hasOwn(r.set ?? {}, property) || Object.hasOwn(r.map ?? {}, property);
    const writers = rules.filter(writes).reverse();
    const byRule = writers.map((r) => resolveRules([r], target, property, src));
    const got = resolveStyles(ex, target, property as StyleProperty, snapshot);
    const rounded = new Set<number>();
    for (const note of ex.styles.notes) {
        if (
            note.code === "W_STYLE_RAMP_ROUNDED" &&
            note.params.target === target &&
            note.params.property === property &&
            Array.isArray(note.elements)
        ) {
            for (const i of note.elements) {
                rounded.add(i);
            }
        }
    }
    const freq = new Map<StyleValue, number>();
    for (let i = 0; i < n; i++) {
        const v = fileValues?.[i] ?? null;
        if (v !== null) {
            freq.set(v, (freq.get(v) ?? 0) + 1);
        }
    }
    let mode: StyleValue | null = null;
    let most = -1;
    for (const [v, c] of freq) {
        if (c > most) {
            mode = v;
            most = c;
        }
    }
    const text = /label|tooltip/i.test(property);
    for (let i = 0; i < n; i++) {
        let provider: StyleRule | null = null;
        for (let k = 0; k < writers.length; k++) {
            if (byRule[k][i] !== null) {
                provider = writers[k];
                break;
            }
        }
        const file = fileValues?.[i] ?? null;
        const have = got[i];
        if (file === null) {
            // a file graphty wrote: where its own slot lost a value (an outside edit), the block's rules still give it
            if (provider !== null && provider.origin !== "tool" && ex.styles.source.tool !== "graphty") {
                fail(
                    `${elementName(snapshot, target, i)} ${property}: rule ${provider.id} paints ${JSON.stringify(have)}, the file leaves it unstyled`,
                );
            } else if (provider !== null) {
                result.toolValues++;
            }
            continue;
        }
        if (have !== file) {
            if (rounded.has(i) && within(have, file)) {
                result.approximated++;
            } else {
                fail(
                    `${elementName(snapshot, target, i)} ${property}: the rules give ${JSON.stringify(have)}, the file has ${JSON.stringify(file)}`,
                );
            }
            continue;
        }
        if (file !== mode && !text) {
            result.varying++;
            if (provider !== null && opaqueRule(provider)) {
                result.opaque++;
            }
            if (provider?.role === "exceptions") {
                result.exceptions++;
            }
        }
    }
}

/**
 * A result with every count at zero.
 * @param name - the input's name
 * @returns the result
 */
function emptyResult(name: string): StyleResult {
    return {
        name,
        import: "ok",
        nodes: 0,
        edges: 0,
        styled: false,
        nodeRules: 0,
        edgeRules: 0,
        toolValues: 0,
        varying: 0,
        opaque: 0,
        exceptions: 0,
        approximated: 0,
        declaredEmpty: 0,
        notes: [],
    };
}

/**
 * The truth of a graph's styles: what its reader read, element by element, before planning.
 * @param loaded - the graph as read
 * @returns each element's value per property, and whether the values came from a graphty block alone
 */
export function styleTruth(loaded: LoadedGraph): StyleTruthValues | null {
    const read = readStyleValues(loaded.importer, loaded.snapshot, loaded.report, {
        notes: new StyleNotes(),
        budget: new StyleBudget(),
    });
    return read === null ? null : { node: read.node.values, edge: read.edge.values };
}

/**
 * Checks one input end to end: import, read, plan and check against the truth, and the same styles from a second
 * read and from `importGraph()` (deterministic).
 * @param input - the input
 * @returns the result and the failures
 */
export async function checkInput(input: StyleInput): Promise<StyleCheck> {
    let loaded: LoadedGraph;
    try {
        loaded = await input.load();
    } catch (e) {
        const result = emptyResult(input.name);
        result.import = (e as { details?: { code?: string } }).details?.code ?? (e as Error).name;
        return { result, failures: [] };
    }
    const ex = extractStyles(loaded.importer, loaded.snapshot, loaded.report);
    const again = extractStyles(loaded.importer, loaded.snapshot, loaded.report);
    const failures: string[] = [];
    if (stableJson(ex) !== stableJson(again)) {
        failures.push("two reads of the same file give different styles");
    }
    if (loaded.imported !== undefined && stableJson(ex) !== stableJson(loaded.imported)) {
        failures.push("importGraph() gives different styles than reading them after the import");
    }
    const truth = styleTruth(loaded);
    if (ex === null) {
        const result = emptyResult(input.name);
        result.nodes = loaded.snapshot.nodeCount;
        result.edges = loaded.snapshot.edgeCount;
        const lost = TARGETS.some((t) => Object.values(truth?.[t] ?? {}).some((col) => col?.some((v) => v !== null)));
        if (lost) {
            failures.push("the reader read style values, but the import gives no styles");
        }
        return { result, failures };
    }
    // a file graphty wrote, read by a format with no reader of its own: its block is the only truth there is
    const truthless = truth === null && ex.styles.source.tool === "graphty";
    const checked = checkStyles(ex, truthless ? {} : (truth ?? {}), loaded.snapshot, input.name);
    if (truthless) {
        return { result: checked.result, failures };
    }
    return { result: checked.result, failures: [...failures, ...checked.failures] };
}

/** The hostile blocks a written file's block is replaced with (design 10.7 item 5), with the reason each gives. */
function hostileBlocks(good: string): readonly (readonly [string, string, string])[] {
    const parsed = JSON.parse(good) as { fingerprint: { ids: string } };
    const wrong = good.replace(`"ids":${JSON.stringify(parsed.fingerprint.ids)}`, '"ids":"another graph"');
    return [
        ["a wrong fingerprint", wrong, "FINGERPRINT"],
        ["a truncated block", good.slice(0, Math.floor(good.length / 2)), "NOT_JSON"],
        [
            "a block holding __proto__",
            good.replace('"version":1', '"version":1,"__proto__":{"polluted":true}'),
            "INVALID",
        ],
        ["a block nested 100,000 deep", `${"[".repeat(100_000)}${"]".repeat(100_000)}`, "INVALID"],
    ];
}

/**
 * The rules read back are the rules written, beside an exceptions rule that holds only properties a loss note names
 * (design 10.7 items 1 and 2): the native values of a property written as the nearest value the format allows are
 * the truth, and they come back as exceptions. A rule may read its data column under the name the format gives it
 * (a format writes the label column as its own `label`); the values read are compared element by element elsewhere.
 * @param written - the styles written
 * @param read - the styles read back
 * @param excused - the properties a loss note names, as `target.property`
 * @returns the failures
 */
function compareRules(written: ExtractedStyles, read: ExtractedStyles, excused: ReadonlyMap<string, number>): string[] {
    const plain = (rules: readonly StyleRule[]): string =>
        stableJson(
            rules
                .filter((r) => r.role !== "exceptions")
                .map(({ ext, ...r }) => ({
                    // a data column may come back under another name
                    ...(JSON.parse(
                        JSON.stringify(r, (_k, v: unknown) =>
                            v !== null && typeof v === "object" && Object.keys(v).length === 1 && "data" in v
                                ? { data: "" }
                                : v,
                        ),
                    ) as object),
                    ext: ext === undefined ? undefined : (JSON.parse(JSON.stringify(ext)) as unknown),
                })),
        );
    if (plain(read.styles.rules) !== plain(written.styles.rules)) {
        return ["the rules read back differ from the rules written"];
    }
    const before = new Set(
        written.styles.rules
            .filter((r) => r.role === "exceptions")
            .flatMap((r) => Object.keys(r.map ?? {}).map((p) => `${r.target}.${p}`)),
    );
    return read.styles.rules
        .filter((r) => r.role === "exceptions")
        .flatMap((r) => Object.keys(r.map ?? {}).map((p) => `${r.target}.${p}`))
        .filter((key) => !before.has(key) && !excused.has(key))
        .map((key) => `${key} comes back as exceptions, and no loss note says so`);
}

/**
 * The round trip of design 10.7 for one input: export with styles, import the file back with styles, and compare
 * the rules and every element's values; export again (byte-identical); edit one native value outside (one exception
 * comes back); replace the block with a hostile one (ignored with a note, never thrown).
 * @param writer - how the format writes
 * @param loaded - the graph as read
 * @param ex - its styles
 * @returns the failures
 */
export async function roundTrip(writer: StyleWriter, loaded: LoadedGraph, ex: ExtractedStyles): Promise<string[]> {
    const failures: string[] = [];
    const registry = writer.registry?.() ?? createRegistry();
    const importFormat = writer.importFormat ?? writer.format;
    const losses: readonly LossNote[] = registry.checkExport(loaded.snapshot, writer.format, {
        ...writer.options,
        styles: ex,
    });
    const keepsRules =
        registry.exporter(writer.format).styles !== undefined &&
        !losses.some((l) => l.code === "W_STYLE_RULES_NOT_KEPT");
    const written = await registry.exportGraphToBytes(loaded.snapshot, writer.format, {
        ...writer.options,
        styles: ex,
    });
    const back = await importForStyles(registry, importFormat, written);
    const backStyles = back.imported ?? null;
    if (backStyles === null) {
        return ["the written file has no styles when it is read back"];
    }
    // what the export says comes back otherwise, with how many elements: a property it cannot write (when the rules
    // are not kept either), one written as the nearest value the format allows, one written as per-element values
    const excused = new Map<string, number>();
    for (const l of losses) {
        const covers =
            l.code === "W_STYLE_APPROXIMATED" ||
            l.code === "W_STYLE_LAYER_FLATTENED" ||
            (l.code === "W_STYLE_NOT_WRITTEN" && !keepsRules);
        if (covers && l.style !== undefined) {
            const key = `${l.style.target}.${l.style.property}`;
            excused.set(key, (excused.get(key) ?? 0) + (l.count ?? Infinity));
        }
    }
    if (keepsRules) {
        // the rules written are the block's: the writer reads a copy of an input the format loses, and leaves out a
        // mapping that gives no element a value
        failures.push(...compareRules(rulesWritten(writer, written, ex), backStyles, excused));
    }
    // a node is the same node when its id has the same text: a format may read the id 7 back as "7"
    const backIndex = new Map<string, number>();
    for (let j = 0; j < back.snapshot.nodeCount; j++) {
        backIndex.set(String(back.snapshot.ids.idOf(j)), j);
    }
    const edgeAt = edgeRowsBack(loaded.snapshot, back.snapshot);
    for (const target of TARGETS) {
        const properties = new Set<string>();
        for (const r of ex.styles.rules.filter((x) => x.target === target)) {
            for (const p of [...Object.keys(r.set ?? {}), ...Object.keys(r.map ?? {})]) {
                properties.add(p);
            }
        }
        for (const p of properties) {
            const before = resolveStyles(ex, target, p as StyleProperty, loaded.snapshot);
            const after = resolveStyles(backStyles, target, p as StyleProperty, back.snapshot);
            const allowed = excused.get(`${target}.${p}`) ?? 0;
            let differ = 0;
            let first = "";
            for (let i = 0; i < before.length; i++) {
                const j = target === "node" ? (backIndex.get(String(loaded.snapshot.ids.idOf(i))) ?? -1) : edgeAt[i];
                if (after[j] !== before[i] && differ++ === 0) {
                    first = `${elementName(loaded.snapshot, target, i)} ${p}: written ${JSON.stringify(before[i])}, read back ${JSON.stringify(after[j] ?? null)}`;
                }
            }
            if (differ > allowed) {
                failures.push(
                    allowed === 0
                        ? `${first}, and no loss note says so`
                        : `${target} ${p}: ${String(differ)} values read back otherwise, the loss notes count ${String(allowed)}`,
                );
            }
        }
    }
    failures.push(...(await checkFixedPoint(registry, writer, importFormat, written, back, backStyles)));
    if (writer.editNative !== undefined) {
        const edited = writer.editNative(written);
        if (edited !== null) {
            failures.push(...(await checkOutsideEdit(registry, importFormat, edited, backStyles)));
        }
    }
    if (writer.replaceBlock !== undefined) {
        for (const [what, hostile, reason] of hostileBlocks(writeStyleBlock(ex))) {
            const tampered = writer.replaceBlock(written, () => hostile);
            try {
                const r = await importForStyles(registry, importFormat, tampered);
                const note = r.imported?.styles.notes.find((n) => n.code === "W_STYLE_BLOCK_IGNORED");
                if (note?.params.samples[0] !== reason) {
                    failures.push(`${what}: not ignored with W_STYLE_BLOCK_IGNORED ${reason}`);
                }
                if (r.imported?.styles.source.tool === "graphty") {
                    failures.push(`${what}: its rules were used`);
                }
            } catch (e) {
                failures.push(`${what}: the import threw ${(e as Error).message}`);
            }
            if ((Object.prototype as Record<string, unknown>).polluted !== undefined) {
                failures.push(`${what}: Object.prototype was polluted`);
            }
        }
    }
    return failures;
}

/**
 * The styles with the rules a written file's block holds, when the writer can read its block back.
 * @param writer - how the format writes
 * @param written - the file
 * @param ex - the styles written
 * @returns the styles, with the block's rules
 */
function rulesWritten(writer: StyleWriter, written: Uint8Array, ex: ExtractedStyles): ExtractedStyles {
    let rules: StyleRule[] | null = null;
    writer.replaceBlock?.(written, (block) => {
        try {
            ({ rules } = JSON.parse(block) as { rules: StyleRule[] });
        } catch {
            rules = null;
        }
        return block;
    });
    return rules === null ? ex : { ...ex, styles: { ...ex.styles, rules } };
}

/**
 * Each edge row's row in the graph read back. A format writes an undirected edge of a directed graph once; when the
 * file reads it back as one directed edge (DOT, written with `onMixedDirection`), both halves are that edge.
 * @param before - the graph written
 * @param after - the graph read back
 * @returns per edge row of `before`, the row of `after`
 */
function edgeRowsBack(before: GraphSnapshot, after: GraphSnapshot): number[] {
    const rows = Array.from({ length: before.edgeCount }, (_unused, e) => e);
    if (after.edgeCount === before.edgeCount) {
        return rows;
    }
    const held = heldEdgeRows(before);
    const heldAfter = heldEdgeRows(after);
    const pair = before.edges.byRole("pair");
    held.forEach((e, k) => {
        rows[e] = heldAfter[k] ?? -1;
    });
    for (let e = 0; e < before.edgeCount; e++) {
        if (pair?.isSet(e) === true && (pair.value(e) as number) < e) {
            rows[e] = rows[pair.value(e) as number];
        }
    }
    return rows;
}

/**
 * Writing is deterministic and reaches a fixed point (design 10.7 item 3): the same graph and styles written twice
 * give the same bytes, and a file graphty wrote, read and written again, gives the same bytes. The first file names
 * the program that drew the original styles; every file after it names graphty, so the fixed point is checked from
 * the second file on.
 * @param registry - the registry
 * @param writer - how the format writes
 * @param importFormat - the format to read it as
 * @param written - the first file
 * @param back - the first file read back
 * @param backStyles - its styles
 * @returns the failures
 */
async function checkFixedPoint(
    registry: FormatRegistry,
    writer: StyleWriter,
    importFormat: string,
    written: Uint8Array,
    back: LoadedGraph,
    backStyles: ExtractedStyles,
): Promise<string[]> {
    const same = (a: Uint8Array, b: Uint8Array): boolean => Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;
    const second = await registry.exportGraphToBytes(back.snapshot, writer.format, {
        ...writer.options,
        styles: backStyles,
    });
    const secondAgain = await registry.exportGraphToBytes(back.snapshot, writer.format, {
        ...writer.options,
        styles: backStyles,
    });
    if (!same(second, secondAgain)) {
        return ["writing the same graph and styles twice gives different bytes"];
    }
    const third = await importForStyles(registry, importFormat, second);
    if (third.imported === null || third.imported === undefined) {
        return ["a file graphty wrote twice has no styles when it is read back"];
    }
    const thirdBytes = await registry.exportGraphToBytes(third.snapshot, writer.format, {
        ...writer.options,
        styles: third.imported,
    });
    if (!same(second, thirdBytes)) {
        return ["exporting, importing and exporting again does not give the same bytes"];
    }
    return written.length === 0 ? ["the format wrote nothing"] : [];
}

/**
 * One native value edited outside comes back as exactly one exception (design 10.7 item 4): the same rules below
 * the exceptions, and one more excepted value.
 * @param registry - the registry
 * @param format - the format to read it as
 * @param edited - the edited file
 * @param unedited - the styles of the file before the edit
 * @returns the failures
 */
async function checkOutsideEdit(
    registry: FormatRegistry,
    format: string,
    edited: Uint8Array,
    unedited: ExtractedStyles,
): Promise<string[]> {
    const r = await importForStyles(registry, format, edited);
    const styles = r.imported ?? null;
    if (styles === null) {
        return ["an outside edit: the edited file has no styles"];
    }
    const below = (ex: ExtractedStyles): string => stableJson(ex.styles.rules.filter((x) => x.role !== "exceptions"));
    const failures: string[] = [];
    if (below(styles) !== below(unedited)) {
        failures.push("an outside edit changed the rules instead of adding one exception");
    }
    const excepted = (ex: ExtractedStyles): number => {
        let count = 0;
        for (const rule of ex.styles.rules.filter((x) => x.role === "exceptions")) {
            for (const m of Object.values(rule.map ?? {})) {
                if (m !== undefined && "by" in m && "style" in m.by) {
                    count += (ex.columns[rule.target].get(m.by.style) ?? []).filter((v) => v !== null).length;
                }
            }
        }
        return count;
    };
    if (excepted(styles) !== excepted(unedited) + 1) {
        failures.push(`an outside edit gave ${String(excepted(styles) - excepted(unedited))} new exceptions, not 1`);
    }
    return failures;
}

/** Hostile values a style slot is set to in a mutant (design 7.4). */
const HOSTILE_VALUES: readonly string[] = [
    "",
    " ",
    "NaN",
    "Infinity",
    "-1",
    "1e308",
    "#gg0000",
    "#12345",
    "rgb(300,0,0)",
    "transparent",
    "x".repeat(5000),
    "<b>bold</b>",
    "constructor",
    "toString",
    "__proto__",
    `data(${" ".repeat(3000)}x`,
    `${"1".repeat(20_000)}x`,
    `${" ".repeat(10_000)}#ff0000`,
    "COL=a,T=string,K=4294967294=x,V=4294967294=#ff0000",
];

/** Per text format, the attributes whose values a mutant replaces: the start of the value and how it is quoted. */
const STYLE_SLOTS: Readonly<Record<string, RegExp>> = {
    gexf: /(<viz:(?:color|size|shape|thickness)\b[^>]*?\b(?:r|g|b|a|hex|value)=)"[^"]*"/g,
    graphml: /(<y:[A-Za-z.]+\b[^>]*?\b(?:color|width|height|type|fontSize|textColor|hasColor|lineType)=)"[^"]*"/g,
    xgmml: /(<graphics\b[^>]*?\b(?:fill|outline|w|h|type|width)=)"[^"]*"/g,
    dot: /(\b(?:color|fillcolor|fontcolor|penwidth|shape|style|fontsize|width|height|arrowhead)\s*=\s*)"[^"]*"/g,
    pajek: /([ \t](?:ic|bc|bw|lc|fos|x_fact|y_fact|c|w|p)[ \t]+)(?:"[^"\n]*"|[^\s"]+)/g,
};

/**
 * Hostile copies of a file: one style attribute replaced everywhere by one hostile value per copy (design 7.4).
 * Seeded by the file's own name, so every run checks the same copies.
 * @param format - the corpus format
 * @param name - the file's name
 * @param bytes - the file
 * @param count - how many copies
 * @returns the copies, each with the value it holds
 */
export function mutants(
    format: string,
    name: string,
    bytes: Uint8Array,
    count: number,
): { value: string; bytes: Uint8Array }[] {
    const slot = STYLE_SLOTS[format];
    if (slot === undefined || count === 0) {
        return [];
    }
    const text = new TextDecoder().decode(bytes);
    if (text.search(slot) < 0) {
        return [];
    }
    let seed = 0;
    for (const c of name) {
        seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    }
    const xml = format !== "dot" && format !== "pajek";
    const out: { value: string; bytes: Uint8Array }[] = [];
    for (let k = 0; k < count; k++) {
        const value = HOSTILE_VALUES[(seed + k * 7) % HOSTILE_VALUES.length];
        const quoted = xml
            ? value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;")
            : value.replace(/"/g, '\\"');
        out.push({
            value,
            bytes: new TextEncoder().encode(text.replace(slot, (_m, start: string) => `${start}"${quoted}"`)),
        });
    }
    return out;
}
