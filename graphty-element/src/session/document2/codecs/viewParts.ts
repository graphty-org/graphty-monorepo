/**
 * @file The parts the `view` section codec is built from (spec 4.7, 5 and 7): what a view section
 * keeps between an open and the next save, cameras in both directions, run ids as namespace and
 * name, and the walk that turns the ids a rule tree, a selector, a scope or a set definition names
 * into element references and back. Experimental (`save-files-v2`).
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { CameraState } from "../../../camera/types";
import type { EdgeId, EdgeMember } from "../../../catalog/types";
import { edgeRowsOf } from "../../notes/status";
import { edgeSpaceOf } from "../../scope/spaces";
import type { TransactionScope } from "../../types";
import { projectMemory } from "../memory";
import type { ElementRefs, JsonObject } from "../types";
import { canonicalJson } from "./dataRefs";
import { READER_NAMESPACE, runIdOf, runNameOf, SESSION_NAMESPACE } from "./results";

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
     * so unbound references, ids and members only another controller reads survive a re-save.
     */
    readonly kept: Map<string, KeptMember>;
    /** The members the session has no state for (the live camera, `xr`, `timeline`): written back as read. */
    readonly heldOnly: Map<string, unknown>;
    /** Session set id to the set id the file named it by. */
    readonly setFileIds: Map<string, string>;
    /** Session layer id to the layer id the file named it by. */
    readonly layerFileIds: Map<string, string>;
    /** Runs the open neither reran nor restored, by file run id: written back as read. */
    readonly notRun: Map<string, unknown>;
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
        memory = {
            kept: new Map(),
            heldOnly: new Map(),
            setFileIds: new Map(),
            layerFileIds: new Map(),
            notRun: new Map(),
        };
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
 * A value as canonical JSON text (RFC 8785): the one rule every section uses.
 * @param value - The value.
 * @returns The text.
 */
export function canonical(value: unknown): string {
    return canonicalJson(value);
}

// ---------------------------------------------------------------------------------------------
// Cameras (spec 4.7 rule 2, section 7)
// ---------------------------------------------------------------------------------------------

/** Babylon.js's default field of view (`Camera.fov`), in radians: what a camera that states none draws with. */
const DEFAULT_FOV = 0.8;

/** The pose members every controller of a dimension reads. */
const POSE = new Set(["position", "target", "fov", "pan", "zoom", "rotation"]);

/** The controller graphty-element drives each dimension with. */
const DEFAULT_CONTROLLER: Readonly<Record<2 | 3, string>> = Object.freeze({ 2: "2d", 3: "orbit" });

type Xyz = { readonly x: number; readonly y: number; readonly z: number };

/**
 * Where an orbit state given as angles puts the viewer.
 * @param state - The state.
 * @param target - What it looks at.
 * @returns The position, or undefined when the angles are not all given.
 */
function orbitPosition(state: CameraState, target: Xyz): Xyz | undefined {
    const { alpha, beta, radius } = state;
    if (alpha === undefined || beta === undefined || radius === undefined) {
        return undefined;
    }

    return {
        x: target.x + radius * Math.cos(alpha) * Math.sin(beta),
        y: target.y + radius * Math.cos(beta),
        z: target.z + radius * Math.sin(alpha) * Math.sin(beta),
    };
}

/**
 * A camera state as a view section writes it: the dimension, the controller, the shared pose, and
 * what only that controller reads under a member named after it.
 * @param state - The camera state.
 * @returns The camera, or undefined for a state with no pose a reader could apply.
 */
export function cameraJson(state: CameraState): JsonObject | undefined {
    const extra = Object.fromEntries(
        Object.entries(state).filter(([key, value]) => !POSE.has(key) && value !== undefined),
    );
    const own = (controller: string): JsonObject => (Object.keys(extra).length === 0 ? {} : { [controller]: extra });
    if (state.zoom !== undefined || state.pan !== undefined) {
        if (state.zoom === undefined || Number.isNaN(state.zoom) || state.zoom <= 0) {
            return undefined;
        }

        const pan = state.pan ?? { x: 0, y: 0 };
        return {
            dimension: 2,
            controller: DEFAULT_CONTROLLER[2],
            pan: [pan.x, pan.y],
            zoom: state.zoom,
            rotation: state.rotation ?? 0,
            ...own(DEFAULT_CONTROLLER[2]),
        };
    }

    const { target } = state;
    const position = target === undefined ? undefined : (state.position ?? orbitPosition(state, target));
    if (target === undefined || position === undefined) {
        return undefined;
    }

    return {
        dimension: 3,
        controller: DEFAULT_CONTROLLER[3],
        position: [position.x, position.y, position.z],
        target: [target.x, target.y, target.z],
        fov: state.fov ?? DEFAULT_FOV,
        ...own(DEFAULT_CONTROLLER[3]),
    };
}

/**
 * Whether a value is a list of `length` finite numbers.
 * @param value - The value.
 * @param length - How many.
 * @returns True when it is.
 */
function isNumbers(value: unknown, length: number): value is number[] {
    return Array.isArray(value) && value.length === length && value.every((entry) => typeof entry === "number");
}

/** A camera as read: the state to apply, and whether its controller is one this reader knows. */
export interface ReadCamera {
    readonly state: CameraState;
    readonly known: boolean;
    readonly controller: string;
}

/**
 * A view section's camera as a camera state. An unknown controller gives the shared pose alone,
 * for the default controller of its dimension to apply.
 * @param camera - The camera as the file holds it.
 * @returns The state, or undefined for a camera with no pose this reader can apply.
 */
export function cameraOf(camera: unknown): ReadCamera | undefined {
    if (!isObject(camera) || typeof camera.controller !== "string") {
        return undefined;
    }

    const { dimension, controller } = camera;
    const known = (dimension === 2 || dimension === 3) && DEFAULT_CONTROLLER[dimension] === controller;
    const member = known && isObject(camera[controller]) ? (camera[controller] as CameraState) : {};
    if (dimension === 2 && isNumbers(camera.pan, 2) && typeof camera.zoom === "number") {
        const rotation = typeof camera.rotation === "number" ? camera.rotation : 0;
        const [x, y] = camera.pan;
        return { state: { ...member, pan: { x, y }, zoom: camera.zoom, rotation }, known, controller };
    }

    if (
        dimension === 3 &&
        isNumbers(camera.position, 3) &&
        isNumbers(camera.target, 3) &&
        typeof camera.fov === "number"
    ) {
        const [px, py, pz] = camera.position;
        const [tx, ty, tz] = camera.target;
        const state = {
            ...member,
            position: { x: px, y: py, z: pz },
            target: { x: tx, y: ty, z: tz },
            fov: camera.fov,
        };
        return { state, known, controller };
    }

    return undefined;
}

// ---------------------------------------------------------------------------------------------
// Run ids (spec 4.3 rule 1): `<namespace>__<as>`
// ---------------------------------------------------------------------------------------------

const NAMESPACE = /^[a-z][a-z0-9_]{0,31}$/;
const RUN_NAME = /^[a-z][a-z0-9_]{0,63}$/;

/**
 * Whether a namespace and a name are written as the spec allows.
 * @param namespace - The namespace.
 * @param as - The name.
 * @returns True when both are.
 */
function validKey(namespace: string, as: string): boolean {
    return (
        NAMESPACE.test(namespace) &&
        !namespace.includes("__") &&
        !namespace.endsWith("_") &&
        RUN_NAME.test(as) &&
        !as.includes("__")
    );
}

/**
 * A session run id as a namespace and a name, by the rule the results codec writes
 * (codecs/results.ts `runNameOf`): an id that is already `<namespace>__<as>` splits; any other
 * takes `session` when the element minted it and `reader` when the reader named it, its name
 * spelled with what a name may hold.
 * @param id - The session run id.
 * @param derived - Whether the element minted it; default true.
 * @returns The namespace and the name.
 */
export function runKeyOf(id: string, derived = true): { readonly namespace: string; readonly as: string } {
    const split = id.indexOf("__");
    if (split > 0 && validKey(id.slice(0, split), id.slice(split + 2))) {
        return { namespace: id.slice(0, split), as: id.slice(split + 2) };
    }

    const own = runNameOf(id, derived);
    if (own !== undefined) {
        return own;
    }

    // ponytail: a `-` in a session run id is written as `_` and reads back as `_`; keep the
    // original spelling in the file if a reader ever needs the exact id back.
    const spelled = id
        .toLowerCase()
        .replaceAll(/[^a-z0-9_]/g, "_")
        .replaceAll(/_+/g, "_")
        .slice(0, 64);
    return {
        namespace: derived ? SESSION_NAMESPACE : READER_NAMESPACE,
        as: /^[a-z]/.test(spelled) ? spelled : `r${spelled}`.slice(0, 64),
    };
}

/**
 * The run id a file names a session run by.
 * @param id - The session run id.
 * @param derived - Whether the element minted it; default true.
 * @returns `<namespace>__<as>`.
 */
function fileRunId(id: string, derived = true): string {
    const { namespace, as } = runKeyOf(id, derived);
    return `${namespace}__${as}`;
}

/**
 * The session run id a file's run id is restored under (codecs/results.ts `runIdOf`): the
 * `session` and `reader` namespaces' runs take their name back, every other keeps its whole id.
 * @param id - The file run id.
 * @returns The session run id.
 */
export function sessionRunId(id: string): string {
    const at = id.indexOf("__");
    return at < 0 ? id : runIdOf({ namespace: id.slice(0, at), as: id.slice(at + 2) });
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
    /** A run id named in a value path or a run source. */
    run(id: string): string;
}

/** The keys whose text is a path or an expression, where `results.<run id>` names a run. */
const PATH_KEYS = new Set(["path", "where", "by", "attribute", "reads"]);

/** The keys whose text is a whole run id. */
const RUN_KEYS = new Set(["runId", "run", "result"]);

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
 * Rewrite the run ids a path or an expression names.
 * @param text - The text.
 * @param mapper - The mapper.
 * @returns The text, with each `results.<id>` mapped.
 */
function mapPaths(text: string, mapper: RefMapper): string {
    return text.replaceAll(/results\.([a-z][a-z0-9_-]*)/g, (_all, id: string) => `results.${mapper.run(id)}`);
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

    return typeof value === "string" ? mapString(kind, key, value, mapper) : mapRefs(value, mapper, pointer);
}

/**
 * A string member the walk maps: a set id, a run id, or a value path naming runs.
 * @param kind - The holder's `kind`.
 * @param key - The key.
 * @param value - The string.
 * @param mapper - The mapper.
 * @returns The mapped string.
 */
function mapString(kind: unknown, key: string, value: string, mapper: RefMapper): string {
    if (key === "set" && kind === undefined) {
        return mapper.set(value);
    }

    if (RUN_KEYS.has(key)) {
        return mapper.run(value);
    }

    return PATH_KEYS.has(key) ? mapPaths(value, mapper) : value;
}

/**
 * Turn the elements, sets and runs a rule tree, a selector, a scope or a set definition names from
 * one direction's names into the other's: ids to references on save, references to ids on open.
 * Element-naming places: a `neighborhood` leaf's `seeds`; `nodes` and `edges` of a fixed or path
 * definition, an `ids` selector, a selection or a scope; a scope's `hidden`; a `{ set }`; and the
 * run ids in value paths and run sources.
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
 * Whether a rule tree names an element: a `neighborhood` leaf, a member of listed nodes or of an
 * inline fixed or path set, a member of a kept set that names elements, or an `item` leaf (one run's
 * item). Such a rule goes in view (spec 5 rule 1).
 * @param rule - The rule tree.
 * @param namesSet - Whether a kept set names elements.
 * @returns True when it does.
 */
export function ruleNamesElements(rule: unknown, namesSet: (id: string) => boolean): boolean {
    if (Array.isArray(rule)) {
        return rule.some((entry) => ruleNamesElements(entry, namesSet));
    }

    if (!isObject(rule)) {
        return false;
    }

    if (rule.kind === "neighborhood" || rule.kind === "item") {
        return true;
    }

    if (
        rule.kind === undefined &&
        (Array.isArray(rule.nodes) || (typeof rule.set === "string" && namesSet(rule.set)))
    ) {
        return true;
    }

    if (MEMBER_KINDS.has(String(rule.kind))) {
        return true;
    }

    return Object.values(rule).some((held) => ruleNamesElements(held, namesSet));
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
 * The mapper a save writes with: session ids to element references.
 * @param session - The session.
 * @param refs - The element references.
 * @param memory - The view memory, for the ids a file named sets by.
 * @param isDerived - Whether the element minted a run's id; default every run.
 * @returns The mapper.
 */
export function writeMapper(
    session: TransactionScope,
    refs: ElementRefs,
    memory: ViewMemory,
    isDerived: (id: string) => boolean = () => true,
): RefMapper {
    const runIds = new Set(session.runs.list().map((run) => run.id));
    return {
        node: (value) => (typeof value === "string" || typeof value === "number" ? refs.nodeRef(value) : undefined),
        edge: (value) => {
            const id = isObject(value) ? edgeOfMember(session, value as unknown as EdgeMember) : value;
            return typeof id === "string" ? refs.edgeRef(id) : undefined;
        },
        set: (id) => memory.setFileIds.get(id) ?? id,
        run: (id) => (runIds.has(id) ? fileRunId(id, isDerived(id)) : id),
    };
}
