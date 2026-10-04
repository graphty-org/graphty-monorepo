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
    return s
        .replace(/\s+/g, " ")
        .replace(/ ?\((?:see |per )?(?:design|research note)\b[^)]*\)/gi, "")
        .replace(/\{@link ([^}\s|]+)(?:[\s|][^}]*)?\}/g, "`$1`")
        .split("|")
        .join(ESCAPED_PIPE)
        .trim();
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
                const t = this.checker.getNonNullableType(this.checker.getTypeOfSymbol(p));
                const doc = this.doc(p);
                const tagged = p
                    .getJsDocTags(this.checker)
                    .find((tag) => tag.name === "defaultValue" || tag.name === "default");
                return {
                    name: p.name,
                    type: this.checker.typeToString(
                        t,
                        undefined,
                        ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
                    ),
                    defaultValue:
                        tagged === undefined
                            ? statedDefault(doc)
                            : ts.displayPartsToString(tagged.text).replace(/^`|`$/g, "").trim(),
                    doc,
                };
            });
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
            importOptions: importOptions === undefined ? undefined : src.options(types.get(importOptions) as ts.Symbol),
            exportOptions: exportOptions === undefined ? undefined : src.options(types.get(exportOptions) as ts.Symbol),
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
    return {
        src,
        index,
        runtime,
        formats: withRelayedDocs(await collectFormats(src), src, index, runtime),
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
        return v.join(", ");
    }
    return String(v);
}

/**
 * The exporters' fidelity, one row per format (and per JSON dialect), one column per capability.
 * @param ctx - the context
 * @returns the markdown lines
 */
function fidelityTable(ctx: Context): string[] {
    const fields = [...ctx.capabilityDocs.keys()];
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
    return [...ctx.capabilityDocs].map(([k, doc]) => `- ${code(k)}: ${cell(doc)}`);
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
        ...capabilityLegend(ctx),
    ];
}

/**
 * A format's "At a glance" block.
 * @param ctx - the context
 * @param f - the format
 * @returns the markdown lines
 */
function glanceBlock(ctx: Context, f: FormatFacts): string[] {
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
    if (f.exporter === undefined) {
        return out;
    }
    out.push("", "What a saved file can hold:", "");
    const fields = [...ctx.capabilityDocs.keys()];
    if (f.name === "json" && ctx.jsonDialects.length > 0) {
        out.push(
            ...table(
                ["Capability", ...ctx.jsonDialects.map((d) => code(d.dialect))],
                fields.map((k) => [
                    `${code(k)}: ${cell(ctx.capabilityDocs.get(k) ?? "")}`,
                    ...ctx.jsonDialects.map((d) => capabilityCell(d.caps[k as keyof ExportCapabilities])),
                ]),
            ),
        );
    } else {
        const caps = f.exporter.capabilities;
        out.push(
            ...table(
                ["Capability", "Value", "Meaning"],
                fields.map((k) => [
                    code(k),
                    capabilityCell(caps[k as keyof ExportCapabilities]),
                    cell(ctx.capabilityDocs.get(k) ?? ""),
                ]),
            ),
        );
    }
    return out;
}

/**
 * An options table.
 * @param rows - the options
 * @returns the markdown lines
 */
function optionsTable(rows: readonly OptionRow[]): string[] {
    if (rows.length === 0) {
        return ["No options of its own."];
    }
    return table(
        ["Option", "Type", "Default", "Meaning"],
        rows.map((o) => [code(o.name), code(o.type), o.defaultValue === "" ? "" : code(o.defaultValue), cell(o.doc)]),
    );
}

/**
 * A code table.
 * @param rows - the codes
 * @param errorMeans - what the "error" severity means in this table
 * @returns the markdown lines
 */
function codesTable(rows: readonly CodeRow[], errorMeans: string): string[] {
    return table(
        ["Code", "Key", "Severity", "Meaning"],
        rows.map((r) => [code(r.code), code(r.key), r.code.startsWith("E_") ? errorMeans : "warning", cell(r.doc)]),
    );
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
function referenceBlock(f: FormatFacts): string[] {
    const out: string[] = [];
    if (f.importer !== undefined) {
        out.push(
            "## Import options",
            "",
            "These come on top of the [options every importer takes](../options.md#every-importer).",
            "",
            ...optionsTable(f.importOptions ?? []),
            "",
        );
    }
    if (f.exporter !== undefined) {
        out.push(
            "## Export options",
            "",
            "These come on top of the [options every exporter takes](../options.md#every-exporter).",
            "",
            ...optionsTable(f.exportOptions ?? []),
            "",
        );
    }
    if (f.issues.length > 0) {
        out.push(
            "## Import issue codes",
            "",
            `The codes this format's import report can hold, also exported as \`${tablePrefix(f)}_ISSUE\` from \`${f.subpath}\`.`,
            "",
            ...codesTable(f.issues, "error"),
            "",
        );
    }
    if (f.losses.length > 0) {
        out.push(
            "## Loss codes",
            "",
            `The codes \`check()\` can return before a save, also exported as \`${tablePrefix(f)}_LOSS\` from \`${f.subpath}\`. An \`E_\` code means the save throws unless you change the graph or the options.`,
            "",
            ...codesTable(f.losses, "error (save throws)"),
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
    return [
        "## Every importer",
        "",
        "`CommonImportOptions`: every importer accepts these next to its own options.",
        "",
        ...optionsTable(commonImport),
        "",
        "## Every exporter",
        "",
        "`CommonExportOptions`: every exporter accepts these next to its own options.",
        "",
        ...optionsTable(commonExport),
        "",
        "## importGraph and importAllGraphs",
        "",
        "`ImportGraphOptions`: everything above, plus these, plus the chosen format's own import options.",
        "",
        ...optionsTable(ctx.src.options(sym("ImportGraphOptions"), inherited).filter((o) => o.name !== "__index")),
        "",
        "## exportGraph and checkExport",
        "",
        "`ExportGraphOptions`: everything above, plus these, plus the chosen format's own export options.",
        "",
        ...optionsTable(ctx.src.options(sym("ExportGraphOptions"), inherited).filter((o) => o.name !== "__index")),
        "",
        "## Each format's own options",
        "",
        ...table(
            ["Format", "Import options", "Export options"],
            ctx.formats.map((f) => [
                `[${f.name}](./formats/${f.name}.md)`,
                f.importer === undefined
                    ? "no importer"
                    : `[${(f.importOptions ?? []).length}](./formats/${f.name}.md#import-options)`,
                f.exporter === undefined
                    ? "read only"
                    : `[${(f.exportOptions ?? []).length}](./formats/${f.name}.md#export-options)`,
            ]),
        ),
    ];
}

/** One code across every format. */
interface CodeUse {
    doc: string;
    readonly importers: string[];
    readonly exporters: string[];
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
            u = { doc: "", importers: [], exporters: [] };
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
                    u.exporters.length > 0 ? `Save: ${list(u.exporters)}.` : "",
                ]
                    .filter((s) => s !== "")
                    .join(" ");
                return `- ${code(c)}: ${cell(u.doc)}${where === "" ? "" : ` ${where}`}`;
            }),
        "",
    ];
    return [...section("## Errors", "E_"), ...section("## Warnings", "W_")];
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
        pages.set(`guide/formats/${f}.md`, [`glance:${f}`, `reference:${f}`]);
    }
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
    const file = `${docsDir}examples/${name}.ts`;
    if (!existsSync(file)) {
        throw new Error(`example ${name}: ${file} does not exist`);
    }
    return ["```ts", readFileSync(file, "utf8").trim(), "```"].join("\n");
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
            return rel === "api" || rel === "examples" ? [] : markdownPages(`${rel}/`);
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
                return glanceBlock(ctx, f).join("\n");
            }
            break;
        case "reference":
            if (f !== undefined) {
                return referenceBlock(f).join("\n");
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

/** What a published doc comment must not mention: the package's internal design documents and process. */
export const INTERNAL_REFERENCE =
    /design\s+sections?\b|\bdesign\s+\d+\.\d|research\s+note|STATUS\.md|decision\s+D-[A-Z]|\bissue\s+#\d+/i;

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
