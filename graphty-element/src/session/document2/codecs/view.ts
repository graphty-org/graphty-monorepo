/**
 * @file The `view` section codec, version 1 (spec/README.md 4.7, 5 and 8.2): the session a file is
 * opened to -- camera, saved views, selection, pinned positions, every set, the visibility in force,
 * the layer order and the layers that name elements or a dataset, every run record in the order
 * made, and the layout record. Experimental (`save-files-v2`).
 *
 * Opening restores the session: sets, visibility, layers and runs come back under their saved
 * ids, and each run is rerun or restored from saved results. What the session holds no state for
 * (the live camera) and what does not bind (references to elements the data lacks, runs neither
 * rerun nor restored) is kept from the open and written back on the next save. A member the
 * session gives back unchanged is written exactly as it was read.
 */

import type { CameraState } from "../../../camera/types";
import type { AlgorithmKey, FilterCondition, LayerSpec, NodeId, RuleTree, ScopeInput } from "../../../catalog/types";
import { isGraphtyError } from "../../../errors/GraphtyError";
import { dispatcherOf } from "../../dispatchers";
import { expandedGraph, type GroupValue, type SavedCollapse } from "../../groups";
import { ENGINE_VERSIONS } from "../../runs/engine";
import type { Run } from "../../runs/types";
import type { Layer } from "../../styles/Layer";
import type { GraphSession, TransactionScope } from "../../types";
import type { TimeWindow } from "../../visibility/filter";
import type { SessionVisibilityApi } from "../../visibility/VisibilityApi";
import { canonicalText as canonical } from "../framing";
import type {
    DocumentProblem,
    ElementRefs,
    JsonObject,
    ReadContext,
    ReadSection,
    SectionCodec,
    WriteContext,
} from "../types";
import { addedValues } from "./data";
import {
    addedColumns,
    edgeRefOf,
    elementRefsOf,
    type LoadedLooks,
    loadedLooksAsColumns,
    READER,
    rememberReaderEdge,
    typedIds,
} from "./dataRefs";
import { layerNamesElements } from "./elementNaming";
import { filterRule } from "./recipeCommands";
import { markRecipeRun, recipeRunName, restoredPositions } from "./results";
import { heldTypeSelector } from "./style";
import {
    cameraJson,
    cameraOf,
    fileIdsOf,
    fileLayerId,
    isObject,
    mapRefs,
    memoryOf,
    type RefMapper,
    rerunsOnOpen,
    resetMemory,
    type ViewMemory,
    writeMapper,
} from "./viewParts";

/** The section name, as every report names it. */
const SECTION = "view";

/** The body members, in the order they are written. */
const MEMBERS = [
    "camera",
    "views",
    "selection",
    "pinned",
    "groups",
    "sets",
    "visibility",
    "timeline",
    "viewRotation",
    "framing",
    "hiddenColumns",
    "order",
    "layers",
    "runs",
    "layout",
] as const;

/**
 * The members read from the live session where it has them (a renderer's camera, the timeline's
 * playhead) and otherwise kept from the open and written back: a session that draws nothing has
 * no camera, and one with no time window has no playhead.
 */
const HELD_ONLY = new Set<string>(["camera", "timeline"]);

/** The option types whose values name nodes. */
const NODE_OPTION_TYPES = new Set(["node-id", "node-set"]);

/** A run id as the schema spells it. */
const RUN_ID = /^[A-Za-z0-9_.:-]{1,128}$/;

/** The scope strings a reader replays. */
const SCOPE_STRINGS = new Set(["graph", "largest-component"]);

/** The scope object forms a reader replays as they are; `{ types }` is replayed as its nodes. */
const SCOPE_FORMS = new Set(["set", "where", "nodes", "define"]);

/** What writing the body reads. */
interface Writer {
    readonly session: GraphSession;
    readonly refs: ElementRefs;
    readonly mapper: RefMapper;
    readonly problems: DocumentProblem[];
    /** Whether graphty-element minted a run's id (`derived: true`, spec 4.7 rule 5). */
    readonly isDerived: (id: string) => boolean;
}

// ---------------------------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------------------------

/**
 * The names of an algorithm's options that name nodes, with their type.
 * @param session - The session, for the catalog.
 * @param algorithm - The algorithm.
 * @returns Option name to type.
 */
function nodeOptions(session: TransactionScope, algorithm: AlgorithmKey): Map<string, string> {
    const descriptor = session.catalog.algorithms().find((entry) => entry.key === algorithm);
    return new Map(
        (descriptor?.options ?? [])
            .filter((option) => NODE_OPTION_TYPES.has(option.type))
            .map((option) => [option.name, option.type]),
    );
}

/**
 * A run's params with the node-naming options mapped, for writing or reading. An option whose
 * node does not map is left out.
 * @param session - The session.
 * @param algorithm - The algorithm.
 * @param params - The params.
 * @param mapper - How a node is mapped.
 * @param pointer - Where the params are.
 * @returns The mapped params, and whether every node mapped.
 */
function mapParams(
    session: TransactionScope,
    algorithm: AlgorithmKey,
    params: Readonly<Record<string, unknown>>,
    mapper: RefMapper,
    pointer: string,
): { readonly params: JsonObject; readonly bound: boolean } {
    const options = nodeOptions(session, algorithm);
    const out: JsonObject = {};
    let bound = true;
    for (const [name, value] of Object.entries(params)) {
        const at = `${pointer}/${name}`;
        const type = options.get(name);
        if (type === "node-set" && Array.isArray(value)) {
            const mapped = value.map((node, n) => mapper.node(node, `${at}/${n}`));
            bound &&= !mapped.includes(undefined);
            out[name] = mapped.filter((node) => node !== undefined);
        } else if (type === "node-id" && value !== undefined && value !== null) {
            const mapped = mapper.node(value, at);
            bound &&= mapped !== undefined;
            if (mapped !== undefined) {
                out[name] = mapped;
            }
        } else if (value !== undefined) {
            out[name] = value;
        }
    }

    return { params: out, bound };
}

/**
 * Whether anything narrows the visible graph now: a filter, a keep or exclude condition, a time
 * window or hidden nodes.
 * @param session - The session.
 * @returns True when it is narrowed.
 */
function visibleNarrowed(session: TransactionScope): boolean {
    const { visibility } = session;
    return (
        visibility.filter !== null ||
        visibility.window !== null ||
        session.hidden.ids.size > 0 ||
        visibility.conditions.some((condition) => condition.on && condition.effect !== "select")
    );
}

/**
 * A run's own scope as a view run record writes it (spec 4.7 rule 5): the selection resolved to
 * its nodes, the visible graph as the whole graph (the narrowing is recorded by `replayable`).
 * @param w - The writer.
 * @param run - The run.
 * @returns The scope.
 */
function scopeJson(w: Writer, run: Run): unknown {
    const { spec } = run.record.scope;
    if (spec === "selection") {
        return mapRefs({ nodes: [...run.scope.nodes] }, w.mapper, "");
    }

    if (spec === "visible") {
        return "graph";
    }

    return typeof spec === "string" ? spec : mapRefs(spec, w.mapper, "");
}

/**
 * Whether the visible graph narrowed a run: a filter, a time window, or a visible scope while
 * anything narrows it (spec 4.7 rule 5).
 * @param w - The writer.
 * @param run - The run.
 * @returns True when it did.
 */
function narrowedRun(w: Writer, run: Run): boolean {
    const { caveats, scope } = run.record;
    return (
        caveats.filterScope === true ||
        caveats.windowScope === true ||
        (scope.spec === "visible" && visibleNarrowed(w.session))
    );
}

/**
 * The `runs` member: every finished run, in the order made.
 * @param w - The writer.
 * @returns The run records.
 */
function runsJson(w: Writer): JsonObject[] {
    const out: JsonObject[] = [];
    for (const run of w.session.runs.list()) {
        if (run.status !== "succeeded") {
            continue;
        }

        const pointer = `/runs/${out.length}`;
        if (!RUN_ID.test(run.id)) {
            w.problems.push({ code: "W_MEMBER_LEFT_OUT", params: { section: SECTION, pointer } });
            continue;
        }

        out.push(runJson(w, run, pointer));
    }

    return out;
}

/**
 * One finished run's record (spec 4.7 rule 5), reporting what it leaves out.
 * @param w - The writer.
 * @param run - The run.
 * @param pointer - Where it is written.
 * @returns The record.
 */
function runJson(w: Writer, run: Run, pointer: string): JsonObject {
    const { name, seed } = run.record;
    const { params, bound } = mapParams(w.session, run.algorithm, run.params, w.mapper, "");
    if (!bound) {
        w.problems.push({
            code: "W_ELEMENT_NAMING_LEFT_OUT",
            params: { section: SECTION, pointer: `${pointer}/params` },
        });
    }

    const narrowed = narrowedRun(w, run);
    if (narrowed) {
        // No scope form holds a run's own scope and the narrowing together (spec 4.7 rule 5).
        w.problems.push({ code: "W_MEMBER_LEFT_OUT", params: { section: SECTION, pointer: `${pointer}/scope` } });
    }

    return {
        id: run.id,
        ...recipeRunName(w.session, run.id),
        ...(name === null ? {} : { name }),
        algorithm: run.algorithm,
        ...(Object.keys(params).length === 0 ? {} : { params }),
        ...(Number.isInteger(seed) && (seed ?? -1) >= 0 ? { seed } : {}),
        scope: scopeJson(w, run),
        ...(w.isDerived(run.id) ? { derived: true } : {}),
        ...(narrowed ? { replayable: false } : {}),
    };
}

/**
 * Whether a layer belongs in view (spec 5 rule 5): it names elements.
 * @param layer - The layer.
 * @param session - The session.
 * @returns True when it does.
 */
function inView(layer: Layer, session: GraphSession): boolean {
    if (heldTypeSelector(session, layer.id, layer.selector) !== undefined) {
        return false;
    }

    return layerNamesElements(layer, session);
}

/**
 * A view layer's `source` member: a run's with its params mapped, none for a layer the reader made
 * (an absent `source` means reader-made), any other written as it is.
 * @param w - The writer.
 * @param source - The layer's source.
 * @param looks - The look values a load kept, as columns.
 * @returns The member, or nothing.
 */
function layerSourceJson(w: Writer, source: LayerSpec["source"], looks: LoadedLooks): JsonObject {
    // Temporary, with loadedLooksAsColumns (issue 8259): a layer filed under a load's template
    // writes no source, as a layer the reader made does.
    if (source === undefined || source.by === "user" || looks.madeByLoad(source)) {
        return {};
    }
    if (source.by !== "run") {
        return { source };
    }
    const { params } = mapParams(w.session, source.algorithm, source.params, w.mapper, "");
    return { source: { by: "run", runId: source.runId, algorithm: source.algorithm, params } };
}

/**
 * The `layers` member: every layer that belongs in view, bottom first.
 * @param w - The writer.
 * @returns The layers.
 */
function layersJson(w: Writer): JsonObject[] {
    const looks = loadedLooksAsColumns(w.session);
    return w.session.styles
        .list()
        .filter((layer) => !layer.locked && inView(layer, w.session))
        .map((layer) => {
            const { source } = layer;
            return {
                id: fileLayerId(w.session, layer.id),
                name: layer.name,
                target: layer.target,
                selector: mapRefs(layer.selector, w.mapper, ""),
                ...(layer.set === undefined ? {} : { set: layer.set }),
                ...(layer.encode === undefined ? {} : { encode: mapRefs(layer.encode, w.mapper, "") }),
                ...layerSourceJson(w, source, looks),
                ...(layer.enabled ? {} : { enabled: false }),
                ...(layer.userData === undefined ? {} : { userData: layer.userData }),
            };
        });
}

/**
 * A time window as a view section writes it: each bound an instant, as a `toISOString` string
 * (spec 4.7 rule 4).
 * @param window - The window.
 * @returns Its members.
 */
function windowJson(window: TimeWindow): JsonObject {
    const bound = (value: number | string): number | string =>
        typeof value === "number" ? new Date(value).toISOString() : value;
    return Object.fromEntries(
        Object.entries({ ...window, from: bound(window.from), to: bound(window.to) }).filter(
            ([, value]) => value !== undefined,
        ),
    );
}

/**
 * The `camera` member: the renderer's camera now (spec 4.7 rule 2), or undefined with no renderer.
 * @param session - The session.
 * @returns The camera.
 */
function liveCamera(session: GraphSession): JsonObject | undefined {
    const state = dispatcherOf(session).services.camera?.state?.();
    return state === undefined ? undefined : cameraJson(state);
}

/**
 * The `timeline` member: the playhead, where a seek would put the window in force -- its start
 * when sliding, its end when cumulative -- or undefined with no window.
 * @param session - The session.
 * @returns The member.
 */
function timelineJson(session: GraphSession): JsonObject | undefined {
    const window = session.time.committed;
    if (window === null) {
        return undefined;
    }

    const at = (window.mode ?? session.time.settings.mode) === "cumulative" ? window.to : window.from;
    return { at: typeof at === "number" ? new Date(at).toISOString() : at };
}

/**
 * The filter in force (spec 4.7 rule 4): one expression leaf on nodes or edges as graph.filter's
 * `{ on, where }`; any other filter as its rule tree, in the shape a rule set's definition holds
 * it, element-naming leaves as element references.
 * @param w - The writer.
 * @param filter - The filter in force.
 * @returns The filter, or null.
 */
function filterJson(w: Writer, filter: RuleTree | null): JsonObject | null {
    if (filter === null) {
        return null;
    }

    if (filter.kind === "expression" || filter.kind === "edges") {
        return { on: filter.kind === "edges" ? "edges" : "nodes", where: filter.where };
    }

    return mapRefs(filter, w.mapper, "") as JsonObject;
}

/**
 * The `visibility` member, or undefined when nothing is filtered, windowed, conditioned or hidden.
 * @param w - The writer.
 * @returns The member.
 */
function visibilityJson(w: Writer): JsonObject | undefined {
    const { visibility } = w.session;
    const { hidden } = mapRefs({ hidden: [...w.session.hidden.ids] }, w.mapper, "") as { hidden: unknown[] };
    const { filter, window, showContext, conditions } = visibility;
    if (filter === null && window === null && !showContext && conditions.length === 0 && hidden.length === 0) {
        return undefined;
    }

    // No filter in force is left out (spec 4.7 rule 4).
    return {
        ...(filter === null ? {} : { filter: filterJson(w, filter) }),
        ...(window === null ? {} : { window: windowJson(window) }),
        showContext,
        conditions: mapRefs(conditions, w.mapper, "") as unknown[],
        hidden,
    };
}

/**
 * The `pinned` member: the pinned nodes and where they stand.
 * @param w - The writer.
 * @returns The entries.
 */
function pinnedJson(w: Writer): JsonObject[] {
    // With a group collapsed the data holds its members: their pins, kept for the expand, are saved.
    const expanded = expandedGraph(w.session);
    const where = new Map(expanded?.positions.map((entry) => [entry.id, entry]));
    const at = (id: NodeId): { x: number; y: number; z?: number } | undefined =>
        expanded === null ? w.session.positions.get(id) : where.get(id);
    return [...(expanded?.pinned ?? w.session.positions.pinned)].flatMap((id) => {
        const node = w.refs.nodeRef(id);
        const point = at(id);
        return node === undefined || point === undefined
            ? []
            : [{ node, position: { x: point.x, y: point.y, z: point.z ?? 0 } }];
    });
}

/**
 * The `groups` member (rule 8): the collapses, in the order an open makes them again, each with
 * the edges added to a node standing in for a group that are added again right after it. An end
 * standing in for a group is named by its collapse; an edge whose other end names no element of
 * the data is left out and reported.
 * @param w - The writer.
 * @returns The collapses.
 */
function groupsJson(w: Writer): JsonObject[] {
    const expanded = expandedGraph(w.session);
    if (expanded === null) {
        return [];
    }

    const { collapsed, standIns } = expanded;
    const end = (id: NodeId): unknown => {
        const at = standIns.get(id);
        return at === undefined ? w.refs.nodeRef(id) : { groupBy: collapsed[at].groupBy, group: collapsed[at].group };
    };
    const edges = collapsed.map((): JsonObject[] => []);
    for (const { id, record, after } of expanded.added) {
        const { source, target, ...columns } = record;
        const from = end(source as NodeId);
        const to = end(target as NodeId);
        if (from === undefined || to === undefined) {
            w.problems.push({
                code: "W_MEMBER_LEFT_OUT",
                params: { section: SECTION, pointer: `/groups/${String(after)}/edges` },
            });
            continue;
        }

        edges[after].push({ edge: w.refs.edgeRef(id), from, to, ...addedColumns(columns) });
    }

    return collapsed.map((collapse, at) => ({ ...collapse, ...(edges[at].length === 0 ? {} : { edges: edges[at] }) }));
}

/**
 * The `layout` member: the layout in force.
 * @param session - The session.
 * @returns The record.
 */
function layoutJson(session: GraphSession): JsonObject {
    const { id, engine, options, dimension } = session.layout;
    return {
        id,
        algorithm: engine,
        options: { ...options },
        dimension: dimension === "2d" ? 2 : 3,
        engine: { ...ENGINE_VERSIONS },
    };
}

/**
 * Drop the members with nothing to say.
 * @param body - The members.
 * @returns The members that hold something.
 */
function compact(body: JsonObject): JsonObject {
    return Object.fromEntries(
        Object.entries(body).filter(
            ([, value]) =>
                value !== undefined &&
                !(Array.isArray(value) && value.length === 0) &&
                !(isObject(value) && Object.keys(value).length === 0),
        ),
    );
}

/**
 * The body as the session holds it now, before what an open kept is put back.
 * @param w - The writer.
 * @returns The members.
 */
function freshBody(w: Writer): JsonObject {
    const { session, mapper } = w;
    const selection = mapRefs({ nodes: [...session.selection.nodes], edges: [...session.selection.edges] }, mapper, "");
    const { viewRotation, framing } = session.config;
    const layers = layersJson(w);
    return compact({
        camera: liveCamera(session),
        views: [...session.views].flatMap(([name, state]) => {
            const camera = cameraJson(state);
            return camera === undefined ? [] : [{ name, camera }];
        }),
        selection: compact(selection as JsonObject),
        pinned: pinnedJson(w),
        groups: groupsJson(w),
        sets: session.sets.list().map((set) => ({
            id: mapper.set(set.id),
            name: set.name,
            definition: mapRefs(set.definition, mapper, ""),
        })),
        visibility: visibilityJson(w),
        timeline: timelineJson(session),
        viewRotation,
        framing,
        hiddenColumns: session.data.hiddenColumns().map(({ kind, name }) => ({ kind, name })),
        order: session.styles
            .list()
            .filter((layer) => !layer.locked)
            .map((layer) => fileLayerId(session, layer.id)),
        layers,
        runs: runsJson(w),
        layout: layoutJson(session),
    });
}

/**
 * The runs member with the run records an open could not start put back in their places.
 * @param runs - The run records the session holds.
 * @param memory - The view memory.
 * @returns The runs to write.
 */
function withNotRun(runs: unknown, memory: ViewMemory): unknown[] | undefined {
    const live = new Map((Array.isArray(runs) ? (runs as JsonObject[]) : []).map((record) => [record.id, record]));
    const merged: unknown[] = [];
    for (const id of memory.runOrder) {
        const record = live.get(id) ?? memory.notRun.get(id);
        live.delete(id);
        if (record !== undefined) {
            merged.push(record);
        }
    }

    merged.push(...live.values());
    return merged.length === 0 ? undefined : merged;
}

/**
 * The body to write: the fresh body, with each member the session gave back unchanged written as
 * the open read it, and the camera and playhead the session has none of now written back as read.
 * @param fresh - The fresh body.
 * @param memory - The view memory.
 * @returns The body, in member order.
 */
function keptBody(fresh: JsonObject, memory: ViewMemory): JsonObject {
    const out: JsonObject = {};
    for (const name of MEMBERS) {
        const now = name === "runs" ? withNotRun(fresh.runs, memory) : fresh[name];
        const kept = memory.kept.get(name);
        let value = kept?.applied === canonical(now) ? kept.original : now;
        if (value === undefined && HELD_ONLY.has(name)) {
            value = memory.heldOnly.get(name);
        }

        if (value !== undefined) {
            out[name] = value;
        }
    }

    return out;
}

/**
 * The writer over a session.
 * @param session - The session.
 * @param refs - The element references.
 * @param problems - Where the save reports.
 * @param isDerived - Whether graphty-element minted a run's id.
 * @returns The writer.
 */
function writerOf(
    session: GraphSession,
    refs: ElementRefs,
    problems: DocumentProblem[],
    isDerived: (id: string) => boolean,
): Writer {
    return { session, refs, mapper: writeMapper(session, refs), problems, isDerived };
}

// ---------------------------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------------------------

/** What reading the body uses. */
interface Reader {
    readonly section: ReadSection;
    readonly context: ReadContext;
    readonly memory: ViewMemory;
    /** File set id to session set id. */
    readonly sets: Map<string, string>;
    /** The element references, built again once the edges a collapse lists are added. */
    refs: ElementRefs;
    mapper: RefMapper;
    /** The runs restored as minted by graphty-element. */
    readonly derived: Set<string>;
}

/**
 * Report a part the file holds that could not be applied.
 * @param r - The reader.
 * @param error - Why.
 * @param member - The member.
 */
function refused(r: Reader, error: unknown, member: string): void {
    if (!isGraphtyError(error)) {
        throw error;
    }

    r.context.problems.push({
        code: "E_BAD_DOCUMENT",
        params: { section: SECTION, pointer: `${r.section.pointer}/${member}` },
    });
}

/**
 * Run one part of the read, reporting a refusal and going on.
 * @param r - The reader.
 * @param member - The member it reads.
 * @param part - The part.
 */
async function attempt(r: Reader, member: string, part: () => Promise<unknown>): Promise<void> {
    try {
        await part();
    } catch (error) {
        refused(r, error, member);
    }
}

/**
 * The mapper an open reads with: element references to session ids, reporting the ones that bind
 * nowhere.
 * @param context - The read context.
 * @param sets - File set id to session set id.
 * @param refs - The element references.
 * @returns The mapper.
 */
function readMapper(context: ReadContext, sets: ReadonlyMap<string, string>, refs: ElementRefs): RefMapper {
    const unbound = (ref: unknown, pointer: string): void => {
        context.problems.push({
            code: "W_REFERENCE_UNBOUND",
            params: { section: SECTION, pointer, ref: canonical(ref) },
        });
    };
    const bind =
        (find: (ref: unknown) => unknown) =>
        (value: unknown, pointer: string): unknown => {
            const id = find(value);
            if (id === undefined) {
                unbound(value, pointer);
            }

            return id;
        };
    return {
        node: bind((ref) => refs.node(ref)),
        edge: bind((ref) => refs.edge(ref)),
        set: (id) => sets.get(id) ?? id,
    };
}

/**
 * Create one saved set, remembering its file id.
 * @param r - The reader.
 * @param set - The set as the file holds it.
 * @param at - Its index in `sets`.
 */
function createSet(r: Reader, set: JsonObject, at: number): void {
    const { id, name, definition } = set;
    const input = mapRefs(definition, r.mapper, `${r.section.pointer}/sets/${at}/definition`);
    const created = r.context.tx.sets.create(input as never, typeof name === "string" ? { name } : {});
    if (typeof id === "string") {
        r.sets.set(id, created);
        fileIdsOf(r.context.session).sets.set(created, id);
    }

    r.context.restored.add("sets");
}

/**
 * Whether every node and edge a saved set names is in the graph now; an edge added to a collapse
 * is not until the collapse is made again.
 * @param r - The reader.
 * @param set - The set as the file holds it.
 * @returns True when all bind.
 */
function bindsNow(r: Reader, set: JsonObject): boolean {
    let all = true;
    const check =
        (find: (ref: unknown) => unknown) =>
        (value: unknown): unknown => {
            const id = find(value);
            all &&= id !== undefined;
            return id;
        };
    mapRefs(
        set.definition,
        { node: check((ref) => r.refs.node(ref)), edge: check((ref) => r.refs.edge(ref)), set: (id) => id },
        "",
    );
    return all;
}

/**
 * Create the saved sets; a set that cannot be made yet (it reads a run or a later set, or names
 * an element not in the graph yet) waits.
 * @param r - The reader.
 * @param sets - The sets, with their index.
 * @returns The ones that wait.
 */
function createSets(r: Reader, sets: readonly (readonly [JsonObject, number])[]): (readonly [JsonObject, number])[] {
    return sets.filter(([set, at]) => {
        if (!bindsNow(r, set)) {
            return true;
        }

        try {
            createSet(r, set, at);
            return false;
        } catch (error) {
            if (!isGraphtyError(error)) {
                throw error;
            }

            return true;
        }
    });
}

/**
 * Apply the selection, once the groups are collapsed again so an edge added to one is selected.
 * @param r - The reader.
 * @param body - The body.
 */
async function readSelection(r: Reader, body: Readonly<JsonObject>): Promise<void> {
    if (isObject(body.selection)) {
        const pointer = `${r.section.pointer}/selection`;
        const selection = mapRefs(body.selection, r.mapper, pointer) as { nodes?: never[]; edges?: never[] };
        await attempt(r, "selection", () =>
            r.context.tx.selection.apply({ nodes: selection.nodes ?? [], edges: selection.edges ?? [] }),
        );
    }
}

/**
 * Apply the pinned nodes, before the groups are collapsed again, which keep their members' pins.
 * @param r - The reader.
 * @param body - The body.
 */
async function readPinned(r: Reader, body: Readonly<JsonObject>): Promise<void> {
    const { tx } = r.context;
    const at = r.section.pointer;
    if (Array.isArray(body.pinned)) {
        const entries = body.pinned.flatMap((entry: unknown, n) => {
            const id = isObject(entry) ? r.mapper.node(entry.node, `${at}/pinned/${n}/node`) : undefined;
            const p = isObject(entry) && isObject(entry.position) ? entry.position : undefined;
            return id === undefined || p === undefined
                ? []
                : [{ id: id as never, x: Number(p.x), y: Number(p.y), z: Number(p.z) }];
        });
        await attempt(r, "pinned", async () => {
            await tx.positions.set(entries);
            await tx.positions.pin(entries.map((entry) => entry.id));
            r.context.restored.add("pins");
        });
    }
}

/**
 * The filter a file holds, as the rule the session holds. The two forms are told apart by
 * structure: a rule tree has a `kind`, graph.filter's `{ on, where }` has none.
 * @param filter - The filter, its element references already mapped to ids.
 * @returns The rule, or null.
 */
function filterIn(filter: unknown): RuleTree | null {
    if (isObject(filter) && typeof filter.kind === "string") {
        return filter as unknown as RuleTree;
    }

    if (!isObject(filter) || typeof filter.where !== "string") {
        return null;
    }

    return filterRule(filter.where, filter.on === "edges" ? "edges" : "nodes");
}

/**
 * Apply the visibility member.
 * @param r - The reader.
 * @param visibility - The member.
 */
async function readVisibility(r: Reader, visibility: JsonObject): Promise<void> {
    const { tx } = r.context;
    const api = tx.visibility as SessionVisibilityApi;
    const read = mapRefs(visibility, r.mapper, `${r.section.pointer}/visibility`) as JsonObject;
    await attempt(r, "visibility", async () => {
        if ("filter" in read) {
            await tx.visibility.set(filterIn(read.filter));
        }

        if (isObject(read.window)) {
            const window = read.window as unknown as TimeWindow;
            await api.restoreWindow(window);
        }

        if (Array.isArray(read.conditions)) {
            await api.restoreConditions(read.conditions.filter(isObject) as unknown as FilterCondition[]);
        }

        if (typeof read.showContext === "boolean") {
            // Awaited, so the open's step holds it (the property setter dispatches without waiting).
            await tx.execute({ op: "visibility.context", show: read.showContext });
        }

        if (Array.isArray(read.hidden)) {
            await tx.hidden.add(read.hidden as never[]);
        }

        r.context.restored.add("visibility");
    });
}

/**
 * A camera as read, reporting an unknown controller.
 * @param r - The reader.
 * @param camera - The camera.
 * @returns The state to apply, or undefined.
 */
function cameraRead(r: Reader, camera: unknown): CameraState | undefined {
    const read = cameraOf(camera);
    if (read !== undefined && !read.known) {
        r.context.problems.push({
            code: "W_CAMERA_CONTROLLER_UNKNOWN",
            params: { section: SECTION, controller: read.controller },
        });
    }

    return read?.state;
}

/**
 * Apply the camera, the saved views and the view settings.
 * @param r - The reader.
 * @param body - The body.
 */
async function readCameraAndSettings(r: Reader, body: Readonly<JsonObject>): Promise<void> {
    const { tx } = r.context;
    if (Array.isArray(body.views)) {
        const views = body.views.flatMap((view: unknown) => {
            const camera = isObject(view) && typeof view.name === "string" ? cameraRead(r, view.camera) : undefined;
            return camera === undefined ? [] : [{ name: (view as { name: string }).name, camera }];
        });
        await attempt(r, "views", async () => {
            await tx.views.save(views);
            r.context.restored.add("views");
        });
    }

    const live = body.camera === undefined ? undefined : cameraRead(r, body.camera);
    if (live?.position !== undefined && live.target !== undefined) {
        try {
            await tx.execute({ op: "view.camera", position: live.position, target: live.target });
        } catch (error) {
            // A session that draws nothing has no camera to move; the camera is kept for the next save.
            if (!isGraphtyError(error) || error.code !== "E_UNSUPPORTED") {
                refused(r, error, "camera");
            }
        }
    }

    const { viewRotation, framing } = body;
    if (typeof viewRotation === "number" || isObject(framing)) {
        await attempt(r, "framing", () =>
            tx.config.set({
                ...(typeof viewRotation === "number" ? { viewRotation } : {}),
                ...(isObject(framing) ? { framing: framing as never } : {}),
            }),
        );
    }

    if (Array.isArray(body.hiddenColumns)) {
        const columns = body.hiddenColumns.filter(isObject) as never[];
        await attempt(r, "hiddenColumns", () => tx.data.setHidden(columns, true));
    }
}

/**
 * Apply the layout record, then put back the positions a results section restored, which choosing
 * the layout would otherwise move.
 * @param r - The reader.
 * @param layout - The record.
 */
async function readLayout(r: Reader, layout: JsonObject): Promise<void> {
    const { tx } = r.context;
    const now = tx.layout;
    const dimension = layout.dimension === 2 ? "2d" : "3d";
    const options = isObject(layout.options) ? layout.options : {};
    // The layout's own name is `algorithm`; `engine` is the EngineVersions record, not read back.
    const engine = typeof layout.algorithm === "string" ? layout.algorithm : undefined;
    const same =
        now.id === layout.id &&
        (engine === undefined || now.engine === engine) &&
        canonical(now.options) === canonical(options);
    try {
        if (!same && typeof layout.id === "string") {
            await tx.layout.set(layout.id, { ...(engine === undefined ? {} : { engine }), options });
        }

        if (now.dimension !== dimension) {
            await tx.layout.setDimension(dimension);
        }
    } catch (error) {
        // A session that draws nothing has no layout to set; the record is kept for the next save.
        if (!isGraphtyError(error) || error.code !== "E_UNSUPPORTED") {
            refused(r, error, "layout");
        }
    }

    const placed = restoredPositions(r.context.session);
    if (placed !== undefined) {
        await attempt(r, "layout", () => tx.positions.set(placed));
    }
}

/**
 * A run record's scope as the runs API takes it, or undefined for a form this reader does not
 * replay (spec 4.7 rule 5: that run's replay stops, the record is kept).
 * @param r - The reader.
 * @param scope - The scope.
 * @param pointer - Where it is.
 * @returns The scope.
 */
function scopeIn(r: Reader, scope: unknown, pointer: string): ScopeInput | undefined {
    if (typeof scope === "string") {
        return SCOPE_STRINGS.has(scope) ? (scope as ScopeInput) : undefined;
    }

    const keys = isObject(scope) ? Object.keys(scope) : [];
    if (keys.length === 1 && keys[0] === "types") {
        // graphty-element has no type scope: the nodes of those types, as the data stands now.
        const { types } = scope as JsonObject;
        return Array.isArray(types) && types.every((type): type is string => typeof type === "string")
            ? { nodes: typedIds(r.context.session, types).nodes }
            : undefined;
    }

    if (keys.length !== 1 || !SCOPE_FORMS.has(keys[0])) {
        return undefined;
    }

    return mapRefs(scope, r.mapper, pointer) as ScopeInput;
}

/**
 * Rerun or restore one view run, or report it not run and keep it.
 * @param r - The reader.
 * @param record - The run record.
 * @param at - Its index in `runs`.
 */
async function readRun(r: Reader, record: unknown, at: number): Promise<void> {
    const { context } = r;
    const pointer = `${r.section.pointer}/runs/${at}`;
    const id = isObject(record) && typeof record.id === "string" ? record.id : undefined;
    if (id === undefined) {
        return;
    }

    r.memory.runOrder.push(id);
    if (isObject(record) && typeof record.namespace === "string") {
        markRecipeRun(context.session, id);
    }

    const notRun = (): void => {
        context.problems.push({ code: "W_RUN_NOT_RUN", params: { run: id } });
        r.memory.notRun.set(id, record);
    };
    if (!isObject(record) || typeof record.algorithm !== "string") {
        notRun();
        return;
    }

    const { params, bound } = mapParams(
        context.tx,
        record.algorithm,
        isObject(record.params) ? record.params : {},
        r.mapper,
        `${pointer}/params`,
    );
    const scope = scopeIn(r, record.scope, `${pointer}/scope`);
    const reruns = rerunsOnOpen(context, id, record);
    if (!bound || scope === undefined || (!reruns && !context.canned.has(id))) {
        notRun();
        return;
    }

    try {
        await context.tx.runs.start(record.algorithm, params, {
            as: id,
            style: false,
            scope,
            ...(typeof record.seed === "number" ? { seed: record.seed } : {}),
        });
        if (typeof record.name === "string") {
            await context.tx.runs.rename(id, record.name);
        }

        if (record.derived === true) {
            context.restoreDerived(id);
            r.derived.add(id);
        }

        context.restored.add("runs");
    } catch (error) {
        if (!isGraphtyError(error)) {
            throw error;
        }

        notRun();
    }
}

/**
 * One end of an edge added to a collapse, as the session id: a group's end names a collapse made
 * already, a node's end a node in the graph. Reports why when it names neither.
 * @param r - The reader.
 * @param made - The node standing in for each collapse made, by its canonical `{ groupBy, group }`.
 * @param entry - The edge as the file holds it.
 * @param role - `from` or `to`.
 * @param pointer - The edge's pointer.
 * @returns The id, or undefined.
 */
function groupEdgeEnd(
    r: Reader,
    made: ReadonlyMap<string, NodeId>,
    entry: Readonly<JsonObject>,
    role: "from" | "to",
    pointer: string,
): NodeId | undefined {
    const value = entry[role];
    const isGroup = isObject(value) && "groupBy" in value;
    const id = isGroup
        ? made.get(canonical({ groupBy: value.groupBy, group: value.group }))
        : (r.mapper.node(value, `${pointer}/${role}`) as NodeId | undefined);
    // A group's end names a collapse made already; a node's end, one an earlier collapse left in
    // the graph (one bound nowhere is reported unbound by the mapper).
    const bad = isGroup ? id === undefined : id !== undefined && r.context.tx.data.node(id) === undefined;
    if (bad) {
        r.context.problems.push({ code: "E_BAD_DOCUMENT", params: { section: SECTION, pointer } });
        return undefined;
    }

    return id;
}

/**
 * Add again the edges a collapse lists, right after it is made, each under the key it was saved
 * with so the next save writes the same one.
 * @param r - The reader.
 * @param made - The node standing in for each collapse made, by its canonical `{ groupBy, group }`.
 * @param edges - The collapse's `edges`.
 * @param at - The collapse's pointer.
 * @param seen - The keys of the edges the collapses read so far list.
 * @returns Whether any edge was added.
 */
async function readGroupEdges(
    r: Reader,
    made: ReadonlyMap<string, NodeId>,
    edges: readonly unknown[],
    at: string,
    seen: Set<string>,
): Promise<boolean> {
    const { tx, session } = r.context;
    const keys: string[] = [];
    const records: JsonObject[] = [];
    for (const [n, entry] of edges.entries()) {
        const pointer = `${at}/edges/${String(n)}`;
        const ref = isObject(entry) ? edgeRefOf(entry.edge) : undefined;
        const dtypes = isObject(entry) && isObject(entry.dtypes) ? entry.dtypes : {};
        const columns = isObject(entry) && entry.columns !== undefined ? entry.columns : {};
        if (
            !isObject(entry) ||
            ref?.load !== READER ||
            !isObject(columns) ||
            Object.keys(columns).some((name) => typeof dtypes[name] !== "string") ||
            // Its key names no other reader edge, in the data or in any collapse.
            seen.has(ref.key) ||
            r.refs.edge(entry.edge) !== undefined
        ) {
            r.context.problems.push({ code: "E_BAD_DOCUMENT", params: { section: SECTION, pointer } });
            continue;
        }

        const source = groupEdgeEnd(r, made, entry, "from", pointer);
        const target = groupEdgeEnd(r, made, entry, "to", pointer);
        seen.add(ref.key);
        if (source !== undefined && target !== undefined) {
            keys.push(ref.key);
            records.push({ ...addedValues({ columns, dtypes }), source, target });
        }
    }

    if (records.length === 0) {
        return false;
    }

    const before = tx.data.edges({ scope: "graph" }).length;
    await tx.execute({
        op: "data.apply",
        mutation: { kind: "add-edges", records, source: "source", target: "target" },
    });
    tx.data
        .edges({ scope: "graph" })
        .slice(before)
        .forEach((edge, n) => {
            rememberReaderEdge(session, edge.id, keys[n]);
        });
    return true;
}

/**
 * Collapse the saved groups again, in order, once the runs they may group by are back, putting
 * each node standing in for one where it stood, with its pin, and adding again the edges added to
 * it (rule 8).
 * @param r - The reader.
 * @param groups - The member.
 */
async function readGroups(r: Reader, groups: readonly unknown[]): Promise<void> {
    const { tx } = r.context;
    const made = new Map<string, NodeId>();
    const seen = new Set<string>();
    let added = false;
    for (const [at, entry] of groups.entries()) {
        const { groupBy, group, position, pinned } = (isObject(entry) ? entry : {}) as Partial<SavedCollapse>;
        const pointer = `${r.section.pointer}/groups/${at}`;
        if (typeof groupBy !== "string" || !["string", "number", "boolean"].includes(typeof group)) {
            r.context.problems.push({ code: "E_BAD_DOCUMENT", params: { section: SECTION, pointer } });
            continue;
        }

        await attempt(r, `groups/${at}`, async () => {
            const node = await tx.groups.collapse({ groupBy, group: group as GroupValue });
            made.set(canonical({ groupBy, group }), node);
            if (isObject(position)) {
                await tx.positions.set([{ id: node, x: position.x, y: position.y, z: position.z }]);
            }

            if (pinned === true) {
                await tx.positions.pin([node]);
            }
        });

        const edges = isObject(entry) && Array.isArray(entry.edges) ? entry.edges : [];
        if (edges.length > 0) {
            added = (await readGroupEdges(r, made, edges, pointer, seen)) || added;
        }
    }

    // The edges added again are named only now: what reads after this binds them.
    if (added) {
        r.refs = elementRefsOf(r.context.session);
        r.mapper = readMapper(r.context, r.sets, r.refs);
    }
}

/**
 * Add the view layers on top of the stack, remembering their file ids.
 * @param r - The reader.
 * @param layers - The layers, bottom first.
 * @returns The session ids of the layers added.
 */
async function readLayers(r: Reader, layers: readonly unknown[]): Promise<string[]> {
    const { tx } = r.context;
    const added: string[] = [];
    for (const [n, entry] of layers.entries()) {
        if (!isObject(entry)) {
            continue;
        }

        const pointer = `${r.section.pointer}/layers/${n}`;
        const { id, source, ...rest } = entry;
        const spec = mapRefs(rest, r.mapper, pointer) as LayerSpec;
        const readSource =
            isObject(source) && source.by === "run" && typeof source.algorithm === "string"
                ? {
                      ...source,
                      params: mapParams(
                          tx,
                          source.algorithm,
                          isObject(source.params) ? source.params : {},
                          r.mapper,
                          `${pointer}/source/params`,
                      ).params,
                  }
                : source;
        await attempt(r, `layers/${n}`, async () => {
            const layer = await tx.styles.add({
                ...spec,
                ...(readSource === undefined ? {} : { source: readSource as never }),
            });
            if (typeof id === "string") {
                fileIdsOf(r.context.session).layers.set(layer.id, id);
            }

            added.push(layer.id);
            r.context.restored.add("styles");
        });
    }

    return added;
}

/**
 * Arrange the stack by `order` (spec 8.2 rule 9): the layers it names, in its order, bottom first;
 * every layer it does not name above them, in its relative place. With no style section in the
 * open, `order` arranges only the view's own layers, which stay above the rest.
 * @param r - The reader.
 * @param order - The order.
 * @param own - The session ids of the layers this section added.
 */
async function readOrder(r: Reader, order: readonly unknown[], own: readonly string[]): Promise<void> {
    const { tx, session } = r.context;
    const movable = tx.styles
        .list()
        .filter((layer) => !layer.locked && (r.context.other("style") !== undefined || own.includes(layer.id)))
        .map((layer) => layer.id);
    const byFileId = new Map(movable.map((id) => [fileLayerId(session, id), id]));
    const named = order.flatMap((id) => {
        const layer = typeof id === "string" ? byFileId.get(id) : undefined;
        return layer === undefined ? [] : [layer];
    });
    const wanted = [...named, ...movable.filter((id) => !named.includes(id))];
    if (canonical(wanted) === canonical(movable)) {
        return;
    }

    // Each goes just below the first layer above all of them, so element-owned layers stay on top.
    const stack = tx.styles.list().map((layer) => layer.id);
    const last = Math.max(...movable.map((id) => stack.indexOf(id)));
    const anchor = stack[last + 1] ?? null;
    await attempt(r, "order", async () => {
        for (const id of wanted) {
            await tx.styles.move(id, anchor);
        }
    });
}

/**
 * A member the session holds no state for, as it is written back: the camera without `type`,
 * which overlaps its controller, the authority (spec 4.7 rule 2).
 * @param name - The member.
 * @param value - Its value as read.
 * @returns The value to write back.
 */
function heldValue(name: string, value: unknown): unknown {
    if (name !== "camera" || !isObject(value)) {
        return value;
    }

    const { type: _type, ...camera } = value;
    return camera;
}

/**
 * Remember, for each member read, what the session now gives back, so an unchanged member is
 * written back as read.
 * @param r - The reader.
 * @param body - The body.
 */
function rememberRead(r: Reader, body: Readonly<JsonObject>): void {
    const { context, memory } = r;
    const fresh = freshBody(writerOf(context.session, r.refs, [], (id) => r.derived.has(id)));
    for (const name of MEMBERS) {
        if (body[name] === undefined) {
            continue;
        }

        const original = heldValue(name, body[name]);
        if (HELD_ONLY.has(name)) {
            memory.heldOnly.set(name, original);
        }

        const now = name === "runs" ? withNotRun(fresh.runs, memory) : fresh[name];
        memory.kept.set(name, { applied: canonical(now), original });
    }
}

/**
 * Apply a view section.
 * @param section - The section.
 * @param context - The open.
 */
async function readView(section: ReadSection, context: ReadContext): Promise<void> {
    const memory = resetMemory(context.session);
    const sets = new Map<string, string>();
    const refs = context.refs();
    const r: Reader = {
        section,
        context,
        memory,
        sets,
        refs,
        mapper: readMapper(context, sets, refs),
        derived: new Set(),
    };
    const { body } = section;
    const savedSets = (Array.isArray(body.sets) ? body.sets : []).flatMap((set: unknown, at) =>
        isObject(set) ? [[set, at] as const] : [],
    );
    const waiting = createSets(r, savedSets);
    await readPinned(r, body);
    if (isObject(body.visibility)) {
        await readVisibility(r, body.visibility);
    }

    await readCameraAndSettings(r, body);
    if (isObject(body.layout)) {
        await readLayout(r, body.layout);
    }

    for (const [at, record] of (Array.isArray(body.runs) ? body.runs : []).entries()) {
        await readRun(r, record, at);
    }

    // A set naming an edge added to a collapse waits for the collapse to be made again.
    const late = createSets(r, waiting);
    if (Array.isArray(body.groups)) {
        await readGroups(r, body.groups);
    }

    for (const [set, at] of late) {
        await attempt(r, `sets/${at}`, () => {
            createSet(r, set, at);
            return Promise.resolve();
        });
    }

    await readSelection(r, body);

    const own = Array.isArray(body.layers) ? await readLayers(r, body.layers) : [];
    if (Array.isArray(body.order)) {
        await readOrder(r, body.order, own);
    }

    rememberRead(r, body);
}

/** The `graphty-view` section, version 1. */
export const viewCodec: SectionCodec = {
    section: "view",
    version: 1,
    reads: [1],
    bound: true,
    members: [...MEMBERS],
    write(context: WriteContext) {
        const memory = memoryOf(context.session);
        const fresh = freshBody(
            writerOf(context.session, context.refs(), context.problems, (id) => context.isDerived(id)),
        );
        return Promise.resolve({ body: keptBody(fresh, memory) });
    },
    read: readView,
};
