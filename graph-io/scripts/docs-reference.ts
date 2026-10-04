/**
 * The generated parts of graph-io's documentation pages (graph-io/docs/), rendered from the source so they cannot
 * drift: the format list and fidelity matrix from the default registry, each format's capabilities, options and
 * issue / loss codes from its subpath barrel (the `<FMT>_ISSUE` / `<FMT>_LOSS` tables), and every description from
 * the doc comment where the option, code or capability is declared.
 *
 * A page holds hand-written prose around blocks marked
 *
 *     <!-- generated:begin <block> -->
 *     <!-- generated:end -->
 *
 * and only the text between the markers is rewritten. Formats are discovered, never listed here: every importer and
 * exporter of the default registry gets a page `guide/formats/<format>.md`, and a format with no page yet gets a
 * skeleton one on the next `npm run docs:reference`.
 *
 * Usage: `tsx scripts/docs-reference.ts` rewrites the pages; `--check` fails when a page differs from what this
 * produces (test/docs-reference.test.ts runs the same check).
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { format as prettierFormat, resolveConfig } from "prettier";
import ts from "typescript";

import { type ExportCapabilities, type GraphExporter, type GraphImporter, registry } from "../src/index.js";

const pkg = fileURLToPath(new URL("..", import.meta.url));

/** The source barrel of every package entry (`graph-io` and one per format subpath), from package.json's exports. */
const ENTRIES: Readonly<Record<string, string>> = Object.fromEntries(
    Object.keys((JSON.parse(readFileSync(`${pkg}package.json`, "utf8")) as { exports: object }).exports).map((k) =>
        k === "." ? ["graph-io", "src/index.ts"] : [k.slice(2), `src/formats/${k.slice(2)}/index.ts`],
    ),
);
const docsDir = `${pkg}docs/`;

const BEGIN = /<!-- generated:begin ([\w:/-]+) -->/g;
const END = "<!-- generated:end -->";
const ESCAPED_PIPE = String.raw`\|`;
const CODE_RE = /^[EW]_[A-Z0-9_]+$/;

/** One option as the tables show it. */
export interface OptionRow {
    readonly name: string;
    readonly type: string;
    readonly defaultValue: string;
    readonly doc: string;
}

/** One issue or loss code of one table. */
export interface CodeRow {
    readonly key: string;
    readonly code: string;
    readonly doc: string;
}

/** Everything the pages say about one format. */
interface FormatFacts {
    readonly name: string;
    readonly subpath: string;
    readonly importer: GraphImporter | undefined;
    readonly exporter: GraphExporter | undefined;
    readonly importOptions: readonly OptionRow[] | undefined;
    readonly exportOptions: readonly OptionRow[] | undefined;
    readonly issues: readonly CodeRow[];
    readonly losses: readonly CodeRow[];
}

// ============================================================ text helpers

/**
 * A doc comment as one table cell: one line, links as code, pipes escaped, internal design references removed.
 * @param s - the doc text
 * @returns the cell text
 */
function cell(s: string): string {
    return prose(s).split("|").join(ESCAPED_PIPE);
}

/**
 * A doc comment as one line of a list: one line, links as code, internal design references removed. Pipes stay
 * as they are, since only a table needs them escaped.
 * @param s - the doc text
 * @returns the line
 */
function prose(s: string): string {
    return (
        s
            .replace(/\s+/g, " ")
            .replace(/ ?\((?:see |per )?(?:design|research note)\b[^)]*\)/gi, "")
            .replace(/\{@link ([^}\s|]+)(?:[\s|][^}]*)?\}/g, "`$1`")
            // outside code spans, `<name>` would be read as an HTML tag by the docs site
            .split("`")
            // a bare code becomes inline code, so its underscores are never read as emphasis
            .map((part, i) =>
                i % 2 === 0
                    ? part
                          .replace(/</g, "&lt;")
                          .replace(/>/g, "&gt;")
                          .replace(/\b([EW]_[A-Z0-9_]*[A-Z0-9])\b/g, "`$1`")
                    : part,
            )
            .join("`")
            .trim()
    );
}

/**
 * A value as inline code.
 * @param v - the value
 * @returns `v` in backticks, pipes escaped
 */
function code(v: string): string {
    return `\`${v.split("|").join(ESCAPED_PIPE)}\``;
}

/** A default as a doc comment writes it: a quoted string, a number, or true / false / null. */
const VALUE = String.raw`("[^"]*"|-?\d[\d.e+-]*(?![\w^,])|true|false|null)`;

/**
 * The default a doc comment states in prose: `"auto" (default)`, `default "expand"`, `"," by default`,
 * `true by default`. Only a literal value counts, so "the edge table (default)" states none.
 * @param doc - the doc text
 * @returns the default as written, or "" when the comment states none
 */
function statedDefault(doc: string): string {
    const patterns = [
        new RegExp(`${VALUE} \\(default\\)`, "i"),
        new RegExp(`\\bdefaults?(?: is| to)?:? ${VALUE}`, "i"),
        new RegExp(`${VALUE} by default`, "i"),
    ];
    for (const re of patterns) {
        const m = re.exec(doc);
        if (m !== null) {
            return /^(?:true|false|null)$/i.test(m[1]) ? m[1].toLowerCase() : m[1];
        }
    }
    return "";
}

/**
 * A markdown table.
 * @param head - the header cells
 * @param rows - the body rows
 * @returns the markdown lines
 */
function table(head: readonly string[], rows: readonly (readonly string[])[]): string[] {
    return [
        `| ${head.join(" | ")} |`,
        `| ${head.map(() => "---").join(" | ")} |`,
        ...rows.map((r) => `| ${r.join(" | ")} |`),
    ];
}

/**
 * Orders strings by UTF-16 code unit, so the output does not depend on the locale.
 * @param a - one string
 * @param b - the other
 * @returns negative, zero or positive
 */
function byCodeUnit(a: string, b: string): number {
    return Number(a > b) - Number(a < b);
}

// ============================================================ the type checker

/** The type checker over the package source. */
class Source {
    private readonly checker: ts.TypeChecker;
    private readonly program: ts.Program;

    constructor() {
        const config = ts.getParsedCommandLineOfConfigFile(
            `${pkg}tsconfig.json`,
            {},
            {
                ...ts.sys,
                onUnRecoverableConfigFileDiagnostic: (d) => {
                    throw new Error(ts.flattenDiagnosticMessageText(d.messageText, "\n"));
                },
            },
        );
        if (config === undefined) {
            throw new Error("tsconfig.json could not be read");
        }
        this.program = ts.createProgram(
            Object.values(ENTRIES).map((e) => `${pkg}${e}`),
            config.options,
        );
        this.checker = this.program.getTypeChecker();
    }

    /**
     * The exports of a module, by name, aliases resolved.
     * @param file - a source file, relative to the package
     * @returns the exported symbols
     */
    exportsOf(file: string): Map<string, ts.Symbol> {
        const sf = this.program.getSourceFile(`${pkg}${file}`);
        const mod = sf === undefined ? undefined : this.checker.getSymbolAtLocation(sf);
        if (mod === undefined) {
            throw new Error(`${file} is not a module of the program`);
        }
        return new Map(
            this.checker
                .getExportsOfModule(mod)
                .map((s) => [s.name, s.flags & ts.SymbolFlags.Alias ? this.checker.getAliasedSymbol(s) : s]),
        );
    }

    /**
     * The doc comment of a symbol, without its tags.
     * @param sym - the symbol
     * @returns the doc text, or ""
     */
    doc(sym: ts.Symbol): string {
        return ts.displayPartsToString(sym.getDocumentationComment(this.checker));
    }

    /**
     * The properties of an exported interface or type alias.
     * @param sym - the type's symbol
     * @param skip - property names to leave out (inherited ones documented elsewhere)
     * @returns one row per property, in declaration order
     */
    options(sym: ts.Symbol, skip: ReadonlySet<string> = new Set()): OptionRow[] {
        const type = this.checker.getDeclaredTypeOfSymbol(sym);
        return this.checker
            .getPropertiesOfType(type)
            .filter((p) => !skip.has(p.name))
            .map((p) => {
                const doc = this.doc(p);
                const tagged = p
                    .getJsDocTags(this.checker)
                    .find((tag) => tag.name === "defaultValue" || tag.name === "default");
                return {
                    name: p.name,
                    type: this.typeText(this.checker.getTypeOfSymbol(p)),
                    defaultValue:
                        tagged === undefined
                            ? statedDefault(doc)
                            : ts.displayPartsToString(tagged.text).replace(/^`|`$/g, "").trim(),
                    doc,
                };
            });
    }

    /**
     * A property type as a reader needs it: `undefined` left out (every option is optional), `null` kept, and a
     * named union or literal type spelled out (`"canonical" | "string" | "number"`, not `IdCoercion`); an
     * object, function or class type keeps its name.
     * @param type - the property type
     * @returns the type text
     */
    typeText(type: ts.Type): string {
        const flags = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;
        const members = type.isUnion() ? type.types : [type];
        const parts: string[] = [];
        for (const m of members) {
            if (m.flags & ts.TypeFlags.Undefined) {
                continue;
            }
            const text =
                m.isUnion() || m.isLiteral() || m.flags & ts.TypeFlags.BooleanLiteral
                    ? this.checker.typeToString(m, undefined, flags | ts.TypeFormatFlags.InTypeAlias)
                    : this.checker.typeToString(m, undefined, flags);
            parts.push(text);
        }
        // `<ArrayBufferLike>` is noise to a reader
        for (let i = 0; i < parts.length; i++) {
            parts[i] = parts[i]
                .replace(/<ArrayBufferLike>/g, "")
                .replace(
                    /\bImportInput\b/g,
                    "(string | Uint8Array | ReadableStream<Uint8Array> | AsyncIterable<string | Uint8Array>)",
                );
        }
        // a format name accepts any registered name; listing the built-in ones here would read as the whole set
        if (parts.includes("string & {}")) {
            return parts.includes('"auto"') ? '"auto" | string' : "string";
        }
        // `true | false` reads better as boolean
        return parts.join(" | ").replace(/\bfalse \| true\b|\btrue \| false\b/, "boolean");
    }

    /**
     * The keys of an exported frozen code table with their doc comments.
     * @param sym - the table's symbol
     * @param values - the table at runtime
     * @returns one row per key, in declaration order
     */
    codes(sym: ts.Symbol, values: Readonly<Record<string, unknown>>): CodeRow[] {
        const type = this.checker.getTypeOfSymbol(sym);
        return Object.entries(values).map(([key, value]) => {
            const prop = type.getProperty(key);
            return { key, code: String(value), doc: prop === undefined ? "" : this.doc(prop) };
        });
    }

    /**
     * Every published doc comment of the package: each export of each entry, its tags, and the members of an
     * exported interface, class or frozen table.
     * @returns `<entry>: <name>` with its doc text
     */
    publishedDocs(): Map<string, string> {
        const out = new Map<string, string>();
        const full = (s: ts.Symbol): string =>
            [
                this.doc(s),
                ...s
                    .getJsDocTags(this.checker)
                    .map((t) => (t.text === undefined ? "" : ts.displayPartsToString(t.text))),
            ].join("\n");
        for (const entry of Object.values(ENTRIES)) {
            for (const [name, sym] of this.exportsOf(entry)) {
                // a re-export of another package (GraphFormatError) carries that package's comment
                if (sym.declarations?.[0]?.getSourceFile().fileName.startsWith(`${pkg}src/`) === false) {
                    continue;
                }
                out.set(`${entry}: ${name}`, full(sym));
                const type =
                    sym.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.Class | ts.SymbolFlags.TypeAlias)
                        ? this.checker.getDeclaredTypeOfSymbol(sym)
                        : this.checker.getTypeOfSymbol(sym);
                // a function's or a frozen table's own members are what a reader sees; skip library types
                for (const p of type.getProperties()) {
                    const decl = p.declarations?.[0];
                    if (decl !== undefined && decl.getSourceFile().fileName.startsWith(`${pkg}src/`)) {
                        out.set(`${entry}: ${name}.${p.name}`, full(p));
                    }
                }
                for (const sig of type.getCallSignatures()) {
                    const tags = sig.getJsDocTags().map((t) => ts.displayPartsToString(t.text));
                    out.set(
                        `${entry}: ${name}()`,
                        [ts.displayPartsToString(sig.getDocumentationComment(this.checker)), ...tags].join("\n"),
                    );
                }
            }
        }
        return out;
    }

    /**
     * The call signatures of an interface's methods, as a reader writes the call.
     * @param sym - the interface's symbol
     * @param names - the methods
     * @returns the signature text per method, `name(param: Type, ...): Result`
     */
    signatures(sym: ts.Symbol, names: readonly string[]): Map<string, string> {
        const type = this.checker.getDeclaredTypeOfSymbol(sym);
        const flags = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;
        return new Map(
            names.map((name) => {
                const prop = type.getProperty(name);
                const sig = prop === undefined ? undefined : this.checker.getTypeOfSymbol(prop).getCallSignatures()[0];
                if (sig === undefined) {
                    throw new Error(`GraphSink no longer has a method ${name}`);
                }
                return [name, `${name}${this.checker.signatureToString(sig, undefined, flags)}`];
            }),
        );
    }

    /**
     * The doc comments of the capability fields.
     * @param index - the root barrel's exports
     * @returns the doc text by field name
     */
    capabilityDocs(index: ReadonlyMap<string, ts.Symbol>): Map<string, string> {
        const sym = index.get("ExportCapabilities") as ts.Symbol;
        return new Map(
            this.checker
                .getPropertiesOfType(this.checker.getDeclaredTypeOfSymbol(sym))
                .map((p) => [p.name, this.doc(p)]),
        );
    }
}

// ============================================================ facts

/**
 * The subpath barrel of a format, from the bundle entries.
 * @param name - the format name
 * @returns the source entry, relative to the package
 */
function entryOf(name: string): string {
    const entry = (ENTRIES as Readonly<Record<string, string>>)[name];
    if (entry === undefined) {
        throw new Error(`format "${name}" has no subpath entry in scripts/entries.js`);
    }
    return entry;
}

/**
 * The exported table or type of a format barrel whose name ends with a suffix (`_ISSUE`, `ImportOptions`).
 * @param exported - the barrel's exports
 * @param suffix - the name suffix
 * @param prefix - the format's prefix in that spelling (`CSV`, `csv`), compared case-insensitively
 * @returns the name, or undefined when the barrel has none
 */
function findExport(exported: ReadonlyMap<string, unknown>, suffix: string, prefix: string): string | undefined {
    const want = `${prefix}${suffix}`.toLowerCase().split("-").join("");
    return [...exported.keys()].find((k) => k.toLowerCase().split("_").join("") === want.split("_").join(""));
}

/**
 * Everything the pages say about every registered format, in the registry's order.
 * @param src - the checker
 * @returns the facts per format
 */
async function collectFormats(src: Source): Promise<FormatFacts[]> {
    const out: FormatFacts[] = [];
    // a format's options type includes the common options, which options.md documents once
    const root = src.exportsOf(ENTRIES["graph-io"]);
    const commonNames = (type: string): Set<string> =>
        new Set(src.options(root.get(type) as ts.Symbol).map((r) => r.name));
    // graphIndex / graphName are importGraph()'s; a format page points at them once instead of listing them
    const commonImport = new Set([...commonNames("CommonImportOptions"), ...commonNames("GraphChoiceOptions")]);
    const commonExport = commonNames("CommonExportOptions");
    for (const name of registry.formats()) {
        const entry = entryOf(name);
        const runtime = (await import(`../${entry}`)) as Record<string, unknown>;
        const types = src.exportsOf(entry);
        const importer = registry.hasImporter(name) ? registry.importer(name) : undefined;
        const exporter = registry.hasExporter(name) ? registry.exporter(name) : undefined;
        const issueName = findExport(types, "_ISSUE", name);
        const lossName = findExport(types, "_LOSS", name);
        if (importer !== undefined && issueName === undefined) {
            throw new Error(`format "${name}" has an importer but its subpath exports no <FMT>_ISSUE table`);
        }
        if (exporter !== undefined && lossName === undefined) {
            throw new Error(`format "${name}" has an exporter but its subpath exports no <FMT>_LOSS table`);
        }
        const importOptions = findExport(types, "ImportOptions", name);
        const exportOptions = findExport(types, "ExportOptions", name);
        const rows = (n: string | undefined): CodeRow[] =>
            n === undefined
                ? []
                : src.codes(types.get(n) as ts.Symbol, runtime[n] as Readonly<Record<string, unknown>>);
        out.push({
            name,
            subpath: `@graphty/graph-io/${name}`,
            importer,
            exporter,
            importOptions:
                importOptions === undefined
                    ? undefined
                    : src.options(types.get(importOptions) as ts.Symbol, commonImport),
            exportOptions:
                exportOptions === undefined
                    ? undefined
                    : src.options(types.get(exportOptions) as ts.Symbol, commonExport),
            issues: rows(issueName),
            losses: rows(lossName),
        });
    }
    return out;
}

/**
 * Fills in the meaning of a code a table relays without a doc comment of its own (the session importer relays the
 * XGMML codes of the files inside): the shared constant's doc comment, else the first table that documents it.
 * @param formats - the facts as read
 * @param src - the checker
 * @param index - the root barrel's exports
 * @param runtime - the root barrel at runtime
 * @returns the facts with every documented code's meaning filled in
 */
function withRelayedDocs(
    formats: readonly FormatFacts[],
    src: Source,
    index: ReadonlyMap<string, ts.Symbol>,
    runtime: Readonly<Record<string, unknown>>,
): FormatFacts[] {
    const known = new Map<string, string>();
    for (const [name, value] of Object.entries(runtime).sort(([a], [b]) => byCodeUnit(a, b))) {
        const sym = index.get(name);
        if (typeof value === "string" && CODE_RE.test(value) && name.endsWith("_CODE") && sym !== undefined) {
            const doc = src.doc(sym);
            if (doc !== "" && !known.has(value)) {
                known.set(value, doc);
            }
        }
    }
    for (const r of formats.flatMap((f) => [...f.issues, ...f.losses])) {
        if (r.doc !== "" && !known.has(r.code)) {
            known.set(r.code, r.doc);
        }
    }
    const fill = (rows: readonly CodeRow[]): CodeRow[] =>
        rows.map((r) => (r.doc === "" ? { ...r, doc: known.get(r.code) ?? "" } : r));
    return formats.map((f) => ({ ...f, issues: fill(f.issues), losses: fill(f.losses) }));
}

/** What every block renderer reads. */
interface Context {
    readonly src: Source;
    readonly index: ReadonlyMap<string, ts.Symbol>;
    readonly runtime: Readonly<Record<string, unknown>>;
    readonly formats: readonly FormatFacts[];
    readonly capabilityDocs: ReadonlyMap<string, string>;
    readonly jsonDialects: readonly { readonly dialect: string; readonly caps: ExportCapabilities }[];
    /** The codes every importer can record (unreadable input, refused elements), with their shared meaning. */
    readonly inputCodes: ReadonlyMap<string, string>;
    /** The loss codes any exporter's capability check can return (the root `LOSS` table). */
    readonly sharedLosses: readonly CodeRow[];
    /** The common import options each format reads, by format name. */
    readonly usedOptions: ReadonlyMap<string, ReadonlySet<string>>;
    /** The header name lists of the CSV importer. */
    readonly csvHeaders: CsvHeaders;
}

/** The header name lists of the CSV importer, as src/formats/csv/header.ts exports them. */
interface CsvHeaders {
    readonly SOURCE_NAMES: readonly string[];
    readonly TARGET_NAMES: readonly string[];
    readonly ID_NAMES: readonly string[];
    readonly EDGE_ID_NAMES: readonly string[];
    readonly LABEL_NAMES: readonly string[];
    readonly TYPE_NAME: string;
}

/**
 * The common import options each built-in importer reads: the string literals of its `USED_OPTIONS` sets (the
 * sets reportUnusedOptions() checks, so an option outside them is reported as W_OPTION_IGNORED).
 * @param formats - the format names
 * @returns the option names per format; a format whose importer declares no set is left out
 */
function usedOptionsOf(formats: readonly string[]): Map<string, Set<string>> {
    const out = new Map<string, Set<string>>();
    for (const f of formats) {
        const file = `${pkg}src/formats/${f}/importer.ts`;
        if (!existsSync(file)) {
            continue;
        }
        const text = readFileSync(file, "utf8");
        const names = new Set<string>();
        for (const m of text.matchAll(/const USED_OPTIONS\w*\b[^=]*=\s*new Set[^(]*\(\[([^\]]*)\]/g)) {
            for (const lit of m[1].matchAll(/"(\w+)"/g)) {
                names.add(lit[1]);
            }
        }
        if (names.size > 0) {
            out.set(f, names);
        }
    }
    return out;
}

/**
 * Builds the context once per run.
 * @returns the context
 */
async function context(): Promise<Context> {
    const src = new Source();
    const runtime = (await import("../src/index.js")) as Record<string, unknown>;
    const index = src.exportsOf(ENTRIES["graph-io"]);
    // The JSON exporter writes several dialects, each with its own fidelity; the json barrel says which.
    const json = (await import(`../${entryOf("json")}`)) as Record<string, unknown>;
    const dialects = (json.JSON_DIALECTS ?? []) as readonly string[];
    const dialectCaps = json.dialectCapabilities as ((d: string) => ExportCapabilities) | undefined;
    const formats = withRelayedDocs(await collectFormats(src), src, index, runtime);
    const csvHeaders = (await import("../src/formats/csv/header.js")) as CsvHeaders;
    return {
        csvHeaders,
        src,
        index,
        runtime,
        formats,
        inputCodes: new Map(
            ["INPUT_ISSUE", "ELEMENT_ISSUE"].flatMap((t) =>
                src
                    .codes(index.get(t) as ts.Symbol, runtime[t] as Readonly<Record<string, unknown>>)
                    .map((r) => [r.code, r.doc] as const),
            ),
        ),
        sharedLosses: src.codes(index.get("LOSS") as ts.Symbol, runtime.LOSS as Readonly<Record<string, unknown>>),
        usedOptions: usedOptionsOf(formats.map((f) => f.name)),
        capabilityDocs: src.capabilityDocs(index),
        jsonDialects:
            dialectCaps === undefined ? [] : dialects.map((dialect) => ({ dialect, caps: dialectCaps(dialect) })),
    };
}

// ============================================================ blocks

/**
 * A capability value as a cell.
 * @param v - the value
 * @returns the cell text
 */
function capabilityCell(v: unknown): string {
    if (typeof v === "boolean") {
        return v ? "yes" : "no";
    }
    if (Array.isArray(v)) {
        return v.length === 0 ? "none" : v.join(", ");
    }
    return String(v);
}

/**
 * The exporters' fidelity, one row per format (and per JSON dialect), one column per capability.
 * @param ctx - the context
 * @returns the markdown lines
 */
function fidelityTable(ctx: Context): string[] {
    const fields = varyingCapabilities(ctx);
    const rows: string[][] = [];
    for (const f of ctx.formats) {
        if (f.exporter === undefined) {
            continue;
        }
        if (f.name === "json" && ctx.jsonDialects.length > 0) {
            for (const { dialect, caps } of ctx.jsonDialects) {
                rows.push([
                    `[json](./json.md) (${dialect})`,
                    ...fields.map((k) => capabilityCell(caps[k as keyof ExportCapabilities])),
                ]);
            }
            continue;
        }
        const caps = f.exporter.capabilities;
        rows.push([
            `[${f.name}](./${f.name}.md)`,
            ...fields.map((k) => capabilityCell(caps[k as keyof ExportCapabilities])),
        ]);
    }
    return table(["Format", ...fields.map((k) => code(k))], rows);
}

/**
 * The capability legend: what each column of a fidelity table means.
 * @param ctx - the context
 * @returns the markdown lines
 */
function capabilityLegend(ctx: Context): string[] {
    return [...ctx.capabilityDocs].flatMap(([k, doc]) => [`#### ${k}`, "", prose(doc), ""]);
}

/**
 * The capabilities on which the built-in writers differ. One every writer has the same value for (no format
 * writes connected components, say) tells a reader nothing when choosing a format, so the matrix leaves its
 * column out; the legend still explains it, since each format page lists every capability.
 * @param ctx - the context
 * @returns the capability names, in declaration order
 */
function varyingCapabilities(ctx: Context): string[] {
    const all = ctx.formats.flatMap((f): ExportCapabilities[] => {
        if (f.exporter === undefined) {
            return [];
        }
        return f.name === "json" && ctx.jsonDialects.length > 0
            ? ctx.jsonDialects.map((d) => d.caps)
            : [f.exporter.capabilities];
    });
    return [...ctx.capabilityDocs.keys()].filter(
        (k) => new Set(all.map((caps) => capabilityCell(caps[k as keyof ExportCapabilities]))).size > 1,
    );
}

/**
 * The format list and the fidelity matrix (guide/formats/index.md).
 * @param ctx - the context
 * @returns the markdown lines
 */
function matrixBlock(ctx: Context): string[] {
    return [
        ...table(
            ["Format", "Subpath", "Extensions", "Reads", "Writes", "Several graphs per file"],
            ctx.formats.map((f) => [
                `[${f.name}](./${f.name}.md)`,
                code(f.subpath),
                (f.importer?.extensions ?? []).map((e) => code(e)).join(", "),
                f.importer === undefined ? "no" : "yes",
                f.exporter === undefined ? "no (read only)" : "yes",
                f.importer?.importAll === undefined ? "no" : "yes",
            ]),
        ),
        "",
        "### What each writer keeps",
        "",
        ...fidelityTable(ctx),
        "",
        "### What the capabilities mean",
        "",
        ...capabilityLegend(ctx),
    ];
}

/**
 * A format's "At a glance" block.
 * @param f - the format
 * @returns the markdown lines
 */
function glanceBlock(f: FormatFacts): string[] {
    const imp = f.importer;
    const out = table(
        ["", ""],
        [
            ["Import from", code(f.subpath)],
            ["Format name", code(f.name)],
            ["Extensions", (imp?.extensions ?? []).map((e) => code(e)).join(", ") || "none"],
            ["MIME types", (imp?.mimeTypes ?? []).map((e) => code(e)).join(", ") || "none"],
            ["Reads", imp === undefined ? "no" : "yes"],
            ["Writes", f.exporter === undefined ? "no (read only)" : "yes"],
            ["Several graphs per file", imp?.importAll === undefined ? "no" : "yes (`importAllGraphs`)"],
            ["Lists its graphs", imp?.listGraphs === undefined ? "no" : "yes (`listGraphs`)"],
        ],
    );
    return out;
}

/**
 * A format's capabilities table: what a saved file can hold.
 * @param ctx - the context
 * @param f - the format
 * @returns the markdown lines
 */
function capabilitiesBlock(ctx: Context, f: FormatFacts): string[] {
    if (f.exporter === undefined) {
        return ["This format is read only."];
    }
    const out = [
        "What a saved file can hold (the [capabilities](./index.md#what-the-capabilities-mean) explain each row):",
        "",
    ];
    const fields = [...ctx.capabilityDocs.keys()];
    if (f.name === "json" && ctx.jsonDialects.length > 0) {
        out.push(
            ...table(
                ["Capability", ...ctx.jsonDialects.map((d) => code(d.dialect))],
                fields.map((k) => [
                    `[${code(k)}](./index.md#${k.toLowerCase()})`,
                    ...ctx.jsonDialects.map((d) => capabilityCell(d.caps[k as keyof ExportCapabilities])),
                ]),
            ),
        );
    } else {
        const caps = f.exporter.capabilities;
        out.push(
            ...table(
                ["Capability", "Value"],
                fields.map((k) => [
                    `[${code(k)}](./index.md#${k.toLowerCase()})`,
                    capabilityCell(caps[k as keyof ExportCapabilities]),
                ]),
            ),
        );
    }
    return out;
}

/**
 * A default as a cell: a literal value (`"auto"`, `100`, `true`) as code, a sentence (`per format`) as text.
 * @param value - the default as the doc comment states it
 * @returns the cell text
 */
function defaultCell(value: string): string {
    if (value === "") {
        return "";
    }
    return /^(?:"[^"]*"|'[^']*'|-?\d[\d.e+-]*|true|false|null|\[.*\]|\{.*\})$/.test(value) ? code(value) : cell(value);
}

/**
 * An options table with one short line per option, then the full description of every option whose doc says more
 * than its first sentence, each under its own anchor so a page can link to one option.
 * @param rows - the options
 * @param anchor - the prefix of the options' anchors on this page (`import`, `export`, ...)
 * @param usedBy - for the common import options: which formats read each option
 * @returns the markdown lines
 */
function optionsTable(rows: readonly OptionRow[], anchor: string, usedBy?: (name: string) => string): string[] {
    if (rows.length === 0) {
        return ["This format has no options of its own."];
    }
    const id = (o: OptionRow): string => `${anchor}-${o.name.toLowerCase()}`;
    const full = (o: OptionRow): string => {
        const read = usedBy?.(o.name);
        return [prose(o.doc), read === undefined || read === "every format" ? "" : `Read by: ${read}.`]
            .filter((x) => x !== "")
            .join(" ");
    };
    // the table gives the type and the default; the meaning is said once, in the entry under it,
    // and every option gets its own entry, so a page can link to any of them
    const detailed = rows;
    const out = table(
        ["Option", "Type", "Default"],
        rows.map((o) => [
            detailed.includes(o) ? `[${code(o.name)}](#${id(o)})` : code(o.name),
            code(o.type),
            defaultCell(o.defaultValue),
        ]),
    );
    if (detailed.length > 0) {
        out.push("", ...detailed.flatMap((o) => [`- <a id="${id(o)}"></a>${code(o.name)}: ${full(o)}`]));
    }
    return out;
}

/**
 * A list of codes with their meanings: a list, not a table, so a long meaning stays readable in the Markdown source.
 * @param rows - the codes
 * @param errorMeans - what the "error" severity means in this list
 * @returns the markdown lines
 */
function codesTable(rows: readonly CodeRow[], errorMeans: string): string[] {
    return rows.map((r) => `- ${code(r.code)} (${r.code.startsWith("E_") ? errorMeans : "warning"}): ${prose(r.doc)}`);
}

/**
 * The upper-case table prefix of a format (`CSV`, `CX2`).
 * @param f - the format
 * @returns the prefix
 */
function tablePrefix(f: FormatFacts): string {
    return f.name.toUpperCase().split("-").join("_");
}

/**
 * A format's options and codes (the end of its page).
 * @param f - the format
 * @returns the markdown lines
 */
function referenceBlock(ctx: Context, f: FormatFacts): string[] {
    const out: string[] = [];
    if (f.importer !== undefined) {
        out.push(
            "## Import options",
            "",
            "These come on top of the [options every importer takes](../options.md#every-importer).",
            ...(f.importer.importAll === undefined && f.importer.listGraphs === undefined
                ? []
                : [
                      "A file can hold several graphs: pick one with the `graphIndex` or `graphName` option of [importGraph()](../options.md#importgraph-and-importallgraphs), as [Files that hold several graphs](../loading.md#files-that-hold-several-graphs) shows.",
                  ]),
            "",
            ...optionsTable(f.importOptions ?? [], "import"),
            "",
        );
    }
    if (f.exporter !== undefined) {
        out.push(
            "## Export options",
            "",
            "These come on top of the [options every exporter takes](../options.md#every-exporter).",
            "",
            ...optionsTable(f.exportOptions ?? [], "export"),
            "",
        );
    }
    if (f.issues.length > 0) {
        // a shared code the format documents in its own words is listed with the format's codes
        const isShared = (r: CodeRow): boolean => ctx.inputCodes.get(r.code) === r.doc;
        const own = f.issues.filter((r) => !isShared(r));
        const shared = f.issues.filter(isShared);
        out.push(
            "## Import issue codes",
            "",
            `The codes this format's import report can hold. They are also exported as \`${tablePrefix(f)}_ISSUE\` from \`${f.subpath}\`, keyed by the code without its \`E_\` / \`W_\` and \`${tablePrefix(f)}_\` prefixes.`,
            "",
            ...(own.length > 0 ? codesTable(own, "error") : ["This format records no codes of its own."]),
            "",
        );
        if (shared.length > 0) {
            out.push(
                `Like every format, it can also record the codes for unreadable input and for elements the graph refuses: ${shared.map((r) => `[${code(r.code)}](../codes.md#${r.code})`).join(", ")}.`,
                "",
            );
        }
    }
    if (f.losses.length > 0) {
        out.push(
            "## Loss codes",
            "",
            `The codes \`checkExport(snapshot, "${f.name}", options)\` can return before a save, also exported as \`${tablePrefix(f)}_LOSS\` from \`${f.subpath}\`. An \`E_\` code means the save throws unless you change the graph or the options.`,
            "",
            ...codesTable(f.losses, "error, the save throws"),
            "",
            `When the graph has something this format cannot hold, it can also return the [shared loss codes](../codes.md#shared-loss-codes): ${[
                ...new Set(ctx.sharedLosses.map((r) => r.code)),
            ]
                .filter((c) => !f.losses.some((r) => r.code === c))
                .sort(byCodeUnit)
                .map((c) => `[${code(c)}](../codes.md#${c})`)
                .join(", ")}.`,
            "",
        );
    }
    return out;
}

/**
 * The options page (guide/options.md).
 * @param ctx - the context
 * @returns the markdown lines
 */
function optionsBlock(ctx: Context): string[] {
    const sym = (name: string): ts.Symbol => {
        const s = ctx.index.get(name);
        if (s === undefined) {
            throw new Error(`the root barrel no longer exports ${name}`);
        }
        return s;
    };
    const commonImport = ctx.src.options(sym("CommonImportOptions"));
    const commonExport = ctx.src.options(sym("CommonExportOptions"));
    const inherited = new Set([...commonImport, ...commonExport].map((o) => o.name));
    const importers = ctx.formats.filter((f) => f.importer !== undefined).map((f) => f.name);
    const usedBy = (option: string): string => {
        const readers = importers.filter((f) => ctx.usedOptions.get(f)?.has(option) ?? true);
        if (readers.length === importers.length) {
            return "every format";
        }
        return readers.length === 0 ? "none" : readers.map((f) => `[${f}](./formats/${f}.md)`).join(", ");
    };
    // only the options reportUnusedOptions() may report as ignored differ by format; the builder's policies
    // (duplicateEdges, selfLoops, ...) apply while the graph is built, whatever the importer reads
    const optionsSource = readFileSync(`${pkg}src/common/options.ts`, "utf8");
    const listed = (name: string): Set<string> =>
        new Set(
            [
                ...(new RegExp(`const ${name}\\b[^=]*=\\s*\\[([^\\]]*)\\]`).exec(optionsSource)?.[1] ?? "").matchAll(
                    /"(\w+)"/g,
                ),
            ].map((m) => m[1]),
        );
    const ignorable = listed("IGNORABLE_OPTION_NAMES");
    const sinkPolicies = listed("SINK_OPTION_NAMES");
    if (ignorable.size === 0) {
        throw new Error("src/common/options.ts no longer lists IGNORABLE_OPTION_NAMES");
    }
    const builderPolicies = new Set(
        [...commonImport.map((o) => o.name)].filter((n) => !ignorable.has(n) || sinkPolicies.has(n)),
    );
    const own = (name: string, base: ReadonlySet<string>): OptionRow[] =>
        ctx.src.options(sym(name), base).filter((o) => o.name !== "__index");
    const importGraphOwn = own("ImportGraphOptions", inherited);
    const importNames = new Set([...inherited, ...importGraphOwn.map((o) => o.name)]);
    return [
        "## Every importer",
        "",
        "`CommonImportOptions`: every importer accepts these next to its own options. An option a format does not read is reported in the import report as `W_OPTION_IGNORED` when you set it, and a name that no format takes, such as a misspelling, as `W_UNKNOWN_OPTION`.",
        "",
        'An option whose default is the same in every format (`duplicateEdges: "keep"`, `long: "f64"`, `restoreMangledIds: true` and the like) is not reported when you set it to that default, so an options object you share between formats can spell those out. `ids`, `defaultDirected`, `weightFrom` and `addMissingNodes` have a default per format, and are reported whenever you set them for a format that does not read them: leave them out of a shared object, or skip `W_OPTION_IGNORED` when you show the report.',
        "",
        ...optionsTable(commonImport, "import", (n) => (builderPolicies.has(n) ? "every format" : usedBy(n))),
        "",
        "## Every exporter",
        "",
        "`CommonExportOptions`: every exporter accepts these next to its own options. `checkExport()` returns a `W_UNKNOWN_OPTION` note for a name that no format takes, such as a misspelling.",
        "",
        ...optionsTable(commonExport, "export"),
        "",
        "## importGraph and importAllGraphs",
        "",
        "`ImportGraphOptions`: everything above, plus these, plus the chosen format's own import options.",
        "",
        ...optionsTable(importGraphOwn, "importgraph"),
        "",
        "## loadFromUrl",
        "",
        "`LoadFromUrlOptions`: everything `importGraph()` takes, plus:",
        "",
        ...optionsTable(own("LoadFromUrlOptions", importNames), "loadfromurl"),
        "",
        "## loadFromFile",
        "",
        "`loadFromFile()` takes the same options as [importGraph()](#importgraph-and-importallgraphs).",
        "",
        "## Saving: exportGraph, exportGraphToBytes, checkExport and the others",
        "",
        "`ExportGraphOptions`: the options every exporter takes, above, plus the chosen format's own export options in the same object.",
        "",
        "## downloadGraph",
        "",
        "`DownloadGraphOptions`: everything the other save functions take, plus:",
        "",
        ...optionsTable(own("DownloadGraphOptions", inherited), "download"),
        "",
        "## Each format's own options",
        "",
        ...table(
            ["Format", "Import options", "Export options"],
            ctx.formats.map((f) => [
                `[${f.name}](./formats/${f.name}.md)`,
                f.importer === undefined
                    ? "no importer"
                    : ownOptions(f.importOptions, `./formats/${f.name}.md#import-options`, `${f.name} import options`),
                f.exporter === undefined
                    ? "read only"
                    : ownOptions(f.exportOptions, `./formats/${f.name}.md#export-options`, `${f.name} export options`),
            ]),
        ),
    ];
}

/**
 * A cell of the per-format options table: a link to the format's own options, or "none".
 * @param rows - the format's own options
 * @param href - where they are documented
 * @param text - the link text
 * @returns the cell text
 */
function ownOptions(rows: readonly OptionRow[] | undefined, href: string, text: string): string {
    return (rows ?? []).length === 0
        ? "none"
        : `[${text}](${href}): ${(rows ?? []).map((o) => code(o.name)).join(", ")}`;
}

/**
 * The header names the CSV importer recognizes, from the lists it matches against.
 * @param ctx - the context
 * @returns the markdown lines
 */
function csvHeadersBlock(ctx: Context): string[] {
    const h = ctx.csvHeaders;
    const names = (xs: readonly string[]): string => xs.map((x) => code(x)).join(", ");
    return table(
        ["Column", "Header names", "To name another column"],
        [
            ["Edge source", names(h.SOURCE_NAMES), "`sourceColumn`"],
            ["Edge target", names(h.TARGET_NAMES), "`targetColumn`"],
            ["Node id (node table)", names(h.ID_NAMES), "`idColumn`"],
            ["Edge id (edge table)", names(h.EDGE_ID_NAMES), ""],
            ["Label", names(h.LABEL_NAMES), ""],
            ["Edge weight", "`weight`, or the name you pass as `weightFrom`", "`weightFrom`"],
            [
                "Edge direction",
                `${code(h.TYPE_NAME)}, only in a Gephi table (a header with exactly \`Source\` and \`Target\`)`,
                "`typeColumn`",
            ],
        ],
    );
}

/** The sink methods an importer calls, with what each does; the signatures come from GraphSink itself. */
const SINK_METHODS: readonly (readonly [string, string])[] = [
    ["addNode", "Adds a node, or finds the node with this id. Returns its index."],
    [
        "addEdge",
        "Adds an edge between two node ids, in the direction set with `setDirected()`, and returns its index. A node the graph does not have yet is created, unless `addMissingNodes` is false. Call it directly when your format always has one direction; when a file's edges carry their own direction, or `defaultDirected` and `onMixedDirection` should apply, add edges through `DirectionResolver.addEdge()`, which calls this.",
    ],
    ["setEdgeWeight", "Sets the weight of an edge already added."],
    ["setDirected", "Sets whether the graph is directed. `DirectionResolver.setHeader()` calls it for you."],
    [
        "declareNodeColumn",
        'Declares a node attribute, `{ name, dtype, role }` (for example `{ name: "label", dtype: "string", role: "label" }`), and returns its handle. Declaring the same attribute again returns the same handle.',
    ],
    ["declareEdgeColumn", "Declares an edge attribute, the same way."],
    ["setNodeValue", "Sets a node's value of an attribute, by handle or by name."],
    ["setEdgeValue", "Sets an edge's value of an attribute, by handle or by name."],
    ["setGraphValue", "Sets an attribute of the whole graph."],
    ["setMeta", "Sets the graph's `name`, `description` and other details, which `snapshot.meta` returns."],
    ["indexOf", "The index of the node with this id, or `INVALID_INDEX` (4294967295)."],
    ["reserve", "Makes room for this many nodes and edges, for a file that states its size up front."],
];

/**
 * The GraphSink methods an importer calls (guide/extending/new-format.md).
 * @param ctx - the context
 * @returns the markdown lines
 */
function sinkBlock(ctx: Context): string[] {
    const sym = ctx.index.get("GraphSink");
    if (sym === undefined) {
        throw new Error("the root barrel no longer exports GraphSink");
    }
    const sigs = ctx.src.signatures(
        sym,
        SINK_METHODS.map(([name]) => name),
    );
    // a list item, not a table cell: a pipe in a signature stays as it is
    return SINK_METHODS.map(([name, meaning]) => `- \`${sigs.get(name) ?? name}\`: ${meaning}`);
}

/** One code across every format. */
interface CodeUse {
    doc: string;
    readonly importers: string[];
    readonly exporters: string[];
    /** Whether any exporter's capability check can return it (the root `LOSS` table). */
    anyExporter: boolean;
}

/**
 * Every code with its meaning and the formats that use it (guide/codes.md).
 * @param ctx - the context
 * @returns the markdown lines
 */
function codesBlock(ctx: Context): string[] {
    const uses = new Map<string, CodeUse>();
    const use = (c: string): CodeUse => {
        let u = uses.get(c);
        if (u === undefined) {
            u = { doc: "", importers: [], exporters: [], anyExporter: false };
            uses.set(c, u);
        }
        return u;
    };
    // the shared constants' own doc comments win: they describe the condition, not one format's case of it
    for (const [name, value] of Object.entries(ctx.runtime).sort(([a], [b]) => byCodeUnit(a, b))) {
        if (typeof value === "string" && CODE_RE.test(value) && name.endsWith("_CODE")) {
            const sym = ctx.index.get(name);
            const u = use(value);
            if (u.doc === "" && sym !== undefined) {
                u.doc = ctx.src.doc(sym);
            }
        }
    }
    for (const r of ctx.sharedLosses) {
        const u = use(r.code);
        u.anyExporter = true;
        u.doc ||= r.doc;
    }
    for (const f of ctx.formats) {
        for (const r of f.issues) {
            const u = use(r.code);
            u.importers.push(f.name);
            u.doc ||= r.doc;
        }
        for (const r of f.losses) {
            const u = use(r.code);
            u.exporters.push(f.name);
            u.doc ||= r.doc;
        }
    }
    // a list, not a table: ~300 rows padded to the widest meaning would make a page of several hundred KB
    const list = (xs: readonly string[]): string => xs.map((x) => `[${x}](./formats/${x}.md)`).join(", ");
    const section = (title: string, prefix: string): string[] => [
        title,
        "",
        ...[...uses]
            .filter(([c]) => c.startsWith(prefix))
            .sort(([a], [b]) => byCodeUnit(a, b))
            .map(([c, u]) => {
                const where = [
                    u.importers.length > 0 ? `Import: ${list(u.importers)}.` : "",
                    u.anyExporter ? "Save: any format." : "",
                    !u.anyExporter && u.exporters.length > 0 ? `Save: ${list(u.exporters)}.` : "",
                ]
                    .filter((s) => s !== "")
                    .join(" ");
                return `- <a id="${c}"></a>${code(c)}: ${prose(u.doc)}${where === "" ? "" : ` ${where}`}`;
            }),
        "",
    ];
    return [
        ...section("## Errors", "E_"),
        ...section("## Warnings", "W_"),
        "## Shared loss codes",
        "",
        `Any format's \`checkExport()\` can return these, when the graph has something the format's [capabilities](./formats/index.md#what-the-capabilities-mean) do not cover: ${[
            ...new Set(ctx.sharedLosses.map((r) => r.code)),
        ]
            .sort(byCodeUnit)
            .map((c) => `[${code(c)}](#${c})`)
            .join(", ")}.`,
        "",
    ];
}

// ============================================================ pages

/** The generated blocks each page must hold, by page path relative to docs/. */
export type PagePlan = ReadonlyMap<string, readonly string[]>;

/**
 * Which page holds which block.
 * @param formats - the registered format names
 * @returns the plan
 */
function plan(formats: readonly string[]): PagePlan {
    const pages = new Map<string, readonly string[]>([
        ["guide/options.md", ["options"]],
        ["guide/codes.md", ["codes"]],
        ["guide/formats/index.md", ["matrix"]],
    ]);
    for (const f of formats) {
        pages.set(`guide/formats/${f}.md`, [`glance:${f}`, `capabilities:${f}`, `reference:${f}`]);
    }
    pages.set("guide/formats/csv.md", ["glance:csv", "capabilities:csv", "headers:csv", "reference:csv"]);
    pages.set("guide/extending/new-format.md", ["sink"]);
    return pages;
}

/**
 * The page a new format starts with: its title and the generated blocks, prose to be written.
 * @param name - the format name
 * @returns the page text
 */
function skeleton(name: string): string {
    return [
        `# ${name}`,
        "",
        "## At a glance",
        "",
        `<!-- generated:begin glance:${name} -->`,
        END,
        "",
        "## What a saved file keeps and loses",
        "",
        `<!-- generated:begin capabilities:${name} -->`,
        END,
        "",
        `<!-- generated:begin reference:${name} -->`,
        END,
        "",
    ].join("\n");
}

/**
 * A runnable example as a code block: the file under docs/examples/ verbatim, so what a reader copies is what
 * test/docs-examples.test.ts runs.
 * @param name - the example's path under docs/examples/, without `.ts`
 * @returns the markdown
 */
function exampleBlock(name: string): string {
    // a browser example is plain JavaScript, so it runs pasted into a page or a notebook as it is
    for (const lang of ["ts", "js"]) {
        const file = `${docsDir}examples/${name}.${lang}`;
        if (existsSync(file)) {
            return [`\`\`\`${lang}`, readFileSync(file, "utf8").trim(), "```"].join("\n");
        }
    }
    throw new Error(`example ${name}: ${docsDir}examples/${name}.ts does not exist`);
}

/**
 * What a runnable example prints, as a text block: docs/examples/<name>.txt, which test/docs-examples.test.ts keeps
 * equal to the example's real output.
 * @param name - the example's path under docs/examples/, without an extension
 * @returns the markdown
 */
function outputBlock(name: string): string {
    const file = `${docsDir}examples/${name}.txt`;
    if (!existsSync(file)) {
        throw new Error(`example ${name} prints nothing (${file} does not exist)`);
    }
    return ["```text", readFileSync(file, "utf8").trimEnd(), "```"].join("\n");
}

/**
 * Every Markdown page under docs/, relative to it, except the generated API reference. The package README, which
 * shows an example too, is added by pages().
 * @param dir - the directory relative to docs/
 * @returns the page paths
 */
function markdownPages(dir = ""): string[] {
    if (!existsSync(`${docsDir}${dir}`)) {
        return [];
    }
    return readdirSync(`${docsDir}${dir}`, { withFileTypes: true }).flatMap((e) => {
        const rel = `${dir}${e.name}`;
        if (e.isDirectory()) {
            return rel === "api" || rel === "examples" || rel === "samples" ? [] : markdownPages(`${rel}/`);
        }
        return e.name.endsWith(".md") ? [rel] : [];
    });
}

/**
 * One block's markdown.
 * @param ctx - the context
 * @param block - the block name
 * @returns the markdown
 */
function render(ctx: Context, block: string): string {
    const [kind, name] = block.split(":");
    if (kind === "example") {
        return exampleBlock(name);
    }
    if (kind === "output") {
        return outputBlock(name);
    }
    const f = ctx.formats.find((x) => x.name === name);
    switch (kind) {
        case "options":
            return optionsBlock(ctx).join("\n");
        case "codes":
            return codesBlock(ctx).join("\n");
        case "matrix":
            return matrixBlock(ctx).join("\n");
        case "glance":
            if (f !== undefined) {
                return glanceBlock(f).join("\n");
            }
            break;
        case "capabilities":
            if (f !== undefined) {
                return capabilitiesBlock(ctx, f).join("\n");
            }
            break;
        case "reference":
            if (f !== undefined) {
                return referenceBlock(ctx, f).join("\n");
            }
            break;
        case "sink":
            return sinkBlock(ctx).join("\n");
        case "headers":
            if (name === "csv") {
                return csvHeadersBlock(ctx).join("\n");
            }
            break;
        default:
            break;
    }
    throw new Error(`unknown generated block "${block}"`);
}

/**
 * Whether a block shows an example or its output, which any page may hold.
 * @param block - the block name
 * @returns true for `example:` and `output:` blocks
 */
function isExampleBlock(block: string): boolean {
    return block.startsWith("example:") || block.startsWith("output:");
}

/**
 * A page with every generated block replaced.
 * @param ctx - the context
 * @param page - the page path relative to docs/
 * @param text - the page as it is
 * @param blocks - the blocks the page must hold
 * @returns the page as it should be, formatted with the repository's Prettier configuration
 */
async function regenerate(ctx: Context, page: string, text: string, blocks: readonly string[]): Promise<string> {
    const found = [...text.matchAll(BEGIN)].map((m) => m[1]);
    const missing = blocks.filter((b) => !found.includes(b));
    const extra = found.filter((b) => !blocks.includes(b) && !isExampleBlock(b));
    if (missing.length > 0 || extra.length > 0) {
        throw new Error(
            `${page}: generated blocks ${missing.length > 0 ? `missing ${missing.join(", ")}` : ""}${extra.length > 0 ? ` unexpected ${extra.join(", ")}` : ""}`,
        );
    }
    let out = text;
    for (const b of [...blocks, ...found.filter(isExampleBlock)]) {
        const begin = `<!-- generated:begin ${b} -->`;
        const start = out.indexOf(begin) + begin.length;
        const end = out.indexOf(END, start);
        if (end < 0) {
            throw new Error(`${page}: block ${b} has no ${END}`);
        }
        out = `${out.slice(0, start)}\n\n${render(ctx, b)}\n\n${out.slice(end)}`;
    }
    const filepath = `${docsDir}${page}`;
    return prettierFormat(out, { ...(await resolveConfig(filepath)), filepath });
}

/** The outcome for one page. */
export interface PageResult {
    readonly page: string;
    readonly current: string | null;
    readonly expected: string;
}

/**
 * Every generated page as it is and as it should be.
 * @returns one result per page, plus a stray format page (one with no registered format) as an error
 */
export async function pages(): Promise<PageResult[]> {
    const ctx = await context();
    const p = plan(ctx.formats.map((f) => f.name));
    const formatPages = existsSync(`${docsDir}guide/formats`) ? readdirSync(`${docsDir}guide/formats`) : [];
    const stray = formatPages.filter((n) => n.endsWith(".md") && !p.has(`guide/formats/${n}`));
    if (stray.length > 0) {
        throw new Error(`format pages without a registered format: ${stray.join(", ")}`);
    }
    const out: PageResult[] = [];
    // a page outside the plan may still show examples
    const all = new Map(p);
    for (const page of [...markdownPages(), "../README.md"]) {
        if (!all.has(page) && existsSync(`${docsDir}${page}`)) {
            all.set(page, []);
        }
    }
    for (const [page, blocks] of all) {
        const path = `${docsDir}${page}`;
        const current = existsSync(path) ? readFileSync(path, "utf8") : null;
        const name = /^guide\/formats\/(.+)\.md$/.exec(page)?.[1];
        const base = current ?? (name !== undefined && name !== "index" ? skeleton(name) : null);
        if (base === null) {
            throw new Error(`${page} is missing`);
        }
        out.push({ page, current, expected: await regenerate(ctx, page, base, blocks) });
    }
    return out;
}

/**
 * Every option and code that has no description, as `<where>: <name>` lines.
 * @returns the undocumented items, empty when every one has a description
 */
export async function undocumented(): Promise<string[]> {
    const ctx = await context();
    const out: string[] = [];
    const opts = (where: string, rows: readonly OptionRow[] | undefined): void => {
        for (const o of rows ?? []) {
            if (cell(o.doc) === "") {
                out.push(`${where}: option ${o.name}`);
            }
        }
    };
    for (const name of ["CommonImportOptions", "CommonExportOptions", "ImportGraphOptions", "ExportGraphOptions"]) {
        opts(name, ctx.src.options(ctx.index.get(name) as ts.Symbol));
    }
    for (const f of ctx.formats) {
        opts(`${f.name} import`, f.importOptions);
        opts(`${f.name} export`, f.exportOptions);
        for (const r of [...f.issues, ...f.losses]) {
            if (cell(r.doc) === "") {
                out.push(`${f.name}: code ${r.key}`);
            }
        }
    }
    for (const [k, doc] of ctx.capabilityDocs) {
        if (cell(doc) === "") {
            out.push(`ExportCapabilities: ${k}`);
        }
    }
    return out;
}

/**
 * The option names the load and save functions take themselves (the common ones and their own), and each built-in
 * format's own import and export option names, from the option types. The `options` lists of the built-in importers
 * and exporters, and the library's list of the functions' own names, must equal these.
 * @returns the names, sorted
 */
export async function optionNames(): Promise<{
    common: string[];
    formats: Record<string, { import: string[]; export: string[] }>;
}> {
    const ctx = await context();
    const sorted = (xs: Iterable<string>): string[] => [...new Set(xs)].sort(byCodeUnit);
    const common = [
        "CommonImportOptions",
        "ImportGraphOptions",
        "LoadFromUrlOptions",
        "CommonExportOptions",
        "ExportGraphOptions",
        "DownloadGraphOptions",
    ].flatMap((t) => ctx.src.options(ctx.index.get(t) as ts.Symbol).map((o) => o.name));
    const formats: Record<string, { import: string[]; export: string[] }> = {};
    for (const f of ctx.formats) {
        formats[f.name] = {
            import: sorted((f.importOptions ?? []).map((o) => o.name)),
            export: sorted((f.exportOptions ?? []).map((o) => o.name)),
        };
    }
    return { common: sorted(common), formats };
}

/** What a published doc comment must not mention: the package's internal design documents and process. */
export const INTERNAL_REFERENCE =
    /design\s+sections?\b|\bdesign\s+\d+\.\d|research\s+note|STATUS\.md|decision\s+D-[A-Z]|\bissue\s+#\d+|\binvariant\s+I\d|\bsrc\/|audit\s+round/i;

/**
 * Every published doc comment that mentions the package's internal design documents.
 * @returns `<entry>: <name>` per offending comment
 */
export function internalReferences(): string[] {
    return [...new Source().publishedDocs()].filter(([, doc]) => INTERNAL_REFERENCE.test(doc)).map(([k]) => k);
}

/**
 * Rewrites (or with --check, verifies) every generated page.
 * @param check - whether to fail on a stale page instead of rewriting it
 */
async function main(check: boolean): Promise<void> {
    const stale: string[] = [];
    for (const r of await pages()) {
        if (r.current === r.expected) {
            continue;
        }
        if (check) {
            stale.push(r.page);
        } else {
            writeFileSync(`${docsDir}${r.page}`, r.expected);
            console.log(`wrote docs/${r.page}`);
        }
    }
    if (stale.length > 0) {
        console.error(
            `graph-io docs are out of date (run \`npm run docs:reference\` in graph-io): ${stale.join(", ")}`,
        );
        process.exitCode = 1;
    }
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
    main(process.argv.includes("--check")).catch((e: unknown) => {
        console.error(e);
        process.exitCode = 1;
    });
}
