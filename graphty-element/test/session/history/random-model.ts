/**
 * @file The random-sequence model of the history, shared by the Node run
 * (`random-sequences.test.ts`, on a headless session with a fake layout) and the browser run
 * (`test/browser/history-random.test.ts`, on a real `Graph` with a real simulation). See
 * design/undo/undo-design.md section 12.5.
 *
 * Whatever the order of edits, transactions, pending work, undos, redos and restores, the state
 * at every history position is the state sealed for it, undoing everything returns to the start,
 * and redoing everything returns to the end.
 *
 * Checked around every command: before it, the live state digest equals the digest recorded for
 * the current position, so a change that records no step fails at the next command; after every
 * history move, the digest equals the one sealed for the position reached. The one exception is
 * an open transaction that has written: its writes are in the live state and in no step, so
 * while it is open the model allows only what ends it or cancels it.
 *
 * Pending work outlives the command that dispatched it: a data edit or an import whose turn on
 * the queue is held, a run whose completion is held, an open transaction, and a run a
 * transaction started as a deferred member. The model follows the committed order it observes
 * (design section 4.1): a step appears when the model releases the work, and the model predicts
 * what each undo, redo and restore cancels by the rules of design section 6.1 -- the newest
 * pending work dispatched after the step (or deferred from it), an open transaction whose graph
 * writes are in the step's way, and every later-dispatched item that shares a key with one
 * cancelled.
 *
 * The layout moves the lane only when told to. The model keeps the arrangement the way design
 * section 6.4 defines it -- a capture sealed into a position at each rest point and before each
 * history move, and the rows each placement wrote -- and after every history move the lane must
 * hold A(position): after(k) when the step has a capture, otherwise before(k) or A(k-1) with the
 * step's placed rows over it; and an undo of step k restores before(k) when the step took one.
 * Eviction is observed rather than predicted, by step id: evicted steps are the oldest done ones
 * and the farthest redo ones, and the oldest evicted steps' arrangements fold into the baseline.
 */

import fc from "fast-check";
import { assert } from "vitest";

import type { LayerSpec } from "../../../src/catalog/types";
import { dispatcherOf } from "../../../src/session/GraphSession";
import type { SessionCommand } from "../../../src/session/planning";
import { stateDigest } from "../../../src/session/project/digest";
import type { GraphSession, HistoryOutcome, HistoryStepId, PendingId } from "../../../src/session/types";
import type { HeldQueue, RunGate } from "./fakes";
import { SKYBOX_PNG } from "./fixtures";

/** The history's coalescing window. */
export const COALESCE_MS = 1000;

/** Coordinates by node id, as `x,y,z`. */
type Coords = ReadonlyMap<string, string>;

/** A layout the model can drive: the fake in Node, the real simulation in the browser. */
export interface ModelLayout {
    /** Whether it is playing. */
    readonly running: boolean;
    /** Play. */
    play(): void;
    /** One frame, which moves nothing unless it is playing. */
    step(): void;
    /** Come to rest: a rest point. */
    settle(): void | Promise<void>;
}

/** What the commands act on. */
export interface Real {
    readonly session: GraphSession;
    readonly clock: { now(): number; advance(ms: number): void };
    readonly layout: ModelLayout;
    /** Holds queued turns; absent where the model cannot hold them. */
    readonly queue?: HeldQueue;
    /** Holds runs' completion; absent where the model cannot hold it. */
    readonly runs?: RunGate;
    /**
     * The layout a generated layout choice stands for, where the system should draw it with
     * another: the browser run keeps to engines that move nodes only when a frame is stepped.
     */
    readonly layoutFor?: (id: string) => { readonly id: string; readonly engine: string };
}

/** One history position the model knows; index 0 is the baseline. */
interface Position {
    /** The step's id; null for the baseline. */
    id: HistoryStepId | null;
    /** The state digest sealed for it. */
    digest: string;
    /** The visible node and edge ids there. */
    visible: string;
    /** The capture sealed into it, by node id. */
    arr: Coords | null;
    /** The rows its placements wrote, while it holds no capture. */
    rows: Coords | null;
    /** The rows placements merged into it wrote after it took its capture. */
    late: Coords | null;
    /**
     * The nodes its step brought into the graph. A capture taken before a node was added says
     * nothing about where the new one is, even when an earlier node had its id.
     */
    fresh: ReadonlySet<string> | null;
    /** The arrangement its step began from, when it took one. */
    before: Coords | null;
    /** When it was recorded, or last merged into, on the model's clock of events. */
    recordedAt: number;
    /** When it was last undone. */
    undoneAt: number;
    /** Whether its step wrote the graph. */
    graph: boolean;
    /** Whether its step added or removed nodes or edges, which sets a running layout moving. */
    reshapes: boolean;
}

/** Work dispatched and not yet committed. */
interface Pending {
    /** Its id in `history.pending`. */
    readonly id: PendingId;
    /** When it was dispatched, on the model's clock of events. */
    readonly seq: number;
    /** Which pending work shares keys with it: every graph writer shares, and every run. */
    readonly family: "graph" | "runs" | "tx";
    /** For a deferred member, the step it belongs to. */
    readonly after: HistoryStepId | null;
    /** What it is, for messages. */
    label: string;
    /** Gives it its turn, or lets it finish, and settles once it has; null for a transaction. */
    release: (() => Promise<void>) | null;
    /** For queued work, the coalesce key its slot is taken over by. */
    readonly slot: string | null;
    /** How it touches the arrangement when it runs. */
    arranges: Arranges;
    /** The runs it is, which removing one of them cancels. */
    readonly runs: readonly string[];
}

/** An open transaction the model drives through its body. */
interface OpenTx {
    readonly item: Pending;
    /** Whether it has written the graph, and when it took the key. */
    wrote: boolean;
    wroteAt: number;
    /** Where the lane was when it first wrote the graph: its before-arrangement. */
    before: Coords | null;
    /** Lets its body write. */
    readonly write: () => void;
    /** Settles once its body has written, or failed to. */
    readonly written: Promise<void>;
    /** Lets its body end. */
    readonly finish: (throws: boolean) => void;
    /** The transaction. */
    readonly done: Promise<unknown>;
}

/** What the model knows of the history. */
export interface Model {
    steps: Position[];
    position: number;
    /** The coalesce key of the top step, while the next edit could still merge into it. */
    mergeKey: string | null;
    /** When the top step last took an edit. */
    lastAt: number;
    /** Whether the top step may still take a merge: false once the cursor moved. */
    mergeable: boolean;
    /** Whether the layout has moved the lane since the last capture. */
    moved: boolean;
    /** The model's clock of events, which orders dispatches against records and undos. */
    tick: number;
    /** Pending work, in dispatch order. */
    pending: Pending[];
    /** The open transaction, when there is one. */
    tx: OpenTx | null;
    /** How many nodes and runs the commands have named, for fresh ids. */
    added: number;
    /** The ids of the runs the commands started, which a removal may name. */
    runIds: string[];
    /** What this system lets the model hold. */
    readonly can: { readonly queue: boolean; readonly runs: boolean };
}

type Command = fc.AsyncCommand<Model, Real>;

/**
 * The live state digest.
 * @param real - The system.
 * @returns The digest.
 */
export function live(real: Real): string {
    return stateDigest(dispatcherOf(real.session).state, { snapshot: real.session.snapshot() });
}

/**
 * The visible ids, once the masks have caught up.
 * @param real - The system.
 * @returns Their canonical text.
 */
function shown(real: Real): string {
    const { visibility } = real.session;
    return JSON.stringify([[...visibility.nodes].map(String).sort(), [...visibility.edges].map(String).sort()]);
}

/**
 * The lane: every node's coordinates, by id.
 * @param real - The system.
 * @returns The coordinates.
 */
export function laneOf(real: Real): Map<string, string> {
    const snapshot = real.session.snapshot();
    const at = { x: 0, y: 0, z: 0 };
    const out = new Map<string, string>();
    for (let row = 0; row < snapshot.nodeCount; row++) {
        real.session.positions.read(row, at);
        out.set(String(snapshot.ids.idOf(row)), `${String(at.x)},${String(at.y)},${String(at.z)}`);
    }

    return out;
}

/**
 * The model of a system as it is now: its state is the baseline.
 * @param real - The system.
 * @returns The model.
 */
export function baselineModel(real: Real): Model {
    return {
        steps: [position(real, null, 0)],
        position: 0,
        mergeKey: null,
        lastAt: 0,
        mergeable: false,
        moved: false,
        tick: 1,
        pending: [],
        tx: null,
        added: 0,
        runIds: ["deg", "route", "fresh"],
        can: { queue: real.queue !== undefined, runs: real.runs !== undefined },
    };
}

/**
 * A position holding the live state and the lane.
 * @param real - The system.
 * @param id - The step's id.
 * @param at - When it was recorded.
 * @returns The position.
 */
function position(real: Real, id: HistoryStepId | null, at: number): Position {
    return {
        id,
        digest: live(real),
        visible: shown(real),
        arr: laneOf(real),
        rows: null,
        late: null,
        fresh: null,
        before: null,
        recordedAt: at,
        undoneAt: -1,
        graph: false,
        reshapes: false,
    };
}

/**
 * The model of a system whose history holds steps it did not see recorded: every one of them is
 * taken to end at the state and the lane as they are now, which is right for the one step a
 * first load after mount records.
 * @param real - The system.
 * @param before - The baseline's digest, visible ids and lane.
 * @param before.digest - Its digest.
 * @param before.visible - Its visible ids.
 * @param before.lane - Its lane.
 * @returns The model.
 */
export function modelAfterLoad(real: Real, before: { digest: string; visible: string; lane: Coords }): Model {
    const model = baselineModel(real);
    model.steps[0] = { ...model.steps[0], digest: before.digest, visible: before.visible, arr: before.lane };
    for (const step of real.session.history.steps) {
        model.steps.push({ ...position(real, step.id, model.tick++), graph: step.slices.includes("graph") });
    }

    model.position = real.session.history.position;
    return model;
}

/**
 * A(position): the arrangement the model says the lane holds there. A capture, or else the step's
 * before-arrangement or A(position - 1), says nothing about the nodes the step brought in.
 * @param model - The model.
 * @param at - The position.
 * @returns The coordinates it knows, by id.
 */
function arrangementAt(model: Model, at: number): Map<string, string> {
    const step = model.steps[at];
    if (at === 0 || step.arr !== null) {
        return overlay(new Map(step.arr ?? []), step.late);
    }

    const out = step.before === null ? arrangementAt(model, at - 1) : new Map(step.before);
    for (const id of step.fresh ?? []) {
        out.delete(id);
    }

    return overlay(out, step.rows);
}

/**
 * Write rows over coordinates.
 * @param out - The coordinates, written in place.
 * @param rows - The rows, or null.
 * @returns `out`.
 */
function overlay(out: Map<string, string>, rows: Coords | null): Map<string, string> {
    for (const [id, value] of rows ?? []) {
        out.set(id, value);
    }

    return out;
}

/**
 * What the lane holds after a history move lands on `at`: an undo of the step above restores the
 * arrangement that step began from, when it took one, and A(at) otherwise.
 * @param model - The model.
 * @param at - Where the move landed.
 * @param from - Where it started.
 * @returns The coordinates it knows, by id.
 */
function landedAt(model: Model, at: number, from: number): Map<string, string> {
    const before = from > at ? model.steps[at + 1].before : null;
    return before === null ? arrangementAt(model, at) : new Map(before);
}

/**
 * Follow the undo of the steps at `from` down to `to + 1`: each is marked undone, and one that
 * began from an arrangement of its own leaves that arrangement as the end of the position below
 * it, where the lane now holds it.
 * @param model - The model, with the positions as they were before any eviction the move caused.
 * @param from - Where the move started.
 * @param to - Where it landed.
 */
function undoPassed(model: Model, from: number, to: number): void {
    for (let at = from; at > to; at--) {
        const step = model.steps[at];
        step.undoneAt = model.tick++;
        if (step.before !== null) {
            const below = model.steps[at - 1];
            below.arr = new Map(step.before);
            below.late = null;
        }
    }
}

/**
 * Follow eviction, by step id: the steps the history dropped must be the oldest ones and the
 * farthest redo ones; the oldest fold into the baseline, arrangement and all.
 * @param model - The model.
 * @param real - The system.
 * @param when - What just happened, for the message.
 * @returns How many of the oldest steps went.
 */
function followEviction(model: Model, real: Real, when: string): number {
    const { history } = real.session;
    const ids = history.steps.map((step) => step.id);
    const known = model.steps.slice(1).map((step) => step.id);
    if (ids.length === known.length) {
        assert.deepEqual(ids, known, `${when}: the steps`);
        return 0;
    }

    const oldest = ids.length === 0 ? known.length : known.indexOf(ids[0]);
    assert.isAtLeast(oldest, 0, `${when}: a step the model never saw recorded`);
    assert.deepEqual(known.slice(oldest, oldest + ids.length), ids, `${when}: eviction keeps a run of steps`);
    if (oldest > 0) {
        const baseline = arrangementAt(model, oldest);
        model.steps = [
            { ...model.steps[oldest], id: null, arr: baseline, rows: null, late: null, fresh: null, before: null },
            ...model.steps.slice(oldest + 1),
        ];
        model.position -= oldest;
    }

    model.steps.length = ids.length + 1;
    assert.isAtMost(history.steps.length, history.limitSteps, `${when}: within the step limit`);
    return oldest;
}

/**
 * Seal the lane into the model's position when the layout has moved it, as a rest point or a
 * history call does.
 * @param model - The model.
 * @param real - The system.
 */
function sealModel(model: Model, real: Real): void {
    if (model.moved) {
        const step = model.steps[sealTarget(model, model.position)];
        step.arr = laneOf(real);
        step.late = null;
        model.moved = false;
    }
}

/**
 * Where a rest point seals: the newest position at or below `at` whose step has to do with the
 * arrangement -- it holds a capture or placed rows, took a before-arrangement, or reshaped the
 * graph -- or the baseline. A step that moved nothing never takes the capture.
 * @param model - The model.
 * @param at - The position to look down from.
 * @returns The position.
 */
function sealTarget(model: Model, at: number): number {
    let index = at;
    while (index > 0) {
        const step = model.steps[index];
        if (step.reshapes || step.arr !== null || step.rows !== null || step.late !== null || step.before !== null) {
            return index;
        }

        index--;
    }

    return 0;
}

/**
 * The graph's shape: its node ids and how many edges it holds.
 * @param real - The system.
 * @returns A string that changes when a node or an edge is added or removed.
 */
function shapeOf(real: Real): string {
    const snapshot = real.session.snapshot();
    return `${[...laneOf(real).keys()].sort().join(",")}|${String(snapshot.edgeCount)}`;
}

/**
 * Whether a node the lane held before is somewhere else now.
 * @param before - The lane before.
 * @param after - The lane now.
 * @returns True when one moved.
 */
function moved(before: Coords, after: Coords): boolean {
    return [...before].some(([id, value]) => after.has(id) && after.get(id) !== value);
}

/**
 * The nodes the graph holds now and did not before.
 * @param real - The system.
 * @param before - The ids it held.
 * @returns The new ones.
 */
function freshSince(real: Real, before: ReadonlySet<string>): ReadonlySet<string> {
    return new Set([...laneOf(real).keys()].filter((id) => !before.has(id)));
}

/**
 * Whether the live state is one a step sealed: false while an open transaction has written.
 * @param model - The model.
 * @returns True when it is.
 */
function sealed(model: Model): boolean {
    return model.tx?.wrote !== true;
}

/**
 * Fail unless the lane holds A(position) for every node the model knows and the graph holds.
 * @param model - The model.
 * @param real - The system.
 * @param when - What just happened, for the message.
 * @param expected - The arrangement expected; A(position) by default.
 */
function expectArrangement(
    model: Model,
    real: Real,
    when: string,
    expected: Map<string, string> = arrangementAt(model, model.position),
): void {
    if (model.moved) {
        // The layout has moved the lane since the last capture and nothing has restored it: it
        // is in flight, and the next rest point or history move seals it.
        return;
    }

    const lane = laneOf(real);
    for (const [id, value] of expected) {
        if (lane.has(id)) {
            assert.strictEqual(lane.get(id), value, `${when}: node ${id} at position ${String(model.position)}`);
        }
    }
}

/**
 * Fail unless the live state is the one sealed for the model's position, the history agrees
 * with the model about its steps and pending work, and it is inside its budget.
 * @param model - The model.
 * @param real - The system.
 * @param when - What just happened, for the message.
 */
function expectSealed(model: Model, real: Real, when: string): void {
    followEviction(model, real, when);
    const { history } = real.session;
    assert.strictEqual(history.position, model.position, `${when}: the cursor`);
    assert.deepEqual(
        history.pending.map((each) => each.id),
        model.pending.map((each) => each.id),
        `${when}: the pending work`,
    );
    if (sealed(model)) {
        assert.strictEqual(
            live(real),
            model.steps[model.position].digest,
            `${when}: the state at ${String(model.position)}`,
        );
    }

    const protectedSteps = (model.position > 0 ? 1 : 0) + (model.position < history.steps.length ? 1 : 0);
    assert.isTrue(
        history.bytes <= history.limitBytes || history.steps.length <= protectedSteps,
        `${when}: ${String(history.bytes)} bytes held over a limit of ${String(history.limitBytes)}`,
    );
}

/**
 * Push a step the history just recorded at the cursor, emptying the redo tail.
 * @param model - The model.
 * @param real - The system.
 * @param fields - What the model knows of how it arranges.
 */
function pushStep(model: Model, real: Real, fields: Partial<Position>): void {
    const { history } = real.session;
    const top = history.steps[history.position - 1];
    model.steps = [
        ...model.steps.slice(0, model.position + 1),
        {
            ...position(real, top.id, model.tick++),
            arr: null,
            graph: top.slices.includes("graph"),
            ...fields,
        },
    ];
    model.position++;
}

/** How an edit touches the arrangement. */
interface Arranges {
    /** It takes a before-arrangement as it starts: an import, an expansion, a clear, a batch. */
    readonly moves?: boolean;
    /** It begins a new dataset, and its step ends at the new graph's own coordinates. */
    readonly replaces?: boolean;
    /** It brings the layout to rest while its group is open. */
    readonly rests?: boolean;
}

/** What an edit may do to the top step besides recording one. */
interface Merges {
    /** Its coalesce key, or null. */
    readonly key: string | null;
    /** For a deferred member: the step it merges into when that step is on top and applied. */
    readonly into?: HistoryStepId | null;
}

/**
 * Follow one edit: it either recorded a step, merged into the top one, changed nothing, or was
 * refused -- and the history must say which, and agree with the coalescing rule.
 * @param model - The model.
 * @param real - The system.
 * @param label - The edit, for messages.
 * @param merges - How it may merge.
 * @param act - The edit.
 * @param arranges - How it touches the arrangement.
 * @returns What it did.
 */
async function edit(
    model: Model,
    real: Real,
    label: string,
    merges: Merges,
    act: () => PromiseLike<unknown>,
    arranges: Arranges = {},
): Promise<"record" | "merge" | "none"> {
    expectSealed(model, real, `before ${label}`);
    const { history } = real.session;
    const top = history.steps[history.position - 1]?.id;
    const held = new Set(laneOf(real).keys());
    const shape = shapeOf(real);
    const moves = arranges.moves === true || arranges.replaces === true || arranges.rests === true;
    let before: Coords | null = null;
    if (moves) {
        // Where the lane is when the group begins is sealed into the step below, and is the
        // group's before-arrangement.
        sealModel(model, real);
        before = laneOf(real);
    }

    let refused = false;
    try {
        await act();
    } catch {
        refused = true;
    }

    const now = real.clock.now();
    const recorded = history.position > 0 && history.steps[history.position - 1]?.id !== top;
    if (recorded) {
        assert.isFalse(refused, `${label} was refused and recorded a step`);
        pushStep(model, real, { fresh: freshSince(real, held), before, reshapes: shapeOf(real) !== shape });
        model.mergeKey = merges.key;
        model.lastAt = now;
        model.mergeable = true;
        if (arranges.replaces === true || arranges.rests === true) {
            // Sealed at its commit, or where the layout came to rest while it was open.
            model.steps[model.position].arr = laneOf(real);
            model.moved = false;
        } else if (before !== null && moved(before, laneOf(real))) {
            // A layout that placed the nodes as the command ran: at rest, that is where its step
            // ends; still running, the nodes are in flight, and the next seal gives them to it.
            if (real.layout.running) {
                model.moved = true;
            } else {
                model.steps[model.position].arr = laneOf(real);
            }
        }

        followEviction(model, real, `${label} recorded`);
        assert.strictEqual(history.position, model.position, `${label}: the cursor after recording`);
        assert.lengthOf(history.steps, model.steps.length - 1, `${label}: recording empties the redo tail`);
        return "record";
    }

    if (arranges.rests === true) {
        // Rolled back, the lane is back where the group began; closed with nothing recorded,
        // where it came to rest is the top step's.
        if (!refused) {
            const target = model.steps[sealTarget(model, model.position)];
            target.arr = laneOf(real);
            target.late = null;
        }

        model.moved = false;
    }

    // A capture sealed as the group began is re-estimated, which may evict.
    followEviction(model, real, label);
    assert.strictEqual(history.position, model.position, `${label} moved the cursor by more than one`);
    assert.lengthOf(history.steps, model.steps.length - 1, `${label} changed the history without recording`);
    const coalesces =
        merges.key !== null && model.mergeable && model.mergeKey === merges.key && now - model.lastAt < COALESCE_MS;
    const amends =
        merges.into !== undefined &&
        merges.into !== null &&
        model.position === model.steps.length - 1 &&
        model.steps[model.position].id === merges.into;
    if (!refused && (coalesces || amends)) {
        const step = model.steps[model.position];
        step.digest = live(real);
        step.visible = shown(real);
        step.fresh = new Set([...(step.fresh ?? []), ...freshSince(real, held)]);
        step.recordedAt = model.tick++;
        step.graph ||= history.steps[history.position - 1].slices.includes("graph");
        step.reshapes ||= shapeOf(real) !== shape;
        if (coalesces) {
            model.lastAt = now;
        }

        return "merge";
    }

    expectSealed(model, real, `${label} recorded nothing, so it changed nothing`);
    return "none";
}

/**
 * The pending work a set cancelled takes with it: every later-dispatched item sharing a key.
 * @param model - The model.
 * @param roots - The items cancelled.
 * @returns Them and their dependents, in dispatch order.
 */
function cascade(model: Model, roots: readonly Pending[]): Pending[] {
    const out = new Set(roots);
    for (const item of model.pending) {
        if (!out.has(item) && [...out].some((earlier) => earlier.seq < item.seq && earlier.family === item.family)) {
            out.add(item);
        }
    }

    return model.pending.filter((item) => out.has(item));
}

/**
 * What an undo or a redo would act on (design section 6.1).
 * @param model - The model.
 * @param direction - Which.
 * @param target - The position of the step it would pass.
 * @returns The pending work to cancel, "step" to move over the step, or null for nothing.
 */
function plan(model: Model, direction: "undo" | "redo", target: number): Pending[] | "step" | null {
    const step = target >= 1 && target < model.steps.length ? model.steps[target] : undefined;
    if (direction === "redo" && step === undefined) {
        return null;
    }

    const since = (direction === "undo" ? step?.recordedAt : step?.undoneAt) ?? -1;
    // Rule 0: an open transaction holding graph rows the step touched.
    const { tx } = model;
    if (step?.graph === true && tx?.wrote === true && model.pending.includes(tx.item)) {
        return cascade(model, [tx.item]);
    }

    // Rule 1: pending work newer than the step, or deferred from it.
    const newer = model.pending.filter(
        (item) => item.seq > since || (direction === "undo" && step !== undefined && item.after === step.id),
    );
    const newest = newer.at(-1);
    if (newest !== undefined) {
        return cascade(model, [newest]);
    }

    return step === undefined ? null : "step";
}

/**
 * Drop cancelled work from the model, and check the history cancelled exactly it.
 * @param model - The model.
 * @param cancelled - The items.
 * @param reported - What the history said it cancelled.
 * @param when - What happened, for the message.
 */
function dropCancelled(
    model: Model,
    cancelled: readonly Pending[],
    reported: readonly { id: string }[],
    when: string,
): void {
    assert.deepEqual(
        reported.map((each) => each.id),
        cancelled.map((each) => each.id),
        `${when}: the pending work cancelled`,
    );
    model.pending = model.pending.filter((item) => !cancelled.includes(item));
    if (model.tx !== null && cancelled.includes(model.tx.item)) {
        // Aborted: its writes are rolled back, and its body stays stuck until the end.
        model.tx.wrote = false;
    }
}

/**
 * Take note of work a dispatch left pending: the newest item in `history.pending`, or none when
 * it coalesced into a slot already waiting.
 * @param model - The model.
 * @param real - The system.
 * @param item - What the model knows of it.
 * @returns The item, or null.
 */
function notePending(model: Model, real: Real, item: Omit<Pending, "id" | "seq" | "label">): Pending | null {
    const known = new Set(model.pending.map((each) => each.id));
    const fresh = real.session.history.pending.filter((each) => !known.has(each.id));
    assert.isAtMost(fresh.length, 1, "one dispatch left one item pending");
    const [view] = fresh;
    if (view === undefined) {
        return null;
    }

    const pending: Pending = { ...item, id: view.id, label: view.label, seq: model.tick++ };
    model.pending.push(pending);
    return pending;
}

/**
 * A layer painting every node one colour.
 * @param name - Its name.
 * @param color - Its colour.
 * @returns The specification.
 */
function layer(name: string, color: string): LayerSpec {
    return { name, target: "node", selector: { match: "everything" }, set: { "node.color": color } };
}

/**
 * The consumer's layers now, the ones an edit may name.
 * @param real - The system.
 * @returns Their ids.
 */
function editable(real: Real): string[] {
    return real.session.styles
        .list()
        .filter((each) => !each.locked)
        .map((each) => each.id);
}

/**
 * Pick one of a list by a generated number.
 * @param list - The list.
 * @param pick - The number.
 * @returns The entry, or undefined for an empty list.
 */
function choose<T>(list: readonly T[], pick: number): T | undefined {
    return list.length === 0 ? undefined : list[pick % list.length];
}

/**
 * Whether a reader's own edit may run now: not while an open transaction has written, whose
 * writes are in the live state and no step.
 * @param model - The model.
 * @returns True when it may.
 */
function readerMay(model: Model): boolean {
    return sealed(model);
}

/** A plain edit the model does not need to know the shape of. */
class Edit implements Command {
    constructor(
        private readonly label: string,
        private readonly act: (
            real: Real,
        ) => ({ key: string | null; run: () => PromiseLike<unknown> } & Arranges) | null,
    ) {}

    check(model: Readonly<Model>): boolean {
        return readerMay(model);
    }

    async run(model: Model, real: Real): Promise<void> {
        const planned = this.act(real);
        if (planned === null) {
            expectSealed(model, real, `before ${this.label} (nothing to name)`);
            return;
        }

        await edit(model, real, this.label, { key: planned.key }, planned.run, planned);
    }

    toString(): string {
        return this.label;
    }
}

/**
 * Place nodes the graph holds: seals the lane first when the layout moved it, then records the
 * rows it wrote, or a capture when it wrote more than a third of them.
 */
class Place implements Command {
    constructor(
        private readonly ids: readonly string[],
        private readonly at: number,
    ) {}

    check(model: Readonly<Model>): boolean {
        return readerMay(model);
    }

    async run(model: Model, real: Real): Promise<void> {
        const held = laneOf(real);
        const ids = this.ids.filter((id) => held.has(id));
        if (ids.length === 0) {
            expectSealed(model, real, `before ${this.toString()} (nothing to place)`);
            return;
        }

        sealModel(model, real);
        const entries = ids.map((id, k) => ({ id, x: this.at + k, y: this.at, z: -this.at }));
        const written = new Map(
            entries.map((entry) => [entry.id, `${String(entry.x)},${String(entry.y)},${String(entry.z)}`]),
        );
        const whole = 3 * ids.length > held.size;
        const outcome = await edit(model, real, this.toString(), { key: "positions" }, () =>
            real.session.positions.set(entries),
        );
        const step = model.steps[model.position];
        if (outcome === "none") {
            return;
        }

        if (whole) {
            step.arr = laneOf(real);
            step.late = null;
        } else if (step.arr !== null) {
            step.late = new Map([...(step.late ?? []), ...written]);
        } else {
            step.rows = new Map([...(outcome === "merge" ? (step.rows ?? []) : []), ...written]);
        }

        expectArrangement(model, real, `after ${this.toString()}`);
    }

    toString(): string {
        return `place ${this.ids.join(",")} at ${String(this.at)}`;
    }
}

/**
 * The layout: play it and run a frame, run a frame (which moves nothing unless it is playing), or
 * bring it to rest.
 */
class Layout implements Command {
    constructor(private readonly kind: "play" | "frame" | "settle") {}

    check(model: Readonly<Model>): boolean {
        return readerMay(model);
    }

    async run(model: Model, real: Real): Promise<void> {
        expectSealed(model, real, `before layout ${this.kind}`);
        const { layout } = real;
        if (this.kind === "settle") {
            // A layout still running may move the lane on its way to rest.
            const before = laneOf(real);
            await layout.settle();
            model.moved ||= moved(before, laneOf(real));
            sealModel(model, real);
            // A capture sealed into a step is re-estimated, which may evict.
            followEviction(model, real, "the rest point");
        } else {
            if (this.kind === "play") {
                layout.play();
            }

            model.moved ||= layout.running;
            layout.step();
        }
    }

    toString(): string {
        return `layout ${this.kind}`;
    }
}

/** Undo, and bring the layout to rest before the undo's derivation has run: not a rest point. */
class UndoThenSettle implements Command {
    check(model: Readonly<Model>): boolean {
        return model.pending.length === 0 && readerMay(model);
    }

    async run(model: Model, real: Real): Promise<void> {
        expectSealed(model, real, "before undo then settle");
        if (model.position === 0) {
            // Nothing to undo, so the settle is a rest point like any other.
            await real.session.undo();
            await real.layout.settle();
            sealModel(model, real);
            followEviction(model, real, "the rest point");
            return;
        }

        sealModel(model, real);
        const undone = real.session.undo();
        const settled = real.layout.settle();
        await undone;
        await settled;
        undoPassed(model, model.position, model.position - 1);
        followEviction(model, real, "undo then settle");
        model.position--;
        model.mergeable = false;
        expectSealed(model, real, "after undo then settle");
        expectArrangement(model, real, "after undo then settle", landedAt(model, model.position, model.position + 1));
    }

    toString(): string {
        return "undo then settle";
    }
}

/**
 * Where a move lands, and what it cancels on the way.
 * @param model - The model.
 * @param kind - The move.
 * @param pick - For a restore, the generated target.
 * @returns The pending work it cancels, and the position it lands on.
 */
function predict(model: Model, kind: "undo" | "redo" | "restore", pick: number): { cancel: Pending[]; to: number } {
    const from = model.position;
    const last = model.steps.length - 1;
    if (kind === "undo" || kind === "redo") {
        const decided = plan(model, kind, kind === "undo" ? from : from + 1);
        if (Array.isArray(decided)) {
            return { cancel: decided, to: from };
        }

        return { cancel: [], to: decided === null ? from : from + (kind === "undo" ? -1 : 1) };
    }

    const to = pick % (last + 1);
    if (to === 0) {
        return { cancel: [...model.pending], to };
    }

    // One step at a time for the cancellations, all at once for the state.
    const cancel: Pending[] = [];
    const direction = to < from ? "undo" : "redo";
    const passing = to < from ? range(to + 1, from).reverse() : range(from + 1, to);
    const rest: Model = { ...model, pending: [...model.pending] };
    for (const at of passing) {
        for (let decided = plan(rest, direction, at); Array.isArray(decided); decided = plan(rest, direction, at)) {
            cancel.push(...decided);
            rest.pending = rest.pending.filter((item) => !decided.includes(item));
        }
    }

    return { cancel: model.pending.filter((item) => cancel.includes(item)), to };
}

/**
 * The integers from `a` to `b`, both included.
 * @param a - The first.
 * @param b - The last.
 * @returns Them, ascending.
 */
function range(a: number, b: number): number[] {
    return Array.from({ length: Math.max(0, b - a + 1) }, (_, k) => a + k);
}

/** Undo, redo, a restore, or two undos without awaiting the first. */
class Move implements Command {
    constructor(
        private readonly kind: "undo" | "redo" | "restore" | "undo-twice",
        private readonly pick = 0,
    ) {}

    check(model: Readonly<Model>): boolean {
        if (this.kind === "undo-twice") {
            return model.pending.length === 0 && readerMay(model);
        }

        if (!readerMay(model)) {
            // With an open transaction's writes in the live state, only a move that cancels the
            // transaction first is one the model can check.
            const kind = this.kind === "restore" ? "restore" : this.kind;
            const decided = predict(model as Model, kind, this.pick);
            return model.tx !== null && decided.cancel.includes(model.tx.item) && decided.to === model.position;
        }

        return true;
    }

    async run(model: Model, real: Real): Promise<void> {
        expectSealed(model, real, `before ${this.toString()}`);
        const { session } = real;
        const from = model.position;
        if (this.kind === "undo-twice") {
            await this.twice(model, real);
            return;
        }

        const { cancel, to } = predict(model, this.kind, this.pick);
        if (to !== from) {
            // Sealed before the cursor moves, into the position it leaves.
            sealModel(model, real);
        }

        let outcome: HistoryOutcome;
        if (this.kind === "undo") {
            outcome = await session.undo();
        } else if (this.kind === "redo") {
            outcome = await session.redo();
        } else {
            const target = model.steps[to].id;
            outcome = await session.history.restoreTo(target);
        }

        const done = { undo: "undone", redo: "redone", restore: "restored" } as const;
        let expectedKind: HistoryOutcome["kind"] = "nothing";
        if (to !== from) {
            expectedKind = done[this.kind];
        } else if (cancel.length > 0) {
            expectedKind = "cancelled";
        }

        assert.strictEqual(outcome.kind, expectedKind, `${this.toString()}: what it did`);
        const reported = outcome.kind === "cancelled" ? outcome.pending : [];
        if (outcome.kind !== "cancelled") {
            // A move that also cancelled reports only the steps it passed.
            model.pending = model.pending.filter((item) => !cancel.includes(item));
        } else {
            dropCancelled(model, cancel, reported, this.toString());
        }

        if (model.tx !== null && cancel.includes(model.tx.item)) {
            model.tx.wrote = false;
        }

        // Eviction waits for the cursor to land, so the steps passed are where the model has them.
        undoPassed(model, from, Math.min(from, to));

        const evicted = followEviction(model, real, this.toString());
        const landing = to - evicted;
        const start = from - evicted;
        model.position = landing;
        // A move that did nothing (a redo at the end, an undo at the start) leaves the top step
        // open to a merge; one that moved the cursor closes it.
        if (landing !== start) {
            model.mergeable = false;
        }

        expectSealed(model, real, `after ${this.toString()}`);
        assert.strictEqual(
            shown(real),
            model.steps[model.position].visible,
            `after ${this.toString()}: the visible ids`,
        );
        expectArrangement(model, real, `after ${this.toString()}`, landedAt(model, landing, start));
        if (landing !== start) {
            assert.isFalse(real.layout.running, `${this.toString()} left the layout at rest`);
        }
    }

    /**
     * Two undos, the second called before the first has settled.
     * @param model - The model.
     * @param real - The system.
     */
    private async twice(model: Model, real: Real): Promise<void> {
        const from = model.position;
        if (from > 0) {
            sealModel(model, real);
        }

        const first = real.session.undo();
        const second = real.session.undo();
        await Promise.all([first, second]);
        const to = Math.max(0, from - 2);
        undoPassed(model, from, to);

        const evicted = followEviction(model, real, "undo twice");
        const start = from - evicted;
        const landing = to - evicted;

        model.position = landing;
        if (landing !== start) {
            model.mergeable = false;
        }

        expectSealed(model, real, "after undo twice");
        assert.strictEqual(shown(real), model.steps[model.position].visible, "after undo twice: the visible ids");
        expectArrangement(model, real, "after undo twice", landedAt(model, landing, start));
    }

    toString(): string {
        return this.kind === "restore" ? `restore(${String(this.pick)})` : this.kind;
    }
}

/**
 * Undo from inside a `history:changed` listener: the listener's undo runs after the call that
 * published the change returns, so the edit is recorded and then undone.
 */
class UndoFromListener implements Command {
    constructor(private readonly color: string) {}

    check(model: Readonly<Model>): boolean {
        return model.pending.length === 0 && model.tx === null;
    }

    async run(model: Model, real: Real): Promise<void> {
        expectSealed(model, real, `before ${this.toString()}`);
        const { session } = real;
        let undone: Promise<HistoryOutcome> | null = null;
        let recorded: string | null = null;
        let lane: Coords | null = null;
        const stop = session.on("history:changed", ({ reason }) => {
            if (reason === "record" && undone === null) {
                // The state the step ends at, and the lane, before the listener's undo takes
                // them back.
                recorded = live(real);
                lane = laneOf(real);
                undone = session.undo();
            }
        });
        try {
            await session.styles.add(layer("Listener", this.color));
        } finally {
            stop();
        }

        assert.isNotNull(undone, `${this.toString()}: the listener heard the record`);
        const result = await (undone as unknown as Promise<HistoryOutcome>);
        assert.strictEqual(result.kind, "undone", `${this.toString()}: the listener's undo`);
        const { history } = session;
        const step = history.steps[history.position];
        assert.isDefined(step, `${this.toString()}: the step is in the redo tail`);
        const here = model.steps[model.position];
        model.steps = [
            ...model.steps.slice(0, model.position + 1),
            {
                ...position(real, step.id, model.tick++),
                digest: recorded as unknown as string,
                visible: here.visible,
                arr: null,
            },
        ];
        const above = model.steps[model.position + 1];
        above.undoneAt = model.tick++;
        if (model.moved) {
            // The undo sealed the lane in flight into the seal target it left.
            model.steps[sealTarget(model, model.position + 1)].arr = lane;
            model.moved = false;
        }

        model.mergeable = false;
        expectSealed(model, real, `after ${this.toString()}`);
        expectArrangement(model, real, `after ${this.toString()}`, landedAt(model, model.position, model.position + 1));
    }

    toString(): string {
        return `undo from a listener after adding ${this.color}`;
    }
}

/** Move the clock of the coalescing window. */
class Advance implements Command {
    constructor(private readonly ms: number) {}

    check(): boolean {
        return true;
    }

    run(model: Model, real: Real): Promise<void> {
        expectSealed(model, real, `before advancing ${String(this.ms)} ms`);
        real.clock.advance(this.ms);
        return Promise.resolve();
    }

    toString(): string {
        return `advance(${String(this.ms)})`;
    }
}

/** How a transaction's body behaves. */
type Body = "awaits" | "throws" | "unawaited" | "aborts" | "outside";

/**
 * A transaction adding layers through `tx`, yielding between them. Its body awaits each one,
 * throws after them, dispatches them without awaiting, aborts itself between two of them, or
 * adds a node through `tx` and awaits an outside edit of that node, which must be refused at
 * once rather than wait for the transaction.
 */
class Transaction implements Command {
    constructor(
        private readonly colors: readonly string[],
        private readonly body: Body,
    ) {}

    check(model: Readonly<Model>): boolean {
        return model.tx === null;
    }

    async run(model: Model, real: Real): Promise<void> {
        const { session } = real;
        const node = `t${String(++model.added)}`;
        await edit(
            model,
            real,
            this.toString(),
            { key: null },
            () =>
                session.transaction("Several layers", async (tx) => {
                    for (const [at, color] of this.colors.entries()) {
                        await Promise.resolve();
                        const command: SessionCommand = {
                            op: "style.patch",
                            action: "add",
                            spec: layer(`Tx ${color}`, color),
                        };
                        if (this.body === "unawaited") {
                            void tx.execute(command).catch(() => undefined);
                            continue;
                        }

                        if (this.body === "aborts" && at === 1) {
                            const self = session.history.pending.at(-1);
                            assert.isDefined(self, "the transaction is pending");
                            session.history.cancel(self.id);
                        }

                        await tx.execute(command);
                    }

                    if (this.body === "outside") {
                        await tx.data.addNodes([{ id: node }]);
                        const refused = await session.data.updateNodes([{ id: node, values: { t: 1 } }]).then(
                            () => null,
                            (error: unknown) => (error as { code?: string }).code,
                        );
                        assert.strictEqual(refused, "E_HELD_BY_TRANSACTION", "an outside edit of a held node");
                    }

                    if (this.body === "throws") {
                        throw new Error("The transaction failed on purpose.");
                    }
                }),
            // A transaction's first graph write takes a before-arrangement.
            this.body === "outside" ? { moves: true } : {},
        );
    }

    toString(): string {
        return `transaction(${this.colors.join(",")}, ${this.body})`;
    }
}

/**
 * A load transaction, as an application opening a project writes one: an import through `tx`, and
 * the layout playing and coming to rest while the transaction is still open, then maybe a throw.
 * The rest point is the transaction's, never the step below it.
 */
class LoadTransaction implements Command {
    constructor(
        private readonly mode: "replace" | "merge",
        private readonly throws: boolean,
    ) {}

    check(model: Readonly<Model>): boolean {
        return model.tx === null;
    }

    async run(model: Model, real: Real): Promise<void> {
        await edit(
            model,
            real,
            this.toString(),
            { key: null },
            () =>
                real.session.transaction("Loaded a project", async (tx) => {
                    await tx.execute({
                        op: "data.import",
                        source: { type: "json", config: { data: IMPORTED } },
                        mode: this.mode,
                    });
                    real.layout.play();
                    real.layout.step();
                    await real.layout.settle();
                    if (this.throws) {
                        throw new Error("The load failed on purpose.");
                    }
                }),
            { rests: true },
        );
        expectArrangement(model, real, `after ${this.toString()}`);
    }

    toString(): string {
        return `load transaction, ${this.mode}${this.throws ? ", throws" : ""}`;
    }
}

/** A transaction left open across commands: opened, written through, then ended. */
class OpenTransaction implements Command {
    check(model: Readonly<Model>): boolean {
        return model.tx === null && model.pending.length === 0;
    }

    run(model: Model, real: Real): Promise<void> {
        expectSealed(model, real, "before opening a transaction");
        const { session } = real;
        let write = (): void => undefined;
        const writing = new Promise<void>((resolve) => {
            write = resolve;
        });
        let wrote = (): void => undefined;
        const written = new Promise<void>((resolve) => {
            wrote = resolve;
        });
        let finish = (_throws: boolean): void => undefined;
        const finishing = new Promise<boolean>((resolve) => {
            finish = resolve;
        });
        const node = `t${String(++model.added)}`;
        const done = session.transaction("Open message", async (tx) => {
            await writing;
            try {
                await tx.data.addNodes([{ id: node }]);
            } finally {
                wrote();
            }

            if (await finishing) {
                throw new Error("The message failed on purpose.");
            }
        });
        done.catch(() => undefined);
        const item = notePending(model, real, {
            family: "tx",
            after: null,
            release: null,
            slot: null,
            arranges: {},
            runs: [],
        });
        assert.isNotNull(item, "an open transaction is pending");
        model.tx = { item, wrote: false, wroteAt: -1, before: null, write, written, finish, done };
        return Promise.resolve();
    }

    toString(): string {
        return "open a transaction";
    }
}

/** The open transaction adds a node through `tx`. */
class WriteTransaction implements Command {
    check(model: Readonly<Model>): boolean {
        return model.tx !== null && !model.tx.wrote && model.pending.includes(model.tx.item);
    }

    async run(model: Model, real: Real): Promise<void> {
        expectSealed(model, real, "before the transaction writes");
        const tx = model.tx as OpenTx;
        // Its first graph write takes the lane as its before-arrangement.
        sealModel(model, real);
        tx.before = laneOf(real);
        tx.write();
        await tx.written;
        tx.wrote = true;
        tx.wroteAt = model.tick++;
        expectSealed(model, real, "after the transaction wrote");
    }

    toString(): string {
        return "the transaction writes";
    }
}

/** The open transaction's body ends: it commits, or throws and rolls back. */
class EndTransaction implements Command {
    constructor(private readonly throws: boolean) {}

    check(model: Readonly<Model>): boolean {
        return model.tx !== null;
    }

    async run(model: Model, real: Real): Promise<void> {
        const tx = model.tx as OpenTx;
        const open = model.pending.includes(tx.item);
        if (open && !tx.wrote) {
            // Its body writes before it ends.
            await new WriteTransaction().run(model, real);
        } else if (!tx.wrote) {
            expectSealed(model, real, `before ${this.toString()}`);
        }

        const { history } = real.session;
        const top = history.steps[history.position - 1]?.id;
        const held = new Set(laneOf(real).keys());
        // Its body may still be waiting to write, when it was aborted or never told to.
        tx.write();
        tx.finish(this.throws);
        const failed = await tx.done.then(
            () => false,
            () => true,
        );
        model.tx = null;
        model.pending = model.pending.filter((item) => item !== tx.item);
        const recorded = history.position > 0 && history.steps[history.position - 1]?.id !== top;
        assert.strictEqual(recorded, open && !failed && tx.wrote, `${this.toString()}: whether it recorded`);
        if (recorded) {
            pushStep(model, real, { fresh: freshSince(real, held), before: tx.before });
            model.mergeKey = null;
            model.lastAt = real.clock.now();
            model.mergeable = true;
            followEviction(model, real, `${this.toString()} recorded`);
        }

        expectSealed(model, real, `after ${this.toString()}`);
    }

    toString(): string {
        return `the transaction ${this.throws ? "throws" : "commits"}`;
    }
}

/**
 * A data edit or an import whose turn on the queue is held: pending work until it is released or
 * cancelled. An import with a coalesce key takes over a slot of the same key still waiting.
 */
class Queue implements Command {
    constructor(
        private readonly label: string,
        private readonly dispatch: (session: GraphSession) => Promise<unknown>,
        private readonly arranges: Arranges = {},
        private readonly slot: string | null = null,
    ) {}

    check(model: Readonly<Model>): boolean {
        return model.can.queue && model.tx === null;
    }

    run(model: Model, real: Real): Promise<void> {
        expectSealed(model, real, `before queueing ${this.label}`);
        const queue = real.queue as HeldQueue;
        const { value, turns } = queue.holding(() => this.dispatch(real.session));
        value.catch(() => undefined);
        const release = async (): Promise<void> => {
            for (const turn of turns) {
                await turn.release();
            }

            await value;
        };
        const item = notePending(model, real, {
            family: "graph",
            after: null,
            release,
            slot: this.slot,
            arranges: this.arranges,
            runs: [],
        });
        if (item === null) {
            // Coalesced into a slot waiting under the same key: that slot now does this.
            const waiting = model.pending.find((each) => each.slot !== null && each.slot === this.slot);
            assert.isDefined(waiting, `${this.label} coalesced into a slot the model knows`);
            const taken = waiting.release as () => Promise<void>;
            waiting.label = this.label;
            waiting.release = async () => {
                // The slot's turn is the one the first dispatch queued.
                await taken();
                await value;
            };
            waiting.arranges = this.arranges;
        } else {
            assert.lengthOf(turns, 1, `${this.label} took one turn`);
        }

        expectSealed(model, real, `after queueing ${this.label}`);
        return Promise.resolve();
    }

    toString(): string {
        return `queue ${this.label}${this.slot === null ? "" : ` under ${this.slot}`}`;
    }
}

/** A run whose completion is held: pending work until it is released or cancelled. */
class SlowRun implements Command {
    check(model: Readonly<Model>): boolean {
        return model.can.runs && model.tx === null;
    }

    async run(model: Model, real: Real): Promise<void> {
        expectSealed(model, real, `before ${this.toString()}`);
        const gate = real.runs as RunGate;
        const finish = gate.hold();
        // A name of its own: a run started under the name of one already going is that run.
        const as = `slow${String(++model.added)}`;
        model.runIds.push(as);
        const run = real.session.execute({ op: "algo.run", algorithm: "degree", as });
        const done = Promise.resolve(run).then(
            () => undefined,
            () => undefined,
        );
        // Its turn comes at the next microtask, when it starts computing.
        await Promise.resolve();
        const item = notePending(model, real, {
            family: "runs",
            after: null,
            release: async () => {
                finish();
                await done;
            },
            slot: null,
            arranges: {},
            runs: [as],
        });
        assert.isNotNull(item, `${this.toString()} is pending`);

        expectSealed(model, real, `after ${this.toString()}`);
    }

    toString(): string {
        return "slow run";
    }
}

/**
 * A transaction that adds a layer through `tx` and starts a run through `tx` without waiting for
 * it: the run is a deferred member of the transaction's step, merged into it if it finishes while
 * the step is on top, or recorded after it otherwise.
 */
class DeferredRun implements Command {
    constructor(private readonly color: string) {}

    check(model: Readonly<Model>): boolean {
        return model.can.runs && model.tx === null;
    }

    async run(model: Model, real: Real): Promise<void> {
        const gate = real.runs as RunGate;
        const finish = gate.hold();
        let done: Promise<unknown> = Promise.resolve();
        const as = `late${String(++model.added)}`;
        model.runIds.push(as);
        const outcome = await edit(model, real, this.toString(), { key: null }, () =>
            real.session.transaction("Message with a run", async (tx) => {
                await tx.styles.add(layer("Deferred", this.color));
                const run = tx.run({ op: "algo.run", algorithm: "degree", as });
                done = Promise.resolve(run).then(
                    () => undefined,
                    () => undefined,
                );
            }),
        );
        assert.strictEqual(outcome, "record", `${this.toString()}: the transaction recorded its layer`);
        const step = model.steps[model.position].id;
        const item = notePending(model, real, {
            family: "runs",
            after: step,
            release: async () => {
                finish();
                await done;
            },
            slot: null,
            arranges: {},
            runs: [as],
        });
        if (item === null) {
            // It finished before the transaction did, and merged into the step.
            finish();
            model.steps[model.position].digest = live(real);
        }

        expectSealed(model, real, `after ${this.toString()}`);
    }

    toString(): string {
        return `transaction with a deferred run, adding ${this.color}`;
    }
}

/** Remove a run: its result and its layers go, and a run still going under its name stops. */
class RemoveRun implements Command {
    constructor(private readonly pick: number) {}

    check(model: Readonly<Model>): boolean {
        return readerMay(model);
    }

    async run(model: Model, real: Real): Promise<void> {
        const id = choose(model.runIds, this.pick) as string;
        const going = model.pending.filter((item) => item.runs.includes(id));
        await edit(model, real, `remove run ${id}`, { key: null }, async () => {
            try {
                await real.session.execute({ op: "algo.remove", runId: id });
            } finally {
                model.pending = model.pending.filter((item) => !going.includes(item));
            }
        });
    }

    toString(): string {
        return `remove run(${String(this.pick)})`;
    }
}

/** Let pending work finish: a held turn comes, or a held run completes. */
class Release implements Command {
    constructor(private readonly pick: number) {}

    check(model: Readonly<Model>): boolean {
        return model.pending.some((item) => item.release !== null) && readerMay(model);
    }

    async run(model: Model, real: Real): Promise<void> {
        const item = choose(
            model.pending.filter((each) => each.release !== null),
            this.pick,
        ) as Pending;
        await edit(
            model,
            real,
            `release ${item.label}`,
            { key: null, into: item.after },
            async () => {
                model.pending = model.pending.filter((each) => each !== item);
                await (item.release as () => Promise<void>)();
            },
            item.arranges,
        );
    }

    toString(): string {
        return `release(${String(this.pick)})`;
    }
}

/** Cancel one pending item through `history.cancel`: it goes, with every later one sharing a key. */
class Cancel implements Command {
    constructor(private readonly pick: number) {}

    check(model: Readonly<Model>): boolean {
        return model.pending.length > 0;
    }

    run(model: Model, real: Real): Promise<void> {
        expectSealed(model, real, `before ${this.toString()}`);
        const item = choose(model.pending, this.pick) as Pending;
        const expected = cascade(model, [item]);
        const reported = real.session.history.cancel(item.id);
        dropCancelled(model, expected, reported, this.toString());
        expectSealed(model, real, `after ${this.toString()}`);
        return Promise.resolve();
    }

    toString(): string {
        return `cancel(${String(this.pick)})`;
    }
}

/** Set a history limit, which evicts at once when it is exceeded. */
class Limit implements Command {
    constructor(
        private readonly which: "steps" | "bytes",
        private readonly value: number,
    ) {}

    check(): boolean {
        return true;
    }

    run(model: Model, real: Real): Promise<void> {
        expectSealed(model, real, `before ${this.toString()}`);
        if (this.which === "steps") {
            real.session.history.limitSteps = this.value;
        } else {
            real.session.history.limitBytes = this.value;
        }

        expectSealed(model, real, `after ${this.toString()}`);
        return Promise.resolve();
    }

    toString(): string {
        return `limit ${String(this.value)} ${this.which}`;
    }
}

/** Clear the history: the state now is the new baseline, and every pending item is cancelled. */
class Clear implements Command {
    check(model: Readonly<Model>): boolean {
        return readerMay(model);
    }

    run(model: Model, real: Real): Promise<void> {
        expectSealed(model, real, "before clear");
        real.session.history.clear();
        model.steps = [position(real, null, model.tick++)];
        model.moved = false;
        model.position = 0;
        model.mergeable = false;
        model.pending = [];
        if (model.tx !== null) {
            model.tx.wrote = false;
        }

        assert.isFalse(real.session.canUndo);
        expectSealed(model, real, "after clear");
        return Promise.resolve();
    }

    toString(): string {
        return "clear";
    }
}

const color = fc.constantFrom("#ff0000", "#00ff00", "#0000ff", "#ffff00");

/** What the import edits load: two nodes, one of them new, and an edge. */
const IMPORTED = JSON.stringify({ nodes: [{ id: "n1", t: 2 }, { id: "n6" }], edges: [{ src: "n1", dst: "n6" }] });
/** What a queued import loads. */
const IMPORTED_LATE = JSON.stringify({ nodes: [{ id: "n2" }, { id: "n11" }], edges: [{ src: "n11", dst: "n2" }] });
const pick = fc.nat({ max: 7 });

/** Every command the model generates. */
export const COMMANDS = [
    color.map(
        (value) =>
            new Edit(`add ${value}`, (real) => ({
                key: null,
                run: () => real.session.styles.add(layer("Layer", value)),
            })),
    ),
    fc.tuple(pick, color).map(
        ([at, value]) =>
            new Edit(`update ${String(at)} to ${value}`, (real) => {
                const id = choose(editable(real), at);
                return id === undefined
                    ? null
                    : {
                          key: `style:${id}:set`,
                          run: () => real.session.styles.update(id, { set: { "node.color": value } }),
                      };
            }),
    ),
    pick.map(
        (at) =>
            new Edit(`remove ${String(at)}`, (real) => {
                const id = choose(editable(real), at);
                return id === undefined ? null : { key: null, run: () => real.session.styles.remove(id) };
            }),
    ),
    fc.tuple(pick, fc.option(pick)).map(
        ([at, before]) =>
            new Edit(`move ${String(at)} below ${String(before)}`, (real) => {
                const id = choose(editable(real), at);
                const below = before === null ? null : (choose(editable(real), before) ?? null);
                return id === undefined ? null : { key: null, run: () => real.session.styles.move(id, below) };
            }),
    ),
    fc.constant(
        new Edit("sweep the user's layers", (real) => ({
            key: null,
            run: () => real.session.styles.removeBySource((source) => source.by === "user"),
        })),
    ),
    fc.constantFrom("node.color", "node.size").map(
        (channel) =>
            new Edit(`encode ${channel}`, (real) => ({
                key: null,
                run: () => real.session.styles.encode({ run: "deg", channel }),
            })),
    ),
    fc.constant(
        new Edit("highlight the route", (real) => ({
            key: null,
            run: () => real.session.styles.highlight({ run: "route" }),
        })),
    ),
    pick.map(
        (at) =>
            new Edit(`fix colour on ${String(at)}`, (real) => {
                const id = choose(editable(real), at);
                return id === undefined
                    ? null
                    : { key: null, run: () => real.session.styles.resolveToStatic(id, "node.color") };
            }),
    ),
    fc.array(color, { minLength: 1, maxLength: 3 }).map(
        (colors) =>
            new Edit(`template of ${String(colors.length)}`, (real) => ({
                key: null,
                run: () =>
                    real.session.styles.applyTemplate({
                        version: 1,
                        layers: colors.map((value) => layer("Doc", value)),
                    }),
            })),
    ),
    fc
        .tuple(
            fc.array(color, { minLength: 2, maxLength: 3 }),
            fc.constantFrom<Body>("awaits", "throws", "unawaited", "aborts", "outside"),
        )
        .map(([colors, body]) => new Transaction(colors, body)),
    fc.option(fc.nat({ max: 3 })).map(
        (min) =>
            new Edit(`filter degree >= ${String(min)}`, (real) => ({
                key: "filter",
                run: () => real.session.visibility.set(min === null ? null : { kind: "degree", min }),
            })),
    ),
    fc.option(fc.nat({ max: 3 })).map(
        (to) =>
            new Edit(`window to ${String(to)}`, (real) => ({
                key: "window",
                run: () =>
                    real.session.visibility.setWindow(
                        to === null ? null : { attribute: "data.t", from: 0, to: to + 1 },
                    ),
            })),
    ),
    fc.boolean().map(
        (show) =>
            new Edit(`context ${String(show)}`, (real) => ({
                key: null,
                run: async () => {
                    real.session.visibility.showContext = show;
                    await real.session.styles.settled();
                },
            })),
    ),
    fc.tuple(fc.constantFrom("Hubs", "Leaves", "Route"), fc.subarray(["n1", "n2", "n3"], { minLength: 1 })).map(
        ([name, nodes]) =>
            new Edit(`save scope ${name}`, (real) => ({
                key: null,
                // Synchronous, and refused at once when the name is taken.
                run: () => {
                    real.session.scope.save(name, { nodes });
                    return Promise.resolve();
                },
            })),
    ),
    pick.map(
        (at) =>
            new Edit(`remove scope ${String(at)}`, (real) => {
                const saved = choose(real.session.scope.list(), at);
                return saved === undefined
                    ? null
                    : {
                          key: null,
                          run: () => {
                              real.session.scope.remove(saved.id);
                              return Promise.resolve();
                          },
                      };
            }),
    ),
    fc.tuple(fc.constantFrom("Front", "Top"), fc.nat({ max: 4 })).map(
        ([name, zoom]) =>
            new Edit(`save view ${name} at ${String(zoom)}`, (real) => ({
                key: null,
                run: () => real.session.views.save([{ name, camera: { zoom } }]),
            })),
    ),
    pick.map(
        (at) =>
            new Edit(`remove view ${String(at)}`, (real) => {
                const name = choose([...real.session.views.keys()], at);
                return name === undefined ? null : { key: null, run: () => real.session.views.remove([name]) };
            }),
    ),
    fc.constantFrom("circular", "spiral", "force").map(
        (id) =>
            new Edit(`layout ${id}`, (real) => {
                const choice = real.layoutFor?.(id);
                return {
                    key: null,
                    moves: true,
                    run: () =>
                        choice === undefined
                            ? real.session.layout.set(id)
                            : real.session.layout.set(choice.id, { engine: choice.engine }),
                };
            }),
    ),
    fc.constantFrom("2d", "3d").map(
        (dimension) =>
            new Edit(`dimension ${dimension}`, (real) => ({
                key: null,
                moves: true,
                run: () => real.session.layout.setDimension(dimension),
            })),
    ),
    fc.constantFrom("name", "label", null).map(
        (path) =>
            new Edit(`label path ${String(path)}`, (real) => ({
                key: "config:data.knownFields.nodeLabelPath",
                run: () => real.session.config.set({ data: { knownFields: { nodeLabelPath: path ?? undefined } } }),
            })),
    ),
    fc.tuple(color, fc.boolean()).map(
        ([background, skybox]) =>
            new Edit(`background ${skybox ? "skybox" : background}`, (real) => ({
                key: "config:background",
                run: () =>
                    real.session.config.set({
                        background: skybox
                            ? { backgroundType: "skybox", data: SKYBOX_PNG }
                            : { backgroundType: "color", color: background },
                    }),
            })),
    ),
    fc.tuple(fc.nat({ max: 3 }), fc.nat({ max: 3 })).map(
        ([preSteps, minDelta]) =>
            new Edit(`pre-steps ${String(preSteps)} and min delta ${String(minDelta)}`, (real) => ({
                key: "config:layoutBehavior.minDelta,layoutBehavior.preSteps",
                run: () => real.session.config.set({ layoutBehavior: { preSteps, minDelta } }),
            })),
    ),
    fc.tuple(fc.constantFrom("n4", "n5", "n6"), fc.nat({ max: 3 })).map(
        ([id, t]) =>
            new Edit(`add node ${id}`, (real) => ({
                key: null,
                run: () => real.session.data.addNodes([{ id, t }]),
            })),
    ),
    fc.tuple(fc.constantFrom("n1", "n2", "n3", "n4", "n7"), fc.constantFrom("n1", "n2", "n3", "n5", "n8")).map(
        ([src, dst]) =>
            new Edit(`add edge ${src} -> ${dst}`, (real) => ({
                key: null,
                run: () => real.session.data.addEdges([{ src, dst }]),
            })),
    ),
    fc.tuple(fc.constantFrom("n1", "n2", "n3", "n4"), fc.nat({ max: 3 })).map(
        ([id, t]) =>
            new Edit(`set t of ${id} to ${String(t)}`, (real) => ({
                key: null,
                run: () => real.session.data.updateNodes([{ id, values: { t } }]),
            })),
    ),
    fc.nat({ max: 3 }).map(
        (weight) =>
            new Edit(`tag every node with ${String(weight)}`, (real) => ({
                key: null,
                run: () =>
                    real.session.execute({
                        op: "data.apply",
                        mutation: {
                            kind: "set-attributes",
                            target: "node",
                            ids: ["n1", "n2", "n3"],
                            values: { weight },
                        },
                    }),
            })),
    ),
    fc.subarray(["n1", "n2", "n3", "n4", "n5"], { minLength: 1, maxLength: 2 }).map(
        (ids) =>
            new Edit(`remove nodes ${ids.join(", ")}`, (real) => ({
                key: null,
                run: () => real.session.data.removeNodes(ids),
            })),
    ),
    fc.subarray(["0", "1", "2", "3", "4"], { minLength: 1, maxLength: 2 }).map(
        (ids) =>
            new Edit(`remove edges ${ids.join(", ")}`, (real) => ({
                key: null,
                run: () => real.session.data.removeEdges(ids),
            })),
    ),
    fc.constant(
        new Edit("clear the graph", (real) => ({
            key: null,
            run: () => real.session.data.clear(),
            replaces: true,
        })),
    ),
    fc.constantFrom("replace", "merge").map(
        (mode) =>
            new Edit(`import, ${mode}`, (real) => ({
                key: null,
                run: () => real.session.data.import({ type: "json", config: { data: IMPORTED } }, { mode }),
                moves: true,
                replaces: mode === "replace",
            })),
    ),
    fc.constantFrom("n1", "n2", "n6").map(
        (seed) =>
            new Edit(`expand ${seed}`, (real) => ({
                key: null,
                moves: true,
                run: () =>
                    real.session.execute({
                        op: "data.expand",
                        seed,
                        nodes: [{ id: "n7" }],
                        edges: [
                            { src: seed, dst: "n7" },
                            { src: "n1", dst: "n2" },
                        ],
                    }),
            })),
    ),
    fc.boolean().map(
        (fails) =>
            new Edit(`batch${fails ? " that fails" : ""}`, (real) => ({
                key: null,
                moves: true,
                run: () =>
                    real.session.execute({
                        op: "batch",
                        steps: [
                            { op: "data.apply", mutation: { kind: "add-nodes", records: [{ id: "n8" }] } },
                            {
                                op: "data.apply",
                                mutation: {
                                    kind: "add-edges",
                                    records: [{ src: "n8", dst: "n1" }, ...(fails ? [{ src: "n8", dst: "n1" }] : [])],
                                    repeated: "error",
                                },
                            },
                        ],
                    }),
            })),
    ),
    fc.tuple(fc.constantFrom("deg", "fresh"), fc.boolean()).map(
        ([as, apply]) =>
            new Edit(`run degree as ${as}${apply ? ", applying its styles" : ""}`, (real) => ({
                key: null,
                run: () =>
                    real.session.execute({
                        op: "algo.run",
                        algorithm: "degree",
                        as,
                        ...(apply ? { applySuggestedStyles: true } : {}),
                    }),
            })),
    ),
    pick.map((at) => new RemoveRun(at)),
    ...Array.from({ length: 2 }, () =>
        fc
            .tuple(
                fc.subarray(["n1", "n2", "n3", "n4", "n6", "n7"], { minLength: 1, maxLength: 3 }),
                fc.nat({ max: 9 }),
            )
            .map(([ids, at]) => new Place(ids, at)),
    ),
    fc.tuple(fc.subarray(["n1", "n2", "n3", "n4"], { minLength: 1, maxLength: 2 }), fc.boolean()).map(
        ([ids, pinned]) =>
            new Edit(`${pinned ? "pin" : "release"} ${ids.join(",")}`, (real) => {
                const held = laneOf(real);
                const present = ids.filter((id) => held.has(id));
                return present.length === 0
                    ? null
                    : {
                          key: null,
                          run: () =>
                              pinned ? real.session.positions.pin(present) : real.session.positions.unpin(present),
                      };
            }),
    ),
    // Four times over, so a sequence of thirty commands plays, steps and settles the layout often
    // enough to put an arrangement under most history moves.
    ...Array.from({ length: 4 }, () => fc.constantFrom("play", "frame", "settle").map((kind) => new Layout(kind))),
    fc
        .tuple(fc.constantFrom("replace", "merge"), fc.boolean())
        .map(([mode, throws]) => new LoadTransaction(mode, throws)),
    // Pending work: dependent data edits queued behind each other, a queued import (twice under
    // one coalesce key, which takes the waiting slot over), slow runs, and a deferred run.
    ...Array.from({ length: 2 }, () =>
        fc.constantFrom(
            new Queue("add node n9", (session) => session.data.addNodes([{ id: "n9" }])),
            new Queue("add edge n9 -> n1", (session) => session.data.addEdges([{ src: "n9", dst: "n1" }])),
            new Queue("remove node n2", (session) => session.data.removeNodes(["n2"])),
            new Queue(
                "merge an import",
                (session) => session.data.import({ type: "json", config: { data: IMPORTED_LATE } }, { mode: "merge" }),
                { moves: true },
            ),
            new Queue(
                "replace by an import",
                (session) =>
                    session.execute({
                        op: "data.import",
                        source: { type: "json", config: { data: IMPORTED_LATE } },
                        mode: "replace",
                        coalesce: "source",
                    }),
                { replaces: true },
                "source",
            ),
            new Queue(
                "merge an import",
                (session) =>
                    session.execute({
                        op: "data.import",
                        source: { type: "json", config: { data: IMPORTED } },
                        mode: "merge",
                        coalesce: "source",
                    }),
                { moves: true },
                "source",
            ),
        ),
    ),
    fc.constant(new SlowRun()),
    color.map((value) => new DeferredRun(value)),
    ...Array.from({ length: 3 }, () => pick.map((at) => new Release(at))),
    pick.map((at) => new Cancel(at)),
    fc.constant(new OpenTransaction()),
    fc.constant(new WriteTransaction()),
    fc.boolean().map((throws) => new EndTransaction(throws)),
    fc.integer({ min: 2, max: 6 }).map((steps) => new Limit("steps", steps)),
    // Low enough that a capture or a replaced snapshot is over it, so eviction takes steps that
    // moved nodes; and back to the default.
    fc.constantFrom(4_000, 40_000, 256 * 1024 * 1024).map((bytes) => new Limit("bytes", bytes)),
    fc.constant(new UndoThenSettle()),
    fc.constant(new Move("undo")),
    fc.constant(new Move("undo")),
    fc.constant(new Move("redo")),
    fc.constant(new Move("undo-twice")),
    pick.map((at) => new Move("restore", at)),
    color.map((value) => new UndoFromListener(value)),
    fc.constantFrom(16, 400, 5000).map((ms) => new Advance(ms)),
    fc.constant(new Clear()),
];

/**
 * After a sequence: let every pending item finish or go, then undo everything and redo
 * everything, and check both ends.
 * @param model - The model.
 * @param real - The system.
 */
export async function undoAllRedoAll(model: Model, real: Real): Promise<void> {
    const { session } = real;
    if (model.tx !== null) {
        await new EndTransaction(false).run(model, real);
    }

    // Pending work cancelled by the restore below never records; what finishes first does.
    for (let release = new Release(0); model.pending.some((item) => item.release !== null); ) {
        await release.run(model, real);
    }

    expectSealed(model, real, "before undoing everything");
    if (model.position > 0) {
        sealModel(model, real);
    }

    const from = model.position;
    await session.history.restoreTo(null);
    const evicted = followEviction(model, real, "undoing everything");
    assert.strictEqual(live(real), model.steps[0].digest, "undoing everything returns to the start");
    model.position = 0;
    // Already at the start, the lane holds what the move that got there restored, which is not
    // A(0) when that move undid a step with a before-arrangement.
    if (from - evicted > 0) {
        expectArrangement(model, real, "undoing everything", landedAt(model, 0, from - evicted));
    }

    const top = session.history.steps.at(-1);
    if (top !== undefined) {
        sealModel(model, real);
        await session.history.restoreTo(top.id);
    }

    followEviction(model, real, "redoing everything");
    assert.strictEqual(live(real), model.steps.at(-1)?.digest, "redoing everything returns to the end");
    model.position = model.steps.length - 1;
    if (top !== undefined) {
        expectArrangement(model, real, "redoing everything");
    }
}
