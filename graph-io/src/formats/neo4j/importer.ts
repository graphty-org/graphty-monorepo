/**
 * The Neo4j importer (design sections 8.4 and 5.1, research note 07 sections 2.6 and 2.10): reads
 * neo4j-admin import CSV -- node tables with `:ID`, `:LABEL` and typed property columns,
 * relationship tables with `:START_ID`, `:END_ID`, `:TYPE` and typed property columns -- and pushes
 * scalars into the sink one record at a time. Input is one or more files: the primary input plus the
 * `nodes` and `relationships` option inputs, each read in order; every input holds one or more
 * sections, each starting with its own header row (the single-file convention of graphty-element's
 * CSVDataSource, where a node table and a relationship table follow each other in one file).
 *
 * Mapping (design section 5.1 and decision Q27):
 * - Property columns are declared up front from the header types (`int` -> i32, `long` -> f64
 *   with a precision issue beyond 2^53, `float` -> f32, `double` -> f64, `boolean` -> bool,
 *   `string` / `char` / `duration` -> string, temporal types -> f64 milliseconds with a `.text`
 *   companion when the source text is not canonical, `point` -> json, `type[]` -> list); an
 *   untyped column is a string property. An unquoted empty cell is "property not set"; a quoted
 *   empty cell is an empty string (or an empty list), as neo4j-admin stores it by default.
 * - `:LABEL` becomes the node list-of-dict column `labels` (role `labels`); `:TYPE` the edge dict
 *   column `type` (role `kind`); an id space `:ID(Space)` the node dict column `idSpace` (role
 *   `idSpace`), and a stored id `name:ID(Space)` also a string node column `name` whose
 *   `origin.namespace` is the space. A property whose name collides with one of those is renamed
 *   `<name>#<name>` (design section 5.6).
 * - Id spaces: neo4j-admin keeps one id space per `:ID(Space)` name, so `1` in `:ID(Product)` and
 *   `1` in `:ID(Category)` are two nodes. The core has one id space, so a node of a spaced section
 *   is stored under the string id `Space:id` (every row of the section, collision or not, so an id
 *   never depends on file order), its id text goes into the node string column `originalId` and
 *   its space into `idSpace`. The column has no role: the `originalId` role means an id rewritten by
 *   `sanitizeIds: "mangle"`, which other importers restore as the node id. `:START_ID(Space)` /
 *   `:END_ID(Space)` endpoints are qualified the same way before the lookup; an endpoint without a
 *   space is looked up as written.
 * - Ids are text cells coerced by the `ids` option ("canonical" by default, so `1` is the number 1
 *   and `007` stays a string; integers beyond 2^53 stay strings). Relationships are always directed
 *   ("In Neo4j, all relationships have a direction"), so the sink is set directed before the first
 *   edge and `onMixedDirection: "undirected"` is the way to read a file as undirected.
 * - `:IGNORE` columns are skipped and counted in a loss note.
 *
 * APOC exports are read too. An `apoc.export.csv` table (`_id`, `_labels`, `_start`, `_end`,
 * `_type` columns, node rows and relationship rows in one table) is a section whose rows are nodes
 * when `_id` is set and relationships otherwise; the property columns before `_start` belong to
 * nodes, the ones after it to relationships, and `_labels` is split on ":" (`:A:B`). An
 * `apoc.export.json` file (an input whose first character is `{` or `[`: JSON Lines, one array, a
 * `{nodes, rels}` object or query records) is walked for every object with `"type": "node"` (a node
 * by its id) or `"type": "relationship"` (an edge from `start.id` to `end.id`, its type from
 * `label`); a node or relationship repeated in query records is read once, and a property's JSON
 * value is stored as it is.
 */

import {
    type ColumnDecl,
    type ColumnHandle,
    GraphFormatError,
    type GraphSink,
    INVALID_INDEX,
    type NodeId,
} from "@graphty/graph-format";

import {
    type AttributeDeclarationInput,
    declareAttribute,
    declareCompanion,
    type DeclaredAttribute,
    declareOn,
    losesPrecision,
    parseDeclaredTemporal,
    parseDeclaredValue,
    PRECISION_CODE,
    RENAMED_CODE,
    takenIn,
    uniqueColumnName,
} from "../../common/attributes.js";
import {
    DANGLING_REFERENCE_CODE as SHARED_DANGLING_REFERENCE_CODE,
    DUPLICATE_NODE_CODE as SHARED_DUPLICATE_NODE_CODE,
    MISSING_ENDPOINT_CODE as SHARED_MISSING_ENDPOINT_CODE,
    MISSING_ID_CODE as SHARED_MISSING_ID_CODE,
    ROLE_TAKEN_CODE as SHARED_ROLE_TAKEN_CODE,
    SYNTAX_CODE,
} from "../../common/codes.js";
import { type DeclaredTypeSpec } from "../../common/declared-types.js";
import { DirectionResolver } from "../../common/direction.js";
import { ID_MERGED_CODE as SHARED_ID_MERGED_CODE, IdCoercer } from "../../common/ids.js";
import { inputLength, isImportInput, type ReadOptions, readText, throwIfAborted } from "../../common/input.js";
import { isRecord } from "../../common/json-elements.js";
import { type ListSyntax, splitListText } from "../../common/lists.js";
import {
    reportSinkOptions,
    reportUnusedOptions,
    type ResolvedImportOptions,
    resolveImportOptions,
} from "../../common/options.js";
import { peekHead } from "../../common/peek.js";
import { agree, plural, withArticle } from "../../common/plural.js";
import { ImportReportBuilder, messageOf } from "../../common/report.js";
import { parseTemporal } from "../../common/temporal.js";
import { itemAt } from "../../common/text.js";
import { parseWeightText } from "../../common/weights.js";
import {
    type CommonImportOptions,
    type GraphImporter,
    ImportError,
    type ImportInput,
    type ImportReport,
} from "../../types.js";
import { checkRecordSyntax, RecordReader, type RecordSyntax } from "../csv/records.js";
import {
    type FieldKind,
    type HeaderField,
    isApocCsvHeader,
    isHeaderRecord,
    looksLikeApocJson,
    parseHeaderField,
    startsAsJson,
} from "./header.js";

/**
 * The format-specific options of the Neo4j importer.
 * @category Built-in formats
 */
export interface Neo4jImportOptions extends CommonImportOptions {
    /**
     * More node files, each a string, bytes or a stream with its own header row; read after the
     * main input.
     */
    nodes?: ImportInput | readonly ImportInput[] | undefined;
    /**
     * Relationship files, each a string, bytes or a stream with its own header row; read after the
     * node files.
     */
    relationships?: ImportInput | readonly ImportInput[] | undefined;
    /**
     * The field delimiter, one character (neo4j-admin's `--delimiter`). The default is to detect
     * "," or a tab from the first rows, so a `.tsv` file needs no option. It must differ from
     * `arrayDelimiter`: with `delimiter: ";"`, also pass `arrayDelimiter: ","` or `"|"`.
     * @defaultValue detected
     */
    delimiter?: string | undefined;
    /**
     * The delimiter inside list values and `:LABEL` cells (neo4j-admin's `--array-delimiter`). It
     * must differ from `delimiter`.
     * @defaultValue ";"
     */
    arrayDelimiter?: ";" | "," | "|" | undefined;
    /**
     * The quote character, one character (neo4j-admin's `--quote`).
     * @defaultValue '"'
     */
    quote?: string | undefined;
}

/**
 * The name of the node list column holding `:LABEL` values.
 * @category Built-in formats
 */
export const LABELS_COLUMN = "labels";

/**
 * The name of the edge dict column holding `:TYPE` values.
 * @category Built-in formats
 */
export const TYPE_COLUMN = "type";

/**
 * The name of the node dict column holding the id space of `:ID(Space)`.
 * @category Built-in formats
 */
export const ID_SPACE_COLUMN = "idSpace";

/**
 * Neo4j CSV: the name of the node column that holds a node's id as the file wrote it, for a node of an id
 * space (`:ID(Person)`), whose node id is `Person:<id>`. It has nothing to do with the `originalId` role that
 * `sanitizeIds: "mangle"` uses.
 * @category Built-in formats
 */
export const ORIGINAL_ID_COLUMN = "originalId";

/**
 * A header row (or a whole section) is malformed; the import aborts.
 * @category Issue and loss codes
 */
export const HEADER_CODE = "E_NEO4J_HEADER";

/**
 * A row has a different number of cells than its header.
 * @category Issue and loss codes
 */
export const COLUMN_COUNT_CODE = "E_NEO4J_COLUMN_COUNT";

/**
 * A node row has an unquoted empty `:ID` cell (a quoted empty cell is the id "").
 * @category Issue and loss codes
 */
export const MISSING_ID_CODE = SHARED_MISSING_ID_CODE;

/**
 * A relationship row has an unquoted empty `:START_ID` or `:END_ID` cell.
 * @category Issue and loss codes
 */
export const MISSING_ENDPOINT_CODE = SHARED_MISSING_ENDPOINT_CODE;

/**
 * A node id was declared twice (same id space); the later row's properties win.
 * @category Issue and loss codes
 */
export const DUPLICATE_NODE_CODE = SHARED_DUPLICATE_NODE_CODE;

/**
 * A node id was declared in two id spaces -- a spaced id `Space:id` equals the text of an id declared without a space;
 * the later row is skipped.
 * @category Issue and loss codes
 */
export const ID_SPACE_COLLISION_CODE = "E_NEO4J_ID_SPACE_COLLISION";

/**
 * A `:START_ID(Space)` / `:END_ID(Space)` endpoint's qualified id `Space:id` names a node a node row declared in
 * another id space (without a space); the row is skipped.
 * @category Issue and loss codes
 */
export const ENDPOINT_SPACE_CODE = "E_NEO4J_ENDPOINT_SPACE";

/**
 * Two different id cells became one id under `ids: "number"`.
 * @category Issue and loss codes
 */
export const ID_MERGED_CODE = SHARED_ID_MERGED_CODE;

/**
 * A header brace option the importer does not act on.
 * @category Issue and loss codes
 */
export const HEADER_OPTION_CODE = "W_NEO4J_HEADER_OPTION_IGNORED";

/**
 * You read into a graph builder that already has the labels, type or id space attribute, so this file's one is kept
 * without its role.
 * @category Issue and loss codes
 */
export const ROLE_TAKEN_CODE = SHARED_ROLE_TAKEN_CODE;

/**
 * A relationship row with an empty `:TYPE` cell (neo4j-admin requires a type); the relationship is kept.
 * @category Issue and loss codes
 */
export const MISSING_TYPE_CODE = "W_NEO4J_MISSING_TYPE";

/**
 * A file given under the `nodes` option holds a relationship header, or the reverse.
 * @category Issue and loss codes
 */
export const SECTION_KIND_CODE = "W_NEO4J_SECTION_KIND";

/**
 * Relationship endpoints that no node row declares became nodes (the shared W_DANGLING_REFERENCE).
 * @category Issue and loss codes
 */
export const DANGLING_REFERENCE_CODE = SHARED_DANGLING_REFERENCE_CODE;

/**
 * `:IGNORE` columns were skipped.
 * @category Built-in formats
 */
export const IGNORED_COLUMNS_LOSS = "W_NEO4J_IGNORED_COLUMNS";

/** The common options the Neo4j importer reads (the rest is reported by reportUnusedOptions). */
const USED_OPTIONS: ReadonlySet<keyof CommonImportOptions> = new Set<keyof CommonImportOptions>([
    "ids",
    "addMissingNodes",
    "duplicateEdges",
    "selfLoops",
    "onMixedDirection",
    "weightFrom",
    "weightDtype",
    "long",
    "errorLimit",
    "signal",
    "onProgress",
]);

const NEO4J = "neo4j";

/** Rows between two checks of the cancellation signal (a whole string input is one chunk). */
const ABORT_CHECK_INTERVAL = 64;

const LABELS_DECL: ColumnDecl = {
    name: LABELS_COLUMN,
    dtype: "list",
    itemDtype: "dict",
    nullable: true,
    role: "labels",
    origin: { format: NEO4J, id: ":LABEL", title: null, type: "LABEL", namespace: null },
};

const TYPE_DECL: ColumnDecl = {
    name: TYPE_COLUMN,
    dtype: "dict",
    nullable: true,
    role: "kind",
    origin: { format: NEO4J, id: ":TYPE", title: null, type: "TYPE", namespace: null },
};

const ID_SPACE_DECL: ColumnDecl = {
    name: ID_SPACE_COLUMN,
    dtype: "dict",
    nullable: true,
    role: "idSpace",
    origin: { format: NEO4J, id: ":ID", title: null, type: "ID", namespace: null },
};

const ORIGINAL_ID_DECL: ColumnDecl = {
    name: ORIGINAL_ID_COLUMN,
    dtype: "string",
    nullable: true,
    // origin.type stays null so the column is never mistaken for a stored id (`name:ID`)
    origin: { format: NEO4J, id: ":ID", title: null, type: null, namespace: null },
};

const ARRAY_DELIMITERS: Readonly<Partial<Record<string, ListSyntax>>> = { ";": "semicolon", ",": "comma", "|": "pipe" };

/** The resolved format-specific options. */
interface ResolvedNeo4jOptions {
    readonly nodes: readonly ImportInput[];
    readonly relationships: readonly ImportInput[];
    readonly syntax: RecordSyntax;
    readonly listSyntax: ListSyntax;
}

/** One property column of a section. */
interface PropertySlot {
    /** The cell index. */
    readonly cell: number;
    /** The column name (after any rename). */
    readonly name: string;
    /** The column handle. */
    readonly handle: ColumnHandle;
    /** How the cell text is parsed. */
    readonly spec: DeclaredTypeSpec;
    /** The declaration of the companion text column of a temporal property, or null. */
    readonly companionDecl: ColumnDecl | null;
    /** The companion's handle once a value needed it (design section 5.1); INVALID_INDEX before. */
    companion: ColumnHandle;
}

/** A node section: the header interpreted. */
interface NodeSection {
    readonly kind: "node";
    readonly width: number;
    readonly idCell: number;
    /** The column holding the id as a property (`name:ID`), or INVALID_INDEX. */
    readonly idHandle: ColumnHandle;
    readonly space: string | null;
    readonly spaceCode: number;
    readonly labelCells: readonly number[];
    readonly extraLabels: readonly string[];
    readonly properties: readonly PropertySlot[];
    /** Whether the label cells are APOC's `:A:B` form rather than a list split by the array delimiter. */
    readonly colonLabels: boolean;
}

/** A relationship section: the header interpreted. */
interface RelationshipSection {
    readonly kind: "relationship";
    readonly width: number;
    readonly startCell: number;
    readonly endCell: number;
    /** The id space of `:START_ID` / `:END_ID`, or null when the header declares none. */
    readonly startSpace: string | null;
    readonly endSpace: string | null;
    /** The id space of `:START_ID` / `:END_ID` as a registry code, or 0 when the header declares none. */
    readonly startSpaceCode: number;
    readonly endSpaceCode: number;
    /** The `:TYPE` cell, or -1. */
    readonly typeCell: number;
    /** The cell of the property named by `weightFrom`, or -1. */
    readonly weightCell: number;
    readonly properties: readonly PropertySlot[];
}

/**
 * An `apoc.export.csv` section: one table whose rows are nodes (`_id` set) or relationships; either
 * part is null when the header has no column for it.
 */
interface ApocSection {
    readonly kind: "apoc";
    readonly node: NodeSection | null;
    readonly relationship: RelationshipSection | null;
}

type Section = NodeSection | RelationshipSection | ApocSection;

/** The kind of section an input option names. */
type SectionKind = "node" | "relationship";

/** How many leading bytes are peeked to tell an APOC JSON input from a CSV one. */
const JSON_PEEK_BYTES = 1024;

/** The APOC CSV columns with a structural meaning, and the neo4j-admin field kind each plays. */
const APOC_CSV_COLUMNS: Readonly<Record<string, FieldKind>> = Object.freeze({
    _id: "ID",
    _labels: "LABEL",
    _start: "START_ID",
    _end: "END_ID",
    _type: "TYPE",
});

/** The delimiters sniffed between when none is given: neo4j-admin's default and the TSV tab. */
const NEO4J_DELIMITER_CANDIDATES: readonly string[] = Object.freeze([",", "\t"]);

/**
 * Resolve the format-specific options.
 * @param options - the caller's options
 * @returns the resolved options; E_UNSUPPORTED for an invalid value
 */
function resolveNeo4jOptions(options: Neo4jImportOptions | undefined): ResolvedNeo4jOptions {
    const o: Neo4jImportOptions = options ?? {};
    const arrayDelimiter = o.arrayDelimiter ?? ";";
    const listSyntax = ARRAY_DELIMITERS[arrayDelimiter];
    if (typeof arrayDelimiter !== "string" || listSyntax === undefined) {
        throw new GraphFormatError(
            "E_UNSUPPORTED",
            `option arrayDelimiter: ${JSON.stringify(arrayDelimiter)} is not one of ";", ",", "|"`,
            { option: "arrayDelimiter", found: arrayDelimiter },
        );
    }
    if (arrayDelimiter === "," && o.delimiter === undefined) {
        throw new GraphFormatError(
            "E_UNSUPPORTED",
            'option arrayDelimiter "," needs the delimiter option: the field delimiter is a comma unless another is given',
            { option: "arrayDelimiter", found: arrayDelimiter },
        );
    }
    const syntax = checkRecordSyntax({
        delimiter: o.delimiter ?? null,
        quote: o.quote ?? '"',
        candidates: NEO4J_DELIMITER_CANDIDATES.filter((d) => d !== arrayDelimiter),
    });
    if (syntax.delimiter === arrayDelimiter) {
        throw new GraphFormatError(
            "E_UNSUPPORTED",
            `options delimiter and arrayDelimiter must differ: both are ${JSON.stringify(arrayDelimiter)}; pass another arrayDelimiter (";", "," or "|")`,
            {
                option: "arrayDelimiter",
                found: arrayDelimiter,
            },
        );
    }
    return {
        nodes: inputList("nodes", o.nodes),
        relationships: inputList("relationships", o.relationships),
        syntax,
        listSyntax,
    };
}

/**
 * Normalize an input-list option.
 * @param name - the option name
 * @param value - one input, a list of inputs, or undefined
 * @returns the inputs; E_UNSUPPORTED for anything else
 */
function inputList(name: string, value: unknown): readonly ImportInput[] {
    if (value === undefined || value === null) {
        return [];
    }
    const list: unknown[] = Array.isArray(value) ? (value as unknown[]) : [value];
    for (const item of list) {
        if (!isImportInput(item)) {
            throw new GraphFormatError("E_UNSUPPORTED", `option ${name}: an entry is not an ImportInput`, {
                option: name,
                found: typeof item,
            });
        }
    }
    return list as ImportInput[];
}

/**
 * Which nodes were declared by a node row and in which id space, by node index, so a repeated id
 * is reported (a duplicate in one space, a collision across spaces).
 */
class NodeRegistry {
    private codes = new Uint32Array(1024);

    private readonly spaces = new Map<string | null, number>();

    /**
     * The code of an id space (1 for "no space").
     * @param space - the space name or null
     * @returns a code >= 1
     */
    codeOf(space: string | null): number {
        let code = this.spaces.get(space);
        if (code === undefined) {
            code = this.spaces.size + 1;
            this.spaces.set(space, code);
        }
        return code;
    }

    /**
     * Record that a node row declared a node.
     * @param index - the node index
     * @param code - the space code
     * @returns "new" for a first declaration, "duplicate" for a repeat in the same space, "collision" across spaces
     */
    declare(index: number, code: number): "new" | "duplicate" | "collision" {
        if (index >= this.codes.length) {
            let size = this.codes.length * 2;
            while (size <= index) {
                size *= 2;
            }
            const grown = new Uint32Array(size);
            grown.set(this.codes);
            this.codes = grown;
        }
        const previous = this.codes[index];
        if (previous === 0) {
            this.codes[index] = code;
            return "new";
        }
        return previous === code ? "duplicate" : "collision";
    }

    /**
     * The space code a node row declared a node in.
     * @param index - the node index
     * @returns the code, or 0 when no node row declared the node
     */
    codeAt(index: number): number {
        return index < this.codes.length ? this.codes[index] : 0;
    }
}

/**
 * Byte progress over several inputs as one sequence: each input's progress is offset by the bytes
 * of the inputs before it, and the total is known only when every input is in memory.
 */
class ProgressTracker {
    private readonly callback: ((bytesDone: number, bytesTotal?: number) => void) | null;

    private readonly total: number | undefined;

    private offset = 0;

    private lastDone = 0;

    /**
     * Create a tracker.
     * @param callback - the caller's onProgress, or null
     * @param inputs - every input in reading order
     */
    constructor(callback: ((bytesDone: number, bytesTotal?: number) => void) | null, inputs: readonly ImportInput[]) {
        this.callback = callback;
        let total: number | undefined = 0;
        for (const input of inputs) {
            const length = inputLength(input);
            if (length === null) {
                total = undefined;
                break;
            }
            total += length;
        }
        this.total = total;
    }

    /**
     * The read options for one input.
     * @param signal - the cancellation signal
     * @returns options whose onProgress reports cumulative bytes
     */
    optionsFor(signal: AbortSignal | null): ReadOptions {
        const { callback } = this;
        if (callback === null) {
            return { signal };
        }
        return {
            signal,
            onProgress: (done: number): void => {
                this.lastDone = done;
                callback(this.offset + done, this.total);
            },
        };
    }

    /** Move the offset past the input just finished. */
    finishInput(): void {
        this.offset += this.lastDone;
        this.lastDone = 0;
    }
}

/**
 * The state of one import call: the sink, the report, the resolved options, the reserved column
 * handles and the per-section row handlers.
 */
class Neo4jImportSession {
    private readonly sink: GraphSink;

    private readonly report: ImportReportBuilder;

    private readonly common: ResolvedImportOptions;

    private readonly options: ResolvedNeo4jOptions;

    private readonly coercer: IdCoercer;

    private readonly direction: DirectionResolver;

    private readonly registry = new NodeRegistry();

    /** The relationship property the weights were read from, when it is not "weight"; the exporter writes it back under that name. */
    weightProperty: string | null = null;

    private labelsHandle: ColumnHandle = INVALID_INDEX as ColumnHandle;

    private typeHandle: ColumnHandle = INVALID_INDEX as ColumnHandle;

    private idSpaceHandle: ColumnHandle = INVALID_INDEX as ColumnHandle;

    private originalIdHandle: ColumnHandle = INVALID_INDEX as ColumnHandle;

    private ignoredColumns = 0;

    /** Whether the sink's direction was set (before the first relationship, design section 8.4 rule 1). */
    private headerSet = false;

    /** Scratch: the parsed value of every cell of the current row. */
    private values: unknown[] = [];

    /** Scratch: the companion text of every cell of the current row. */
    private texts: (string | null)[] = [];

    /** Scratch: the property slots of the current row that lost precision. */
    private readonly precisionSlots: PropertySlot[] = [];

    /** Scratch: the values of the current row that overflowed their float / double type. */
    private readonly overflows: string[] = [];

    /** The section kind the option of the input being read names, or null for the primary input. */
    private expectedKind: SectionKind | null = null;

    /** Whether any node row was read. */
    private nodeRows = false;

    /** The ids of the APOC JSON relationships read, so one repeated in query records is read once. */
    private readonly apocRelationships = new Set<string>();

    /** Nodes relationship endpoints created (no node row declared them yet), the first few by id. */
    private readonly placeholders: { readonly id: NodeId; readonly index: number }[] = [];

    /**
     * Create a session.
     * @param sink - the sink
     * @param report - the report
     * @param common - the resolved common options
     * @param options - the resolved format options
     */
    constructor(
        sink: GraphSink,
        report: ImportReportBuilder,
        common: ResolvedImportOptions,
        options: ResolvedNeo4jOptions,
    ) {
        this.sink = sink;
        this.report = report;
        this.common = common;
        this.options = options;
        this.coercer = new IdCoercer(common.ids);
        this.direction = new DirectionResolver(sink, report, common.onMixedDirection);
    }

    /**
     * Read every input. A header-only input lends its header to the headerless input after it (the
     * neo4j-admin convention `--nodes=header.csv,part1.csv`); an empty input is an error only when
     * it is the only one.
     * @param inputs - the inputs in reading order, each with the kind of section its option names (null for the primary input)
     */
    async run(inputs: readonly { readonly input: ImportInput; readonly kind: SectionKind | null }[]): Promise<void> {
        const progress = new ProgressTracker(
            this.common.onProgress,
            inputs.map((i) => i.input),
        );
        let carried: Section | null = null;
        for (const { input, kind } of inputs) {
            this.expectedKind = kind;
            if (carried !== null && kind !== null && carried.kind !== kind) {
                // a nodes header never lends itself to a relationships file, nor the reverse
                carried = null;
            }
            carried = await this.readInput(
                input,
                { ...progress.optionsFor(this.common.signal), encoding: this.common.encoding },
                carried,
                inputs.length > 1,
            );
            progress.finishInput();
        }
        if (this.ignoredColumns > 0) {
            this.report.loss(
                IGNORED_COLUMNS_LOSS,
                `${this.ignoredColumns} :IGNORE column${plural(this.ignoredColumns)} ${agree(this.ignoredColumns, "was", "were")} skipped as the header instructs`,
                null,
                this.ignoredColumns,
            );
        }
        this.reportDangling();
    }

    /**
     * Read one input: a header row, then data rows until the next header row.
     * @param input - the input
     * @param readOptions - cancellation and progress
     * @param carried - the section of a header-only input just before this one, or null
     * @param mayBeEmpty - whether an input without any record is allowed (other inputs exist)
     * @returns this input's section when it held a header and no data row (lent to the next input), else null
     */
    private async readInput(
        input: ImportInput,
        readOptions: ReadOptions,
        carried: Section | null,
        mayBeEmpty: boolean,
    ): Promise<Section | null> {
        const peeked = await peekHead(input, JSON_PEEK_BYTES, readOptions.signal ?? null);
        const { head } = peeked;
        if (startsAsJson(typeof head === "string" ? head : new TextDecoder("utf-8", { fatal: false }).decode(head))) {
            await this.readApocJson(peeked.input, readOptions);
            return null;
        }
        const reader = new RecordReader(peeked.input, this.report, this.options.syntax, {
            ...readOptions,
            allowEmpty: mayBeEmpty,
        });
        let section: Section | null = carried;
        let records = 0;
        let rows = 0;
        let sinceCheck = 0;
        for await (const count of reader) {
            const { cells, quoted } = reader;
            if (records === 0 && count === 1 && !quoted[0] && cells[0].trim().length === 0) {
                // a whitespace-only line before anything else is a blank line, not an empty header
                continue;
            }
            records++;
            // a quoted marker cell is data ("ref:id") unless the whole record is a quoted header
            if (section === null || isHeaderRecord(cells, count, quoted)) {
                section = this.declareSection(reader, count);
                rows = 0;
                continue;
            }
            rows++;
            this.row(section, reader, count);
            if (++sinceCheck >= ABORT_CHECK_INTERVAL) {
                sinceCheck = 0;
                throwIfAborted(readOptions.signal);
            }
        }
        if (records === 0 && carried === null && !mayBeEmpty) {
            this.report.fail(HEADER_CODE, "the input has no header row", { line: 1 });
        }
        // the header lent on: a header-only input's, or the one lent to this input when it had none
        if (section === carried) {
            return carried;
        }
        return rows === 0 ? section : null;
    }

    /**
     * Interpret a header row: parse every cell, check the section shape, declare its columns.
     * @param reader - the reader positioned on the header
     * @param count - the number of header cells
     * @returns the section
     */
    private declareSection(reader: RecordReader, count: number): Section {
        const { line } = reader;
        try {
            return this.declareSectionFields(reader, count, line);
        } catch (err) {
            if (err instanceof GraphFormatError && !(err instanceof ImportError)) {
                this.reportHeaderFailure(reader, count, line, err);
            }
            throw err;
        }
    }

    /**
     * Parse the header cells, check the section shape and declare the section's columns.
     * @param reader - the reader positioned on the header
     * @param count - the number of header cells
     * @param line - the header line
     * @returns the section
     */
    private declareSectionFields(reader: RecordReader, count: number, line: number): Section {
        const fields: HeaderField[] = [];
        for (let i = 0; i < count; i++) {
            fields.push(parseHeaderField(reader.cells[i]));
        }
        const kinds = cellsByKind(fields);
        const isNode = (kinds.get("ID") ?? []).length > 0;
        const isRelationship = (kinds.get("START_ID") ?? []).length > 0 || (kinds.get("END_ID") ?? []).length > 0;
        if (!isNode && !isRelationship && isApocCsvHeader(fields.map((f) => f.text.trim()))) {
            return this.declareApocSection(fields, line);
        }
        checkSectionShape(fields, isNode, isRelationship);
        this.warnSectionKind(isNode, line);
        checkPropertyNames(fields);
        this.ignoredColumns += (kinds.get("IGNORE") ?? []).length;
        return isNode
            ? this.declareNodeHeader(fields, kinds, line)
            : this.declareRelationshipHeader(fields, kinds, line);
    }

    /**
     * Warn when a header's kind differs from the kind its file was given as.
     * @param isNode - whether the header is a node header
     * @param line - the header line
     */
    private warnSectionKind(isNode: boolean, line: number): void {
        const kind = isNode ? "node" : "relationship";
        if (this.expectedKind === null || this.expectedKind === kind) {
            return;
        }
        const given = this.expectedKind === "node" ? "nodes" : "relationships";
        this.report.warning(
            "validation-error",
            SECTION_KIND_CODE,
            `a ${kind} header in a file given as ${given}; read by its header`,
            { line },
        );
    }

    /**
     * Check a node header's special columns and declare its section.
     * @param fields - the parsed header
     * @param kinds - the header cells by field kind
     * @param line - the header line
     * @returns the section
     */
    private declareNodeHeader(fields: readonly HeaderField[], kinds: Map<FieldKind, number[]>, line: number): Section {
        const ids = kinds.get("ID") ?? [];
        if (ids.length > 1) {
            throw headerError("a node header has more than one :ID column");
        }
        if (kinds.has("TYPE")) {
            throw headerError("a node header cannot have a :TYPE column");
        }
        return this.declareNodeSection(fields, ids[0], kinds.get("LABEL") ?? [], line);
    }

    /**
     * Check a relationship header's special columns and declare its section.
     * @param fields - the parsed header
     * @param kinds - the header cells by field kind
     * @param line - the header line
     * @returns the section
     */
    private declareRelationshipHeader(
        fields: readonly HeaderField[],
        kinds: Map<FieldKind, number[]>,
        line: number,
    ): Section {
        const starts = kinds.get("START_ID") ?? [];
        const ends = kinds.get("END_ID") ?? [];
        if (starts.length !== 1 || ends.length !== 1) {
            throw headerError("a relationship header needs exactly one :START_ID and one :END_ID column");
        }
        if (kinds.has("LABEL")) {
            throw headerError("a relationship header cannot have a :LABEL column");
        }
        const types = kinds.get("TYPE") ?? [];
        if (types.length > 1) {
            throw headerError("a relationship header has more than one :TYPE column");
        }
        return this.declareRelationshipSection(fields, starts[0], ends[0], types.length === 1 ? types[0] : -1, line);
    }

    /**
     * Fail the import on a malformed header, with a delimiter hint when the header cells hold another delimiter.
     * @param reader - the reader positioned on the header
     * @param count - the number of header cells
     * @param line - the header line
     * @param err - the header error
     */
    private reportHeaderFailure(reader: RecordReader, count: number, line: number, err: GraphFormatError): void {
        // a header written with another delimiter reads as one cell holding it
        const other = [";", "|", "\t", ","].find(
            (d) => d !== reader.delimiter && reader.cells.slice(0, count).some((c) => c.includes(d)),
        );
        const hint =
            other === undefined
                ? ""
                : `; if the file is delimited by ${JSON.stringify(other)}, pass the delimiter option`;
        this.report.fail(HEADER_CODE, `${err.message}${hint}`, { line }, { cause: err.code });
    }

    /**
     * Declare the columns of a node section.
     * @param fields - the parsed header
     * @param idCell - the `:ID` cell
     * @param labelCells - the `:LABEL` cells
     * @param line - the header line
     * @returns the section
     */
    private declareNodeSection(
        fields: readonly HeaderField[],
        idCell: number,
        labelCells: readonly number[],
        line: number,
    ): NodeSection {
        const idField = fields[idCell];
        const extraLabels: string[] = [];
        for (const field of fields) {
            for (const [key, value] of field.options) {
                if (key === "label" && field.kind === "ID") {
                    extraLabels.push(value);
                } else {
                    this.report.warning(
                        "unsupported",
                        HEADER_OPTION_CODE,
                        `header option ${key}:${value} of "${field.text}" is ignored`,
                        { line, element: field.text },
                    );
                }
            }
        }
        if (labelCells.length > 0 || extraLabels.length > 0) {
            this.ensureLabels();
        }
        if (idField.space !== null) {
            this.ensureIdSpace();
        }
        let idHandle: ColumnHandle = INVALID_INDEX as ColumnHandle;
        if (idField.name.length > 0) {
            idHandle = this.declareProperty(
                "node",
                { ...idField, type: null },
                idCell,
                { origin: { format: NEO4J, id: idField.name, title: null, type: "ID", namespace: idField.space } },
                line,
            ).handle;
        }
        const properties = this.declareProperties("node", fields, line, null);
        return {
            kind: "node",
            width: fields.length,
            idCell,
            idHandle,
            space: idField.space,
            spaceCode: this.registry.codeOf(idField.space),
            labelCells,
            extraLabels,
            properties,
            colonLabels: false,
        };
    }

    /**
     * Declare an `apoc.export.csv` section: the node part reads `_id`, `_labels` and the property
     * columns before `_start`; the relationship part reads `_start`, `_end`, `_type` and the
     * property columns from `_start` on. Each part sees the other's columns as ignored cells.
     * @param fields - the parsed header (every cell a property field)
     * @param line - the header line
     * @returns the section
     */
    private declareApocSection(fields: readonly HeaderField[], line: number): ApocSection {
        const firstRelationship = fields.findIndex(
            (f) => f.name === "_start" || f.name === "_end" || f.name === "_type",
        );
        const split = firstRelationship < 0 ? fields.length : firstRelationship;
        const ignored = (field: HeaderField): HeaderField => ({ ...field, name: "", kind: "IGNORE" });
        const part = (nodes: boolean): HeaderField[] =>
            fields.map((field, cell) => {
                const kind = APOC_CSV_COLUMNS[field.name] as FieldKind | undefined;
                const mine =
                    kind === undefined ? cell < split === nodes : (kind === "ID" || kind === "LABEL") === nodes;
                return !mine
                    ? ignored(field)
                    : { ...field, name: kind === undefined ? field.name : "", kind: kind ?? "PROPERTY" };
            });
        const nodeFields = part(true);
        const relationshipFields = part(false);
        checkPropertyNames(nodeFields);
        checkPropertyNames(relationshipFields);
        const cellOf = (list: readonly HeaderField[], kind: FieldKind): number =>
            list.findIndex((f) => f.kind === kind);
        const idCell = cellOf(nodeFields, "ID");
        const startCell = cellOf(relationshipFields, "START_ID");
        const endCell = cellOf(relationshipFields, "END_ID");
        const labelCell = cellOf(nodeFields, "LABEL");
        const node =
            idCell < 0
                ? null
                : {
                      ...this.declareNodeSection(nodeFields, idCell, labelCell < 0 ? [] : [labelCell], line),
                      colonLabels: true,
                  };
        const relationship =
            startCell < 0 || endCell < 0
                ? null
                : this.declareRelationshipSection(
                      relationshipFields,
                      startCell,
                      endCell,
                      cellOf(relationshipFields, "TYPE"),
                      line,
                  );
        return { kind: "apoc", node, relationship };
    }

    /**
     * Declare the columns of a relationship section.
     * @param fields - the parsed header
     * @param startCell - the `:START_ID` cell
     * @param endCell - the `:END_ID` cell
     * @param typeCell - the `:TYPE` cell, or -1
     * @param line - the header line
     * @returns the section
     */
    private declareRelationshipSection(
        fields: readonly HeaderField[],
        startCell: number,
        endCell: number,
        typeCell: number,
        line: number,
    ): RelationshipSection {
        for (const field of fields) {
            for (const [key, value] of field.options) {
                this.report.warning(
                    "unsupported",
                    HEADER_OPTION_CODE,
                    `header option ${key}:${value} of "${field.text}" is ignored`,
                    { line, element: field.text },
                );
            }
        }
        if (typeCell >= 0) {
            this.ensureType();
        }
        const { weightFrom } = this.common;
        let weightCell = -1;
        if (weightFrom !== null) {
            weightCell = fields.findIndex((field) => field.kind === "PROPERTY" && field.name === weightFrom);
            if (weightCell >= 0 && weightFrom !== "weight") {
                this.weightProperty = weightFrom;
            }
        }
        const properties = this.declareProperties("edge", fields, line, weightCell);
        const { space: startSpace } = fields[startCell];
        const { space: endSpace } = fields[endCell];
        return {
            kind: "relationship",
            width: fields.length,
            startCell,
            endCell,
            startSpace,
            endSpace,
            startSpaceCode: startSpace === null ? 0 : this.registry.codeOf(startSpace),
            endSpaceCode: endSpace === null ? 0 : this.registry.codeOf(endSpace),
            typeCell,
            weightCell,
            properties,
        };
    }

    /**
     * Declare every PROPERTY field of a header.
     * @param domain - node or edge
     * @param fields - the parsed header
     * @param line - the header line
     * @param skipCell - a cell to leave undeclared (the weight), or null
     * @returns the property slots
     */
    private declareProperties(
        domain: "node" | "edge",
        fields: readonly HeaderField[],
        line: number,
        skipCell: number | null,
    ): PropertySlot[] {
        const slots: PropertySlot[] = [];
        fields.forEach((field, cell) => {
            if (field.kind !== "PROPERTY" || cell === skipCell) {
                return;
            }
            slots.push(this.declareProperty(domain, field, cell, {}, line));
        });
        const width = fields.length;
        if (this.values.length < width) {
            this.values = new Array<unknown>(width);
            this.texts = new Array<string | null>(width);
        }
        return slots;
    }

    /**
     * Declare one property column on the sink: the same name and shape again shares the column;
     * a different shape under the same name is renamed `<name>#<name>` (design section 5.6).
     * @param domain - node or edge
     * @param field - the header field
     * @param cell - the field's cell index
     * @param patch - declaration fields to override (the id property's origin)
     * @param line - the header line
     * @returns the slot
     */
    private declareProperty(
        domain: "node" | "edge",
        field: HeaderField,
        cell: number,
        patch: Partial<ColumnDecl>,
        line: number,
    ): PropertySlot {
        const { sink, report } = this;
        const { listSyntax } = this.options;
        const input: AttributeDeclarationInput = {
            format: NEO4J,
            id: field.name,
            title: null,
            type: field.type,
            namespace: null,
            listSyntax,
            long: this.common.long,
        };
        let declared: DeclaredAttribute = declareAttribute(input);
        let decl: ColumnDecl = { ...declared.decl, ...patch };
        let handle: ColumnHandle;
        try {
            handle = declareOn(sink, domain, decl);
        } catch (err) {
            if (!(err instanceof GraphFormatError) || err.code !== "E_COLUMN_EXISTS") {
                throw err;
            }
            declared = declareAttribute({ ...input, taken: takenIn(sink, domain) });
            decl = { ...declared.decl, ...patch, name: declared.decl.name };
            handle = declareOn(sink, domain, decl);
        }
        for (const issue of declared.issues) {
            report.warning(issue.category, issue.code, issue.message, { line, element: field.text });
        }
        return {
            cell,
            name: decl.name,
            handle,
            spec: declared.spec,
            companionDecl: declared.companion,
            companion: INVALID_INDEX as ColumnHandle,
        };
    }

    /** Declare (or adopt) the labels column. */
    private ensureLabels(): void {
        if (this.labelsHandle === INVALID_INDEX) {
            this.labelsHandle = this.declareReserved("node", LABELS_DECL);
        }
    }

    /** Declare (or adopt) the relationship type column. */
    private ensureType(): void {
        if (this.typeHandle === INVALID_INDEX) {
            this.typeHandle = this.declareReserved("edge", TYPE_DECL);
        }
    }

    /** Declare (or adopt) the id space column. */
    private ensureIdSpace(): void {
        if (this.idSpaceHandle === INVALID_INDEX) {
            this.idSpaceHandle = this.declareReserved("node", ID_SPACE_DECL);
            this.originalIdHandle = this.declareReserved("node", ORIGINAL_ID_DECL);
        }
    }

    /**
     * Declare a reserved column: the same shape again shares it; a name taken by another shape is
     * renamed `<name>#<origin.id>` and reported; a role the sink already holds elsewhere is dropped
     * and reported.
     * @param domain - node or edge
     * @param decl - the reserved declaration
     * @returns the handle
     */
    private declareReserved(domain: "node" | "edge", decl: ColumnDecl): ColumnHandle {
        const { sink, report } = this;
        let current = decl;
        for (;;) {
            try {
                return declareOn(sink, domain, current);
            } catch (err) {
                if (!(err instanceof GraphFormatError)) {
                    throw err;
                }
                if (err.code === "E_COLUMN_EXISTS") {
                    const name = uniqueColumnName(current.name, current.origin?.id ?? null, takenIn(sink, domain));
                    report.warning(
                        "coercion",
                        RENAMED_CODE,
                        `column "${current.name}" renamed to "${name}": the name was taken`,
                        { element: current.name },
                    );
                    current = { ...current, name };
                } else if (err.code === "E_DUPLICATE_ROLE") {
                    report.warning(
                        "coercion",
                        ROLE_TAKEN_CODE,
                        `column "${current.name}" declared without role "${String(current.role)}": the sink already holds that role`,
                        { element: current.name },
                    );
                    const { role: _role, ...withoutRole } = current;
                    current = withoutRole;
                } else {
                    throw err;
                }
            }
        }
    }

    /**
     * Push one data row of a section: an APOC row is a node when its `_id` cell is set (or the
     * table has no relationship columns), a relationship otherwise.
     * @param section - the section
     * @param reader - the reader positioned on the row
     * @param count - the row's cell count
     */
    private row(section: Section, reader: RecordReader, count: number): void {
        if (section.kind === "node") {
            this.nodeRow(section, reader, count);
        } else if (section.kind === "relationship") {
            this.relationshipRow(section, reader, count);
        } else if (
            section.node !== null &&
            (section.relationship === null ||
                reader.cells[section.node.idCell].length > 0 ||
                reader.quoted[section.node.idCell])
        ) {
            this.nodeRow(section.node, reader, count);
        } else if (section.relationship !== null) {
            this.relationshipRow(section.relationship, reader, count);
        }
    }

    /**
     * Push one node row.
     * @param section - the section
     * @param reader - the reader positioned on the row
     * @param count - the row's cell count
     */
    private nodeRow(section: NodeSection, reader: RecordReader, count: number): void {
        const { sink, report } = this;
        const { cells, quoted, line } = reader;
        if (count !== section.width) {
            report.error(
                "validation-error",
                COLUMN_COUNT_CODE,
                `row has ${count} cell${plural(count)} but the header has ${section.width}`,
                { line },
            );
            report.counts.skippedNodes++;
            return;
        }
        const idText = cells[section.idCell];
        if (idText.length === 0 && !quoted[section.idCell]) {
            // a quoted empty cell is the id "" (neo4j-admin: an empty quoted field is an empty string)
            report.error("missing-value", MISSING_ID_CODE, "empty :ID cell", { line });
            report.counts.skippedNodes++;
            return;
        }
        const coerced = this.coerceId(idText, line);
        if (coerced === null || !this.parseProperties(section.properties, cells, quoted, line, idText)) {
            report.counts.skippedNodes++;
            return;
        }
        const id = qualify(coerced, section.space);
        let labels: string[] | undefined;
        if (section.labelCells.length > 0 || section.extraLabels.length > 0) {
            labels = this.labelsOf(section, cells, quoted);
        }
        this.nodeRows = true;
        const existed = sink.indexOf(id) !== INVALID_INDEX;
        let index: number;
        try {
            index = sink.addNode(id);
        } catch (err) {
            report.recordError(err, { line, element: idText });
            report.counts.skippedNodes++;
            return;
        }
        const status = this.registry.declare(index, section.spaceCode);
        if (status === "collision") {
            report.error(
                "validation-error",
                ID_SPACE_COLLISION_CODE,
                `node ${idText} is declared in id space ${section.space ?? "(none)"} and in another id space; the core has one id space and this row is skipped`,
                { line, element: idText },
            );
            report.counts.skippedNodes++;
            return;
        }
        if (status === "duplicate") {
            report.warning(
                "merged",
                DUPLICATE_NODE_CODE,
                `node ${idText} is declared twice; the later properties win`,
                {
                    line,
                    element: idText,
                },
            );
        }
        // a write the sink refuses is recorded and the rest of the row is still written
        const set = (column: ColumnHandle, value: unknown): void => {
            this.guarded(line, idText, () => {
                sink.setNodeValue(column, index, value);
            });
        };
        if (section.idHandle !== INVALID_INDEX) {
            set(section.idHandle, idText);
        }
        if (section.space !== null) {
            set(this.idSpaceHandle, section.space);
            set(this.originalIdHandle, idText);
        }
        if (labels !== undefined) {
            set(this.labelsHandle, labels);
        }
        this.writeProperties("node", section.properties, index, line, idText);
        this.reportPrecision(line, idText);
        // a node a relationship created before its row (or an earlier row) is counted once
        if (!existed) {
            report.counts.nodes++;
        }
    }

    /**
     * Run one sink write, recording a refusal (a GraphFormatError) on the row's line instead of
     * letting it escape the import.
     * @param line - the row's line
     * @param element - the row's element name
     * @param write - the write
     */
    private guarded(line: number | null, element: string, write: () => void): void {
        try {
            write();
        } catch (err) {
            if (!(err instanceof GraphFormatError) || err instanceof ImportError) {
                throw err;
            }
            this.report.recordError(err, { line, element });
        }
    }

    /**
     * Report the relationship endpoints no node row declared (the shared W_DANGLING_REFERENCE,
     * once) when the input has node rows: each became a node, where neo4j-admin refuses the
     * relationship.
     */
    private reportDangling(): void {
        const dangling = this.placeholders.filter((p) => this.registry.codeAt(p.index) === 0);
        // without any node row, every node comes from the relationships (a relationships-only file)
        if (dangling.length === 0 || !this.nodeRows) {
            return;
        }
        const shown = dangling
            .slice(0, 5)
            .map((p) => String(p.id))
            .join(", ");
        this.report.warning(
            "validation-error",
            DANGLING_REFERENCE_CODE,
            `${dangling.length} relationship endpoint${plural(dangling.length)} ${agree(dangling.length, "names", "name")} no node row and became nodes: ${shown}${dangling.length > 5 ? ", ..." : ""} (neo4j-admin refuses such relationships)`,
            { element: String(dangling[0].id) },
        );
    }

    /**
     * Resolve a relationship row's endpoints, reporting an empty, invalid or wrong-space endpoint.
     * @param section - the section
     * @param reader - the reader positioned on the row
     * @returns the qualified endpoints and the row's element text, or null when the row is skipped
     */
    private relationshipEndpoints(
        section: RelationshipSection,
        reader: RecordReader,
    ): { source: NodeId; target: NodeId; element: string } | null {
        const { report } = this;
        const { cells, quoted, line } = reader;
        const startText = cells[section.startCell];
        const endText = cells[section.endCell];
        const startMissing = startText.length === 0 && !quoted[section.startCell];
        if (startMissing || (endText.length === 0 && !quoted[section.endCell])) {
            report.error(
                "missing-value",
                MISSING_ENDPOINT_CODE,
                `empty ${startMissing ? ":START_ID" : ":END_ID"} cell`,
                {
                    line,
                },
            );
            return null;
        }
        const element = `${startText}->${endText}`;
        const start = this.coerceId(startText, line);
        const end = start === null ? null : this.coerceId(endText, line);
        if (start === null || end === null) {
            return null;
        }
        const source = qualify(start, section.startSpace);
        const target = qualify(end, section.endSpace);
        let wrongSpace: string | null = null;
        if (this.wrongSpace(source, section.startSpaceCode)) {
            wrongSpace = startText;
        } else if (this.wrongSpace(target, section.endSpaceCode)) {
            wrongSpace = endText;
        }
        if (wrongSpace !== null) {
            report.error(
                "missing-value",
                ENDPOINT_SPACE_CODE,
                `endpoint ${wrongSpace} is not a node of its declared id space (a node of another id space has that id); the row is skipped`,
                { line, element },
            );
            return null;
        }
        return { source, target, element };
    }

    /**
     * Write a relationship's `:TYPE` cell, warning on an empty one.
     * @param section - the section
     * @param cells - the row's cells
     * @param edge - the edge index
     * @param line - the row line
     * @param element - the row's element text
     */
    private setRelationshipType(
        section: RelationshipSection,
        cells: readonly string[],
        edge: number,
        line: number,
        element: string,
    ): void {
        if (section.typeCell < 0) {
            return;
        }
        const type = cells[section.typeCell];
        if (type.length > 0) {
            this.guarded(line, element, () => {
                this.sink.setEdgeValue(this.typeHandle, edge, type);
            });
        } else {
            this.report.warning(
                "missing-value",
                MISSING_TYPE_CODE,
                "empty :TYPE cell; neo4j-admin requires a relationship type, the relationship is kept without one",
                { line, element },
            );
        }
    }

    /**
     * Push one relationship row.
     * @param section - the section
     * @param reader - the reader positioned on the row
     * @param count - the row's cell count
     */
    private relationshipRow(section: RelationshipSection, reader: RecordReader, count: number): void {
        const { sink, report } = this;
        const { cells, quoted, line } = reader;
        if (!this.headerSet) {
            // a Neo4j file is directed by definition ("all relationships have a direction"); the sink's
            // direction is set once, before the first relationship, so a node-only file leaves it alone
            this.headerSet = true;
            this.direction.setHeader(true, { line });
        }
        if (count !== section.width) {
            report.error(
                "validation-error",
                COLUMN_COUNT_CODE,
                `row has ${count} cell${plural(count)} but the header has ${section.width}`,
                { line },
            );
            report.counts.skippedEdges++;
            return;
        }
        const endpoints = this.relationshipEndpoints(section, reader);
        if (endpoints === null) {
            report.counts.skippedEdges++;
            return;
        }
        const { source, target, element } = endpoints;
        let weight: number | undefined;
        if (section.weightCell >= 0) {
            try {
                weight = parseWeightText(cells[section.weightCell], this.report);
            } catch (err) {
                report.recordError(err, { line, element });
                report.counts.skippedEdges++;
                return;
            }
        }
        if (!this.parseProperties(section.properties, cells, quoted, line, element)) {
            report.counts.skippedEdges++;
            return;
        }
        const created = [source, target].filter(
            (id, k) => (k === 0 || id !== source) && sink.indexOf(id) === INVALID_INDEX,
        );
        let edge: number;
        try {
            edge = this.direction.addEdge(source, target, "directed", weight, { line, element });
        } catch (err) {
            report.recordError(err, { line, element });
            report.counts.skippedEdges++;
            return;
        }
        for (const id of created) {
            // a node no row declared yet: counted now; reported at the end unless a node row follows
            report.counts.nodes++;
            this.placeholders.push({ id, index: sink.indexOf(id) });
        }
        this.setRelationshipType(section, cells, edge, line, element);
        this.writeProperties("edge", section.properties, edge, line, element);
        this.reportPrecision(line, element);
        report.counts.edges++;
    }

    /**
     * Whether a qualified endpoint id belongs to a node a node row declared in another id space than
     * the endpoint's header declares (an unspaced node whose id text is `Space:id`). An endpoint
     * without a declared space, or a node no row declared yet, is looked up by id alone.
     * @param id - the endpoint id
     * @param spaceCode - the endpoint's space code, 0 for none
     * @returns true when the endpoint resolves to a node of another space
     */
    private wrongSpace(id: NodeId, spaceCode: number): boolean {
        if (spaceCode === 0) {
            return false;
        }
        const index = this.sink.indexOf(id);
        if (index < 0) {
            return false;
        }
        const declared = this.registry.codeAt(index);
        return declared !== 0 && declared !== spaceCode;
    }

    /**
     * Coerce an id cell, reporting a merge under `ids: "number"` and an invalid id as an error.
     * @param text - the cell
     * @param line - the row's line, or null when the input has none (JSON)
     * @returns the id, or null when the cell was rejected (the error is recorded)
     */
    private coerceId(text: string, line: number | null): NodeId | null {
        const { coercer, report } = this;
        let id: NodeId;
        try {
            id = coercer.text(text);
        } catch (err) {
            report.recordError(err, { line, element: text });
            return null;
        }
        const merge = coercer.lastMerge;
        if (merge !== null) {
            report.warning(
                "coercion",
                ID_MERGED_CODE,
                `id "${merge.text}" merged with "${merge.previousText}" as ${merge.id} under ids: "number"`,
                { line, element: text },
            );
        }
        return id;
    }

    /**
     * Parse the property cells of a row into the scratch arrays.
     * @param slots - the section's property slots
     * @param cells - the row's cells
     * @param quoted - whether each cell was quoted
     * @param line - the row's line
     * @param element - the row's element name for issues
     * @returns true when every cell parsed; false after recording the first error
     */
    private parseProperties(
        slots: readonly PropertySlot[],
        cells: readonly string[],
        quoted: readonly boolean[],
        line: number,
        element: string,
    ): boolean {
        const { values, texts, precisionSlots } = this;
        precisionSlots.length = 0;
        this.overflows.length = 0;
        for (const slot of slots) {
            const text = cells[slot.cell];
            texts[slot.cell] = null;
            if (text.length === 0) {
                values[slot.cell] = quoted[slot.cell] ? emptyValue(slot.spec) : undefined;
                continue;
            }
            const { spec } = slot;
            try {
                this.parseCell(slot, text);
            } catch (err) {
                this.report.recordError(err, { line, element: `${element} ${slot.name}` });
                return false;
            }
            if (overflows(spec, values[slot.cell], text)) {
                this.overflows.push(slot.name);
            }
            if (spec.precision && losesPrecision(spec, text)) {
                precisionSlots.push(slot);
            }
        }
        return true;
    }

    /**
     * Parse one non-empty property cell into the scratch arrays; throws on a malformed value.
     * @param slot - the cell's property slot
     * @param text - the cell text
     */
    private parseCell(slot: PropertySlot, text: string): void {
        const { values, texts } = this;
        const { spec } = slot;
        if (spec.temporal !== null && !spec.list) {
            const zoned = withZoneOffset(text, spec);
            const parsed = parseDeclaredTemporal(zoned, spec);
            values[slot.cell] = parsed.value;
            // a zone name is kept in the companion text, the value is its instant
            texts[slot.cell] = zoned === text ? parsed.text : text;
        } else {
            values[slot.cell] = parseDeclaredValue(text, spec, this.options.listSyntax);
            checkNeo4jRange(spec, values[slot.cell], text);
        }
    }

    /**
     * Write the parsed property values of a row.
     * @param domain - node or edge
     * @param slots - the section's property slots
     * @param row - the node or edge index
     * @param line - the row's line
     * @param element - the row's element name for issues
     */
    private writeProperties(
        domain: "node" | "edge",
        slots: readonly PropertySlot[],
        row: number,
        line: number,
        element: string,
    ): void {
        const { sink, values, texts } = this;
        for (const slot of slots) {
            const value = values[slot.cell];
            if (value === undefined) {
                continue;
            }
            const text = texts[slot.cell];
            // a value the sink refuses is recorded on the row's line; the other properties are written
            this.guarded(line, `${element} ${slot.name}`, () => {
                if (text !== null && slot.companion === INVALID_INDEX && slot.companionDecl !== null) {
                    slot.companion = declareCompanion(sink, domain, slot.companionDecl);
                }
                if (domain === "node") {
                    sink.setNodeValue(slot.handle, row, value);
                    if (text !== null) {
                        sink.setNodeValue(slot.companion, row, text);
                    }
                } else {
                    sink.setEdgeValue(slot.handle, row, value);
                    if (text !== null) {
                        sink.setEdgeValue(slot.companion, row, text);
                    }
                }
            });
        }
    }

    /**
     * Report the precision losses of the row just accepted.
     * @param line - the row's line
     * @param element - the row's element name
     */
    private reportPrecision(line: number, element: string): void {
        for (const slot of this.precisionSlots) {
            this.report.warning(
                "precision",
                PRECISION_CODE,
                `long value of "${slot.name}" is beyond 2^53 and was stored as the nearest f64`,
                { line, element },
            );
        }
        this.precisionSlots.length = 0;
        for (const name of this.overflows) {
            this.report.warning(
                "precision",
                PRECISION_CODE,
                `the value of "${name}" is beyond the range of its float / double type and was stored as the nearest representable value`,
                { line, element },
            );
        }
        this.overflows.length = 0;
    }

    /**
     * Read an `apoc.export.json` input: every node and relationship record anywhere in the
     * document (JSON Lines, one array, a `{nodes, rels}` object, query records).
     * @param input - the input
     * @param readOptions - cancellation, progress and encoding
     */
    private async readApocJson(input: ImportInput, readOptions: ReadOptions): Promise<void> {
        const text = await readText(input, this.report, readOptions);
        const stack = parseApocJson(text, this.report).reverse();
        const content = stack.some((doc) => (Array.isArray(doc) ? doc.length > 0 : isRecord(doc)));
        let found = false;
        let sinceCheck = 0;
        while (stack.length > 0) {
            found = this.apocValue(stack.pop(), stack) || found;
            if (++sinceCheck >= ABORT_CHECK_INTERVAL) {
                sinceCheck = 0;
                throwIfAborted(readOptions.signal);
            }
        }
        if (!found && content) {
            this.report.fail(
                HEADER_CODE,
                'the input is JSON without an APOC node or relationship record (an object with "type": "node" or "type": "relationship", as apoc.export.json writes); read other JSON graphs as format "json"',
                { line: 1 },
            );
        }
    }

    /**
     * Read one value of an APOC JSON document: a node or relationship record is pushed, any other
     * array or object has its children put on the stack (in document order).
     * @param value - the value
     * @param stack - the values still to read, the next on top
     * @returns true when the value was a node or relationship record
     */
    private apocValue(value: unknown, stack: unknown[]): boolean {
        if (isRecord(value) && value.type === "node" && "id" in value) {
            this.apocNode(value);
            return true;
        }
        if (isRecord(value) && value.type === "relationship") {
            this.apocRelationship(value);
            return true;
        }
        if (Array.isArray(value) || isRecord(value)) {
            const children: readonly unknown[] = Array.isArray(value) ? value : Object.values(value);
            for (let i = children.length - 1; i >= 0; i--) {
                stack.push(children[i]);
            }
        }
        return false;
    }

    /**
     * Push an APOC node record, or the start / end stub of a relationship: its id, labels and
     * properties. A node record read again (a query export repeats them) is written again with the
     * same values; a stub writes them only for a node not read before, so it never overwrites a record.
     * @param record - the record
     * @param stub - whether the record is a relationship's start or end stub
     * @returns the node id, or null when the record was skipped (the error is recorded)
     */
    private apocNode(record: Record<string, unknown>, stub = false): NodeId | null {
        const { sink, report } = this;
        const raw = record.id;
        if (typeof raw !== "string" && typeof raw !== "number") {
            report.error("missing-value", MISSING_ID_CODE, "an APOC node record without a string or number id", {});
            report.counts.skippedNodes++;
            return null;
        }
        const element = String(raw);
        const id = this.coerceId(element, null);
        if (id === null) {
            report.counts.skippedNodes++;
            return null;
        }
        const existed = sink.indexOf(id) !== INVALID_INDEX;
        let index: number;
        try {
            index = sink.addNode(id);
        } catch (err) {
            report.recordError(err, { element });
            report.counts.skippedNodes++;
            return null;
        }
        this.nodeRows = true;
        if (!existed) {
            report.counts.nodes++;
        } else if (stub) {
            return id;
        }
        if (Array.isArray(record.labels)) {
            this.ensureLabels();
            const labels = record.labels.filter((label): label is string => typeof label === "string");
            this.guarded(null, element, () => {
                sink.setNodeValue(this.labelsHandle, index, labels);
            });
        }
        this.apocProperties("node", index, record.properties, element, null);
        return id;
    }

    /**
     * Push an APOC relationship record: its endpoints (from the start / end stubs), its type
     * (`label`) and properties; one whose id was read before is skipped.
     * @param record - the record
     */
    private apocRelationship(record: Record<string, unknown>): void {
        const { report } = this;
        if (!this.headerSet) {
            this.headerSet = true;
            this.direction.setHeader(true, {});
        }
        const { start, end, label, properties } = record;
        if (!isRecord(start) || !isRecord(end)) {
            report.error(
                "missing-value",
                MISSING_ENDPOINT_CODE,
                "an APOC relationship record without a start or end node",
                {},
            );
            report.counts.skippedEdges++;
            return;
        }
        if (typeof record.id === "string" || typeof record.id === "number") {
            const key = String(record.id);
            if (this.apocRelationships.has(key)) {
                return;
            }
            this.apocRelationships.add(key);
        }
        const source = this.apocNode(start, true);
        const target = source === null ? null : this.apocNode(end, true);
        if (source === null || target === null) {
            report.counts.skippedEdges++;
            return;
        }
        const element = `${String(source)}->${String(target)}`;
        const weight = this.apocWeight(properties);
        let edge: number;
        try {
            edge = this.direction.addEdge(source, target, "directed", weight, { element });
        } catch (err) {
            report.recordError(err, { element });
            report.counts.skippedEdges++;
            return;
        }
        this.setApocType(edge, label, element);
        this.apocProperties("edge", edge, properties, element, weight === undefined ? null : this.common.weightFrom);
        report.counts.edges++;
    }

    /**
     * The weight of an APOC relationship: the number under the `weightFrom` property, if any.
     * @param properties - the record's properties
     * @returns the weight, or undefined
     */
    private apocWeight(properties: unknown): number | undefined {
        const { weightFrom } = this.common;
        if (weightFrom === null || !isRecord(properties) || typeof properties[weightFrom] !== "number") {
            return undefined;
        }
        if (weightFrom !== "weight") {
            this.weightProperty = weightFrom;
        }
        return properties[weightFrom];
    }

    /**
     * Write an APOC relationship's type (its `label`), warning when it has none.
     * @param edge - the edge index
     * @param label - the record's label
     * @param element - the element name for issues
     */
    private setApocType(edge: number, label: unknown, element: string): void {
        if (typeof label !== "string" || label.length === 0) {
            this.report.warning(
                "missing-value",
                MISSING_TYPE_CODE,
                "an APOC relationship without a label (its type); kept without one",
                { element },
            );
            return;
        }
        this.ensureType();
        this.guarded(null, element, () => {
            this.sink.setEdgeValue(this.typeHandle, edge, label);
        });
    }

    /**
     * Write the `properties` object of an APOC record: each non-null value as it is (a point map
     * or a list is a JSON value); a key named like the labels or type column gets `<name>#<name>`.
     * @param domain - node or edge
     * @param row - the node or edge index
     * @param properties - the record's properties, or anything else (written as none)
     * @param element - the element name for issues
     * @param skip - a key not to write (the one the weight was read from), or null
     */
    private apocProperties(
        domain: "node" | "edge",
        row: number,
        properties: unknown,
        element: string,
        skip: string | null,
    ): void {
        if (!isRecord(properties)) {
            return;
        }
        const { sink } = this;
        const reserved = domain === "node" ? LABELS_COLUMN : TYPE_COLUMN;
        for (const [key, value] of Object.entries(properties)) {
            if (value === null || value === undefined || key === skip) {
                continue;
            }
            const name = key === reserved ? `${key}#${key}` : key;
            this.guarded(null, `${element} ${key}`, () => {
                if (domain === "node") {
                    sink.setNodeValue(name, row, value);
                } else {
                    sink.setEdgeValue(name, row, value);
                }
            });
        }
    }

    /**
     * The labels of a node row: every `:LABEL` cell split by the array delimiter (empty items
     * dropped), plus the header's `{label:...}` options.
     * @param section - the section
     * @param cells - the row's cells
     * @param quoted - whether each cell was quoted
     * @returns the labels, or undefined when every label cell is unset and no extra label exists
     */
    private labelsOf(section: NodeSection, cells: readonly string[], quoted: readonly boolean[]): string[] | undefined {
        let labels: string[] | undefined;
        for (const cell of section.labelCells) {
            const text = cells[cell];
            if (text.length === 0 && !quoted[cell]) {
                continue;
            }
            const items = section.colonLabels ? text.split(":") : splitListText(text, this.options.listSyntax);
            labels ??= [];
            labels.push(...items.filter((item) => item.length > 0));
        }
        if (section.extraLabels.length > 0) {
            labels ??= [];
            labels.push(...section.extraLabels);
        }
        return labels;
    }
}

/**
 * Parse an APOC JSON export: one JSON document (an array or an object), else JSON Lines (one value
 * per non-blank line). A line that is not JSON stops the import with E_SYNTAX.
 * ponytail: an integer beyond 2^53 loses digits in JSON.parse; APOC writes ids as strings, so only
 * a property can; keep its digits (rewriteNumbers) if such exports turn up.
 * @param text - the decoded input
 * @param report - the report
 * @returns the documents
 */
function parseApocJson(text: string, report: ImportReportBuilder): unknown[] {
    try {
        return [JSON.parse(text) as unknown];
    } catch {
        // not one document: JSON Lines
    }
    const docs: unknown[] = [];
    const lines = text.split(/\r\n|\r|\n/);
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().length === 0) {
            continue;
        }
        try {
            docs.push(JSON.parse(lines[i]) as unknown);
        } catch (err) {
            report.fail(SYNTAX_CODE, `line ${i + 1} is not JSON: ${messageOf(err)}`, { line: i + 1 });
        }
    }
    return docs;
}

/**
 * The id a node of an id space is stored under: `Space:id`, so the same id in two spaces stays two
 * nodes (the core has one id space).
 * @param id - the coerced id cell
 * @param space - the id space, or null
 * @returns the id unchanged without a space, else the string `Space:id`
 */
function qualify(id: NodeId, space: string | null): NodeId {
    return space === null ? id : `${space}:${String(id)}`;
}

/** The integer range of the narrow neo4j-admin types (Java byte and short). */
const INTEGER_RANGES: Readonly<Partial<Record<string, readonly [number, number]>>> = {
    byte: [-128, 127],
    short: [-32768, 32767],
};

/**
 * A Cypher duration (ISO 8601): unit form `P14DT16H12M` / `PT0.75M` / `P2.5W` (components may be
 * signed or fractional) or the date-time form `P2012-02-02T14:37:21.545`.
 */
/**
 * Whether a text is a Cypher duration (ISO 8601): unit form `P14DT16H12M` / `PT0.75M` / `P2.5W`
 * (components may be signed or fractional) or the date-time form `P2012-02-02T14:37:21.545`.
 * @param text - the text, trimmed
 * @returns true when it is
 */
function isDuration(text: string): boolean {
    if (DURATION_DATE_TIME.test(text)) {
        return true;
    }
    const m = /^[+-]?P([^T]*)(?:T(.*))?$/i.exec(text);
    const time = m === null ? undefined : itemAt(m, 2);
    if (m === null || time === "" || (m[1] === "" && time === undefined)) {
        return false;
    }
    return unitsInOrder(m[1], "YMWD") && unitsInOrder(time ?? "", "HMS");
}

/** The date-time form of a Cypher duration, `P2012-02-02T14:37:21.545`. */
const DURATION_DATE_TIME = /^[+-]?P\d{4}-?\d{2}-?\d{2}T\d{2}:?\d{2}:?\d{2}(?:\.\d+)?$/i;

/**
 * Whether a run of duration components (`14D`, `-1.5H30M`) names its units in the order given,
 * each at most once.
 * @param text - the components
 * @param units - the unit letters in their order
 * @returns true when it does
 */
function unitsInOrder(text: string, units: string): boolean {
    let rest = text.toUpperCase();
    let from = 0;
    while (rest !== "") {
        const m = /^[-+]?\d+(?:\.\d+)?([A-Z])/.exec(rest);
        const at = m === null ? -1 : units.indexOf(m[1], from);
        if (m === null || at < 0) {
            return false;
        }
        from = at + 1;
        rest = rest.slice(m[0].length);
    }
    return true;
}

/**
 * Check the neo4j-admin types the shared parser maps to a wider dtype: byte and short values within
 * their Java range, a char of one character, a duration in Cypher's syntax.
 * @param spec - the declared type
 * @param value - the parsed value (a list of items for an array type)
 * @param text - the cell text, for the error
 */
function checkNeo4jRange(spec: DeclaredTypeSpec, value: unknown, text: string): void {
    const base = spec.declared.trim().toLowerCase().replace(/\[\]$/, "");
    const items: unknown[] = spec.list && Array.isArray(value) ? value : [value];
    const range = INTEGER_RANGES[base];
    for (const item of items) {
        let bad = false;
        if (range !== undefined) {
            bad = typeof item === "number" && (item < range[0] || item > range[1]);
        } else if (base === "char") {
            // a Java char: one UTF-16 code unit
            bad = typeof item === "string" && item.length !== 1;
        } else if (base === "duration") {
            bad = typeof item === "string" && !isDuration(item.trim());
        }
        if (bad) {
            const span = range === undefined ? "" : ` (${range[0]} to ${range[1]})`;
            throw new GraphFormatError("E_COLUMN_TYPE", `"${text}" is not ${withArticle(base)}${span}`, {
                value: text,
                kind: base,
            });
        }
    }
}

/** The largest finite f32. */
const F32_MAX = 3.4028234663852886e38;

/**
 * Whether a float / double cell overflowed: a finite literal read as an infinity, or a float beyond
 * the f32 range (Java's Double.parseDouble accepts both silently; the value changes).
 * @param spec - the declared type
 * @param value - the parsed value
 * @param text - the cell text
 * @returns true when the stored value is not the one written
 */
function overflows(spec: DeclaredTypeSpec, value: unknown, text: string): boolean {
    if ((spec.kind !== "float" && spec.kind !== "double") || /inf|nan/i.test(text)) {
        return false;
    }
    const items: unknown[] = spec.list && Array.isArray(value) ? value : [value];
    return items.some(
        (v) => typeof v === "number" && (!Number.isFinite(v) || (spec.kind === "float" && Math.abs(v) > F32_MAX)),
    );
}

/**
 * A Cypher date-time with a zone name (`2020-01-01T00:00:00[Europe/Berlin]`) as one with a UTC
 * offset the temporal parser reads: the offset the text gives, else the zone's offset at that wall
 * time. Any other text is returned unchanged.
 * @param text - the cell text
 * @param spec - the declared type
 * @returns the text to parse
 */
function withZoneOffset(text: string, spec: DeclaredTypeSpec): string {
    const trimmed = text.trim();
    const open = trimmed.lastIndexOf("[");
    if (spec.temporal !== "dateTime" || open < 0 || !trimmed.endsWith("]")) {
        return text;
    }
    const local = trimmed.slice(0, open);
    const zone = trimmed.slice(open + 1, -1);
    if (zone === "" || zone.includes("]") || /[\n\r\u2028\u2029]/.test(local)) {
        return text;
    }
    let format: Intl.DateTimeFormat;
    try {
        format = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" });
    } catch {
        throw new GraphFormatError("E_COLUMN_TYPE", `"${text}" names an unknown time zone ${zone}`, { value: text });
    }
    if (/(Z|z|[+-]\d{2}(:?\d{2})?)$/.test(local)) {
        return local;
    }
    const wall = parseTemporal(local, "localDateTime").value;
    const offsetAt = (ms: number): number => {
        const name = format.formatToParts(new Date(ms)).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
        const o = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
        if (o === null) {
            return 0;
        }
        return (o[1] === "-" ? -1 : 1) * (Number(o[2]) * 60 + Number(o[3]));
    };
    // the offset at the instant the wall time names (twice, so a wall time near a transition settles)
    const minutes = offsetAt(wall - offsetAt(wall) * 60_000);
    const sign = minutes < 0 ? "-" : "+";
    const abs = Math.abs(minutes);
    return `${local}${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/**
 * The value of a quoted empty cell: an empty string for a string-kind property, an empty list for
 * a list property, unset for anything else (neo4j-admin's default `--ignore-empty-strings=false`).
 * @param spec - the property's declared type
 * @returns the value, or undefined for unset
 */
function emptyValue(spec: DeclaredTypeSpec): unknown {
    if (spec.list) {
        return [];
    }
    if (spec.kind === "string" || spec.kind === "duration") {
        return "";
    }
    return undefined;
}

/**
 * The header cells grouped by field kind, in cell order.
 * @param fields - the parsed header
 * @returns the cell indices of each kind present
 */
function cellsByKind(fields: readonly HeaderField[]): Map<FieldKind, number[]> {
    const kinds = new Map<FieldKind, number[]>();
    fields.forEach((field, i) => {
        const list = kinds.get(field.kind);
        if (list === undefined) {
            kinds.set(field.kind, [i]);
        } else {
            list.push(i);
        }
    });
    return kinds;
}

/**
 * Check that a header is either a node header or a relationship header, not both or neither.
 * @param fields - the parsed header
 * @param isNode - whether it has an `:ID` cell
 * @param isRelationship - whether it has a `:START_ID` or `:END_ID` cell
 */
function checkSectionShape(fields: readonly HeaderField[], isNode: boolean, isRelationship: boolean): void {
    if (isNode && isRelationship) {
        throw headerError("a header mixes :ID with :START_ID / :END_ID");
    }
    if (isNode || isRelationship) {
        return;
    }
    const apoc = fields.some((f) => f.name === "_id" || f.name === "_start");
    throw headerError(
        apoc
            ? "a header needs an :ID column (nodes) or :START_ID and :END_ID columns (relationships); this is the apoc.export.csv layout (_id, _labels, _start, _end, _type), which is not the neo4j-admin import format"
            : "a header needs an :ID column (nodes) or :START_ID and :END_ID columns (relationships)",
    );
}

/**
 * Check that no two PROPERTY (or stored-id) fields of one header share a name.
 * @param fields - the parsed header
 */
function checkPropertyNames(fields: readonly HeaderField[]): void {
    const seen = new Set<string>();
    for (const field of fields) {
        if (field.name.length === 0 || field.kind === "IGNORE") {
            continue;
        }
        if (seen.has(field.name)) {
            throw headerError(`property "${field.name}" is declared twice`);
        }
        seen.add(field.name);
    }
}

/**
 * The error of a malformed section header.
 * @param reason - why
 * @returns the error
 */
function headerError(reason: string): GraphFormatError {
    return new GraphFormatError("E_UNSUPPORTED", reason, { reason: "header" });
}

/**
 * Confidence that a head of bytes is Neo4j: the first line holds an `:ID`, `:START_ID` or
 * `:END_ID` header cell (neo4j-admin) or APOC's `_id` / `_start` columns (apoc.export.csv), or the
 * head is an apoc.export.json export.
 * @param head - the first bytes of the input
 * @returns 0.95 for a Neo4j header or an APOC export, 0 otherwise
 */
function sniffNeo4j(head: Uint8Array): number {
    const text = new TextDecoder("utf-8", { fatal: false, ignoreBOM: false }).decode(head);
    const end = text.search(/[\r\n]/);
    const first = end < 0 ? text : text.slice(0, end);
    const cells = first.split(/[,;|\t]/);
    const unquoted = cells.map((cell) => cell.trim().replace(/^"(.*)"$/, "$1"));
    return isHeaderRecord(cells, cells.length) || isApocCsvHeader(unquoted) || looksLikeApocJson(text) ? 0.95 : 0;
}

/**
 * The Neo4j importer.
 * @category Built-in formats
 */
export const neo4jImporter: GraphImporter<Neo4jImportOptions> = Object.freeze({
    format: NEO4J,
    options: Object.freeze(["arrayDelimiter", "delimiter", "nodes", "quote", "relationships"]),
    extensions: Object.freeze([".csv", ".tsv"]),
    mimeTypes: Object.freeze(["text/csv", "text/tab-separated-values"]),
    sniff: sniffNeo4j,
    /**
     * Read one or more neo4j-admin CSV inputs into the sink.
     * @param input - the primary input (a node table, a relationship table, or sections of both)
     * @param sink - the sink
     * @param options - format-specific and common options
     * @returns the report; ImportError beyond the error limit or on a malformed header
     */
    async import(
        input: ImportInput,
        sink: GraphSink,
        options?: Neo4jImportOptions & CommonImportOptions,
    ): Promise<ImportReport> {
        const common = resolveImportOptions(options, { ids: "canonical", defaultDirected: true, weightFrom: "weight" });
        const format = resolveNeo4jOptions(options);
        const report = new ImportReportBuilder(NEO4J, common.errorLimit);
        reportSinkOptions(sink, options, report);
        // nodeIdFrom and defaultDirected are among the reported options: Neo4j ids are the :ID
        // column and every relationship is directed
        reportUnusedOptions(options, report, USED_OPTIONS);
        const session = new Neo4jImportSession(sink, report, common, format);
        await session.run([
            { input, kind: null },
            ...format.nodes.map((file) => ({ input: file, kind: "node" as const })),
            ...format.relationships.map((file) => ({ input: file, kind: "relationship" as const })),
        ]);
        if (session.weightProperty !== null) {
            sink.setMeta({ extra: { neo4j: { weightProperty: session.weightProperty } } });
        }
        throwIfAborted(common.signal);
        return report.finish();
    },
});
