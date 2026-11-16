/**
 * @file Version 2 graphty documents (spec/README.md): the wrapper, the section header, element
 * references, the codes, and the contract every section codec implements.
 *
 * Experimental: everything here is reached only with the `save-files-v2` experiment on, and may
 * change until version 2 is released.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { EdgeId, NodeId, RunId } from "../../catalog/types";
import type { CannedOutcomes } from "../projectFile";
import type { CodedFact } from "../shared";
import type { GraphSession, ProjectSlice, TransactionScope } from "../types";

/**
 * A section's name: its key in a full file's `sections`, and `graphty-<name>` is its kind.
 * @experimental save-files-v2
 * @beta
 */
export type DocumentSection = "data" | "style" | "recipe" | "settings" | "results" | "notes" | "view";

/** The sections in the order a full file writes them (spec 1). */
export const DOCUMENT_SECTIONS: readonly DocumentSection[] = Object.freeze([
    "data",
    "style",
    "recipe",
    "settings",
    "results",
    "notes",
    "view",
]);

/**
 * The sections in the order an open applies them: the data first, so every bound section binds to
 * it; results before the recipe and the view, so a saved outcome waits for the run that would
 * otherwise compute it again.
 */
export const APPLY_ORDER: readonly DocumentSection[] = Object.freeze([
    "data",
    "settings",
    "style",
    "results",
    "recipe",
    "view",
    "notes",
]);

/**
 * How a source's rows are kept by a save (spec 4.1.2).
 * @experimental save-files-v2
 * @beta
 */
export type SourceStorage = "embedded" | "referenced";

/** A JSON object as read from or written to a document. */
export type JsonObject = Record<string, unknown>;

/**
 * The codes the version 2 reader and writer report (spec 13) that graphty-element's error and
 * warning codes do not already hold. `E_BAD_DOCUMENT`, `E_UNKNOWN_OPTION`, `W_UNKNOWN_KIND` and
 * `W_UNKNOWN_MEMBER` are already element codes. OPEN UNION while the experiment is on.
 * @experimental save-files-v2
 * @beta
 */

export type DocumentCode =
    | "E_UNKNOWN_COMMAND"
    | "W_SCHEMA_MISMATCH"
    | "W_SECTION_KEPT"
    | "W_EXTENSION_REQUIRED"
    | "W_SECTION_UPGRADED"
    | "W_ELEMENT_NAMING_LEFT_OUT"
    | "W_SOURCE_NO_PATH"
    | "W_SOURCE_UNAVAILABLE"
    | "W_REFERENCE_UNBOUND"
    | "W_DATA_CHANGED"
    | "W_DATA_MISMATCH"
    | "W_JOIN_HISTORY_DIFFERS"
    | "W_CAMERA_CONTROLLER_UNKNOWN"
    | "W_RUN_NOT_RUN"
    | "W_RESULTS_DIFFER"
    | "W_EDGE_MATCH_AMBIGUOUS"
    | "W_SOURCE_UNKEYED"
    | "W_NODE_NAMED_ONLY"
    | "W_EDGE_END_MISSING"
    | "W_COLUMN_WIDENED"
    | "W_MEMBER_LEFT_OUT"
    | "W_RECIPE_NOT_APPLIED";

/**
 * One report entry of a version 2 save or open: a code and plain values (spec 13). A reference
 * or another object goes in a param as its canonical JSON text, since a param holds plain values.
 */
export type DocumentProblem = CodedFact<
    DocumentCode | "E_BAD_DOCUMENT" | "E_FEATURE_OFF" | "E_UNKNOWN_OPTION" | "W_UNKNOWN_KIND" | "W_UNKNOWN_MEMBER"
>;

/** `generator`: the software that wrote a section or a file (spec 3.1). */
interface Generator {
    readonly name: string;
    readonly version: string;
}

/** `bindsTo`: which data a bound section was written on (spec 6.4). */
export interface BindsTo {
    readonly data: string;
}

/** The members every section begins with, in the order a writer writes them (spec 3). */
export const HEADER_MEMBERS = Object.freeze([
    "$schema",
    "kind",
    "version",
    "id",
    "name",
    "description",
    "created",
    "modified",
    "generator",
    "authors",
    "license",
    "keywords",
    "language",
    "dependencies",
    "bindsTo",
    "origin",
    "extensions",
] as const);

/** A section's header, as read (unchecked beyond `kind` and `version`). */
export interface SectionHeader {
    readonly $schema?: string;
    readonly kind: string;
    readonly version: number;
    readonly id?: string;
    readonly name?: string;
    readonly description?: string;
    readonly created?: string;
    readonly modified?: string;
    readonly generator?: Generator;
    readonly authors?: readonly JsonObject[];
    readonly license?: string;
    readonly keywords?: readonly string[];
    readonly language?: string;
    readonly dependencies?: JsonObject;
    readonly bindsTo?: BindsTo;
    readonly origin?: JsonObject;
    readonly extensions?: JsonObject;
}

/**
 * The header members a codec may write. The framing writes the rest: `$schema`, `kind`,
 * `version`, `created`, `modified`, `generator`, `bindsTo` (for a bound section), the data
 * section's `id`, and the `extensions` the section was read with.
 */
export type SectionHeaderInput = Partial<
    Pick<
        SectionHeader,
        "id" | "name" | "description" | "authors" | "license" | "keywords" | "language" | "dependencies" | "origin"
    >
>;

/** A node's record key (spec 6.1, 6.2). */
export interface NodeRef {
    readonly space: string;
    readonly key: string;
}

/**
 * An edge reference (spec 6.2): `load` the source whose row made the edge, `key` its edge-id value,
 * a reader-added edge's edge-id value or, with none, a minted ULID, or `<copy id>#<row from 0>` for a keyless row.
 */
export interface EdgeRef {
    readonly load: string;
    readonly key: string;
}

/**
 * Element references for the open data (spec 6): from the session's ids to references, and back.
 * Built from the session as it is when asked; a reference that binds nowhere gives undefined, and
 * the caller keeps it and reports `W_REFERENCE_UNBOUND`.
 */
export interface ElementRefs {
    /** The reference of a node, or undefined for an id the graph does not hold. */
    nodeRef(id: NodeId): NodeRef | undefined;
    /** The reference of an edge, or undefined for an id the graph does not hold. */
    edgeRef(id: EdgeId): EdgeRef | undefined;
    /** The node a reference binds to; accepts anything a file holds. */
    node(ref: unknown): NodeId | undefined;
    /** The edge a reference binds to; accepts anything a file holds. */
    edge(ref: unknown): EdgeId | undefined;
}

/** A section as an open hands it to its codec: its header and the rest, checked by the framing. */
export interface ReadSection {
    readonly header: SectionHeader;
    /** Every member that is not a header member, in file order, the unknown ones included. */
    readonly body: Readonly<JsonObject>;
    /** A JSON pointer to the section in its file: `""` in a section file, `/sections/<key>` in a full file. */
    readonly pointer: string;
}

/** What a codec writes: the header members it owns and its body, in the order to write them. */
export interface SectionWrite {
    readonly header?: SectionHeaderInput;
    readonly body: Readonly<JsonObject>;
}

/** What the session lends every codec. */
interface CodecContext {
    readonly session: GraphSession;
    /** Collects the reports a codec makes; never thrown. */
    readonly problems: DocumentProblem[];
    /** Element references for the data open now. Built once per call and reused. */
    refs(): ElementRefs;
    /** The open data's id (`bindsTo.data`), or undefined when there is no data. */
    dataId(): string | undefined;
    /** Every section this save writes, or this open loads. */
    readonly sections: ReadonlySet<DocumentSection>;
    /**
     * The open data's build stamp and each available source's copy id, as a results run's
     * `bindsTo` records them (spec 6.4), or undefined when there is no data.
     */
    buildStamp?(): Promise<BuildStamp | undefined>;
}

/** A results run's `bindsTo`: the data's build stamp and each available source's copy id (spec 6.4). */
export interface BuildStamp {
    readonly build: string;
    readonly sources: Readonly<Record<string, string>>;
}

/** What a codec's `write` is given. */
export interface WriteContext extends CodecContext {
    /** The saver's choice per source id; a source with no entry is embedded. */
    readonly embed: Readonly<Record<string, SourceStorage>>;
    /** Write the recipe from the session even when one was opened from a file (spec 8.1 rule 5). Default false. */
    readonly rewriteRecipe?: boolean;
    /** Whether a run's id was minted by the element (its namespace is the element's own). */
    isDerived(id: RunId): boolean;
    /** The `bindsTo` of a bound section: `{ data }` alone; a results run carries its own build stamp. */
    bindsTo(): Promise<BindsTo | undefined>;
}

/** What a codec's `read` is given. */
export interface ReadContext extends CodecContext {
    /** The open's one transaction: every change a codec makes goes through it, as one step. */
    readonly tx: TransactionScope;
    /** Whether the behaviors rerun (spec 8.4). Default true. */
    readonly rerun: boolean;
    /** Apply a recipe section to the data (spec 8.2 rule 4); otherwise it is only kept. Default false. */
    readonly applyRecipe?: boolean;
    /** The caller's rerun choice for one run (spec 8.2 rule 3); `rerun` when absent or undefined. */
    rerunOf?(id: RunId): boolean | undefined;
    /** Whether a data section replaces the open data or is added as another source (spec 8.2). */
    readonly dataMode: "replace" | "add";
    /** Collects the parts of the session that came back. */
    readonly restored: Set<ProjectSlice>;
    /**
     * Another section of the same open, as its codec will be handed it, when it loads too: the
     * data reads the recipe to compare join histories, results read the recipe and the view to
     * match runs.
     */
    other(section: DocumentSection): ReadSection | undefined;
    /**
     * Saved run outcomes by run id, waiting for the run an open starts, so it is not computed
     * again: the results codec fills it when rerun is off, and the recipe and view codecs start
     * the runs that take them.
     */
    readonly canned: CannedOutcomes;
    /** Mark a restored run's id as minted by the element. */
    restoreDerived(id: RunId): void;
}

/**
 * The contract every section codec implements. One codec per section, registered in
 * `registry.ts`. A codec never writes the header members the framing owns, never reads `$schema`,
 * and never reports a member the framing already reported. It throws only for a defect: what a
 * file holds that cannot be read is a problem in `context.problems`.
 */
export interface SectionCodec {
    /** The section this codec reads and writes. */
    readonly section: DocumentSection;
    /** The version it writes (spec 9). */
    readonly version: number;
    /** The versions it reads. Older ones it upgrades itself and reports `W_SECTION_UPGRADED`. */
    readonly reads: readonly number[];
    /** Whether the section is dataset-bound: the framing writes `bindsTo` and checks it on open. */
    readonly bound: boolean;
    /**
     * The body members this version knows. The framing reports any other top-level member as
     * `W_UNKNOWN_MEMBER`, keeps it, and writes it back after the body on the next save.
     */
    readonly members: readonly string[];
    /**
     * Write the section from the session.
     * @param context - The session and what the save chose.
     * @returns The header members the codec owns and the body.
     */
    write(context: WriteContext): Promise<SectionWrite>;
    /**
     * Apply the section to the session, inside the open's transaction.
     * @param section - The section as read.
     * @param context - The session, the transaction and what the open chose.
     */
    read(section: ReadSection, context: ReadContext): Promise<void>;
    /**
     * Whether a section this codec reads cannot be applied whole, checked when the file is read,
     * before anything is applied: the framing then holds it (reason `data`) instead of loading it.
     * Optional; a codec without it applies every section it reads.
     * @param section - The section as read.
     * @param problems - Collects what the check reports.
     * @returns True to hold the section.
     */
    holds?(section: ReadSection, problems: DocumentProblem[]): boolean;
}

/** The codecs an open or a save uses, by section. */
export type CodecRegistry = Readonly<Partial<Record<DocumentSection, SectionCodec>>>;
