/**
 * The OBO importer (design section 4; research-obo.md): the line-oriented OBO flat file format of
 * the Gene Ontology and the OBO Foundry, versions 1.0, 1.2 and 1.4 read as their union (real files
 * do not say which they follow: the GO writes `format-version: 1.2` and uses 1.4 tags), streamed
 * through the common LineReader.
 *
 * `[Term]` and `[Instance]` frames are nodes; `is_a`, `relationship` and `instance_of` clauses are
 * directed edges from the frame to the target, with the relation in a `relation` dict column (role
 * `kind`) and the trailing qualifier block in a `qualifiers` json column. `[Typedef]` frames are
 * metadata (`meta.extra.obo.typedefs`) unless `typedefs: "nodes"`. Every other tag fills the
 * column of its name (src/common/ontology.ts); an unknown tag is kept in `obo.unrecognized`.
 * Frames that share an id are merged (spec 4.1.1): list clauses take the union, a single-valued
 * clause keeps the first. A target no frame declares becomes a placeholder node (the guide's
 * recommended reading; ontologies point into their imports this way) unless `addMissingNodes` is
 * false.
 *
 * ponytail: the frames are held until the end of the file (merging needs every frame of an id,
 * dangling detection the whole id set), so memory is about twice the snapshot's; a two-pass reader
 * would lift that for files beyond a few hundred megabytes.
 */

import {
    type ColumnHandle,
    GraphFormatError,
    type GraphMetaPatch,
    type GraphSink,
    INVALID_INDEX,
    type NodeId,
} from "@graphty/graph-format";

import { declareResolved, RENAMED_CODE, ROLE_TAKEN_CODE } from "../../common/attributes.js";
import {
    BAD_VALUE_CODE,
    DANGLING_REFERENCE_CODE,
    DUPLICATE_ATTRIBUTE_CODE,
    DUPLICATE_NODE_CODE,
    ELEMENT_ISSUE,
    EMPTY_INPUT_CODE,
    ENCODING_FALLBACK_CODE,
    INPUT_ISSUE,
    INVALID_ENCODING_CODE,
    INVALID_UTF8_CODE,
    MISSING_ID_CODE,
    OPTION_IGNORED_CODE,
    UNKNOWN_ELEMENT_CODE,
    UNKNOWN_ENCODING_CODE,
} from "../../common/codes.js";
import { DirectionResolver } from "../../common/direction.js";
import { ID_MERGED_CODE, IdCoercer } from "../../common/ids.js";
import { LineReader, throwIfAborted } from "../../common/input.js";
import { OBO_NODE_COLUMNS, oboColumnDecl, PLACEHOLDER_COLUMN, SYNONYM_SCOPES } from "../../common/ontology.js";
import {
    type ImportFormatDefaults,
    reportSinkOptions,
    reportUnusedOptions,
    resolveImportOptions,
    SINK_OPTION_CODE,
} from "../../common/options.js";
import { agree, plural } from "../../common/plural.js";
import { ImportReportBuilder } from "../../common/report.js";
import { type CommonImportOptions, type GraphImporter, type ImportInput, type ImportReport } from "../../types.js";
import {
    endsWithContinuation,
    hasStrayBrace,
    parseXref,
    parseXrefList,
    type Qualifiers,
    splitFormFeeds,
    splitQualifiers,
    splitTagValue,
    stripComment,
    type Token,
    tokenize,
    unclosedBlock,
    unescapeObo,
    type Xref,
} from "./syntax.js";

/**
 * The format-specific options of the OBO importer.
 * @category Built-in formats
 */
export interface OboImportOptions extends CommonImportOptions {
    /**
     * "keep" reads obsolete terms as nodes with `is_obsolete` set to true; "drop" leaves them and
     * their edges out.
     * @defaultValue "keep"
     */
    obsolete?: "keep" | "drop" | undefined;
    /**
     * "metadata" keeps the `[Typedef]` frames (relation definitions) in
     * `snapshot.meta.extra.obo.typedefs`; "nodes" makes them nodes too, with their `is_a` edges.
     * @defaultValue "metadata"
     */
    typedefs?: "metadata" | "nodes" | undefined;
}

/**
 * Issue codes of the OBO importer.
 * @category Built-in formats
 */
export const OBO_ISSUE = Object.freeze({
    ...INPUT_ISSUE,
    ...ELEMENT_ISSUE,
    /** The input is empty or whitespace. The import stops. */
    EMPTY_INPUT: EMPTY_INPUT_CODE,
    /** The input is not valid UTF-8. The import stops. */
    INVALID_UTF8: INVALID_UTF8_CODE,
    /**
     * Some bytes are not valid in the encoding that was chosen (by a byte order mark or the `encoding` option). The
     * import stops.
     */
    INVALID_ENCODING: INVALID_ENCODING_CODE,
    /** Bytes that are not UTF-8 were read as windows-1252. */
    ENCODING_FALLBACK: ENCODING_FALLBACK_CODE,
    /** A declared encoding the platform cannot decode was ignored. */
    UNKNOWN_ENCODING: UNKNOWN_ENCODING_CODE,
    /** A frame without an `id` clause; the frame is skipped. */
    MISSING_ID: MISSING_ID_CODE,
    /** A clause whose value cannot be read (a boolean other than true / false, a relationship with one or three values); the clause is skipped. */
    BAD_VALUE: BAD_VALUE_CODE,
    /** Two frames have the same id, so they were merged into one node. */
    DUPLICATE_NODE: DUPLICATE_NODE_CODE,
    /** A tag that may appear once per frame appears twice; the first value is kept. */
    DUPLICATE_ATTRIBUTE: DUPLICATE_ATTRIBUTE_CODE,
    /** An unknown tag (kept in `obo.unrecognized`) or frame type (skipped), once per name. */
    UNKNOWN_ELEMENT: UNKNOWN_ELEMENT_CODE,
    /** A target no frame declares: a placeholder node was made, or the edge dropped under addMissingNodes false. */
    DANGLING_REFERENCE: DANGLING_REFERENCE_CODE,
    /** A line without a colon, an unterminated quote, a def without its xref list, a qualifier block that does not parse, an unescaped brace. */
    SYNTAX: "W_OBO_SYNTAX",
    /**
     * Nothing in the input looks like OBO: there is no frame header and no header tag. It may be an HTML page, a JSON
     * or GML file, or UTF-16 text without a byte order mark. The import stops.
     */
    NOT_OBO: "E_OBO_NOT_OBO",
    /**
     * The header has no `format-version` (OBO 1.2 and 1.4 require one), or names a version other than 1.0, 1.2 or 1.4.
     * The file is read accepting the tags of every version.
     */
    FORMAT_VERSION: "W_OBO_FORMAT_VERSION",
    /** The frame's `id` is not its first clause; it is used anyway. */
    ID_NOT_FIRST: "W_OBO_ID_NOT_FIRST",
    /** A synonym without a scope in a file that does not say 1.2, or with a scope that is not one of the four. */
    SYNONYM_SCOPE: "W_OBO_SYNONYM_SCOPE",
    /** A relation, subset or synonym type that nothing declares. */
    UNDECLARED: "W_OBO_UNDECLARED",
    /** One id for a Term and a Typedef (or an Instance); the Term (the first node frame) is the node. */
    ID_KIND_CLASH: "W_OBO_ID_KIND_CLASH",
    /** A frame has only one `intersection_of` or `union_of` clause, where OBO needs at least two. */
    CARDINALITY: "W_OBO_CARDINALITY",
    /** An obsolete term with is_a / relationship, or replaced_by / consider on a term that is not obsolete. */
    OBSOLETION: "W_OBO_OBSOLETION",
    /** An OBO 1.0 / 1.2 tag read as its 1.4 meaning (exact_synonym, xref_analog, use_term, typeref, version). */
    DEPRECATED_TAG: "W_OBO_DEPRECATED_TAG",
    /** A backslash line continuation (deprecated in 1.4). */
    DEPRECATED_SYNTAX: "W_OBO_DEPRECATED_SYNTAX",
    /**
     * A header clause whose meaning graph-io does not apply (`import`, `id-mapping`, the `treat-xrefs` macros,
     * `owl-axioms`); it is kept in `snapshot.meta.extra.obo.header`.
     */
    HEADER_NOT_APPLIED: "W_OBO_HEADER_NOT_APPLIED",
    /** Obsolete terms and their edges left out under obsolete: "drop". */
    OBSOLETE_DROPPED: "W_OBO_OBSOLETE_DROPPED",
    /**
     * Two different id texts became the same number because `ids` is "number" (for example, "042" and "42"), so their nodes
     * were merged.
     */
    ID_MERGED: ID_MERGED_CODE,
    /** An OBO attribute was renamed `<name>#obo` because another attribute already has its name. */
    COLUMN_RENAMED: RENAMED_CODE,
    /**
     * You read into a graph builder that already has an id, label or position attribute, so this file's one is kept as
     * a plain attribute.
     */
    ROLE_TAKEN: ROLE_TAKEN_CODE,
    /** You set an option this format does not use; it had no effect. The message names the option. */
    OPTION_IGNORED: OPTION_IGNORED_CODE,
    /**
     * You read into your own graph builder, which was created with a different `addMissingNodes`, `duplicateEdges`,
     * `selfLoops` or `weightDtype` than the option you passed; the builder's setting applies.
     */
    SINK_OPTION: SINK_OPTION_CODE,
});

/** The common options the OBO importer reads. */
const USED_OPTIONS: ReadonlySet<keyof CommonImportOptions> = new Set<keyof CommonImportOptions>([
    "ids",
    "addMissingNodes",
    "duplicateEdges",
    "selfLoops",
    "onMixedDirection",
    "weightDtype",
    "errorLimit",
    "signal",
    "onProgress",
    "encoding",
    "restoreMangledIds",
]);

/** The property_value relation under which the exporter keeps an id it rewrote (`sanitizeIds: "mangle"`). */
const ORIGINAL_ID = "graphty:originalId";

const DEFAULTS: ImportFormatDefaults = { ids: "keep", defaultDirected: true, weightFrom: null };

/** Frames between two checks of the cancellation signal. */
const ABORT_CHECK_INTERVAL = 64;

/** Bytes of the head sniff() reads. */
const SNIFF_BYTES = 4096;

const FRAME_KINDS: ReadonlySet<string> = new Set(["Term", "Typedef", "Instance"]);

/** Header tags kept but not applied (design 4.3, W_OBO_HEADER_NOT_APPLIED). */
const NOT_APPLIED_HEADER = /^(import|typeref|id-mapping|default-relationship-id-prefix|owl-axioms|treat-xrefs-as-.*)$/;

/** Deprecated header tags and what they are now. */
const DEPRECATED_HEADER: ReadonlyMap<string, string> = new Map([
    ["typeref", "import"],
    ["version", "data-version"],
]);

/**
 * The 1.0 / 1.2 frame tags read as their 1.4 meaning: tag to [1.4 tag, synonym scope].
 * @category Plugin helpers
 */
export const DEPRECATED_TAGS: ReadonlyMap<string, readonly [string, string | null]> = new Map([
    ["exact_synonym", ["synonym", "EXACT"]],
    ["narrow_synonym", ["synonym", "NARROW"]],
    ["broad_synonym", ["synonym", "BROAD"]],
    ["related_synonym", ["synonym", "RELATED"]],
    ["xref_analog", ["xref", null]],
    ["xref_unk", ["xref", null]],
    ["xref_unknown", ["xref", null]],
    ["use_term", ["consider", null]],
]);

/** Relations every OBO file may use without a Typedef (the 1.2 built-ins). */
const BUILTIN_RELATIONS: ReadonlySet<string> = new Set([
    "is_a",
    "instance_of",
    "disjoint_from",
    "inverse_of",
    "union_of",
    "intersection_of",
]);

/**
 * Single-valued text tags (first value kept).
 * @category Plugin helpers
 */
export const TEXT_TAGS: ReadonlySet<string> = new Set([
    "name",
    "namespace",
    "comment",
    "created_by",
    "creation_date",
    "domain",
    "range",
    "inverse_of",
]);

/**
 * Single-valued boolean tags.
 * @category Plugin helpers
 */
export const BOOL_TAGS: ReadonlySet<string> = new Set(
    Object.keys(OBO_NODE_COLUMNS).filter((name) => OBO_NODE_COLUMNS[name].dtype === "bool"),
);

/**
 * Tags whose value is one id, collected in a list column.
 * @category Plugin helpers
 */
export const ID_LIST_TAGS: ReadonlySet<string> = new Set([
    "alt_id",
    "subset",
    "replaced_by",
    "consider",
    "union_of",
    "equivalent_to",
    "disjoint_from",
    "transitive_over",
    "disjoint_over",
]);

/** Header tags the specification allows once (the first is kept). */
const SINGLE_HEADER_TAGS: ReadonlySet<string> = new Set([
    "format-version",
    "data-version",
    "version",
    "date",
    "saved-by",
    "auto-generated-by",
    "default-namespace",
    "ontology",
    "default-relationship-id-prefix",
]);

/** The format versions the importer knows (it reads their union). */
const KNOWN_VERSION = /^(GO_)?1\.[024]$/;

/** Tags whose value is an id, where a qualifier block cut short by a truncated file is dropped. */
const ID_VALUE_TAGS: ReadonlySet<string> = new Set([
    ...ID_LIST_TAGS,
    "is_a",
    "instance_of",
    "relationship",
    "intersection_of",
]);

/** Warnings listed per code before the rest are summed up in one (a file of 50k unknown tags). */
const MAX_TALLIES_PER_CODE = 100;

/**
 * Whether a text holds a control character other than tab, line feed, form feed (a line end in
 * the 1.4 grammar, text inside quotes) and carriage return.
 * @param text - the text
 * @returns true when it does
 */
function hasControl(text: string): boolean {
    for (const ch of text) {
        if ((ch < " " && ch !== "\t" && ch !== "\n" && ch !== "\f" && ch !== "\r") || ch === "\x7f") {
            return true;
        }
    }
    return false;
}

/**
 * Whether a tag could name an OBO tag: no whitespace, control characters or the punctuation of
 * other formats (`{`, `"`, `<`, brackets, parentheses).
 * @param tag - the tag
 * @returns true for a plausible tag
 */
function isTagName(tag: string): boolean {
    return tag.length > 0 && !hasControl(tag) && !/[\s{}"<>[\]()]/.test(tag);
}

/**
 * A record with no prototype, so a key named after an Object.prototype member (`__proto__`,
 * `constructor`, `toString`) is an own key like any other.
 * @returns the empty record
 */
function ownRecord<T>(): Record<string, T> {
    return Object.create(null) as Record<string, T>;
}

/**
 * Append a value to the list of a key in a null-prototype record.
 * @param map - the record
 * @param key - the key
 * @param value - the value
 */
function append<T>(map: Record<string, T[]>, key: string, value: T): void {
    if (Object.hasOwn(map, key)) {
        map[key].push(value);
    } else {
        map[key] = [value];
    }
}

/**
 * Tags that only a Typedef frame may carry (elsewhere they are unrecognized).
 * @category Plugin helpers
 */
export const TYPEDEF_TAGS: ReadonlySet<string> = new Set([
    "domain",
    "range",
    "inverse_of",
    "transitive_over",
    "disjoint_over",
    "holds_over_chain",
    "equivalent_to_chain",
    "expand_assertion_to",
    "expand_expression_to",
    "is_cyclic",
    "is_reflexive",
    "is_symmetric",
    "is_anti_symmetric",
    "is_asymmetric",
    "is_transitive",
    "is_functional",
    "is_inverse_functional",
    "is_metadata_tag",
    "is_class_level",
]);

type FrameKind = "Term" | "Typedef" | "Instance";

/** One clause as read: the tag and the raw value without its comment. */
interface Clause {
    readonly tag: string;
    readonly value: string;
    readonly line: number;
}

/** An edge held until the end of the file. */
interface PendingEdge {
    readonly relation: string;
    readonly target: string;
    readonly qualifiers: Qualifiers | null;
    readonly line: number;
}

/** Everything read for one id, over all of its frames. */
interface NodeRecord {
    readonly id: string;
    readonly kind: FrameKind;
    readonly line: number;
    /** Single values and whole-cell values by column. */
    readonly values: Map<string, unknown>;
    /** List and json-list cells by column. */
    readonly lists: Map<string, unknown[]>;
    readonly edges: PendingEdge[];
    /** The clauses already applied (spec 4.1.1: an identical clause counts once). */
    readonly seen: Set<string>;
    /** Typedef frames: every clause by tag, raw, for `meta.extra.obo.typedefs`. */
    readonly raw: Record<string, string[]>;
}

/** Where a clause is: its line and the id of its frame. */
interface Where {
    readonly line: number;
    readonly element: string;
}

/** A warning counted while reading and recorded once at the end. */
interface Tally {
    readonly category: "parse-error" | "validation-error" | "coercion" | "unsupported" | "merged";
    readonly code: string;
    readonly element: string;
    readonly what: string;
    readonly line: number;
    count: number;
}

/** The OBO-specific options, resolved. */
interface ResolvedOboOptions {
    readonly obsolete: "keep" | "drop";
    readonly typedefs: "metadata" | "nodes";
}

/**
 * Resolve the OBO-specific options.
 * @param options - the caller's options
 * @returns the resolved options; E_UNSUPPORTED for a value outside its set
 */
function resolveOboOptions(options: OboImportOptions | undefined): ResolvedOboOptions {
    const obsolete = options?.obsolete ?? "keep";
    const typedefs = options?.typedefs ?? "metadata";
    if (obsolete !== "keep" && obsolete !== "drop") {
        throw unsupported("obsolete", obsolete, ["keep", "drop"]);
    }
    if (typedefs !== "metadata" && typedefs !== "nodes") {
        throw unsupported("typedefs", typedefs, ["metadata", "nodes"]);
    }
    return { obsolete, typedefs };
}

/**
 * The E_UNSUPPORTED error of an option outside its set.
 * @param option - the option name
 * @param found - the value
 * @param supported - the allowed values
 * @returns the error
 */
function unsupported(option: string, found: unknown, supported: readonly string[]): Error {
    return new GraphFormatError(
        "E_UNSUPPORTED",
        `option ${option}: ${JSON.stringify(found)} is not one of ${supported.join(", ")}`,
        {
            option,
            found,
            supported,
        },
    );
}

/** One import's state. */
class OboReader {
    private readonly report: ImportReportBuilder;

    private readonly signal: AbortSignal | null;

    /** Header clauses by tag, raw, in order. */
    private readonly header: Record<string, string[]> = ownRecord<string[]>();

    /** Whether `[Typedef]` frames are nodes (typedefs "nodes"). */
    private readonly typedefsAsNodes: boolean;

    /** Whether any frame header was read. */
    private frameSeen = false;

    /** Header clauses whose tag could be an OBO tag. */
    private tagClauses = 0;

    /** The first line that is not a frame header, a comment or a tag-value line with a plausible tag. */
    private firstBadLine: number | null = null;

    private version: string | null = null;

    private defaultNamespace: string | null = null;

    private readonly subsets = new Set<string>();

    /** Declared synonym types and their default scope (null: none). */
    private readonly synonymTypes = new Map<string, string | null>();

    /** Node frames (Term, Instance) by id, in first-appearance order. */
    readonly nodes = new Map<string, NodeRecord>();

    /** Typedef frames by id. */
    readonly typedefs = new Map<string, NodeRecord>();

    private readonly tallies = new Map<string, Tally>();

    /** The frame being read: its kind (null for an unknown frame type), name and clauses. */
    private frame: { kind: FrameKind | null; name: string; line: number; clauses: Clause[] } | null = null;

    /** The frames of an unknown type, raw, for `meta.extra.obo.unknownFrames`. */
    readonly unknownFrames: { type: string; clauses: Record<string, string[]> }[] = [];

    private framesSinceCheck = 0;

    /** Whether any significant line was read. */
    significant = false;

    /**
     * Create a reader.
     * @param report - the report
     * @param signal - the cancellation signal
     * @param typedefsAsNodes - whether `[Typedef]` frames are nodes
     */
    constructor(report: ImportReportBuilder, signal: AbortSignal | null, typedefsAsNodes: boolean) {
        this.report = report;
        this.signal = signal;
        this.typedefsAsNodes = typedefsAsNodes;
    }

    /**
     * Read one logical line.
     * @param text - the line, continuation joined
     * @param line - its 1-based number
     */
    line(text: string, line: number): void {
        const t = text.trim();
        if (t.length === 0) {
            return;
        }
        this.significant = true;
        if (t.startsWith("!")) {
            return;
        }
        if (t.startsWith("[") && this.frameHeader(t, line)) {
            return;
        }
        // the comment goes first, so a colon inside it never makes `foo ! a:b` a tag-value line
        const tv = splitTagValue(stripComment(t));
        if (tv === null || tv.tag.length === 0) {
            this.firstBadLine ??= line;
            const what = tv === null ? "a line without a colon was skipped" : "a line without a tag was skipped";
            this.tally("parse-error", OBO_ISSUE.SYNTAX, what, "line", line);
            return;
        }
        const clause: Clause = { tag: tv.tag, value: stripComment(tv.rest), line };
        if (this.frame === null) {
            if (isTagName(tv.tag)) {
                this.tagClauses++;
            } else {
                this.firstBadLine ??= line;
            }
            this.headerClause(clause);
        } else {
            this.frame.clauses.push(clause);
        }
    }

    /**
     * Start a frame at a line opening with `[`: a well-formed header, or one damaged so that only a
     * frame header can be meant (a known frame name, or no colon: `[Term`, `[Term] extra`), with a
     * warning, so the clauses after it never merge into the frame before.
     * @param t - the trimmed line
     * @param line - its number
     * @returns false when the line is not a frame header
     */
    private frameHeader(t: string, line: number): boolean {
        const close = t.indexOf("]");
        const name = (close < 0 ? t.slice(1) : t.slice(1, close)).trim();
        const after = close < 0 ? "" : t.slice(close + 1).trim();
        const clean = close >= 0 && (after.length === 0 || after.startsWith("!"));
        if (!clean && !FRAME_KINDS.has(name) && t.includes(":")) {
            return false;
        }
        if (!clean) {
            const what =
                close < 0
                    ? "a frame header without its closing ] starts the frame"
                    : "text after a frame header was ignored";
            this.tally("parse-error", OBO_ISSUE.SYNTAX, what, `[${name}]`, line);
        }
        // a known frame name, or a clean header with a name: anything else (`[`, `[{"id": 1}]`, a JSON
        // array) is read as a damaged header but is no proof the input is OBO
        const proof = FRAME_KINDS.has(name) || (clean && /^[A-Za-z]/.test(name) && isTagName(name));
        if (!proof) {
            this.firstBadLine ??= line;
        }
        this.startFrame(name, line, proof);
        return true;
    }

    /**
     * Start a frame, finishing the one before.
     * @param name - the frame type
     * @param line - the header's line
     * @param proof - whether the header shows the input is OBO
     */
    private startFrame(name: string, line: number, proof: boolean): void {
        this.finishFrame();
        this.frameSeen ||= proof;
        const kind = FRAME_KINDS.has(name) ? (name as FrameKind) : null;
        if (kind === null) {
            this.tally(
                "validation-error",
                OBO_ISSUE.UNKNOWN_ELEMENT,
                "frames of an unknown type are not nodes; kept in meta.extra.obo.unknownFrames",
                `[${name}]`,
                line,
            );
        }
        this.frame = { kind, name, line, clauses: [] };
    }

    /**
     * Record one header clause.
     * @param clause - the clause
     */
    private headerClause(clause: Clause): void {
        append(this.header, clause.tag, clause.value);
        const { tag } = clause;
        if (SINGLE_HEADER_TAGS.has(tag) && this.header[tag].length > 1) {
            this.tally(
                "validation-error",
                OBO_ISSUE.DUPLICATE_ATTRIBUTE,
                "a single-valued header tag given twice; the first is kept",
                tag,
                clause.line,
            );
        }
        const tokens = tokenize(splitQualifiers(clause.value).value);
        const first = tokens.length > 0 && tokens[0].kind === "word" ? tokens[0].text : null;
        if (tag === "format-version") {
            this.version ??= unescapeObo(clause.value).trim();
        } else if (tag === "default-namespace") {
            this.defaultNamespace ??= first;
        } else if ((tag === "subsetdef" || tag === "synonymtypedef") && first === null) {
            this.tally(
                "parse-error",
                OBO_ISSUE.SYNTAX,
                "a declaration whose name is not a word declares nothing",
                tag,
                clause.line,
            );
        } else if (tag === "subsetdef" && first !== null) {
            this.subsets.add(first);
        } else if (tag === "synonymtypedef" && first !== null) {
            const scope = tokens.slice(1).find((t) => t.kind === "word" && SYNONYM_SCOPES.has(t.text));
            this.synonymTypes.set(first, scope?.text ?? null);
        }
        const now = DEPRECATED_HEADER.get(tag);
        if (now !== undefined) {
            this.tally("coercion", OBO_ISSUE.DEPRECATED_TAG, `the 1.0 header tag is read as ${now}`, tag, clause.line);
        }
        if (NOT_APPLIED_HEADER.test(tag)) {
            this.tally(
                "unsupported",
                OBO_ISSUE.HEADER_NOT_APPLIED,
                "kept in meta.extra.obo.header, not applied",
                tag,
                clause.line,
            );
        }
    }

    /** Finish the frame being read: find its id and merge its clauses into the record of that id. */
    finishFrame(): void {
        const { frame } = this;
        this.frame = null;
        if (frame === null) {
            return;
        }
        if (frame.kind === null) {
            // the guides: an unrecognized frame must survive, so its clauses are kept, raw
            const clauses = ownRecord<string[]>();
            for (const clause of frame.clauses) {
                append(clauses, clause.tag, clause.value);
            }
            this.unknownFrames.push({ type: frame.name, clauses });
            return;
        }
        if (++this.framesSinceCheck >= ABORT_CHECK_INTERVAL) {
            this.framesSinceCheck = 0;
            throwIfAborted(this.signal);
        }
        const idAt = frame.clauses.findIndex((c) => c.tag === "id");
        const idParts = idAt < 0 ? null : splitQualifiers(frame.clauses[idAt].value);
        const rawId = idParts === null ? "" : idParts.value.trim();
        const id = unescapeObo(rawId).trim();
        // a Typedef is metadata unless typedefs "nodes": it would never have been a node
        const wouldBeNode = frame.kind !== "Typedef" || this.typedefsAsNodes;
        if (id.length === 0) {
            this.report.error(
                "missing-value",
                OBO_ISSUE.MISSING_ID,
                `a [${frame.kind}] frame has no id; it is skipped`,
                {
                    line: frame.line,
                },
            );
            if (wouldBeNode) {
                this.report.counts.skippedNodes++;
            }
            return;
        }
        if (tokenize(rawId).length > 1 || hasControl(id)) {
            // a reference cannot name such an id (is_a needs one word), so the frame is refused
            // rather than made a node no edge can reach
            this.report.error(
                "validation-error",
                OBO_ISSUE.BAD_VALUE,
                `a [${frame.kind}] frame's id ${JSON.stringify(id)} holds unescaped whitespace or a control character; the frame is skipped`,
                { line: frame.clauses[idAt].line, element: id },
            );
            if (wouldBeNode) {
                this.report.counts.skippedNodes++;
            }
            return;
        }
        if (idAt > 0) {
            this.tally(
                "validation-error",
                OBO_ISSUE.ID_NOT_FIRST,
                "the id clause is not the frame's first; it is used",
                "id",
                frame.clauses[idAt].line,
            );
        }
        const target = this.recordFor(frame.kind, id, frame.line);
        this.extraQualifiers(target, "id", id, idParts?.qualifiers ?? null);
        for (let i = 0; i < frame.clauses.length; i++) {
            const clause = frame.clauses[i];
            if (clause.tag === "id") {
                if (i !== idAt) {
                    this.tally(
                        "validation-error",
                        OBO_ISSUE.DUPLICATE_ATTRIBUTE,
                        "a frame names a second id; the first is kept",
                        "id",
                        clause.line,
                    );
                }
                continue;
            }
            this.applyClause(target, clause);
        }
        if (target.kind === "Typedef" && !Object.hasOwn(target.raw, "id")) {
            target.raw.id = [id];
        }
    }

    /**
     * The record a frame merges into: the existing one of its id, or a new one.
     * @param kind - the frame type
     * @param id - the id
     * @param line - the frame's line
     * @returns the record
     */
    private recordFor(kind: FrameKind, id: string, line: number): NodeRecord {
        const map = kind === "Typedef" ? this.typedefs : this.nodes;
        const existing = map.get(id);
        if (existing !== undefined) {
            if (existing.kind !== kind) {
                this.tally(
                    "validation-error",
                    OBO_ISSUE.ID_KIND_CLASH,
                    `an id names both a ${existing.kind} and an ${kind}; the ${existing.kind} is the node`,
                    id,
                    line,
                );
            } else {
                this.tally(
                    "merged",
                    OBO_ISSUE.DUPLICATE_NODE,
                    `[${kind}] frames with this id are merged (spec 4.1.1)`,
                    id,
                    line,
                );
            }
            return existing;
        }
        const created: NodeRecord = {
            id,
            kind,
            line,
            values: new Map(),
            lists: new Map(),
            edges: [],
            seen: new Set(),
            raw: ownRecord<string[]>(),
        };
        map.set(id, created);
        return created;
    }

    /**
     * A clause's tag (a 1.0 tag read as its current one), the synonym scope that tag implies, its
     * qualifier block and its value, with the syntax warnings about stray braces recorded.
     * @param clause - the clause
     * @returns the parts
     */
    private clauseParts(clause: Clause): {
        tag: string;
        scope: string | null;
        qualifiers: ReturnType<typeof splitQualifiers>["qualifiers"];
        value: string;
    } {
        let { tag } = clause;
        let scope: string | null = null;
        const deprecated = DEPRECATED_TAGS.get(tag);
        if (deprecated !== undefined) {
            this.tally(
                "coercion",
                OBO_ISSUE.DEPRECATED_TAG,
                `the 1.0 tag is read as ${deprecated[0]}`,
                tag,
                clause.line,
            );
            [tag, scope] = deprecated;
        }
        let split = splitQualifiers(clause.value);
        const open = ID_VALUE_TAGS.has(tag) ? unclosedBlock(split.value) : -1;
        if (open >= 0) {
            this.tally(
                "parse-error",
                OBO_ISSUE.SYNTAX,
                "a qualifier block without its closing brace was dropped",
                tag,
                clause.line,
            );
            split = splitQualifiers(split.value.slice(0, open).trimEnd());
        }
        const { qualifiers } = split;
        if (split.badBlock !== null) {
            this.tally(
                "parse-error",
                OBO_ISSUE.SYNTAX,
                "a closing brace that is not a qualifier block was kept as text",
                tag,
                clause.line,
            );
        } else if (hasStrayBrace(split.value)) {
            this.tally(
                "parse-error",
                OBO_ISSUE.SYNTAX,
                "an unescaped brace inside a value was kept as text",
                tag,
                clause.line,
            );
        }
        return { tag, scope, qualifiers, value: split.value };
    }

    /**
     * A def, expand_assertion_to or expand_expression_to clause: quoted text and its xref list.
     * @param record - the record
     * @param tag - the tag
     * @param value - the clause value
     * @param tokens - its tokens
     * @param qualifiers - its qualifier block
     * @param line - its line
     */
    private definition(
        record: NodeRecord,
        tag: string,
        value: string,
        tokens: ReturnType<typeof tokenize>,
        qualifiers: ReturnType<typeof splitQualifiers>["qualifiers"],
        line: number,
    ): void {
        if (tag === "def" && record.values.has("def")) {
            // the second def of an id: reported, and none of its xrefs leak into the first's
            this.single(record, "def", null, line);
            return;
        }
        const text = this.quotedWithXrefs(record, tag, value, tokens, line);
        if (tag === "def") {
            this.single(record, "def", text.text, line, () => {
                record.values.set("def.xrefs", text.xrefs);
            });
            this.extraQualifiers(record, tag, text.text, qualifiers);
        } else {
            this.push(record, tag, withQualifiers({ template: text.text, xrefs: text.xrefs }, qualifiers));
        }
    }

    /**
     * Apply one clause to a record.
     * @param record - the record
     * @param clause - the clause
     */
    private applyClause(record: NodeRecord, clause: Clause): void {
        const key = `${clause.tag}\u0000${clause.value}`;
        if (record.seen.has(key)) {
            return;
        }
        record.seen.add(key);
        if (record.kind === "Typedef") {
            append(record.raw, clause.tag, clause.value);
        }
        const { tag, scope, qualifiers, value } = this.clauseParts(clause);
        // a control character kept in the value is the shared W_CONTROL_CHARACTER of the text check
        const where = { line: clause.line, element: record.id };
        if (TYPEDEF_TAGS.has(tag) && record.kind !== "Typedef") {
            this.unrecognized(record, clause);
            return;
        }
        if (TEXT_TAGS.has(tag)) {
            this.text(record, tag, value, qualifiers, clause.line);
            return;
        }
        if (BOOL_TAGS.has(tag)) {
            const text = unescapeObo(value).trim();
            if (text !== "true" && text !== "false") {
                this.report.error(
                    "validation-error",
                    OBO_ISSUE.BAD_VALUE,
                    `${tag}: ${JSON.stringify(text)} is not true or false; the clause is skipped`,
                    where,
                );
                return;
            }
            this.single(record, tag, text === "true", clause.line);
            this.extraQualifiers(record, tag, text, qualifiers);
            return;
        }
        const tokens = tokenize(value);
        if (ID_LIST_TAGS.has(tag)) {
            const id = this.oneWord(tokens, tag, where);
            if (id !== null) {
                this.push(record, tag, id);
                this.extraQualifiers(record, tag, id, qualifiers);
                if (tag === "subset" && !this.subsets.has(id)) {
                    this.tally(
                        "validation-error",
                        OBO_ISSUE.UNDECLARED,
                        "a subset no subsetdef declares",
                        id,
                        clause.line,
                    );
                }
            }
            return;
        }
        switch (tag) {
            case "is_a":
            case "instance_of": {
                if (tag === "instance_of" && record.kind !== "Instance") {
                    this.unrecognized(record, clause);
                    return;
                }
                const target = this.oneWord(tokens, tag, where);
                if (target !== null) {
                    record.edges.push({ relation: tag, target, qualifiers, line: clause.line });
                }
                return;
            }
            case "relationship": {
                if (tokens.length !== 2 || tokens.some((t) => t.kind !== "word")) {
                    this.report.error(
                        "validation-error",
                        OBO_ISSUE.BAD_VALUE,
                        `relationship needs a relation and a target, found ${JSON.stringify(unescapeObo(value))}; the clause is skipped`,
                        where,
                    );
                    return;
                }
                record.edges.push({ relation: tokens[0].text, target: tokens[1].text, qualifiers, line: clause.line });
                return;
            }
            case "intersection_of": {
                if (tokens.length < 1 || tokens.length > 2 || tokens.some((t) => t.kind !== "word")) {
                    this.report.error(
                        "validation-error",
                        OBO_ISSUE.BAD_VALUE,
                        `intersection_of needs a class, or a relation and a class, found ${JSON.stringify(unescapeObo(value))}; the clause is skipped`,
                        where,
                    );
                    return;
                }
                const item: Record<string, unknown> =
                    tokens.length === 1
                        ? { relation: null, target: tokens[0].text }
                        : { relation: tokens[0].text, target: tokens[1].text };
                this.push(record, tag, withQualifiers(item, qualifiers));
                return;
            }
            case "holds_over_chain":
            case "equivalent_to_chain": {
                if (tokens.length !== 2 || tokens.some((t) => t.kind !== "word")) {
                    this.report.error(
                        "validation-error",
                        OBO_ISSUE.BAD_VALUE,
                        `${tag} needs two relations; the clause is skipped`,
                        where,
                    );
                    return;
                }
                this.push(record, tag, [tokens[0].text, tokens[1].text]);
                this.extraQualifiers(record, tag, `${tokens[0].text} ${tokens[1].text}`, qualifiers);
                return;
            }
            case "def":
            case "expand_assertion_to":
            case "expand_expression_to":
                this.definition(record, tag, value, tokens, qualifiers, clause.line);
                return;
            case "synonym":
                this.synonym(record, tokens, scope, qualifiers, clause.line);
                return;
            case "xref": {
                const xref = parseXref(value);
                if (xref === null) {
                    this.report.error(
                        "validation-error",
                        OBO_ISSUE.BAD_VALUE,
                        "xref has no id; the clause is skipped",
                        where,
                    );
                    return;
                }
                this.push(record, "xref", xref.id);
                this.describe(record, [xref], tag, clause.line);
                this.extraQualifiers(record, tag, xref.id, qualifiers ?? xref.qualifiers);
                return;
            }
            case "property_value":
                this.propertyValue(record, tokens, qualifiers, where);
                return;
            default:
                this.unrecognized(record, clause);
        }
    }

    /**
     * A single-valued text clause (name, comment, ...), warning about a quote that never closes
     * (stripComment() then keeps a `!` comment after it as text).
     * @param record - the record
     * @param tag - the tag
     * @param value - the raw value
     * @param qualifiers - its qualifier block
     * @param line - its line
     */
    private text(record: NodeRecord, tag: string, value: string, qualifiers: Qualifiers | null, line: number): void {
        if (tokenize(value).some((t) => t.kind === "quoted" && t.unterminated)) {
            this.tally(
                "parse-error",
                OBO_ISSUE.SYNTAX,
                "an unterminated quote; the text after it, a comment included, is kept",
                tag,
                line,
            );
        }
        const text = unescapeObo(value).trim();
        this.single(record, tag, text, line);
        this.extraQualifiers(record, tag, text, qualifiers);
    }

    /**
     * Read a value that must be one word.
     * @param tokens - the value's tokens
     * @param tag - the tag, for the message
     * @param where - the location
     * @returns the word, or null after reporting E_BAD_VALUE
     */
    private oneWord(tokens: readonly Token[], tag: string, where: Where): string | null {
        if (tokens.length === 1 && tokens[0].kind === "word") {
            return tokens[0].text;
        }
        const found = tokens.map((t) => t.text).join(" ");
        this.report.error(
            "validation-error",
            OBO_ISSUE.BAD_VALUE,
            `${tag} needs one id, found ${JSON.stringify(found)}; the clause is skipped`,
            where,
        );
        return null;
    }

    /**
     * Read `"text" [xrefs]` (def, expand_*), reporting the forms the grammar does not allow.
     * @param record - the record (xref descriptions go to its `xref.descriptions`)
     * @param tag - the tag
     * @param value - the raw value
     * @param tokens - its tokens
     * @param line - the line
     * @returns the text and the xref ids
     */
    private quotedWithXrefs(
        record: NodeRecord,
        tag: string,
        value: string,
        tokens: readonly Token[],
        line: number,
    ): { text: string; xrefs: string[] } {
        if (tokens.length === 0 || tokens[0].kind !== "quoted") {
            this.tally("parse-error", OBO_ISSUE.SYNTAX, "the text is not quoted; the whole value is kept", tag, line);
            return { text: unescapeObo(value).trim(), xrefs: [] };
        }
        if (tokens[0].unterminated) {
            this.tally(
                "parse-error",
                OBO_ISSUE.SYNTAX,
                "an unterminated quote; the text runs to the end of the line",
                tag,
                line,
            );
            return { text: tokens[0].text, xrefs: [] };
        }
        const list = tokens[1];
        if (list?.kind !== "list") {
            this.tally("parse-error", OBO_ISSUE.SYNTAX, "the xref list is missing", tag, line);
            return { text: tokens[0].text, xrefs: [] };
        }
        if (list.unterminated) {
            this.tally("parse-error", OBO_ISSUE.SYNTAX, "an xref list without its closing ]; kept as read", tag, line);
        }
        if (tokens.length > 2) {
            this.tally("parse-error", OBO_ISSUE.SYNTAX, "text after the xref list was ignored", tag, line);
        }
        const xrefs = parseXrefList(list.text);
        this.describe(record, xrefs, tag, line);
        this.xrefQualifiers(record, tag, xrefs);
        return { text: tokens[0].text, xrefs: xrefs.map((x) => x.id) };
    }

    /**
     * Read a synonym: `"text" SCOPE? TYPE? [xrefs]` (the scope optional in 1.2).
     * @param record - the record
     * @param tokens - the value's tokens
     * @param fixedScope - the scope of a 1.0 tag (exact_synonym), or null
     * @param qualifiers - the clause's qualifiers
     * @param line - the line
     */
    private synonym(
        record: NodeRecord,
        tokens: readonly Token[],
        fixedScope: string | null,
        qualifiers: Qualifiers | null,
        line: number,
    ): void {
        if (tokens.length === 0 || tokens[0].kind !== "quoted") {
            this.report.error(
                "validation-error",
                OBO_ISSUE.BAD_VALUE,
                "a synonym needs its quoted text; the clause is skipped",
                {
                    line,
                    element: record.id,
                },
            );
            return;
        }
        if (tokens[0].unterminated) {
            this.tally(
                "parse-error",
                OBO_ISSUE.SYNTAX,
                "an unterminated quote; the text runs to the end of the line",
                "synonym",
                line,
            );
        }
        const words = tokens
            .slice(1)
            .filter((t) => t.kind === "word")
            .map((t) => t.text);
        const list = tokens.slice(1).find((t) => t.kind === "list");
        let scope: string | null = fixedScope;
        let type: string | null = null;
        if (fixedScope === null) {
            if (words.length > 0 && SYNONYM_SCOPES.has(words[0])) {
                [scope] = words;
                type = words[1] ?? null;
            } else if (words.length > 0 && this.synonymTypes.has(words[0])) {
                [type] = words;
                scope = "RELATED";
            } else if (words.length > 0) {
                [type] = words;
                this.tally(
                    "validation-error",
                    OBO_ISSUE.SYNONYM_SCOPE,
                    `a scope that is not EXACT, BROAD, NARROW or RELATED was kept as the type, scope null`,
                    words[0],
                    line,
                );
            } else {
                scope = "RELATED";
            }
            if (scope === "RELATED" && (words.length === 0 || words[0] === type) && !this.allowsMissingScope()) {
                this.tally(
                    "validation-error",
                    OBO_ISSUE.SYNONYM_SCOPE,
                    "a synonym without a scope (1.2 only) is read as RELATED",
                    "synonym",
                    line,
                );
            }
        }
        if (type !== null) {
            const declared = this.synonymTypes.get(type);
            if (declared === undefined) {
                if (scope !== null) {
                    this.tally(
                        "validation-error",
                        OBO_ISSUE.UNDECLARED,
                        "a synonym type no synonymtypedef declares",
                        type,
                        line,
                    );
                }
            } else if (declared !== null) {
                // the 1.2 guide: a type's default scope is used regardless of the synonym's own
                scope = declared;
            }
        }
        if (words.length > 2 || list === undefined) {
            this.tally(
                "parse-error",
                OBO_ISSUE.SYNTAX,
                list === undefined ? "a synonym without its xref list" : "extra words after the synonym type",
                "synonym",
                line,
            );
        }
        const listAt = list === undefined ? -1 : tokens.indexOf(list);
        const stray = tokens.some(
            (t, k) =>
                k > 0 && (t.kind === "quoted" || (t.kind === "list" && k !== listAt) || (listAt >= 0 && k > listAt)),
        );
        if (stray) {
            this.tally(
                "parse-error",
                OBO_ISSUE.SYNTAX,
                "a second quoted string, a second xref list or text after the list was ignored",
                "synonym",
                line,
            );
        }
        if (list?.unterminated === true) {
            this.tally(
                "parse-error",
                OBO_ISSUE.SYNTAX,
                "an xref list without its closing ]; kept as read",
                "synonym",
                line,
            );
        }
        const xrefs = list === undefined ? [] : parseXrefList(list.text);
        this.describe(record, xrefs, "synonym", line);
        this.xrefQualifiers(record, "synonym", xrefs);
        this.push(
            record,
            "synonym",
            withQualifiers({ text: tokens[0].text, scope, type, xrefs: xrefs.map((x) => x.id) }, qualifiers),
        );
    }

    /**
     * Whether the file's version lets a synonym omit its scope (1.0 and 1.2).
     * @returns true for a 1.2 or 1.0 file
     */
    private allowsMissingScope(): boolean {
        return this.version !== null && /^(1\.[0-2]|GO_1\.[0-2])\b/.test(this.version);
    }

    /**
     * Read a property_value: `relation "literal" datatype` or `relation id`.
     * @param record - the record
     * @param tokens - the value's tokens
     * @param qualifiers - the clause's qualifiers
     * @param where - the location
     */
    private propertyValue(
        record: NodeRecord,
        tokens: readonly Token[],
        qualifiers: Qualifiers | null,
        where: Where,
    ): void {
        if (tokens.length < 2 || tokens.length > 3 || tokens[0].kind !== "word" || tokens[1].kind === "list") {
            this.report.error(
                "validation-error",
                OBO_ISSUE.BAD_VALUE,
                "property_value needs a relation and a value; the clause is skipped",
                where,
            );
            return;
        }
        if (tokens.some((t) => t.unterminated)) {
            this.tally(
                "parse-error",
                OBO_ISSUE.SYNTAX,
                "an unterminated quote; the text runs to the end of the line",
                "property_value",
                where.line,
            );
        }
        let datatype = tokens.length === 3 ? tokens[2].text : null;
        if (tokens.length === 3 && tokens[2].kind !== "word") {
            this.tally(
                "parse-error",
                OBO_ISSUE.SYNTAX,
                "a datatype that is not a word was ignored",
                "property_value",
                where.line,
            );
            datatype = null;
        }
        this.push(
            record,
            "property_value",
            withQualifiers({ relation: tokens[0].text, value: tokens[1].text, datatype }, qualifiers),
        );
    }

    /**
     * Set a single-valued column, keeping the first value of an id.
     * @param record - the record
     * @param column - the column
     * @param value - the value
     * @param line - the line
     * @param also - more to set together with the value
     */
    private single(record: NodeRecord, column: string, value: unknown, line: number, also?: () => void): void {
        if (record.values.has(column)) {
            this.tally(
                "validation-error",
                OBO_ISSUE.DUPLICATE_ATTRIBUTE,
                "a single-valued tag given twice for one id; the first is kept",
                column,
                line,
            );
            return;
        }
        record.values.set(column, value);
        also?.();
    }

    /**
     * Append to a list column, without repeats (merged frames take the union).
     * @param record - the record
     * @param column - the column
     * @param value - the item
     */
    private push(record: NodeRecord, column: string, value: unknown): void {
        let list = record.lists.get(column);
        if (list === undefined) {
            list = [];
            record.lists.set(column, list);
        }
        // objects are never repeated: identical clauses were already skipped
        if (typeof value === "object" || !list.includes(value)) {
            list.push(value);
        }
    }

    /**
     * Record xref descriptions in `xref.descriptions` (the first description of an id is kept),
     * warning about a description whose quote never closes.
     * @param target - the record
     * @param xrefs - the xrefs
     * @param tag - the clause's tag
     * @param line - the clause's line
     */
    private describe(target: NodeRecord, xrefs: readonly Xref[], tag: string, line: number): void {
        for (const xref of xrefs) {
            if (xref.unterminated) {
                this.tally(
                    "parse-error",
                    OBO_ISSUE.SYNTAX,
                    "an xref description whose quote never closes runs to the end",
                    tag,
                    line,
                );
            }
            if (xref.description !== null) {
                let map = target.values.get("xref.descriptions") as Record<string, string> | undefined;
                if (map === undefined) {
                    map = ownRecord<string>();
                    target.values.set("xref.descriptions", map);
                }
                if (!Object.hasOwn(map, xref.id)) {
                    map[xref.id] = xref.description;
                }
            }
        }
    }

    /**
     * Keep the per-xref qualifiers of an xref list (OBO 1.2: `[A:1 {source="x"}]`) in
     * `obo.qualifiers` under `<tag>.xrefs`.
     * @param record - the record
     * @param tag - the clause's tag
     * @param xrefs - the list's xrefs
     */
    private xrefQualifiers(record: NodeRecord, tag: string, xrefs: readonly Xref[]): void {
        for (const xref of xrefs) {
            this.extraQualifiers(record, `${tag}.xrefs`, xref.id, xref.qualifiers);
        }
    }

    /**
     * Keep the qualifiers of a clause whose column has no place for them in `obo.qualifiers`.
     * @param record - the record
     * @param tag - the tag
     * @param value - the clause's value as stored
     * @param qualifiers - the qualifiers, or null
     */
    private extraQualifiers(record: NodeRecord, tag: string, value: string, qualifiers: Qualifiers | null): void {
        if (qualifiers === null) {
            return;
        }
        const map = (record.values.get("obo.qualifiers") as Record<string, unknown[]> | undefined) ?? {};
        (map[tag] ??= []).push({ value, qualifiers });
        record.values.set("obo.qualifiers", map);
    }

    /**
     * Keep an unknown clause in `obo.unrecognized`.
     * @param record - the record
     * @param clause - the clause
     */
    private unrecognized(record: NodeRecord, clause: Clause): void {
        let map = record.values.get("obo.unrecognized") as Record<string, string[]> | undefined;
        if (map === undefined) {
            map = ownRecord<string[]>();
            record.values.set("obo.unrecognized", map);
        }
        append(map, clause.tag, unescapeObo(clause.value));
        this.tally(
            "validation-error",
            OBO_ISSUE.UNKNOWN_ELEMENT,
            "an unknown tag was kept in obo.unrecognized",
            clause.tag,
            clause.line,
        );
    }

    /**
     * Count a warning, recorded once per code and element at the end.
     * @param category - the category
     * @param code - the code
     * @param what - what happened
     * @param element - the tag, id or name it is about
     * @param line - the first line
     */
    tally(category: Tally["category"], code: string, what: string, element: string, line: number): void {
        const key = `${code}\u0000${element}\u0000${what}`;
        const found = this.tallies.get(key);
        if (found === undefined) {
            this.tallies.set(key, { category, code, element, what, line, count: 1 });
        } else {
            found.count++;
        }
    }

    /**
     * Record the counted warnings, in the order they were first seen; past MAX_TALLIES_PER_CODE
     * of one code, the rest are summed up in one warning.
     */
    flushTallies(): void {
        const listed = new Map<string, number>();
        const over = new Map<string, Tally[]>();
        for (const t of this.tallies.values()) {
            const n = (listed.get(t.code) ?? 0) + 1;
            listed.set(t.code, n);
            if (n > MAX_TALLIES_PER_CODE) {
                const rest = over.get(t.code) ?? [];
                rest.push(t);
                over.set(t.code, rest);
                continue;
            }
            this.report.warning(
                t.category,
                t.code,
                `${t.element}: ${t.what} (${t.count} time${plural(t.count)}, first at line ${t.line})`,
                {
                    line: t.line,
                    element: t.element,
                },
            );
        }
        for (const [code, rest] of over) {
            this.report.warning(
                rest[0].category,
                code,
                `${rest.length} more element${plural(rest.length)} with this warning, not listed (first: ${rest[0].element}: ${rest[0].what}, line ${rest[0].line})`,
                { line: rest[0].line },
            );
        }
        this.tallies.clear();
    }

    /**
     * The first line that makes the input not OBO: null unless no frame header and no plausible
     * header tag was read while some line was neither (an HTML page, a JSON, GML, DOT or CSV file,
     * UTF-16 read without its BOM). A file of only comments is OBO, if an empty one.
     * @returns the line, or null
     */
    notObo(): number | null {
        return this.frameSeen || this.tagClauses > 0 ? null : this.firstBadLine;
    }

    /**
     * Warn about the header once the file is read: a missing or unknown format-version (the
     * synonym-scope rule depends on it), a date that is not a real calendar date.
     */
    checkHeader(): void {
        if (this.version === null) {
            const empty = this.frameSeen ? "" : " and the file has no frames: nothing was read";
            this.tally(
                "validation-error",
                OBO_ISSUE.FORMAT_VERSION,
                `the header has no format-version (required by 1.2 and 1.4)${empty}; read as the 1.0 / 1.2 / 1.4 union`,
                "format-version",
                1,
            );
        } else if (!KNOWN_VERSION.test(this.version)) {
            this.tally(
                "validation-error",
                OBO_ISSUE.FORMAT_VERSION,
                `format-version ${JSON.stringify(this.version)} is not 1.0, 1.2 or 1.4; read as 1.4`,
                "format-version",
                1,
            );
        }
        const date = this.header.date?.[0];
        if (
            date !== undefined &&
            /^\d{2}:\d{2}:\d{4}\s+\d{2}:\d{2}$/.test(date.trim()) &&
            oboDate(date.trim()) === null
        ) {
            this.tally(
                "validation-error",
                OBO_ISSUE.SYNTAX,
                "the header date is not a real calendar date; created is null",
                "date",
                1,
            );
        }
    }

    /**
     * The header as GraphMeta fields (design 4.2): name from `ontology`, the version, `created` from
     * the `dd:MM:yyyy HH:mm` date, `creator` from `saved-by`.
     * @returns the metadata patch, without `extra`
     */
    meta(): GraphMetaPatch {
        const first = (tag: string): string | null => {
            const values = this.header[tag];
            return values === undefined ? null : unescapeObo(values[0]).trim();
        };
        return {
            name: first("ontology"),
            sourceFormat: "obo",
            sourceVersion: this.version,
            created: oboDate(first("date")),
            creator: first("saved-by"),
        };
    }

    /**
     * The raw header clauses.
     * @returns the header by tag
     */
    headerRecord(): Record<string, string[]> {
        return this.header;
    }

    /**
     * The namespace a frame without one gets.
     * @returns the default namespace, or null
     */
    namespaceDefault(): string | null {
        return this.defaultNamespace;
    }
}

/**
 * Add the qualifiers to a json item when there are any.
 * @param item - the item
 * @param qualifiers - the qualifiers, or null
 * @returns the item
 */
function withQualifiers(item: Record<string, unknown>, qualifiers: Qualifiers | null): Record<string, unknown> {
    return qualifiers === null ? item : { ...item, qualifiers };
}

/**
 * The OBO header date `dd:MM:yyyy HH:mm` as ISO 8601 (`yyyy-MM-ddTHH:mm`).
 * @param text - the header value, or null
 * @returns the ISO text, or null when the date is not of that form
 */
function oboDate(text: string | null): string | null {
    const m = text === null ? null : /^(\d{2}):(\d{2}):(\d{4})\s+(\d{2}):(\d{2})$/.exec(text);
    if (m === null) {
        return null;
    }
    const [, dd, mm, yyyy, hh, min] = m;
    // a real calendar date: 31:02 and 31:04 do not survive the round trip through Date
    const day = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
    if (Number(mm) < 1 || Number(mm) > 12 || day.getUTCDate() !== Number(dd) || Number(hh) > 23 || Number(min) > 59) {
        return null;
    }
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

/** What writeGraph() pushes, decided before anything reaches the sink. */
interface GraphPlan {
    /** The node records, in first-appearance order. */
    readonly nodes: readonly NodeRecord[];
    /** The undeclared targets that become placeholder nodes. */
    readonly placeholders: readonly string[];
    /** The edges to push. */
    readonly edges: readonly { readonly source: string; readonly edge: PendingEdge }[];
}

/**
 * Decide what is written (design 4.2): the node records (Typedefs too under typedefs "nodes", the
 * obsolete ones left out under obsolete "drop"), the placeholders of undeclared targets and the
 * edges; record the warnings that need the whole file (obsoletion rules, undeclared relations,
 * dangling targets, dropped obsolete terms).
 * @param reader - the finished reader
 * @param report - the report
 * @param addMissingNodes - whether an undeclared target becomes a placeholder node
 * @param obo - the OBO options
 * @returns the plan
 */
function planGraph(
    reader: OboReader,
    report: ImportReportBuilder,
    addMissingNodes: boolean,
    obo: ResolvedOboOptions,
): GraphPlan {
    const records: NodeRecord[] = [...reader.nodes.values()];
    for (const [id, typedef] of reader.typedefs) {
        const node = reader.nodes.get(id);
        if (node !== undefined) {
            reader.tally(
                "validation-error",
                OBO_ISSUE.ID_KIND_CLASH,
                `an id names both a ${node.kind} and a Typedef; the ${node.kind} is the node`,
                id,
                typedef.line,
            );
        } else if (obo.typedefs === "nodes") {
            records.push(typedef);
        }
    }
    // a class expression needs two or more operands, counted after merging (spec 4.1.1)
    for (const record of [...reader.nodes.values(), ...reader.typedefs.values()]) {
        for (const tag of ["intersection_of", "union_of"]) {
            if (record.lists.get(tag)?.length === 1) {
                reader.tally(
                    "validation-error",
                    OBO_ISSUE.CARDINALITY,
                    "a single clause (a class expression needs two or more)",
                    tag,
                    record.line,
                );
            }
        }
    }
    const dropped = new Set<string>();
    const kept = new Set<string>();
    for (const record of records) {
        const obsolete = record.values.get("is_obsolete") === true;
        (obo.obsolete === "drop" && obsolete ? dropped : kept).add(record.id);
        // obsoletion rules (the 1.2 guide; fastobo-validator --obsoletion)
        if (obsolete && record.edges.length > 0) {
            reader.tally(
                "validation-error",
                OBO_ISSUE.OBSOLETION,
                "an obsolete term has is_a or relationship clauses; they are kept",
                "is_obsolete",
                record.edges[0].line,
            );
        }
        if (!obsolete && (record.lists.has("replaced_by") || record.lists.has("consider"))) {
            reader.tally(
                "validation-error",
                OBO_ISSUE.OBSOLETION,
                "replaced_by or consider on a term that is not obsolete; kept",
                "replaced_by",
                record.line,
            );
        }
    }
    const declared = new Set<string>(reader.typedefs.keys());
    for (const typedef of reader.typedefs.values()) {
        for (const xref of (typedef.lists.get("xref") ?? []) as string[]) {
            declared.add(xref);
        }
    }
    const dangling: string[] = [];
    const danglingSet = new Set<string>();
    let danglingEdges = 0;
    let droppedEdges = 0;
    const edges: { source: string; edge: PendingEdge }[] = [];
    for (const record of records) {
        for (const edge of record.edges) {
            if (dropped.has(record.id) || dropped.has(edge.target)) {
                droppedEdges++;
                continue;
            }
            if (!BUILTIN_RELATIONS.has(edge.relation) && !declared.has(edge.relation)) {
                reader.tally(
                    "validation-error",
                    OBO_ISSUE.UNDECLARED,
                    "a relation no Typedef declares",
                    edge.relation,
                    edge.line,
                );
            }
            if (!kept.has(edge.target)) {
                if (!danglingSet.has(edge.target)) {
                    danglingSet.add(edge.target);
                    dangling.push(edge.target);
                }
                if (!addMissingNodes) {
                    danglingEdges++;
                    report.counts.skippedEdges++;
                    continue;
                }
            }
            edges.push({ source: record.id, edge });
        }
    }
    reader.flushTallies();
    reportDangling(records, dangling, addMissingNodes, danglingEdges, report, new Set(reader.typedefs.keys()));
    if (dropped.size > 0) {
        report.warning(
            "merged",
            OBO_ISSUE.OBSOLETE_DROPPED,
            `${dropped.size} obsolete term${plural(dropped.size)} and ${droppedEdges} edge${plural(droppedEdges)} to or from them were left out (obsolete: "drop")`,
            { element: [...dropped][0] },
        );
    }
    return {
        nodes: records.filter((record) => kept.has(record.id)),
        placeholders: addMissingNodes ? dangling : [],
        edges,
    };
}

/**
 * Record the one W_DANGLING_REFERENCE of an import: the count, the first targets, and for a target
 * that is another term's alt_id, the term it is an alt_id of.
 * @param records - every node record
 * @param dangling - the undeclared targets, in first-reference order
 * @param addMissingNodes - whether they became placeholder nodes
 * @param droppedEdges - the edges dropped under addMissingNodes false
 * @param report - the report
 * @param typedefs - the ids of the Typedef frames (kept as metadata, so not nodes)
 */
function reportDangling(
    records: readonly NodeRecord[],
    dangling: readonly string[],
    addMissingNodes: boolean,
    droppedEdges: number,
    report: ImportReportBuilder,
    typedefs: ReadonlySet<string>,
): void {
    if (dangling.length === 0) {
        return;
    }
    const altOf = new Map<string, string>();
    for (const record of records) {
        for (const alt of (record.lists.get("alt_id") ?? []) as string[]) {
            altOf.set(alt, record.id);
        }
    }
    const shown = dangling.slice(0, 5).map((id) => {
        const primary = altOf.get(id);
        if (typedefs.has(id)) {
            return `${id} (a Typedef, kept as metadata, not a node)`;
        }
        return primary === undefined ? id : `${id} (an alt_id of ${primary})`;
    });
    const more = dangling.length > 5 ? `, ... (${dangling.length - 5} more)` : "";
    const action = addMissingNodes
        ? "each became a placeholder node (graphty.placeholder)"
        : `${droppedEdges} edge${plural(droppedEdges)} to them ${agree(droppedEdges, "was", "were")} dropped (addMissingNodes false)`;
    report.warning(
        "validation-error",
        OBO_ISSUE.DANGLING_REFERENCE,
        `${dangling.length} target${plural(dangling.length)} no frame declares: ${shown.join(", ")}${more}; ${action}`,
        { element: dangling[0] },
    );
}

/** Pushes ids into a sink: the id coercion rule and the cancellation check. */
class Pusher {
    readonly sink: GraphSink;

    readonly report: ImportReportBuilder;

    private readonly coercer: IdCoercer;

    private readonly signal: AbortSignal | null;

    /** The original ids restored under restoreMangledIds, by the id the file wrote. */
    readonly restored = new Map<string, string>();

    private since = 0;

    /**
     * Create a pusher.
     * @param sink - the sink
     * @param report - the report
     * @param options - the resolved common options
     */
    constructor(sink: GraphSink, report: ImportReportBuilder, options: ReturnType<typeof resolveImportOptions>) {
        this.sink = sink;
        this.report = report;
        this.coercer = new IdCoercer(options.ids);
        this.signal = options.signal;
    }

    /**
     * An id text under the `ids` rule, reporting a merge.
     * @param text - the id as written
     * @returns the node id
     */
    id(text: string): NodeId {
        const id = this.coercer.text(this.restored.get(text) ?? text);
        const merge = this.coercer.lastMerge;
        if (merge !== null) {
            this.report.warning(
                "coercion",
                OBO_ISSUE.ID_MERGED,
                `id text ${JSON.stringify(merge.text)} merged with ${JSON.stringify(merge.previousText)} as ${merge.id}`,
                { element: text },
            );
        }
        return id;
    }

    /**
     * Add a node, counting it, or record why it was refused.
     * @param text - the id as written
     * @param line - the line, when known
     * @returns the node index, or -1 when refused
     */
    node(text: string, line?: number): number {
        this.tick();
        try {
            const id = this.id(text);
            const known = this.sink.indexOf(id) !== INVALID_INDEX;
            const index = this.sink.addNode(id);
            if (!known) {
                this.report.counts.nodes++;
            }
            return index;
        } catch (err) {
            this.report.recordError(err, { line, element: text });
            this.report.counts.skippedNodes++;
            return -1;
        }
    }

    /** Check the cancellation signal every ABORT_CHECK_INTERVAL pushes. */
    tick(): void {
        if (++this.since >= ABORT_CHECK_INTERVAL) {
            this.since = 0;
            throwIfAborted(this.signal);
        }
    }
}

/**
 * Write the records into the sink (design 4.2): the nodes with the vocabulary columns they use,
 * the placeholders of undeclared targets, then the edges.
 * @param reader - the finished reader
 * @param sink - the sink
 * @param report - the report
 * @param options - the resolved options
 * @param obo - the OBO options
 */
function writeGraph(
    reader: OboReader,
    sink: GraphSink,
    report: ImportReportBuilder,
    options: ReturnType<typeof resolveImportOptions>,
    obo: ResolvedOboOptions,
): void {
    const plan = planGraph(reader, report, options.addMissingNodes, obo);
    const push = new Pusher(sink, report, options);
    if (options.restoreMangledIds) {
        restoreIds(plan.nodes, push.restored);
    }
    const namespace = reader.namespaceDefault();
    // columns, declared only when used, in the vocabulary's order
    const used = new Set<string>(["type"]);
    for (const record of plan.nodes) {
        for (const name of [...record.values.keys(), ...record.lists.keys()]) {
            used.add(name);
        }
    }
    if (namespace !== null) {
        used.add("namespace");
    }
    const columns = new Map<string, ColumnHandle>();
    for (const name of plan.nodes.length > 0 ? Object.keys(OBO_NODE_COLUMNS) : []) {
        if (used.has(name)) {
            columns.set(name, declareResolved(sink, "node", oboColumnDecl("node", name), report).handle);
        }
    }
    sink.reserve(plan.nodes.length + plan.placeholders.length, plan.edges.length);
    for (const record of plan.nodes) {
        const index = push.node(record.id, record.line);
        if (index < 0) {
            continue;
        }
        const cells: [string, unknown][] = [["type", record.kind], ...record.values, ...record.lists];
        if (namespace !== null && !record.values.has("namespace")) {
            cells.push(["namespace", namespace]);
        }
        for (const [name, value] of cells) {
            const handle = columns.get(name);
            if (handle !== undefined) {
                sink.setNodeValue(handle, index, value);
            }
        }
    }
    if (plan.placeholders.length > 0) {
        const placeholder = declareResolved(sink, "node", oboColumnDecl("node", PLACEHOLDER_COLUMN), report).handle;
        for (const text of plan.placeholders) {
            const index = push.node(text);
            if (index >= 0) {
                sink.setNodeValue(placeholder, index, true);
            }
        }
    }
    writeEdges(plan, push, options);
}

/**
 * Take back the ids the exporter rewrote under `sanitizeIds: "mangle"`: a frame's
 * `property_value: graphty:originalId "..."` names its original id, which replaces the written one
 * wherever the file names it (the property value itself is dropped). An original that another
 * frame already uses as its id is not restored.
 * @param records - the node records
 * @param restored - receives written id to original id
 */
function restoreIds(records: readonly NodeRecord[], restored: Map<string, string>): void {
    const taken = new Set(records.map((r) => r.id));
    for (const record of records) {
        const values = record.lists.get("property_value") as { relation: string; value: string }[] | undefined;
        const at = values?.findIndex((v) => v.relation === ORIGINAL_ID) ?? -1;
        if (values === undefined || at < 0) {
            continue;
        }
        const original = originalText(values[at].value);
        if (taken.has(original)) {
            continue;
        }
        taken.add(original);
        restored.set(record.id, original);
        values.splice(at, 1);
        if (values.length === 0) {
            record.lists.delete("property_value");
        }
    }
}

/**
 * The original id of a `graphty:originalId` property value: the exporter writes it as JSON text (so
 * every character survives); a value that is not a JSON string is the id as it stands.
 * @param value - the property value
 * @returns the original id
 */
function originalText(value: string): string {
    try {
        const parsed: unknown = JSON.parse(value);
        return typeof parsed === "string" ? parsed : value;
    } catch {
        return value;
    }
}

/**
 * Push the planned edges through the direction resolver, with their relation and qualifiers.
 * @param plan - the plan
 * @param push - the pusher
 * @param options - the resolved options
 */
function writeEdges(plan: GraphPlan, push: Pusher, options: ReturnType<typeof resolveImportOptions>): void {
    const { sink, report } = push;
    const direction = new DirectionResolver(sink, report, options.onMixedDirection);
    direction.setHeader(true);
    if (plan.edges.length === 0) {
        return;
    }
    const relation = declareResolved(sink, "edge", oboColumnDecl("edge", "relation"), report).handle;
    const qualifiers = plan.edges.some((e) => e.edge.qualifiers !== null)
        ? declareResolved(sink, "edge", oboColumnDecl("edge", "qualifiers"), report).handle
        : null;
    for (const { source, edge } of plan.edges) {
        push.tick();
        const before = sink.edgeCount;
        try {
            const e = direction.addEdge(push.id(source), push.id(edge.target), "directed", undefined, {
                line: edge.line,
                element: source,
            });
            report.counts.edges += sink.edgeCount - before;
            if (e < 0) {
                continue;
            }
            sink.setEdgeValue(relation, e, edge.relation);
            if (qualifiers !== null && edge.qualifiers !== null) {
                sink.setEdgeValue(qualifiers, e, edge.qualifiers);
            }
        } catch (err) {
            report.recordError(err, { line: edge.line, element: source });
            report.counts.skippedEdges++;
        }
    }
}

/**
 * Feed the physical lines to the reader as logical lines: backslash continuations joined (the parts
 * collected and joined once, so a value continued over many lines costs its length), form feeds
 * outside quotes split. A backslash inside a `!` comment never continues a line, and a continuation
 * never swallows a frame header or a blank line.
 * @param lines - the line reader
 * @param reader - the OBO reader
 */
async function readLines(lines: LineReader, reader: OboReader): Promise<void> {
    const parts: string[] = [];
    let partLine = 0;
    const feed = (text: string, line: number): void => {
        for (const piece of splitFormFeeds(text)) {
            reader.line(piece, line);
        }
    };
    for await (const physical of lines) {
        const { line } = lines;
        if (parts.length > 0) {
            const head = physical.trimStart();
            if (head.length === 0 || head.startsWith("[")) {
                reader.tally(
                    "parse-error",
                    OBO_ISSUE.SYNTAX,
                    "a line continuation before a frame header or a blank line was ignored",
                    "\\",
                    partLine,
                );
                feed(parts.join(""), partLine);
                parts.length = 0;
            } else {
                reader.tally(
                    "coercion",
                    OBO_ISSUE.DEPRECATED_SYNTAX,
                    "a backslash line continuation was joined (deprecated in 1.4)",
                    "\\",
                    partLine,
                );
            }
        }
        if (endsWithContinuation(physical) && stripComment(physical) === physical) {
            parts.push(physical.slice(0, -1));
            partLine = line;
            continue;
        }
        if (parts.length > 0) {
            parts.push(physical);
            feed(parts.join(""), line);
            parts.length = 0;
        } else {
            feed(physical, line);
        }
    }
    if (parts.length > 0) {
        reader.tally(
            "coercion",
            OBO_ISSUE.DEPRECATED_SYNTAX,
            "a backslash line continuation was joined (deprecated in 1.4)",
            "\\",
            partLine,
        );
        feed(parts.join(""), partLine);
    }
}

/**
 * Confidence that a head is OBO (design 1.5): after a BOM, blank lines and `!` comment lines, 0.9
 * when the first significant line is `format-version:` or a `[Term]` / `[Typedef]` / `[Instance]`
 * header, or such a header follows `tag: value` lines; 0.4 for a head of only `tag: value` lines.
 * @param head - the first bytes
 * @returns the confidence
 */
function sniffObo(head: Uint8Array): number {
    let text = new TextDecoder("utf-8").decode(head.subarray(0, SNIFF_BYTES));
    if (text.charCodeAt(0) === 0xfeff) {
        text = text.slice(1);
    }
    const lines = text.split(/\r\n|\r|\n|\f/);
    // the last line may be cut mid-way
    if (lines.length > 1 && head.byteLength >= SNIFF_BYTES) {
        lines.pop();
    }
    let tagLines = 0;
    for (const raw of lines) {
        const line = raw.trim();
        if (line.length === 0 || line.startsWith("!")) {
            continue;
        }
        if (/^\[(Term|Typedef|Instance)\]\s*(!.*)?$/.test(line)) {
            return 0.9;
        }
        if (tagLines === 0 && /^format-version\s*:/.test(line)) {
            return 0.9;
        }
        if (/^[A-Za-z][A-Za-z0-9_-]*\s*:(\s|$)/.test(line)) {
            tagLines++;
            continue;
        }
        return 0;
    }
    return tagLines > 0 ? 0.4 : 0;
}

/**
 * The OBO importer plugin.
 * @category Built-in formats
 */
export const oboImporter: GraphImporter<OboImportOptions> = Object.freeze({
    format: "obo",
    options: Object.freeze(["obsolete", "typedefs"]),
    extensions: Object.freeze([".obo"]),
    mimeTypes: Object.freeze(["text/obo", "application/obo"]),

    /**
     * Confidence that the head is an OBO file.
     * @param head - the first bytes
     * @returns the confidence
     */
    sniff(head: Uint8Array): number {
        return sniffObo(head);
    },

    /**
     * Read an OBO file into the sink.
     * @param input - the text, bytes or stream
     * @param sink - the sink
     * @param options - format-specific and common options
     * @returns the import report; ImportError on a fatal error or beyond the error limit
     */
    async import(
        input: ImportInput,
        sink: GraphSink,
        options?: OboImportOptions & CommonImportOptions,
    ): Promise<ImportReport> {
        const resolved = resolveImportOptions(options, DEFAULTS);
        const obo = resolveOboOptions(options);
        const report = new ImportReportBuilder("obo", resolved.errorLimit);
        reportSinkOptions(sink, options, report, true);
        reportUnusedOptions(options, report, USED_OPTIONS);
        const reader = new OboReader(report, resolved.signal, obo.typedefs === "nodes");
        await readLines(new LineReader(input, report, resolved), reader);
        reader.finishFrame();
        if (!reader.significant) {
            report.fail(OBO_ISSUE.EMPTY_INPUT, "the input is empty");
        }
        const notObo = reader.notObo();
        if (notObo !== null) {
            report.fail(
                OBO_ISSUE.NOT_OBO,
                `the input is not OBO: it has no frame header and no header tag, and line ${notObo} is not a tag-value line`,
                { line: notObo },
            );
        }
        throwIfAborted(resolved.signal);
        reader.checkHeader();
        writeGraph(reader, sink, report, resolved, obo);
        const typedefs = ownRecord<Record<string, string[]>>();
        for (const [id, record] of reader.typedefs) {
            typedefs[id] = record.raw;
        }
        const extra: Record<string, unknown> = { header: reader.headerRecord(), typedefs };
        if (reader.unknownFrames.length > 0) {
            extra.unknownFrames = reader.unknownFrames;
        }
        sink.setMeta({ ...reader.meta(), extra: { obo: extra } });
        throwIfAborted(resolved.signal);
        return report.finish();
    },
});
