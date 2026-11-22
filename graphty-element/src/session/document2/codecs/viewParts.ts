/**
 * @file The parts the `view` section codec is built from (spec/README.md 4.7, 5 and 7): what a view
 * section keeps between an open and the next save, the file ids sets and layers are saved under,
 * cameras in both directions, and the walk that turns the ids a rule tree, a selector, a scope or a
 * set definition names into element references and back. Experimental (`save-files-v2`).
 *
 * Nothing here reaches a Babylon.js scene, Lit or the DOM.
 */

import { FLAT_HALF_WIDTH_AT_ZOOM_ONE, orbitAnglesToPosition } from "../../../camera/orbit";
import type { CameraState, Vec3 } from "../../../camera/types";
import { engineOptionsOf, layoutEntry } from "../../../catalog/layouts";
import type { EdgeId, EdgeMember } from "../../../catalog/types";
import { LayoutEngine } from "../../../layout/LayoutEngine";
import { dispatcherOf } from "../../dispatchers";
import { mintNoteId } from "../../notes/ids";
import { canonicalizeParams } from "../../runs/runId";
import type { GraphSession } from "../../types";
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
    /**
     * View layers the open kept rather than applied (one reading a readable path, spec 4.2 rule
     * 4), each with the file id of the layer it followed: written back in their places.
     */
    readonly keptLayers: { readonly layer: unknown; readonly after: string | null }[];
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
        memory = { kept: new Map(), heldOnly: new Map(), notRun: new Map(), runOrder: [], keptLayers: [] };
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

// ---------------------------------------------------------------------------------------------
// Cameras (spec 4.7 rule 2, section 7)
// ---------------------------------------------------------------------------------------------

/** The controller graphty-element drives each dimension with. */
const DEFAULT_CONTROLLER: Readonly<Record<2 | 3, string>> = Object.freeze({ 2: "2d", 3: "orbit" });

/** The up a 3D camera has when its file gives none, or gives one along the line of sight. */
const WORLD_UP: Vec3 = Object.freeze({ x: 0, y: 1, z: 0 });

/** How small a vector is, against the unit, to count as none: an up along the line of sight, a pole. */
const DEGENERATE = 1e-9;

/**
 * A point as a file writes it: `{ x, y, z }` and nothing else, every axis finite.
 * @param value - The value.
 * @returns The point, or undefined.
 */
function point3(value: unknown): Vec3 | undefined {
    if (!isObject(value)) {
        return undefined;
    }

    const { x, y, z } = value;
    return [x, y, z].every((axis) => typeof axis === "number" && Number.isFinite(axis))
        ? { x: x as number, y: y as number, z: z as number }
        : undefined;
}

/**
 * A 2D point as a file writes it: `{ x, y }`, both finite.
 * @param value - The value.
 * @returns The point, or undefined.
 */
function point2(value: unknown): { x: number; y: number } | undefined {
    if (!isObject(value)) {
        return undefined;
    }

    const { x, y } = value;
    return typeof x === "number" && Number.isFinite(x) && typeof y === "number" && Number.isFinite(y)
        ? { x, y }
        : undefined;
}

/**
 * A finite number, or undefined.
 * @param value - The value.
 * @returns The number.
 */
function finite(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * A field of view a file can hold: in (0, pi).
 * @param value - The value.
 * @returns The field of view, or undefined.
 */
function fovOf(value: unknown): number | undefined {
    return typeof value === "number" && value > 0 && value < Math.PI ? value : undefined;
}

const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

const between = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/**
 * Turn a vector the way a pivot turned by (yaw, pitch, roll) turns it: roll about z, then pitch
 * about x, then yaw about y, in the left-handed scene frame (Babylon.js's
 * `Quaternion.RotationYawPitchRoll`, which `src/camera/orientation.ts` turns the orbit pivot with).
 * @param v - The vector.
 * @param angles - Pitch (x), yaw (y) and roll (z), in radians.
 * @returns The turned vector.
 */
function turn(v: Vec3, angles: Vec3): Vec3 {
    const [cr, sr] = [Math.cos(angles.z), Math.sin(angles.z)];
    const [cp, sp] = [Math.cos(angles.x), Math.sin(angles.x)];
    const [cy, sy] = [Math.cos(angles.y), Math.sin(angles.y)];
    const rolled = { x: v.x * cr - v.y * sr, y: v.x * sr + v.y * cr, z: v.z };
    const pitched = { x: rolled.x, y: rolled.y * cp - rolled.z * sp, z: rolled.y * sp + rolled.z * cp };
    return { x: pitched.x * cy + pitched.z * sy, y: pitched.y, z: -pitched.x * sy + pitched.z * cy };
}

/**
 * The neutral pose of an orbit pivot: the camera sits on the pivot's local -z axis, `distance`
 * from `target`, with the pivot's local +y as its up.
 * @param target - The pivot's position, the point looked at.
 * @param pivotRotation - Pitch (x), yaw (y) and roll (z), in radians.
 * @param distance - How far the camera is from the target.
 * @returns The eye and the up.
 */
export function poseOfPivot(target: Vec3, pivotRotation: Vec3, distance: number): { position: Vec3; up: Vec3 } {
    const forward = turn({ x: 0, y: 0, z: 1 }, pivotRotation);
    return {
        position: {
            x: target.x - distance * forward.x,
            y: target.y - distance * forward.y,
            z: target.z - distance * forward.z,
        },
        up: turn(WORLD_UP, pivotRotation),
    };
}

/**
 * The orbit pivot rotation that puts the camera at `position` looking at `target` with `up`: the
 * inverse of {@link poseOfPivot}. Yaw and pitch follow `orientationFromPose` (straight above or
 * below the target the yaw is pi); the roll is the signed angle from the unrolled up to `up`'s part
 * across the line of sight. An `up` that is missing or along the line of sight is the world up,
 * and where that too is along the line of sight (at a pole) the roll is 0.
 * @param position - The eye.
 * @param target - The point looked at; differs from `position`.
 * @param up - Which way is up, when the pose says.
 * @returns Pitch (x), yaw (y) and roll (z), in radians.
 */
export function pivotOfPose(position: Vec3, target: Vec3, up?: Vec3): Vec3 {
    const dx = position.x - target.x;
    const dy = position.y - target.y;
    const dz = position.z - target.z;
    const distance = Math.hypot(dx, dy, dz);
    const pole = Math.hypot(dx, dz) < DEGENERATE * distance;
    const yaw = pole ? Math.PI : Math.atan2(dx, dz) + Math.PI;
    const pitch = pole ? Math.sign(dy) * (Math.PI / 2) : Math.asin(Math.max(-1, Math.min(1, dy / distance)));
    const unrolled = { x: pitch, y: yaw, z: 0 };
    const forward = turn({ x: 0, y: 0, z: 1 }, unrolled);
    const across = (v: Vec3): Vec3 | undefined => {
        const along = dot(v, forward);
        const out = { x: v.x - along * forward.x, y: v.y - along * forward.y, z: v.z - along * forward.z };
        return Math.hypot(out.x, out.y, out.z) > DEGENERATE * Math.hypot(v.x, v.y, v.z) ? out : undefined;
    };
    const seen = (up === undefined ? undefined : across(up)) ?? across(WORLD_UP);
    if (seen === undefined) {
        return unrolled;
    }

    // Rolling by r turns the unrolled up toward minus the unrolled right: cos r up0 - sin r right0.
    const up0 = turn(WORLD_UP, unrolled);
    const right0 = turn({ x: 1, y: 0, z: 0 }, unrolled);
    return { x: pitch, y: yaw, z: Math.atan2(-dot(seen, right0), dot(seen, up0)) };
}

/**
 * Which dimension a camera state is for: its `mode`, else 2D when it holds a 2D member.
 * @param state - The state.
 * @returns 2 or 3.
 */
function dimensionOf(state: CameraState): 2 | 3 {
    if (state.mode !== undefined) {
        return state.mode === "2d" ? 2 : 3;
    }

    return state.zoom !== undefined || state.pan !== undefined || state.rotation !== undefined ? 2 : 3;
}

/**
 * A 3D camera state as the neutral pose: an orbit pivot's own pose, which leaves out the shift a
 * viewport inset puts in the camera's world position, else its position and target.
 * @param state - The state.
 * @returns The camera, or undefined with no pose.
 */
function pose3Json(state: CameraState): JsonObject | undefined {
    const orbit = orbitAnglesToPosition(state);
    const target = point3(orbit.target);
    const pivot = point3(orbit.pivotRotation);
    const distance = finite(orbit.cameraDistance);
    let position: Vec3 | undefined;
    let up: Vec3 = WORLD_UP;
    if (target !== undefined && pivot !== undefined && distance !== undefined && distance > 0) {
        ({ position, up } = poseOfPivot(target, pivot, distance));
    } else {
        position = point3(orbit.position);
    }

    if (target === undefined || position === undefined || between(position, target) <= 0) {
        return undefined;
    }

    const fov = fovOf(state.fov);
    return {
        dimension: 3,
        controller: DEFAULT_CONTROLLER[3],
        position: { ...position },
        target,
        up: { ...up },
        ...(fov === undefined ? {} : { fov }),
    };
}

/**
 * A 2D camera state as the neutral pose: the center, the half width and the turn.
 * @param state - The state.
 * @returns The camera, or undefined with no pose.
 */
function pose2Json(state: CameraState): JsonObject | undefined {
    const center = point2(state.pan);
    const left = finite(state.orthoLeft);
    const right = finite(state.orthoRight);
    const zoom = finite(state.zoom);
    let halfWidth: number | undefined;
    if (left !== undefined && right !== undefined && right > left) {
        halfWidth = (right - left) / 2;
    } else if (zoom !== undefined && zoom > 0) {
        halfWidth = FLAT_HALF_WIDTH_AT_ZOOM_ONE / zoom;
    }

    if (center === undefined || halfWidth === undefined) {
        return undefined;
    }

    const rotation = finite(state.rotation);
    return {
        dimension: 2,
        controller: DEFAULT_CONTROLLER[2],
        center,
        halfWidth,
        ...(rotation === undefined ? {} : { rotation }),
    };
}

/**
 * A camera state as a view section writes it: the neutral pose of its dimension, and the
 * controller graphty-element drives that dimension with (spec 4.7 rule 2). No `controllers` entry
 * is written.
 * @param state - The camera state.
 * @returns The camera, or undefined for a state with no pose a reader could apply.
 */
export function cameraJson(state: CameraState): JsonObject | undefined {
    return dimensionOf(state) === 2 ? pose2Json(state) : pose3Json(state);
}

/** A camera as read: the state to apply, and whether its controller is one this reader knows. */
export interface ReadCamera {
    readonly state: CameraState;
    readonly known: boolean;
    readonly controller: string;
}

/**
 * The camera state a pose asks for.
 * @param camera - The camera as the file holds it.
 * @param dimension - Its dimension.
 * @returns The state, or undefined when the pose is incomplete.
 */
function stateOfPose(camera: JsonObject, dimension: 2 | 3): CameraState | undefined {
    if (dimension === 2) {
        const center = point2(camera.center);
        const halfWidth = finite(camera.halfWidth);
        return center === undefined || halfWidth === undefined || halfWidth <= 0
            ? undefined
            : { pan: center, zoom: FLAT_HALF_WIDTH_AT_ZOOM_ONE / halfWidth, rotation: finite(camera.rotation) ?? 0 };
    }

    const position = point3(camera.position);
    const target = point3(camera.target);
    const distance = position === undefined || target === undefined ? 0 : between(position, target);
    if (position === undefined || target === undefined || distance <= 0 || !Number.isFinite(distance)) {
        return undefined;
    }

    const fov = fovOf(camera.fov);
    return {
        position,
        target,
        pivotRotation: pivotOfPose(position, target, point3(camera.up)),
        cameraDistance: distance,
        ...(fov === undefined ? {} : { fov }),
    };
}

/**
 * A view section's camera as a camera state: the whole pose of its dimension, whatever its
 * controller. `controllers` is not read; it is kept with the rest of the camera on re-save.
 * @param camera - The camera as the file holds it.
 * @returns The state, or undefined for a camera this reader cannot apply.
 */
export function cameraOf(camera: unknown): ReadCamera | undefined {
    if (!isObject(camera)) {
        return undefined;
    }

    const { dimension } = camera;
    if (dimension !== 2 && dimension !== 3) {
        return undefined;
    }

    const controller =
        typeof camera.controller === "string" && camera.controller !== ""
            ? camera.controller
            : DEFAULT_CONTROLLER[dimension];
    const state = stateOfPose(camera, dimension);
    return state === undefined ? undefined : { state, known: DEFAULT_CONTROLLER[dimension] === controller, controller };
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
function edgeOfMember(session: GraphSession, member: EdgeMember): EdgeId | undefined {
    return dispatcherOf(session).services.edgeIdentity?.idsOf([member])[0];
}

/**
 * The mapper a save writes with: session ids to element references and file set ids.
 * @param session - The session.
 * @param refs - The element references.
 * @returns The mapper.
 */
export function writeMapper(session: GraphSession, refs: ElementRefs): RefMapper {
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

// ---------------------------------------------------------------------------------------------
// Layout options as a file writes them (spec 9 rule 10)
// ---------------------------------------------------------------------------------------------

/**
 * The options an engine works out from the layout's dimension (`dim`, and whatever the engine sets
 * per dimension): a file writes `dimension` instead, and one of these only when it was asked for
 * (spec 9 rule 10).
 * @param engine - The registered engine name.
 * @returns Their names.
 */
export function dimensionOptions(engine: string): Set<string> {
    const derived = new Set(["dim"]);
    for (const dimension of [2, 3] as const) {
        for (const key of Object.keys(LayoutEngine.getOptionsForDimensionByType(engine, dimension) ?? {})) {
            derived.add(key);
        }
    }

    return derived;
}

/**
 * A layout's options as a file writes them: every option its engine declares with a default, at
 * the value in force, and every option asked for. The options an engine derives from the
 * dimension, and the options whose default is null, are left out unless they were asked for, since `dimension` already says them: `dim`,
 * as the catalog reads it (`arrangedDimension`), and whatever a registered engine class says it
 * derives. A layout or engine the catalog does not know keeps the asked options alone.
 * @param session - The session, for its catalog.
 * @param layout - The layout: its id, its engine and the options asked for.
 * @param layout.id - The layout's catalog id.
 * @param layout.engine - The engine that draws it.
 * @param layout.options - The options asked for.
 * @returns The options, keys sorted.
 */
export function resolvedLayoutOptions(
    session: GraphSession,
    layout: { readonly id: string; readonly engine: string; readonly options: Readonly<Record<string, unknown>> },
): JsonObject {
    const descriptor = session.catalog.layouts().find((each) => each.id === layout.id);
    const engines = layoutEntry(layout.id)?.implementations.map((each) => each.engine) ?? [descriptor?.engine];
    if (descriptor === undefined || !engines.includes(layout.engine)) {
        return { ...canonicalizeParams(layout.options, []) };
    }

    const derived = dimensionOptions(layout.engine);
    // A null default (`clusterBy`, `nodeGap`) means the option is off unless asked: not written.
    const declared = engineOptionsOf(descriptor, layout.engine).filter(
        (option) => option.default !== null && !derived.has(option.name),
    );
    return { ...canonicalizeParams(layout.options, declared) };
}
