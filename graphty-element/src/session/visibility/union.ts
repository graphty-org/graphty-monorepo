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
    /** The nodes of the step's input (its branch so far): what `"so-far"` names. */
    readonly soFar: Bytes;
    /**
     * The elements a rank, a share or a category count is taken over: the base, or the step's
     * input when it is computed on `"so-far"`. Null for a half that is whole.
     */
    readonly population: { readonly node: Bytes | null; readonly edge: Bytes | null };
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
     * Whether a step's rule can be evaluated now, or why it waits (a run computing, needed,
     * paused, failed or stale). Absent: every step is ready.
     * @param step - The step.
     * @param frame - Its frame.
     * @returns Null when ready, else the pending reason.
     */
    pending?(step: UnionStep, frame: StepFrame): CodedFact | null;
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
    /** Its members after its last step (or its last ready result, held by a caller). */
    readonly members: Bytes;
    readonly steps: readonly StepRead[];
}

/** A union leaf as {@link readUnion} read it. */
export interface UnionRead {
    readonly side: UnionLeaf["side"];
    /** The base, on the leaf's side. */
    readonly base: Bytes;
    /** Everything in a ready branch that is on. */
    readonly total: Bytes;
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
 * @returns The bytes, or null.
 */
function onSide(halves: Halves, side: UnionLeaf["side"], ends: UnionStep["ends"], graph: GraphSnapshot): Bytes | null {
    if (side === "nodes") {
        if (halves.node !== null) {
            return bytesOf(halves.node, graph.nodeCount);
        }

        return halves.edge === null ? null : endsOf(graph, bytesOf(halves.edge, graph.edgeCount));
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
            return rule.text === "" ? { code: "test-unset", params: {} } : null;
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
    const branches = leaf.branches.map((branch): BranchRead => {
        const read = readBranch(branch.start === "all" ? base.slice() : new Uint8Array(base.length), branch.steps, {
            leaf,
            env,
            base,
            halves,
        });
        const on = branch.on !== false;
        if (on && read.state === "ready") {
            for (let index = 0; index < total.length; index++) {
                total[index] |= read.members[index];
            }
        }

        return { id: branch.id, color: branch.color, ...read, state: on ? read.state : "off" };
    });

    return { side, base, total, branches };
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
            return { ...idle, state: "inert", reason: inert };
        }

        const frame = frameOf(step, input, fold);
        const pending = fold.env.pending?.(step, frame) ?? null;
        if (pending !== null) {
            waiting = { id: step.id, reason: pending };
            return { ...idle, state: "pending", reason: pending };
        }

        const family = familyOf(step.op);
        const soFar = step.computedOn === "so-far" && !sameBytes(input, fold.base);
        const orderMatters = soFar || seen[family === "grow" ? "narrow" : "grow"];
        seen[family] = true;
        const matches = onSide(fold.env.compile(step.rule, frame), fold.leaf.side, step.ends, fold.env.graph);
        current = apply(step.op, input, matches, fold.base);

        return {
            id: step.id,
            state: "applied",
            reason: noteOf(step, input, frame, fold),
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
    if (step.computedOn === "so-far") {
        return { soFar, population: nodesSide ? { node: input, edge: null } : { node: null, edge: input } };
    }

    const whole = fold.leaf.within === "graph";

    return { soFar, population: whole ? { node: null, edge: null } : fold.halves };
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
 * @returns The nodes.
 */
export function hopsFrom(
    graph: GraphSnapshot,
    seeds: Bytes,
    max: number | undefined,
    direction: SelectionDirection | undefined,
): Bytes {
    const reached = seeds.slice();
    let frontier: number[] = [];
    for (let index = 0; index < graph.nodeCount; index++) {
        if (seeds[index] === 1) {
            frontier.push(index);
        }
    }

    const views = { out: [graph], in: [graph.reverse()], all: [graph, graph.reverse()] }[direction ?? "all"];
    const limit = max ?? Number.POSITIVE_INFINITY;
    for (let hop = 0; hop < limit && frontier.length > 0; hop++) {
        const next: number[] = [];
        for (const node of frontier) {
            for (const view of views) {
                for (let arc = view.rowPtr[node]; arc < view.rowPtr[node + 1]; arc++) {
                    const other = view.colIdx[arc];
                    if (reached[other] === 0) {
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
 * @returns The edge test.
 */
export function touchingTest(graph: GraphSnapshot, nodes: Bytes, ends: "either" | "both" | "one"): Test {
    const { src, dst } = graph.edgeList();

    return (edge) => {
        const inside = nodes[src[edge]] + nodes[dst[edge]];
        return { either: inside > 0, both: inside === 2, one: inside === 1 }[ends];
    };
}
