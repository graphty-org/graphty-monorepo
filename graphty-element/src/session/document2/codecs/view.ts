/**
 * @file The `view` section codec, version 1: the camera, saved views, selection, placed positions, sets and layers that name elements, visibility and runs a recipe cannot hold (spec 4.7).
 * Experimental (`save-files-v2`).
 *
 * What the session holds no state for (the live camera, `xr`, `timeline.at`) and what does not bind
 * (references to elements the data lacks, runs neither rerun nor restored) is kept from the open
 * and written back on the next save, as spec 4.7 rule 2 and 6.3 require. A member the session gives
 * back unchanged is written exactly as it was read.
 */

import type { CameraState } from "../../../camera/types";
import type {
    AlgorithmKey,
    FilterCondition,
    LayerSpec,
    RuleTree,
    ScopeInput,
    SetDefinitionInput,
} from "../../../catalog/types";
import { isGraphtyError } from "../../../errors/GraphtyError";
import type { Run, RunStyle } from "../../runs/types";
import type { ElementSet } from "../../sets/types";
import type { LayerPosition } from "../../styles/Layer";
import type { GraphSession, TransactionScope } from "../../types";
import type { TimeWindow } from "../../visibility/filter";
import type { SessionVisibilityApi } from "../../visibility/VisibilityApi";
import type {
    DocumentProblem,
    ElementRefs,
    JsonObject,
    ReadContext,
    ReadSection,
    SectionCodec,
    WriteContext,
} from "../types";
import { layerNamesElements } from "./elementNaming";
import { SESSION_NAMESPACE } from "./results";
import {
    cameraJson,
    cameraOf,
    canonical,
    isObject,
    mapRefs,
    memoryOf,
    type RefMapper,
    resetMemory,
    ruleNamesElements,
    runKeyOf,
    sessionRunId,
    type ViewMemory,
    writeMapper,
} from "./viewParts";

/** The section name, as every report names it. */
const SECTION = "view";

/** The body members, in the order they are written. */
const MEMBERS = [
    "camera",
    "xr",
    "views",
    "selection",
    "placed",
    "sets",
    "visibility",
    "timeline",
    "viewRotation",
    "framing",
    "hiddenColumns",
    "layers",
    "runs",
] as const;

/** The members the session holds no state for: kept from the open and written back. */
const HELD_ONLY = new Set<string>(["camera", "xr", "timeline"]);

/** The option types whose values name nodes. */
const NODE_OPTION_TYPES = new Set(["node-id", "node-set"]);

/** What writing the body reads. */
interface Writer {
    readonly session: GraphSession;
    readonly refs: ElementRefs;
    readonly memory: ViewMemory;
    readonly mapper: RefMapper;
    /** Whether the element minted a run's id. */
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
 * A run's params with the node-naming options mapped, for writing or reading.
 * @param session - The session.
 * @param algorithm - The algorithm.
 * @param params - The params.
 * @param mapper - How a node is mapped.
 * @param pointer - Where the params are.
 * @returns The mapped params, or undefined when a node did not map.
 */
function mapParams(
    session: TransactionScope,
    algorithm: AlgorithmKey,
    params: Readonly<Record<string, unknown>>,
    mapper: RefMapper,
    pointer: string,
): JsonObject | undefined {
    const options = nodeOptions(session, algorithm);
    const out: JsonObject = {};
    for (const [name, value] of Object.entries(params)) {
        const at = `${pointer}/${name}`;
        const type = options.get(name);
        if (type === "node-set" && Array.isArray(value)) {
            const mapped = value.map((node, n) => mapper.node(node, `${at}/${n}`));
            if (mapped.includes(undefined)) {
                return undefined;
            }

            out[name] = mapped;
        } else if (type === "node-id" && value !== undefined && value !== null) {
            const mapped = mapper.node(value, at);
            if (mapped === undefined) {
                return undefined;
            }

            out[name] = mapped;
        } else {
            out[name] = value;
        }
    }

    return out;
}

/**
 * Whether a run's params name a node.
 * @param session - The session.
 * @param run - The run.
 * @returns True when they do.
 */
function paramsNameNodes(session: TransactionScope, run: Run): boolean {
    const options = nodeOptions(session, run.algorithm);
    return Object.entries(run.params).some(
        ([name, value]) => options.has(name) && value !== undefined && value !== null,
    );
}

/**
 * Whether anything narrows the visible graph: a filter, a keep or exclude condition, a time
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
 * Whether a run is one a recipe cannot hold (recipe.md rules 2 and 3): an option naming a node, a
 * run over the selection, listed nodes or a picked or path set, or over the visible graph while
 * something narrows it.
 * @param session - The session.
 * @param run - The run.
 * @param namesSet - Whether a kept set names elements.
 * @returns True when it belongs in view.
 */
function recipeCannotHold(session: TransactionScope, run: Run, namesSet: (id: string) => boolean): boolean {
    const { spec } = run.record.scope;
    if (paramsNameNodes(session, run) || spec === "selection") {
        return true;
    }

    if (spec === "visible") {
        return visibleNarrowed(session);
    }

    if (typeof spec === "string") {
        return false;
    }

    return "nodes" in spec || "define" in spec || ("set" in spec && namesSet(spec.set));
}

/**
 * The live filter with the keep and exclude conditions that are on folded in, and the select
 * conditions that are on.
 * @param session - The session.
 * @returns The filter, or null, and the select rules.
 */
function liveFilter(session: TransactionScope): { readonly filter: RuleTree | null; readonly select: RuleTree[] } {
    const { visibility } = session;
    const on = visibility.conditions.filter((condition) => condition.on);
    const parts: RuleTree[] = [
        ...(visibility.filter === null ? [] : [visibility.filter]),
        ...on.flatMap((condition): RuleTree[] => {
            if (condition.effect === "keep") {
                return [condition.rule];
            }

            return condition.effect === "exclude" ? [{ kind: "not", of: condition.rule }] : [];
        }),
    ];
    let filter: RuleTree | null = null;
    if (parts.length === 1) {
        [filter] = parts;
    } else if (parts.length > 1) {
        filter = { kind: "all", of: parts };
    }

    return {
        filter,
        select: on.filter((condition) => condition.effect === "select").map((condition) => condition.rule),
    };
}

/**
 * A time window as a view section writes it: `raw: true` for one whose bounds are values, not
 * instants (one set with the timeline off), as version 1's `windowRaw`.
 * @param session - The session.
 * @param window - The window.
 * @returns Its members.
 */
function windowJson(session: GraphSession, window: TimeWindow): JsonObject {
    const { attribute, end, spells, from, to, step, nodes } = window;
    const raw = (session.visibility as SessionVisibilityApi).holdsInstants(window) ? undefined : true;
    return Object.fromEntries(
        Object.entries({ attribute, end, spells, from, to, step, nodes, raw }).filter(
            ([, value]) => value !== undefined,
        ),
    );
}

/**
 * The scope a view run record writes.
 * @param w - The writer.
 * @param run - The run.
 * @returns The scope string or object.
 */
function scopeJson(w: Writer, run: Run): unknown {
    const { spec } = run.record.scope;
    const resolved = (): JsonObject => ({ nodes: mapRefs([...run.scope.nodes], w.mapper, "") });
    if (spec === "selection") {
        return resolved();
    }

    if (spec === "visible" && visibleNarrowed(w.session)) {
        const { visibility } = w.session;
        const { filter } = liveFilter(w.session);
        const { hidden } = mapRefs({ hidden: [...w.session.hidden.ids] }, w.mapper, "") as { hidden: unknown[] };
        return {
            ...(visibility.window === null ? {} : { window: windowJson(w.session, visibility.window) }),
            ...(filter === null ? {} : { filter: mapRefs(filter, w.mapper, "") }),
            ...(hidden.length === 0 ? {} : { hidden }),
        };
    }

    if (typeof spec === "string") {
        return spec;
    }

    return "nodes" in spec || "set" in spec ? mapRefs(spec, w.mapper, "") : resolved();
}

/**
 * The `runs` member: the runs a recipe cannot hold, keyed by run id.
 * @param w - The writer.
 * @param namesSet - Whether a kept set names elements.
 * @returns The runs.
 */
function runsJson(w: Writer, namesSet: (id: string) => boolean): JsonObject {
    const out: JsonObject = {};
    for (const run of w.session.runs.list()) {
        if (run.status !== "succeeded" || !recipeCannotHold(w.session, run, namesSet)) {
            continue;
        }

        const { namespace, as } = runKeyOf(run.id, w.isDerived(run.id));
        const { name, seed } = run.record;
        const params = mapParams(w.session, run.algorithm, run.params, w.mapper, "") ?? {};
        // `false` when any layer reads the run, saved in this file or not (spec 4.3 rule 3), as the
        // recipe writes it: what the run is written as never depends on the sections chosen.
        const { runs } = w.session;
        const painted =
            runs.bindings(run.id).length === 0 &&
            !runs.readers(run.id).some((reader) => reader.kind === "layer") &&
            runs.painting(run.id)?.state !== "opted-out";
        const scope = scopeJson(w, run);
        out[`${namespace}__${as}`] = {
            namespace,
            as,
            ...(name === null ? {} : { name }),
            algorithm: run.algorithm,
            ...(Object.keys(params).length === 0 ? {} : { params }),
            ...(Number.isInteger(seed) && (seed ?? -1) >= 0 ? { seed } : {}),
            style: painted,
            scope: (scope as Record<string, unknown> | string) ?? "graph",
        };
    }

    return out;
}

/**
 * Whether a kept set names elements, so it goes in view: fixed and path sets always, a rule set
 * when its rule names an element.
 * @param sets - The kept sets.
 * @returns The test, by set id.
 */
function setNamer(sets: readonly ElementSet[]): (id: string) => boolean {
    const byId = new Map(sets.map((set) => [set.id, set]));
    const visiting = new Set<string>();
    const namesSet = (id: string): boolean => {
        const set = byId.get(id);
        if (set === undefined || visiting.has(id)) {
            return false;
        }

        if (set.definition.kind !== "rule") {
            return true;
        }

        visiting.add(id);
        const names = ruleNamesElements(set.definition.where, namesSet);
        visiting.delete(id);
        return names;
    };
    return namesSet;
}

/**
 * The `layers` member: every layer that names elements, each with `after`.
 * @param w - The writer.
 * @returns The layers, bottom first.
 */
function layersJson(w: Writer): JsonObject[] {
    const list = w.session.styles.list();
    const out: JsonObject[] = [];
    list.forEach((layer, at) => {
        if (layer.source.by === "element" || !layerNamesElements(layer, w.session)) {
            return;
        }

        const below = at === 0 ? undefined : list[at - 1];
        const after =
            below === undefined || below.source.by === "element"
                ? "bottom"
                : (w.memory.layerFileIds.get(below.id) ?? below.id);
        const { source } = layer;
        out.push({
            id: w.memory.layerFileIds.get(layer.id) ?? layer.id,
            name: layer.name,
            after,
            target: layer.target,
            kind: layer.kind,
            selector: mapRefs(layer.selector, w.mapper, ""),
            ...(layer.set === undefined ? {} : { set: layer.set }),
            ...(layer.encode === undefined ? {} : { encode: mapRefs(layer.encode, w.mapper, "") }),
            source:
                source.by === "run"
                    ? {
                          by: "run",
                          runId: w.mapper.run(source.runId),
                          algorithm: source.algorithm,
                          params: mapParams(w.session, source.algorithm, source.params, w.mapper, "") ?? {},
                      }
                    : source,
            ...(layer.enabled ? {} : { enabled: false }),
            ...(layer.userData === undefined ? {} : { userData: layer.userData }),
        });
    });
    return out;
}

/**
 * The `visibility` member, or undefined when nothing is filtered, windowed, selected by a
 * condition or hidden.
 * @param w - The writer.
 * @returns The member.
 */
function visibilityJson(w: Writer): JsonObject | undefined {
    const { visibility } = w.session;
    const { filter, select } = liveFilter(w.session);
    const hidden = mapRefs({ hidden: [...w.session.hidden.ids] }, w.mapper, "") as { hidden: unknown[] };
    if (
        filter === null &&
        visibility.window === null &&
        !visibility.showContext &&
        select.length === 0 &&
        hidden.hidden.length === 0
    ) {
        return undefined;
    }

    return {
        filter: filter === null ? null : mapRefs(filter, w.mapper, ""),
        ...(visibility.window === null ? {} : { window: windowJson(w.session, visibility.window) }),
        showContext: visibility.showContext,
        ...(select.length === 0 ? {} : { select: mapRefs(select, w.mapper, "") }),
        ...(hidden.hidden.length === 0 ? {} : hidden),
    };
}

/**
 * The `placed` member: the pinned nodes and where they stand.
 * @param w - The writer.
 * @returns The entries.
 */
function placedJson(w: Writer): JsonObject[] {
    return [...w.session.positions.pinned].flatMap((id) => {
        const node = w.refs.nodeRef(id);
        const at = w.session.positions.get(id);
        return node === undefined || at === undefined ? [] : [{ node, position: [at.x, at.y, at.z], pinned: true }];
    });
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
    const sets = session.sets.list();
    const namesSet = setNamer(sets);
    const layers = layersJson(w);
    const selection = mapRefs({ nodes: [...session.selection.nodes], edges: [...session.selection.edges] }, mapper, "");
    const { viewRotation, framing } = session.config;
    return compact({
        views: [...session.views].flatMap(([name, state]) => {
            const camera = cameraJson(state);
            return camera === undefined ? [] : [{ name, camera }];
        }),
        selection: compact(selection as JsonObject),
        placed: placedJson(w),
        sets: sets
            .filter((set) => namesSet(set.id))
            .map((set) => ({
                id: mapper.set(set.id),
                name: set.name,
                ...(mapRefs(set.definition, mapper, "") as JsonObject),
            })),
        visibility: visibilityJson(w),
        viewRotation,
        framing,
        hiddenColumns: session.data.hiddenColumns().map(({ kind, name }) => ({ kind, name })),
        layers,
        runs: runsJson(w, namesSet),
    });
}

/**
 * The runs member with the runs an open could not start put back.
 * @param runs - The runs the session holds.
 * @param memory - The view memory.
 * @returns The runs to write.
 */
function withNotRun(runs: unknown, memory: ViewMemory): JsonObject | undefined {
    const merged: JsonObject = { ...(isObject(runs) ? runs : {}) };
    for (const [id, record] of memory.notRun) {
        merged[id] ??= record;
    }

    return Object.keys(merged).length === 0 ? undefined : merged;
}

/**
 * The body to write: the fresh body, with each member the session gave back unchanged written as
 * the open read it, and the members the session holds no state for written back as read.
 * @param fresh - The fresh body.
 * @param memory - The view memory.
 * @returns The body, in member order.
 */
function keptBody(fresh: JsonObject, memory: ViewMemory): JsonObject {
    const out: JsonObject = {};
    for (const name of MEMBERS) {
        const now = name === "runs" ? withNotRun(fresh.runs, memory) : fresh[name];
        const kept = memory.kept.get(name);
        const unchanged = kept?.applied === canonical(now);
        let value = unchanged ? kept.original : now;
        if (HELD_ONLY.has(name)) {
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
 * @param isDerived - Whether the element minted a run's id; default every run (an open, which
 *     cannot tell).
 * @returns The writer.
 */
function writerOf(session: GraphSession, refs: ElementRefs, isDerived: (id: string) => boolean = () => true): Writer {
    const memory = memoryOf(session);
    return { session, refs, memory, mapper: writeMapper(session, refs, memory, isDerived), isDerived };
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
    readonly mapper: RefMapper;
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
 * @returns The mapper.
 */
function readMapper(context: ReadContext, sets: ReadonlyMap<string, string>): RefMapper {
    const refs = context.refs();
    const unbound = (ref: unknown, pointer: string): void => {
        const problem: DocumentProblem = {
            code: "W_REFERENCE_UNBOUND",
            params: { section: SECTION, pointer, ref: canonical(ref) },
        };
        context.problems.push(problem);
    };
    return {
        node: (value, pointer) => {
            const id = refs.node(value);
            if (id === undefined) {
                unbound(value, pointer);
            }

            return id;
        },
        edge: (value, pointer) => {
            const id = refs.edge(value);
            if (id === undefined) {
                unbound(value, pointer);
            }

            return id;
        },
        set: (id) => sets.get(id) ?? id,
        run: (id) => sessionRunId(id),
    };
}

/**
 * Create one saved set.
 * @param r - The reader.
 * @param set - The set as the file holds it.
 * @param at - Its index in `sets`.
 */
function createSet(r: Reader, set: JsonObject, at: number): void {
    const { id, name, ...definition } = set;
    const input = mapRefs(definition, r.mapper, `${r.section.pointer}/sets/${at}`) as SetDefinitionInput;
    const created = r.context.tx.sets.create(input, typeof name === "string" ? { name } : {});
    if (typeof id === "string") {
        r.sets.set(id, created);
        r.memory.setFileIds.set(created, id);
    }

    r.context.restored.add("sets");
}

/**
 * Create the saved sets; a set that cannot be made yet (it reads a run or a later set) waits.
 * @param r - The reader.
 * @param sets - The sets, with their index.
 * @returns The ones that wait.
 */
function createSets(r: Reader, sets: readonly (readonly [JsonObject, number])[]): (readonly [JsonObject, number])[] {
    return sets.filter(([set, at]) => {
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
 * Apply the selection, the placed nodes and the hidden nodes.
 * @param r - The reader.
 * @param body - The body.
 */
async function readElements(r: Reader, body: Readonly<JsonObject>): Promise<void> {
    const { tx } = r.context;
    const at = r.section.pointer;
    if (isObject(body.selection)) {
        const selection = mapRefs(body.selection, r.mapper, `${at}/selection`) as { nodes?: never[]; edges?: never[] };
        await attempt(r, "selection", () =>
            tx.selection.apply({ nodes: selection.nodes ?? [], edges: selection.edges ?? [] }),
        );
    }

    if (Array.isArray(body.placed)) {
        const entries = body.placed.flatMap((entry: unknown, n) => {
            const id = isObject(entry) ? r.mapper.node(entry.node, `${at}/placed/${n}/node`) : undefined;
            const p = isObject(entry) ? entry.position : undefined;
            return id === undefined || !Array.isArray(p)
                ? []
                : [
                      {
                          id: id as never,
                          x: Number(p[0]),
                          y: Number(p[1]),
                          z: Number(p[2]),
                          pinned: isObject(entry) && entry.pinned === true,
                      },
                  ];
        });
        await attempt(r, "placed", async () => {
            await tx.positions.set(entries.map(({ id, x, y, z }) => ({ id, x, y, z })));
            await tx.positions.pin(entries.filter((entry) => entry.pinned).map((entry) => entry.id));
            r.context.restored.add("pins");
        });
    }
}

/**
 * Apply the visibility member.
 * @param r - The reader.
 * @param visibility - The member.
 */
async function readVisibility(r: Reader, visibility: JsonObject): Promise<void> {
    const { tx } = r.context;
    const at = `${r.section.pointer}/visibility`;
    const read = mapRefs(visibility, r.mapper, at) as JsonObject;
    await attempt(r, "visibility", async () => {
        if ("filter" in read) {
            await tx.visibility.set((isObject(read.filter) ? read.filter : null) as RuleTree | null);
        }

        if (isObject(read.window)) {
            const { raw, ...window } = read.window;
            await (tx.visibility as SessionVisibilityApi).restoreWindow(window as unknown as TimeWindow, raw === true);
        }

        if (Array.isArray(read.select)) {
            const kept = tx.visibility.conditions.filter((condition) => condition.effect !== "select");
            const select = read.select.map((rule, n): FilterCondition => ({
                id: `view-select-${n}`,
                on: true,
                effect: "select",
                rule: rule as RuleTree,
            }));
            await (tx.visibility as SessionVisibilityApi).restoreConditions([...kept, ...select]);
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
 * A run record's `style` as the runs API takes it; an unknown part is dropped and reported.
 * @param r - The reader.
 * @param style - The style.
 * @param pointer - Where it is.
 * @returns The style.
 */
function styleIn(r: Reader, style: unknown, pointer: string): RunStyle {
    if (typeof style === "boolean") {
        return style;
    }

    if (!isObject(style)) {
        return false;
    }

    const known = new Set(["size", "name", "groups"]);
    for (const part of Object.keys(style).filter((key) => !known.has(key))) {
        r.context.problems.push({
            code: "W_UNKNOWN_MEMBER",
            params: { section: SECTION, pointer: `${pointer}/${part}` },
        });
    }

    return Object.fromEntries(Object.entries(style).filter(([key]) => known.has(key)));
}

/**
 * A run record's scope as the runs API takes it, or "window" for one recorded under a time window,
 * which cannot be replayed in a window.
 * @param r - The reader.
 * @param scope - The scope.
 * @param pointer - Where it is.
 * @returns The scope.
 */
function scopeIn(r: Reader, scope: unknown, pointer: string): ScopeInput | "window" {
    if (typeof scope === "string") {
        return scope as ScopeInput;
    }

    if (!isObject(scope)) {
        return "graph";
    }

    if (scope.window !== undefined) {
        return "window";
    }

    const read = mapRefs(scope, r.mapper, pointer) as JsonObject;
    if (Array.isArray(read.nodes)) {
        return { nodes: read.nodes as never[] };
    }

    // The filter and the hidden nodes were applied with the visibility, so the visible graph is what the run saw.
    return typeof read.set === "string" ? { set: read.set } : "visible";
}

/**
 * Restart one view run, or report it not run and keep it.
 * @param r - The reader.
 * @param fileId - The run's id in the file.
 * @param record - The run record.
 */
async function readRun(r: Reader, fileId: string, record: unknown): Promise<void> {
    const { context } = r;
    const pointer = `${r.section.pointer}/runs/${fileId}`;
    const id = sessionRunId(fileId);
    const notRun = (): void => {
        context.problems.push({ code: "W_RUN_NOT_RUN", params: { run: fileId } });
        r.memory.notRun.set(fileId, record);
    };
    if (!isObject(record) || typeof record.algorithm !== "string") {
        notRun();
        return;
    }

    const params = mapParams(
        context.tx,
        record.algorithm,
        isObject(record.params) ? record.params : {},
        r.mapper,
        `${pointer}/params`,
    );
    const scope = scopeIn(r, record.scope, `${pointer}/scope`);
    const saved = context.canned.has(id);
    if (params === undefined || ((!context.rerun || scope === "window") && !saved)) {
        notRun();
        return;
    }

    try {
        await context.tx.runs.start(record.algorithm, params, {
            as: id,
            style: styleIn(r, record.style, `${pointer}/style`),
            scope: scope === "window" ? "visible" : scope,
            ...(typeof record.seed === "number" ? { seed: record.seed } : {}),
        });
        if (typeof record.name === "string") {
            await context.tx.runs.rename(id, record.name);
        }

        if (fileId.startsWith(`${SESSION_NAMESPACE}__`)) {
            // A run the element minted is marked so again, once it exists.
            context.restoreDerived(id);
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
 * Where a view layer goes: above the layer its `after` names, at the bottom of the reader's layers
 * for `"bottom"`, and on top for an `after` naming no layer.
 * @param r - The reader.
 * @param after - The layer's `after`.
 * @param layers - File layer id to session layer id, for the layers this open added.
 * @returns The position, or undefined for the top.
 */
function positionOf(r: Reader, after: unknown, layers: ReadonlyMap<string, string>): LayerPosition | undefined {
    const { styles } = r.context.tx;
    if (after === "bottom") {
        const first = styles.list().find((layer) => layer.source.by !== "element");
        return first === undefined ? undefined : { below: first.id };
    }

    if (typeof after !== "string") {
        return undefined;
    }

    const id = layers.get(after) ?? after;
    return styles.get(id) === undefined ? undefined : { above: id };
}

/**
 * Add the view layers at their `after` places.
 * @param r - The reader.
 * @param layers - The layers, bottom first.
 */
async function readLayers(r: Reader, layers: readonly unknown[]): Promise<void> {
    const { tx } = r.context;
    const added = new Map<string, string>();
    for (const [n, entry] of layers.entries()) {
        if (!isObject(entry)) {
            continue;
        }

        const pointer = `${r.section.pointer}/layers/${n}`;
        const { id, after, source, ...rest } = entry;
        const spec = mapRefs(rest, r.mapper, pointer) as LayerSpec;
        const readSource =
            isObject(source) && source.by === "run" && typeof source.algorithm === "string"
                ? {
                      ...source,
                      runId: sessionRunId(String(source.runId)),
                      params:
                          mapParams(
                              tx,
                              source.algorithm,
                              isObject(source.params) ? source.params : {},
                              r.mapper,
                              `${pointer}/source/params`,
                          ) ?? {},
                  }
                : source;
        await attempt(r, `layers/${n}`, async () => {
            const layer = await tx.styles.add(
                { ...spec, ...(readSource === undefined ? {} : { source: readSource as never }) },
                positionOf(r, after, added),
            );
            if (typeof id === "string") {
                added.set(id, layer.id);
                r.memory.layerFileIds.set(layer.id, id);
            }

            r.context.restored.add("styles");
        });
    }
}

/**
 * Remember, for each member read, what the session now gives back, so an unchanged member is
 * written back as read.
 * @param r - The reader.
 * @param body - The body.
 */
function rememberRead(r: Reader, body: Readonly<JsonObject>): void {
    const { context, memory } = r;
    const fresh = freshBody(writerOf(context.session, context.refs()));
    for (const name of MEMBERS) {
        if (body[name] === undefined) {
            continue;
        }

        if (HELD_ONLY.has(name)) {
            memory.heldOnly.set(name, body[name]);
        } else {
            const now = name === "runs" ? withNotRun(fresh.runs, memory) : fresh[name];
            memory.kept.set(name, { applied: canonical(now), original: body[name] });
        }
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
    const r: Reader = { section, context, memory, sets, mapper: readMapper(context, sets) };
    const { body } = section;
    const savedSets = (Array.isArray(body.sets) ? body.sets : []).flatMap((set: unknown, at) =>
        isObject(set) ? [[set, at] as const] : [],
    );
    const waiting = createSets(r, savedSets);
    await readElements(r, body);
    if (isObject(body.visibility)) {
        await readVisibility(r, body.visibility);
    }

    await readCameraAndSettings(r, body);
    for (const [id, record] of Object.entries(isObject(body.runs) ? body.runs : {})) {
        await readRun(r, id, record);
    }

    for (const [set, at] of waiting) {
        await attempt(r, `sets/${at}`, () => {
            createSet(r, set, at);
            return Promise.resolve();
        });
    }

    if (Array.isArray(body.layers)) {
        await readLayers(r, body.layers);
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
        const fresh = freshBody(writerOf(context.session, context.refs(), (id) => context.isDerived(id)));
        return Promise.resolve({ body: keptBody(fresh, memory) });
    },
    read: readView,
};
