/**
 * @file The project file: save a whole session to one JSON document and open it again.
 *
 * `session.project.save()` writes the data, the settings, the layout and where the nodes stand,
 * every finished run with its result as columns, the style layers in order, the filter, the kept
 * sets, the notes, the saved views, the selection, and an `app` slot the element stores untouched.
 * `session.project.open(source)` reads one back as ONE undoable step, through the same doors a
 * consumer uses, and reports by kind whatever did not come back. A saved run is not computed
 * again: its result is handed to the run in place of the work.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: the session entry point reaches it.
 */

import type { CameraState } from "../camera/types";
import type {
    EdgeId,
    FieldDescriptor,
    NodeId,
    ResultShape,
    RunId,
    SetDefinitionInput,
    StyleDocument,
} from "../catalog/types";
import { GraphtyError } from "../errors/GraphtyError";
import type { NotesDocument } from "./notes/types";
import type { AlgorithmRunCommand } from "./planning";
import type { Dispatcher } from "./project/Dispatcher";
import { createRunResult, type ResultElementValues } from "./results/RunResult";
import type { Caveats, RunExecutionContext, RunExecutor, RunOutcome } from "./runs";
import type {
    EdgeRecord,
    GraphSession,
    NodeRecord,
    PositionEntry,
    ProjectConfigPatch,
    TransactionScope,
} from "./types";
import type { RuleTree, TimeWindow } from "./visibility/filter";

/** The `format` every project file carries. */
const FORMAT = "graphty-project";

/** The newest version this element reads and the one it writes. */
const VERSION = 1;

/** One finished run as a project file keeps it: what ran, and what it found, as columns. */
interface SavedRun {
    /** The command that produced it, with its id. */
    readonly command: AlgorithmRunCommand & { readonly as: RunId };
    readonly shape: ResultShape;
    readonly fields: readonly FieldDescriptor[];
    readonly measured: { readonly nodes: number; readonly edges: number };
    readonly graph: Readonly<Record<string, unknown>>;
    readonly caveats: Caveats;
    readonly durationMs: number;
    /** Per node: the ids, and one array per field in the same order; null where a node has none. */
    readonly nodes: SavedColumns<NodeId>;
    /** Per edge, by the edge ids in `data.edges`. */
    readonly edges: SavedColumns<EdgeId>;
}

/** Element values stored as columns. */
interface SavedColumns<Id> {
    readonly ids: readonly Id[];
    readonly values: Readonly<Record<string, readonly unknown[]>>;
}

/**
 * A project file, version 1. The document `save` writes and `open` reads.
 *
 * DRAFT CONTRACT: the shape is awaiting the owner's approval and may still be renamed.
 */
export interface ProjectDocument {
    /** Always `"graphty-project"`. */
    readonly format: typeof FORMAT;
    /** The format version; a reader refuses one newer than it knows. */
    readonly version: number;
    readonly name?: string;
    /** When it was saved, as an RFC 3339 date-time. */
    readonly savedAt: string;
    /** The project settings. */
    readonly config: ProjectConfigPatch;
    /** The graph: every node and edge record. Edge ids are the ones the rest of the file uses. */
    readonly data: { readonly nodes: readonly NodeRecord[]; readonly edges: readonly EdgeRecord[] };
    readonly layout: {
        readonly id: string;
        readonly engine: string;
        readonly options: Readonly<Record<string, unknown>>;
        readonly dimension: "2d" | "3d";
    };
    /** Where each placed node stands. */
    readonly positions: readonly PositionEntry[];
    readonly pins: readonly NodeId[];
    /** The finished runs, in the order they were started. */
    readonly runs: readonly SavedRun[];
    /** The style layers, bottom first, with whether each is enabled. */
    readonly styles: StyleDocument;
    readonly visibility: {
        readonly filter: RuleTree | null;
        readonly window: TimeWindow | null;
        readonly showContext: boolean;
    };
    readonly sets: readonly { readonly id: string; readonly name: string; readonly definition: unknown }[];
    readonly notes: NotesDocument;
    readonly views: readonly { readonly name: string; readonly camera: CameraState }[];
    readonly selection: { readonly nodes: readonly NodeId[]; readonly edges: readonly EdgeId[] };
    /** The consumer's own state, stored and handed back untouched. */
    readonly app?: unknown;
}

/** What a project file holds, by kind: what an open report names. */
export type ProjectPart =
    | "data"
    | "config"
    | "layout"
    | "positions"
    | "runs"
    | "styles"
    | "visibility"
    | "sets"
    | "notes"
    | "views"
    | "selection";

/** What `project.open` brought back, and what it did not. */
export interface ProjectOpenReport {
    /** The project's name, from the file. */
    readonly name: string | null;
    /** The `app` slot as it was saved; undefined when the file has none. */
    readonly app: unknown;
    /** Everything that did not come back, by kind, each with the reason. Empty when all did. */
    readonly missing: readonly { readonly kind: ProjectPart; readonly id?: string; readonly reason: string }[];
}

/** How `project.save` writes the file. */
export interface ProjectSaveOptions {
    /** The consumer's own state to store with the project, as JSON-safe data. */
    readonly app?: unknown;
    /** The name to save under; it becomes `project.name`. */
    readonly name?: string;
}

/** Saving and opening a whole session. */
export interface ProjectApi {
    /** The project's name: from the last open or save, or set directly. Null until one is given. */
    name: string | null;
    /** Whether the project has changed since it was last saved or opened. */
    readonly dirty: boolean;
    /**
     * The whole session as a project document, synchronously.
     * @param options - The `app` slot and the name.
     * @returns The document.
     */
    toDocument(options?: ProjectSaveOptions): ProjectDocument;
    /**
     * Save the whole session as one JSON file. Clears `dirty`.
     * @param options - The `app` slot and the name.
     * @returns The file, `application/json`.
     */
    save(options?: ProjectSaveOptions): Promise<Blob>;
    /**
     * Open a project file in place of what the session holds, as one undoable step.
     * @param source - The file, its text, or the parsed document.
     * @returns What came back and what did not.
     * @throws A `GraphtyError` (as a rejection) with `E_PARSE_FAILED` for text that is not JSON,
     *     `E_BAD_DOCUMENT` for JSON that is not a project file, and `E_UNSUPPORTED_VERSION` for a
     *     file a newer element wrote; the session is left as it was.
     */
    open(source: Blob | string | ProjectDocument): Promise<ProjectOpenReport>;
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

/**
 * Store element values as columns.
 * @param ids - The elements, in order.
 * @param read - A result's values for one element.
 * @returns The columns; only the elements the result has values for.
 */
function columnsOf<Id extends NodeId>(
    ids: readonly Id[],
    read: (id: Id) => Readonly<Record<string, unknown>> | undefined,
): SavedColumns<Id> {
    const kept: Id[] = [];
    const values: Record<string, unknown[]> = {};
    for (const id of ids) {
        const record = read(id);
        if (record === undefined) {
            continue;
        }

        for (const field of Object.keys(record)) {
            values[field] ??= new Array<unknown>(kept.length).fill(null);
        }

        for (const [field, column] of Object.entries(values)) {
            column.push(record[field] ?? null);
        }

        kept.push(id);
    }

    return { ids: kept, values };
}

/**
 * Read columns back as element values.
 * @param columns - The columns.
 * @param mapId - Turns a saved id into the id this session holds, or undefined for one it lost.
 * @returns The values, in order.
 */
function valuesOf<Id extends NodeId>(
    columns: SavedColumns<Id>,
    mapId: (id: Id) => Id | undefined,
): ResultElementValues<Id>[] {
    const out: ResultElementValues<Id>[] = [];
    columns.ids.forEach((saved, index) => {
        const id = mapId(saved);
        if (id === undefined) {
            return;
        }

        const values: Record<string, unknown> = {};
        for (const [field, column] of Object.entries(columns.values)) {
            if (column[index] !== null && column[index] !== undefined) {
                values[field] = column[index];
            }
        }

        out.push({ id, values } as ResultElementValues<Id>);
    });
    return out;
}

/**
 * Refuse anything that is not a project file this element can read.
 * @param value - The parsed JSON.
 * @returns The document.
 */
function checked(value: unknown): ProjectDocument {
    const doc = value as Partial<ProjectDocument> | null;
    if (typeof doc !== "object" || doc === null || doc.format !== FORMAT) {
        throw new GraphtyError({
            code: "E_BAD_DOCUMENT",
            message: `This is not a graphty project file: it has no "format": "${FORMAT}".`,
            source: "data",
        });
    }

    if (typeof doc.version !== "number" || doc.version > VERSION) {
        throw new GraphtyError({
            code: "E_UNSUPPORTED_VERSION",
            message:
                `This project file is version ${String(doc.version)}, and this graphty-element reads up to ` +
                `version ${String(VERSION)}. Open it with a newer graphty-element.`,
            source: "data",
            details: { version: doc.version, supported: VERSION },
        });
    }

    return doc as ProjectDocument;
}

/**
 * Parse whatever `open` was handed.
 * @param source - A file, its text, or the document.
 * @returns The document.
 */
async function parse(source: Blob | string | ProjectDocument): Promise<ProjectDocument> {
    if (typeof source !== "string" && !(typeof Blob !== "undefined" && source instanceof Blob)) {
        return checked(source);
    }

    const text = typeof source === "string" ? source : await source.text();
    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch (error) {
        throw new GraphtyError({
            code: "E_PARSE_FAILED",
            message: "This project file is not JSON, so it cannot be opened.",
            source: "data",
            cause: error,
        });
    }

    return checked(value);
}

/**
 * The project settings worth saving: everything but who is writing, which belongs to the person.
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
 * Write the session as a project document.
 * @param session - The session.
 * @param dispatcher - Its dispatcher, whose `runs` slice holds each run's command.
 * @param options - The app slot and the name.
 * @param options.app - The consumer's own state, stored untouched.
 * @param options.name - The project's name, or null for none.
 * @returns The document.
 */
function write(
    session: GraphSession,
    dispatcher: Dispatcher,
    options: { readonly app?: unknown; readonly name: string | null },
): ProjectDocument {
    const nodes = session.data.nodes();
    const edges = session.data.edges();
    const nodeIds = nodes.map((node) => node.id);
    const edgeIds = edges.map((edge) => edge.id);

    const positions: PositionEntry[] = [];
    const at = { x: 0, y: 0, z: 0 };
    nodeIds.forEach((id, index) => {
        if (session.positions.isPlaced(index)) {
            session.positions.read(index, at);
            positions.push({ id, x: at.x, y: at.y, z: at.z });
        }
    });

    const runs: SavedRun[] = [];
    for (const [id, entry] of dispatcher.state.runs) {
        const { result } = entry;
        const { applySuggestedStyles: _dropped, ...command } = entry.command;
        runs.push({
            command: { ...command, as: id },
            shape: result.shape,
            fields: result.fields,
            measured: result.measured,
            graph: result.graph,
            caveats: entry.record.caveats,
            durationMs: entry.record.durationMs ?? 0,
            nodes: columnsOf(nodeIds, (node) => result.node(node)),
            edges: columnsOf(edgeIds, (edge) => result.edge(edge)),
        });
    }

    const { layout, visibility, selection } = session;
    const document: ProjectDocument = {
        format: FORMAT,
        version: VERSION,
        ...(options.name === null ? {} : { name: options.name }),
        savedAt: new Date().toISOString(),
        config: configOf(session),
        data: { nodes, edges },
        layout: { id: layout.id, engine: layout.engine, options: layout.options, dimension: layout.dimension },
        positions,
        pins: [...session.positions.pinned],
        runs,
        styles: session.styles.toDocument(),
        visibility: { filter: visibility.filter, window: visibility.window, showContext: visibility.showContext },
        sets: session.sets.list().map((set) => ({ id: set.id, name: set.name, definition: set.definition })),
        notes: session.notes.toDocument(),
        views: [...session.views].map(([name, camera]) => ({ name, camera })),
        selection: { nodes: [...selection.nodes], edges: [...selection.edges] },
        ...(options.app === undefined ? {} : { app: options.app }),
    };

    // A round trip through JSON, so the document holds exactly what the file will.
    return JSON.parse(JSON.stringify(document)) as ProjectDocument;
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
 * Read a document into the session, through the transaction.
 * @param tx - The transaction.
 * @param doc - The document.
 * @param canned - Where the saved results wait for their runs.
 * @param missing - Where what did not come back is written.
 */
async function readInto(
    tx: TransactionScope,
    doc: ProjectDocument,
    canned: CannedOutcomes,
    missing: ProjectOpenReport["missing"][number][],
): Promise<void> {
    /**
     * Do one part, and write its failure into the report rather than failing the open.
     * @param kind - The part.
     * @param work - The work.
     * @param id - What it was about, when one thing.
     */
    const attempt = async (kind: ProjectPart, work: () => Promise<unknown>, id?: string): Promise<void> => {
        try {
            await work();
        } catch (error) {
            missing.push({
                kind,
                ...(id === undefined ? {} : { id }),
                reason: error instanceof Error ? error.message : String(error),
            });
        }
    };

    await clearInto(tx);
    await attempt("config", () => tx.config.set(doc.config));

    await tx.execute({ op: "data.apply", mutation: { kind: "add-nodes", records: doc.data.nodes, idPath: "id" } });
    await tx.execute({
        op: "data.apply",
        mutation: {
            kind: "add-edges",
            records: doc.data.edges.map(({ id: _id, ...edge }) => edge),
            source: "source",
            target: "target",
        },
    });
    // Edges are numbered by the session that holds them; the file's numbers map by order.
    const edgeIds = new Map<EdgeId, EdgeId>();
    const held = tx.data.edges();
    doc.data.edges.forEach((edge, index) => {
        const now = held[index];
        if (now !== undefined) {
            edgeIds.set(edge.id, now.id);
        }
    });
    const nodeIds = new Set(tx.data.nodes().map((node) => node.id));

    await attempt("layout", async () => {
        await tx.layout.set(doc.layout.id, { engine: doc.layout.engine, options: doc.layout.options });
        await tx.layout.setDimension(doc.layout.dimension);
    });
    await attempt("positions", async () => {
        await tx.positions.set(doc.positions.filter((entry) => nodeIds.has(entry.id)));
        await tx.positions.pin(doc.pins);
    });

    // Before the runs: a run over the selection reads it.
    await attempt("selection", () =>
        tx.selection.apply({
            nodes: doc.selection.nodes.filter((node) => nodeIds.has(node)),
            edges: doc.selection.edges.flatMap((edge) => edgeIds.get(edge) ?? []),
        }),
    );

    // Sets before the runs, so a run over a set finds it. A set is minted a new id when the session
    // has already issued its old one, so every `{ set }` the file names is rewritten to the new id.
    const setIds = new Map<string, string>();
    const remap = <T>(value: T): T =>
        JSON.parse(JSON.stringify(value), (key, held: unknown) =>
            key === "set" && typeof held === "string" ? (setIds.get(held) ?? held) : held,
        ) as T;
    const createSet = (set: ProjectDocument["sets"][number]): void => {
        setIds.set(set.id, tx.sets.create(remap(set.definition) as SetDefinitionInput, { name: set.name }));
    };
    // A set that reads a result cannot be made until its run is back; it is tried again after them.
    const waiting = doc.sets.filter((set) => {
        try {
            createSet(set);
            return false;
        } catch {
            return true;
        }
    });

    for (const run of doc.runs) {
        const id = run.command.as;
        await attempt(
            "runs",
            async () => {
                canned.set(id, {
                    result: createRunResult({
                        runId: id,
                        shape: run.shape,
                        fields: run.fields,
                        measured: run.measured,
                        graph: run.graph,
                        nodes: valuesOf(run.nodes, (node) => (nodeIds.has(node) ? node : undefined)),
                        edges: valuesOf(run.edges, (edge) => edgeIds.get(edge)),
                        caveats: run.caveats,
                        durationMs: run.durationMs,
                    }),
                    caveats: run.caveats,
                    fields: run.fields,
                });
                const { algorithm, params, ...options } = remap(run.command);
                try {
                    await tx.runs.start(algorithm, params, { ...options, style: false });
                } finally {
                    canned.delete(id);
                }
            },
            id,
        );
    }

    for (const set of waiting) {
        await attempt(
            "sets",
            () => {
                createSet(set);
                return Promise.resolve();
            },
            set.id,
        );
    }

    await attempt("visibility", async () => {
        if (doc.visibility.filter !== null) {
            await tx.visibility.set(remap(doc.visibility.filter));
        }

        if (doc.visibility.window !== null) {
            await tx.visibility.setWindow(doc.visibility.window);
        }

        tx.visibility.showContext = doc.visibility.showContext;
    });

    await attempt("styles", async () => {
        const report = await tx.styles.applyTemplate(remap(doc.styles));
        for (const unbound of report.unbound) {
            missing.push({ kind: "styles", id: unbound.layerId, reason: unbound.reason });
        }
    });

    await attempt("notes", async () => {
        const report = tx.notes.mergeDocument(doc.notes, {
            onConflict: "replace",
            ...(doc.name === undefined ? {} : { name: doc.name }),
        });
        if (report.missing > 0) {
            missing.push({
                kind: "notes",
                reason: `${String(report.missing)} notes point at sets or results they no longer find.`,
            });
        }

        await Promise.resolve();
    });

    if (doc.views.length > 0) {
        await attempt("views", () => tx.views.save(doc.views));
    }
}

/**
 * Build a session's project API.
 * @param session - The session.
 * @param dispatcher - Its dispatcher.
 * @param canned - Where saved results wait for the runs an open starts; the session's executor
 *     answers from it.
 * @returns The API.
 */
export function projectOf(session: GraphSession, dispatcher: Dispatcher, canned: CannedOutcomes): ProjectApi {
    let dirty = false;
    session.on("project:changed", () => {
        dirty = true;
    });

    const api: ProjectApi = {
        name: null,
        get dirty() {
            return dirty;
        },
        toDocument(options = {}) {
            return write(session, dispatcher, { ...options, name: options.name ?? api.name });
        },
        save(options = {}) {
            const document = api.toDocument(options);
            api.name = document.name ?? null;
            dirty = false;
            return Promise.resolve(new Blob([JSON.stringify(document)], { type: "application/json" }));
        },
        async open(source) {
            const doc = await parse(source);
            const missing: ProjectOpenReport["missing"][number][] = [];
            await session.transaction(`Opened ${doc.name ?? "a project"}`, (tx) => readInto(tx, doc, canned, missing));
            api.name = doc.name ?? null;
            dirty = false;
            return Object.freeze({ name: api.name, app: doc.app, missing: Object.freeze(missing) });
        },
    };

    return api;
}
