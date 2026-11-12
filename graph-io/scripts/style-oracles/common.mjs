// Shared by the style oracles: finding the corpora, importing a file with its styles, and tallying the comparisons.
// Each oracle compares, element by element, the value graph-io resolves for a style property with the value the
// program that wrote the file draws. See README.md.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const DIST = resolve(import.meta.dirname, "../../dist");
const { importGraph } = await import(join(DIST, "graph-io.js"));
const { resolveStyles } = await import(join(DIST, "styles.js"));
// The color and enumeration readers are not published (@graphty/graph-io/styles names only what a consumer uses), so
// they come from the sources.
const { tsImport } = await import("tsx/esm/api");
const { canonColor, canonEnum, StyleNotes } = await tsImport("../../src/styles/internal.ts", import.meta.url);

const SCRATCH = { notes: new StyleNotes(), target: "node", property: "fill" };

/** A color as a tool draws it, in graph-io's canonical `#rrggbb` (null when it does not parse). */
export function toolColor(raw, dialect = "css") {
    if (raw === null || raw === undefined || raw === "") {
        return null;
    }
    return canonColor(raw, dialect, SCRATCH)?.color ?? null;
}

/** An enumeration value (shape, arrow, lineStyle, borderStyle) as a tool spells it, in the neutral vocabulary. */
export function toolEnum(kind, raw, dialect = "css") {
    if (raw === null || raw === undefined || raw === "") {
        return null;
    }
    return canonEnum(kind, raw, dialect, SCRATCH);
}

/** The checkout holding these scripts. */
export const REPO = resolve(import.meta.dirname, "../../..");

/** The main checkout (a worktree's own tmp/ is usually empty): where the local corpora live. */
function mainCheckout() {
    try {
        const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
            cwd: REPO,
            encoding: "utf8",
        }).trim();
        return dirname(common);
    } catch {
        return REPO;
    }
}

/** The local corpora, which are not committed (licenses, size): STYLE_ORACLE_LOCAL, else <main checkout>/tmp/style-import. */
export const LOCAL = process.env.STYLE_ORACLE_LOCAL ?? join(mainCheckout(), "tmp/style-import");

/** A path as printed: relative to the checkout or to the local corpora. */
export function shown(path) {
    if (path.startsWith(LOCAL)) {
        return `local:${relative(LOCAL, path)}`;
    }
    return relative(REPO, path);
}

/**
 * Every file under the directories whose name matches `pattern` (a `.gz` copy counts as the file), smaller than
 * `maxBytes`. Directories that do not exist are skipped.
 */
export function walk(dirs, pattern, maxBytes = 30e6) {
    const out = [];
    const stack = [...dirs].reverse();
    while (stack.length > 0) {
        const d = stack.pop();
        let entries;
        try {
            entries = readdirSync(d, { withFileTypes: true });
        } catch {
            continue;
        }
        const kids = [];
        for (const e of entries) {
            const p = join(d, e.name);
            if (e.isDirectory()) {
                kids.push(p);
            } else if (pattern.test(e.name.replace(/\.gz$/, "")) && statSync(p).size < maxBytes) {
                out.push(p);
            }
        }
        stack.push(...kids.sort().reverse());
    }
    return [...new Set(out)];
}

/** Command-line arguments as files and directories, or the defaults when there are none. */
export function inputs(defaults, pattern, maxBytes) {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        return walk(defaults, pattern, maxBytes);
    }
    return args.flatMap((a) => (statSync(a).isDirectory() ? walk([resolve(a)], pattern, maxBytes) : [resolve(a)]));
}

/** A file's bytes (decompressed when stored as `.gz`) and the name the importer is told. */
export function readInput(path) {
    const raw = readFileSync(path);
    if (path.endsWith(".gz")) {
        return { bytes: new Uint8Array(gunzipSync(raw)), filename: basename(path).slice(0, -3) };
    }
    return { bytes: new Uint8Array(raw), filename: basename(path) };
}

/**
 * Imports a file twice through graph-io's public API: with the writing tool's defaults, and without them (what the
 * file itself states). Returns null when the file does not import or has no styles.
 */
export async function importStyled(bytes, format, filename, extra = {}) {
    const opts = { format, filename, errorLimit: Infinity, ...extra };
    let all, own;
    try {
        all = await importGraph(bytes, { ...opts, styles: true });
        own = await importGraph(bytes, { ...opts, styles: { toolDefaults: false } });
    } catch {
        return null;
    }
    if (!all.styles || !own.styles) {
        return { snapshot: all.snapshot, styled: false };
    }
    const snapshot = all.snapshot;
    const cache = new Map();
    const values = (styles, target, property) => {
        const k = `${styles === all.styles ? "d" : "t"} ${target} ${property}`;
        if (!cache.has(k)) {
            cache.set(k, resolveStyles(styles, target, property, snapshot));
        }
        return cache.get(k);
    };
    const notes = all.styles.styles.notes;
    return {
        snapshot,
        styled: true,
        extracted: all.styles,
        /** The value with the tool's defaults beneath: what graphty draws. */
        drawn: (target, property, i) => values(all.styles, target, property)[i] ?? null,
        /** The value the file states, or null. */
        stated: (target, property, i) => values(own.styles, target, property)[i] ?? null,
        /** The codes of the notes about this property that name this element (or name no elements). */
        notedAt: (target, property, i) =>
            notes
                .filter(
                    (n) =>
                        n.params.target === target &&
                        n.params.property === property &&
                        (Array.isArray(n.elements) ? n.elements.includes(i) : true),
                )
                .map((n) => n.code),
        /** Whether a note with this code names the element for one of the properties. */
        covers: (code, target, properties, i) =>
            notes.some(
                (n) =>
                    n.code === code &&
                    n.params.target === target &&
                    properties.split(",").includes(n.params.property) &&
                    (Array.isArray(n.elements) ? n.elements.includes(i) : true),
            ),
    };
}

/** Equal, or numbers within a relative tolerance. */
export function same(a, b, tolerance = 1e-6) {
    return (
        a === b ||
        (typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a)))
    );
}

/**
 * The tally of one oracle. Every comparison is `ok` or a difference of one kind:
 * - `disagree`: the file states a value and the tool draws another;
 * - `missed`: the file states nothing graph-io saw, yet the tool draws something other than its default;
 * - `default`: the file states nothing, the tool draws its default, and graph-io's default for the tool differs.
 * A difference is explained when one of the oracle's explanations matches it; any other difference fails the run.
 */
export class Tally {
    constructor(name, explanations) {
        this.name = name;
        this.explanations = explanations;
        this.files = 0;
        this.elements = 0;
        this.checks = {};
        this.explained = new Map();
        this.unexplained = [];
        this.skipped = [];
    }

    /**
     * Records one comparison: `stated` is the file's value or null, `drawn` graphty's (with the tool's defaults),
     * `tool` what the tool draws, `toolDefault` what the tool draws with no style at all.
     */
    compare(key, detail, stated, drawn, tool, toolDefault, eq = same) {
        const want = drawn ?? toolDefault;
        if (eq(want, tool)) {
            this.record(key, "ok");
            return;
        }
        let kind = "disagree";
        if (stated === null) {
            kind = eq(tool, toolDefault) ? "default" : "missed";
        }
        this.record(key, kind, { ...detail, graphio: want, tool, toolDefault });
    }

    /** Records an outcome directly. */
    record(key, kind, detail = {}) {
        const c = (this.checks[key] ??= { ok: 0, disagree: 0, missed: 0, default: 0 });
        c[kind]++;
        if (kind === "ok") {
            return;
        }
        const d = { key, kind, ...detail };
        const why = this.explanations.find((e) => e.test(d));
        if (why === undefined) {
            this.unexplained.push(d);
            return;
        }
        const list = this.explained.get(why.reason) ?? [];
        list.push(d);
        this.explained.set(why.reason, list);
    }

    skip(file, why) {
        this.skipped.push({ file: shown(file), why });
    }

    /**
     * Prints the report, and writes it as JSON into the directory STYLE_ORACLE_OUT names when set.
     * @returns whether every difference is explained
     */
    finish() {
        const total = Object.values(this.checks).reduce((s, c) => s + c.ok + c.disagree + c.missed + c.default, 0);
        const explained = [...this.explained.values()].reduce((s, l) => s + l.length, 0);
        console.log(`${this.name}: ${this.files} files, ${this.elements} elements, ${total} values compared`);
        for (const [k, c] of Object.entries(this.checks).sort()) {
            console.log(`  ${k}: ${c.ok} ok, ${c.disagree} disagree, ${c.missed} missed, ${c.default} default`);
        }
        console.log(`explained differences: ${explained}`);
        for (const [reason, list] of this.explained) {
            console.log(`  ${list.length}  ${reason}`);
            for (const d of list.slice(0, 2)) {
                console.log(`       e.g. ${JSON.stringify(d).slice(0, 240)}`);
            }
        }
        console.log(`unexplained differences: ${this.unexplained.length}`);
        const byKey = new Map();
        for (const d of this.unexplained) {
            const k = `${d.key} ${d.kind}`;
            byKey.set(k, [...(byKey.get(k) ?? []), d]);
        }
        for (const [k, list] of byKey) {
            console.log(`  ${list.length}  ${k}`);
            for (const d of list.slice(0, 4)) {
                console.log(`       ${JSON.stringify(d).slice(0, 300)}`);
            }
        }
        if (this.skipped.length > 0) {
            console.log(`files not compared: ${this.skipped.length}`);
            for (const s of this.skipped) {
                console.log(`  ${s.file}: ${s.why}`);
            }
        }
        const out = process.env.STYLE_ORACLE_OUT;
        if (out !== undefined) {
            mkdirSync(out, { recursive: true });
            writeFileSync(
                join(out, `${this.name.replaceAll(/[^A-Za-z0-9]+/g, "-").toLowerCase()}.json`),
                JSON.stringify(
                    {
                        name: this.name,
                        files: this.files,
                        elements: this.elements,
                        checks: this.checks,
                        explained: Object.fromEntries([...this.explained].map(([r, l]) => [r, l.length])),
                        unexplained: this.unexplained,
                        skipped: this.skipped,
                    },
                    null,
                    1,
                ),
            );
        }
        return this.unexplained.length === 0;
    }
}
