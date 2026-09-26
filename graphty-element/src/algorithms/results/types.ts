/**
 * @file What an algorithm produces, and the context it produces it in.
 *
 * An algorithm used to write its answer through side effects, one deep path at a time, and
 * return nothing. Nothing could then be handed to a caller, cancelled, watched, or checked
 * against what the catalogue promised the algorithm would publish.
 *
 * So an algorithm now RETURNS what it computed. The return value names its result shape, the
 * fields it actually filled, the values per node, per edge and for the graph, and the caveats
 * that qualify those numbers. The shape fixes the field names: a community result carries
 * `group`, a route carries `onPath`, a set carries `in`, and that is true of every algorithm of
 * that shape whatever it is called. Fields the shape declares but the element can derive --
 * group sizes, a level count, a set's count, a metric's ranking and range -- are left out and
 * filled once, where the result object is built.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { EdgeId, FieldDescriptor, ResultShape } from "../../catalog/types";
import type { ResultElementValues } from "../../session/results";
import type { Caveats, RunDirection, RunProgressReport } from "../../session/runs";

// ---------------------------------------------------------------------------------------------
// What a run says it filled
// ---------------------------------------------------------------------------------------------

/**
 * One field a run actually published.
 *
 * This is deliberately NOT a {@link FieldDescriptor}: the plain and technical names a reader
 * sees belong to the catalogue, which states them once for every algorithm. A run knows which
 * of them it filled, in which half of the result and carrying what type -- and nothing more.
 */
export interface ResultFieldSpec {
    /** The field name, as the result's shape fixes it. */
    readonly name: string;
    /** Which half of the result the field belongs to. */
    readonly kind: FieldDescriptor["kind"];
    /** The type of the values it carries. */
    readonly type: FieldDescriptor["type"];
    /** How the values were scaled before publication, when they were scaled at all. */
    readonly normalization?: string;
}

// ---------------------------------------------------------------------------------------------
// The output
// ---------------------------------------------------------------------------------------------

/**
 * Everything one run of an algorithm produced.
 *
 * Returned rather than written through side effects, so a run is a value: it can be handed to a
 * caller, posted to a worker, checked against the catalogue, or thrown away when the run that
 * produced it was cancelled.
 */
export interface AlgorithmOutput {
    /** The result shape, which fixes the field names below. */
    readonly shape: ResultShape;
    /**
     * The fields this run filled. Fewer than the catalogue declares whenever a parameter changed
     * what there was to publish.
     */
    readonly fields: readonly ResultFieldSpec[];
    /** What the run published per node. */
    readonly nodes?: readonly ResultElementValues[];
    /** What the run published per edge, keyed by the element-assigned `Edge.id`. */
    readonly edges?: readonly ResultElementValues<EdgeId>[];
    /** What the run published for the graph as a whole. */
    readonly graph?: Readonly<Record<string, unknown>>;
    /** What qualifies these numbers, including which method produced them. */
    readonly caveats: Caveats;
}

// ---------------------------------------------------------------------------------------------
// Caveats
// ---------------------------------------------------------------------------------------------

/**
 * What a run has to say about its own numbers, before the defaults every run shares.
 *
 * `method` and `direction` are required because they are the two a reader cannot guess and two
 * runs of the same algorithm routinely differ in: which engine ran, and whether an edge was
 * followed both ways.
 */
interface CaveatsInit extends Partial<Caveats> {
    /** Which method computed the numbers, such as "dijkstra" or "stoer-wagner". */
    readonly method: string;
    /** How edge direction was treated. */
    readonly direction: RunDirection;
}

/**
 * Fill in the caveats every exact, double-precision run shares, and keep what the run said.
 * @param init - What this run has to say.
 * @returns The complete caveats.
 */
export function declaredCaveats(init: CaveatsInit): Caveats {
    return { exact: true, precision: "f64", notes: [], ...init };
}

// ---------------------------------------------------------------------------------------------
// The context a run is given
// ---------------------------------------------------------------------------------------------

/**
 * What the element gives an algorithm while it runs.
 *
 * The three members are the whole of it: a signal that says stop, a way to say how far along the
 * work is, and a way to hand the frame back so a long computation does not lock the screen. An
 * algorithm that reports nothing and never yields is indistinguishable, to a reader watching a
 * large graph, from one that has hung.
 */
export interface AlgorithmRunContext {
    /** Aborted when the run is cancelled. Throw from it; never swallow it. */
    readonly signal: AbortSignal;
    /**
     * Say how far along the work is.
     * @param progress - What changed.
     */
    report(progress: RunProgressReport): void;
    /**
     * Hand the frame back before starting the next chunk.
     * @returns A promise that settles when the work may continue.
     */
    yieldNow(): Promise<void>;
}

/** How many elements one chunk of a per-element pass covers before it reports progress. */
const PROGRESS_CHUNK = 1024;

/**
 * How long a per-element pass works before it hands the frame back.
 *
 * THE YIELD IS PRICED IN FRAMES, NOT IN ELEMENTS. Handing the frame back is a `setTimeout(0)`,
 * and by the time the timer fires the host has drawn a frame -- which is the whole point of
 * yielding, and also what it costs: on a scene of a thousand nodes and ten thousand edges a frame
 * is about a hundred milliseconds on a discrete GPU and half a second on a software renderer.
 * Yielding every 1,024 elements, as this used to, charged that frame for a chunk of work that
 * took a few microseconds: a shortest-path run over 10,000 edges spent 0.5 ms searching and
 * nine frames yielding, and came back after a second (issue #389). The frame is given back only
 * once this much work has accumulated since the last one, so a pass that finishes inside a
 * frame's budget never yields at all and a pass that takes seconds still yields several times a
 * second.
 */
export const YIELD_BUDGET_MS = 16;

/**
 * A context for work nobody is watching.
 *
 * The 1.x `run()` entry point has no queue behind it and no caller holding a signal, so it
 * supplies this: a signal that is never aborted and a report that goes nowhere. An algorithm
 * cannot tell the difference, which is the point -- it reports and yields the same way whoever
 * started it.
 *
 * THE YIELD IS A TIMEOUT, NOT A MICROTASK, and it has to be. A microtask runs before the browser
 * paints, so yielding to one hands the frame back to nobody: the screen stays frozen for the
 * whole computation and the element's own manager makes exactly this argument where it yields. A
 * detached run that yielded differently from a queued one would mean an algorithm behaved
 * differently depending on which door it came through, which is the drift one helper exists to
 * prevent.
 * @returns A context that watches nothing and cancels nothing.
 */
export function detachedRunContext(): AlgorithmRunContext {
    return {
        signal: new AbortController().signal,
        report: () => undefined,
        yieldNow: () =>
            new Promise<void>((resolve) => {
                setTimeout(resolve, 0);
            }),
    };
}

/**
 * Walk a list in chunks, reporting progress between them and yielding once a frame's worth of
 * work has built up (see {@link YIELD_BUDGET_MS}).
 *
 * Every per-element pass in every algorithm goes through this, so "report progress and yield"
 * is one decision made once rather than a loop each author writes their own way.
 * @param context - What the element gave the run.
 * @param phase - What to call this pass in a progress line.
 * @param items - The elements to walk.
 * @param step - What to do with one element.
 * @returns A promise that settles when every element has been walked.
 */
export async function forEachChunked<T>(
    context: AlgorithmRunContext,
    phase: string,
    items: readonly T[],
    step: (item: T, index: number) => void,
): Promise<void> {
    const total = items.length;
    context.report({ phase, completed: 0, total });
    let lastYield = performance.now();

    for (let index = 0; index < total; index++) {
        if (index > 0 && index % PROGRESS_CHUNK === 0) {
            context.signal.throwIfAborted();
            context.report({ phase, completed: index, total });

            // The clock is read at chunk boundaries only, so a step that costs nothing does not
            // pay for a clock read either.
            const now = performance.now();

            if (now - lastYield >= YIELD_BUDGET_MS) {
                await context.yieldNow();
                lastYield = performance.now();
            }
        }

        step(items[index], index);
    }

    context.signal.throwIfAborted();
    context.report({ phase, completed: total, total });
}
