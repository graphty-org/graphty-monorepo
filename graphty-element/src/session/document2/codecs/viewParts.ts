/**
 * @file The parts the `view` section codec is built from (spec/README.md 4.7, 5 and 7): what a view
 * section keeps between an open and the next save, the file ids sets and layers are saved under,
 * cameras in both directions, and the walk that turns the ids a rule tree, a selector, a scope or a
 * set definition names into element references and back. Experimental (`save-files-v2`).
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { CameraState } from "../../../camera/types";
import type { EdgeId, EdgeMember } from "../../../catalog/types";
import { mintNoteId } from "../../notes/ids";
import { edgeRowsOf } from "../../notes/status";
import { edgeSpaceOf } from "../../scope/spaces";
import type { TransactionScope } from "../../types";
import { projectMemory } from "../memory";
import type { ElementRefs, JsonObject, ReadContext } from "../types";

// ---------------------------------------------------------------------------------------------
// What a view section keeps between an open and the next save
// ---------------------------------------------------------------------------------------------

/** One member as it was read, and what the session gave back for it right after the open. */
interface KeptMember {
    /** The canonical text of the member as written from the session just after the open. */
    readonly applied: string;
    /** The member as the file held it. */
    readonly original: unknown;
}

/** What a view section keeps of an open for the next save of the same session. */
export interface ViewMemory {
    /**
     * Members by name. A member the session gives back unchanged is written as the file held it,
     * so unbound references and members only another controller reads survive a re-save.
     */
    readonly kept: Map<string, KeptMember>;
    /** The members the session has no state for (the live camera): written back as read. */
    readonly heldOnly: Map<string, unknown>;
    /** Run records the open neither reran nor restored, by run id: written back as read. */
    readonly notRun: Map<string, unknown>;
    /** The run ids in the order the opened `runs` listed them. */
    readonly runOrder: string[];
}

const MEMORIES = projectMemory<ViewMemory>();

/**
 * The view memory of a session, made empty on first use.
 * @param session - The session.
 * @returns Its memory.
 */
export function memoryOf(session: object): ViewMemory {
    let memory = MEMORIES.get(session);
    if (memory === undefined) {
        memory = { kept: new Map(), heldOnly: new Map(), notRun: new Map(), runOrder: [] };
        MEMORIES.set(session, memory);
    }

    return memory;
}

/**
 * Forget what an earlier open kept: a new open of a view section replaces it.
 * @param session - The session.
 * @returns The empty memory.
 */
export function resetMemory(session: object): ViewMemory {
    MEMORIES.delete(session);
    return memoryOf(session);
}

// ---------------------------------------------------------------------------------------------
// File ids of sets and layers (spec 3.3, "Minted ids"; 8.2 rule 2)
// ---------------------------------------------------------------------------------------------

/**
 * The ids a project's sets and layers are saved under, by session id. Shared by every section that
 * names a set or a layer, so a set a note, a style selector and the view all name is one id, and
 * view's `order` names a style section's layer by the id that section writes. Lives as long as the
 * project; a project boundary forgets it.
 */
export interface FileIds {
    /** Session set id to its file id (`set_` plus a ULID, or a namespaced recipe set id). */
    readonly sets: Map<string, string>;
    /** Session layer id to its file id. */
    readonly layers: Map<string, string>;
}

const FILE_IDS = projectMemory<FileIds>();

/**
 * The file ids of a session's sets and layers, made empty on first use.
 * @param session - The session.
 * @returns The registry.
 */
export function fileIdsOf(session: object): FileIds {
    let ids = FILE_IDS.get(session);
    if (ids === undefined) {
        ids = { sets: new Map(), layers: new Map() };
        FILE_IDS.set(session, ids);
    }

    return ids;
}

/** A set id as the schema spells it: `set_` plus a ULID, with a recipe namespace when applied under one. */
const FILE_SET_ID = /^set_([a-z][a-z0-9_]*\.)?[0-9A-HJKMNP-TV-Z]{26}$/;

/**
 * Mint a ULID: 26 Crockford base-32 characters, time first.
 * @returns The ULID.
 */
export function mintUlid(): string {
    return mintNoteId().slice("note_".length);
}

/**
 * The file id of a session set: the one it was opened under, else its own id when that is already
 * a file id, else one minted now and kept for the rest of the project.
 * @param session - The session.
 * @param id - The session set id.
 * @returns The file id.
 */
export function fileSetId(session: object, id: string): string {
    const { sets } = fileIdsOf(session);
    let file = sets.get(id);
    if (file === undefined) {
        // ponytail: the element mints `set_<slug>`; until it mints `set_<ULID>` a save mints the file id.
        file = FILE_SET_ID.test(id) ? id : `set_${mintUlid()}`;
        sets.set(id, file);
    }

    return file;
}

/**
 * The file id of a session layer: the one it was opened under, else its session id.
 * @param session - The session.
 * @param id - The session layer id.
 * @returns The file id.
 */
export function fileLayerId(session: object, id: string): string {
    return fileIdsOf(session).layers.get(id) ?? id;
}

// ---------------------------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------------------------

/**
 * Whether a value is a JSON object (not null, not an array).
 * @param value - The value.
 * @returns True for an object.
 */
export function isObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A value as JSON text with members sorted, so two values holding the same members compare equal.
 * Only for comparing; never written.
 * @param value - The value.
 * @returns The text.
 */
export function canonical(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map((each) => canonical(each ?? null)).join(",")}]`;
    }

    if (isObject(value)) {
        const names = Object.keys(value)
            .filter((name) => value[name] !== undefined)
            .sort(); // NOSONAR(S2871): code-unit order is all a comparison needs
        const members = names.map((name) => {
            const member = JSON.stringify(name);
            return `${member}:${canonical(value[name])}`;
        });
        return `{${members.join(",")}}`;
    }

    return JSON.stringify(value ?? null);
}

// ---------------------------------------------------------------------------------------------
// Cameras (spec 4.7 rule 2, section 7)
// ---------------------------------------------------------------------------------------------

/** The controller graphty-element drives each dimension with. */
const DEFAULT_CONTROLLER: Readonly<Record<2 | 3, string>> = Object.freeze({ 2: "2d", 3: "orbit" });

/**
 * The members either default controller reads. `CameraState`'s `type` is not among them: it
 * overlaps `controller`, which is the authority, so it is neither written nor read (spec 4.7 rule 2).
 */
const SHARED = ["orthoLeft", "orthoRight", "orthoTop", "orthoBottom"];

/** The `CameraState` members each default controller reads, by dimension. */
const READS: Readonly<Record<2 | 3, ReadonlySet<string>>> = Object.freeze({
    2: new Set([...SHARED, "zoom", "pan", "rotation"]),
    3: new Set([...SHARED, "position", "target", "pivotRotation", "cameraDistance", "fov", "alpha", "beta", "radius"]),
});

/** The `CameraState` members that are points. */
const POINTS = new Set(["position", "target", "pivotRotation"]);

/**
 * A camera member as a file writes it: a point as `{ x, y, z }` and nothing else, a number only
 * when finite.
 * @param name - The member.
 * @param value - Its value.
 * @returns The value, or undefined to leave it out.
 */
function memberJson(name: string, value: unknown): unknown {
    if (POINTS.has(name) || name === "pan") {
        const point = value as { x?: unknown; y?: unknown; z?: unknown } | undefined;
        const axes = name === "pan" ? ["x", "y"] : ["x", "y", "z"];
        const out = Object.fromEntries(axes.map((axis) => [axis, point?.[axis as "x"]]));
        return Object.values(out).every((each) => typeof each === "number" && Number.isFinite(each)) ? out : undefined;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : undefined;
    }

    return typeof value === "string" ? value : undefined;
}

/**
 * A camera state as a view section writes it: `dimension` and `controller`, then the
 * `CameraState` members as they are (spec 4.7 rule 2).
 * @param state - The camera state.
 * @returns The camera, or undefined for a state with no pose a reader could apply.
 */
export function cameraJson(state: CameraState): JsonObject | undefined {
    const dimension = state.zoom !== undefined || state.pan !== undefined ? 2 : 3;
    const members = Object.fromEntries(
        Object.entries(state).flatMap(([name, value]) => {
            const written = name === "type" ? undefined : memberJson(name, value);
            return written === undefined ? [] : [[name, written]];
        }),
    );
    const posed =
        dimension === 2
            ? typeof members.zoom === "number" && members.zoom > 0
            : members.target !== undefined || members.position !== undefined;
    if (!posed || (members.fov !== undefined && (members.fov as number) <= 0)) {
        return undefined;
    }

    return { dimension, controller: DEFAULT_CONTROLLER[dimension], ...members };
}

/** A camera as read: the state to apply, and whether its controller is one this reader knows. */
export interface ReadCamera {
    readonly state: CameraState;
    readonly known: boolean;
    readonly controller: string;
}

/**
 * A view section's camera as a camera state. An unknown controller gives only the members the
 * default controller of its dimension reads.
 * @param camera - The camera as the file holds it.
 * @returns The state, or undefined for a camera this reader cannot apply.
 */
export function cameraOf(camera: unknown): ReadCamera | undefined {
    if (!isObject(camera) || typeof camera.controller !== "string") {
        return undefined;
    }

    const { dimension, controller } = camera;
    if (dimension !== 2 && dimension !== 3) {
        return undefined;
    }

    const reads = READS[dimension];
    const state = Object.fromEntries(
        Object.entries(camera).filter(([name, value]) => reads.has(name) && memberJson(name, value) !== undefined),
    ) as CameraState;
    return { state, known: DEFAULT_CONTROLLER[dimension] === controller, controller };
}

// ---------------------------------------------------------------------------------------------
// Element ids and element references
// ---------------------------------------------------------------------------------------------

/** How the walk turns one direction's names into the other's. */
export interface RefMapper {
    /** A node: an id to a reference, or a reference to an id. Undefined drops it. */
    node(value: unknown, pointer: string): unknown;
    /** An edge, the same way. Undefined drops it. */
    edge(value: unknown, pointer: string): unknown;
    /** A set id. */
    set(id: string): string;
}

/** The set-definition kinds whose `nodes` and `edges` name elements. */
const MEMBER_KINDS = new Set(["fixed", "path"]);

/**
 * Map a list, keeping each entry the mapper keeps.
 * @param list - The entries.
 * @param one - Maps one entry; undefined drops it.
 * @param pointer - Where the list is.
 * @returns The mapped entries.
 */
function mapList(
    list: readonly unknown[],
    one: (value: unknown, pointer: string) => unknown,
    pointer: string,
): unknown[] {
    return list.flatMap((entry, at) => {
        const mapped = one(entry, `${pointer}/${at}`);
        return mapped === undefined ? [] : [mapped];
    });
}

/**
 * Map one entry of an `edges` list: an edge, a path step's group of edges, or a path step's null.
 * @param mapper - The mapper.
 * @returns The entry mapper.
 */
function edgeEntry(mapper: RefMapper): (value: unknown, pointer: string) => unknown {
    return (value, pointer) => {
        if (value === null) {
            return null;
        }

        return Array.isArray(value)
            ? mapList(value, (edge, at) => mapper.edge(edge, at), pointer)
            : mapper.edge(value, pointer);
    };
}

/**
 * The member of an object the walk maps, by key.
 * @param holder - The object.
 * @param key - The key.
 * @param value - Its value.
 * @param mapper - The mapper.
 * @param pointer - Where the value is.
 * @returns The mapped value.
 */
function mapMember(holder: JsonObject, key: string, value: unknown, mapper: RefMapper, pointer: string): unknown {
    const { kind } = holder;
    if (Array.isArray(value)) {
        const plain = kind === undefined || (typeof kind === "string" && MEMBER_KINDS.has(kind));
        if ((key === "nodes" && plain) || key === "hidden" || (key === "seeds" && kind === "neighborhood")) {
            return mapList(value, (node, at) => mapper.node(node, at), pointer);
        }

        if (key === "edges" && plain) {
            return mapList(value, edgeEntry(mapper), pointer);
        }
    }

    if (typeof value === "string") {
        return key === "set" && kind === undefined ? mapper.set(value) : value;
    }

    return mapRefs(value, mapper, pointer);
}

/**
 * Turn the elements and sets a rule tree, a selector, a scope or a set definition names from one
 * direction's names into the other's: ids to references on save, references to ids on open.
 * Element-naming places: a `neighborhood` leaf's `seeds`; `nodes` and `edges` of a fixed or path
 * definition, an `ids` selector, a selection or a scope; a scope's `hidden`; and a `{ set }`.
 * @param value - The value.
 * @param mapper - How each name is mapped.
 * @param pointer - Where the value is, for reports.
 * @returns The mapped copy.
 */
export function mapRefs(value: unknown, mapper: RefMapper, pointer: string): unknown {
    if (Array.isArray(value)) {
        return value.map((entry, at) => mapRefs(entry, mapper, `${pointer}/${at}`));
    }

    if (!isObject(value)) {
        return value;
    }

    const out: JsonObject = {};
    for (const [key, held] of Object.entries(value)) {
        if (held !== undefined) {
            out[key] = mapMember(value, key, held, mapper, `${pointer}/${key}`);
        }
    }

    return out;
}

/**
 * The session edge an edge member names now.
 * @param session - The session.
 * @param member - The member.
 * @returns The edge id, or undefined when it binds no single edge.
 */
function edgeOfMember(session: TransactionScope, member: EdgeMember): EdgeId | undefined {
    const snapshot = session.data.snapshot();
    const row = edgeRowsOf(snapshot, [member])[0];
    return row === undefined || row < 0 ? undefined : edgeSpaceOf(snapshot).idOf(row);
}

/**
 * The mapper a save writes with: session ids to element references and file set ids.
 * @param session - The session.
 * @param refs - The element references.
 * @returns The mapper.
 */
export function writeMapper(session: TransactionScope, refs: ElementRefs): RefMapper {
    return {
        node: (value) => (typeof value === "string" || typeof value === "number" ? refs.nodeRef(value) : undefined),
        edge: (value) => {
            const id = isObject(value) ? edgeOfMember(session, value as unknown as EdgeMember) : value;
            return typeof id === "string" ? refs.edgeRef(id) : undefined;
        },
        set: (id) => fileSetId(session, id),
    };
}

/**
 * Whether a run reruns on this open: the caller's choice for it, never for a run its view record
 * marks `"replayable": false` (spec 8.2 rule 3).
 * @param context - The open.
 * @param id - The run.
 * @param record - Its view run record, when the open holds one.
 * @returns True to rerun it.
 */
export function rerunsOnOpen(context: ReadContext, id: string, record: unknown): boolean {
    return (!isObject(record) || record.replayable !== false) && (context.rerunOf?.(id) ?? context.rerun);
}

/**
 * The view run record an open holds for a run.
 * @param context - The open.
 * @param id - The run id.
 * @returns The record, or undefined when no view section loads or it lists no such run.
 */
export function viewRunRecord(context: ReadContext, id: string): JsonObject | undefined {
    const runs = context.other("view")?.body.runs;
    return Array.isArray(runs)
        ? (runs.find((record) => isObject(record) && record.id === id) as JsonObject)
        : undefined;
}
