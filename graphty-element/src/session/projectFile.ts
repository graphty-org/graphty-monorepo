/**
 * @file The project file: the whole session saved as one graphty document, and opened again.
 *
 * A project file is a `graphty-document` (design/documents/container.md) holding every member:
 * the data (`graphty-data`), the settings, layout, filter, sets and views (`graphty-session`),
 * where each node stands (`graphty-arrangement`), every finished run with its result as columns
 * (`graphty-results`), the style layers (`graphty-style`), the notes (`graphty-notes`) and the
 * selection (`graphty-view-state`, never required to open the file). A saved run is not computed
 * again on open: its result is handed to the run in place of the work.
 *
 * Nothing here writes words for a reader. Every problem is a code and its values.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: the session entry point reaches it.
 */

import type { EdgeId, FieldDescriptor, NodeId, ResultShape, RunId, SetDefinitionInput } from "../catalog/types";
import { type GraphtyErrorCode, type GraphtyWarningCode } from "../errors/codes";
import { GraphtyError, isGraphtyError } from "../errors/GraphtyError";
import type { Dispatcher } from "./project/Dispatcher";
import { createRunResult, type ResultElementValues } from "./results/RunResult";
import { type Caveats, ENGINE_VERSIONS, type RunExecutionContext, type RunExecutor, type RunOutcome } from "./runs";
import type { CodedFact } from "./shared";
import type { GraphSession, ProjectConfigPatch, ProjectSlice, TransactionScope } from "./types";

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
] as const;

/** One of the member kinds a project file writes. */
type MemberKind = (typeof MEMBER_KINDS)[number];

/** The members a reader cannot open the file correctly without. */
const REQUIRED: readonly MemberKind[] = ["graphty-data", "graphty-session", "graphty-results"];

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
    readonly limits?: {
        /** The largest file to read, in bytes. Default 256 MiB. */
        readonly fileBytes?: number;
    };
}

/** What `project.open` did. Frozen. */
export interface ProjectOpenReport {
    /**
     * What the file was: `"project"` (it holds a `graphty-session` member, and replaced the
     * session) or `"document"` (a graphty document that is not a project, such as a saved style
     * or notes, whose contents were added to the session).
     *
     * OPEN UNION: later releases add values.
     */
    readonly opened: "project" | "document";
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

/** Saving the whole session to one file, and opening one again. */
export interface ProjectApi {
    /** The project's name: from the file it was opened from, or `rename`. Null until one is given. */
    readonly name: string | null;
    /**
     * Whether anything the file saves has changed since the last save or open. Undoing back to
     * that point makes it false again. The selection and the extensions never set it.
     */
    readonly dirty: boolean;
    /**
     * Rename the project. One undoable step, which sets `dirty`.
     * @param name - The name, at most 256 characters; blank or null clears it.
     * @returns Settles once the step is recorded.
     */
    rename(name: string | null): Promise<void>;
    /**
     * Save the whole session as a graphty document. Clears `dirty`.
     * @param options - What to leave out, and your own extensions.
     * @returns The file's text, and what it holds.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` for an extension name that
     *     is not reverse-domain or a value over 64 KB.
     */
    save(options?: ProjectSaveOptions): Promise<SavedProject>;
    /**
     * Open a graphty document. A project replaces the session, with a fresh history; any other
     * graphty document (a style, notes) is added as one undoable step.
     * @param source - The file, its bytes, or its text. Never a URL: nothing is fetched.
     * @param options - Whether to discard unsaved changes, the file's name, the size limit.
     * @returns What came back and what did not.
     * @throws A `GraphtyError` (as a rejection), leaving the session as it was:
     *     `E_UNSAVED_CHANGES` for a project over unsaved changes without `discard`, `E_TOO_LARGE`
     *     past the size limit, `E_PARSE_FAILED` for text that is not JSON, `E_UNKNOWN_FORMAT` for
     *     JSON that is not a graphty document (or data in a dialect other than node-link),
     *     `E_BAD_DOCUMENT` for a malformed document, `E_UNSUPPORTED_VERSION` for a newer one, and
     *     `E_UNSUPPORTED` for one that requires a member kind this element does not read.
     */
    open(source: Blob | Uint8Array | string, options?: ProjectOpenOptions): Promise<ProjectOpenReport>;
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
        binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
    }

    return { dtype: "f64", data: btoa(binary), ...(absent.length === 0 ? {} : { absent }) };
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
            const view = new DataView(Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer);
            const values: unknown[] = Array.from({ length }, (_, at) => read(view, at * width));
            for (const at of Array.isArray(held.absent) ? held.absent : []) {
                if (Number.isInteger(at) && at >= 0 && at < length) {
                    values[at as number] = null;
                }
            }

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
 * The project settings worth saving: everything but who is writing, which belongs to the person,
 * and the name, which the document carries.
 * @param session - The session.
 * @returns The settings as a patch.
 */
function configOf(session: GraphSession): ProjectConfigPatch {
    const { data, runAlgorithmsOnLoad, background, selectionStyle, layoutBehavior } = session.config;
    return JSON.parse(
        JSON.stringify({
            data: { algorithms: data.algorithms, directed: data.directed, knownFields: data.knownFields },
            runAlgorithmsOnLoad,
            background,
            selectionStyle,
            layoutBehavior,
        }),
    ) as ProjectConfigPatch;
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

/**
 * Write the session as a graphty document.
 * @param session - The session.
 * @param dispatcher - Its dispatcher, whose `runs` slice holds each finished run's command.
 * @param isDerived - Whether the element minted a run's id.
 * @param options - What to leave out, and the caller's extensions.
 * @returns The document and what was left out.
 */
function write(
    session: GraphSession,
    dispatcher: Dispatcher,
    isDerived: (id: RunId) => boolean,
    options: ProjectSaveOptions,
): { document: Record<string, unknown>; leftOut: ProjectProblem[] } {
    const nodes = session.data.nodes();
    const edges = session.data.edges();
    const nodeIds = nodes.map((node) => node.id);
    const edgeAt = new Map(edges.map((edge, at) => [edge.id, at]));

    const placed: NodeId[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    const at = { x: 0, y: 0, z: 0 };
    nodeIds.forEach((id, index) => {
        if (session.positions.isPlaced(index)) {
            session.positions.read(index, at);
            placed.push(id);
            xs.push(at.x);
            ys.push(at.y);
            zs.push(at.z);
        }
    });

    const runs = [...dispatcher.state.runs].map(([id, entry]) => {
        const { result } = entry;
        const { op: _op, as: _as, applySuggestedStyles: _style, ...command } = entry.command;
        const nodeColumn: NodeId[] = [];
        const nodeValues: Readonly<Record<string, unknown>>[] = [];
        for (const node of nodeIds) {
            const values = result.node(node);
            if (values !== undefined) {
                nodeColumn.push(node);
                nodeValues.push(values);
            }
        }

        const edgeValues = edges.map((edge) => result.edge(edge.id));
        const columns = (
            rows: readonly (Readonly<Record<string, unknown>> | undefined)[],
        ): Record<string, SavedColumn> => {
            const fields = new Set(rows.flatMap((row) => (row === undefined ? [] : Object.keys(row))));
            return Object.fromEntries(
                [...fields].map((field) => [field, encodeColumn(rows.map((row) => row?.[field]))]),
            );
        };
        return {
            id,
            derived: isDerived(id),
            ...command,
            shape: result.shape,
            fields: result.fields,
            measured: result.measured,
            graph: result.graph,
            caveats: entry.record.caveats,
            durationMs: entry.record.durationMs ?? 0,
            nodes: { ids: nodeColumn, columns: columns(nodeValues) },
            edges: { columns: columns(edgeValues) },
        };
    });

    const { layout, visibility, selection } = session;
    const leaveOut = new Set<string>(options.leaveOut ?? []);
    const members: Record<string, unknown>[] = [
        {
            kind: "graphty-data",
            version: VERSION,
            format: "json",
            dialect: "node-link",
            graph: { nodes, links: edges.map(({ id: _id, ...edge }) => edge) },
        },
        {
            kind: "graphty-session",
            version: VERSION,
            config: configOf(session),
            layout: { id: layout.id, engine: layout.engine, options: layout.options, dimension: layout.dimension },
            visibility: { filter: visibility.filter, window: visibility.window, showContext: visibility.showContext },
            sets: session.sets.list().map((set) => ({ id: set.id, name: set.name, definition: set.definition })),
            views: [...session.views].map(([name, camera]) => ({ name, camera })),
        },
        {
            kind: "graphty-arrangement",
            version: VERSION,
            ids: placed,
            x: encodeColumn(xs),
            y: encodeColumn(ys),
            z: encodeColumn(zs),
            pins: [...session.positions.pinned],
        },
        { kind: "graphty-results", version: VERSION, fingerprint: session.data.fingerprint(), runs },
        { kind: "graphty-style", ...session.styles.toDocument() },
        session.notes.toDocument() as unknown as Record<string, unknown>,
        {
            kind: "graphty-view-state",
            version: VERSION,
            selection: {
                nodes: [...selection.nodes],
                edges: [...selection.edges].flatMap((edge) => edgeAt.get(edge) ?? []),
            },
        },
    ].filter((member) => !leaveOut.has(member.kind as string));

    const extensions = checkedExtensions(options.extensions ?? {});
    const { name } = session.project;
    const document = {
        kind: DOCUMENT_KIND,
        version: VERSION,
        ...(name === null ? {} : { name }),
        generator: { name: "graphty-element", version: ENGINE_VERSIONS.element },
        requires: REQUIRED,
        members,
        ...(Object.keys(extensions).length === 0 ? {} : { extensions }),
    };

    const leftOut: ProjectProblem[] = session.runs
        .list()
        .filter((run) => !dispatcher.state.runs.has(run.id))
        .map((run) => ({ code: "W_RUN_PENDING", params: { slice: "runs", id: run.id } }));
    return { document, leftOut };
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
 * Empty the session, through the transaction.
 * @param tx - The transaction.
 */
async function clearInto(tx: TransactionScope): Promise<void> {
    for (const note of tx.notes.list()) {
        tx.notes.remove(note.id);
    }

    for (const layer of tx.styles.list()) {
        if (!layer.locked) {
            await tx.styles.remove(layer.id);
        }
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

    await tx.data.clear();
}

/**
 * Add a data member's graph.
 * @param tx - The transaction.
 * @param graph - The graph.
 * @returns The edge ids this session gave the file's edges, by position.
 */
async function importInto(tx: TransactionScope, graph: NodeLink): Promise<(EdgeId | undefined)[]> {
    const before = tx.data.edges().length;
    await tx.execute({ op: "data.apply", mutation: { kind: "add-nodes", records: graph.nodes, idPath: "id" } });
    await tx.execute({
        op: "data.apply",
        mutation: { kind: "add-edges", records: graph.links, source: "source", target: "target" },
    });
    return tx.data
        .edges()
        .slice(before)
        .map((edge) => edge.id);
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
    const { tx, problems } = opening;
    const first = (kind: MemberKind): Record<string, unknown> => doc.members.get(kind)?.[0] ?? {};
    const state = first("graphty-session");

    await clearInto(tx);
    await attempt(opening, "config", () =>
        tx.config.set({ ...(isObject(state.config) ? state.config : {}), name } as ProjectConfigPatch),
    );
    const edgeIds = await importInto(tx, graph);
    opening.restored.add("graph");
    const nodeIds = new Set(tx.data.nodes().map((node) => node.id));

    const layout = state.layout as
        | { id: string; engine: string; options: Record<string, unknown>; dimension: "2d" | "3d" }
        | undefined;
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
        | { nodes?: NodeId[]; edges?: number[] }
        | undefined;
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

                canned.set(run.id, {
                    result: createRunResult({
                        runId: run.id,
                        shape: run.shape,
                        fields: run.fields,
                        measured: run.measured,
                        graph: run.graph,
                        nodes: rowsOf(run.nodes.ids, run.nodes.columns, (node) =>
                            nodeIds.has(node) ? node : undefined,
                        ),
                        // Edges are keyed by position in the data; data that differs leaves them out.
                        edges: sameData
                            ? rowsOf(
                                  edgeIds.map((_, at) => at),
                                  run.edges.columns,
                                  (at) => edgeIds[at],
                              )
                            : [],
                        caveats: run.caveats,
                        durationMs: run.durationMs,
                    }),
                    caveats: run.caveats,
                    fields: run.fields,
                });
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

            tx.visibility.showContext = visibility.showContext === true;
        });
    }

    await addStylesAndNotes(opening, doc.members, remap, name);

    const views = (state.views ?? []) as never[];
    if (views.length > 0) {
        await attempt(opening, "views", () => tx.views.save(views));
    }
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
    readonly caveats: Caveats;
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
            out.push({ id, values } as ResultElementValues<Id>);
        }
    });
    return out;
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

/**
 * Build a session's project API.
 * @param session - The session.
 * @param dispatcher - Its dispatcher.
 * @param canned - Where saved results wait for the runs an open starts; the session's executor
 *     answers from it.
 * @param hooks - What the session lends it.
 * @param hooks.announce - Publishes `project:status`.
 * @param hooks.isDerived - Whether the element minted a run's id.
 * @returns The API.
 */
export function projectOf(
    session: GraphSession,
    dispatcher: Dispatcher,
    canned: CannedOutcomes,
    hooks: { readonly announce: (change: ProjectStatus) => void; readonly isDerived: (id: RunId) => boolean },
): ProjectApi {
    const { announce, isDerived } = hooks;
    // Clean means: the history's cursor is on the step that was on top at the last save or open
    // (null: the baseline), and nothing has been merged into that step or cleared from under it.
    let marker: string | null = null;
    let lost = false;
    let top: string | null = null;
    let last: ProjectStatus = { name: null, dirty: false };
    const topNow = (): string | null => session.history.steps[session.history.position - 1]?.id ?? null;
    const isDirty = (): boolean => lost || topNow() !== marker;
    const nameNow = (): string | null => session.config.name ?? null;
    const tell = (): void => {
        const now = { name: nameNow(), dirty: isDirty() };
        if (now.name !== last.name || now.dirty !== last.dirty) {
            last = now;
            announce(now);
        }
    };
    const mark = (): void => {
        marker = topNow();
        top = marker;
        lost = false;
        tell();
    };

    session.on("history:changed", ({ reason }) => {
        if (reason === "merge" && topNow() === marker) {
            lost = true;
        } else if (reason === "clear") {
            lost ||= top !== marker;
            marker = null;
        } else if (reason === "evict" && marker === null) {
            lost = true;
        }

        top = topNow();
        tell();
    });

    return {
        get name() {
            return nameNow();
        },
        get dirty() {
            return isDirty();
        },
        rename(name) {
            return session.config.set({ name } as ProjectConfigPatch);
        },
        save(options = {}) {
            const { document, leftOut } = write(session, dispatcher, isDerived, options);
            const text = JSON.stringify(document);
            mark();
            return Promise.resolve(
                Object.freeze({
                    text,
                    report: Object.freeze({
                        bytes: new TextEncoder().encode(text).length,
                        written: (document.members as { kind: string }[]).map((member) => member.kind),
                        leftOut,
                    }),
                }),
            );
        },
        async open(source, options = {}) {
            const text = await textOf(source, options.limits?.fileBytes ?? DEFAULT_FILE_BYTES);
            const doc = readDocument(text);
            const fileName = options.fileName ?? (source as { name?: unknown }).name;
            const isProject = doc.members.has("graphty-session");
            const problems = [...doc.problems];
            const restored = new Set<ProjectSlice>();

            if (isProject) {
                if (isDirty() && options.discard !== true) {
                    throw new GraphtyError({
                        code: "E_UNSAVED_CHANGES",
                        message:
                            "The session has unsaved changes. Pass { discard: true } to open the project over them.",
                        source: "data",
                    });
                }

                const data = doc.members.get("graphty-data")?.[0];
                if (data === undefined) {
                    throw badDocument({ member: "graphty-data" });
                }

                const graph = nodeLinkOf(data);
                const name = doc.name ?? nameOfFile(typeof fileName === "string" ? fileName : undefined);
                await session.transaction("Open project", (tx) =>
                    readProject({ tx, problems, restored }, doc, graph, name, canned),
                );
                // A project opens with a fresh history: its opened state is the baseline.
                session.history.clear();
                mark();
            } else {
                const data = doc.members.get("graphty-data")?.[0];
                const graph = data === undefined || session.data.nodes().length > 0 ? undefined : nodeLinkOf(data);
                await session.transaction("Open document", async (tx) => {
                    const opening = { tx, problems, restored };
                    if (graph !== undefined) {
                        await importInto(tx, graph);
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
                });
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
