/**
 * @file The synchronous doors of `session.sets`: the reads that only look at records and the
 * writes that resolve nothing (design/sets/sets-design.md sections 13.2, 13.3, 15.2).
 *
 * Each write door does the one thing a pure `prepare` cannot: it reaches the graph to turn a
 * session edge id into the edge's stable identity, and it mints the id and the order. Then, in one
 * store write group, it prepares one operation and writes the result. A no-op writes nothing and
 * emits nothing.
 *
 * Built by the session and published on it as `session.sets`.
 */

import { type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";

import { EDGE_READINGS, inducedEdgeLeaf, parseScope, speaksEdges } from "../../catalog/sets/parse";
import type {
    EdgeId,
    EdgeMember,
    EdgeReading,
    EdgeRef,
    NodeId,
    PathKind,
    RunId,
    Scope,
    ScopeInput,
    SetCombine,
    SetCreatedFrom,
    SetDefinitionInput,
    SetId,
} from "../../catalog/types";
import { edgeCounterOf, stableEdgeMember } from "../../data/edgeIdentity";
import { readEndpoint } from "../../data/endpoints";
import { GraphtyError } from "../../errors/GraphtyError";
import type { SessionAttributes } from "../types";
import { type Concrete, isOffer, type Materialiser, SET_COMBINES } from "./algebra";
import {
    type ChainStep,
    dependenciesOf,
    type DependencySources,
    followedGroup,
    followsGroup,
    referentReading,
    selectionChain,
    setCycle,
} from "./dependencies";
import type { Offering } from "./offers";
import { pathKind } from "./path";
import {
    defaultName,
    holdsEdgeMember,
    MAX_EDGE_MEMBER_EDIT,
    prepareCreate,
    prepareMembers,
    prepareRedefine,
    prepareRemove,
    prepareRename,
} from "./prepare";
import { edgeMemberKey } from "./resolve";
import { statusOf,type StatusRun, type StatusSources } from "./status";
import { SetsStore } from "./store";
import type { ElementSet, Memberships, SetMemberDelta, SetOffer, SetsApi, SetStatus, SetUser } from "./types";

/** What the doors read from the rest of the session. */
interface SetsDependencies {
    /**
     * A session edge's stable identity.
     * @param id - The session edge id.
     * @returns The member, or undefined when the graph holds no such edge.
     */
    edgeMember(id: EdgeId): EdgeMember | undefined;
    /** The most edge members one member edit may touch. */
    readonly maxEdgeMembers?: number;
    /**
     * Where the references a rule makes are looked up (kept sets, saved scopes, the visibility
     * filter), so a write that would make a cycle is refused. Absent: the kept sets alone.
     */
    readonly dependencies?: DependencySources;
    /** The runs, for status and "Used by". Absent: no run exists. */
    readonly runs?: {
        get(id: RunId): StatusRun | undefined;
        list(): readonly StatusRun[];
    };
    /** What the last pass over a kept set found. Absent: status reads no pass. */
    readonly outcome?: StatusSources["outcome"];
    /**
     * The resolve step of `createFrom`, `combine` and `createPath`. Absent: those doors refuse
     * with `E_UNSUPPORTED`.
     */
    readonly materialise?: Materialiser;
    /** Offers and Memberships. Absent: `offers` and `containing` refuse with `E_UNSUPPORTED`. */
    readonly offering?: Pick<Offering, "offers" | "memberships">;
    /**
     * The token of a run's current execution, which an offer must still hold. Absent: the
     * `runs` dependency's, else no execution is current and every offer is stale.
     * @param run - The run.
     * @returns The token, or undefined when the run has no result.
     */
    readonly executionOf?: (run: RunId) => string | undefined;
    /**
     * The live users of sets beyond kept sets and runs (style layers today), each with the scope it
     * names, for `usedBy`. Absent: none.
     * @returns The users.
     */
    readonly users?: () => Iterable<{ readonly user: SetUser; readonly scope: Scope }>;
}

/**
 * A session edge's stable identity, read from the current snapshot: its file id at the configured
 * `edgeIdPath` when there is one, else its ordinal among its pair's edges in its load, else the id
 * minted from its counter.
 * @param snapshot - The current snapshot.
 * @param id - The session edge id.
 * @param attributes - The edge's attribute bag by row, where the file id is read.
 * @param edgeIdPath - The configured file-id path, or null.
 * @returns The member, or undefined when the snapshot holds no such edge.
 */
export function sessionEdgeMember(
    snapshot: GraphSnapshot,
    id: EdgeId,
    attributes: (row: number) => SessionAttributes | undefined,
    edgeIdPath: string | null,
): EdgeMember | undefined {
    const counter = edgeCounterOf(id);
    const row = counter === INVALID_INDEX ? INVALID_INDEX : snapshot.edgeIndexOf(counter);
    if (row === INVALID_INDEX) {
        return undefined;
    }

    const bag = edgeIdPath === null ? undefined : attributes(row);
    const fileId = bag === undefined || edgeIdPath === null ? undefined : readEndpoint(bag, edgeIdPath);
    const usable = typeof fileId === "string" || (typeof fileId === "number" && Number.isFinite(fileId));

    return stableEdgeMember(snapshot, row, usable ? fileId : undefined);
}

const storesOf = new WeakMap<SetsApi, SetsStore>();

/** `set.create` with what the set was created from, for the element's own doors. */
type CreateAs = (
    definition: SetDefinitionInput,
    name: string | undefined,
    createdFrom: SetCreatedFrom,
    prebuilt?: readonly (readonly [EdgeId, EdgeMember])[],
) => SetId;

const creatorsOf = new WeakMap<SetsApi, CreateAs>();

/**
 * Keep a definition, recording what it was created from: the door the element's own verbs (a
 * promoted selection) dispatch through, since the published `create` always records `user`.
 * Internal.
 * @param api - Doors {@link createSetsApi} built.
 * @param definition - The definition.
 * @param name - The name; "Set N" when absent.
 * @param createdFrom - What the set was created from.
 * @returns The minted id.
 * @throws An Error for doors it did not build; otherwise as `create` refuses.
 */
export function createSetAs(api: SetsApi, definition: SetDefinitionInput, name: string | undefined, createdFrom: SetCreatedFrom): SetId {
    const create = creatorsOf.get(api);
    if (create === undefined) {
        throw new Error("Not a SetsApi built by createSetsApi.");
    }

    return create(definition, name, createdFrom);
}

/**
 * The store behind a set of doors, for the internal readers that resolve kept sets. Internal.
 * @param api - Doors {@link createSetsApi} built.
 * @returns The store.
 * @throws An Error for doors it did not build.
 */
export function setsStoreOf(api: SetsApi): SetsStore {
    const store = storesOf.get(api);
    if (store === undefined) {
        throw new Error("Not a SetsApi built by createSetsApi.");
    }

    return store;
}

/**
 * Build the synchronous doors over a store.
 * @param dependencies - Where session edge ids are looked up.
 * @param store - The slice; a fresh one when absent.
 * @returns The doors.
 */
export function createSetsApi(dependencies: SetsDependencies, store: SetsStore = new SetsStore()): SetsApi {
    const limit = dependencies.maxEdgeMembers ?? MAX_EDGE_MEMBER_EDIT;
    /** The session edges the write in progress named, with the members they became, in order. */
    let named: [EdgeId, EdgeMember][] = [];

    /**
     * An edge reference in stable form.
     * @param ref - A session edge id or a member.
     * @returns The member.
     * @throws `E_BAD_COMMAND` for a session edge id the graph does not hold.
     */
    const stable = (ref: EdgeRef): EdgeMember => {
        if (typeof ref !== "string") {
            return ref;
        }

        const member = dependencies.edgeMember(ref);
        if (member === undefined) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `The graph holds no edge "${ref}". An edge member needs its stable identity, which only a held edge has.`,
                source: "data",
                details: { edge: ref },
            });
        }

        named.push([ref, member]);

        return member;
    };

    /**
     * Run a conversion to stable form and collect the session edges it named.
     * @param convert - The conversion.
     * @returns What it returned, and the session edges with the members they became, in order.
     */
    const collect = <T>(convert: () => T): [T, [EdgeId, EdgeMember][]] => {
        named = [];
        try {
            return [convert(), named];
        } finally {
            named = [];
        }
    };

    /**
     * Seed the members a committed write brought into a set through session edge ids: each binds
     * the edge it was named by while the graph holds that edge (design 4.2). A member the set
     * already held keeps its seed, so a no-op or a repeat changes no binding; the first session
     * edge naming a member wins.
     * @param id - The set written.
     * @param prior - Its record before the write.
     * @param refs - The session edges the write named, with their members.
     */
    const seed = (id: SetId, prior: ElementSet | undefined, refs: readonly (readonly [EdgeId, EdgeMember])[]): void => {
        const next = store.get(id);
        if (next === undefined || next === prior || refs.length === 0) {
            return;
        }

        const entries = new Map<string, number>();
        for (const [ref, member] of refs) {
            const key = edgeMemberKey(member);
            if (!entries.has(key) && (prior === undefined || !holdsEdgeMember(prior.definition, member)) && holdsEdgeMember(next.definition, member)) {
                entries.set(key, edgeCounterOf(ref));
            }
        }

        store.seed(id, entries);
    };

    /**
     * A definition with every session edge id replaced by its stable member. Other values pass
     * through for the validator to judge.
     * @param definition - The definition as given.
     * @returns The definition, stable.
     */
    const stabilise = (definition: SetDefinitionInput): unknown => {
        const loose = definition as { kind?: unknown; edges?: unknown };
        if (!Array.isArray(loose.edges) || (loose.kind !== "fixed" && loose.kind !== "path")) {
            return definition;
        }

        const edges = (loose.edges as unknown[]).map((step) => {
            if (typeof step === "string") {
                return stable(step);
            }

            return Array.isArray(step) ? step.map((ref: unknown) => (typeof ref === "string" ? stable(ref) : ref)) : step;
        });

        return { ...definition, edges };
    };

    const stableDelta = (delta: SetMemberDelta): { nodes?: SetMemberDelta["nodes"]; edges?: readonly EdgeMember[] } => ({
        ...(delta.nodes === undefined ? {} : { nodes: delta.nodes }),
        ...(delta.edges === undefined ? {} : { edges: delta.edges.map(stable) }),
    });

    const references: DependencySources = dependencies.dependencies ?? { referent: (id) => store.get(id)?.definition };

    /**
     * A refusal of what a rule reads.
     * @param message - What is wrong.
     * @param id - The set.
     * @param reason - The typed reason a UI answers with a verb.
     * @param through - The references followed.
     * @returns The error to throw.
     */
    const refuseChain = (message: string, id: SetId, reason: string, through: readonly ChainStep[]): GraphtyError =>
        new GraphtyError({ code: "E_BAD_COMMAND", message, source: "data", target: { kind: "scope", id }, details: { id, reason, through } });

    /**
     * Refuse a kept rule the doors cannot keep: one that reads the live selection, one that reaches
     * its own set, one whose item follows a partition group, and one read `induced` holding a leaf
     * that speaks edges through a set it names or a field edges carry.
     * @param record - The prepared record.
     * @throws `E_BAD_COMMAND` with `details.reason` `"live-selection"`, `"cycle"`, `"follow-group"`
     * or `"induced-edge-leaf"`.
     */
    const checkReferences = (record: ElementSet): void => {
        const { definition, id } = record;
        if (definition.kind !== "rule") {
            return;
        }

        const selection = selectionChain(definition, references);
        if (selection !== null) {
            throw refuseChain(
                "A kept set cannot follow the live selection, which changes on every click. Create a set from the current selection instead.",
                id,
                "live-selection",
                selection,
            );
        }

        const cycle = setCycle(id, definition, references);
        if (cycle !== null) {
            throw refuseChain(
                `This definition reaches the set it is written to through ${cycle.map((step) => `"${step}"`).join(", ")}, so it would contain ` +
                    "itself. Create a set from the current members instead.",
                id,
                "cycle",
                cycle,
            );
        }

        const group = followedGroup(definition, references);
        if (group !== null) {
            throw followsGroup(group);
        }

        if (definition.reading === "induced" && speaksEdges(definition.where, referentReading(references), references.fieldKinds)) {
            throw inducedEdgeLeaf();
        }
    };

    /**
     * Write a prepared record, or nothing for a no-op.
     * @param record - The record, or null.
     */
    const write = (record: ElementSet | null): void => {
        if (record !== null) {
            checkReferences(record);
            store.put(record);
        }
    };

    const createAs: CreateAs = (definition, given, createdFrom, prebuilt = []) => {
        const [concrete, refs] = collect(() => stabilise(definition));
        const id = store.transact(() => {
            const name = given ?? defaultName(store);
            const minted = store.mint(typeof name === "string" ? name.trim() : "");
            write(prepareCreate(store, { id: minted, name, order: store.nextOrder(), definition: concrete, createdFrom }));

            return minted;
        });
        seed(id, undefined, [...prebuilt, ...refs]);

        return id;
    };

    /**
     * The resolve step, or the refusal of a session built without one.
     * @returns The resolve step.
     * @throws `E_UNSUPPORTED` when the session cannot resolve a source.
     */
    const materialiser = (): Materialiser => {
        if (dependencies.materialise === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "These sets cannot resolve a source, because no scope resolver is attached to them.",
                source: "data",
            });
        }

        return dependencies.materialise;
    };

    /**
     * Check the options of a materialising door before anything resolves.
     * @param reading - The reading option.
     * @returns The reading.
     * @throws `E_BAD_COMMAND` for a reading that is not an edge reading.
     */
    const readingOption = (reading: unknown): EdgeReading | undefined => {
        if (reading !== undefined && !(EDGE_READINGS as readonly unknown[]).includes(reading)) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `A reading is one of ${EDGE_READINGS.map((value) => `"${value}"`).join(", ")}, not ${JSON.stringify(reading)}.`,
                source: "data",
                details: { reading },
            });
        }

        return reading as EdgeReading | undefined;
    };

    /**
     * The synchronous commit of a materialising door: in one tick, mint, name and dispatch one
     * `set.create`. Resolves nothing; the definition's edge members are already stable.
     * @param concrete - What the resolve step produced.
     * @param name - The caller's name; "Set N" when absent.
     * @returns The minted id.
     */
    const commit = (concrete: Concrete, name: string | undefined): SetId =>
        createAs(concrete.definition, name, concrete.createdFrom, concrete.refs);

    /**
     * The offering, or the refusal of a session built without one.
     * @returns The offering.
     * @throws `E_UNSUPPORTED` when the session has no results to offer from.
     */
    const offering = (): Pick<Offering, "offers" | "memberships"> => {
        if (dependencies.offering === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "These sets cannot read results, because no run registry is attached to them.",
                source: "data",
            });
        }

        return dependencies.offering;
    };

    /**
     * Refuse an offer whose execution is no longer its run's current one: keeping it would freeze
     * the current execution's members under a `createdFrom` that names the old one.
     * @param offer - The offer.
     * @throws `E_BAD_COMMAND` with `details.reason: "stale-offer"`.
     */
    const requireCurrent = (offer: SetOffer): void => {
        const { run, execution } = offer.item;
        const current = dependencies.executionOf === undefined ? dependencies.runs?.get(run)?.execution : dependencies.executionOf(run);
        if (execution === undefined || execution !== current) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `"${offer.label}" came from an earlier run of "${run}". Ask the run for its offers again.`,
                source: "data",
                details: { reason: "stale-offer", run },
            });
        }
    };

    /**
     * Keep an offer as a rule over its item without the execution, so it follows the run.
     * @param offer - A current offer.
     * @param name - The caller's name.
     * @param reading - The caller's reading; the offer's when absent.
     * @returns The minted id.
     * @throws `E_BAD_COMMAND` with `details.reason: "follow-group"` for a partition group.
     */
    const follow = (offer: SetOffer, name: string | undefined, reading: EdgeReading = offer.reading): SetId => {
        const { run, key } = offer.item;
        if (!offer.followable) {
            throw followsGroup({ run, key });
        }

        return createAs({ kind: "rule", where: { kind: "item", item: { run, key } }, reading }, name, { kind: "result", item: offer.item });
    };

    const statusSources: StatusSources = {
        sets: store,
        dependencies: references,
        run: (id: RunId) => dependencies.runs?.get(id),
        ...(dependencies.outcome === undefined ? {} : { outcome: dependencies.outcome }),
    };

    /**
     * A read position's scope, canonical: session edge ids in `{ define }` made stable.
     * @param ref - The scope as given.
     * @returns The scope.
     * @throws `E_BAD_COMMAND` for a malformed scope or a `{ set }` id never issued.
     */
    const readScope = (ref: ScopeInput): Scope => {
        const inline = typeof ref === "object" && "define" in ref;
        const scope = parseScope(inline ? { define: collect(() => stabilise(ref.define))[0] } : ref);
        if (typeof scope === "object" && "set" in scope && store.get(scope.set) === undefined && !store.register().has(scope.set)) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `No set was ever called "${scope.set}".`,
                source: "data",
                target: { kind: "scope", id: scope.set },
                details: { id: scope.set },
            });
        }

        return scope;
    };

    const api: SetsApi = {
        list: () => store.list(),

        get: (id: SetId) => store.get(id),

        status: (ref: ScopeInput): SetStatus => statusOf(readScope(ref), statusSources),

        pathKind(id: SetId): PathKind | undefined {
            const definition = store.get(id)?.definition;

            return definition?.kind === "path" ? pathKind(definition) : undefined;
        },

        usedBy(id: SetId): readonly SetUser[] {
            const users: SetUser[] = [];
            for (const set of store.list()) {
                if (set.id !== id && dependenciesOf(set.definition).some((dependency) => dependency.kind === "set" && dependency.id === id)) {
                    users.push(Object.freeze({ kind: "set", id: set.id, label: set.name }));
                }
            }

            for (const run of dependencies.runs?.list() ?? []) {
                const { spec } = run.scope;
                if (run.scope.set?.id === id || (typeof spec === "object" && "set" in spec && spec.set === id)) {
                    users.push(Object.freeze({ kind: "run", id: run.id, label: run.label }));
                }
            }

            for (const { user, scope } of dependencies.users?.() ?? []) {
                if (dependenciesOf(scope).some((dependency) => dependency.kind === "set" && dependency.id === id)) {
                    users.push(Object.freeze({ ...user }));
                }
            }

            return Object.freeze(users);
        },

        create: (definition: SetDefinitionInput, options: { readonly name?: string } = {}): SetId => createAs(definition, options.name, { kind: "user" }),

        offers: (run: RunId, options: { readonly limit?: number } = {}) => offering().offers(run, options.limit),

        containing: async (element: { readonly node: NodeId } | { readonly edge: EdgeId }): Promise<Memberships> => {
            await Promise.resolve();

            return offering().memberships(element);
        },

        async createFrom(
            source: ScopeInput | SetOffer,
            options: { readonly name?: string; readonly reading?: EdgeReading; readonly follow?: boolean } = {},
        ): Promise<SetId> {
            const reading = readingOption(options.reading);
            if (isOffer(source)) {
                requireCurrent(source);
                if (options.follow === true) {
                    return follow(source, options.name, reading);
                }

                const concrete = await materialiser().from(source, reading);
                requireCurrent(source);

                return commit(concrete, options.name);
            }

            const concrete = await materialiser().from(readScope(source), reading);

            return commit(concrete, options.name);
        },

        async combine(op: SetCombine, of: readonly ScopeInput[], options: { readonly name?: string; readonly reading?: EdgeReading } = {}): Promise<SetId> {
            if (!SET_COMBINES.includes(op)) {
                throw new GraphtyError({
                    code: "E_BAD_COMMAND",
                    message: `A combination is one of ${SET_COMBINES.map((value) => `"${value}"`).join(", ")}, not ${JSON.stringify(op)}.`,
                    source: "data",
                    details: { op },
                });
            }

            if (!Array.isArray(of) || of.length < 2) {
                throw new GraphtyError({
                    code: "E_BAD_COMMAND",
                    message: "A combination takes two or more sets.",
                    source: "data",
                    details: { op, of },
                });
            }

            const reading = readingOption(options.reading);
            const concrete = await materialiser().combine(op, of.map(readScope), reading);

            return commit(concrete, options.name);
        },

        async createPath(source: SetOffer | "selection", options: { readonly name?: string } = {}): Promise<SetId> {
            if (isOffer(source)) {
                requireCurrent(source);
                const concrete = await materialiser().path(source);
                requireCurrent(source);

                return commit(concrete, options.name);
            }

            if (source !== "selection") {
                throw new GraphtyError({
                    code: "E_BAD_COMMAND",
                    message: `A path is created from "selection", not ${JSON.stringify(source)}.`,
                    source: "data",
                    details: { source },
                });
            }

            const concrete = await materialiser().path(source);

            return commit(concrete, options.name);
        },

        rename(id: SetId, name: string): void {
            store.transact(() => {
                write(prepareRename(store, { id, name }));
            });
        },

        redefine(id: SetId, definition: SetDefinitionInput): void {
            const [concrete, refs] = collect(() => stabilise(definition));
            const prior = store.get(id);
            store.transact(() => {
                write(prepareRedefine(store, { id, definition: concrete }));
            });
            seed(id, prior, refs);
        },

        addMembers(id: SetId, members: SetMemberDelta): void {
            const [add, refs] = collect(() => stableDelta(members));
            const prior = store.get(id);
            store.transact(() => {
                write(prepareMembers(store, { id, add }, limit));
            });
            seed(id, prior, refs);
        },

        removeMembers(id: SetId, members: SetMemberDelta): void {
            const remove = stableDelta(members);
            store.transact(() => {
                write(prepareMembers(store, { id, remove }, limit));
            });
        },

        remove(id: SetId): void {
            store.transact(() => {
                store.delete(prepareRemove(store, { id }));
            });
        },
    };
    storesOf.set(api, store);
    creatorsOf.set(api, createAs);

    return api;
}
