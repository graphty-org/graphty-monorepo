/**
 * @file The `union` rule leaf: branches folded from a start by ordered Add, Keep and Except steps,
 * and the step leaves that read a reference (`hops`, `touching`, `nonempty`, `same-value`).
 *
 * One evaluator, {@link readUnion}, serves both readers: the compiler (`./filter`), which wants only
 * the total, and `session.scope.watchSteps`, which wants every branch's and step's input, matches,
 * members, state and reason. So a count a panel shows and what a layer paints can never disagree.
 *
 * Every array here is one byte per element of a half (1 = in), over the snapshot.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import type { RuleTree, SelectionDirection, StepReference, UnionLeaf, UnionStep } from "../../catalog/types";
import type { CodedFact } from "../shared";

/** One byte per element of a half: 1 when the element is in. */
export type Bytes = Uint8Array;

/** Whether one element, named by its dense index, passes a test. */
type Test = (index: number) => boolean;

/** A compiled leaf's two halves, null where it is silent. */
export interface Halves {
    readonly node: Test | null;
    readonly edge: Test | null;
}

/** What a leaf compiled inside a step reads beyond the filter's sources. */
export interface StepFrame {
    /** The leaf's base. */
    readonly within: UnionLeaf["within"];
    /** The nodes of the step's input (its branch so far): what `"so-far"` names. */
    readonly soFar: Bytes;
    /**
     * The nodes a reference holds now, `"so-far"` included.
     * @param reference - The reference.
     * @returns The nodes.
     */
    reference(reference: StepReference): Bytes;
    /**
     * The elements a rank, a share or a category count is taken over: the base, or the step's
     * input when it is computed on `"so-far"`. Null for a half that is whole.
     */
    readonly population: { readonly node: Bytes | null; readonly edge: Bytes | null };
    /**
     * The leaf's base, both halves: a walk (hops, touching) and a structure value (degree) read
     * only its nodes and edges, so a filtered-out node is never stepped through or counted.
     */
    readonly base: { readonly node: Bytes; readonly edge: Bytes };
}

/** What {@link readUnion} needs from the session. */
export interface UnionEnv {
    readonly graph: GraphSnapshot;
    /**
     * The base's two halves.
     * @param within - The leaf's base.
     * @returns The nodes and edges in it.
     */
    base(within: UnionLeaf["within"]): { readonly node: Bytes; readonly edge: Bytes };
    /**
     * Compile a step's rule in its frame.
     * @param tree - The rule.
     * @param frame - The step's frame.
     * @returns The halves.
     */
    compile(tree: RuleTree, frame: StepFrame): Halves;
    /**
     * The nodes a reference other than `"so-far"` holds now.
     * @param reference - The reference.
     * @returns The nodes.
     */
    reference(reference: Exclude<StepReference, "so-far">): Bytes;
    /**
     * Whether a step's rule can be evaluated now: null when it can; else it waits (`"pending"`: a
     * run computing, needed, paused, failed or stale), is not yet a test (`"inert"`: a one-node
     * option bound to several nodes), or matches nothing (`"empty"`: a bound reference holds no
     * node). Absent: every step can.
     * @param step - The step.
     * @param frame - Its frame.
     * @returns The gate, or null.
     */
    gate?(step: UnionStep, frame: StepFrame): StepGate | null;
    /**
     * A branch's last ready members, which a pending branch is drawn with. Absent: none is held.
     * @param branch - The branch's id.
     * @returns The members, or undefined.
     */
    held?(branch: string): Bytes | undefined;
}

/** Why a step cannot be folded as it stands: see {@link UnionEnv.gate}. */
export interface StepGate {
    readonly state: "pending" | "inert" | "empty";
    readonly reason: CodedFact;
}

/** One step as {@link readUnion} read it. */
export interface StepRead {
    readonly id: string | undefined;
    /** `"applied"`, `"inert"`, `"pending"` or `"off"`. */
    readonly state: "applied" | "inert" | "pending" | "off";
    /** Why it is inert or pending, or a note on an applied step; null when there is nothing to say. */
    readonly reason: CodedFact | null;
    /** The branch before the step. */
    readonly input: Bytes;
    /** What the step's rule matched, read on the leaf's side; null when it matched nothing to say. */
    readonly matches: Bytes | null;
    /** The branch after the step. */
    readonly members: Bytes;
    /** Whether the step's result depends on where it sits. */
    readonly orderMatters: boolean;
}

/** One branch as {@link readUnion} read it. */
export interface BranchRead {
    readonly id: string | undefined;
    readonly color: string | undefined;
    /** `"ready"`, `"pending"` (a step waits) or `"off"`. */
    readonly state: "ready" | "pending" | "off";
    /** Why it is pending: the first pending step's reason. */
    readonly reason: CodedFact | null;
    /** Its members after its last step; a pending branch's last ready members, when held. */
    readonly members: Bytes;
    /** Whether `members` are a pending branch's last ready members. */
    readonly held: boolean;
    readonly steps: readonly StepRead[];
}

/** A union leaf as {@link readUnion} read it. */
export interface UnionRead {
    readonly side: UnionLeaf["side"];
    /** The base, on the leaf's side. */
    readonly base: Bytes;
    /** Everything in a ready branch that is on. */
    readonly total: Bytes;
    /** What is drawn: the total, and the held members of the pending branches that are on. */
    readonly painted: Bytes;
    readonly branches: readonly BranchRead[];
}

/**
 * The bytes of a test over a half.
 * @param test - The test.
 * @param count - The elements in the half.
 * @returns The bytes.
 */
export function bytesOf(test: Test, count: number): Bytes {
    const out = new Uint8Array(count);
    for (let index = 0; index < count; index++) {
        if (test(index)) {
            out[index] = 1;
        }
    }

    return out;
}

/**
 * How many elements bytes hold.
 * @param bytes - The bytes.
 * @returns The count.
 */
export function countOf(bytes: Bytes): number {
    let count = 0;
    for (const byte of bytes) {
        count += byte;
    }

    return count;
}

/**
 * The nodes at the ends of some edges.
 * @param graph - The snapshot.
 * @param edges - The edges.
 * @returns The nodes.
 */
export function endsOf(graph: GraphSnapshot, edges: Bytes): Bytes {
    const { src, dst } = graph.edgeList();
    const nodes = new Uint8Array(graph.nodeCount);
    for (let edge = 0; edge < graph.edgeCount; edge++) {
        if (edges[edge] === 1) {
            nodes[src[edge]] = 1;
            nodes[dst[edge]] = 1;
        }
    }

    return nodes;
}

/**
 * A compiled rule read on one side: its own half, or the other half carried across (a node side
 * reads an edge test as the nodes touching a passing edge; an edge side reads a node test by its
 * ends). Null when the rule is silent on both.
 * @param halves - The compiled rule.
 * @param side - The side.
 * @param ends - How an edge side reads a node test.
 * @param graph - The snapshot.
 * @param baseEdges - The base's edges: a node side reads only the ends of an edge in the base, so
 * an edge the filter removed never carries its far end in.
 * @returns The bytes, or null.
 */
function onSide(
    halves: Halves,
    side: UnionLeaf["side"],
    ends: UnionStep["ends"],
    graph: GraphSnapshot,
    baseEdges: Bytes,
): Bytes | null {
    if (side === "nodes") {
        if (halves.node !== null) {
            return bytesOf(halves.node, graph.nodeCount);
        }

        const edgeTest = halves.edge;
        return edgeTest === null
            ? null
            : endsOf(
                  graph,
                  bytesOf((edge) => baseEdges[edge] === 1 && edgeTest(edge), graph.edgeCount),
              );
    }

    if (halves.edge !== null) {
        return bytesOf(halves.edge, graph.edgeCount);
    }

    if (halves.node === null) {
        return null;
    }

    const nodes = bytesOf(halves.node, graph.nodeCount);
    const { src, dst } = graph.edgeList();
    const either = ends === "either";

    return bytesOf(
        (edge) =>
            either
                ? nodes[src[edge]] === 1 || nodes[dst[edge]] === 1
                : nodes[src[edge]] === 1 && nodes[dst[edge]] === 1,
        graph.edgeCount,
    );
}

/**
 * Why a step's rule is not yet a test: an untouched range, an empty pick, empty text, a missing
 * reference. Read on the step's own rule, which is one card.
 * @param rule - The step's rule.
 * @returns The inert reason, or null.
 */
export function inertReason(rule: RuleTree): CodedFact | null {
    const loose = rule as unknown as Readonly<Record<string, unknown>>;
    switch (rule.kind) {
        case "range":
        case "by-size":
            return loose.min === undefined && loose.max === undefined && loose.top === undefined
                ? { code: "test-unset", params: {} }
                : null;
        case "categories":
            return rule.values.length === 0 ? { code: "test-unset", params: {} } : null;
        case "text":
            // An empty regex is the element's own "has a value" (`selectorRule` of a `has`
            // selector): a test, never an unset one. Empty text in any other mode is unset.
            return rule.text === "" && rule.mode !== "regex" ? { code: "test-unset", params: {} } : null;
        case "hops":
        case "touching":
        case "nonempty":
            return rule.of === undefined ? { code: "no-reference", params: {} } : null;
        case "same-value":
            return rule.as === undefined ? { code: "no-reference", params: {} } : null;
        case "measure":
            return rule.test === undefined
                ? { code: "test-unset", params: {} }
                : inertReason({
                      ...rule.test,
                      attribute: "data.x",
                      path: "data.x",
                      reads: "data.x",
                  } as unknown as RuleTree);
        default:
            return null;
    }
}

/**
 * The reference a step's rule reads, when it reads one.
 * @param rule - The step's rule.
 * @returns The reference, or undefined.
 */
export function referenceOf(rule: RuleTree): StepReference | undefined {
    switch (rule.kind) {
        case "hops":
        case "touching":
        case "nonempty":
            return rule.of;
        case "same-value":
            return rule.as;
        case "measure":
            return rule.test?.kind === "same-value" ? rule.test.as : undefined;
        default:
            return undefined;
    }
}

/**
 * Whether two byte arrays hold the same elements.
 * @param a - One.
 * @param b - The other.
 * @returns True when equal.
 */
function sameBytes(a: Bytes, b: Bytes): boolean {
    for (let index = 0; index < a.length; index++) {
        if (a[index] !== b[index]) {
            return false;
        }
    }

    return true;
}

/**
 * Fold one step into its branch.
 * @param op - The verb.
 * @param current - The branch so far.
 * @param matches - What the step matched on the side, or null when silent.
 * @param base - The base on the side.
 * @returns The branch after the step.
 */
function apply(op: UnionStep["op"], current: Bytes, matches: Bytes | null, base: Bytes): Bytes {
    if (matches === null) {
        // A step silent on the side is the identity for Keep and Except and adds nothing for Add.
        return current;
    }

    const next = new Uint8Array(current.length);
    for (let index = 0; index < current.length; index++) {
        if (op === "add") {
            next[index] = current[index] | (matches[index] & base[index]);
        } else if (op === "keep") {
            next[index] = current[index] & matches[index];
        } else {
            next[index] = current[index] & (matches[index] ^ 1);
        }
    }

    return next;
}

/**
 * The family a verb belongs to: Add grows a branch, Keep and Except narrow it.
 * @param op - The verb.
 * @returns Its family.
 */
function familyOf(op: UnionStep["op"]): "grow" | "narrow" {
    return op === "add" ? "grow" : "narrow";
}

/**
 * Read a union leaf: every branch folded from its start, step by step, with each step's state,
 * reason, input, matches and result, and the total over the ready branches that are on.
 * @param leaf - The leaf.
 * @param env - What it reads.
 * @returns The reading.
 */
export function readUnion(leaf: UnionLeaf, env: UnionEnv): UnionRead {
    const { side } = leaf;
    const halves = env.base(leaf.within);
    const base = side === "nodes" ? halves.node : halves.edge;
    const total = new Uint8Array(base.length);
    const painted = new Uint8Array(base.length);
    const fold: FoldContext = { leaf, env, base, halves };
    const branches = leaf.branches.map((branch): BranchRead => {
        const read = readBranch(
            branch.start === "all" ? base.slice() : new Uint8Array(base.length),
            branch.steps,
            fold,
        );
        const on = branch.on !== false;
        const pending = read.state === "pending";
        const kept = pending && branch.id !== undefined ? env.held?.(branch.id) : undefined;
        const held = kept?.length === base.length ? kept : undefined;
        // A pending branch shows its last ready members, or none: never a half-folded result.
        const members = pending ? (held ?? new Uint8Array(base.length)) : read.members;
        if (on && !pending) {
            orInto(total, members);
        }

        if (on) {
            orInto(painted, members);
        }

        return {
            id: branch.id,
            color: branch.color,
            ...read,
            members,
            held: held !== undefined,
            state: on ? read.state : "off",
        };
    });

    return { side, base, total, painted, branches };
}

/**
 * Add one set of bytes into another.
 * @param into - What grows.
 * @param from - What it takes.
 */
function orInto(into: Bytes, from: Bytes): void {
    for (let index = 0; index < into.length; index++) {
        into[index] |= from[index];
    }
}

/** What folding one branch reads. */
interface FoldContext {
    readonly leaf: UnionLeaf;
    readonly env: UnionEnv;
    /** The base on the leaf's side. */
    readonly base: Bytes;
    /** The base's two halves. */
    readonly halves: { readonly node: Bytes; readonly edge: Bytes };
}

/**
 * Fold one branch's steps from its start.
 * @param start - The branch's start.
 * @param steps - Its steps.
 * @param fold - What the fold reads.
 * @returns The branch's state, reason, members and steps.
 */
function readBranch(
    start: Bytes,
    steps: readonly UnionStep[],
    fold: FoldContext,
): Pick<BranchRead, "state" | "reason" | "members" | "steps"> {
    // ponytail: one pass per branch; a long branch recompiles every step on any input change.
    let current = start;
    let waiting: { readonly id: string | undefined; readonly reason: CodedFact } | null = null;
    const seen = { grow: false, narrow: false };
    const read = steps.map((step): StepRead => {
        const input = current;
        const idle = { id: step.id, input, matches: null, members: input, orderMatters: false };
        if (step.on === false) {
            return { ...idle, state: "off", reason: null };
        }

        if (waiting !== null) {
            return { ...idle, state: "pending", reason: { code: "waits-for", params: { step: waiting.id ?? null } } };
        }

        const inert = inertReason(step.rule);
        if (inert !== null) {
            // A measure with no test yet still asks for its run (under the run limits), so a
            // picker can show the values its test will be set from. It stays inert either way.
            if (step.rule.kind === "measure" && step.rule.test === undefined) {
                fold.env.gate?.(step, frameOf(step, input, fold));
            }

            return { ...idle, state: "inert", reason: inert };
        }

        const frame = frameOf(step, input, fold);
        const gate = fold.env.gate?.(step, frame) ?? null;
        if (gate?.state === "pending") {
            waiting = { id: step.id, reason: gate.reason };
            return { ...idle, state: "pending", reason: gate.reason };
        }

        if (gate?.state === "inert") {
            return { ...idle, state: "inert", reason: gate.reason };
        }

        const family = familyOf(step.op);
        const soFar = step.computedOn === "so-far" && !sameBytes(input, fold.base);
        const orderMatters = soFar || seen[family === "grow" ? "narrow" : "grow"];
        seen[family] = true;
        const matches =
            gate === null
                ? onSide(
                      fold.env.compile(step.rule, frame),
                      fold.leaf.side,
                      step.ends,
                      fold.env.graph,
                      fold.halves.edge,
                  )
                : new Uint8Array(input.length);
        current = apply(step.op, input, matches, fold.base);

        return {
            id: step.id,
            state: "applied",
            reason: gate === null ? noteOf(step, input, frame, fold) : gate.reason,
            input,
            matches,
            members: current,
            orderMatters,
        };
    });

    if (waiting !== null) {
        return { state: "pending", reason: (waiting as { reason: CodedFact }).reason, members: current, steps: read };
    }

    return { state: "ready", reason: null, members: current, steps: read };
}

/**
 * A step's frame: what `"so-far"` names and what its populations are.
 * @param step - The step.
 * @param input - Its input.
 * @param fold - What the fold reads.
 * @returns The frame.
 */
function frameOf(step: UnionStep, input: Bytes, fold: FoldContext): StepFrame {
    const nodesSide = fold.leaf.side === "nodes";
    const soFar = nodesSide ? input : endsOf(fold.env.graph, input);
    const { within } = fold.leaf;
    const reference = (to: StepReference): Bytes => (to === "so-far" ? soFar : fold.env.reference(to));
    if (step.computedOn === "so-far") {
        return {
            within,
            soFar,
            reference,
            population: nodesSide ? { node: input, edge: null } : { node: null, edge: input },
            base: fold.halves,
        };
    }

    const whole = within === "graph";

    return {
        within,
        soFar,
        reference,
        population: whole ? { node: null, edge: null } : fold.halves,
        base: fold.halves,
    };
}

/**
 * A note on an applied step: its input was empty, or its reference holds no node.
 * @param step - The step.
 * @param input - Its input.
 * @param frame - Its frame.
 * @param fold - What the fold reads.
 * @returns The note, or null.
 */
function noteOf(step: UnionStep, input: Bytes, frame: StepFrame, fold: FoldContext): CodedFact | null {
    const reference = referenceOf(step.rule);
    if (reference !== undefined) {
        const nodes = reference === "so-far" ? frame.soFar : fold.env.reference(reference);
        if (countOf(nodes) === 0) {
            return { code: "reference-empty", params: {} };
        }
    }

    if ((step.op !== "add" || step.computedOn === "so-far") && countOf(input) === 0) {
        return { code: "input-empty", params: {} };
    }

    if (step.frozenFrom !== undefined) {
        return { code: "frozen-from", params: { reference: step.frozenFrom } };
    }

    return null;
}

/**
 * The nodes at most `max` hops from some seeds, the seeds included; every node they reach when
 * `max` is absent. `"out"` follows arcs forward, `"in"` backward, `"all"` (default) either way.
 * @param graph - The snapshot.
 * @param seeds - The seeds.
 * @param max - The hop limit, or undefined for none.
 * @param direction - Which way arcs are followed.
 * @param base - The nodes and edges a walk may use; every one when absent.
 * @param base.node - The nodes it may step onto.
 * @param base.edge - The edges it may step along.
 * @returns The nodes.
 */
export function hopsFrom(
    graph: GraphSnapshot,
    seeds: Bytes,
    max: number | undefined,
    direction: SelectionDirection | undefined,
    base?: { readonly node: Bytes; readonly edge: Bytes },
): Bytes {
    const reached = seeds.slice();
    // An arc is walked only when its edge and its far node are in the base.
    const inBase = (edge: number, other: number): boolean =>
        base === undefined || (base.edge[edge] === 1 && base.node[other] === 1);
    const { arcToEdge } = graph;
    const reverse = graph.reverse();
    let frontier: number[] = [];
    for (let index = 0; index < graph.nodeCount; index++) {
        if (seeds[index] === 1) {
            frontier.push(index);
        }
    }

    const forward = { rowPtr: graph.rowPtr, colIdx: graph.colIdx, edge: (arc: number) => arcToEdge[arc] };
    const backward = {
        rowPtr: reverse.rowPtr,
        colIdx: reverse.colIdx,
        edge: (arc: number) => arcToEdge[reverse.fwdArc[arc]],
    };
    const views = { out: [forward], in: [backward], all: [forward, backward] }[direction ?? "all"];
    const limit = max ?? Number.POSITIVE_INFINITY;
    for (let hop = 0; hop < limit && frontier.length > 0; hop++) {
        const next: number[] = [];
        for (const node of frontier) {
            for (const view of views) {
                for (let arc = view.rowPtr[node]; arc < view.rowPtr[node + 1]; arc++) {
                    const other = view.colIdx[arc];
                    if (reached[other] === 0 && inBase(view.edge(arc), other)) {
                        reached[other] = 1;
                        next.push(other);
                    }
                }
            }
        }

        frontier = next;
    }

    return reached;
}

/**
 * The edges with `"either"`, `"both"` or exactly `"one"` end in some nodes.
 * @param graph - The snapshot.
 * @param nodes - The nodes.
 * @param ends - How many ends must be in.
 * @param baseEdges - The edges that may pass; every one when absent.
 * @returns The edge test.
 */
export function touchingTest(
    graph: GraphSnapshot,
    nodes: Bytes,
    ends: "either" | "both" | "one",
    baseEdges?: Bytes,
): Test {
    const { src, dst } = graph.edgeList();

    return (edge) => {
        if (baseEdges !== undefined && baseEdges[edge] === 0) {
            return false;
        }
        const inside = nodes[src[edge]] + nodes[dst[edge]];
        return { either: inside > 0, both: inside === 2, one: inside === 1 }[ends];
    };
}
