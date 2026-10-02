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
    EMPTY_INPUT_CODE,
    ENCODING_FALLBACK_CODE,
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
import { ImportReportBuilder } from "../../common/report.js";
import { type CommonImportOptions, type GraphImporter, type ImportInput, type ImportReport } from "../../types.js";
import {
    endsWithContinuation,
    hasStrayBrace,
    parseXref,
    parseXrefList,
    type Qualifiers,
    splitQualifiers,
    splitTagValue,
    stripComment,
    type Token,
    tokenize,
    unescapeObo,
    type Xref,
} from "./syntax.js";

/** The format-specific options of the OBO importer. */
export interface OboImportOptions {
    /** "keep" (default): obsolete terms are nodes with `is_obsolete` true; "drop": they and their edges are left out. */
    obsolete?: "keep" | "drop" | undefined;
    /** "metadata" (default): `[Typedef]` frames go to `meta.extra.obo.typedefs`; "nodes": they are nodes too, with their `is_a` edges. */
    typedefs?: "metadata" | "nodes" | undefined;
}

/** Issue codes of the OBO importer (design section 4.3). */
export const OBO_ISSUE = Object.freeze({
    /** The input is empty or whitespace (fatal). */
    EMPTY_INPUT: EMPTY_INPUT_CODE,
    /** The input holds invalid UTF-8 (fatal). */
    INVALID_UTF8: INVALID_UTF8_CODE,
    /** Invalid bytes in the encoding a BOM or the encoding option chose (fatal). */
    INVALID_ENCODING: INVALID_ENCODING_CODE,
    /** Bytes that are not UTF-8 were read as windows-1252. */
    ENCODING_FALLBACK: ENCODING_FALLBACK_CODE,
    /** A declared encoding the platform cannot decode was ignored. */
    UNKNOWN_ENCODING: UNKNOWN_ENCODING_CODE,
    /** A frame without an `id` clause; the frame is skipped. */
    MISSING_ID: MISSING_ID_CODE,
    /** A clause whose value cannot be read (a boolean other than true / false, a relationship with one or three values); the clause is skipped. */
    BAD_VALUE: BAD_VALUE_CODE,
    /** Two frames with one id were merged (spec 4.1.1). */
    DUPLICATE_NODE: DUPLICATE_NODE_CODE,
    /** A single-valued tag given twice for one id (a cardinality violation); the first is kept. */
    DUPLICATE_ATTRIBUTE: DUPLICATE_ATTRIBUTE_CODE,
    /** An unknown tag (kept in `obo.unrecognized`) or frame type (skipped), once per name. */
    UNKNOWN_ELEMENT: UNKNOWN_ELEMENT_CODE,
    /** A target no frame declares: a placeholder node was made, or the edge dropped under addMissingNodes false. */
    DANGLING_REFERENCE: DANGLING_REFERENCE_CODE,
    /** A line without a colon, an unterminated quote, a def without its xref list, a qualifier block that does not parse, an unescaped brace. */
    SYNTAX: "W_OBO_SYNTAX",
    /** The frame's `id` is not its first clause; it is used anyway. */
    ID_NOT_FIRST: "W_OBO_ID_NOT_FIRST",
    /** A synonym without a scope in a file that does not say 1.2, or with a scope that is not one of the four. */
    SYNONYM_SCOPE: "W_OBO_SYNONYM_SCOPE",
    /** A relation, subset or synonym type that nothing declares. */
    UNDECLARED: "W_OBO_UNDECLARED",
    /** One id for a Term and a Typedef (or an Instance); the Term (the first node frame) is the node. */
    ID_KIND_CLASH: "W_OBO_ID_KIND_CLASH",
    /** Fewer than two `intersection_of` or `union_of` clauses on a frame. */
    CARDINALITY: "W_OBO_CARDINALITY",
    /** An obsolete term with is_a / relationship, or replaced_by / consider on a term that is not obsolete. */
    OBSOLETION: "W_OBO_OBSOLETION",
    /** An OBO 1.0 / 1.2 tag read as its 1.4 meaning (exact_synonym, xref_analog, use_term, typeref, version). */
    DEPRECATED_TAG: "W_OBO_DEPRECATED_TAG",
    /** A backslash line continuation (deprecated in 1.4). */
    DEPRECATED_SYNTAX: "W_OBO_DEPRECATED_SYNTAX",
    /** A header clause kept in `meta.extra.obo.header` whose meaning is not applied (import, id-mapping, the treat-xrefs macros, owl-axioms). */
    HEADER_NOT_APPLIED: "W_OBO_HEADER_NOT_APPLIED",
    /** Obsolete terms and their edges left out under obsolete: "drop". */
    OBSOLETE_DROPPED: "W_OBO_OBSOLETE_DROPPED",
    /** Two distinct id texts became one number under ids "number". */
    ID_MERGED: ID_MERGED_CODE,
    /** A vocabulary column renamed `<name>#obo` because the sink already holds the name. */
    COLUMN_RENAMED: RENAMED_CODE,
    /** A vocabulary column declared without its role because the sink already holds it. */
    ROLE_TAKEN: ROLE_TAKEN_CODE,
    /** A common option the format has no use for (defaultDirected, weightFrom, nodeIdFrom, ...). */
    OPTION_IGNORED: OPTION_IGNORED_CODE,
    /** A builder-policy option the caller passed that the caller's sink does not use. */
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
]);

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

/** The 1.0 / 1.2 frame tags read as their 1.4 meaning: tag to [1.4 tag, synonym scope]. */
const DEPRECATED_TAGS: ReadonlyMap<string, readonly [string, string | null]> = new Map([
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

/** Single-valued text tags (first value kept). */
const TEXT_TAGS: ReadonlySet<string> = new Set([
    "name",
    "namespace",
    "comment",
    "created_by",
    "creation_date",
    "domain",
    "range",
    "inverse_of",
]);

/** Single-valued boolean tags. */
const BOOL_TAGS: ReadonlySet<string> = new Set(
    Object.keys(OBO_NODE_COLUMNS).filter((name) => OBO_NODE_COLUMNS[name].dtype === "bool"),
);

/** Tags whose value is one id, collected in a list column. */
const ID_LIST_TAGS: ReadonlySet<string> = new Set([
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

/** Tags that only a Typedef frame may carry (elsewhere they are unrecognized). */
const TYPEDEF_TAGS: ReadonlySet<string> = new Set([
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
    readonly category: "parse-error" | "validation-error" | "coercion" | "unsupported";
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
    private readonly header: Record<string, string[]> = {};

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

    /** The frame being read: its kind (null for an unknown frame, skipped) and clauses. */
    private frame: { kind: FrameKind | null; line: number; clauses: Clause[] } | null = null;

    private framesSinceCheck = 0;

    /** Whether any significant line was read. */
    significant = false;

    /**
     * Create a reader.
     * @param report - the report
     * @param signal - the cancellation signal
     */
    constructor(report: ImportReportBuilder, signal: AbortSignal | null) {
        this.report = report;
        this.signal = signal;
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
        const header = /^\[([^\]]*)\]\s*(?:!.*)?$/.exec(t);
        if (header !== null) {
            this.startFrame(header[1].trim(), line);
            return;
        }
        const tv = splitTagValue(t);
        if (tv === null) {
            this.tally("parse-error", OBO_ISSUE.SYNTAX, "a line without a colon was skipped", "line", line);
            return;
        }
        const clause: Clause = { tag: tv.tag, value: stripComment(tv.rest), line };
        if (this.frame === null) {
            this.headerClause(clause);
        } else if (this.frame.kind !== null) {
            this.frame.clauses.push(clause);
        }
    }

    /**
     * Start a frame, finishing the one before.
     * @param name - the frame type
     * @param line - the header's line
     */
    private startFrame(name: string, line: number): void {
        this.finishFrame();
        const kind = FRAME_KINDS.has(name) ? (name as FrameKind) : null;
        if (kind === null) {
            this.tally(
                "validation-error",
                OBO_ISSUE.UNKNOWN_ELEMENT,
                "frames of an unknown type were skipped",
                `[${name}]`,
                line,
            );
        }
        this.frame = { kind, line, clauses: [] };
    }

    /**
     * Record one header clause.
     * @param clause - the clause
     */
    private headerClause(clause: Clause): void {
        (this.header[clause.tag] ??= []).push(clause.value);
        const { tag } = clause;
        const tokens = tokenize(splitQualifiers(clause.value).value);
        const first = tokens.length > 0 && tokens[0].kind === "word" ? tokens[0].text : null;
        if (tag === "format-version") {
            this.version ??= unescapeObo(clause.value).trim();
        } else if (tag === "default-namespace") {
            this.defaultNamespace ??= first;
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
        if (frame === null || frame.kind === null) {
            return;
        }
        if (++this.framesSinceCheck >= ABORT_CHECK_INTERVAL) {
            this.framesSinceCheck = 0;
            throwIfAborted(this.signal);
        }
        const idAt = frame.clauses.findIndex((c) => c.tag === "id");
        const id = idAt < 0 ? "" : unescapeObo(splitQualifiers(frame.clauses[idAt].value).value).trim();
        if (id.length === 0) {
            this.report.error(
                "missing-value",
                OBO_ISSUE.MISSING_ID,
                `a [${frame.kind}] frame has no id; it is skipped`,
                {
                    line: frame.line,
                },
            );
            this.report.counts.skippedNodes++;
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
        const record = this.recordFor(frame.kind, id, frame.line);
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
            this.applyClause(record, clause);
        }
        if (record.kind === "Typedef") {
            record.raw.id ??= [id];
        }
        this.checkPairs(frame.clauses);
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
                this.report.warning(
                    "merged",
                    OBO_ISSUE.DUPLICATE_NODE,
                    `two [${kind}] frames have the id ${id}; they are merged (spec 4.1.1)`,
                    {
                        line,
                        element: id,
                    },
                );
            }
            return existing;
        }
        const record: NodeRecord = {
            id,
            kind,
            line,
            values: new Map(),
            lists: new Map(),
            edges: [],
            seen: new Set(),
            raw: {},
        };
        map.set(id, record);
        return record;
    }

    /**
     * Report fewer than two intersection_of / union_of clauses on one frame.
     * @param clauses - the frame's clauses
     */
    private checkPairs(clauses: readonly Clause[]): void {
        for (const tag of ["intersection_of", "union_of"]) {
            const found = clauses.filter((c) => c.tag === tag);
            if (found.length === 1) {
                this.tally(
                    "validation-error",
                    OBO_ISSUE.CARDINALITY,
                    "a single clause (a class expression needs two or more)",
                    tag,
                    found[0].line,
                );
            }
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
            (record.raw[clause.tag] ??= []).push(clause.value);
        }
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
        const split = splitQualifiers(clause.value);
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
        const { value } = split;
        const where = { line: clause.line, element: record.id };
        if (TYPEDEF_TAGS.has(tag) && record.kind !== "Typedef") {
            this.unrecognized(record, clause);
            return;
        }
        if (TEXT_TAGS.has(tag)) {
            this.single(record, tag, unescapeObo(value).trim(), clause.line);
            this.extraQualifiers(record, tag, unescapeObo(value).trim(), qualifiers);
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
                return;
            }
            case "def":
            case "expand_assertion_to":
            case "expand_expression_to": {
                const text = this.quotedWithXrefs(record, tag, value, tokens, clause.line);
                if (tag === "def") {
                    this.single(record, "def", text.text, clause.line, () => {
                        record.values.set("def.xrefs", text.xrefs);
                    });
                    this.extraQualifiers(record, tag, text.text, qualifiers);
                } else {
                    this.push(record, tag, withQualifiers({ template: text.text, xrefs: text.xrefs }, qualifiers));
                }
                return;
            }
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
                this.describe(record, [xref]);
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
        const xrefs = parseXrefList(list.text);
        this.describe(record, xrefs);
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
        const xrefs = list === undefined ? [] : parseXrefList(list.text);
        this.describe(record, xrefs);
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
        const datatype = tokens.length === 3 ? tokens[2].text : null;
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
     * Record xref descriptions in `xref.descriptions`.
     * @param record - the record
     * @param xrefs - the xrefs
     */
    private describe(record: NodeRecord, xrefs: readonly Xref[]): void {
        for (const xref of xrefs) {
            if (xref.description !== null) {
                const map = (record.values.get("xref.descriptions") ?? {}) as Record<string, string>;
                map[xref.id] ??= xref.description;
                record.values.set("xref.descriptions", map);
            }
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
        const map = (record.values.get("obo.qualifiers") ?? {}) as Record<string, unknown[]>;
        (map[tag] ??= []).push({ value, qualifiers });
        record.values.set("obo.qualifiers", map);
    }

    /**
     * Keep an unknown clause in `obo.unrecognized`.
     * @param record - the record
     * @param clause - the clause
     */
    private unrecognized(record: NodeRecord, clause: Clause): void {
        const map = (record.values.get("obo.unrecognized") ?? {}) as Record<string, string[]>;
        (map[clause.tag] ??= []).push(unescapeObo(clause.value));
        record.values.set("obo.unrecognized", map);
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

    /** Record the counted warnings, in the order they were first seen. */
    flushTallies(): void {
        for (const t of this.tallies.values()) {
            this.report.warning(
                t.category,
                t.code,
                `${t.element}: ${t.what} (${t.count} time(s), first at line ${t.line})`,
                {
                    line: t.line,
                    element: t.element,
                },
            );
        }
        this.tallies.clear();
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
    if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31 || Number(hh) > 23 || Number(min) > 59) {
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
    reportDangling(records, dangling, addMissingNodes, danglingEdges, report);
    if (dropped.size > 0) {
        report.warning(
            "merged",
            OBO_ISSUE.OBSOLETE_DROPPED,
            `${dropped.size} obsolete term(s) and ${droppedEdges} edge(s) to or from them were left out (obsolete: "drop")`,
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
 */
function reportDangling(
    records: readonly NodeRecord[],
    dangling: readonly string[],
    addMissingNodes: boolean,
    droppedEdges: number,
    report: ImportReportBuilder,
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
        return primary === undefined ? id : `${id} (an alt_id of ${primary})`;
    });
    const more = dangling.length > 5 ? `, ... (${dangling.length - 5} more)` : "";
    const action = addMissingNodes
        ? "each became a placeholder node (graphty.placeholder)"
        : `${droppedEdges} edge(s) to them were dropped (addMissingNodes false)`;
    report.warning(
        "validation-error",
        OBO_ISSUE.DANGLING_REFERENCE,
        `${dangling.length} target(s) no frame declares: ${shown.join(", ")}${more}; ${action}`,
        { element: dangling[0] },
    );
}

/** Pushes ids into a sink: the id coercion rule and the cancellation check. */
class Pusher {
    readonly sink: GraphSink;

    readonly report: ImportReportBuilder;

    private readonly coercer: IdCoercer;

    private readonly signal: AbortSignal | null;

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
        const id = this.coercer.text(text);
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
 * The OBO importer plugin (design section 4).
 */
export const oboImporter: GraphImporter<OboImportOptions> = Object.freeze({
    format: "obo",
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
        const reader = new OboReader(report, resolved.signal);
        const lines = new LineReader(input, report, resolved);
        let pending: string | null = null;
        for await (const physical of lines) {
            const { line } = lines;
            const text: string = pending === null ? physical : pending + physical;
            pending = null;
            if (endsWithContinuation(text)) {
                reader.tally(
                    "coercion",
                    OBO_ISSUE.DEPRECATED_SYNTAX,
                    "a backslash line continuation was joined (deprecated in 1.4)",
                    "\\",
                    line,
                );
                pending = text.slice(0, -1);
                continue;
            }
            // the 1.4 grammar counts form feed as a line end; LineReader does not
            for (const piece of text.includes("\f") ? text.split("\f") : [text]) {
                reader.line(piece, line);
            }
        }
        if (pending !== null) {
            reader.line(pending, lines.line);
        }
        reader.finishFrame();
        if (!reader.significant) {
            report.fail(OBO_ISSUE.EMPTY_INPUT, "the input is empty");
        }
        throwIfAborted(resolved.signal);
        writeGraph(reader, sink, report, resolved, obo);
        const typedefs: Record<string, Record<string, string[]>> = {};
        for (const [id, record] of reader.typedefs) {
            typedefs[id] = record.raw;
        }
        sink.setMeta({ ...reader.meta(), extra: { obo: { header: reader.headerRecord(), typedefs } } });
        throwIfAborted(resolved.signal);
        return report.finish();
    },
});
