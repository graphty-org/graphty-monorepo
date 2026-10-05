/**
 * @file The door list: every public member of graphty-element that could change it, and what
 * each one does about undo.
 *
 * A door is a public method, accessor or field. Each is classified as one of:
 *
 * - `readOnly`: it changes nothing;
 * - `exempt`, with the reason: it changes something no project file saves (the camera, the
 *   selection, work in flight, a machine preference);
 * - `dispatches`: it dispatches the command in its row, and nothing else;
 * - `partial`: it dispatches, but one call of it is not yet one step, until the issue it names
 *   is fixed;
 * - `knownGap`: it changes project state without the dispatcher, until the issue it names is
 *   fixed. With an `op` it will dispatch that op; without one it is a public escape (a writable
 *   field, a live array) that the issue narrows.
 *
 * The roots are the element, `Graph`, `Node`, `Edge`, the session and each of its parts, the
 * `Run` handle, the style layer, every manager, and every type a public member of one of them
 * hands back that has methods. `test/session/history/door-surface.test.ts` walks the declared
 * types of the roots with the TypeScript compiler and fails on any public member this list does
 * not classify, and on any handle type that is not a root, so nothing public can ship without a
 * decision about undo. `test/session/history/doors.test.ts` (the session's rows) and
 * `test/browser/doors.test.ts` (the renderer's rows) call every row that dispatches or will
 * dispatch, with a spy on the dispatcher, and hold the rule: no `knownGap` or `partial` row may
 * remain, and a `knownGap` door must dispatch nothing. A row of either kind names the GitHub
 * issue that tracks it, so a gap that has to land for a while is still on record.
 *
 * No entry point exports this module.
 */

import type { LayerSpec } from "../../catalog/types";
import type { SessionCommand } from "../planning";
import type { ImportSource } from "./data";

/** How the doors tests call a door. */
export type DoorCall =
    | {
          readonly kind: "call";
          /** The arguments, or a function building them where they cannot be plain data. */
          readonly args: readonly unknown[] | (() => readonly unknown[]);
          /**
           * For a door that does nothing in the doors test's default state: sets up the state it
           * acts on before the spy is attached, and returns what puts it back afterwards.
           */
          readonly around?: (target: object) => Promise<() => Promise<unknown>>;
      }
    | { readonly kind: "set"; readonly value: unknown };

/** What one door does about undo. */
export type Door =
    | { readonly kind: "readOnly" }
    | { readonly kind: "exempt"; readonly reason: string }
    | {
          readonly kind: "dispatches";
          readonly op: string;
          readonly call: DoorCall;
          /** The commands the call must dispatch, in order. */
          readonly expect: readonly unknown[];
      }
    | {
          readonly kind: "partial";
          /** The GitHub issue tracking it. */
          readonly issue: number;
          readonly reason: string;
          readonly op: string;
          readonly call: DoorCall;
          readonly expect: readonly unknown[];
      }
    | {
          readonly kind: "knownGap";
          /** The GitHub issue tracking it. */
          readonly issue: number;
          /** The op it will dispatch once ported; absent for an escape the issue narrows. */
          readonly op?: string;
          /** How to call it; present exactly when `op` is. */
          readonly call?: DoorCall;
      };

/** A type whose public members are doors. */
export interface DoorRoot {
    /** The declared name of the class or interface. */
    readonly name: string;
    /** The file declaring it, relative to the package root. */
    readonly file: string;
    /** Which doors test calls its rows: the Node one on a session, or the browser one on a `Graph`. */
    readonly half: "session" | "renderer";
    /** One row per public member. */
    readonly doors?: Readonly<Record<string, Door>>;
    /** For a type every member of which has the same answer: that answer. */
    readonly whole?: Door;
}

const READ: Door = { kind: "readOnly" };

/**
 * An exempt door.
 * @param reason - Why it changes nothing a project file saves.
 * @returns The door.
 */
function exempt(reason: string): Door {
    return { kind: "exempt", reason };
}

/**
 * A door that dispatches, called as a method.
 * @param args - The arguments to call it with, or a function building them where they cannot be
 *     plain data.
 * @param expect - The commands the call must dispatch, in order; the first names its op.
 * @returns The door.
 */
function calls(args: readonly unknown[] | (() => readonly unknown[]), expect: readonly SessionCommand[]): Door {
    return { kind: "dispatches", op: expect[0]?.op ?? "", call: { kind: "call", args }, expect };
}

/**
 * A property door that dispatches, called by assignment.
 * @param value - The value to assign.
 * @param expect - The commands the assignment must dispatch, in order; the first names its op.
 * @returns The door.
 */
function assigns(value: unknown, expect: readonly SessionCommand[]): Door {
    return { kind: "dispatches", op: expect[0]?.op ?? "", call: { kind: "set", value }, expect };
}

/**
 * The command adding node records.
 * @param records - The records.
 * @returns The command.
 */
function addNodes(...records: Readonly<Record<string, unknown>>[]): SessionCommand {
    return { op: "data.apply", mutation: { kind: "add-nodes", records } };
}

/**
 * The command adding edge records.
 * @param records - The records.
 * @returns The command.
 */
function addEdges(...records: Readonly<Record<string, unknown>>[]): SessionCommand {
    return { op: "data.apply", mutation: { kind: "add-edges", records } };
}

/**
 * The command giving one row new values.
 * @param target - Node or edge.
 * @param id - Its id.
 * @param values - The new values.
 * @returns The command.
 */
function updateRow(target: "node" | "edge", id: string, values: Readonly<Record<string, unknown>>): SessionCommand {
    return { op: "data.apply", mutation: { kind: "update-rows", target, rows: [{ id, values }] } };
}

/**
 * A command removing rows, or emptying the graph.
 * @param kind - Which removal.
 * @param ids - The ids.
 * @returns The command.
 */
function removes(kind: "remove-nodes" | "remove-edges", ids: readonly string[]): SessionCommand {
    return { op: "data.apply", mutation: { kind, ids } };
}

/** The command emptying the graph. */
const CLEAR: SessionCommand = { op: "data.apply", mutation: { kind: "clear" } };

/**
 * A batch, followed by its members as each is dispatched.
 * @param label - The batch's label.
 * @param steps - Its members.
 * @returns What a door dispatching it dispatches, in order.
 */
function batchOf(label: string, ...steps: SessionCommand[]): SessionCommand[] {
    return [{ op: "batch", label, steps }, ...steps];
}

/** What the element's pair adds to an import: the key its two assignments coalesce under. */
interface ImportExtra {
    readonly coalesce?: string;
}

/**
 * An import through a data source, as a door dispatches it.
 * @param mode - Replace or merge.
 * @param source - The data source's name and options.
 * @param extra - The element's coalesce key, when it is the element's pair.
 * @returns The command.
 */
function imports(mode: "replace" | "merge", source: ImportSource, extra: ImportExtra = {}): SessionCommand {
    return { op: "data.import", source, mode, ...extra };
}

/** The data rows the element and `Graph` share. */
const DATA_DOORS: Readonly<Record<string, Door>> = {
    addNode: calls([{ id: "door-a" }], [addNodes({ id: "door-a" })]),
    addNodes: calls([[{ id: "door-b" }]], [addNodes({ id: "door-b" })]),
    addEdge: calls([{ src: "n1", dst: "n3" }], [addEdges({ src: "n1", dst: "n3" })]),
    addEdges: calls([[{ src: "n3", dst: "n1" }]], [addEdges({ src: "n3", dst: "n1" })]),
    updateNodes: calls([[{ id: "n1", weight: 2 }]], [updateRow("node", "n1", { weight: 2 })]),
    updateEdges: calls([[{ id: "0", weight: 2 }]], [updateRow("edge", "0", { weight: 2 })]),
    removeEdges: calls([["0"]], [removes("remove-edges", ["0"])]),
};

/** Pinning node n1, as the element's and a `Node`'s doors dispatch it. */
const PIN_N1: SessionCommand = { op: "positions.pin", ids: ["n1"], pinned: true };

/** Releasing node n1. */
const UNPIN_N1: SessionCommand = { op: "positions.pin", ids: ["n1"], pinned: false };

/** The element's and `Graph`'s node removal. */
const REMOVE_NODES = calls([["n3"]], [removes("remove-nodes", ["n3"])]);

/** The element's and `Graph`'s clear. */
const CLEAR_DATA = calls([], [CLEAR]);

/** A small graph document the JSON data source reads, for the load doors. */
const TINY_JSON = JSON.stringify({ nodes: [{ id: "j1" }, { id: "j2" }], edges: [{ src: "j1", dst: "j2" }] });

/**
 * The document's bytes: what a file or a fetched URL is handed to the reader as, for the importer
 * to decode.
 */
const TINY_JSON_BYTES = new TextEncoder().encode(TINY_JSON);

/** The same document as a URL. */
const TINY_JSON_URL = `data:application/json,${encodeURIComponent(TINY_JSON)}`;

/** Adding a graph from a data source: merged into the graph, as the door always has. */
const ADD_FROM_SOURCE = calls(
    ["json", { data: TINY_JSON }],
    [imports("merge", { type: "json", config: { data: TINY_JSON } })],
);

/** Loading from a URL: the text fetched, and the id path the element reads. */
const LOAD_FROM_URL = calls(
    [TINY_JSON_URL],
    [imports("merge", { type: "json", config: { data: TINY_JSON_BYTES, nodeIdPath: "id" } })],
);

/**
 * Loading from a URL on the element, whose rows above set the node id path to `key` and the edge
 * id paths to `src` and `dst`, which the load names as the ids and the endpoints to read.
 */
const LOAD_FROM_URL_ELEMENT = calls(
    [TINY_JSON_URL],
    [
        imports("merge", {
            type: "json",
            config: { data: TINY_JSON_BYTES, nodeIdPath: "key", edgeSource: "src", edgeTarget: "dst" },
        }),
    ],
);

/** Loading from a file: its bytes, its name and its size. */
const LOAD_FROM_FILE = calls(
    () => [new File([TINY_JSON], "door.json", { type: "application/json" })],
    [
        imports("merge", {
            type: "json",
            config: { data: TINY_JSON_BYTES, filename: "door.json", size: TINY_JSON.length },
        }),
    ],
);

const CAMERA = exempt("The camera is view state, not saved in a project file.");
const XR = exempt("An XR device session is view state, not saved in a project file.");
const SELECTION = exempt("Selection is not a step; undo and redo select what they changed instead.");
const LISTEN = exempt("Subscribing observes changes and makes none.");
const LIFECYCLE = exempt("Lifecycle of the element or a part of it; the history is discarded with the session.");
const PROFILING = exempt("Profiling measures the renderer; it changes nothing a project file saves.");
const MACHINE = exempt("A preference about this machine's hardware, not about the graph.");
const CAPTURE = exempt("A capture reads the picture; it changes nothing.");
const TRANSPORT = exempt(
    "In-flight layout computation; where the layout comes to rest is recorded with the step that moved it.",
);
const RENDER = exempt(
    "A render object or render bookkeeping, derived from project state and rewritten by the derivation pass.",
);
const HISTORY = exempt("Moves through the history or groups commands into a step; it is not a step itself.");
const INPUT = exempt("Input handling and input preferences; the gestures it drives are doors of their own.");
const IN_FLIGHT = exempt("Stops or pauses work in flight; work in flight is not saved.");
const VIEW_SETTING = exempt("A rendering preference of this view, not saved in a project file.");
const HOST_HOOK = exempt("A function the host supplies; a project file cannot save it.");
const ASSISTANT = exempt(
    "The assistant's connection and status, not project state; what it does to the graph goes through the doors.",
);
const DERIVED = exempt("Derived from project state and rewritten whenever that state changes.");
const EXECUTE = exempt(
    "Runs a command; every op declares itself in COMMANDS, and the verb it reaches has its own row.",
);
const TOOLS = exempt("Registers or lists assistant tools; it runs none of them.");
const PALETTE_DEFAULTS = exempt(
    "Chooses the palette a layer written later takes when it names none; a project file saves the layer's resolved palette, and a reapply rewrites layers through style.patch.",
);
const QUEUE = exempt("Schedules work; the doors that queue work have their own rows.");
const EVENTS = exempt("Publishes and subscribes to events; it changes no state.");
const KEYS = exempt("API keys are secrets of this machine, never saved in a project file.");
const TEST_INPUT = exempt("Synthetic input for tests; the gestures it drives are doors of their own.");
const MASK = exempt(
    "A live mask: the selection, which is not a step, or the visible set, derived from the visibility slice.",
);
const LLM = exempt("Talks to a language model; changes nothing in the graph.");
const BUDGET = exempt("The history's own budget, not project state.");
const GESTURE = exempt(
    "Part of a node drag, which the element records as one step of its own: a transaction opened at drag " +
        "start and recorded at the drop with the positions.set and positions.pin it dispatches; checked by " +
        "test/browser/history-drag.test.ts.",
);
const MESSAGE = exempt(
    "An assistant message: one transaction, stamped via assistant, that every tool writes through as ctx.tx; " +
        "checked by test/browser/ai/assistant-history.test.ts.",
);
const TOOL = exempt("An assistant tool: it writes through ctx.tx, which joins the message's transaction.");
const LANE = exempt(
    "The layout lane: coordinates a layout, a drag or a GPU readback writes while it works, recorded into the " +
        "step on top when the layout comes to rest. The renderer's engines write it here; a consumer places " +
        "nodes through session.positions.set, and reads a snapshot whose coordinate columns are copies.",
);

/**
 * The command a door running `degree` dispatches. The layers the run paints are planned into its
 * own step when it finishes, so they are not dispatched.
 */
const RUN_DEGREE: SessionCommand = { op: "algo.run", algorithm: "degree" };

/** The command a 1.10 address dispatches: `degree` constructed and run the way a plugin is. */
const LEGACY_DEGREE: SessionCommand = { op: "algo.legacy", namespace: "graphty", type: "degree" };

/**
 * Turn the template's on-load algorithms on for one call, with `degree` in them, and off again.
 * @param target - The graph.
 * @returns What turns them off.
 */
async function withTemplateDegree(target: object): Promise<() => Promise<unknown>> {
    const { config } = (target as { getSession(): { config: { set(values: object): Promise<unknown> } } }).getSession();
    await config.set({ runAlgorithmsOnLoad: true, data: { algorithms: ["degree"] } });
    return () => config.set({ runAlgorithmsOnLoad: false, data: { algorithms: [] } });
}

/** The note the notes doors write. */
const DOOR_NOTE_INPUT = { text: "door note", targets: [{ node: "d1" }] };

/** The notes member the merge door opens. */
const DOOR_NOTES_DOCUMENT = {
    kind: "graphty-notes",
    version: 1,
    notes: [{ id: "note_door", time: "2026-10-01T09:00:00.000Z", targets: [{ node: "d1" }], text: "door note" }],
};

/** The id of the note a notes door edits: minted, so known only once `around` has added it. */
const DOOR_NOTE = { id: "" };

/**
 * A notes door that acts on a note, added before the spy is attached.
 * @param args - The arguments, read once the note exists.
 * @param expect - The commands the call must dispatch; their `id` reads the note's.
 * @returns The door.
 */
function withDoorNote(args: () => readonly unknown[], expect: readonly unknown[]): Door {
    return {
        kind: "dispatches",
        op: (expect[0] as { op: string }).op,
        call: {
            kind: "call",
            args,
            around: (target) => {
                DOOR_NOTE.id = (target as { add(input: unknown): string }).add(DOOR_NOTE_INPUT);
                return Promise.resolve(() => Promise.resolve());
            },
        },
        expect,
    };
}

/** The rows of `GraphSession`, shared with the element's wider form of it. */
const SESSION: Readonly<Record<string, Door>> = {
    data: READ,
    runs: READ,
    results: READ,
    scope: READ,
    sets: READ,
    notes: READ,
    selection: READ,
    visibility: READ,
    styles: READ,
    views: READ,
    layout: READ,
    positions: READ,
    seededNodeCount: READ,
    status: READ,
    catalog: READ,
    config: READ,
    capabilities: READ,
    acceleration: MACHINE,
    setAccelerator: MACHINE,
    // Its coordinate and pin columns are copies, so a write there moves nothing.
    snapshot: READ,
    fingerprint: READ,
    // What a find box lists; selects nothing.
    find: READ,
    run: calls([{ op: "algo.run", algorithm: "degree" }], [RUN_DEGREE]),
    execute: EXECUTE,
    undo: HISTORY,
    redo: HISTORY,
    canUndo: READ,
    canRedo: READ,
    history: READ,
    project: READ,
    transaction: HISTORY,
    estimate: READ,
    plan: READ,
    on: LISTEN,
    dispose: LIFECYCLE,
};

/** A batch: what its callback adds through `tx` is dispatched as the batch's own step. */
const BATCH = calls(
    () => [
        (tx: { data: { addNodes(records: readonly object[]): Promise<void> } }) =>
            tx.data.addNodes([{ id: "door-batch" }]),
    ],
    [addNodes({ id: "door-batch" })],
);

/** The command switching to 2D. */
const DIMENSION_2D: SessionCommand = { op: "view.dimension", dimension: "2d" };

/** The command choosing the circular layout through a door that takes an engine name. */
const SET_CIRCULAR: SessionCommand = { op: "layout.set", id: "circular", engine: "circular", options: {} };

/** The rows of `SelectionApi`, shared with the element's wider form of it. */
const SELECTION_API: Readonly<Record<string, Door>> = {
    nodes: READ,
    edges: READ,
    size: READ,
    cap: READ,
    truncated: READ,
    has: READ,
    nodeMask: READ,
    edgeMask: READ,
    apply: SELECTION,
    clear: SELECTION,
    // The doors test selects node "d1" before calling it.
    promote: calls(
        ["door set"],
        [
            {
                op: "set.create",
                id: "set_door-set",
                name: "door set",
                order: 1,
                definition: { kind: "fixed", nodes: ["d1"], edges: [], reading: "induced" },
                createdFrom: { kind: "selection" },
            } as unknown as SessionCommand,
        ],
    ),
    statistics: READ,
};

/** The rows of `VisibilityApi`, shared with the element's wider form of it. */
const VISIBILITY_API: Readonly<Record<string, Door>> = {
    nodeMask: READ,
    edgeMask: READ,
    isVisible: READ,
    nodes: READ,
    edges: READ,
    summary: READ,
    filter: READ,
    window: READ,
    set: calls([{ kind: "degree", min: 1 }], [{ op: "visibility.set", filter: { kind: "degree", min: 1 } }]),
    setWindow: calls(
        [{ attribute: "data.t", from: 0, to: 1 }],
        [{ op: "visibility.window", window: { attribute: "data.t", from: 0, to: 1 } }],
    ),
    showContext: assigns(true, [{ op: "visibility.context", show: true }]),
};

/** A layer the style doors add. */
const DOOR_LAYER: LayerSpec = {
    name: "door layer",
    target: "node",
    selector: { match: "everything" },
    set: { "node.color": "#ff0000" },
};

/** The rows of `StylesApi`, shared with the element's wider form of it. */
const STYLES_API: Readonly<Record<string, Door>> = {
    list: READ,
    get: READ,
    validate: READ,
    add: calls([DOOR_LAYER], [{ op: "style.patch", action: "add", spec: DOOR_LAYER }]),
    // A refused edit is still dispatched: it is refused where it executes, and records nothing.
    update: calls(
        ["no-such-layer", { name: "renamed" }],
        [{ op: "style.patch", action: "update", id: "no-such-layer", patch: { name: "renamed" } }],
    ),
    remove: calls(["no-such-layer"], [{ op: "style.patch", action: "remove", id: "no-such-layer" }]),
    move: calls(["no-such-layer", null], [{ op: "style.patch", action: "move", id: "no-such-layer", before: null }]),
    removeBySource: calls([() => false], [{ op: "style.patch", action: "removeBySource", ids: [] }]),
    encode: calls(
        [{ run: "no-such-run", field: "value", channel: "node.color" }],
        [{ op: "style.encode", spec: { run: "no-such-run", field: "value", channel: "node.color" } }],
    ),
    highlight: calls(
        [{ run: "no-such-run" }],
        [{ op: "style.patch", action: "highlight", spec: { run: "no-such-run" } }],
    ),
    legend: READ,
    proposeEncoding: READ,
    settled: READ,
    explain: READ,
    resolveToStatic: calls(
        ["no-such-layer", "node.color"],
        [{ op: "style.patch", action: "resolveToStatic", id: "no-such-layer", channel: "node.color" }],
    ),
    setValueHidden: calls(
        ["no-such-layer", "node.color", 0, true],
        [{ op: "style.patch", action: "update", id: "no-such-layer", patch: {} }],
    ),
    applyTemplate: calls(
        [{ version: 1, layers: [] }],
        [{ op: "style.template", document: { version: 1, layers: [] } }],
    ),
    toDocument: READ,
    setDefaultPalettes: PALETTE_DEFAULTS,
};

/**
 * What applying the suggested styles of `degree` on the doors tests' small graph dispatches: the
 * run's suggested colour, in the call's one step. An unnamed degree run is named after its
 * algorithm, so the id is "degree" on every such graph.
 */
const DEGREE_ENCODE: SessionCommand = {
    op: "style.encode",
    spec: { run: "degree", field: "value", channel: "node.color" },
};

/** Every root, and the door of every public member. */
export const DOOR_ROOTS: readonly DoorRoot[] = [
    {
        name: "Graphty",
        file: "src/graphty-element.ts",
        half: "renderer",
        doors: {
            session: READ,
            nodeLabelCounts: READ,
            setDefaultPalettes: PALETTE_DEFAULTS,
            run: calls(["degree"], [RUN_DEGREE]),
            select: SELECTION,
            connectedCallback: LIFECYCLE,
            firstUpdated: LIFECYCLE,
            asyncFirstUpdated: LIFECYCLE,
            render: LIFECYCLE,
            disconnectedCallback: LIFECYCLE,
            // Called while the element holds n1, n2 and n3: the ones not named again go.
            nodeData: assigns(
                [{ id: "x1" }],
                batchOf("Replaced the nodes", removes("remove-nodes", ["n1", "n2", "n3"]), addNodes({ id: "x1" })),
            ),
            // The row above took every edge with the nodes, so there is nothing to remove.
            edgeData: assigns(
                [{ src: "n1", dst: "n2" }],
                batchOf("Replaced the edges", addEdges({ src: "n1", dst: "n2" })),
            ),
            dataSource: assigns("json", [imports("replace", { type: "json" }, { coalesce: "element-source" })]),
            // A URL rather than inline text, so the getter reads back exactly the value set: the
            // graph keeps where it was loaded from, never the text itself.
            dataSourceConfig: assigns({ url: TINY_JSON_URL }, [
                imports("replace", { type: "json", config: { url: TINY_JSON_URL } }, { coalesce: "element-source" }),
            ]),
            clearData: CLEAR_DATA,
            // Each property row assigns a value other than its default, so the assignment is a step undo
            // can take back. Assigning the default records no step and reads back as the value in
            // effect; test/browser/doors.test.ts checks that separately.
            nodeIdPath: assigns("key", [
                { op: "config.set", values: { data: { knownFields: { nodeIdPath: "key" } } } },
            ]),
            edgeSrcIdPath: assigns("src", [
                { op: "config.set", values: { data: { knownFields: { edgeSrcIdPath: "src" } } } },
            ]),
            edgeDstIdPath: assigns("dst", [
                { op: "config.set", values: { data: { knownFields: { edgeDstIdPath: "dst" } } } },
            ]),
            edgeIdPath: assigns("id", [{ op: "config.set", values: { data: { knownFields: { edgeIdPath: "id" } } } }]),
            repeatedEdges: assigns("first", [
                { op: "config.set", values: { data: { knownFields: { repeatedEdges: "first" } } } },
            ]),
            nodeLabelPath: assigns("label", [
                { op: "config.set", values: { data: { knownFields: { nodeLabelPath: "label" } } } },
            ]),
            edgeWeightPath: assigns("w", [
                { op: "config.set", values: { data: { knownFields: { edgeWeightPath: "w" } } } },
            ]),
            positionScale: assigns(2, [{ op: "config.set", values: { data: { knownFields: { positionScale: 2 } } } }]),
            directed: assigns(true, [{ op: "config.set", values: { data: { directed: true } } }]),
            layout: assigns("circular", [
                { op: "layout.set", id: "circular", engine: "circular", options: {}, coalesce: "element-layout" },
            ]),
            layoutScope: assigns({ nodes: ["n1", "n2"] }, [{ op: "layout.scope", scope: { nodes: ["n1", "n2"] } }]),
            // Called after the row above: the options are the layout's, now circular.
            layoutConfig: assigns({}, [
                { op: "layout.set", id: "circular", engine: "circular", options: {}, coalesce: "element-layout" },
            ]),
            // The getter reads all three pacing settings as they are in effect, so the row names them all.
            layoutBehavior: assigns({ layout: { preSteps: 5, stepMultiplier: 1, minDelta: 0 } }, [
                { op: "config.set", values: { layoutBehavior: { preSteps: 5, stepMultiplier: 1, minDelta: 0 } } },
            ]),
            labelDeclutter: VIEW_SETTING,
            selectionStyle: assigns({ color: "#ff0000" }, [
                { op: "config.set", values: { selectionStyle: { color: "#ff0000" } } },
            ]),
            algorithmsOnLoad: assigns([], [{ op: "config.set", values: { data: { algorithms: [] } } }]),
            viewMode: assigns("2d", [DIMENSION_2D]),
            layout2d: assigns(true, [DIMENSION_2D]),
            background: assigns({ backgroundType: "color", color: "#101010" }, [
                { op: "config.set", values: { background: { backgroundType: "color", color: "#101010" } } },
            ]),
            startingCameraDistance: CAMERA,
            autoFrame: CAMERA,
            runAlgorithmsOnLoad: assigns(true, [{ op: "config.set", values: { runAlgorithmsOnLoad: true } }]),
            historyKeys: INPUT,
            enableDetailedProfiling: PROFILING,
            xr: XR,
            captureScreenshot: CAPTURE,
            canCaptureScreenshot: READ,
            captureAnimation: CAPTURE,
            cancelAnimationCapture: CAPTURE,
            isAnimationCapturing: READ,
            estimateAnimationCapture: READ,
            getViewMode: READ,
            setViewMode: calls(["2d"], [DIMENSION_2D]),
            isVRSupported: READ,
            isARSupported: READ,
            getCameraState: READ,
            setCameraState: CAMERA,
            setCameraPosition: CAMERA,
            setCameraTarget: CAMERA,
            setCameraZoom: CAMERA,
            setCameraPan: CAMERA,
            resetCamera: CAMERA,
            zoomStep: CAMERA,
            zoomToSelection: CAMERA,
            zoomToNodes: CAMERA,
            saveCameraPreset: calls(
                ["door view", { zoom: 2 }],
                [{ op: "view.save", views: [{ name: "door view", camera: { zoom: 2 } }] }],
            ),
            removeCameraPreset: calls(["door view"], [{ op: "view.remove", names: ["door view"] }]),
            loadCameraPreset: CAMERA,
            getCameraPresets: READ,
            exportCameraPresets: READ,
            exportGraph: READ,
            downloadProject: exempt(
                "Hands the saved project to the reader as a file; it changes nothing a project saves.",
            ),
            importCameraPresets: calls(
                [{ "door import": { zoom: 3 } }],
                [{ op: "view.save", views: [{ name: "door import", camera: { zoom: 3 } }] }],
            ),
            graph: READ,
            ...DATA_DOORS,
            removeNodes: REMOVE_NODES,
            addDataFromSource: ADD_FROM_SOURCE,
            loadFromUrl: LOAD_FROM_URL_ELEMENT,
            loadFromFile: LOAD_FROM_FILE,
            pin: calls([["n1"]], [PIN_N1]),
            unpin: calls([["n1"]], [UNPIN_N1]),
            isPinned: READ,
            pinnedNodes: READ,
            getNode: READ,
            getNodes: READ,
            getNodeCount: READ,
            getEdgeCount: READ,
            selectNode: SELECTION,
            deselectNode: SELECTION,
            getSelectedNode: READ,
            isNodeSelected: READ,
            runAlgorithm: calls(["graphty", "degree"], [RUN_DEGREE]),
            applySuggestedStyles: calls(["graphty:degree"], [DEGREE_ENCODE]),
            getSuggestedStyles: READ,
            setLayout: calls(["circular"], [SET_CIRCULAR]),
            zoomToFit: CAMERA,
            waitForSettled: READ,
            waitForStableFrame: READ,
            isFrameStable: READ,
            batchOperations: BATCH,
            on: LISTEN,
            addListener: LISTEN,
            listenerCount: READ,
            is2D: READ,
            setXRConfig: XR,
            getXRConfig: READ,
            exitXR: XR,
            resolveCameraPreset: READ,
            applyCameraView: CAMERA,
            setInputEnabled: INPUT,
            shutdown: LIFECYCLE,
            isRunning: READ,
            setRunning: IN_FLIGHT,
            worldToScreen: READ,
            screenToWorld: READ,
            setData: calls(
                [{ nodes: [{ id: "d1" }], edges: [] }],
                batchOf("Set the graph data", addNodes({ id: "d1" })),
            ),
            getStyles: READ,
            getDataManager: READ,
            getLayoutManager: READ,
            getUpdateManager: READ,
            getStatsManager: READ,
            getSelectionManager: READ,
            getEventManager: READ,
            getScene: READ,
            getMeshCache: READ,
            setCameraMode: CAMERA,
            getCameraController: READ,
            setRenderSettings: VIEW_SETTING,
            getNodeMesh: READ,
            getXRSessionManager: READ,
            enableAiControl: ASSISTANT,
            disableAiControl: ASSISTANT,
            aiCommand: MESSAGE,
            getAiStatus: READ,
            onAiStatusChange: LISTEN,
            cancelAiCommand: IN_FLIGHT,
            getAiManager: READ,
            isAiEnabled: READ,
            retryLastAiCommand: MESSAGE,
            getApiKeyManager: READ,
            getVoiceAdapter: READ,
            startVoiceInput: INPUT,
            stopVoiceInput: INPUT,
            isVoiceActive: READ,
            acceleration: MACHINE,
            accelerationMinNodes: MACHINE,
            renderer: MACHINE,
            rendererStatus: READ,
        },
    },
    {
        name: "Graph",
        file: "src/Graph.ts",
        half: "renderer",
        doors: {
            styles: READ,
            element: RENDER,
            canvas: RENDER,
            engine: RENDER,
            scene: RENDER,
            camera: CAMERA,
            skybox: RENDER,
            xrHelper: XR,
            pinOnDrag: INPUT,
            fetchNodes: HOST_HOOK,
            fetchEdges: HOST_HOOK,
            initialized: LIFECYCLE,
            runAlgorithmsOnLoad: assigns(false, [{ op: "config.set", values: { runAlgorithmsOnLoad: false } }]),
            enableDetailedProfiling: PROFILING,
            acceleration: READ,
            setRenderer: MACHINE,
            rendererRequest: READ,
            rendererStatus: READ,
            eventManager: READ,
            nodeLabelCounts: READ,
            onNodeLabelCounts: READ,
            shutdown: LIFECYCLE,
            runAlgorithmsFromTemplate: {
                kind: "dispatches",
                op: "algo.run",
                call: { kind: "call", args: [], around: withTemplateDegree },
                expect: [RUN_DEGREE],
            },
            init: LIFECYCLE,
            update: RENDER,
            setBackground: calls(
                [{ backgroundType: "color", color: "#202020" }],
                [{ op: "config.set", values: { background: { backgroundType: "color", color: "#202020" } } }],
            ),
            setSelectionStyle: calls(
                [{ color: "#00ff00" }],
                [{ op: "config.set", values: { selectionStyle: { color: "#00ff00" } } }],
            ),
            setLayoutBehavior: calls(
                [{ layout: { preSteps: 0 } }],
                [{ op: "config.set", values: { layoutBehavior: { preSteps: 0 } } }],
            ),
            getLayoutBehavior: READ,
            addDataFromSource: ADD_FROM_SOURCE,
            loadFromFile: LOAD_FROM_FILE,
            loadFromUrl: LOAD_FROM_URL,
            ...DATA_DOORS,
            // Called while the graph holds every node the rows above left: naming them all again removes none.
            setNodes: calls(
                [
                    [
                        { id: "n1" },
                        { id: "n2" },
                        { id: "n3" },
                        { id: "door-a" },
                        { id: "door-b" },
                        { id: "j1" },
                        { id: "j2" },
                    ],
                ],
                batchOf(
                    "Replaced the nodes",
                    addNodes(
                        { id: "n1" },
                        { id: "n2" },
                        { id: "n3" },
                        { id: "door-a" },
                        { id: "door-b" },
                        { id: "j1" },
                        { id: "j2" },
                    ),
                ),
            ),
            // Called while the graph holds the edges the rows above left.
            setEdges: calls(
                [[{ src: "n1", dst: "n2" }]],
                batchOf(
                    "Replaced the edges",
                    removes("remove-edges", ["1", "2", "3", "4", "5", "6"]),
                    addEdges({ src: "n1", dst: "n2" }),
                ),
            ),
            getLayoutScope: READ,
            setLayoutScope: calls([{ nodes: ["n1", "n2"] }], [{ op: "layout.scope", scope: { nodes: ["n1", "n2"] } }]),
            setLayout: calls(["circular"], [SET_CIRCULAR]),
            runAlgorithm: calls(["graphty", "degree"], [RUN_DEGREE]),
            // Its own id, so the run the row above left finished is not simply handed back.
            run: calls(["degree", {}, { as: "door-run" }], [{ op: "algo.run", algorithm: "degree", as: "door-run" }]),
            // Both finished `degree` runs the rows above left, in one step.
            applySuggestedStyles: calls(
                ["graphty:degree"],
                [
                    DEGREE_ENCODE,
                    { op: "style.encode", spec: { run: "door-run", field: "value", channel: "node.color" } },
                ],
            ),
            getSuggestedStyles: READ,
            removeNodes: REMOVE_NODES,
            setCameraMode: CAMERA,
            setRenderSettings: VIEW_SETTING,
            batchOperations: BATCH,
            getSession: READ,
            getNodeCount: READ,
            getEdgeCount: READ,
            on: LISTEN,
            addListener: LISTEN,
            removeListener: LISTEN,
            clearData: CLEAR_DATA,
            listenerCount: READ,
            zoomToFit: CAMERA,
            getStyles: READ,
            getStylePainter: READ,
            getDataManager: READ,
            getLayoutManager: READ,
            getUpdateManager: READ,
            getMeshCache: READ,
            getScene: READ,
            getStatsManager: READ,
            getSelectionManager: READ,
            getEventManager: READ,
            getAcceleration: READ,
            getSelectedNode: READ,
            selectNode: SELECTION,
            deselectNode: SELECTION,
            isNodeSelected: READ,
            select: SELECTION,
            is2D: READ,
            getViewMode: READ,
            setStartingCameraDistance: CAMERA,
            getAutoFrame: READ,
            setAutoFrame: CAMERA,
            setViewMode: calls(["2d"], [DIMENSION_2D]),
            getConfig: READ,
            isRunning: READ,
            setRunning: IN_FLIGHT,
            getXRConfig: READ,
            setXRConfig: XR,
            getXRSessionManager: READ,
            isVRSupported: READ,
            isARSupported: READ,
            input: INPUT,
            setInputEnabled: INPUT,
            startInputRecording: INPUT,
            stopInputRecording: INPUT,
            worldToScreen: READ,
            screenToWorld: READ,
            getCameraController: READ,
            getNodeMesh: READ,
            waitForSettled: READ,
            isFrameStable: READ,
            waitForStableFrame: READ,
            captureScreenshot: CAPTURE,
            canCaptureScreenshot: READ,
            captureAnimation: CAPTURE,
            cancelAnimationCapture: CAPTURE,
            isAnimationCapturing: READ,
            estimateAnimationCapture: READ,
            getCameraState: READ,
            setCameraState: CAMERA,
            setCameraPosition: CAMERA,
            setCameraTarget: CAMERA,
            setCameraZoom: CAMERA,
            setCameraPan: CAMERA,
            resetCamera: CAMERA,
            zoomStep: CAMERA,
            zoomToSelection: CAMERA,
            zoomToNodes: CAMERA,
            resolveCameraPreset: READ,
            applyCameraView: CAMERA,
            saveCameraPreset: calls(
                ["door view", { zoom: 2 }],
                [{ op: "view.save", views: [{ name: "door view", camera: { zoom: 2 } }] }],
            ),
            removeCameraPreset: calls(["door view"], [{ op: "view.remove", names: ["door view"] }]),
            loadCameraPreset: CAMERA,
            getCameraPresets: READ,
            exportCameraPresets: READ,
            exportGraph: READ,
            importCameraPresets: calls(
                [{ "door import": { zoom: 3 } }],
                [{ op: "view.save", views: [{ name: "door import", camera: { zoom: 3 } }] }],
            ),
            setData: calls(
                [{ nodes: [{ id: "d1" }], edges: [] }],
                batchOf("Set the graph data", addNodes({ id: "d1" })),
            ),
            getNode: READ,
            getNodes: READ,
            render: RENDER,
            enableAiControl: ASSISTANT,
            disableAiControl: ASSISTANT,
            aiCommand: MESSAGE,
            getAiStatus: READ,
            onAiStatusChange: LISTEN,
            cancelAiCommand: IN_FLIGHT,
            getAiManager: READ,
            isAiEnabled: READ,
            retryLastAiCommand: MESSAGE,
            getApiKeyManager: READ,
            getVoiceAdapter: READ,
            startVoiceInput: INPUT,
            stopVoiceInput: INPUT,
            isVoiceActive: READ,
            enterXR: XR,
            exitXR: XR,
            dispose: LIFECYCLE,
        },
    },
    {
        name: "Node",
        file: "src/Node.ts",
        half: "renderer",
        doors: {
            parentGraph: RENDER,
            opts: RENDER,
            id: READ,
            index: READ,
            data: READ,
            mesh: RENDER,
            label: RENDER,
            tooltip: RENDER,
            dragHandler: INPUT,
            dragging: IN_FLIGHT,
            pinOnDrag: INPUT,
            size: RENDER,
            shapeType: RENDER,
            update: RENDER,
            updateStyle: RENDER,
            applySessionPaint: RENDER,
            dispose: RENDER,
            isDisposed: READ,
            getRenderState: READ,
            setRenderState: RENDER,
            isSelected: READ,
            setSelected: SELECTION,
            refreshSelectionOverlay: RENDER,
            pin: calls([], [PIN_N1]),
            unpin: calls([], [UNPIN_N1]),
            showTooltip: RENDER,
            hideTooltip: RENDER,
            tooltipText: READ,
            getPosition: READ,
            isPinned: READ,
            roundRadius: READ,
        },
    },
    {
        name: "Edge",
        file: "src/Edge.ts",
        half: "renderer",
        doors: {
            parentGraph: RENDER,
            opts: RENDER,
            srcId: READ,
            dstId: READ,
            id: READ,
            index: READ,
            dstNode: RENDER,
            srcNode: RENDER,
            data: READ,
            mesh: RENDER,
            arrowMesh: RENDER,
            arrowTailMesh: RENDER,
            ray: RENDER,
            label: RENDER,
            arrowHeadText: RENDER,
            arrowTailText: RENDER,
            parallelRank: RENDER,
            parallelCount: RENDER,
            drawnLine: READ,
            drawnCentre: READ,
            drawnCaps: READ,
            invalidatePositionCache: RENDER,
            update: RENDER,
            updateStyle: RENDER,
            applySessionPaint: RENDER,
            dispose: RENDER,
            isDisposed: READ,
            isRenderVisible: READ,
            setRenderVisible: RENDER,
            isSelected: READ,
            setSelected: SELECTION,
            transformEdgeMesh: RENDER,
            transformArrowCap: RENDER,
            getInterceptPoints: READ,
        },
    },
    {
        name: "GraphSession",
        file: "src/session/types.ts",
        half: "session",
        doors: SESSION,
    },
    {
        name: "ElementSession",
        file: "src/session/types.ts",
        half: "session",
        doors: {
            ...SESSION,
            paint: READ,
        },
    },
    {
        name: "Run",
        file: "src/session/runs/types.ts",
        half: "session",
        doors: {
            id: READ,
            label: READ,
            algorithm: READ,
            params: READ,
            scope: READ,
            status: READ,
            progress: READ,
            determinate: READ,
            cancellable: READ,
            queuePosition: READ,
            startedAt: READ,
            durationMs: READ,
            partial: READ,
            stale: READ,
            engine: READ,
            fields: READ,
            shape: READ,
            caveats: READ,
            result: READ,
            error: READ,
            record: READ,
            journalId: READ,
            cancel: IN_FLIGHT,
            // Called on a run the doors test has already cancelled, so there is something to redo.
            rerun: calls([], [RUN_DEGREE]),
            suggestEncodings: READ,
        },
    },
    {
        name: "DataManager",
        file: "src/managers/DataManager.ts",
        half: "renderer",
        doors: {
            nodes: READ,
            edges: READ,
            edgeVersion: RENDER,
            nodeCache: RENDER,
            edgesByIndex: READ,
            isLoading: READ,
            heldCounts: READ,
            // Written only by a plugin while `algo.legacy` runs it, and then into that step.
            graphResults: READ,
            meshCache: RENDER,
            // The store's own snapshot, whose coordinate columns are the lane.
            getSnapshot: LANE,
            undirected: READ,
            positions: LANE,
            seededNodeCount: READ,
            directionSettledBy: READ,
            lastImport: READ,
            updateStyles: RENDER,
            setGraphContext: LIFECYCLE,
            setLayoutEngine: LIFECYCLE,
            init: LIFECYCLE,
            dispose: LIFECYCLE,
            bindSession: LIFECYCLE,
            reconcile: RENDER,
            addNode: calls([{ id: "door-c" }], [addNodes({ id: "door-c" })]),
            addNodes: calls([[{ id: "door-d" }]], [addNodes({ id: "door-d" })]),
            getNode: READ,
            removeNodeAndIncidentEdges: calls(["n2"], [removes("remove-nodes", ["n2"])]),
            addEdge: calls([{ src: "n1", dst: "n3" }], [addEdges({ src: "n1", dst: "n3" })]),
            // Called while the edge the row above added is drawn: removing one that is not is no call.
            removeEdge: calls(["2"], [removes("remove-edges", ["2"])]),
            addEdges: calls([[{ src: "n3", dst: "n2" }]], [addEdges({ src: "n3", dst: "n2" })]),
            getEdge: READ,
            getEdgesBetween: READ,
            // Called while no edge is drawn: the one the row above added waits for its endpoint.
            setEdges: calls(
                [[{ src: "n1", dst: "n2" }]],
                batchOf("Replaced the edges", addEdges({ src: "n1", dst: "n2" })),
            ),
            addDataFromSource: ADD_FROM_SOURCE,
            // Called while the graph holds every node the rows above left: naming them all again removes none.
            setNodes: calls(
                [
                    [
                        { id: "n1" },
                        { id: "n2" },
                        { id: "n3" },
                        { id: "door-c" },
                        { id: "door-d" },
                        { id: "j1" },
                        { id: "j2" },
                    ],
                ],
                batchOf(
                    "Replaced the nodes",
                    addNodes(
                        { id: "n1" },
                        { id: "n2" },
                        { id: "n3" },
                        { id: "door-c" },
                        { id: "door-d" },
                        { id: "j1" },
                        { id: "j2" },
                    ),
                ),
            ),
            snapshotStale: READ,
            // Strict state's check after every derivation pass.
            sliceProblems: READ,
            beginLoad: IN_FLIGHT,
            supersedeLoads: IN_FLIGHT,
            throwIfSuperseded: READ,
            clear: calls([], [CLEAR]),
            startLabelAnimations: RENDER,
            getStats: READ,
        },
    },
    {
        name: "LayoutManager",
        file: "src/managers/LayoutManager.ts",
        half: "renderer",
        doors: {
            layoutEngine: READ,
            running: IN_FLIGHT,
            setPaused: IN_FLIGHT,
            isPaused: READ,
            setGraphContext: LIFECYCLE,
            updateStyles: RENDER,
            init: LIFECYCLE,
            dispose: LIFECYCLE,
            isCurrent: READ,
            building: READ,
            loadArrangement: DERIVED,
            dimension: READ,
            step: TRANSPORT,
            stepBatch: TRANSPORT,
            getNodePosition: READ,
            isSettled: READ,
            nodes: READ,
            edges: READ,
            layoutType: READ,
            getStats: READ,
            hasLayoutEngine: READ,
            updatePositions: TRANSPORT,
            onRest: RENDER,
            restoring: RENDER,
            replacing: RENDER,
            graphWritesWaiting: RENDER,
            // The layout scope lives in the `layout` slice; these hand it to the engine and read
            // it back, and a set removed under it releases the hold without a step.
            setScopeSource: LIFECYCLE,
            scope: READ,
            scopeUser: READ,
            releaseDetachedScope: DERIVED,
        },
    },
    {
        name: "UpdateManager",
        file: "src/managers/UpdateManager.ts",
        half: "renderer",
        whole: RENDER,
    },
    {
        name: "StatsManager",
        file: "src/managers/StatsManager.ts",
        half: "renderer",
        whole: PROFILING,
    },
    {
        name: "SelectionManager",
        file: "src/managers/SelectionManager.ts",
        half: "renderer",
        whole: SELECTION,
    },
    {
        name: "EventManager",
        file: "src/managers/EventManager.ts",
        half: "renderer",
        whole: EVENTS,
    },
    {
        name: "MeshCache",
        file: "src/meshes/MeshCache.ts",
        half: "renderer",
        whole: RENDER,
    },
    {
        name: "CameraController",
        file: "src/cameras/CameraManager.ts",
        half: "renderer",
        whole: CAMERA,
    },
    {
        name: "XRSessionManager",
        file: "src/xr/XRSessionManager.ts",
        half: "renderer",
        whole: XR,
    },
    {
        name: "AiManager",
        file: "src/ai/AiManager.ts",
        half: "renderer",
        doors: {
            init: LIFECYCLE,
            registerCommand: TOOLS,
            getRegisteredCommands: READ,
            execute: MESSAGE,
            setApiKey: KEYS,
            getStatus: READ,
            onStatusChange: LISTEN,
            cancel: IN_FLIGHT,
            retry: MESSAGE,
            getCommandRegistry: READ,
            getController: READ,
            getProvider: READ,
            getSchemaManager: READ,
            getApiKeyManager: READ,
            dispose: LIFECYCLE,
        },
    },
    {
        name: "ApiKeyManager",
        file: "src/ai/keys/ApiKeyManager.ts",
        half: "renderer",
        whole: KEYS,
    },
    {
        name: "VoiceInputAdapter",
        file: "src/ai/input/VoiceInputAdapter.ts",
        half: "renderer",
        whole: INPUT,
    },
    {
        name: "CameraManager",
        file: "src/cameras/CameraManager.ts",
        half: "renderer",
        whole: CAMERA,
    },
    {
        name: "AccelerationController",
        file: "src/acceleration/AccelerationController.ts",
        half: "renderer",
        whole: MACHINE,
    },
    {
        name: "OperationQueueManager",
        file: "src/managers/OperationQueueManager.ts",
        half: "renderer",
        whole: QUEUE,
    },
    {
        name: "ExportResult",
        file: "src/data/export.ts",
        half: "renderer",
        whole: READ,
    },
    {
        name: "StylePainter",
        file: "src/managers/StylePainter.ts",
        half: "renderer",
        whole: RENDER,
    },
    {
        name: "InputManager",
        file: "src/managers/InputManager.ts",
        half: "renderer",
        whole: INPUT,
    },
    {
        name: "GraphContext",
        file: "src/managers/GraphContext.ts",
        half: "renderer",
        doors: {
            getSession: READ,
            getStyles: READ,
            getStylePainter: READ,
            getDataManager: READ,
            getLayoutManager: READ,
            getMeshCache: READ,
            getScene: READ,
            getStatsManager: READ,
            is2D: READ,
            getConfig: VIEW_SETTING,
            isRunning: READ,
            setRunning: IN_FLIGHT,
            getXRConfig: READ,
            getXRSessionManager: READ,
            getSelectionManager: READ,
            getEventManager: READ,
            getAcceleration: READ,
            onNodeLabelCounts: READ,
        },
    },
    {
        name: "RichTextLabel",
        file: "src/meshes/RichTextLabel.ts",
        half: "renderer",
        whole: RENDER,
    },
    {
        name: "NodeDragHandler",
        file: "src/NodeBehavior.ts",
        half: "renderer",
        doors: {
            onDragStart: GESTURE,
            onDragUpdate: GESTURE,
            onDragEnd: GESTURE,
            setPositionDirect: GESTURE,
            getNode: READ,
            sceneObservers: READ,
            select: SELECTION,
            dispose: LIFECYCLE,
        },
    },
    {
        name: "PatternedLineMesh",
        file: "src/meshes/PatternedLineMesh.ts",
        half: "renderer",
        whole: RENDER,
    },
    {
        name: "EdgeLineBatch",
        file: "src/meshes/EdgeLineBatch.ts",
        half: "renderer",
        whole: RENDER,
    },
    {
        name: "ArrowCap",
        file: "src/meshes/ArrowCapBatch.ts",
        half: "renderer",
        whole: RENDER,
    },
    {
        name: "SessionDataApi",
        file: "src/session/types.ts",
        half: "session",
        doors: {
            // Read-only: its snapshot's coordinate columns are copies and its coordinates have no writer.
            store: READ,
            snapshot: READ,
            undirected: READ,
            // Deep-frozen.
            node: READ,
            edge: READ,
            nodes: READ,
            edges: READ,
            // Deep-frozen records, read a window at a time.
            nodePage: READ,
            edgePage: READ,
            resultColumns: READ,
            neighbors: READ,
            lastImport: READ,
            source: READ,
            // Reads and holds a source; the draft it returns loads through data.import.
            prepare: READ,
            attributes: READ,
            declare: {
                kind: "dispatches",
                op: "data.declare",
                call: {
                    kind: "call",
                    args: [{ kind: "node", name: "doorLevel" }, { measurement: "categorical" }],
                    // A measurement is declared on a column some record carries.
                    around: async (target) => {
                        const data = target as { addNodes(records: unknown[]): Promise<void> };
                        await data.addNodes([{ id: "door-level", doorLevel: 1 }]);
                        return () => Promise.resolve();
                    },
                },
                expect: [
                    {
                        op: "data.declare",
                        column: { kind: "node", name: "doorLevel" },
                        declaration: { measurement: "categorical" },
                    },
                ],
            },
            statistics: READ,
            fingerprint: READ,
            addNodes: calls([[{ id: "door-a" }]], [addNodes({ id: "door-a" })]),
            addEdges: calls([[{ src: "door-a", dst: "door-b" }]], [addEdges({ src: "door-a", dst: "door-b" })]),
            updateNodes: calls(
                [[{ id: "door-a", values: { weight: 2 } }]],
                [updateRow("node", "door-a", { weight: 2 })],
            ),
            updateEdges: calls([[{ id: "0", values: { weight: 2 } }]], [updateRow("edge", "0", { weight: 2 })]),
            removeEdges: calls([["0"]], [removes("remove-edges", ["0"])]),
            removeNodes: calls([["door-b"]], [removes("remove-nodes", ["door-b"])]),
            clear: calls([], [CLEAR]),
            import: calls(
                [{ type: "json", config: { data: TINY_JSON } }],
                [imports("replace", { type: "json", config: { data: TINY_JSON } })],
            ),
        },
    },
    {
        name: "LoadDraft",
        file: "src/session/types.ts",
        half: "session",
        doors: {
            type: READ,
            tables: READ,
            mapping: READ,
            // Measured in a scratch session; this one is untouched.
            report: READ,
            rows: READ,
            // A draft of TINY_JSON: the rows it held, loaded without reading the source again.
            load: calls(
                [],
                [
                    {
                        op: "data.import",
                        source: { type: "json", config: { data: TINY_JSON } },
                        mode: "replace",
                        held: {
                            nodes: [{ id: "j1" }, { id: "j2" }],
                            edges: [{ src: "j1", dst: "j2" }],
                            declaredDirection: null,
                            errors: [],
                            errorLimit: 100,
                        },
                    },
                ],
            ),
            dispose: exempt("Lets go of the rows a draft holds; nothing a project saves changes."),
        },
    },
    {
        name: "RunsApi",
        file: "src/session/runs/types.ts",
        half: "session",
        doors: {
            start: calls(["degree"], [RUN_DEGREE]),
            batch: calls([[{ algorithm: "degree" }]], [RUN_DEGREE]),
            get: READ,
            list: READ,
            remove: calls(["door-run"], [{ op: "algo.remove", runId: "door-run" }]),
            bindings: READ,
            painting: READ,
            queue: READ,
        },
    },
    {
        name: "ResultsApi",
        file: "src/session/results/types.ts",
        half: "session",
        whole: READ,
    },
    {
        name: "ScopeApi",
        file: "src/session/scope/ScopeApi.ts",
        half: "session",
        doors: {
            resolve: READ,
            count: READ,
            // Deprecated forwards to session.sets: they dispatch the set ops (decision 1 of
            // design/sets/undo-integration.md section 8).
            save: calls(
                ["door scope", "graph"],
                [
                    {
                        op: "set.create",
                        id: "set_door-scope",
                        name: "door scope",
                        order: 2,
                        definition: { kind: "rule", where: { kind: "member", of: "graph" }, reading: "induced" },
                        createdFrom: { kind: "user" },
                    } as unknown as SessionCommand,
                ],
            ),
            list: READ,
            // The doors test saves "door seed" before calling it.
            remove: calls(["set_door-seed"], [{ op: "set.remove", id: "set_door-seed" }]),
        },
    },
    {
        // Every write dispatches one set op. The doors test creates "door seed", a fixed set of
        // node d1 (id set_door-seed, order 1), before calling each row.
        name: "SetsApi",
        file: "src/session/sets/types.ts",
        half: "session",
        doors: {
            list: READ,
            get: READ,
            status: READ,
            pathKind: READ,
            usedBy: READ,
            offers: READ,
            containing: READ,
            create: calls(
                [{ kind: "fixed", nodes: ["d1"], reading: "induced" }, { name: "door set" }],
                [
                    {
                        op: "set.create",
                        id: "set_door-set",
                        name: "door set",
                        order: 2,
                        definition: { kind: "fixed", nodes: ["d1"], reading: "induced" },
                        createdFrom: { kind: "user" },
                    } as unknown as SessionCommand,
                ],
            ),
            createFrom: calls(
                ["graph", { name: "door from" }],
                [
                    {
                        op: "set.create",
                        id: "set_door-from",
                        name: "door from",
                        order: 2,
                        definition: { kind: "fixed", nodes: ["d1"], reading: "induced" },
                        createdFrom: { kind: "scope", from: "graph" },
                    } as unknown as SessionCommand,
                ],
            ),
            createPath: calls(
                ["selection"],
                [
                    {
                        op: "set.create",
                        id: "set_set-1",
                        name: "Set 1",
                        order: 2,
                        definition: { kind: "path", nodes: ["d1"] },
                        createdFrom: { kind: "selection" },
                    } as unknown as SessionCommand,
                ],
            ),
            combine: calls(
                ["union", [{ set: "set_door-seed" }, "graph"], { name: "door union" }],
                [
                    {
                        op: "set.create",
                        id: "set_door-union",
                        name: "door union",
                        order: 2,
                        definition: { kind: "fixed", nodes: ["d1"], reading: "induced" },
                        createdFrom: {
                            kind: "combine",
                            op: "union",
                            of: [{ set: "set_door-seed" }, "graph"],
                        },
                    } as unknown as SessionCommand,
                ],
            ),
            rename: calls(
                ["set_door-seed", "door renamed"],
                [{ op: "set.rename", id: "set_door-seed", name: "door renamed" }],
            ),
            redefine: calls(
                ["set_door-seed", { kind: "fixed", nodes: [], reading: "induced" }],
                [
                    {
                        op: "set.redefine",
                        id: "set_door-seed",
                        definition: { kind: "fixed", nodes: [], reading: "induced" },
                    },
                ],
            ),
            addMembers: calls(
                ["set_door-seed", { nodes: ["d2"] }],
                [{ op: "set.members", id: "set_door-seed", add: { nodes: ["d2"] } }],
            ),
            removeMembers: calls(
                ["set_door-seed", { nodes: ["d1"] }],
                [{ op: "set.members", id: "set_door-seed", remove: { nodes: ["d1"] } }],
            ),
            remove: calls(["set_door-seed"], [{ op: "set.remove", id: "set_door-seed" }]),
            restore: {
                kind: "dispatches",
                op: "set.restore",
                call: {
                    kind: "call",
                    args: ["set_door-kept"],
                    // A set a rule names keeps its record once removed, so it can be restored.
                    around: async (target) => {
                        const sets = target as {
                            create(definition: unknown, options: { name: string }): string;
                            remove(id: string): void;
                        };
                        sets.create({ kind: "fixed", nodes: ["d1"], reading: "induced" }, { name: "door kept" });
                        sets.create(
                            {
                                kind: "rule",
                                where: { kind: "member", of: { set: "set_door-kept" } },
                                reading: "induced",
                            },
                            { name: "door naming" },
                        );
                        sets.remove("set_door-kept");
                        return Promise.resolve(() => Promise.resolve());
                    },
                },
                expect: [{ op: "set.restore", id: "set_door-kept" }],
            },
        },
    },
    {
        name: "ProjectApi",
        file: "src/session/projectFile.ts",
        half: "session",
        doors: {
            name: READ,
            dirty: READ,
            rename: {
                kind: "dispatches",
                op: "config.set",
                call: { kind: "call", args: ["Fixture project"] },
                expect: [{ op: "config.set", values: { name: "Fixture project" } }],
            },
            save: exempt("Writes the session out as text and marks it saved; it changes nothing a project saves."),
            markSaved: exempt("Moves the save point that dirty is measured from; it changes nothing a project saves."),
            open: exempt(
                "Opens a file as one transaction: every write goes through the session's own doors, " +
                    "which have rows of their own.",
            ),
        },
    },
    {
        name: "NotesApi",
        file: "src/session/notes/types.ts",
        half: "session",
        doors: {
            list: READ,
            get: READ,
            status: READ,
            authors: READ,
            counts: READ,
            toDocument: READ,
            mergeDocument: calls(
                [DOOR_NOTES_DOCUMENT, { name: "door.graphty.json" }],
                [{ op: "note.merge", document: DOOR_NOTES_DOCUMENT, options: { name: "door.graphty.json" } }],
            ),
            add: calls([DOOR_NOTE_INPUT], [{ op: "note.add", note: DOOR_NOTE_INPUT }]),
            update: withDoorNote(
                () => [DOOR_NOTE.id, { text: "door edited" }],
                [
                    {
                        op: "note.update",
                        get id() {
                            return DOOR_NOTE.id;
                        },
                        patch: { text: "door edited" },
                    },
                ],
            ),
            remove: withDoorNote(
                () => [DOOR_NOTE.id],
                [
                    {
                        op: "note.remove",
                        get id() {
                            return DOOR_NOTE.id;
                        },
                    },
                ],
            ),
        },
    },
    {
        name: "SessionViews",
        file: "src/session/types.ts",
        half: "session",
        doors: {
            save: calls(
                [[{ name: "door view", camera: { zoom: 2 } }]],
                [{ op: "view.save", views: [{ name: "door view", camera: { zoom: 2 } }] }],
            ),
            remove: calls([["door view"]], [{ op: "view.remove", names: ["door view"] }]),
        },
    },
    {
        name: "SessionLayout",
        file: "src/session/types.ts",
        half: "session",
        doors: {
            id: READ,
            engine: READ,
            options: READ,
            dimension: READ,
            set: calls(["circular"], [{ op: "layout.set", id: "circular" }]),
            setDimension: calls(["2d"], [DIMENSION_2D]),
        },
    },
    {
        name: "SessionPositions",
        file: "src/session/types.ts",
        half: "session",
        doors: {
            capacity: READ,
            count: READ,
            placedCount: READ,
            pinnedCount: READ,
            generation: READ,
            isPlaced: READ,
            isPinned: READ,
            read: READ,
            pinned: READ,
            set: calls(
                [[{ id: "n1", x: 1, y: 2, z: 3 }]],
                [{ op: "positions.set", entries: [{ id: "n1", x: 1, y: 2, z: 3 }] }],
            ),
            pin: calls([["n1"]], [PIN_N1]),
            unpin: calls([["n1"]], [UNPIN_N1]),
        },
    },
    {
        name: "SessionConfig",
        file: "src/session/types.ts",
        half: "session",
        doors: {
            data: READ,
            runAlgorithmsOnLoad: READ,
            background: READ,
            selectionStyle: READ,
            layoutBehavior: READ,
            author: READ,
            name: READ,
            acceleration: READ,
            set: calls([{ runAlgorithmsOnLoad: true }], [{ op: "config.set", values: { runAlgorithmsOnLoad: true } }]),
        },
    },
    {
        name: "Styles",
        file: "src/Styles.ts",
        half: "renderer",
        whole: READ,
    },
    {
        name: "SelectionApi",
        file: "src/session/selection/SelectionApi.ts",
        half: "session",
        doors: SELECTION_API,
    },
    {
        name: "VisibilityApi",
        file: "src/session/visibility/VisibilityApi.ts",
        half: "session",
        doors: VISIBILITY_API,
    },
    {
        name: "StylesApi",
        file: "src/session/styles/StylesApi.ts",
        half: "session",
        doors: STYLES_API,
    },
    {
        // The lane itself, which only the renderer reaches (through `writableLane` and
        // `layoutEngineInternals`); every public accessor hands out `ReadonlyElementPositions`.
        name: "ElementPositions",
        file: "src/data/positions.ts",
        half: "renderer",
        doors: {
            components: READ,
            capacity: READ,
            count: READ,
            placedCount: READ,
            view: LANE,
            grow: LANE,
            remap: LANE,
            isPinned: READ,
            // The pin bytes follow the `pins` slice; strict state fails a commit where they differ.
            setPinned: DERIVED,
            pinnedCount: READ,
            pinnedView: DERIVED,
            isPlaced: READ,
            read: READ,
            generation: READ,
            moved: LANE,
            write: LANE,
            fillUnplaced: LANE,
        },
    },
    {
        name: "ReadonlyElementPositions",
        file: "src/session/types.ts",
        half: "session",
        whole: READ,
    },
    {
        name: "SelectionOwner",
        file: "src/session/selection/SelectionApi.ts",
        half: "session",
        doors: {
            ...SELECTION_API,
            applyNow: SELECTION,
            applyAtNextRead: SELECTION,
            nodeMembers: READ,
            edgeMembers: READ,
            remapNodes: SELECTION,
            remapEdges: SELECTION,
        },
    },
    {
        name: "SessionVisibilityApi",
        file: "src/session/visibility/VisibilityApi.ts",
        half: "session",
        doors: {
            ...VISIBILITY_API,
            masks: READ,
        },
    },
    {
        name: "SessionStylesApi",
        file: "src/session/styles/StylesApi.ts",
        half: "session",
        doors: {
            ...STYLES_API,
            compiled: READ,
        },
    },
    {
        name: "ElementPaint",
        file: "src/session/styles/repaint.ts",
        half: "session",
        whole: DERIVED,
    },
    {
        name: "GraphtyError",
        file: "src/errors/GraphtyError.ts",
        half: "session",
        whole: READ,
    },
    {
        // Adding and removing nodes and edges, and attaching a coordinate array, are protected: the
        // engine follows the graph slice and the element drives it through layoutEngineInternals.
        name: "LayoutEngine",
        file: "src/layout/LayoutEngine.ts",
        half: "renderer",
        doors: {
            init: LIFECYCLE,
            getNodePosition: READ,
            getEdgePosition: READ,
            step: TRANSPORT,
            nodes: READ,
            edges: READ,
            isSettled: READ,
            updatePositions: TRANSPORT,
            dispose: LIFECYCLE,
            // A read-only view; the engine's writable array is reached through layoutEngineInternals.
            nodePositions: READ,
            publishPositions: TRANSPORT,
            readNodePosition: READ,
            loadArrangement: RENDER,
            type: READ,
            // The nodes a scoped layout holds still: taken from the scope in the `layout` slice at
            // each start.
            setHoldMask: TRANSPORT,
            holdMask: READ,
        },
    },
    {
        name: "CommandRegistry",
        file: "src/ai/commands/CommandRegistry.ts",
        half: "renderer",
        doors: {
            register: TOOLS,
            get: READ,
            has: READ,
            getAll: READ,
            getNames: READ,
            unregister: TOOLS,
            clear: TOOLS,
            toToolDefinitions: READ,
        },
    },
    {
        name: "AiController",
        file: "src/ai/AiController.ts",
        half: "renderer",
        doors: {
            execute: MESSAGE,
            getLastInput: READ,
            getLastError: READ,
            clearLastError: ASSISTANT,
            getStatus: READ,
            onStatusChange: LISTEN,
            cancel: IN_FLIGHT,
            dispose: LIFECYCLE,
        },
    },
    {
        name: "LlmProvider",
        file: "src/ai/providers/types.ts",
        half: "renderer",
        whole: LLM,
    },
    {
        name: "SchemaManager",
        file: "src/ai/schema/SchemaManager.ts",
        half: "renderer",
        whole: ASSISTANT,
    },
    {
        name: "MockDeviceInputSystem",
        file: "src/input/mock-device-input-system.ts",
        half: "renderer",
        whole: TEST_INPUT,
    },
    {
        name: "SessionGraphStore",
        file: "src/session/types.ts",
        half: "session",
        doors: {
            getSnapshot: READ,
            undirected: READ,
            positions: READ,
            seededNodeCount: READ,
            directionSettledBy: READ,
            lastImport: READ,
        },
    },
    {
        name: "RunResult",
        file: "src/session/results/types.ts",
        half: "session",
        whole: READ,
    },
    {
        name: "ElementMask",
        file: "src/session/scope/ElementMask.ts",
        half: "session",
        whole: MASK,
    },
    {
        name: "ScopeVisibilitySource",
        file: "src/session/scope/ScopeApi.ts",
        half: "session",
        whole: READ,
    },
    {
        name: "GraphCommand",
        file: "src/ai/commands/types.ts",
        half: "renderer",
        doors: {
            name: READ,
            description: READ,
            parameters: READ,
            examples: READ,
            execute: TOOL,
        },
    },
    {
        name: "NumericColumnView",
        file: "src/session/results/types.ts",
        half: "session",
        whole: READ,
    },
    {
        name: "AlgorithmManager",
        file: "src/managers/AlgorithmManager.ts",
        half: "renderer",
        doors: {
            init: LIFECYCLE,
            dispose: LIFECYCLE,
            execute: exempt(
                "Computes a result for a run and hands it back; the run records it, and this writes nothing.",
            ),
            runAlgorithmsFromTemplate: calls([["graphty:degree"]], [LEGACY_DEGREE]),
            runAlgorithm: calls(["graphty", "degree"], [LEGACY_DEGREE]),
            runLegacy: exempt(
                "Carries out an algo.legacy command the dispatcher has already started, writing only through its draft.",
            ),
            hasAlgorithm: READ,
            getAvailableAlgorithms: READ,
        },
    },
    {
        name: "LifecycleManager",
        file: "src/managers/LifecycleManager.ts",
        half: "renderer",
        whole: LIFECYCLE,
    },
    {
        name: "RenderManager",
        file: "src/managers/RenderManager.ts",
        half: "renderer",
        doors: {
            engine: RENDER,
            scene: RENDER,
            camera: CAMERA,
            graphRoot: RENDER,
            init: LIFECYCLE,
            dispose: LIFECYCLE,
            startRenderLoop: RENDER,
            stopRenderLoop: RENDER,
            holdFrames: RENDER,
            applyBackground: RENDER,
            getRenderStats: READ,
        },
    },
    {
        name: "DefaultGraphContext",
        file: "src/managers/GraphContext.ts",
        half: "renderer",
        doors: {
            getStylePainter: READ,
            getStyles: READ,
            getDataManager: READ,
            getLayoutManager: READ,
            getMeshCache: READ,
            getScene: READ,
            getStatsManager: READ,
            is2D: READ,
            getConfig: VIEW_SETTING,
            updateConfig: VIEW_SETTING,
            isRunning: READ,
            setRunning: IN_FLIGHT,
        },
    },
    {
        name: "LabelDeclutter",
        file: "src/managers/LabelDeclutter.ts",
        half: "renderer",
        whole: RENDER,
    },
    {
        name: "Layer",
        file: "src/session/styles/Layer.ts",
        half: "session",
        whole: READ,
    },
    {
        name: "SessionHistory",
        file: "src/session/types.ts",
        half: "session",
        doors: {
            version: READ,
            steps: READ,
            position: READ,
            pending: READ,
            nextUndo: READ,
            bytes: READ,
            limitBytes: BUDGET,
            limitSteps: BUDGET,
            restoreTo: HISTORY,
            cancel: IN_FLIGHT,
            clear: HISTORY,
        },
    },
    {
        name: "Manager",
        file: "src/managers/interfaces.ts",
        half: "renderer",
        whole: LIFECYCLE,
    },
];

/**
 * The ops a gesture the element handles itself dispatches, with no public member of its own: the
 * gesture is the door. Each names where it is handled; the browser test of that gesture checks
 * that it dispatches the op.
 */
export const GESTURE_DOORS: Readonly<Record<string, string>> = {
    "data.expand":
        "Double-clicking a node when the layout behaviour supplies fetchNodes and fetchEdges (src/NodeBehavior.ts); " +
        "checked by test/browser/expansion-through-behaviour.test.ts.",
};
