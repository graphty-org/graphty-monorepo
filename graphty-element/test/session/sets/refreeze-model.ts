/**
 * @file The re-freeze model (design/sets/sets-design.md sections 4.2, 4.4 and 12.3), shared by
 * the Node run over `TestGraph` and the browser run over the real `DataManager`: random sequences
 * of graph edits, loads, replacing imports and re-imports, embedded reloads, `edgeIdPath` changes
 * and set writes, after which every kept set's resolution, missing counts, endpoint invariant and
 * digest must equal a plain model's.
 *
 * The data layer behind a {@link Driver} decides which edges survive, through the production
 * survivorship decision, and the production doors make every member. The model decides
 * everything else with plain loops: each edge's stable identity as it was ingested, each load's
 * ordinals, each set's members and the edge each member entered through, and what every member
 * binds.
 */

import { type GraphSnapshot, maskToIndices } from "@graphty/graph-format";
import fc from "fast-check";
import { assert } from "vitest";

import { compareIds } from "../../../src/catalog/sets/canonical";
import { addToSum, EMPTY_SUM, hashEdgeMember, hashNodeId, membershipDigestOf } from "../../../src/catalog/sets/hash";
import type { EdgeId, EdgeMember, NodeId, SetDefinition, SetDefinitionInput, SetId } from "../../../src/catalog/types";
import { mintedEdgeId, pairsOrdered } from "../../../src/data/edgeIdentity";
import { isGraphtyError } from "../../../src/errors";
import { resolveSet, SetsCache } from "../../../src/session/sets/cache";
import { resolvePath } from "../../../src/session/sets/path";
import { digestOf, edgeMemberKey, type Resolution, resolveFixed } from "../../../src/session/sets/resolve";
import type { SetsStore } from "../../../src/session/sets/store";
import type { SetsApi } from "../../../src/session/sets/types";
import type { EdgeRecord, LoadOptions } from "./graphs";

/** What the model drives: a session's data layer and its kept sets. */
export interface Driver {
    /** The configured `edgeIdPath`. */
    path: string | null;
    readonly sets: SetsApi;
    readonly setsStore: SetsStore;
    /** How many of the last load's records were read, the refused one included. */
    readonly lastLoadRead: number;
    /** The record each edge the last load created came from, aligned with what it returned. */
    readonly lastLoadSources: readonly number[];
    snapshot(): GraphSnapshot;
    /** The store instance resolutions are tagged with: what a Clear or a replacing import replaces or keeps. */
    storeTag(): object;
    counterAt(row: number): number;
    rowOf(counter: number): number;
    counters(): number[];
    /** The record an edge carries now. */
    bag(counter: number): Readonly<Record<string, unknown>> | undefined;
    edgeId(counter: number): EdgeId;
    addNode(id: NodeId): void | Promise<void>;
    removeNode(id: NodeId): void | Promise<void>;
    removeEdge(counter: number): void | Promise<void>;
    /** The next load replaces the graph, in a new store. */
    replaceStore(): void | Promise<void>;
    load(records: readonly EdgeRecord[], options?: LoadOptions, declared?: boolean): number[] | Promise<number[]>;
    rebuildEmbedded(seed: number): void | Promise<void>;
}

export const POLICIES = ["keep", "error", "first", "last", "sum", "min", "max"] as const;
export const NODES: readonly NodeId[] = ["a", "b", "c", "d", 1, 2, "1"];
const ID_PATHS = [null, "eid", "alt"] as const;

/** One edge as the model knows it: its ends and its identity as ingested. */
interface ModelEdge {
    readonly s: NodeId;
    readonly t: NodeId;
    readonly fileId: string | number | undefined;
    ordinal: number;
    among: number;
}

/** A kept set as the model knows it. */
interface ModelSet {
    kind: "fixed" | "path";
    nodes: NodeId[];
    reading: "induced" | "listed";
    /** Fixed: every member by key. */
    members: Map<string, EdgeMember>;
    /** Path: each step's members by key, or null. */
    steps: (Map<string, EdgeMember> | null)[] | undefined;
    directed: boolean;
    /** Member key to the counter it entered through; outlives removals, as the store's does. */
    readonly seeds: Map<string, number>;
}

/** The model. */
export class Model {
    nodes = new Set<NodeId>();
    edges = new Map<number, ModelEdge>();
    ordered = false;
    path: string | null = null;
    readonly sets = new Map<SetId, ModelSet>();
    /** The loads the current store took, so a re-import can replay them. */
    loads: { records: EdgeRecord[]; policy: (typeof POLICIES)[number]; chunks: number }[] = [];
    /** The resolution cache the real side is read through, across the whole sequence. */
    readonly cache = new SetsCache();
}

/** A set definition as a command draws it: node picks and edge picks, resolved at run time. */
interface DefinitionSpec {
    readonly kind: "fixed" | "path";
    readonly nodes: readonly number[];
    readonly edges: readonly number[];
    readonly reading: "induced" | "listed" | "clipped";
    readonly steps: readonly (readonly number[] | null)[];
    readonly directed: boolean;
}

/** One command. */
export type Op =
    | { readonly op: "add-node"; readonly node: number }
    | { readonly op: "remove-node"; readonly node: number }
    | { readonly op: "add-edge"; readonly record: EdgeRecord; readonly policy: (typeof POLICIES)[number] }
    | { readonly op: "remove-edge"; readonly pick: number }
    | { readonly op: "load"; readonly records: EdgeRecord[]; readonly policy: (typeof POLICIES)[number]; readonly chunks: number }
    | {
          readonly op: "replace";
          readonly records: EdgeRecord[];
          readonly policy: (typeof POLICIES)[number];
          readonly chunks: number;
          readonly declared: boolean | undefined;
      }
    | { readonly op: "reimport"; readonly drop: number | null; readonly declared: boolean | undefined }
    | { readonly op: "embed"; readonly seed: number }
    | { readonly op: "id-path"; readonly path: (typeof ID_PATHS)[number] }
    | { readonly op: "create"; readonly spec: DefinitionSpec }
    | { readonly op: "redefine"; readonly pick: number; readonly spec: DefinitionSpec }
    | { readonly op: "add-members"; readonly pick: number; readonly nodes: readonly number[]; readonly edges: readonly number[] }
    | { readonly op: "remove-members"; readonly pick: number; readonly nodes: readonly number[]; readonly edges: readonly number[] };

// ---------------------------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------------------------

const nodePick = fc.nat({ max: NODES.length - 1 });
const fileIdArb = fc.constantFrom<string | number>("x", "y", 7, "7");
const RECORD: fc.Arbitrary<EdgeRecord> = fc
    .record({ s: nodePick, t: nodePick, w: fc.integer({ min: 1, max: 3 }), eid: fc.option(fileIdArb), alt: fc.option(fileIdArb) })
    .map(({ s, t, w, eid, alt }) => ({
        s: NODES[s],
        t: NODES[t],
        w,
        fields: { ...(eid === null ? {} : { eid }), ...(alt === null ? {} : { alt }) },
    }));
const RECORDS = fc.array(RECORD, { maxLength: 8 });
const POLICY = fc.constantFrom(...POLICIES);
const SPEC: fc.Arbitrary<DefinitionSpec> = fc.record({
    kind: fc.constantFrom<"fixed" | "path">("fixed", "fixed", "path"),
    nodes: fc.array(nodePick, { minLength: 1, maxLength: 4 }),
    edges: fc.array(fc.nat(), { maxLength: 4 }),
    reading: fc.constantFrom<"induced" | "listed" | "clipped">("induced", "listed", "listed", "clipped"),
    steps: fc.array(fc.option(fc.array(fc.nat(), { minLength: 1, maxLength: 2 })), { minLength: 3, maxLength: 3 }),
    directed: fc.boolean(),
});

/**
 * The op arbitraries.
 * @param options - What the driver supports.
 * @param options.embed - Whether it can rebuild a store from saved columns.
 * @param options.declared - Whether a load can declare a direction.
 * @returns The arbitraries.
 */
export function opsFor(options: { embed: boolean; declared: boolean }): fc.Arbitrary<Op>[] {
    const declared = options.declared ? fc.constantFrom(undefined, true, false) : fc.constant(undefined);
    const all: fc.Arbitrary<Op>[] = [
    nodePick.map((node) => ({ op: "add-node", node })),
    nodePick.map((node) => ({ op: "remove-node", node })),
    fc.record({ record: RECORD, policy: POLICY }).map((r) => ({ op: "add-edge", ...r })),
    fc.nat().map((pick) => ({ op: "remove-edge", pick })),
    fc.nat().map((pick) => ({ op: "remove-edge", pick })),
    fc.record({ records: RECORDS, policy: POLICY, chunks: fc.integer({ min: 1, max: 3 }) }).map((r) => ({ op: "load", ...r })),
    fc
        .record({ records: RECORDS, policy: POLICY, chunks: fc.integer({ min: 1, max: 3 }), declared })
        .map((r) => ({ op: "replace", ...r })),
    fc
        .record({ drop: fc.option(fc.nat()), declared })
        .map((r) => ({ op: "reimport", ...r })),
    fc
        .record({ drop: fc.option(fc.nat()), declared })
        .map((r) => ({ op: "reimport", ...r })),
    fc.record({ records: RECORDS, policy: POLICY, chunks: fc.integer({ min: 1, max: 3 }) }).map((r) => ({ op: "load", ...r })),
    ...(options.embed ? [fc.nat().map((seed): Op => ({ op: "embed", seed }))] : []),
    fc.constantFrom(...ID_PATHS).map((path) => ({ op: "id-path", path })),
    SPEC.map((spec) => ({ op: "create", spec })),
    SPEC.map((spec) => ({ op: "create", spec })),
    fc.record({ pick: fc.nat(), spec: SPEC }).map((r) => ({ op: "redefine", ...r })),
    fc
        .record({ pick: fc.nat(), nodes: fc.array(nodePick, { maxLength: 2 }), edges: fc.array(fc.nat(), { maxLength: 3 }) })
        .map((r) => ({ op: "add-members", ...r })),
    fc
        .record({ pick: fc.nat(), nodes: fc.array(nodePick, { maxLength: 1 }), edges: fc.array(fc.nat(), { maxLength: 2 }) })
        .map((r) => ({ op: "remove-members", ...r })),
    ];

    return all;
}

// ---------------------------------------------------------------------------------------------
// The model's rules
// ---------------------------------------------------------------------------------------------

/**
 * A usable file id.
 * @param value - The value at the id path.
 * @returns It, or undefined.
 */
function usable(value: unknown): string | number | undefined {
    return typeof value === "string" || (typeof value === "number" && Number.isFinite(value)) ? value : undefined;
}

/**
 * The edge's live counters, ascending.
 * @param model - The model.
 * @returns The counters.
 */
function liveCounters(model: Model): number[] {
    return [...model.edges.keys()].sort((a, b) => a - b);
}

/**
 * The member a door makes of a session edge: its file id at the CURRENT path when its record has
 * one, else its ordinal when a load brought it, else its minted id; ends in comparator order
 * unless pairs are ordered.
 * @param model - The model.
 * @param real - Where the edge's record is.
 * @param counter - The edge.
 * @returns The member.
 */
function doorMember(model: Model, real: Driver, counter: number): EdgeMember {
    const edge = model.edges.get(counter) as ModelEdge;
    const [source, target] = model.ordered || compareIds(edge.s, edge.t) <= 0 ? [edge.s, edge.t] : [edge.t, edge.s];
    const fileId = model.path === null ? undefined : usable(real.bag(counter)?.[model.path]);
    if (fileId !== undefined) {
        return { source, target, id: fileId };
    }

    return edge.ordinal >= 0 ? { source, target, ordinal: edge.ordinal, among: edge.among } : { source, target, id: mintedEdgeId(counter) };
}

/**
 * An edge's identity as it was ingested, which is what its hash column holds.
 * @param edge - The edge.
 * @param counter - Its counter.
 * @returns The member.
 */
function ingestedIdentity(edge: ModelEdge, counter: number): EdgeMember {
    if (edge.fileId !== undefined) {
        return { source: edge.s, target: edge.t, id: edge.fileId };
    }

    return edge.ordinal >= 0
        ? { source: edge.s, target: edge.t, ordinal: edge.ordinal, among: edge.among }
        : { source: edge.s, target: edge.t, id: mintedEdgeId(counter) };
}

/**
 * What a member binds: the edge it entered through while that edge is there, else the one edge
 * whose ingested identity it is.
 * @param model - The model.
 * @param member - The member.
 * @param seed - Its seed.
 * @returns The counter, or -1 missing, or -2 ambiguous.
 */
function bind(model: Model, member: EdgeMember, seed: number | undefined): number {
    if (seed !== undefined && model.edges.has(seed)) {
        return seed;
    }

    const hits: number[] = [];
    for (const [counter, edge] of model.edges) {
        const pair = model.ordered
            ? edge.s === member.source && edge.t === member.target
            : (edge.s === member.source && edge.t === member.target) || (edge.s === member.target && edge.t === member.source);
        if (!pair) {
            continue;
        }

        const identity = ingestedIdentity(edge, counter);
        // An ordinal counts for every load edge, file id or not (edgeIdPath may have changed).
        const match =
            member.id === undefined ? edge.ordinal >= 0 && edge.ordinal === member.ordinal && edge.among === member.among : identity.id === member.id;
        if (match) {
            hits.push(counter);
        }
    }

    return verdict(hits);
}

/**
 * One hit binds it; none leaves it missing (-1); more leave it ambiguous (-2).
 * @param hits - What matched.
 * @returns The one hit, or -1, or -2.
 */
export function verdict(hits: readonly number[]): number {
    if (hits.length === 1) {
        return hits[0];
    }

    return hits.length === 0 ? -1 : -2;
}

/**
 * A path step's members.
 * @param step - The step.
 * @returns Its members; none for a null step.
 */
export function stepMembers(step: EdgeMember | readonly EdgeMember[] | null): readonly EdgeMember[] {
    if (step === null) {
        return [];
    }

    return Array.isArray(step) ? (step as readonly EdgeMember[]) : [step as EdgeMember];
}

/** What the model says a set resolves to. */
interface Expected {
    readonly nodes: Set<NodeId>;
    readonly edges: Set<number>;
    readonly missingNodes: number;
    readonly missingEdges: number;
    readonly ambiguous: number;
}

/**
 * The model's resolution of one set.
 * @param model - The model.
 * @param real - For the declared direction of an edge (a path's directed steps).
 * @param set - The set.
 * @returns The expectation.
 */
function expect(model: Model, real: Driver, set: ModelSet): Expected {
    const nodes = new Set<NodeId>();
    const edges = new Set<number>();
    const absent = new Set<NodeId>();
    let missingNodes = 0;
    let missingEdges = 0;
    let ambiguous = 0;
    const addEdge = (counter: number): void => {
        const edge = model.edges.get(counter) as ModelEdge;
        edges.add(counter);
        nodes.add(edge.s);
        nodes.add(edge.t);
    };

    for (const id of set.nodes) {
        if (model.nodes.has(id)) {
            nodes.add(id);
        } else if (set.kind === "fixed") {
            missingNodes++;
        } else {
            absent.add(id);
        }
    }

    if (set.kind === "fixed") {
        // Read induced, the edge members are inert; read listed, the ends join only with a bound
        // edge.
        for (const [key, member] of set.members) {
            if (set.reading === "listed") {
                const counter = bind(model, member, set.seeds.get(key));
                if (counter >= 0) {
                    addEdge(counter);
                } else {
                    missingEdges++;
                    ambiguous += counter === -2 ? 1 : 0;
                }
            }
        }

        if (set.reading === "induced") {
            for (const [counter, edge] of model.edges) {
                if (nodes.has(edge.s) && nodes.has(edge.t)) {
                    edges.add(counter);
                }
            }
        }

        return { nodes, edges, missingNodes, missingEdges, ambiguous };
    }

    const snapshot = real.snapshot();
    const declared = (counter: number): [NodeId, NodeId] => {
        const row = real.rowOf(counter);
        return [snapshot.ids.idOf(snapshot.edgeSource(row)), snapshot.ids.idOf(snapshot.edgeTarget(row))];
    };

    for (let i = 0; i + 1 < set.nodes.length; i++) {
        const [from, to] = [set.nodes[i], set.nodes[i + 1]];
        const step = set.steps?.[i] ?? null;
        const found: number[] = [];
        if (step === null) {
            if (model.nodes.has(from) && model.nodes.has(to)) {
                for (const counter of model.edges.keys()) {
                    const [s, t] = declared(counter);
                    if ((s === from && t === to) || (!set.directed && s === to && t === from)) {
                        found.push(counter);
                    }
                }
            }
        } else {
            for (const [key, member] of step) {
                const counter = bind(model, member, set.seeds.get(key));
                ambiguous += counter === -2 ? 1 : 0;
                if (counter >= 0 && (!set.directed || (declared(counter)[0] === from && declared(counter)[1] === to))) {
                    found.push(counter);
                }
            }
        }

        missingEdges += found.length === 0 ? 1 : 0;
        for (const counter of found) {
            addEdge(counter);
        }
    }

    return { nodes, edges, missingNodes: absent.size, missingEdges, ambiguous };
}

/**
 * The model's digest of an expectation: the member sums of the hash columns, recomputed from each
 * element's identity as ingested.
 * @param model - The model.
 * @param expected - The expectation.
 * @returns The digest.
 */
function modelDigest(model: Model, expected: Expected): string {
    let nodeSum = EMPTY_SUM;
    for (const id of expected.nodes) {
        nodeSum = addToSum(nodeSum, hashNodeId(id));
    }

    let edgeSum = EMPTY_SUM;
    for (const counter of expected.edges) {
        edgeSum = addToSum(edgeSum, hashEdgeMember(ingestedIdentity(model.edges.get(counter) as ModelEdge, counter), model.ordered));
    }

    return membershipDigestOf({ count: expected.nodes.size, sum: nodeSum }, { count: expected.edges.size, sum: edgeSum });
}

/**
 * Give the edges one load created their ordinals: per pair (unordered unless ordered), in counter
 * order.
 * @param model - The model.
 * @param created - The load's edges.
 */
function completeLoad(model: Model, created: readonly number[]): void {
    const pairOf = (edge: ModelEdge): string => {
        const [s, t] = model.ordered || compareIds(edge.s, edge.t) <= 0 ? [edge.s, edge.t] : [edge.t, edge.s];
        return JSON.stringify([s, t]);
    };
    const groups = new Map<string, number[]>();
    for (const counter of [...created].sort((a, b) => a - b)) {
        const key = pairOf(model.edges.get(counter) as ModelEdge);
        groups.set(key, [...(groups.get(key) ?? []), counter]);
    }

    for (const group of groups.values()) {
        group.forEach((counter, ordinal) => {
            const edge = model.edges.get(counter) as ModelEdge;
            edge.ordinal = ordinal;
            edge.among = group.length;
        });
    }
}

/**
 * Apply one ingest to the model from what the real load reports.
 * @param model - The model.
 * @param real - The real graph, just loaded.
 * @param records - The records it was given.
 * @param created - The edges it created.
 * @param asLoad - Whether it was a load (else session edges).
 */
function ingested(model: Model, real: Driver, records: readonly EdgeRecord[], created: readonly number[], asLoad: boolean): void {
    for (const record of records.slice(0, real.lastLoadRead)) {
        model.nodes.add(record.s);
        model.nodes.add(record.t);
    }

    created.forEach((counter, i) => {
        const record = records[real.lastLoadSources[i]];
        const fileId = model.path === null ? undefined : usable(record.fields?.[model.path]);
        model.edges.set(counter, { s: record.s, t: record.t, fileId, ordinal: -1, among: -1 });
    });
    if (asLoad) {
        completeLoad(model, created);
    }
}

// ---------------------------------------------------------------------------------------------
// Set commands
// ---------------------------------------------------------------------------------------------

/**
 * Turn a spec into the door's input and the model's set, against the current live edges.
 * @param model - The model.
 * @param real - Where records are.
 * @param spec - The spec.
 * @returns The input, the session edges it names with their members, and the model's set.
 */
function build(model: Model, real: Driver, spec: DefinitionSpec): { input: SetDefinitionInput; named: [number, EdgeMember][]; set: Omit<ModelSet, "seeds"> } | null {
    const live = liveCounters(model);
    const nodes = spec.nodes.map((i) => NODES[i]);
    const named: [number, EdgeMember][] = [];
    const pick = (i: number): number => {
        const counter = live[i % live.length];
        named.push([counter, doorMember(model, real, counter)]);
        return counter;
    };

    if (spec.kind === "fixed") {
        const counters = live.length === 0 ? [] : spec.edges.map(pick);
        const members = new Map(named.map(([, member]) => [edgeMemberKey(member), member]));
        return {
            input: { kind: "fixed", nodes, ...(counters.length === 0 ? {} : { edges: counters.map((c) => real.edgeId(c)) }), reading: spec.reading },
            named,
            // A fixed set's node list is canonical: no duplicates.
            set: { kind: "fixed", nodes: [...new Set(nodes)], reading: spec.reading === "induced" ? "induced" : "listed", members, steps: undefined, directed: false },
        };
    }

    const steps = nodes.slice(1).map((_, i) => {
        const step = spec.steps[i] ?? null;
        return step === null || live.length === 0 ? null : step.map(pick);
    });
    const members = new Map<string, EdgeMember>();
    const modelSteps = steps.map((step, i) => {
        if (step === null) {
            return null;
        }

        const map = new Map<string, EdgeMember>();
        for (const counter of step) {
            const member = doorMember(model, real, counter);
            map.set(edgeMemberKey(member), member);
            members.set(edgeMemberKey(member), member);
        }

        return (spec.steps[i]?.length ?? 0) > 0 ? map : null;
    });

    return {
        input: {
            kind: "path",
            nodes,
            ...(nodes.length > 1 ? { edges: steps.map((step) => stepInput(real, step)) } : {}),
            directed: spec.directed,
        },
        named,
        set: { kind: "path", nodes, reading: "listed", members, steps: modelSteps, directed: spec.directed },
    };
}

/**
 * A step as the door takes it: null, one session edge id, or a group of them.
 * @param real - The driver.
 * @param step - The step's counters, or null.
 * @returns The step.
 */
function stepInput(real: Driver, step: readonly number[] | null): EdgeId | EdgeId[] | null {
    if (step === null) {
        return null;
    }

    return step.length === 1 ? real.edgeId(step[0]) : step.map((c) => real.edgeId(c));
}

/**
 * Every member key a model set holds.
 * @param set - The set, or undefined.
 * @returns The keys.
 */
function keysOf(set: Omit<ModelSet, "seeds"> | undefined): Set<string> {
    return new Set(set?.members.keys() ?? []);
}

/**
 * Seed what a write brought in: the first session edge naming each member the set did not hold.
 * @param seeds - The set's seeds.
 * @param prior - Its members before.
 * @param next - Its members after.
 * @param named - The session edges the write named, in order.
 */
function seedWrite(seeds: Map<string, number>, prior: Set<string>, next: Set<string>, named: readonly [number, EdgeMember][]): void {
    const done = new Set<string>();
    for (const [counter, member] of named) {
        const key = edgeMemberKey(member);
        if (!done.has(key) && !prior.has(key) && next.has(key)) {
            seeds.set(key, counter);
        }

        done.add(key);
    }
}

/**
 * Run a door, telling a refusal from a failure.
 * @param door - The door.
 * @returns True when it ran, false when it refused with a GraphtyError.
 */
function attempt(door: () => void): boolean {
    try {
        door();
        return true;
    } catch (error) {
        if (isGraphtyError(error)) {
            return false;
        }

        throw error;
    }
}

// ---------------------------------------------------------------------------------------------
// The command
// ---------------------------------------------------------------------------------------------

/** One step of a sequence: apply the op to both sides, then compare every kept set. */
export class Step implements fc.AsyncCommand<Model, Driver> {
    /**
     * @param op - The op.
     */
    constructor(private readonly op: Op) {}

    /**
     * Every step may run.
     * @returns True.
     */
    check(): boolean {
        return true;
    }

    /**
     * Apply and compare.
     * @param model - The model.
     * @param real - The real graph.
     */
    async run(model: Model, real: Driver): Promise<void> {
        await apply(this.op, model, real);
        verify(model, real);
    }

    /**
     * The op, for a counterexample.
     * @returns JSON.
     */
    toString(): string {
        return JSON.stringify(this.op);
    }
}

/**
 * Apply one op to the model and the real graph.
 * @param op - The op.
 * @param model - The model.
 * @param real - The real graph.
 */
async function apply(op: Op, model: Model, real: Driver): Promise<void> {
    const setIds = [...model.sets.keys()];
    const live = liveCounters(model);
    switch (op.op) {
        case "add-node":
            await real.addNode(NODES[op.node]);
            model.nodes.add(NODES[op.node]);
            return;
        case "remove-node": {
            const id = NODES[op.node];
            await real.removeNode(id);
            model.nodes.delete(id);
            for (const [counter, edge] of model.edges) {
                if (edge.s === id || edge.t === id) {
                    model.edges.delete(counter);
                }
            }

            return;
        }
        case "add-edge": {
            const created = await real.load([op.record], { asLoad: false, policy: op.policy });
            ingested(model, real, [op.record], created, false);
            return;
        }
        case "remove-edge":
            if (live.length > 0) {
                const counter = live[op.pick % live.length];
                await real.removeEdge(counter);
                model.edges.delete(counter);
            }

            return;
        case "load": {
            const created = await real.load(op.records, { policy: op.policy, chunks: op.chunks });
            ingested(model, real, op.records, created, true);
            model.loads.push({ records: op.records, policy: op.policy, chunks: op.chunks });
            return;
        }
        case "replace": {
            await real.replaceStore();
            model.nodes = new Set();
            model.edges = new Map();
            model.ordered = op.declared === true;
            const created = await real.load(op.records, { policy: op.policy, chunks: op.chunks }, op.declared);
            ingested(model, real, op.records, created, true);
            model.loads = [{ records: op.records, policy: op.policy, chunks: op.chunks }];
            return;
        }
        case "reimport": {
            // Every load the store took, again, into a new store: the same files, re-imported,
            // one record optionally dropped.
            const total = model.loads.reduce((sum, load) => sum + load.records.length, 0);
            const dropped = op.drop === null || total === 0 ? -1 : op.drop % total;
            let seen = 0;
            const loads = model.loads.map((load) => {
                const records = load.records.filter((_, i) => seen + i !== dropped);
                seen += load.records.length;
                return { ...load, records };
            });
            if (loads.length === 0) {
                // A re-import is at least one file, even an empty one.
                loads.push({ records: [], policy: "keep", chunks: 1 });
            }

            await real.replaceStore();
            model.nodes = new Set();
            model.edges = new Map();
            model.ordered = op.declared === true;
            for (const [i, load] of loads.entries()) {
                const created = await real.load(load.records, { policy: load.policy, chunks: load.chunks }, i === 0 ? op.declared : undefined);
                ingested(model, real, load.records, created, true);
            }

            model.loads = loads;
            return;
        }
        case "embed":
            await real.rebuildEmbedded(op.seed);
            return;
        case "id-path":
            real.path = op.path;
            model.path = op.path;
            return;
        case "create": {
            const built = build(model, real, op.spec);
            if (built === null) {
                return;
            }

            let id = "";
            if (attempt(() => (id = real.sets.create(built.input)))) {
                const set: ModelSet = { ...built.set, seeds: new Map() };
                seedWrite(set.seeds, new Set(), keysOf(set), built.named);
                model.sets.set(id, set);
            }

            return;
        }
        case "redefine": {
            if (setIds.length === 0) {
                return;
            }

            const id = setIds[op.pick % setIds.length];
            const built = build(model, real, op.spec);
            const prior = model.sets.get(id) as ModelSet;
            if (built !== null && attempt(() => real.sets.redefine(id, built.input))) {
                const next: ModelSet = { ...built.set, seeds: prior.seeds };
                seedWrite(prior.seeds, keysOf(prior), keysOf(next), built.named);
                model.sets.set(id, next);
            }

            return;
        }
        case "add-members":
        case "remove-members": {
            if (setIds.length === 0) {
                return;
            }

            const id = setIds[op.pick % setIds.length];
            const set = model.sets.get(id) as ModelSet;
            const nodes = op.nodes.map((i) => NODES[i]);
            const counters = live.length === 0 ? [] : op.edges.map((i) => live[i % live.length]);
            const named: [number, EdgeMember][] = counters.map((c) => [c, doorMember(model, real, c)]);
            const delta = { nodes, edges: counters.map((c) => real.edgeId(c)) };
            const ran = attempt(() => (op.op === "add-members" ? real.sets.addMembers(id, delta) : real.sets.removeMembers(id, delta)));
            assert.strictEqual(ran, set.kind === "fixed", "member edits run on fixed sets only");
            if (!ran) {
                return;
            }

            const prior = keysOf(set);
            if (op.op === "add-members") {
                for (const node of nodes) {
                    if (!set.nodes.some((held) => held === node)) {
                        set.nodes.push(node);
                    }
                }

                for (const [, member] of named) {
                    set.members.set(edgeMemberKey(member), member);
                }

                seedWrite(set.seeds, prior, keysOf(set), named);
            } else {
                set.nodes = set.nodes.filter((held) => !nodes.some((node) => node === held));
                for (const [, member] of named) {
                    set.members.delete(edgeMemberKey(member));
                }

                for (const [key, member] of set.members) {
                    if (nodes.some((node) => node === member.source || node === member.target)) {
                        set.members.delete(key);
                    }
                }
            }

            return;
        }
        default:
            throw new Error(`unknown op ${JSON.stringify(op)}`);
    }
}

/**
 * A set's values as a sorted array of their JSON, types kept, so `1` and `"1"` stay apart.
 * @param values - The values.
 * @returns The sorted JSON strings.
 */
function sorted(values: Iterable<unknown>): string[] {
    return [...values].map((value) => JSON.stringify(value)).sort();
}

/**
 * Compare every kept set's resolution with the model's.
 * @param model - The model.
 * @param real - The real graph.
 */
function verify(model: Model, real: Driver): void {
    const snapshot = real.snapshot();
    if (snapshot.edgeCount > 0) {
        // Latched when the store's first edge is completed; before that no hash depends on it.
        assert.strictEqual(pairsOrdered(snapshot), model.ordered, "pair rule");
    }
    assert.deepStrictEqual(real.counters(), liveCounters(model), "the model holds the graph's edges");

    for (const [id, set] of model.sets) {
        const record = real.sets.get(id);
        assert.isDefined(record, id);
        const definition = record?.definition;
        assert.strictEqual(definition.kind, set.kind);

        // The door stored exactly the members the model says it made.
        const stored = new Set<string>();
        if (definition.kind === "fixed") {
            for (const member of definition.edges ?? []) {
                stored.add(edgeMemberKey(member));
            }
        } else if (definition.kind === "path") {
            for (const step of definition.edges ?? []) {
                for (const member of stepMembers(step)) {
                    stored.add(edgeMemberKey(member));
                }
            }
        }

        assert.deepStrictEqual(sorted(stored), sorted(keysOf(set)), `${id} members`);

        const seeds = real.setsStore.seedsOf(id);
        const resolution: Resolution =
            definition.kind === "fixed"
                ? resolveFixed(definition, { snapshot }, seeds)
                : resolvePath(definition as Extract<SetDefinition, { kind: "path" }>, { snapshot }, seeds);
        // Served through the cache, it equals the fresh resolution, and is of this snapshot.
        const served = resolveSet({ id, definition }, { snapshot, store: real.storeTag(), sets: real.setsStore, cache: model.cache });
        assert.strictEqual(served.serial, snapshot.serial, `${id} served from this serial`);
        assert.deepStrictEqual([served.nodes, served.edges], [resolution.nodes, resolution.edges], `${id} served equals fresh`);
        assert.deepStrictEqual(
            [served.missingNodes, served.missingEdges, served.ambiguousEdges],
            [resolution.missingNodes, resolution.missingEdges, resolution.ambiguousEdges],
            `${id} served counts`,
        );
        const expected = expect(model, real, set);
        const nodes = new Set(Array.from(maskToIndices(resolution.nodes, snapshot.nodeCount), (i) => snapshot.ids.idOf(i)));
        const edges = new Set(Array.from(maskToIndices(resolution.edges, snapshot.edgeCount), (e) => real.counterAt(e)));
        assert.deepStrictEqual(sorted(nodes), sorted(expected.nodes), `${id} nodes`);
        assert.deepStrictEqual(sorted(edges), sorted(expected.edges), `${id} edges`);
        assert.strictEqual(resolution.missingNodes, expected.missingNodes, `${id} missing nodes`);
        assert.strictEqual(resolution.missingEdges, expected.missingEdges, `${id} missing edges`);
        assert.strictEqual(resolution.ambiguousEdges, expected.ambiguous, `${id} ambiguous`);
        for (const e of maskToIndices(resolution.edges, snapshot.edgeCount)) {
            const ends = [snapshot.edgeSource(e), snapshot.edgeTarget(e)];
            assert.isTrue(ends.every((i) => (resolution.nodes[i >>> 5] & (1 << (i & 31))) !== 0), `${id} endpoint invariant`);
        }

        assert.strictEqual(digestOf(resolution, snapshot), modelDigest(model, expected), `${id} digest`);
    }
}

