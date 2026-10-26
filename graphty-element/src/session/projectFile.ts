/**
 * @file The project file: the whole session saved as one graphty document, and opened again.
 *
 * A project file is a `graphty-document` (design/documents/container.md) holding every member:
 * the data (`graphty-data`), the settings, layout, filter, sets and views (`graphty-session`),
 * where each node stands (`graphty-arrangement`), every finished run with its result as columns
 * (`graphty-results`), the style layers (`graphty-style`), the notes (`graphty-notes`) and the
 * selection (`graphty-view-state`, never required to open the file), and the model files a layer
 * names (`graphty-assets`, required when present). A saved run is not computed
 * again on open: its result is handed to the run in place of the work.
 *
 * Nothing here writes words for a reader. Every problem is a code and its values.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: the session entry point reaches it.
 */

import {
    type EdgeId,
    type FieldDescriptor,
    type NodeId,
    PROJECT_FILE,
    type ResultShape,
    type RunId,
    type SetDefinitionInput,
} from "../catalog/types";
import { DEFAULT_SELECTION_STYLE } from "../config/GraphStyle";
import { type GraphtyErrorCode, type GraphtyWarningCode } from "../errors/codes";
import { GraphtyError, isGraphtyError } from "../errors/GraphtyError";
import { ASSETS_MEMBER, assetsMember, restoreAssets, withAcceptedAssetIds } from "./assets/projectMember";
import { projectBoundary } from "./project/boundary";
import type { Dispatcher, TransactionOptions } from "./project/Dispatcher";
import { createRunResult, type ResultElementValues } from "./results/RunResult";
import { type Caveats, ENGINE_VERSIONS, type RunExecutionContext, type RunExecutor, type RunOutcome } from "./runs";
import { edgeSpaceOf } from "./scope/spaces";
import type { CodedFact } from "./shared";
import { SOURCE_RECORD_MEMBER } from "./sources/ids";
import {
    asFileStyleStore,
    FILE_STYLES_VALUE,
    type FileStyleLoadValues,
    fileStyleValuesOf,
} from "./styles/fileStyles/store";
import type {
    DataSourceInput,
    GraphSession,
    LoadDraft,
    LoadedSource,
    ProjectConfigPatch,
    ProjectSlice,
    TransactionScope,
} from "./types";
import { valueLabelOf } from "./valueLabels";

/** The container's `kind`. */
const DOCUMENT_KIND = "graphty-document";

/** The container version, and the version of every member kind, this element reads and writes. */
const VERSION = 1;

/** The largest file `open` reads unless told otherwise: 256 MiB. */
const DEFAULT_FILE_BYTES = 256 * 1024 * 1024;

/** The deepest nesting `open` reads. */
const MAX_DEPTH = 64;

/** The largest value one extension may hold, as JSON text. */
const MAX_EXTENSION_BYTES = 64 * 1024;

/** The member kinds a project file writes, in the order it writes them. */
const MEMBER_KINDS = [
    "graphty-data",
    "graphty-session",
    "graphty-arrangement",
    "graphty-results",
    "graphty-style",
    "graphty-notes",
    "graphty-view-state",
    "graphty-assets",
    // Experimental: the loads from network sources (design/graph-io/network-sources-design.md 16.1).
    "graphty-sources",
] as const;

/** One of the member kinds a project file writes. */
type MemberKind = (typeof MEMBER_KINDS)[number];

/** The members a reader cannot open the file correctly without. */
const REQUIRED: readonly MemberKind[] = ["graphty-data", "graphty-session", "graphty-results"];

/**
 * The `requires` of a document holding these members: the assets member joins the members every
 * project requires when there is one, because its layers would draw without their models.
 * @param members - The members.
 * @returns The kinds.
 */
export function requiresOf(members: readonly Record<string, unknown>[]): readonly string[] {
    return members.some((member) => member.kind === ASSETS_MEMBER) ? [...REQUIRED, ASSETS_MEMBER] : REQUIRED;
}

/** A member kind's form: `graphty-` and a name, or a reverse-domain name. */
const MEMBER_KIND_FORM = /^(graphty-[a-z][a-z0-9-]*|[a-z0-9-]+(\.[a-z0-9-]+)+)$/i;

/** An extension's name: reverse-domain, and not one graphty-element reserves. */
const EXTENSION_NAME = /^(?!graphty(\.|$))[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

/**
 * Something about a save or an open, as a code and the values it is about.
 *
 * The codes are the element's error and warning codes. The params a project problem may carry:
 * `slice` (the {@link ProjectSlice} it concerns), `id` (the run, layer or set), `index` (the
 * member's position in the file), `kind` (the member's kind), `found` (a version), `needs` (the
 * paths a layer reads that nothing answers) and `pointer` (a JSON pointer inside a member).
 */
export type ProjectProblem = CodedFact<GraphtyErrorCode | GraphtyWarningCode>;

/** How `project.save` writes the file. */
export interface ProjectSaveOptions {
    /** Members to leave out of the file. Default: none. */
    readonly leaveOut?: readonly ("graphty-style" | "graphty-notes" | "graphty-view-state")[];
    /**
     * Your own data to store in the file, under reverse-domain names (`"com.example.app"`), at
     * most 64 KB of JSON each. `open` hands them back untouched. Names starting `graphty` are
     * reserved.
     */
    readonly extensions?: Readonly<Record<string, unknown>>;
    /**
     * Whether the save clears `dirty` at once. Pass `false` when you write the file yourself,
     * then call `project.markSaved(saved)` once the write succeeded: a failed write leaves the
     * project dirty, and so does any change made while the write was under way. Default `true`.
     */
    readonly markSaved?: boolean;
    /**
     * How to keep each model or picture a layer names by URL, by that URL: `"embed"` writes its
     * files into the project (the default), so it opens offline; `"url"` writes only the URL and
     * the file's digest, so the file is fetched again when the project opens (after the reader
     * allows it) and reported with `W_MODEL_CHANGED` when it is no longer the same file.
     * `session.assets.list()` gives each asset's `url`.
     */
    readonly assets?: Readonly<Record<string, "embed" | "url">>;
}

/** What the session lends the project file for the loads from network sources. */
interface NetworkSourceRecords {
    /**
     * The `graphty-sources` member to write.
     * @returns it, or null when nothing was loaded from a source
     */
    member(): unknown;
    /**
     * Take an opened project's member; its loads wait until they are run.
     * @param member - the member, or undefined when the file holds none
     */
    restore(member: unknown): void;
}

/** Where the project was last saved: a history step, and whether that step has changed since. */
interface SavePoint {
    step: string | null;
    lost: boolean;
    /** Later saves have larger numbers, so an older save never replaces a newer one. */
    readonly seq: number;
}

/** What `project.save` wrote. */
export interface ProjectSaveReport {
    /** The file's size in bytes, as UTF-8. */
    readonly bytes: number;
    /** The member kinds written, in file order. */
    readonly written: readonly string[];
    /**
     * What the element could not write, as codes: a run still computing is `W_RUN_PENDING` with
     * its `id`. What you chose to leave out with the `leaveOut` option is not listed here.
     */
    readonly leftOut: readonly ProjectProblem[];
}

/** The file `project.save` produced. */
export interface SavedProject {
    /** The file's text: a graphty document, to be saved as `<name>.graphty.json`. */
    readonly text: string;
    readonly report: ProjectSaveReport;
}

/** How `project.open` reads a file. */
export interface ProjectOpenOptions {
    /**
     * Discard the session's unsaved changes: open a project over them. Without it, opening a project while
     * `project.dirty` is true is refused with `E_UNSAVED_CHANGES`.
     */
    readonly discard?: boolean;
    /** The file's name, for the project's name when the file holds none. A `File`'s own name is used otherwise. */
    readonly fileName?: string;
    /**
     * For a document that is not a project: `"step"` (the default) adds its contents as one
     * undoable step; `"start"` makes the session after it where the history starts, as
     * `ImportOptions.history` does for a load. A project always starts the history.
     */
    readonly history?: "step" | "start";
    readonly limits?: {
        /** The largest file to read, in bytes. Default 256 MiB. */
        readonly fileBytes?: number;
    };
}

/** What `project.open` did. Frozen. */
export interface ProjectOpenReport {
    /**
     * What the file was: `"project"` (it holds a `graphty-session` member, and replaced the
     * session), `"document"` (a graphty document that is not a project, such as a saved style
     * or notes, whose contents were added to the session) or `"graph"` (a data file -- CSV,
     * GraphML, GML, any format `session.data.import` reads -- read into {@link draft} and not
     * loaded yet).
     *
     * OPEN UNION: later releases add values.
     */
    readonly opened: "project" | "document" | "graph";
    /**
     * The load draft a data file was read into, when `opened` is `"graph"`: what
     * `session.data.prepare` returns for the file. Nothing is in the graph until `draft.load()`.
     */
    readonly draft?: LoadDraft;
    /** The project's name after the open. */
    readonly name: string | null;
    /** The parts of the project that came back. */
    readonly restored: readonly ProjectSlice[];
    /** Every part that did not come back, or came back changed. Empty when everything did. */
    readonly problems: readonly ProjectProblem[];
    /** The file's extensions, untouched. */
    readonly extensions: Readonly<Record<string, unknown>>;
}

/**
 * Published as `project:status` whenever the project's name or `dirty` changes, and mirrored on the
 * element as `graphty-project-status`. Nothing is published at startup.
 */
export interface ProjectStatus {
    readonly name: string | null;
    readonly dirty: boolean;
}

/** What `open` reads: a `File` or other `Blob`, the file's bytes, or its text (never an address). */
export type ProjectSource = Blob | Uint8Array | string;

/** Saving the whole session to one file, and opening one again. */
export interface ProjectApi {
    /** The project's name: from the file it was opened from, or `rename`. Null until one is given. */
    readonly name: string | null;
    /**
     * The project's identity: an opaque string that a save writes and an open reads back, so a
     * copy of the file is the same project. A new session, and a file that holds none, get a fresh
     * random one. It carries no permission: key the reader's own choices about a project by it
     * (`session.network.setProjectHosts`), kept on the reader's machine.
     */
    readonly id: string;
    /**
     * Whether anything the file saves has changed since the last save or open. Undoing back to
     * that point makes it false again. The selection and the extensions never set it. The first
     * `data.import` into a new session -- one with no history that was never saved or opened --
     * is the starting point, so a graph read from a file or a sample is not an unsaved change;
     * undoing that import sets it. Any later import sets it, like any other change.
     */
    readonly dirty: boolean;
    /**
     * Rename the project. One undoable step, which sets `dirty`.
     * @param name - The name, at most 256 characters; blank or null clears it.
     * @returns Settles once the step is recorded.
     */
    rename(name: string | null): Promise<void>;
    /**
     * Save the whole session as a graphty document. Clears `dirty`, unless `markSaved` is false.
     * @param options - What to leave out, and your own extensions.
     * @returns The file's text, and what it holds.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` for an extension name that
     *     is not reverse-domain or a value over 64 KB.
     */
    save(options?: ProjectSaveOptions): Promise<SavedProject>;
    /**
     * Record that a file `save({ markSaved: false })` produced has been written. `dirty` clears
     * unless something changed since that save, and undo returns to it as the save point.
     *
     * Marking a save older than the last one marked, or than the last open, does nothing, and so
     * does marking one twice or one `save` already marked.
     * @param saved - What `save` returned.
     * @example
     * ```typescript
     * const saved = await session.project.save({ markSaved: false });
     * await writable.write(saved.text); // a failed write throws, and the project stays dirty
     * await writable.close();
     * session.project.markSaved(saved);
     * ```
     */
    markSaved(saved: SavedProject): void;
    /**
     * Open a graphty document or a data file: the one intake verb for an "Open..." door, so the
     * caller never decides what a file is. A project replaces the session, with a fresh history;
     * any other graphty document (a style, notes) is added as one undoable step; a data file is
     * read into a load draft (`opened: "graph"`, `draft`), as `session.data.prepare` reads it,
     * and loads when the caller calls `draft.load()`.
     * @param source - The file, its bytes, or its text. Never a URL: nothing is fetched.
     * @param options - Whether to discard unsaved changes, the file's name, the size limit.
     * @returns What came back and what did not.
     * @throws A `GraphtyError` (as a rejection), leaving the session as it was:
     *     `E_UNSAVED_CHANGES` for a project over unsaved changes without `discard`, `E_TOO_LARGE`
     *     past the size limit, the codes `session.data.prepare` refuses a data file with
     *     (`E_UNKNOWN_FORMAT` for a file no format reads, `E_PARSE_FAILED` for one its format
     *     cannot read), `E_UNKNOWN_FORMAT` for embedded data in a dialect other than node-link,
     *     `E_BAD_DOCUMENT` for a malformed document, `E_UNSUPPORTED_VERSION` for a newer one, and
     *     `E_UNSUPPORTED` for one that requires a member kind this element does not read.
     */
    open(source: ProjectSource, options?: ProjectOpenOptions): Promise<ProjectOpenReport>;
}

/**
 * Results waiting to be handed to the runs a project open starts, by run id, so a reopened run is
 * not computed again.
 */
export type CannedOutcomes = Map<RunId, RunOutcome>;

/**
 * An executor that answers a run from {@link CannedOutcomes} when one waits for it.
 * @param execute - The executor that does the work otherwise.
 * @param canned - The waiting results.
 * @returns The executor.
 */
export function answeringFromProject(execute: RunExecutor, canned: CannedOutcomes): RunExecutor {
    return (context: RunExecutionContext) => {
        const outcome = canned.get(context.runId);
        if (outcome === undefined) {
            return execute(context);
        }

        canned.delete(context.runId);
        return Promise.resolve(outcome);
    };
}

// ---------------------------------------------------------------------------------------------
// Columns: numbers as little-endian bytes in base64, so Infinity and NaN survive; else JSON
// ---------------------------------------------------------------------------------------------

/** A column as a file holds it. */
type SavedColumn =
    | { readonly dtype: "f64" | "f32" | "i32" | "u8"; readonly data: string; readonly absent?: readonly number[] }
    | readonly unknown[];

/** Bytes per value, and the reader, of each dtype. */
const DTYPES: Readonly<Record<string, readonly [number, (view: DataView, at: number) => number]>> = {
    f64: [8, (view, at) => view.getFloat64(at, true)],
    f32: [4, (view, at) => view.getFloat32(at, true)],
    i32: [4, (view, at) => view.getInt32(at, true)],
    u8: [1, (view, at) => view.getUint8(at)],
};

/**
 * A column as a file holds it: an all-number column (gaps aside) as f64 bytes, any other as JSON.
 * @param values - One value per row; null or undefined for none.
 * @returns The column.
 */
function encodeColumn(values: readonly unknown[]): SavedColumn {
    const absent: number[] = [];
    let numbers = true;
    values.forEach((value, at) => {
        if (value === null || value === undefined) {
            absent.push(at);
        } else if (typeof value !== "number") {
            numbers = false;
        }
    });
    if (!numbers || absent.length === values.length) {
        return values.map((value) => value ?? null);
    }

    const view = new DataView(new ArrayBuffer(values.length * 8));
    values.forEach((value, at) => {
        view.setFloat64(at * 8, typeof value === "number" ? value : 0, true);
    });
    let binary = "";
    const bytes = new Uint8Array(view.buffer);
    for (let at = 0; at < bytes.length; at += 0x8000) {
        binary += String.fromCodePoint(...bytes.subarray(at, at + 0x8000));
    }

    return { dtype: "f64", data: btoa(binary), ...(absent.length === 0 ? {} : { absent }) };
}

/**
 * Set the rows a column lists as absent to null, ignoring an index outside the column.
 * @param values - The column's values.
 * @param absent - The rows the file lists as having no value.
 */
function markAbsent(values: unknown[], absent: unknown): void {
    for (const at of Array.isArray(absent) ? (absent as unknown[]) : []) {
        if (Number.isInteger(at) && (at as number) >= 0 && (at as number) < values.length) {
            values[at as number] = null;
        }
    }
}

/**
 * A column read back, one value per row; null where a row has none.
 * @param column - The column as the file holds it.
 * @param length - How many rows it must have.
 * @returns The values.
 * @throws A `GraphtyError` with `E_BAD_DOCUMENT` for a column of the wrong shape or length.
 */
function decodeColumn(column: unknown, length: number): unknown[] {
    if (Array.isArray(column) && column.length === length) {
        return column as unknown[];
    }

    const held = column as { dtype?: unknown; data?: unknown; absent?: unknown } | null;
    const reader = typeof held?.dtype === "string" ? DTYPES[held.dtype] : undefined;
    if (reader !== undefined && typeof held?.data === "string") {
        const binary = atob(held.data);
        const [width, read] = reader;
        if (binary.length === length * width) {
            const view = new DataView(Uint8Array.from(binary, (char) => char.codePointAt(0) ?? 0).buffer);
            const values: unknown[] = Array.from({ length }, (_, at) => read(view, at * width));
            markAbsent(values, held.absent);
            return values;
        }
    }

    throw badDocument({ length });
}

/**
 * The error for content that is not what a project file holds.
 * @param details - What names the problem.
 * @returns The error.
 */
function badDocument(details: Readonly<Record<string, unknown>> = {}): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_DOCUMENT",
        message: "This is not a readable graphty document.",
        source: "data",
        details,
    });
}

// ---------------------------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------------------------

/**
 * One column per field the rows carry.
 * @param rows - Each row's values; undefined for a row with none.
 * @returns The columns by field.
 */
function columns(rows: readonly (Readonly<Record<string, unknown>> | undefined)[]): Record<string, SavedColumn> {
    const fields = new Set(rows.flatMap((row) => (row === undefined ? [] : Object.keys(row))));
    return Object.fromEntries([...fields].map((field) => [field, encodeColumn(rows.map((row) => row?.[field]))]));
}

/**
 * The project settings worth saving: everything but who is writing, which belongs to the person,
 * and the name, which the document carries.
 * @param session - The session.
 * @returns The settings as a patch.
 */
function configOf(session: GraphSession): ProjectConfigPatch {
    const { data, runAlgorithmsOnLoad, background, selectionStyle, layoutBehavior } = session.config;
    // Through JSON text, so the settings hold only what the saved file can: no undefined values.
    const text = JSON.stringify({
        data: { algorithms: data.algorithms, directed: data.directed, knownFields: data.knownFields },
        runAlgorithmsOnLoad,
        background,
        selectionStyle,
        layoutBehavior,
    });
    const config = JSON.parse(text) as Record<string, unknown>;
    for (const [group, leaf, fallback] of ADDED_SETTINGS) {
        const parent = parentOf(config, group);
        if (parent !== undefined && JSON.stringify(parent[leaf]) === JSON.stringify(fallback)) {
            Reflect.deleteProperty(parent, leaf);
        }
    }

    return config;
}

/**
 * The settings added after the first project files, with their defaults. Each is written only when
 * it is not its default, so a project that does not use it saves as before and an older
 * graphty-element, which refuses every setting of a file when one is unknown to it, still opens it
 * (test/lifecycle/production-compat.test.ts opens the candidate's file with production's build).
 * One left out reads back as its default.
 * A new setting goes here.
 */
const ADDED_SETTINGS: readonly (readonly [group: readonly string[], leaf: string, fallback: unknown])[] = [
    [["data", "knownFields"], "edgeWeightMeaning", null],
    [["selectionStyle"], "edgeColor", DEFAULT_SELECTION_STYLE.edgeColor],
    [["selectionStyle"], "edgeScale", DEFAULT_SELECTION_STYLE.edgeScale],
    [["selectionStyle"], "edgeOpacity", DEFAULT_SELECTION_STYLE.edgeOpacity],
];

/**
 * The object holding a setting.
 * @param config - The settings.
 * @param group - The path to the object holding the setting.
 * @returns The object, or undefined when one on the way is missing.
 */
function parentOf(config: Record<string, unknown>, group: readonly string[]): Record<string, unknown> | undefined {
    let at = config;
    for (const key of group) {
        if (!isObject(at[key])) {
            return undefined;
        }
        at = at[key];
    }

    return at;
}

/**
 * A file's settings with every added setting it leaves out set to its default, where the file
 * holds the setting's group (a file without `selectionStyle` leaves the session's as it was).
 * @param saved - The settings as the file holds them.
 * @returns A copy with the defaults filled in.
 */
function withAddedDefaults(saved: unknown): Record<string, unknown> {
    const config = isObject(saved) ? structuredClone(saved) : {};
    for (const [group, leaf, fallback] of ADDED_SETTINGS) {
        const parent = parentOf(config, group);
        if (parent !== undefined && !(leaf in parent)) {
            parent[leaf] = fallback;
        }
    }

    return config;
}

/**
 * Check the caller's extensions.
 * @param extensions - The extensions.
 * @returns A JSON copy of them.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` for a reserved or malformed name, or a value too large.
 */
function checkedExtensions(extensions: Readonly<Record<string, unknown>>): Record<string, unknown> {
    const copy: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(extensions)) {
        const text = JSON.stringify(value) as string | undefined;
        if (
            !EXTENSION_NAME.test(name) ||
            text === undefined ||
            new TextEncoder().encode(text).length > MAX_EXTENSION_BYTES
        ) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `The extension "${name}" needs a reverse-domain name not starting "graphty", and a JSON value of at most 64 KB.`,
                source: "data",
                details: { extension: name, limit: MAX_EXTENSION_BYTES },
            });
        }

        copy[name] = JSON.parse(text);
    }

    return copy;
}

/** What the member builders read: the session, its dispatcher, and which run ids the element minted. */
export interface ProjectSources {
    readonly session: GraphSession;
    /** The dispatcher, whose `runs` slice holds each finished run's command. */
    readonly dispatcher: Dispatcher;
    /** Whether the element minted a run's id. */
    readonly isDerived: (id: RunId) => boolean;
}

/**
 * The node and edge ids every member but the data names, in the graph's order. Read from the
 * snapshot and the store's edge ids, never from `session.data.nodes()` or `edges()`, whose frozen
 * records cost most of a save: only the data member pays for them.
 */
export interface GraphIds {
    readonly nodes: readonly NodeId[];
    readonly edges: readonly EdgeId[];
}

/**
 * The graph's node and edge ids, in the order the data member lists the records.
 * @param session - The session.
 * @returns The ids.
 */
export function graphIdsOf(session: GraphSession): GraphIds {
    const snapshot = session.data.snapshot();
    const space = edgeSpaceOf(snapshot);
    return {
        nodes: snapshot.ids.toArray(),
        edges: Array.from({ length: snapshot.edgeCount }, (_unused, at) => space.idOf(at)),
    };
}

/** The version of the column declarations the session member carries. */
const DECLARATIONS_VERSION = 1;

/**
 * The `graphty-data` member: the records, the direction and the source. The only builder that
 * reads the records.
 * @param session - The session.
 * @returns The member.
 */
export function dataMember(session: GraphSession): Record<string, unknown> {
    const nodes = session.data.nodes();
    const edges = session.data.edges();
    // Where the graph was loaded from, and what the reader named it: not the rows, which are here.
    const source = session.data.source();
    const sources = session.data.sources();
    return {
        kind: "graphty-data",
        version: VERSION,
        format: "json",
        dialect: "node-link",
        // The node-link convention's `directed` key, written only once something settled the
        // direction, so a graph nobody described still opens with nothing said.
        graph: {
            ...(session.data.store.directionSettledBy.by === "unsettled" ? {} : { directed: session.status.directed }),
            nodes,
            links: edges.map(({ id: _id, ...edge }) => edge),
        },
        ...(source === null ? {} : { source }),
        ...(sources.length === 0 ? {} : { sources }),
    };
}

/**
 * The `graphty-session` member: the settings, layout, filter, sets, views and, when any column
 * was declared, what each declared column measures (a field with its own version, so a file
 * without it still opens).
 * @param sources - The session and its dispatcher.
 * @param ids - The graph's ids, or a function that reads them (called only when a file-style load
 * holds an edge column).
 * @returns The member.
 */
export function sessionMember(sources: ProjectSources, ids: GraphIds | (() => GraphIds)): Record<string, unknown> {
    const { session, dispatcher } = sources;
    // The file-style values, an edge named by its position in the data as a run's edges are. The
    // edge ids are read only when a load holds an edge column, as for the view state.
    let edgeAt: Map<EdgeId, number> | undefined;
    const indexOf = (edge: EdgeId): number => {
        edgeAt ??= new Map((typeof ids === "function" ? ids() : ids).edges.map((id, at) => [id, at]));
        return edgeAt.get(edge) ?? -1;
    };
    const fileStyles = fileStyleValuesOf(asFileStyleStore(dispatcher.state.graph.values.get(FILE_STYLES_VALUE))).map(
        (load) => ({
            ...load,
            columns: load.columns.map((column) =>
                column.kind === "node" ? column : { ...column, ids: column.ids.map((id) => indexOf(id as EdgeId)) },
            ),
        }),
    );
    const { layout, visibility } = session;
    const columns = [...dispatcher.state.attributes].map(([key, declaration]) => {
        const split = key.indexOf(":");
        return { kind: key.slice(0, split), name: key.slice(split + 1), ...declaration };
    });
    return {
        kind: "graphty-session",
        version: VERSION,
        id: session.project.id,
        config: configOf(session),
        layout: { id: layout.id, engine: layout.engine, options: layout.options, dimension: layout.dimension },
        visibility: {
            filter: visibility.filter,
            window: visibility.window,
            showContext: visibility.showContext,
            // Written only when there are steps, so a project without them saves as before.
            ...(visibility.steps.length === 0 ? {} : { steps: visibility.steps }),
        },
        sets: session.sets.list().map((set) => ({ id: set.id, name: set.name, definition: set.definition })),
        views: [...session.views].map(([name, camera]) => ({ name, camera })),
        // Written only when a value is named, so a project without names saves as before.
        ...(dispatcher.state.valueLabels.size === 0
            ? {}
            : {
                  valueLabels: [...dispatcher.state.valueLabels].map(([key, label]) => ({
                      ...valueLabelOf(key),
                      label,
                  })),
              }),
        ...(columns.length === 0 ? {} : { declarations: { version: DECLARATIONS_VERSION, columns } }),
        // Additive: a file with no file styles writes nothing here, and an older file opens unchanged.
        ...(fileStyles.length === 0 ? {} : { fileStyles }),
    };
}

/**
 * The `graphty-arrangement` member: where each placed node stands, and which are pinned.
 * @param session - The session.
 * @param ids - The graph's ids.
 * @returns The member.
 */
export function arrangementMember(session: GraphSession, ids: GraphIds): Record<string, unknown> {
    const placed: NodeId[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    const at = { x: 0, y: 0, z: 0 };
    ids.nodes.forEach((id, index) => {
        if (session.positions.isPlaced(index)) {
            session.positions.read(index, at);
            placed.push(id);
            xs.push(at.x);
            ys.push(at.y);
            zs.push(at.z);
        }
    });

    return {
        kind: "graphty-arrangement",
        version: VERSION,
        ids: placed,
        x: encodeColumn(xs),
        y: encodeColumn(ys),
        z: encodeColumn(zs),
        pins: [...session.positions.pinned],
    };
}

/**
 * One finished run as the results member keeps it: its command, its result as columns.
 * @param sources - The session and its dispatcher.
 * @param id - The run.
 * @param ids - The graph's ids.
 * @returns The run, or undefined for one that has not finished.
 */
export function runEntry(sources: ProjectSources, id: RunId, ids: GraphIds): Record<string, unknown> | undefined {
    const entry = sources.dispatcher.state.runs.get(id);
    if (entry === undefined) {
        return undefined;
    }

    const { result } = entry;
    const { op: _op, as: _as, applySuggestedStyles: _style, restoreLayer: _restore, ...command } = entry.command;
    const nodeColumn: NodeId[] = [];
    const nodeValues: Readonly<Record<string, unknown>>[] = [];
    for (const node of ids.nodes) {
        const values = result.node(node);
        if (values !== undefined) {
            nodeColumn.push(node);
            nodeValues.push(values);
        }
    }

    return {
        id,
        derived: sources.isDerived(id),
        ...command,
        shape: result.shape,
        fields: result.fields,
        measured: result.measured,
        graph: result.graph,
        caveats: entry.record.caveats,
        durationMs: entry.record.durationMs ?? 0,
        nodes: { ids: nodeColumn, columns: columns(nodeValues) },
        edges: { columns: columns(ids.edges.map((edge) => result.edge(edge))) },
    };
}

/**
 * The `graphty-results` member around its runs.
 * @param session - The session.
 * @param runs - The runs, each as {@link runEntry} builds it, in the dispatcher's order.
 * @returns The member.
 */
export function resultsMember(
    session: GraphSession,
    runs: readonly Record<string, unknown>[],
): Record<string, unknown> {
    return { kind: "graphty-results", version: VERSION, fingerprint: session.data.fingerprint(), runs };
}

/**
 * The `graphty-style` member.
 * @param session - The session.
 * @returns The member.
 */
export function styleMember(session: GraphSession): Record<string, unknown> {
    return { kind: "graphty-style", ...withAcceptedAssetIds(session, session.styles.toDocument()) };
}

/**
 * The `graphty-notes` member.
 * @param session - The session.
 * @returns The member.
 */
export function notesMember(session: GraphSession): Record<string, unknown> {
    return session.notes.toDocument() as unknown as Record<string, unknown>;
}

/**
 * The `graphty-view-state` member: the selection, its edges by position in the data member.
 * @param session - The session.
 * @param ids - The graph's ids, or a function that reads them (called only when an edge is selected).
 * @returns The member.
 */
export function viewStateMember(session: GraphSession, ids: GraphIds | (() => GraphIds)): Record<string, unknown> {
    const { selection } = session;
    // The edge ids are read only when an edge is selected: building them costs a pass over every
    // edge, which an autosave of a settings change would otherwise pay on every write.
    let edgeAt: Map<EdgeId, number> | undefined;
    const indexOf = (edge: EdgeId): number | undefined => {
        edgeAt ??= new Map((typeof ids === "function" ? ids() : ids).edges.map((id, at) => [id, at]));
        return edgeAt.get(edge);
    };
    return {
        kind: "graphty-view-state",
        version: VERSION,
        selection: {
            nodes: [...selection.nodes],
            edges: [...selection.edges].flatMap((edge) => indexOf(edge) ?? []),
        },
    };
}

/**
 * The document around its members.
 * @param session - The session, for the project's name.
 * @param members - The members, in file order.
 * @param extensions - The caller's extensions, checked.
 * @returns The document.
 */
export function documentAround(
    session: GraphSession,
    members: readonly Record<string, unknown>[],
    extensions: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
    const { name } = session.project;
    return {
        kind: DOCUMENT_KIND,
        version: VERSION,
        ...(name === null ? {} : { name }),
        generator: { name: "graphty-element", version: ENGINE_VERSIONS.element },
        requires: requiresOf(members),
        members,
        ...(Object.keys(extensions).length === 0 ? {} : { extensions }),
    };
}

/**
 * Write the session as a graphty document: every member's builder, in file order.
 * @param sources - The session, its dispatcher and which run ids the element minted.
 * @param options - What to leave out, and the caller's extensions.
 * @param networkSources - The loads from network sources, when the session has any.
 * @returns The document and what was left out.
 */
function write(
    sources: ProjectSources,
    options: ProjectSaveOptions,
    networkSources?: NetworkSourceRecords,
): { document: Record<string, unknown>; leftOut: ProjectProblem[] } {
    const { session, dispatcher } = sources;
    const extensions = checkedExtensions(options.extensions ?? {});
    const ids = graphIdsOf(session);
    const leaveOut = new Set<string>(options.leaveOut ?? []);
    const members = [
        dataMember(session),
        sessionMember(sources, ids),
        arrangementMember(session, ids),
        resultsMember(
            session,
            [...dispatcher.state.runs.keys()].flatMap((id): Record<string, unknown>[] => {
                const run = runEntry(sources, id, ids);
                return run === undefined ? [] : [run];
            }),
        ),
        styleMember(session),
        notesMember(session),
        viewStateMember(session, ids),
    ].filter((member) => !leaveOut.has(member.kind as string));
    const assets = assetsMember(session, options.assets);
    if (assets.member !== null) {
        members.push(assets.member);
    }

    const sourceMember = networkSources?.member() as Record<string, unknown> | null | undefined;
    if (sourceMember !== null && sourceMember !== undefined) {
        members.push({ kind: SOURCE_RECORD_MEMBER, ...sourceMember });
    }

    const leftOut: ProjectProblem[] = [
        ...session.runs
            .list()
            .filter((run) => !dispatcher.state.runs.has(run.id))
            .map((run): ProjectProblem => ({ code: "W_RUN_PENDING", params: { slice: "runs", id: run.id } })),
        ...assets.leftOut,
    ];
    return { document: documentAround(session, members, extensions), leftOut };
}

// ---------------------------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------------------------

/** A parsed graphty document, its members checked for kind and version. */
interface ReadDocument {
    readonly name?: string;
    readonly extensions: Readonly<Record<string, unknown>>;
    /** The members this element reads, by kind; each kind's first, styles and notes all. */
    readonly members: ReadonlyMap<MemberKind, readonly Record<string, unknown>[]>;
    readonly problems: ProjectProblem[];
}

/**
 * Whether a value is a plain JSON object.
 * @param value - The value.
 * @returns True for `{...}`.
 */
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Refuse a tree nested too deep, or holding a member named `__proto__`.
 * @param value - The parsed JSON.
 * @param depth - Its nesting level.
 */
function checkTree(value: unknown, depth: number): void {
    if (typeof value !== "object" || value === null) {
        return;
    }

    if (depth > MAX_DEPTH) {
        throw badDocument({ depth: MAX_DEPTH });
    }

    for (const key of Object.keys(value)) {
        if (key === "__proto__") {
            throw badDocument({ member: key });
        }

        checkTree((value as Record<string, unknown>)[key], depth + 1);
    }
}

/**
 * A file's size in bytes. A string is measured only when it could be over the limit: its UTF-8 is
 * at most three bytes per UTF-16 unit.
 * @param source - The file, its bytes, or its text.
 * @param limit - The most bytes to read.
 * @returns The size, or a figure under the limit when the text is certainly within it.
 */
function sizeOf(source: Blob | Uint8Array | string, limit: number): number {
    if (typeof source !== "string") {
        return source instanceof Uint8Array ? source.byteLength : source.size;
    }

    return source.length * 3 <= limit ? source.length : new TextEncoder().encode(source).length;
}

/**
 * The file's text, within the size limit.
 * @param source - The file, its bytes, or its text.
 * @param limit - The most bytes to read.
 * @returns The text.
 */
async function textOf(source: Blob | Uint8Array | string, limit: number): Promise<string> {
    const size = sizeOf(source, limit);
    if (size > limit) {
        throw new GraphtyError({
            code: "E_TOO_LARGE",
            message: `The file is ${String(size)} bytes, over the limit of ${String(limit)}.`,
            source: "data",
            details: { limit, count: size, of: "bytes" },
        });
    }

    if (typeof source === "string") {
        return source;
    }

    return source instanceof Uint8Array ? new TextDecoder().decode(source) : source.text();
}

/**
 * What `session.data.prepare` reads for a file `open` was handed that is not a graphty document:
 * the `File` itself, so its name says its format, or its text, named when a name was given.
 * @param source - What `open` was handed.
 * @param text - Its text.
 * @param fileName - Its name, when known.
 * @returns The source.
 */
function dataSourceOf(source: ProjectSource, text: string, fileName: unknown): DataSourceInput {
    const name = typeof fileName === "string" && fileName !== "" ? fileName : undefined;
    if (source instanceof Blob && name !== undefined) {
        return { config: { file: source instanceof File ? source : new File([source], name) }, name };
    }

    // Named text reads as a file of that name, so its extension says its format as a File's does.
    return name === undefined ? { config: { data: text } } : { config: { file: new File([text], name) }, name };
}

/**
 * The graphty document a parsed file is, or holds as a bare member, checked down to its members.
 * @param value - The parsed file.
 * @returns The document.
 * @throws A `GraphtyError` with `E_UNKNOWN_FORMAT`, `E_BAD_DOCUMENT` or `E_UNSUPPORTED_VERSION`.
 */
function documentOf(value: Record<string, unknown>): Record<string, unknown> {
    let document: Record<string, unknown>;
    if (value.kind === DOCUMENT_KIND) {
        document = value;
    } else if (value.kind === undefined && Number.isInteger(value.version) && Array.isArray(value.layers)) {
        // A style graphty-element 2.x wrote, with no kind (container.md, "Reading a file" rule 3).
        document = { kind: DOCUMENT_KIND, version: VERSION, members: [{ ...value, kind: "graphty-style" }] };
    } else if (typeof value.kind === "string" && MEMBER_KIND_FORM.test(value.kind) && Number.isInteger(value.version)) {
        // A bare member reads as a document holding it (rule 4).
        document = { kind: DOCUMENT_KIND, version: VERSION, members: [value] };
    } else {
        throw unknownFormat();
    }

    const { version } = document;
    if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
        throw badDocument({ member: "version" });
    }

    if (version !== VERSION) {
        throw new GraphtyError({
            code: "E_UNSUPPORTED_VERSION",
            message: `This graphty document is version ${String(version)}; this graphty-element reads version ${String(VERSION)}.`,
            source: "data",
            details: { kind: DOCUMENT_KIND, found: version, reads: [VERSION] },
        });
    }

    if (!Array.isArray(document.members)) {
        throw badDocument({ member: "members" });
    }

    return document;
}

/**
 * What kind of graphty document a text is, as `open` would read it.
 * @param text - The file's text.
 * @returns `"project"` for a saved project, `"document"` for another graphty document, or null
 *     when the text is not a graphty document (a data file, or nothing `open` reads).
 */
export function documentKind(text: string): "project" | "document" | null {
    try {
        return readDocument(text).members.has("graphty-session") ? "project" : "document";
    } catch {
        return null;
    }
}

/**
 * Parse a file and sort its members.
 * @param text - The file's text.
 * @returns The document.
 */
function readDocument(text: string): ReadDocument {
    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch (error) {
        throw new GraphtyError({
            code: "E_PARSE_FAILED",
            message: "The file is not JSON.",
            source: "data",
            cause: error,
        });
    }

    checkTree(value, 1);
    if (!isObject(value)) {
        throw unknownFormat();
    }

    const document = documentOf(value);
    const known = new Set<string>(MEMBER_KINDS);
    for (const kind of Array.isArray(document.requires) ? (document.requires as unknown[]) : []) {
        if (typeof kind !== "string" || !known.has(kind)) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: `The document requires the member kind ${String(kind)}, which this graphty-element does not read.`,
                source: "data",
                details: { kind },
            });
        }
    }

    const problems: ProjectProblem[] = [];
    const members = new Map<MemberKind, Record<string, unknown>[]>();
    (document.members as unknown[]).forEach((member, index) => {
        if (
            !isObject(member) ||
            typeof member.kind !== "string" ||
            !Number.isInteger(member.version) ||
            (member.version as number) < 1
        ) {
            problems.push({ code: "E_BAD_DOCUMENT", params: { index } });
            return;
        }

        const { kind } = member;
        if (!known.has(kind)) {
            problems.push({ code: "W_UNKNOWN_KIND", params: { index, kind } });
        } else if (member.version !== VERSION) {
            problems.push({ code: "E_UNSUPPORTED_VERSION", params: { index, kind, found: member.version as number } });
        } else {
            const held = members.get(kind as MemberKind) ?? [];
            if (held.length > 0 && kind !== "graphty-style" && kind !== "graphty-notes") {
                problems.push({ code: "E_UNSUPPORTED", params: { index, kind } });
                return;
            }

            members.set(kind as MemberKind, [...held, member]);
        }
    });

    return {
        ...(typeof document.name === "string" ? { name: document.name } : {}),
        extensions: isObject(document.extensions) ? document.extensions : {},
        members,
        problems,
    };
}

/**
 * Parse a file as a graphty document, or tell that it is not one.
 * @param text - The file's text.
 * @returns The document, or undefined when the file is not a graphty document (a data file).
 */
function graphtyDocumentOf(text: string): ReadDocument | undefined {
    try {
        return readDocument(text);
    } catch (error) {
        if (!isGraphtyError(error) || (error.code !== "E_UNKNOWN_FORMAT" && error.code !== "E_PARSE_FAILED")) {
            throw error;
        }

        return undefined;
    }
}

/**
 * The refusal of JSON that is not a graphty document.
 * @returns The error.
 */
function unknownFormat(): GraphtyError {
    return new GraphtyError({
        code: "E_UNKNOWN_FORMAT",
        message: "This JSON is not a graphty document. Import graph data with session.data.import.",
        source: "data",
        details: { format: "json" },
    });
}

/** A data member's graph, checked. */
interface NodeLink {
    readonly directed?: unknown;
    readonly nodes: readonly Record<string, unknown>[];
    readonly links: readonly Record<string, unknown>[];
}

/**
 * Check a data member before anything is changed.
 * @param member - The member.
 * @returns Its graph.
 */
function nodeLinkOf(member: Record<string, unknown>): NodeLink {
    if (member.dialect !== "node-link" || member.format !== "json") {
        throw new GraphtyError({
            code: "E_UNKNOWN_FORMAT",
            message: `Embedded data in the ${String(member.dialect)} dialect cannot be read here; node-link can.`,
            source: "data",
            details: { format: member.format as string, dialect: member.dialect as string, available: ["node-link"] },
        });
    }

    const graph = member.graph as Partial<NodeLink> | undefined;
    if (
        !Array.isArray(graph?.nodes) ||
        !Array.isArray(graph.links) ||
        ![...graph.nodes, ...graph.links].every(isObject)
    ) {
        throw badDocument({ member: "graphty-data" });
    }

    return graph as NodeLink;
}

/**
 * Put a document's embedded models into the session, before anything names them (the assets
 * member applies first, wherever it sits in `members`).
 * @param session - The session.
 * @param doc - The document.
 * @param problems - Collects each model that did not come back.
 */
async function restoreAssetsOf(session: GraphSession, doc: ReadDocument, problems: ProjectProblem[]): Promise<void> {
    const member = doc.members.get(ASSETS_MEMBER)?.[0];
    if (member !== undefined) {
        problems.push(...(await restoreAssets(session, member)));
    }
}

/** The transaction opening a document that is not a project into the session. */
const OPEN_DOCUMENT: TransactionOptions = { fact: { code: "document.open", params: {} } };

/**
 * Empty the session, through the transaction.
 * @param tx - The transaction.
 */
async function clearInto(tx: TransactionScope): Promise<void> {
    for (const note of tx.notes.list()) {
        tx.notes.remove(note.id);
    }

    // Every row of the style tree, folders with their layers; the element's own layers stay.
    for (const row of tx.styles.tree()) {
        await tx.styles.deleteRow(row.id);
    }

    for (const set of tx.sets.list()) {
        tx.sets.remove(set.id);
    }

    for (const run of tx.runs.list()) {
        tx.runs.remove(run.id);
    }

    if (tx.views.size > 0) {
        await tx.views.remove([...tx.views.keys()]);
    }

    if (tx.visibility.filter !== null) {
        await tx.visibility.set(null);
    }

    if (tx.visibility.window !== null) {
        await tx.visibility.setWindow(null);
    }

    if (tx.visibility.steps.length > 0) {
        await tx.visibility.setSteps([]);
    }

    await tx.data.clear();
}

/**
 * Add a data member's graph, and the source it records.
 * @param tx - The transaction.
 * @param graph - The graph.
 * @param source - The member's `source`: where the graph was loaded from, when the file says.
 * @param sources - The member's `sources`: every load the graph held, when the file says.
 * @returns The edge ids this session gave the file's edges, by position.
 */
async function importInto(
    tx: TransactionScope,
    graph: NodeLink,
    source: unknown,
    sources: unknown,
): Promise<(EdgeId | undefined)[]> {
    const before = tx.data.edges().length;
    await tx.execute({ op: "data.apply", mutation: { kind: "add-nodes", records: graph.nodes, idPath: "id" } });
    await tx.execute({
        op: "data.apply",
        mutation: {
            kind: "add-edges",
            records: graph.links,
            source: "source",
            target: "target",
            ...(typeof graph.directed === "boolean" ? { directed: graph.directed } : {}),
        },
    });
    if (isObject(source)) {
        // A list with an entry not shaped like a load is left out whole, as an older file has none.
        const loads = Array.isArray(sources) && sources.every(isLoadedSource) ? sources : undefined;
        await tx.execute({ op: "data.setSource", source, ...(loads === undefined ? {} : { sources: loads }) });
    }

    return tx.data
        .edges()
        .slice(before)
        .map((edge) => edge.id);
}

/**
 * Whether a saved value is shaped like one entry of `data.sources()`.
 * @param value - The saved value.
 * @returns True when it is.
 */
function isLoadedSource(value: unknown): value is LoadedSource {
    if (!isObject(value) || !Array.isArray(value.tables) || !isObject(value.added)) {
        return false;
    }

    const { leftOut, tableRows } = value;
    return (
        (tableRows === undefined ||
            (Array.isArray(tableRows) && tableRows.every((rows) => rows === "nodes" || rows === "edges"))) &&
        typeof value.added.nodes === "number" &&
        typeof value.added.edges === "number" &&
        (leftOut === undefined ||
            (isObject(leftOut) &&
                typeof leftOut.rows === "number" &&
                typeof leftOut.values === "number" &&
                (leftOut.endColumns === undefined ||
                    (isObject(leftOut.endColumns) &&
                        typeof leftOut.endColumns.source === "string" &&
                        typeof leftOut.endColumns.target === "string")) &&
                (leftOut.edges === undefined ||
                    (Array.isArray(leftOut.edges) &&
                        leftOut.edges.every(
                            (edge) =>
                                isObject(edge) &&
                                isObject(edge.values) &&
                                (edge.line === undefined || typeof edge.line === "number") &&
                                (edge.missingEnds === undefined ||
                                    (Array.isArray(edge.missingEnds) &&
                                        edge.missingEnds.every((end) => end === "source" || end === "target"))),
                        )))))
    );
}

/** What one open is doing. */
interface Opening {
    readonly tx: TransactionScope;
    readonly problems: ProjectProblem[];
    readonly restored: Set<ProjectSlice>;
}

/**
 * Do one part, recording it as restored, or its failure as a problem rather than failing the open.
 * @param opening - The open.
 * @param slice - The part.
 * @param work - The work.
 * @param id - What it was about, when one thing.
 */
async function attempt(
    opening: Opening,
    slice: ProjectSlice,
    work: () => Promise<unknown>,
    id?: string,
): Promise<void> {
    try {
        await work();
        opening.restored.add(slice);
    } catch (error) {
        opening.problems.push({
            code: isGraphtyError(error) ? error.code : "E_INTERNAL",
            params: { slice, ...(id === undefined ? {} : { id }) },
        });
    }
}

/**
 * Add the style and notes members.
 * @param opening - The open.
 * @param members - The document's members.
 * @param remap - Rewrites the set ids a member names to the ones this session gave.
 * @param notesName - What to call the source of the notes.
 */
async function addStylesAndNotes(
    opening: Opening,
    members: ReadDocument["members"],
    remap: <T>(value: T) => T,
    notesName: string | null,
): Promise<void> {
    const { tx, problems } = opening;
    for (const { kind: _kind, ...style } of members.get("graphty-style") ?? []) {
        await attempt(opening, "styles", async () => {
            const report = await tx.styles.applyTemplate(remap(style) as never);
            for (const unbound of report.unbound) {
                problems.push({
                    code: "E_UNKNOWN_ATTRIBUTE",
                    params: { slice: "styles", id: unbound.layerId, needs: [...unbound.needs] },
                });
            }
        });
    }

    for (const notes of members.get("graphty-notes") ?? []) {
        await attempt(opening, "notes", () => {
            const report = tx.notes.mergeDocument(notes, notesName === null ? {} : { name: notesName });
            for (const skipped of report.skipped) {
                problems.push({ code: skipped.code, params: { slice: "notes", pointer: skipped.what } });
            }

            return Promise.resolve();
        });
    }
}

/**
 * Read a project into the session, in place of what it holds.
 * @param opening - The open.
 * @param doc - The document.
 * @param graph - Its data, checked.
 * @param name - The project's name.
 * @param canned - Where the saved results wait for their runs.
 */
async function readProject(
    opening: Opening,
    doc: ReadDocument,
    graph: NodeLink,
    name: string | null,
    canned: CannedOutcomes,
): Promise<void> {
    const { source, sources } = doc.members.get("graphty-data")?.[0] ?? {};
    const { tx, problems } = opening;
    const first = (kind: MemberKind): Record<string, unknown> => doc.members.get(kind)?.[0] ?? {};
    const state = first("graphty-session");

    await clearInto(tx);
    await attempt(opening, "config", () => tx.config.set({ ...withAddedDefaults(state.config), name }));
    const edgeIds = await importInto(tx, graph, source, sources);
    opening.restored.add("graph");
    const nodeIds = new Set(tx.data.nodes().map((node) => node.id));
    await readDeclarations(opening, state.declarations);

    // Before the styles, so a layer reading a `graphty.style.` path binds to what it reads.
    if (Array.isArray(state.fileStyles)) {
        const loads = state.fileStyles as unknown[];
        await attempt(opening, "graph", () =>
            tx.execute({ op: "data.setFileStyles", loads: fileStylesInto(loads, nodeIds, edgeIds) }),
        );
    }

    const layout = state.layout as
        { id: string; engine: string; options: Record<string, unknown>; dimension: "2d" | "3d" } | undefined;
    if (layout !== undefined) {
        await attempt(opening, "layout", async () => {
            await tx.layout.set(layout.id, { engine: layout.engine, options: layout.options });
            await tx.layout.setDimension(layout.dimension);
        });
    }

    const arrangement = doc.members.get("graphty-arrangement")?.[0];
    if (arrangement !== undefined) {
        await attempt(opening, "arrangement", async () => {
            const ids = arrangement.ids as NodeId[];
            const [xs, ys, zs] = [arrangement.x, arrangement.y, arrangement.z].map((column) =>
                decodeColumn(column, ids.length),
            );
            await tx.positions.set(
                ids.flatMap((id, at) =>
                    nodeIds.has(id) ? [{ id, x: xs[at] as number, y: ys[at] as number, z: zs[at] as number }] : [],
                ),
            );
            await tx.positions.pin((arrangement.pins as NodeId[]).filter((id) => nodeIds.has(id)));
            opening.restored.add("pins");
        });
    }

    // Before the runs: a run over the selection reads it. The selection is not project state.
    const view = doc.members.get("graphty-view-state")?.[0]?.selection as
        { nodes?: NodeId[]; edges?: number[] } | undefined;
    if (view !== undefined) {
        try {
            await tx.selection.apply({
                nodes: (view.nodes ?? []).filter((node) => nodeIds.has(node)),
                edges: (view.edges ?? []).flatMap((at) => edgeIds[at] ?? []),
            });
        } catch (error) {
            problems.push({
                code: isGraphtyError(error) ? error.code : "E_INTERNAL",
                params: { kind: "graphty-view-state" },
            });
        }
    }

    // Sets before the runs, so a run over a set finds it. A set is minted a new id when the session
    // has already issued its old one, so every `{ set }` the file names is rewritten to the new id.
    const setIds = new Map<string, string>();
    const remap = <T>(value: T): T =>
        JSON.parse(JSON.stringify(value), (key, held: unknown) =>
            key === "set" && typeof held === "string" ? (setIds.get(held) ?? held) : held,
        ) as T;
    type SavedSet = { id: string; name: string; definition: unknown };
    const createSet = (set: SavedSet): void => {
        setIds.set(set.id, tx.sets.create(remap(set.definition) as SetDefinitionInput, { name: set.name }));
    };
    // A set that reads a result cannot be made until its run is back; it is tried again after them.
    const waiting = ((state.sets ?? []) as SavedSet[]).filter((set) => {
        try {
            createSet(set);
            opening.restored.add("sets");
            return false;
        } catch {
            return true;
        }
    });

    const results = first("graphty-results");
    const sameData = results.fingerprint === tx.data.fingerprint();
    for (const run of (results.runs ?? []) as SavedRun[]) {
        await attempt(
            opening,
            "runs",
            async () => {
                if (!sameData) {
                    problems.push({ code: "W_DATA_DIFFERS", params: { slice: "runs", id: run.id } });
                }

                // A file written before caveats carried facts has none to read back.
                const caveats: Caveats = { facts: [], ...run.caveats };
                const result = createRunResult({
                    runId: run.id,
                    shape: run.shape,
                    fields: run.fields,
                    measured: run.measured,
                    graph: run.graph,
                    nodes: rowsOf(run.nodes.ids, run.nodes.columns, (node) => (nodeIds.has(node) ? node : undefined)),
                    // Edges are keyed by position in the data; data that differs leaves them out.
                    edges: sameData
                        ? rowsOf(
                              edgeIds.map((_, at) => at),
                              run.edges.columns,
                              (at) => edgeIds[at],
                          )
                        : [],
                    caveats,
                    durationMs: run.durationMs,
                });
                // The summary too, as a fresh execution hands it over: the run's record (its count,
                // its groups) is read from it.
                canned.set(run.id, { result, summary: result.summary(), caveats, fields: run.fields });
                const { algorithm, params, scope, seed, sample, exact } = remap(run);
                try {
                    await tx.runs.start(algorithm, params, {
                        as: run.id,
                        style: false,
                        ...(scope === undefined ? {} : { scope }),
                        ...(seed === undefined ? {} : { seed }),
                        ...(sample === undefined ? {} : { sample }),
                        ...(exact === undefined ? {} : { exact }),
                    });
                } finally {
                    canned.delete(run.id);
                }
            },
            run.id,
        );
    }

    for (const set of waiting) {
        await attempt(
            opening,
            "sets",
            () => {
                createSet(set);
                return Promise.resolve();
            },
            set.id,
        );
    }

    const visibility = state.visibility as Record<string, unknown> | undefined;
    if (visibility !== undefined) {
        await attempt(opening, "visibility", async () => {
            if (visibility.filter !== null && visibility.filter !== undefined) {
                await tx.visibility.set(remap(visibility.filter) as never);
            }

            if (visibility.window !== null && visibility.window !== undefined) {
                await tx.visibility.setWindow(visibility.window as never);
            }

            if (Array.isArray(visibility.steps) && visibility.steps.length > 0) {
                await tx.visibility.setSteps(
                    // A malformed step is passed on as it is, for setSteps to refuse with its reason.
                    (visibility.steps as ({ rule?: unknown } | null)[]).map((step) =>
                        typeof step === "object" && step !== null ? { ...step, rule: remap(step.rule) } : step,
                    ) as never,
                );
            }

            tx.visibility.showContext = visibility.showContext === true;
        });
    }

    await addStylesAndNotes(opening, doc.members, remap, name);

    for (const named of (state.valueLabels ?? []) as { path: string; value: string; label: string }[]) {
        await attempt(opening, "valueLabels", () => tx.data.setValueLabel(named.path, named.value, named.label));
    }

    const views = (state.views ?? []) as never[];
    if (views.length > 0) {
        await attempt(opening, "views", () => tx.views.save(views));
    }
}

/**
 * Declare the columns the session member says were declared. A file written before declarations
 * were saved has none; a newer version of the field is reported and skipped.
 * @param opening - The open.
 * @param declarations - The session member's `declarations` field.
 */
async function readDeclarations(opening: Opening, declarations: unknown): Promise<void> {
    if (!isObject(declarations)) {
        return;
    }

    if (declarations.version !== DECLARATIONS_VERSION) {
        opening.problems.push({
            code: "E_UNSUPPORTED_VERSION",
            params: { slice: "attributes", found: declarations.version as number },
        });
        return;
    }

    for (const column of Array.isArray(declarations.columns) ? (declarations.columns as unknown[]) : []) {
        const { kind, name, ...declaration } = (isObject(column) ? column : {}) as {
            kind?: unknown;
            name?: unknown;
        } & Record<string, unknown>;
        await attempt(
            opening,
            "attributes",
            () => opening.tx.data.declare({ kind, name } as never, declaration as never),
            `${String(kind)}:${String(name)}`,
        );
    }
}

/**
 * A project file's file-style values, rewritten onto this session's elements: a node by its id,
 * kept when the data holds it; an edge by its position in the data, given the id this session
 * gave it. Anything malformed is left for the command to refuse.
 * @param loads - The saved loads.
 * @param nodeIds - The nodes the session holds.
 * @param edgeIds - The edge ids this session gave the file's edges, by position.
 * @returns The loads, over this session's ids.
 */
function fileStylesInto(
    loads: readonly unknown[],
    nodeIds: ReadonlySet<NodeId>,
    edgeIds: readonly (EdgeId | undefined)[],
): FileStyleLoadValues[] {
    return loads.map((load) => {
        if (!isObject(load) || !Array.isArray(load.columns)) {
            return load as FileStyleLoadValues;
        }

        const columns = (load.columns as unknown[]).map((column) => {
            if (!isObject(column) || !Array.isArray(column.ids) || !Array.isArray(column.values)) {
                return column;
            }

            const ids: (NodeId | EdgeId)[] = [];
            const values: unknown[] = [];
            const saved = column.values as unknown[];
            (column.ids as unknown[]).forEach((id, at) => {
                const mapped = column.kind === "edge" ? edgeOf(id, edgeIds) : nodeOf(id, nodeIds);
                if (mapped !== undefined) {
                    ids.push(mapped);
                    values.push(saved[at]);
                }
            });
            return { ...column, ids, values };
        });
        return { ...load, columns } as unknown as FileStyleLoadValues;
    });
}

/**
 * The node a saved file-style id names, when the session holds it.
 * @param id - The saved id.
 * @param nodeIds - The nodes the session holds.
 * @returns The node id, or undefined.
 */
function nodeOf(id: unknown, nodeIds: ReadonlySet<NodeId>): NodeId | undefined {
    return (typeof id === "string" || typeof id === "number") && nodeIds.has(id) ? id : undefined;
}

/**
 * The edge a saved file-style position names.
 * @param at - The saved position in the data.
 * @param edgeIds - The edge ids this session gave the file's edges, by position.
 * @returns The edge id, or undefined.
 */
function edgeOf(at: unknown, edgeIds: readonly (EdgeId | undefined)[]): EdgeId | undefined {
    return typeof at === "number" ? edgeIds[at] : undefined;
}

/** One finished run as a results member keeps it. */
interface SavedRun {
    readonly id: RunId;
    readonly algorithm: string;
    readonly params?: Readonly<Record<string, unknown>>;
    readonly scope?: never;
    readonly seed?: number;
    readonly sample?: number;
    readonly exact?: boolean;
    readonly shape: ResultShape;
    readonly fields: readonly FieldDescriptor[];
    readonly measured: { readonly nodes: number; readonly edges: number };
    readonly graph: Readonly<Record<string, unknown>>;
    readonly caveats: Caveats | Omit<Caveats, "facts">;
    readonly durationMs: number;
    readonly nodes: { readonly ids: readonly NodeId[]; readonly columns: Readonly<Record<string, unknown>> };
    readonly edges: { readonly columns: Readonly<Record<string, unknown>> };
}

/**
 * Read columns back as element values.
 * @param keys - The rows' keys, in order.
 * @param columns - The columns, one value per key.
 * @param mapId - Turns a key into the id this session holds, or undefined for one it lost.
 * @returns The values of the rows that have any.
 */
function rowsOf<Key, Id extends NodeId>(
    keys: readonly Key[],
    columns: Readonly<Record<string, unknown>>,
    mapId: (key: Key) => Id | undefined,
): ResultElementValues<Id>[] {
    const decoded = Object.entries(columns).map(
        ([field, column]) => [field, decodeColumn(column, keys.length)] as const,
    );
    const out: ResultElementValues<Id>[] = [];
    keys.forEach((key, at) => {
        const id = mapId(key);
        const values: Record<string, unknown> = {};
        for (const [field, column] of decoded) {
            if (column[at] !== null && column[at] !== undefined) {
                values[field] = column[at];
            }
        }

        if (id !== undefined && Object.keys(values).length > 0) {
            out.push({ id, values });
        }
    });
    return out;
}

export { PROJECT_FILE } from "../catalog/types";

/**
 * The file name the element gives a project: `<name>.graphty.json`, or `project.graphty.json`
 * for a project with no name. Opening a file with that name gives a named project its name back.
 * @param name - The project's name, such as `session.project.name`; blank or null for none.
 * @returns The file name.
 */
export function projectFileName(name: string | null | undefined): string {
    return `${name === null || name === undefined || name.trim() === "" ? "project" : name}${PROJECT_FILE.extension}`;
}

/**
 * Refuses to open a project over unsaved changes unless the caller discards them.
 * @param dirty - The session has unsaved changes.
 * @param discard - The caller's `discard` option.
 * @throws {GraphtyError} E_UNSAVED_CHANGES when there are changes to lose.
 */
function refuseUnsaved(dirty: boolean, discard: boolean | undefined): void {
    if (dirty && discard !== true) {
        throw new GraphtyError({
            code: "E_UNSAVED_CHANGES",
            message: "The session has unsaved changes. Pass { discard: true } to open the project over them.",
            source: "data",
        });
    }
}

/**
 * The project's name from a file's name: without `.graphty.json` or `.json`.
 * @param fileName - The file's name.
 * @returns The name, or null for none.
 */
function nameOfFile(fileName: string | undefined): string | null {
    const name = fileName?.replace(/(\.graphty)?\.json$/i, "").trim();
    return name === undefined || name === "" ? null : name;
}

// ---------------------------------------------------------------------------------------------
// The API
// ---------------------------------------------------------------------------------------------

/** Each session's way to mark its project unsaved; see {@link markProjectUnsaved}. */
const UNSAVED = new WeakMap<object, () => void>();

/**
 * Mark a session's project as holding work never saved to a file, whatever its history says: an
 * autosave restore puts back the `dirty` flag the work had, after `open()` made it clean. Internal.
 * @param session - The session.
 */
export function markProjectUnsaved(session: GraphSession): void {
    UNSAVED.get(session)?.();
}

/**
 * A fresh project id: 128 random bits in hex.
 * @returns The id.
 */
function newProjectId(): string {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * A saved project id, when it is one: a string of 1 to 128 letters, digits, `-` and `_`.
 * @param value - What the file holds.
 * @returns The id, or undefined.
 */
function projectIdOf(value: unknown): string | undefined {
    return typeof value === "string" && /^[\w-]{1,128}$/.test(value) ? value : undefined;
}

/**
 * Build a session's project API.
 * @param session - The session.
 * @param dispatcher - Its dispatcher.
 * @param canned - Where saved results wait for the runs an open starts; the session's executor
 *     answers from it.
 * @param hooks - What the session lends it.
 * @param hooks.announce - Publishes `project:status`.
 * @param hooks.isDerived - Whether the element minted a run's id.
 * @param hooks.sources - Writes and restores the loads from network sources.
 * @param hooks.projectChanged - Called once an open has read the project's id, before anything is
 *     fetched, and again once its source loads are restored.
 * @returns The API.
 */
export function projectOf(
    session: GraphSession,
    dispatcher: Dispatcher,
    canned: CannedOutcomes,
    hooks: {
        readonly announce: (change: ProjectStatus) => void;
        readonly isDerived: (id: RunId) => boolean;
        readonly sources?: NetworkSourceRecords;
        readonly projectChanged?: () => void;
    },
): ProjectApi {
    const { announce, isDerived, sources: networkSources, projectChanged } = hooks;
    let id = newProjectId();
    // Clean means: the history's cursor is on the save point's step (null: the baseline), and
    // nothing has been merged into that step or cleared from under it. A save made with
    // `markSaved: false` keeps its own point, followed the same way, until `markSaved` adopts it.
    let point: SavePoint = { step: null, lost: false, seq: 0 };
    // Unmarked saves: the point alone is followed, and the SavedProject (with its text) is held
    // only weakly, so a write that failed and is never marked keeps no copy of the file alive.
    const waiting = new Set<SavePoint>();
    const pointOf = new WeakMap<SavedProject, SavePoint>();
    let seq = 0;
    let top: string | null = null;
    let last: ProjectStatus = { name: null, dirty: false };
    // One step, not the published list, which every change rebuilds.
    const topNow = (): string | null => dispatcher.history.stepAt(dispatcher.history.position - 1)?.id ?? null;
    const isDirty = (): boolean => point.lost || topNow() !== point.step;
    const nameNow = (): string | null => session.config.name ?? null;
    const tell = (): void => {
        const now = { name: nameNow(), dirty: isDirty() };
        if (now.name !== last.name || now.dirty !== last.dirty) {
            last = now;
            announce(now);
        }
    };
    const pointNow = (): SavePoint => ({ step: topNow(), lost: false, seq: ++seq });
    const adopt = (next: SavePoint): void => {
        point = next;
        for (const each of waiting) {
            if (each.seq <= next.seq) {
                waiting.delete(each);
            }
        }

        tell();
    };

    UNSAVED.set(session, () => {
        point.lost = true;
        tell();
    });

    // Until the project is saved, opened or changed, the step holding its first `data.import`
    // (alone, or in a transaction with what the load sets up) is its baseline: a graph read from a
    // sample or a file is not an unsaved change. Undoing past it is.
    let fresh = true;
    const isFirstImport = (): boolean => {
        const { history } = dispatcher;
        const first = history.stepAt(0);
        return (
            fresh &&
            history.length === 1 &&
            history.position === 1 &&
            first !== undefined &&
            first.ops.includes("data.import") &&
            (point.step === null || point.step === first.id) &&
            !point.lost &&
            waiting.size === 0
        );
    };

    session.on("history:changed", ({ reason }) => {
        if (reason === "pending" && fresh) {
            // Still loading: the step it records decides.
            return;
        }

        if ((reason === "record" || reason === "merge") && isFirstImport()) {
            point = pointNow();
            top = topNow();
            tell();
            return;
        }

        if (reason !== "size") {
            fresh = false;
        }

        for (const each of [point, ...waiting.values()]) {
            if (reason === "merge" && topNow() === each.step) {
                each.lost = true;
            } else if (reason === "clear") {
                each.lost ||= top !== each.step;
                each.step = null;
            } else if (reason === "evict" && each.step === null) {
                each.lost = true;
            }
        }

        top = topNow();
        tell();
    });

    /**
     * Open a project over the session: its graph and slices in one transaction, its network
     * loads waiting, and a fresh history.
     * @param doc - the read document
     * @param fileName - the file's name, if it had one
     * @param discard - whether unsaved changes may be lost
     * @param problems - collects what could not be restored
     * @param restored - collects the slices that were
     */
    const openProject = async (
        doc: ReadDocument,
        fileName: unknown,
        discard: boolean,
        problems: ProjectProblem[],
        restored: Set<ProjectSlice>,
    ): Promise<void> => {
        refuseUnsaved(isDirty(), discard);

        const data = doc.members.get("graphty-data")?.[0];
        if (data === undefined) {
            throw badDocument({ member: "graphty-data" });
        }

        const graph = nodeLinkOf(data);
        const state = doc.members.get("graphty-session")?.[0];
        // A file cannot approve its own fetches: an older one's saved network policy is ignored.
        if (state?.network !== undefined) {
            problems.push({ code: "W_NETWORK_POLICY_IGNORED", params: { kind: "graphty-session" } });
        }
        await restoreAssetsOf(session, doc, problems);
        const name = doc.name ?? nameOfFile(typeof fileName === "string" ? fileName : undefined);
        // A project opens with a fresh history: its opened state is the baseline, and the steps
        // before it go when it is in. Undo pressed while it opens never cancels it, and work the
        // reader starts meanwhile stays theirs to undo.
        const opening: TransactionOptions = {
            fact: { code: "project.open", params: { name: name ?? null } },
            starts: true,
        };
        projectBoundary(session, "open");
        // After the boundary, which keeps the work it replaces under its own id; before anything
        // the project names is fetched, so the page's remembered hosts for it apply.
        const before = id;
        id = projectIdOf(state?.id) ?? newProjectId();
        projectChanged?.();
        try {
            await session.transaction(
                "Open project",
                (tx) => readProject({ tx, problems, restored }, doc, graph, name, canned),
                opening,
            );
        } catch (error) {
            id = before;
            projectChanged?.();
            throw error;
        }
        // The loads from network sources wait, fetching nothing, until the application runs them.
        try {
            networkSources?.restore(doc.members.get(SOURCE_RECORD_MEMBER)?.[0]);
        } catch (error) {
            problems.push({
                code: isGraphtyError(error) ? error.code : "E_INTERNAL",
                params: { kind: SOURCE_RECORD_MEMBER },
            });
        }
        // Its restored source loads on the hosts remembered for it run now.
        projectChanged?.();
        fresh = false;
        // Saved at the baseline: anything the reader did while it opened is a change.
        adopt({ ...pointNow(), step: null });
    };

    /**
     * Open a plain graphty document into the session: its graph when the session is empty, its
     * styles and notes, and a problem for each project slice it cannot hold.
     * @param doc - the read document
     * @param problems - collects what could not be restored
     * @param restored - collects the slices that were
     * @param starts - whether it starts the history (`ProjectOpenOptions.history`)
     */
    const openDocument = async (
        doc: ReadDocument,
        problems: ProjectProblem[],
        restored: Set<ProjectSlice>,
        starts: boolean,
    ): Promise<void> => {
        const data = doc.members.get("graphty-data")?.[0];
        const graph = data === undefined || session.data.nodes().length > 0 ? undefined : nodeLinkOf(data);
        await restoreAssetsOf(session, doc, problems);
        fresh = false;
        await session.transaction(
            "Open document",
            async (tx) => {
                const opening = { tx, problems, restored };
                if (graph !== undefined) {
                    await importInto(tx, graph, data?.source, data?.sources);
                    restored.add("graph");
                }

                for (const kind of [
                    "graphty-session",
                    "graphty-arrangement",
                    "graphty-results",
                    "graphty-view-state",
                ] as const) {
                    if (doc.members.has(kind)) {
                        problems.push({ code: "E_UNSUPPORTED", params: { kind } });
                    }
                }

                await addStylesAndNotes(opening, doc.members, (value) => value, doc.name ?? null);
            },
            starts ? { ...OPEN_DOCUMENT, starts } : OPEN_DOCUMENT,
        );
    };

    return {
        get name() {
            return nameNow();
        },
        get id() {
            return id;
        },
        get dirty() {
            return isDirty();
        },
        rename(name) {
            return session.config.set({ name });
        },
        save(options = {}) {
            const { document, leftOut } = write({ session, dispatcher, isDerived }, options, networkSources);
            const text = JSON.stringify(document);
            const saved: SavedProject = Object.freeze({
                text,
                report: Object.freeze({
                    bytes: new TextEncoder().encode(text).length,
                    written: (document.members as { kind: string }[]).map((member) => member.kind),
                    leftOut,
                }),
            });
            fresh = false;
            if (options.markSaved === false) {
                const waited = pointNow();
                waiting.add(waited);
                pointOf.set(saved, waited);
            } else {
                adopt(pointNow());
            }

            return Promise.resolve(saved);
        },
        markSaved(saved) {
            const waited = pointOf.get(saved);
            if (waited !== undefined && waiting.has(waited)) {
                adopt(waited);
            }
        },
        async open(source, options = {}) {
            const text = await textOf(source, options.limits?.fileBytes ?? DEFAULT_FILE_BYTES);
            const fileName = options.fileName ?? (source as { name?: unknown }).name;
            const doc = graphtyDocumentOf(text);
            if (doc === undefined) {
                // Not a graphty document: a data file, read the way session.data.prepare reads one.
                const draft = await session.data.prepare(dataSourceOf(source, text, fileName));
                return Object.freeze({
                    opened: "graph" as const,
                    draft,
                    name: nameNow(),
                    restored: Object.freeze([]),
                    problems: Object.freeze([]),
                    extensions: Object.freeze({}),
                });
            }

            const isProject = doc.members.has("graphty-session");
            const problems = [...doc.problems];
            const restored = new Set<ProjectSlice>();

            if (isProject) {
                await openProject(doc, fileName, options.discard === true, problems, restored);
            } else {
                await openDocument(doc, problems, restored, options.history === "start");
            }

            return Object.freeze({
                opened: isProject ? "project" : "document",
                name: nameNow(),
                restored: Object.freeze([...restored]),
                problems: Object.freeze(problems),
                extensions: doc.extensions,
            });
        },
    };
}
