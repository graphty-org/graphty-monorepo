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

import { fromEdgeArrays } from "@graphty/graph-format";
import { defineSource, registerSource, registry } from "@graphty/graph-io";

import type { LayerSpec } from "../../catalog/types";
import type { SessionCommand } from "../planning";
import type { ImportSource } from "./data";

/** A layer writing one fixed colour, for the colour replacement door. */
const DOOR_RED: LayerSpec = {
    name: "door red",
    target: "node",
    selector: { match: "everything" },
    set: { "node.color": "#ff0000" },
};

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
 * The step a node replacement adds its records with: read by the id path the replacement was given.
 * @param idPath - Where a record's id is.
 * @param records - The records.
 * @returns The command.
 */
function addNodesBy(idPath: string, ...records: Readonly<Record<string, unknown>>[]): SessionCommand {
    return { op: "data.apply", mutation: { kind: "add-nodes", records, idPath } };
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

/** The code of the fact each batch the element builds carries, by its label. */
const BATCH_CODES = {
    "Replaced the nodes": "data.replace-nodes",
    "Replaced the edges": "data.replace-edges",
    "Set the graph data": "data.set",
} as const;

/**
 * A batch, followed by its members as each is dispatched.
 * @param label - The batch's label.
 * @param steps - Its members.
 * @returns What a door dispatching it dispatches, in order.
 */
function batchOf(label: keyof typeof BATCH_CODES, ...steps: SessionCommand[]): SessionCommand[] {
    return [{ op: "batch", label, fact: { code: BATCH_CODES[label], params: {} }, steps }, ...steps];
}

/** What the element's pair adds to an import: the key its two assignments coalesce under. */
interface ImportExtra {
    readonly coalesce?: string;
    readonly origin?: "sample";
    /** The token of what the rows were read from, for a file the session can read again. */
    readonly input?: string;
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

/** The network source the doors load from: two pages of one node each, read with no request. */
const DOOR_SOURCE = "door-source";

/** The one sample the doors' network source lists. */
const DOOR_SAMPLE = "door-sample";

/**
 * Register the doors' network source, once.
 * @returns Its id.
 */
function doorSource(): string {
    if (!registry.hasSource(DOOR_SOURCE)) {
        registerSource(
            defineSource({
                id: DOOR_SOURCE,
                descriptor: {
                    plainName: "Door source",
                    params: [],
                    samples: [{ id: DOOR_SAMPLE, plainName: "Door sample", params: {} }],
                },
                async *records(_params: Record<string, never>, ctx) {
                    for (let page = Number(ctx.cursor?.page ?? 0); page < 2; page++) {
                        await Promise.resolve();
                        yield { nodes: [{ id: `door-s${String(page)}` }], next: page === 0 ? { page: 1 } : null };
                    }
                },
            }),
        );
    }

    return DOOR_SOURCE;
}

/**
 * What a load from the doors' source dispatches.
 * @param mode - Replace or merge.
 * @param ids - The node ids the read held.
 * @param extra - The other load choices.
 * @param held - Fields of the held read that differ from a plain first load.
 * @returns The command.
 */
function sourceImport(
    mode: "replace" | "merge",
    ids: readonly string[],
    extra: object = {},
    held: object = {},
): SessionCommand {
    return {
        op: "data.import-source",
        source: { type: `source:${DOOR_SOURCE}`, config: {} },
        mode,
        held: {
            nodes: ids.map((id) => ({ id })),
            edges: [],
            declaredDirection: null,
            errors: [],
            errorLimit: 100,
            idPath: "id",
            source: "source",
            target: "target",
            ...held,
        },
        ...extra,
    };
}

/** The saved load an opened project's `runPendingSourceLoad` door runs. */
const DOOR_PENDING = {
    problems: [],
    facts: new Map(),
    records: [
        {
            key: "door-load",
            source: DOOR_SOURCE,
            version: 1,
            config: {},
            endpoint: null,
            options: {},
            loadedAt: "2026-10-17T00:00:00.000Z",
            pages: 1,
            next: null,
            validators: {},
            credential: null,
            expansions: [],
        },
    ],
};

/** Loading from the doors' network source on the element. */
const LOAD_FROM_SOURCE = calls(
    () => [doorSource(), {}],
    [
        sourceImport(
            "replace",
            ["door-s0", "door-s1"],
            {},
            {
                nodes: ["door-s0", "door-s1"].map((id) => ({
                    id,
                    "_source.expansion": "none",
                    "_source.loads": ["load-1"],
                })),
            },
        ),
    ],
);

/** The records `data.generate("path", { n: 2 })` loads. */
const GENERATED_PATH_JSON = JSON.stringify({
    directed: false,
    nodes: [{ id: 0 }, { id: 1 }],
    edges: [{ source: 0, target: 1 }],
});

/** The records of the two-node dataset the `loadDataset` door downloads. */
const DATASET_JSON = JSON.stringify({
    directed: false,
    nodes: [{ id: "d1" }, { id: "d2" }],
    edges: [{ source: "d1", target: "d2" }],
});

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

/**
 * The element's pin and unpin, called once node n1 is in the graph: they skip an id nothing
 * answers to, and the rows before them clear the graph and set `nodeIdPath` to `key`.
 * @param expect - The command the call must dispatch.
 * @returns The door.
 */
function pinsN1(expect: SessionCommand): Door {
    return {
        kind: "dispatches",
        op: expect.op,
        call: {
            kind: "call",
            args: [["n1"]],
            around: async (target) => {
                const element = target as { addNodes(records: unknown[]): Promise<void> };
                await element.addNodes([{ id: "n1", key: "n1" }]);
                return () => Promise.resolve();
            },
        },
        expect: [expect],
    };
}

/** The element's and `Graph`'s node removal. */
const REMOVE_NODES = calls([["n3"]], [removes("remove-nodes", ["n3"])]);

/** The element's and `Graph`'s clear. */
const CLEAR_DATA = calls([], [CLEAR]);

/** A small graph document the JSON data source reads, for the load doors. */
/** What `data.removeSource("s1")` dispatches inside its batch, after loading {@link TINY_JSON}. */
const REMOVE_SOURCE_STEPS: readonly SessionCommand[] = [
    { op: "data.apply", mutation: { kind: "remove-edges", ids: ["0"] } },
    { op: "data.apply", mutation: { kind: "remove-nodes", ids: ["j1", "j2"] } },
    { op: "data.setSource", source: { type: "json", config: {} }, sources: [], provenance: {} },
];

/** The roles the `replaceSource` and `reloadSource` doors read their edge table with. */
const DOOR_SHIPS_MAPPING = {
    tables: {
        rows: {
            rowsAre: "edges" as const,
            source: { column: "source" },
            target: { column: "target" },
            weight: null,
            time: null,
            edgeId: null,
        },
    },
};
/** The load the `replaceSource` door replaces. */
const DOOR_SHIPS_CSV = "source,target\nr1,r2\nr2,r3\n";
/** The newer copy the `replaceSource` door replaces it with: r2-r3 gone, r1-r4 new. */
const DOOR_REPLACE_CSV = "source,target\nr1,r2\nr1,r4\n";
/** The `replaceSource` door's copy, as the step that merges it names it. */
const DOOR_REPLACE_SOURCE = { type: "csv", config: { data: DOOR_REPLACE_CSV }, name: "door-ships-2.csv" };
/** What `data.replaceSource("s1", ...)` dispatches inside its batch. */
const REPLACE_SOURCE_STEPS: readonly SessionCommand[] = [
    { op: "data.apply", mutation: { kind: "remove-edges", ids: ["1"] } },
    { op: "data.apply", mutation: { kind: "remove-nodes", ids: ["r3"] } },
    {
        op: "data.setSource",
        source: { type: "csv", name: "door-ships.csv", config: {} },
        sources: [],
        provenance: {},
    },
    {
        op: "data.import",
        source: DOOR_REPLACE_SOURCE,
        tables: ["door-ships-2.csv"],
        tableRows: ["edges"],
        mode: "merge",
        held: {
            // An edge table's ends get node rows of their own, so the nodes they make are drawn.
            nodes: [{ id: "r1" }, { id: "r2" }, { id: "r4" }],
            edges: [
                { source: "r1", target: "r2" },
                { source: "r1", target: "r4" },
            ],
            edgeLines: [2, 3],
            declaredDirection: null,
            errors: [],
            errorLimit: 100,
            idPath: "id",
            source: "source",
            target: "target",
            weight: null,
            repeated: "first",
        },
        mapping: DOOR_SHIPS_MAPPING,
        input: "i2",
        key: "s1",
        origin: "file",
    },
];
/** The `reloadSource` door's load, as the step that reads it again names it. */
const DOOR_SHIPS_SOURCE = { type: "csv", config: { data: DOOR_SHIPS_CSV }, name: "door-ships.csv" };
/** What `data.reloadSource("s1", {})` dispatches inside its batch: the same rows, read again. */
const RELOAD_SOURCE_STEPS: readonly SessionCommand[] = [
    { op: "data.apply", mutation: { kind: "remove-edges", ids: [] } },
    { op: "data.apply", mutation: { kind: "remove-nodes", ids: [] } },
    {
        op: "data.setSource",
        source: { type: "csv", name: "door-ships.csv", config: {} },
        sources: [],
        provenance: {},
    },
    {
        op: "data.import",
        source: DOOR_SHIPS_SOURCE,
        tables: ["door-ships.csv"],
        tableRows: ["edges"],
        mode: "merge",
        held: {
            nodes: [{ id: "r1" }, { id: "r2" }, { id: "r3" }],
            edges: [
                { source: "r1", target: "r2" },
                { source: "r2", target: "r3" },
            ],
            edgeLines: [2, 3],
            declaredDirection: null,
            errors: [],
            errorLimit: 100,
            idPath: "id",
            source: "source",
            target: "target",
            weight: null,
            repeated: "first",
        },
        mapping: DOOR_SHIPS_MAPPING,
        input: "i2",
        key: "s1",
        origin: "file",
    },
];
/** What `data.reloadSource("s1", {})` dispatches: the batch, then its steps. */
const RELOAD_SOURCE_EXPECT: readonly unknown[] = [
    {
        op: "batch",
        label: "Replaced door-ships.csv",
        fact: {
            code: "data.replace-source",
            params: { key: "s1", name: "door-ships.csv", added: 0, removed: 0, changed: 0 },
        },
        steps: RELOAD_SOURCE_STEPS,
    },
    ...RELOAD_SOURCE_STEPS,
];
/** What `data.replaceSource("s1", ...)` dispatches: the batch, then its steps. */
const REPLACE_SOURCE_EXPECT: readonly unknown[] = [
    {
        op: "batch",
        label: "Replaced door-ships.csv",
        fact: {
            code: "data.replace-source",
            params: { key: "s1", name: "door-ships-2.csv", added: 2, removed: 2, changed: 0 },
        },
        steps: REPLACE_SOURCE_STEPS,
    },
    ...REPLACE_SOURCE_STEPS,
];

/** The table the `editJoin` door joins onto one node. */
const DOOR_JOIN_CSV = "name,score\ndoor-j1,5\n";

/** The join the `editJoin` door edits, as `data.joins()` lists it. */
const DOOR_JOIN = {
    source: "s1",
    onto: null,
    shape: "node-values",
    choices: { keys: [{ file: "name", graph: "id" }], shape: "node-values" },
    rows: 1,
    matched: 1,
    columns: ["score"],
    table: { name: "door-join.csv", columns: ["name", "score"], rows: [{ name: "door-j1", score: 5 }] },
    before: { "door-j1": { score: null } },
} as const;

/** What `data.editJoin("s1", ...)` dispatches inside its batch. */
const EDIT_JOIN_STEPS: readonly SessionCommand[] = [
    {
        op: "data.apply",
        mutation: {
            kind: "update-rows",
            target: "node",
            rows: [{ id: "door-j1", values: { id: "door-j1" } }],
            replace: true,
        },
    },
    {
        op: "data.apply",
        mutation: { kind: "update-rows", target: "node", rows: [{ id: "door-j1", values: { score: 5 } }] },
    },
    {
        op: "data.setSource",
        source: { type: "csv", name: "door-join.csv", config: {} },
        sources: [
            {
                type: "csv",
                name: "door-join.csv",
                config: {},
                key: "s1",
                kind: "join",
                join: DOOR_JOIN,
                tables: ["door-join.csv"],
                tableRows: ["nodes"],
                added: { nodes: 0, edges: 0 },
                counts: { nodes: 1, edges: 0 },
            },
        ],
        provenance: { s1: { nodes: ["door-j1"], edges: [] } },
    },
];

/** What `data.setRole({ kind: "node", name: "doorTitle" }, "label")` dispatches inside its batch. */
const SET_LABEL_ROLE: SessionCommand = {
    op: "config.set",
    values: { data: { knownFields: { nodeLabelPath: "doorTitle" } } },
};

/** What `data.setType({ kind: "node", name: "doorAmount" }, "number")` dispatches inside its batch. */
const SET_TYPE_STEPS: readonly SessionCommand[] = [
    {
        op: "data.apply",
        mutation: { kind: "update-rows", target: "node", rows: [{ id: "door-amount", values: { doorAmount: 12 } }] },
    },
    { op: "data.columns", settings: { hidden: [], types: { "node:doorAmount": "number" }, renamed: {} } },
];

/** What `data.renameColumn({ kind: "node", name: "doorOld" }, "doorNew")` dispatches inside its batch. */
const RENAME_STEPS: readonly SessionCommand[] = [
    {
        op: "data.apply",
        mutation: {
            kind: "update-rows",
            target: "node",
            rows: [{ id: "door-old", values: { id: "door-old", doorNew: 1 } }],
            replace: true,
        },
    },
    {
        op: "data.columns",
        settings: { hidden: [], types: {}, renamed: { "node:doorOld": "doorNew" } },
        move: { kind: "node", from: "doorOld", to: "doorNew" },
    },
];

/** What `data.setHidden([{ kind: "node", name: "doorHidden" }], true)` dispatches inside its batch. */
const HIDE_STEP: SessionCommand = {
    op: "data.columns",
    settings: { hidden: ["node:doorHidden"], types: {}, renamed: {} },
};

/** What `data.fix("padded-space:node:doorName", "trim")` dispatches inside its batch. */
const TRIM_STEP: SessionCommand = {
    op: "data.apply",
    mutation: { kind: "update-rows", target: "node", rows: [{ id: "door-pad", values: { doorName: "Acme" } }] },
};

/** The issue state `data.fix("padded-space:node:doorName", "trim")` leaves: the issue kept as fixed. */
const FIXED_STEP: SessionCommand = {
    op: "data.issues",
    state: {
        facts: {},
        ignored: [],
        kept: [],
        fixed: [
            {
                id: "padded-space:node:doorName",
                code: "padded-space",
                column: { kind: "node", name: "doorName" },
                count: 1,
                params: { examples: [" Acme "] },
                fixedBy: "trim",
            },
        ],
    },
};

/** What `data.ignoreIssue("padded-space:node:doorName")` dispatches inside its batch. */
const IGNORE_STEP: SessionCommand = {
    op: "data.issues",
    state: { facts: {}, ignored: ["padded-space:node:doorName"], kept: [] },
};

const TINY_JSON = JSON.stringify({ nodes: [{ id: "j1" }, { id: "j2" }], edges: [{ src: "j1", dst: "j2" }] });

/** The label column a draft of TINY_JSON names its nodes by, as `data.import` does. */
const DRAFT_LABEL: SessionCommand = {
    op: "config.set",
    values: { data: { knownFields: { nodeLabelPath: "label" } } },
};

/** A draft of TINY_JSON's load: the rows it held, without reading the source again. */
const DRAFT_LOAD: SessionCommand = {
    op: "data.import",
    source: { type: "json", config: { data: TINY_JSON } },
    tables: ["json"],
    mode: "replace",
    held: {
        nodes: [{ id: "j1" }, { id: "j2" }],
        edges: [{ src: "j1", dst: "j2" }],
        declaredDirection: null,
        errors: [],
        errorLimit: 100,
    },
    input: "i1",
};

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
const AUTOSAVE_SETTING = exempt("Where and how this browser keeps the work; not part of the work a project saves.");
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
const HIGHLIGHT_DEFAULT = exempt(
    "Chooses the colour a highlight written later takes when it names none; a project file saves the layer's resolved colour.",
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
const SOURCE_EXPANSION = exempt(
    "Fetches from the network source that loaded the node, then dispatches data.source-expand (data.collapse " +
        "for a collapse) as one step; it needs a node a source brought, so it is checked by " +
        "test/session/sources/expand.test.ts and test/interactions/expand-real-input.test.ts.",
);
const SOURCE_REFRESH = exempt(
    "Reads a load from its source again, then dispatches one batch of the difference (data.replace-source), " +
        "or nothing when nothing changed; it needs a load a source brought, so it is checked by " +
        "test/session/sources/preview-refresh.test.ts.",
);
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
    assets: READ,
    network: READ,
    journal: READ,
    selection: READ,
    visibility: READ,
    time: READ,
    styles: READ,
    shaders: READ,
    views: READ,
    layout: READ,
    positions: READ,
    seededNodeCount: READ,
    status: READ,
    catalog: READ,
    features: READ,
    config: READ,
    capabilities: READ,
    acceleration: MACHINE,
    setAccelerator: MACHINE,
    // Its coordinate and pin columns are copies, so a write there moves nothing.
    snapshot: READ,
    fingerprint: READ,
    recipe: READ,
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
    recommendLayout: READ,
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
    origin: READ,
    originPaths: READ,
    layerSelector: READ,
    has: READ,
    nodeMask: READ,
    edgeMask: READ,
    apply: SELECTION,
    count: READ,
    checkRule: READ,
    clear: SELECTION,
    hovered: READ,
    hover: exempt("The pointer resting on a node is view state, not a step, like the selection."),
    hoverPreview: READ,
    previewHover: exempt("A preview of the hover look on the selection is view state, like the pointer."),
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

/**
 * A door that changes the one condition `c1` (keep degree at least 1), which it adds first.
 * @param args - The arguments.
 * @param conditions - The conditions the call must leave.
 * @returns The door.
 */
function conditionDoor(args: readonly unknown[], conditions: readonly unknown[]): Door {
    return {
        kind: "dispatches",
        op: "visibility.conditions",
        call: {
            kind: "call",
            args,
            around: async (target) => {
                const visibility = target as { setConditions(list: unknown[]): Promise<unknown> };
                await visibility.setConditions([{ id: "c1", effect: "keep", rule: { kind: "degree", min: 1 } }]);
                return async () => visibility.setConditions([]);
            },
        },
        expect: [{ op: "visibility.conditions", conditions }],
    };
}

/** The rows of `VisibilityApi`, shared with the element's wider form of it. */
const VISIBILITY_API: Readonly<Record<string, Door>> = {
    nodeMask: READ,
    edgeMask: READ,
    isVisible: READ,
    nodes: READ,
    edges: READ,
    summary: READ,
    summaryOf: READ,
    filter: READ,
    window: READ,
    set: calls([{ kind: "degree", min: 1 }], [{ op: "visibility.set", filter: { kind: "degree", min: 1 } }]),
    setWindow: calls(
        [{ attribute: "data.t", from: 0, to: 1 }],
        [{ op: "visibility.window", window: { attribute: "data.t", from: 0, to: 1 } }],
    ),
    showContext: assigns(true, [{ op: "visibility.context", show: true }]),
    steps: READ,
    setSteps: calls(
        [[{ id: "s1", on: true, rule: { kind: "degree", min: 1 } }]],
        [{ op: "visibility.steps", steps: [{ id: "s1", on: true, rule: { kind: "degree", min: 1 } }] }],
    ),
    conditions: READ,
    setConditions: calls(
        [[{ id: "c1", effect: "exclude", rule: { kind: "degree", min: 1 } }]],
        [
            {
                op: "visibility.conditions",
                conditions: [{ id: "c1", on: true, effect: "exclude", rule: { kind: "degree", min: 1 } }],
            },
        ],
    ),
    addCondition: calls(
        [{ id: "c1", effect: "keep", rule: { kind: "degree", min: 1 } }],
        [
            {
                op: "visibility.conditions",
                conditions: [{ id: "c1", on: true, effect: "keep", rule: { kind: "degree", min: 1 } }],
            },
        ],
    ),
    updateCondition: conditionDoor(
        ["c1", { on: false }],
        [{ id: "c1", on: false, effect: "keep", rule: { kind: "degree", min: 1 } }],
    ),
    removeCondition: conditionDoor(["c1"], []),
    conditionCounts: READ,
};

/**
 * A door on `session.time` that moves the window: a field on `t` is designated first (not
 * spied), so with no window it opens the first one at 0, a day wide, and moves from there.
 * @param args - The arguments.
 * @param window - The window the move must dispatch.
 * @returns The door.
 */
function timeMove(args: readonly unknown[], window: Readonly<Record<string, unknown>>): Door {
    return {
        kind: "dispatches",
        op: "visibility.window",
        call: {
            kind: "call",
            args,
            around: async (target) => {
                const time = target as { setField(field: unknown): Promise<unknown> };
                await time.setField({ edges: { start: "t" } });
                return async () => time.setField(null);
            },
        },
        expect: [{ op: "visibility.window", window: { attribute: "data.t", nodes: "ends", ...window } }],
    };
}

/** The rows of `TimeApi`. */
const TIME_API: Readonly<Record<string, Door>> = {
    field: READ,
    setField: calls(
        [{ edges: { start: "t" } }],
        [
            {
                op: "config.set",
                values: {
                    data: {
                        knownFields: { nodeTimePath: null, nodeTimeUnit: null, edgeTimePath: "t", edgeTimeUnit: null },
                    },
                },
            },
        ],
    ),
    ready: READ,
    extent: READ,
    bins: READ,
    changes: READ,
    current: READ,
    // The window takes the step in use: with no data, the automatic step is a day.
    window: calls(
        [{ attribute: "data.t", from: 0, to: 1 }],
        [{ op: "visibility.window", window: { attribute: "data.t", from: 0, to: 1, step: "day" } }],
    ),
    play: exempt(
        "Starts a timer, which is not project state; each step it then takes is a visibility.window command, and one play records one step.",
    ),
    pause: exempt("Stops the timer; the steps already taken are recorded."),
    // With no data the automatic step is a day; a first step forward opens the first window.
    stepBy: timeMove([1], { from: 0, to: 86_400_000, step: "day" }),
    seek: timeMove([5], { from: 5, to: 86_400_005, step: "day" }),
    commit: exempt(
        "Records a cursor that seek({ commit: false }) moved as the visibility.window command seek dispatches; with no cursor it changes nothing.",
    ),
    candidates: READ,
    notices: READ,
    parse: READ,
    atStart: READ,
    atEnd: READ,
    settings: READ,
    setSettings: calls([{ mode: "cumulative" }], [{ op: "visibility.playback", playback: { mode: "cumulative" } }]),
    playing: READ,
    mode: READ,
    interval: READ,
};

/** A layer the style doors add. */
const DOOR_LAYER: LayerSpec = {
    name: "door layer",
    target: "node",
    selector: { match: "everything" },
    set: { "node.color": "#ff0000" },
};

/** The rows of `StylesApi`, shared with the element's wider form of it. */
/** A shader the doors add, replace and remove. */
const DOOR_SHADER = `/* graphty-shader 1
{ "id": "user/door", "name": "Door" }
*/
vec4 shade(NodeInput n) { return n.color; }
`;

/**
 * A shader door that acts on the door shader once it is in the project.
 * @param args - The arguments.
 * @param expect - The commands it dispatches.
 * @returns The door.
 */
function onDoorShader(args: readonly unknown[], expect: readonly SessionCommand[]): Door {
    return {
        kind: "dispatches",
        op: "shader.set",
        call: {
            kind: "call",
            args,
            around: async (target) => {
                await (target as { add(text: string): PromiseLike<unknown> }).add(DOOR_SHADER);
                return () => Promise.resolve();
            },
        },
        expect,
    };
}

/** The rows of `session.shaders`. */
const SHADERS_API: Readonly<Record<string, Door>> = {
    add: calls([DOOR_SHADER], [{ op: "shader.set", id: "user/door", text: DOOR_SHADER }]),
    check: READ,
    replace: onDoorShader(
        ["user/door", DOOR_SHADER.replace("return n.color;", "return n.color * 0.5;")],
        [{ op: "shader.set", id: "user/door", text: DOOR_SHADER.replace("return n.color;", "return n.color * 0.5;") }],
    ),
    remove: onDoorShader(["user/door"], [{ op: "shader.set", id: "user/door", text: null }]),
    source: READ,
    list: READ,
    status: READ,
    availability: READ,
    approve: exempt(
        "Lets a shader the project already holds run; whether it may run is the reader's trust, never saved in a project file.",
    ),
    thumbnail: CAPTURE,
};

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
    addRow: calls(
        [{ name: "door row", target: "both", selector: { match: "everything" }, set: { color: "#ff0000" } }],
        [
            {
                op: "style.patch",
                action: "addRow",
                spec: {
                    name: "door row",
                    target: "both",
                    selector: { match: "everything" },
                    set: { color: "#ff0000" },
                },
            },
        ],
    ),
    writeRow: calls(
        ["no-such-layer", { name: "renamed" }],
        [{ op: "style.patch", action: "writeRow", id: "no-such-layer", write: { name: "renamed" } }],
    ),
    parts: READ,
    colors: READ,
    // One fixed colour written by a layer the call sets up; the swap is one update of it.
    replaceColor: {
        kind: "dispatches",
        op: "style.patch",
        call: {
            kind: "call",
            args: [["door-red_1"], "#FF0000", "#00ff00"],
            around: async (target) => {
                await (target as { add(spec: LayerSpec): PromiseLike<unknown> }).add(DOOR_RED);
                return () => Promise.resolve();
            },
        },
        expect: [
            {
                op: "style.patch",
                action: "update",
                id: "door-red_1",
                patch: { set: { "node.color": "#00ff00" } },
            },
        ],
    },
    layersUnder: READ,
    // Many layers patched in one step: here one, the layer the call sets up.
    updateMany: {
        kind: "dispatches",
        op: "style.patch",
        call: {
            kind: "call",
            args: [[{ id: "door-red_1", patch: { set: { "node.color": "#00ff00" } } }]],
            around: async (target) => {
                await (target as { add(spec: LayerSpec): PromiseLike<unknown> }).add(DOOR_RED);
                return () => Promise.resolve();
            },
        },
        expect: [
            {
                op: "style.patch",
                action: "update",
                id: "door-red_1",
                patch: { set: { "node.color": "#00ff00" } },
            },
        ],
    },
    encode: calls(
        [{ run: "no-such-run", field: "value", channel: "node.color" }],
        [{ op: "style.encode", spec: { run: "no-such-run", field: "value", channel: "node.color" } }],
    ),
    highlight: calls(
        [{ run: "no-such-run" }],
        [{ op: "style.patch", action: "highlight", spec: { run: "no-such-run" } }],
    ),
    highlightStyle: READ,
    defaultValue: READ,
    mark: calls(
        [{ run: "no-such-run", set: { "node.color": "#ff0000" } }],
        [{ op: "style.patch", action: "mark", spec: { run: "no-such-run", set: { "node.color": "#ff0000" } } }],
    ),
    legend: READ,
    proposeEncoding: READ,
    settled: READ,
    explain: READ,
    agreement: READ,
    preview: READ,
    sequence: READ,
    layerGroups: READ,
    counts: READ,
    legendOf: READ,
    resolveToStatic: calls(
        ["no-such-layer", "node.color"],
        [{ op: "style.patch", action: "resolveToStatic", id: "no-such-layer", channel: "node.color" }],
    ),
    setValueHidden: calls(
        ["no-such-layer", "node.color", 0, true],
        [{ op: "style.patch", action: "update", id: "no-such-layer", patch: {} }],
    ),
    // A value entry patches the layer it names, and an unknown one patches nothing.
    setValueEntry: calls(
        ["no-such-layer", "node.color", 0, "#ff0000"],
        [{ op: "style.patch", action: "update", id: "no-such-layer", patch: {} }],
    ),
    categories: READ,
    groups: READ,
    setValueEntries: calls(
        ["no-such-layer", "data.group", [{ channel: "node.shape", value: 0, entry: "box" }]],
        [{ op: "style.patch", action: "update", id: "no-such-layer", patch: {} }],
    ),
    setFoldBelow: calls(
        ["no-such-layer", "data.group", 3],
        [{ op: "style.patch", action: "update", id: "no-such-layer", patch: {} }],
    ),
    valueAt: READ,
    applyTemplate: calls(
        [{ version: 1, layers: [] }],
        [{ op: "style.template", document: { version: 1, layers: [] } }],
    ),
    toDocument: READ,
    tree: READ,
    addFolder: calls(["door folder"], [{ op: "style.patch", action: "addFolder", name: "door folder" }]),
    renameRow: calls(
        ["no-such-row", "renamed"],
        [{ op: "style.patch", action: "renameRow", id: "no-such-row", name: "renamed" }],
    ),
    moveRow: calls(
        ["no-such-row", { parent: null, index: 0 }],
        [{ op: "style.patch", action: "moveRow", id: "no-such-row", to: { parent: null, index: 0 } }],
    ),
    pinRow: calls(["no-such-row", "top"], [{ op: "style.patch", action: "pinRow", id: "no-such-row", pin: "top" }]),
    lockRow: calls(["no-such-row", true], [{ op: "style.patch", action: "lockRow", id: "no-such-row", locked: true }]),
    hideRow: calls(["no-such-row", true], [{ op: "style.patch", action: "hideRow", id: "no-such-row", hidden: true }]),
    deleteRow: calls(["no-such-row"], [{ op: "style.patch", action: "deleteRow", id: "no-such-row" }]),
    restoreStartingRows: calls([], [{ op: "style.patch", action: "restoreStartingRows" }]),
    toFile: READ,
    setDefaultPalettes: PALETTE_DEFAULTS,
    setHighlightColor: HIGHLIGHT_DEFAULT,
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
            labelOf: READ,
            edgeLabelCounts: READ,
            setDefaultPalettes: PALETTE_DEFAULTS,
            run: calls(["degree"], [RUN_DEGREE]),
            select: SELECTION,
            connectedCallback: LIFECYCLE,
            attributeChangedCallback: LIFECYCLE,
            firstUpdated: LIFECYCLE,
            asyncFirstUpdated: LIFECYCLE,
            render: LIFECYCLE,
            disconnectedCallback: LIFECYCLE,
            // Called while the element holds n1, n2 and n3: the ones not named again go.
            nodeData: assigns(
                [{ id: "x1" }],
                batchOf(
                    "Replaced the nodes",
                    removes("remove-nodes", ["n1", "n2", "n3"]),
                    addNodesBy("id", { id: "x1" }),
                ),
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
            edgeTimePath: assigns("t", [
                { op: "config.set", values: { data: { knownFields: { edgeTimePath: "t" } } } },
            ]),
            nodeTimePath: assigns("t", [
                { op: "config.set", values: { data: { knownFields: { nodeTimePath: "t" } } } },
            ]),
            edgeTimeUnit: assigns("s", [
                { op: "config.set", values: { data: { knownFields: { edgeTimeUnit: "s" } } } },
            ]),
            nodeTimeUnit: assigns("s", [
                { op: "config.set", values: { data: { knownFields: { nodeTimeUnit: "s" } } } },
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
            renderOnDemand: VIEW_SETTING,
            shaderSettings: exempt(
                "The reader's shader preferences and trust, never saved in a project file and never read from one.",
            ),
            renderQuality: READ,
            lighting: VIEW_SETTING,
            autoRotate: VIEW_SETTING,
            fitInsets: VIEW_SETTING,
            pixelRatio: VIEW_SETTING,
            selectionStyle: assigns({ color: "#ff0000" }, [
                { op: "config.set", values: { selectionStyle: { color: "#ff0000" } } },
            ]),
            algorithmsOnLoad: assigns([], [{ op: "config.set", values: { data: { algorithms: [] } } }]),
            viewMode: assigns("2d", [DIMENSION_2D]),
            layout2d: assigns(true, [DIMENSION_2D]),
            background: assigns({ backgroundType: "color", color: "#101010" }, [
                { op: "config.set", values: { background: { backgroundType: "color", color: "#101010" } } },
            ]),
            basemapStatus: READ,
            mapFrame: READ,
            attributionOffset: CAMERA,
            globeLook: VIEW_SETTING,
            cameraTransitionDuration: CAMERA,
            startingCameraDistance: CAMERA,
            autoFrame: CAMERA,
            zoomToPointer: CAMERA,
            viewInsets: CAMERA,
            runAlgorithmsOnLoad: assigns(true, [{ op: "config.set", values: { runAlgorithmsOnLoad: true } }]),
            historyKeys: INPUT,
            enableDetailedProfiling: PROFILING,
            xr: XR,
            captureScreenshot: CAPTURE,
            nodeThumbnail: CAPTURE,
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
            downloadGraph: exempt("Hands an export to the reader as a file; it changes nothing a project saves."),
            autosave: AUTOSAVE_SETTING,
            autosaveRestore: AUTOSAVE_SETTING,
            autosaveOptions: AUTOSAVE_SETTING,
            autosaver: READ,
            features: exempt("Which experiments the page switches on; not part of the work a project saves."),
            enabledFeatures: READ,
            importCameraPresets: calls(
                [{ "door import": { zoom: 3 } }],
                [{ op: "view.save", views: [{ name: "door import", camera: { zoom: 3 } }] }],
            ),
            graph: READ,
            ...DATA_DOORS,
            removeNodes: REMOVE_NODES,
            addDataFromSource: ADD_FROM_SOURCE,
            loadFromUrl: LOAD_FROM_URL_ELEMENT,
            loadFromSource: LOAD_FROM_SOURCE,
            // The reader's remembered credentials: secrets of this machine, never in a project.
            credentials: READ,
            loadFromFile: LOAD_FROM_FILE,
            pin: pinsN1(PIN_N1),
            unpin: pinsN1(UNPIN_N1),
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
            cameraPlaced: READ,
            batchOperations: BATCH,
            on: LISTEN,
            addListener: LISTEN,
            addEventListener: LISTEN,
            removeEventListener: LISTEN,
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
            nodeScreenPosition: READ,
            nodesInRect: READ,
            screenToWorld: READ,
            elementAt: READ,
            groupOutlineAt: READ,
            drawnShaders: READ,
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
            needRays: RENDER,
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
            labelOf: READ,
            edgeLabelCounts: READ,
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
            resize: RENDER,
            setBackground: calls(
                [{ backgroundType: "color", color: "#202020" }],
                [{ op: "config.set", values: { background: { backgroundType: "color", color: "#202020" } } }],
            ),
            basemapStatus: READ,
            mapFrame: READ,
            setAttributionOffset: CAMERA,
            getCameraTransitionDuration: READ,
            setCameraTransitionDuration: CAMERA,
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
            // Called while the graph holds every node the rows above left: naming them all again removes
            // none, and n1, which `updateNodes` gave a weight, takes back the bare record it is handed.
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
                    {
                        op: "data.apply",
                        mutation: {
                            kind: "update-rows",
                            target: "node",
                            rows: [{ id: "n1", values: { id: "n1" } }],
                            replace: true,
                        },
                    },
                    addNodesBy(
                        "id",
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
            setPixelRatio: VIEW_SETTING,
            pixelRatio: READ,
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
            isCameraPlaced: READ,
            saveCameraPlacement: READ,
            setAutoFrame: CAMERA,
            getZoomToPointer: READ,
            setZoomToPointer: CAMERA,
            getLighting: READ,
            setLighting: VIEW_SETTING,
            getGlobeLook: READ,
            setGlobeLook: VIEW_SETTING,
            getViewInsets: READ,
            setViewInsets: CAMERA,
            setViewMode: calls(["2d"], [DIMENSION_2D]),
            needsRayUpdate: READ,
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
            nodeScreenPosition: READ,
            screenToWorld: READ,
            elementAt: READ,
            groupOutlineAt: READ,
            drawnShaders: READ,
            getCameraController: READ,
            getNodeMesh: READ,
            waitForSettled: READ,
            isFrameStable: READ,
            waitForStableFrame: READ,
            captureScreenshot: CAPTURE,
            nodeThumbnail: CAPTURE,
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
            setMeshPosition: RENDER,
            updateStyle: RENDER,
            refreshFonts: RENDER,
            refitPicture: RENDER,
            applySessionPaint: RENDER,
            dispose: RENDER,
            isDisposed: READ,
            modelDrawn: READ,
            getRenderState: READ,
            setRenderState: RENDER,
            isSelected: READ,
            setSelected: SELECTION,
            refreshSelectionOverlay: RENDER,
            shaderStateChanged: RENDER,
            shaderStateBits: RENDER,
            refreshShaderPaint: RENDER,
            refreshScreenBorder: RENDER,
            pin: calls([], [PIN_N1]),
            unpin: calls([], [UNPIN_N1]),
            showTooltip: RENDER,
            hideTooltip: RENDER,
            tooltipText: READ,
            getPosition: READ,
            isPinned: READ,
            roundRadius: READ,
            drawnFill: READ,
            drawnRadius: READ,
            layoutRadius: READ,
            paintedColor: READ,
            borderReach: READ,
            framingBounds: READ,
            drawnHalfExtents: READ,
            surfaceIsBox: READ,
            outlineHalfExtents: READ,
            groupSizing: READ,
            wordedLabel: READ,
            decorationPieces: READ,
            shapeTextLabels: RENDER,
            xlabelLabel: RENDER,
            syncXlabelPlace: RENDER,
            isDrawnAsGroup: READ,
            groupDrawnForAnotherCamera: READ,
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
            arrowCap: RENDER,
            arrowTailCap: RENDER,
            arrowMiddleHeadCap: RENDER,
            arrowMiddleTailCap: RENDER,
            arrowMesh: RENDER,
            arrowTailMesh: RENDER,
            ray: RENDER,
            label: RENDER,
            xlabelLabel: RENDER,
            arrowHeadText: RENDER,
            arrowTailText: RENDER,
            parallelRank: RENDER,
            parallelCount: RENDER,
            drawnLine: READ,
            drawnCurve: READ,
            drawnEffects: READ,
            refreshShaderPaint: RENDER,
            shaderDataChanged: RENDER,
            drawnPattern: READ,
            drawnCentre: READ,
            drawnCaps: READ,
            arrowHeadStackCaps: READ,
            arrowTailStackCaps: READ,
            drawnGradient: READ,
            invalidatePositionCache: RENDER,
            update: RENDER,
            updateStyle: RENDER,
            refreshFonts: RENDER,
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
            supportEdge: READ,
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
            publishModelChange: EVENTS,
            emptyClick: EVENTS,
            elementClick: EVENTS,
            groupOutlineClick: EVENTS,
        },
    },
    {
        name: "Run",
        file: "src/session/runs/types.ts",
        half: "session",
        doors: {
            id: READ,
            label: READ,
            distinguishedBy: READ,
            siblingsDifferBy: READ,
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
            nodeVersion: RENDER,
            nodeCache: RENDER,
            edgesByIndex: READ,
            isLoading: READ,
            heldCounts: READ,
            rankSets: READ,
            supportPoints: RENDER,
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
            groups: READ,
            updateStyles: RENDER,
            setGraphContext: LIFECYCLE,
            setLayoutEngine: LIFECYCLE,
            init: LIFECYCLE,
            dispose: LIFECYCLE,
            bindSession: LIFECYCLE,
            reconcile: RENDER,
            // The draw gate: what the graph pass painted and what a frame has applied.
            takeLateEdgeRows: RENDER,
            notePainted: RENDER,
            notePaintDrawn: RENDER,
            drawHeld: READ,
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
            drawnBundle: READ,
            incidentEdgeIds: READ,
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
                    addNodesBy(
                        "id",
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
            directed: READ,
            holdsNoRows: READ,
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
            preStepsInFlight: READ,
            loadArrangement: DERIVED,
            dimension: READ,
            step: TRANSPORT,
            stepBatch: TRANSPORT,
            placeGroups: TRANSPORT,
            groupBox: READ,
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
            drawArrivedPaint: RENDER,
            // The layout scope lives in the `layout` slice; these hand it to the engine and read
            // it back, and a set removed under it releases the hold without a step.
            setScopeSource: LIFECYCLE,
            scope: READ,
            scopeUser: READ,
            releaseDetachedScope: DERIVED,
        },
    },
    {
        name: "SupportPoints",
        file: "src/meshes/supportPoints.ts",
        half: "renderer",
        whole: RENDER,
    },
    {
        name: "UpdateManager",
        file: "src/managers/UpdateManager.ts",
        half: "renderer",
        whole: RENDER,
    },
    {
        name: "PendingWork",
        file: "src/managers/PendingWork.ts",
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
        name: "CredentialStore",
        file: "src/credentials/CredentialStore.ts",
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
        name: "AutosaveApi",
        file: "src/autosave/types.ts",
        half: "renderer",
        doors: {
            status: READ,
            ready: READ,
            restored: READ,
            list: READ,
            flush: exempt("Writes the work to the browser's storage; it changes nothing a project saves."),
            remove: exempt("Deletes a saved copy in the browser's storage, not the work in the graph."),
            removeAll: exempt("Deletes saved copies in the browser's storage, not the work in the graph."),
            stash: exempt("Keeps the host's own state beside the work; a project file does not save it."),
            stashed: READ,
            requestPersistence: exempt("Asks the browser to keep this site's storage; it changes no work."),
            restore: exempt(
                "Opens a saved copy through project.open, one transaction whose writes go through the " +
                    "session's own doors, which have rows of their own.",
            ),
            discard: exempt(
                "Deletes this tab's saved copy and opens the page's own data again through project.open " +
                    "and the data doors, which have rows of their own.",
            ),
        },
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
            needsRayUpdate: READ,
            getConfig: VIEW_SETTING,
            isRunning: READ,
            setRunning: IN_FLIGHT,
            getXRConfig: READ,
            getXRSessionManager: READ,
            getSelectionManager: READ,
            getEventManager: READ,
            getAcceleration: READ,
            getUpdateManager: READ,
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
            onPointerDown: GESTURE,
            onPointerMove: GESTURE,
            onPointerUp: GESTURE,
            onHover: INPUT,
            getNode: READ,
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
            name: READ,
            edge: READ,
            nodes: READ,
            edges: READ,
            // Deep-frozen records, read a window at a time.
            nodePage: READ,
            edgePage: READ,
            resultColumns: READ,
            neighbors: READ,
            lastImport: READ,
            loadedWeight: READ,
            source: READ,
            sources: READ,
            sourcesOf: READ,
            issues: READ,
            hiddenColumns: READ,
            // The fix's rows and the issue state it settles, as one batch.
            fix: {
                kind: "dispatches",
                op: "batch",
                call: {
                    kind: "call",
                    args: ["padded-space:node:doorName", "trim"],
                    around: async (target) => {
                        const data = target as { addNodes(records: unknown[]): Promise<void> };
                        await data.addNodes([{ id: "door-pad", doorName: " Acme " }]);
                        return () => Promise.resolve();
                    },
                },
                expect: [
                    {
                        op: "batch",
                        label: "Fixed padded-space",
                        fact: {
                            code: "data.fix-issue",
                            params: {
                                issue: "padded-space:node:doorName",
                                code: "padded-space",
                                fix: "trim",
                                count: 1,
                            },
                        },
                        steps: [TRIM_STEP, FIXED_STEP],
                    },
                    TRIM_STEP,
                    FIXED_STEP,
                ],
            },
            // The ignored id joins the issue state, as one batch.
            ignoreIssue: {
                kind: "dispatches",
                op: "data.issues",
                call: {
                    kind: "call",
                    args: ["padded-space:node:doorName"],
                    around: async (target) => {
                        const data = target as { addNodes(records: unknown[]): Promise<void> };
                        await data.addNodes([{ id: "door-pad", doorName: " Acme " }]);
                        return () => Promise.resolve();
                    },
                },
                expect: [
                    {
                        op: "batch",
                        label: "Ignored padded-space:node:doorName",
                        fact: {
                            code: "data.ignore-issue",
                            params: { issue: "padded-space:node:doorName", ignored: true },
                        },
                        steps: [IGNORE_STEP],
                    },
                    IGNORE_STEP,
                ],
            },
            // Every ignored id joins the issue state, as one batch.
            ignoreIssues: {
                kind: "dispatches",
                op: "data.issues",
                call: {
                    kind: "call",
                    args: [["padded-space:node:doorName"]],
                    around: async (target) => {
                        const data = target as { addNodes(records: unknown[]): Promise<void> };
                        await data.addNodes([{ id: "door-pad", doorName: " Acme " }]);
                        return () => Promise.resolve();
                    },
                },
                expect: [
                    {
                        op: "batch",
                        label: "Ignored padded-space:node:doorName",
                        fact: {
                            code: "data.ignore-issues",
                            params: { issues: ["padded-space:node:doorName"], ignored: true },
                        },
                        steps: [IGNORE_STEP],
                    },
                    IGNORE_STEP,
                ],
            },
            // The rows only that load supplied go, and the load leaves the list, as one batch.
            removeSource: {
                kind: "dispatches",
                op: "batch",
                call: {
                    kind: "call",
                    args: ["s1"],
                    around: async (target) => {
                        const data = target as { import(source: unknown): Promise<void> };
                        await data.import({ type: "json", config: { data: TINY_JSON } });
                        return () => Promise.resolve();
                    },
                },
                expect: [
                    {
                        op: "batch",
                        label: "Removed s1",
                        fact: { code: "data.remove-source", params: { key: "s1", name: null } },
                        steps: REMOVE_SOURCE_STEPS,
                    },
                    ...REMOVE_SOURCE_STEPS,
                ],
            },
            renameSource: {
                kind: "dispatches",
                op: "data.setSource",
                call: {
                    kind: "call",
                    args: ["Door source"],
                    // A source is renamed only once one is loaded.
                    around: async (target) => {
                        const data = target as { import(source: unknown): Promise<void> };
                        await data.import({ type: "json", config: { data: TINY_JSON } });
                        return () => Promise.resolve();
                    },
                },
                expect: [
                    {
                        op: "data.setSource",
                        source: { type: "json", name: "Door source", config: {} },
                        sources: [
                            {
                                type: "json",
                                config: {},
                                key: "s1",
                                kind: "file",
                                input: "i1",
                                tables: [],
                                added: { nodes: 2, edges: 1 },
                                counts: { nodes: 2, edges: 1 },
                                name: "Door source",
                            },
                        ],
                    },
                ],
            },
            // Reads and holds a source; the draft it returns loads through data.import.
            prepare: READ,
            joins: READ,
            editJoinReport: READ,
            matchesSource: READ,
            // The copy's rows replace the load's as one batch: the gone edge, the load out of the
            // list, the merge of the copy under the same key, and the load back in its place.
            replaceSource: {
                kind: "dispatches",
                op: "batch",
                call: {
                    kind: "call",
                    args: ["s1", DOOR_REPLACE_SOURCE],
                    around: async (target) => {
                        const data = target as { import(source: unknown): Promise<void> };
                        await data.import({ type: "csv", config: { data: DOOR_SHIPS_CSV }, name: "door-ships.csv" });
                        return () => Promise.resolve();
                    },
                },
                expect: REPLACE_SOURCE_EXPECT,
            },
            // Reads the load again from what it was read from, as replaceSource's one batch.
            reloadSource: {
                kind: "dispatches",
                op: "batch",
                call: {
                    kind: "call",
                    args: ["s1", {}],
                    around: async (target) => {
                        const data = target as { import(source: unknown): Promise<void> };
                        await data.import(DOOR_SHIPS_SOURCE);
                        return () => Promise.resolve();
                    },
                },
                expect: RELOAD_SOURCE_EXPECT,
            },
            // The values the join wrote go back, and the table joins anew, as one batch.
            editJoin: {
                kind: "dispatches",
                op: "batch",
                call: {
                    kind: "call",
                    args: ["s1", { keys: [{ file: "name", graph: "id" }] }],
                    around: async (target) => {
                        const data = target as {
                            addNodes(records: unknown[]): Promise<void>;
                            prepare(
                                source: unknown,
                                options: unknown,
                            ): Promise<{ load(choices: unknown): Promise<void> }>;
                        };
                        await data.addNodes([{ id: "door-j1" }]);
                        const draft = await data.prepare(
                            { type: "csv", config: { data: DOOR_JOIN_CSV }, name: "door-join.csv" },
                            { onto: "graph" },
                        );
                        await draft.load({ join: { keys: [{ file: "name", graph: "id" }] } });
                        return () => Promise.resolve();
                    },
                },
                expect: [
                    {
                        op: "batch",
                        label: "Joined again door-join.csv",
                        fact: {
                            code: "data.edit-join",
                            params: { key: "s1", name: "door-join.csv", shape: "node-values", matched: 1 },
                        },
                        steps: EDIT_JOIN_STEPS,
                    },
                    ...EDIT_JOIN_STEPS,
                ],
            },
            // Network sources (experimental). The probe and the search ask a service and change nothing;
            // the records and the waiting loads are read from the session.
            testSource: READ,
            listSource: READ,
            previewSource: READ,
            checkSource: READ,
            refresh: SOURCE_REFRESH,
            loads: READ,
            nodeSource: READ,
            pendingSourceLoads: READ,
            expand: SOURCE_EXPANSION,
            collapse: SOURCE_EXPANSION,
            // The next page after a capped load from a source: its rows, merged.
            more: {
                kind: "dispatches",
                op: "data.import-source",
                call: {
                    kind: "call",
                    args: [],
                    around: async (target) => {
                        const data = target as { import(source: unknown, options: unknown): Promise<void> };
                        await data.import(
                            { source: doorSource(), config: {} },
                            { limits: { maxNodes: 1, onLimit: "stop" } },
                        );
                        return () => Promise.resolve();
                    },
                },
                // the next page's rows carry the key of the load they continue, so an expansion finds it,
                // and count under that load's own sources() entry
                expect: [
                    sourceImport(
                        "merge",
                        ["door-s1"],
                        { key: "s1" },
                        {
                            nodes: [{ id: "door-s1", "_source.expansion": "none", "_source.loads": ["load-1"] }],
                            repeated: "first",
                        },
                    ),
                ],
            },
            // A sample a source lists, loaded with its params as one source load.
            loadSample: calls(() => {
                doorSource();
                return [DOOR_SAMPLE];
            }, [
                {
                    ...sourceImport(
                        "replace",
                        ["door-s0", "door-s1"],
                        {},
                        {
                            nodes: ["door-s0", "door-s1"].map((id) => ({
                                id,
                                "_source.expansion": "none",
                                "_source.loads": ["load-1"],
                            })),
                        },
                    ),
                    source: { type: `source:${DOOR_SOURCE}`, config: {}, name: "Door sample" },
                } as SessionCommand,
            ]),
            // A saved load of an opened project, run again: its rows, merged over the ones it brought.
            runPendingSourceLoad: {
                kind: "dispatches",
                op: "data.import-source",
                call: {
                    kind: "call",
                    args: ["door-load"],
                    around: (target) => {
                        doorSource();
                        (target as { restoreSourceMember(read: unknown): void }).restoreSourceMember(DOOR_PENDING);
                        return Promise.resolve(() => Promise.resolve());
                    },
                },
                // a rerun's rows carry the saved load's key, as the first run's did
                expect: [
                    sourceImport(
                        "merge",
                        ["door-s0", "door-s1"],
                        { existing: "update" },
                        {
                            nodes: ["door-s0", "door-s1"].map((id) => ({
                                id,
                                "_source.expansion": "none",
                                "_source.loads": ["door-load"],
                            })),
                            repeated: "first",
                        },
                    ),
                ],
            },
            attributes: READ,
            readableValues: READ,
            structureValues: READ,
            histogram: READ,
            valueCounts: READ,
            // The column commands, each one batch.
            setRole: {
                kind: "dispatches",
                op: "batch",
                call: {
                    kind: "call",
                    args: [{ kind: "node", name: "doorTitle" }, "label"],
                    around: async (target) => {
                        const data = target as { addNodes(records: unknown[]): Promise<void> };
                        await data.addNodes([{ id: "door-title", doorTitle: "Title" }]);
                        return () => Promise.resolve();
                    },
                },
                expect: [
                    {
                        op: "batch",
                        label: "Made doorTitle the label",
                        fact: { code: "data.set-role", params: { kind: "node", column: "doorTitle", role: "label" } },
                        steps: [SET_LABEL_ROLE],
                    },
                    SET_LABEL_ROLE,
                ],
            },
            previewType: READ,
            setType: {
                kind: "dispatches",
                op: "batch",
                call: {
                    kind: "call",
                    args: [{ kind: "node", name: "doorAmount" }, "number"],
                    around: async (target) => {
                        const data = target as { addNodes(records: unknown[]): Promise<void> };
                        await data.addNodes([{ id: "door-amount", doorAmount: "12" }]);
                        return () => Promise.resolve();
                    },
                },
                expect: [
                    {
                        op: "batch",
                        label: "Made doorAmount number",
                        fact: {
                            code: "data.set-type",
                            params: { kind: "node", column: "doorAmount", type: "number", fails: 0 },
                        },
                        steps: SET_TYPE_STEPS,
                    },
                    ...SET_TYPE_STEPS,
                ],
            },
            renameColumn: {
                kind: "dispatches",
                op: "batch",
                call: {
                    kind: "call",
                    args: [{ kind: "node", name: "doorOld" }, "doorNew"],
                    around: async (target) => {
                        const data = target as { addNodes(records: unknown[]): Promise<void> };
                        await data.addNodes([{ id: "door-old", doorOld: 1 }]);
                        return () => Promise.resolve();
                    },
                },
                expect: [
                    {
                        op: "batch",
                        label: "Renamed doorOld to doorNew",
                        fact: {
                            code: "data.rename-column",
                            params: { kind: "node", column: "doorOld", name: "doorNew" },
                        },
                        steps: RENAME_STEPS,
                    },
                    ...RENAME_STEPS,
                ],
            },
            // A batch around one data.columns, the op a project file's open dispatches bare.
            setHidden: {
                kind: "dispatches",
                op: "data.columns",
                call: {
                    kind: "call",
                    args: [[{ kind: "node", name: "doorHidden" }], true],
                    around: async (target) => {
                        const data = target as { addNodes(records: unknown[]): Promise<void> };
                        await data.addNodes([{ id: "door-hidden", doorHidden: 1 }]);
                        return () => Promise.resolve();
                    },
                },
                expect: [
                    {
                        op: "batch",
                        label: "Hid 1 columns",
                        fact: { code: "data.hide-columns", params: { count: 1 } },
                        steps: [HIDE_STEP],
                    },
                    HIDE_STEP,
                ],
            },
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
            setValueLabel: calls(
                ["data.group", 1, "First"],
                [{ op: "data.label", path: "data.group", value: 1, label: "First" }],
            ),
            valueLabels: READ,
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
                [
                    {
                        op: "batch",
                        fact: { code: "data.import", params: { name: null, type: "json" } },
                        steps: [
                            { op: "config.set", values: { data: { knownFields: { nodeLabelPath: "label" } } } },
                            // The token of what the rows were read from, so the load can be read again.
                            imports("replace", { type: "json", config: { data: TINY_JSON } }, { input: "i1" }),
                        ],
                    },
                    // A graph file names its nodes by its label column, as a draft's load does.
                    { op: "config.set", values: { data: { knownFields: { nodeLabelPath: "label" } } } },
                    imports("replace", { type: "json", config: { data: TINY_JSON } }, { input: "i1" }),
                ],
            ),
            // The generated graph's records, through the JSON reader.
            generate: calls(
                ["path", { n: 2 }],
                [
                    imports(
                        "replace",
                        { type: "json", name: "path", config: { data: GENERATED_PATH_JSON } },
                        { origin: "sample" },
                    ),
                ],
            ),
            loadDataset: {
                kind: "dispatches",
                op: "data.import",
                call: {
                    kind: "call",
                    args: ["door-dataset", { baseUrl: "https://door.invalid/" }],
                    // The download is answered here, with a two-node dataset file.
                    around: async () => {
                        const bytes = fromEdgeArrays({
                            directed: false,
                            nodeCount: 2,
                            src: new Uint32Array([0]),
                            dst: new Uint32Array([1]),
                            ids: ["d1", "d2"],
                        }).toBytes();
                        const zipped = await new Response(
                            new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip")),
                        ).arrayBuffer();
                        const original = globalThis.fetch;
                        globalThis.fetch = () => Promise.resolve(new Response(zipped));
                        return () => {
                            globalThis.fetch = original;
                            return Promise.resolve();
                        };
                    },
                },
                expect: [
                    imports(
                        "replace",
                        { type: "json", name: "door-dataset", config: { data: DATASET_JSON } },
                        { origin: "sample" },
                    ),
                ],
            },
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
            graphtyDocument: READ,
            missing: READ,
            resolve: READ,
            // Measured in a scratch session; this one is untouched.
            report: READ,
            rows: READ,
            styles: READ,
            suggestJoin: READ,
            joinReport: READ,
            // A draft of TINY_JSON: the rows it held, loaded without reading the source again, its
            // nodes named by the file's label column, as `data.import` names them.
            load: calls([], [{ op: "batch", steps: [DRAFT_LABEL, DRAFT_LOAD] }, DRAFT_LABEL, DRAFT_LOAD]),
            dispose: exempt("Lets go of the rows a draft holds; nothing a project saves changes."),
        },
    },
    {
        name: "RunsApi",
        file: "src/session/runs/types.ts",
        half: "session",
        doors: {
            start: calls(["degree"], [RUN_DEGREE]),
            answered: READ,
            batch: calls([[{ algorithm: "degree" }]], [RUN_DEGREE]),
            get: READ,
            list: READ,
            remove: calls(["door-run"], [{ op: "algo.remove", runId: "door-run" }]),
            move: calls(["door-run", null], [{ op: "algo.move", runId: "door-run", before: null }]),
            bindings: READ,
            painting: READ,
            layers: READ,
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
            id: READ,
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
        name: "AssetsApi",
        file: "src/session/assets/AssetsApi.ts",
        half: "session",
        whole: exempt(
            "Model files are kept beside the project, not in it: they are not commands, so adding or removing one is no step and no recipe entry, and limits and hosts are the page's own settings.",
        ),
    },
    {
        name: "NetworkApi",
        file: "src/session/network.ts",
        half: "session",
        whole: exempt(
            "Answers to a waiting fetch are the reader's trust, not graph content: no step and no recipe entry. Nothing of it is saved in the project file: what a reader remembers for a project the page keeps and hands back with setProjectHosts.",
        ),
    },
    {
        name: "JournalApi",
        file: "src/session/journal.ts",
        half: "session",
        doors: {
            entries: READ,
            get: READ,
            subscribe: LISTEN,
            clear: exempt("Forgets the record of what ran; it changes nothing a project saves."),
            cap: exempt("How many records of what ran are kept; it changes nothing a project saves."),
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
            arrangedDimension: READ,
            set: calls(["circular"], [{ op: "layout.set", id: "circular" }]),
            setDimension: calls(["2d"], [DIMENSION_2D]),
            optionInEffect: READ,
            locationColumns: READ,
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
            backgroundColor: READ,
            selectionStyle: READ,
            pinnedStyle: READ,
            startingRows: READ,
            editableBase: READ,
            runPlacement: READ,
            layoutBehavior: READ,
            layoutTransition: READ,
            viewRotation: READ,
            framing: READ,
            author: READ,
            name: READ,
            acceleration: READ,
            inEffect: READ,
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
            changes: READ,
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
            edgeRemovalChangesNothing: READ,
            nodeMembers: READ,
            edgeMembers: READ,
            remapNodes: SELECTION,
            remapEdges: SELECTION,
        },
    },
    {
        name: "TimeApi",
        file: "src/session/time/TimeApi.ts",
        half: "session",
        doors: TIME_API,
    },
    {
        name: "SessionVisibilityApi",
        file: "src/session/visibility/VisibilityApi.ts",
        half: "session",
        doors: {
            ...VISIBILITY_API,
            masks: READ,
            restoreConditions: calls(
                [[{ id: "c1", on: true, effect: "select", rule: { kind: "degree", min: 1 } }]],
                [
                    {
                        op: "visibility.conditions",
                        conditions: [{ id: "c1", on: true, effect: "select", rule: { kind: "degree", min: 1 } }],
                    },
                ],
            ),
            drawnMasks: READ,
            ghosting: READ,
            ghosted: READ,
            ghosts: READ,
            rule: READ,
            previewSteps: READ,
            commitWindow: calls(
                [{ attribute: "data.t", from: 0, to: 1 }],
                [{ op: "visibility.window", window: { attribute: "data.t", from: 0, to: 1 }, ownStep: true }],
            ),
            slideWindow: exempt(
                "Moves the masks for session.time's cursor only; the window the project records is unchanged until it is committed.",
            ),
        },
    },
    {
        name: "SessionShaders",
        file: "src/session/shaders.ts",
        half: "session",
        doors: SHADERS_API,
    },
    {
        name: "SessionStylesApi",
        file: "src/session/styles/StylesApi.ts",
        half: "session",
        doors: {
            ...STYLES_API,
            compiled: READ,
            modelUrlFromCode: READ,
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
            getNodeXlabelOffset: READ,
            isNodeXlabelLeftOut: READ,
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
        name: "BasemapManager",
        file: "src/managers/BasemapManager.ts",
        half: "renderer",
        doors: {
            sync: RENDER,
            status: READ,
            loading: READ,
            attributionOffset: CAMERA,
            globeLook: VIEW_SETTING,
            dispose: LIFECYCLE,
        },
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
            setPixelRatio: RENDER,
            resize: RENDER,
            drawHeld: RENDER,
            drawNow: RENDER,
            requestFrame: RENDER,
            applyBackground: RENDER,
            backgroundOverride: RENDER,
            bindShaderScene: RENDER,
            pickGroupOutline: READ,
            shaderPasses: READ,
            shaderPicturePending: READ,
            applyLighting: RENDER,
            getRenderStats: READ,
            ticks: READ,
            canvasInView: READ,
            shaderGuard: RENDER,
        },
    },
    {
        name: "ShaderGuard",
        file: "src/managers/ShaderGuard.ts",
        half: "renderer",
        whole: RENDER,
    },
    {
        name: "RenderTargetBudget",
        file: "src/managers/ShaderGuard.ts",
        half: "renderer",
        whole: RENDER,
    },
    {
        name: "FlashCounter",
        file: "src/managers/ShaderGuard.ts",
        half: "renderer",
        whole: RENDER,
    },
    {
        name: "FlashReadback",
        file: "src/managers/ShaderGuard.ts",
        half: "renderer",
        whole: RENDER,
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
            needsRayUpdate: READ,
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
 * The ops with no public member of their own: a gesture the element handles itself, or a whole
 * operation that dispatches them as part of its one step. Each names where it is dispatched and
 * the test that checks it.
 */
export const GESTURE_DOORS: Readonly<Record<string, string>> = {
    "data.expand":
        "Double-clicking a node when the layout behaviour supplies fetchNodes and fetchEdges (src/NodeBehavior.ts); " +
        "checked by test/browser/expansion-through-behaviour.test.ts.",
    "data.source-expand":
        "Clicking or double-clicking a node when behavior.expand.trigger is set and no fetchNodes and fetchEdges " +
        "are, and session.data.expand (src/NodeBehavior.ts, src/session/sources/expand.ts); checked by " +
        "test/interactions/expand-real-input.test.ts and test/session/sources/expand.test.ts.",
    "data.collapse":
        "session.data.collapse on a node a network source expanded (src/session/sources/expand.ts); checked by " +
        "test/session/sources/expand.test.ts.",
    "data.setFileStyles":
        "Opening a project file that holds file style values (project.open, src/session/projectFile.ts); " +
        "checked by test/session/styles/file-style-store.test.ts.",
};

/**
 * How a session door that changes the graph is ordered against a load still reading, by
 * `Root.member`: every such door goes through the session's load line (`session/loadLine.ts`).
 *
 * - `load`: it takes its place in line when called, and lands after every door asked for before
 *   it; a clear asked for after it, while it still reads, cancels it with `E_SUPERSEDED`.
 * - `edit`: it takes its place in line when called, and lands on what the loads ahead of it
 *   loaded; a clear asked for after it while it waits cancels it.
 * - `clear`: it cancels every load and edit still waiting, and lands at once.
 *
 * `test/session/load-entry.test.ts` fails on any row, of either half, that dispatches a graph op
 * and has no entry here, and calls every session entry with a load held in line to check the door
 * keeps to it.
 */
export const LOAD_ORDER: Readonly<Record<string, "load" | "edit" | "clear">> = {
    "SessionDataApi.addNodes": "edit",
    "SessionDataApi.addEdges": "edit",
    "SessionDataApi.updateNodes": "edit",
    "SessionDataApi.updateEdges": "edit",
    "SessionDataApi.removeNodes": "edit",
    "SessionDataApi.removeEdges": "edit",
    "SessionDataApi.collapse": "edit",
    "SessionDataApi.clear": "clear",
    // Doors that work out their change from the graph read it once the loads ahead have landed.
    "SessionDataApi.fix": "edit",
    "SessionDataApi.removeSource": "edit",
    "SessionDataApi.replaceSource": "edit",
    "SessionDataApi.reloadSource": "edit",
    "SessionDataApi.editJoin": "edit",
    "SessionDataApi.setType": "edit",
    "SessionDataApi.renameColumn": "edit",
    "SessionDataApi.import": "load",
    "SessionDataApi.generate": "load",
    "SessionDataApi.loadDataset": "load",
    "SessionDataApi.loadSample": "load",
    "SessionDataApi.more": "load",
    "SessionDataApi.runPendingSourceLoad": "load",
    "SessionDataApi.expand": "load",
    "LoadDraft.load": "load",
    // The autosave restore opens through it.
    "ProjectApi.open": "load",
    // The renderer half: its loads, edits and clears take the same line (issue #3604).
    "Graph.addDataFromSource": "load",
    "Graph.loadFromFile": "load",
    "Graph.loadFromUrl": "load",
    "Graph.clearData": "clear",
    "Graphty.addDataFromSource": "load",
    "Graphty.loadFromFile": "load",
    "Graphty.loadFromUrl": "load",
    "Graphty.loadFromSource": "load",
    "Graphty.dataSource": "load",
    "Graphty.dataSourceConfig": "load",
    "Graphty.clearData": "clear",
    "Graphty.nodeData": "edit",
    "Graphty.edgeData": "edit",
    "Graph.addNode": "edit",
    "Graph.addNodes": "edit",
    "Graph.addEdge": "edit",
    "Graph.addEdges": "edit",
    "Graph.removeNodes": "edit",
    "Graph.removeEdges": "edit",
    "Graph.updateNodes": "edit",
    "Graph.updateEdges": "edit",
    "Graph.batchOperations": "edit",
    "Graph.setData": "edit",
    "Graph.setNodes": "edit",
    "Graph.setEdges": "edit",
    "Graphty.addNode": "edit",
    "Graphty.addNodes": "edit",
    "Graphty.addEdge": "edit",
    "Graphty.addEdges": "edit",
    "Graphty.removeNodes": "edit",
    "Graphty.removeEdges": "edit",
    "Graphty.updateNodes": "edit",
    "Graphty.updateEdges": "edit",
    "Graphty.batchOperations": "edit",
    "Graphty.setData": "edit",
    "DataManager.addNode": "edit",
    "DataManager.addNodes": "edit",
    "DataManager.addEdge": "edit",
    "DataManager.addEdges": "edit",
    "DataManager.removeEdge": "edit",
    "DataManager.removeNodeAndIncidentEdges": "edit",
    "DataManager.setNodes": "edit",
    "DataManager.setEdges": "edit",
    "DataManager.clear": "clear",
    "DataManager.addDataFromSource": "load",
};
