/**
 * @file The CPU port of an algorithm run, computed in a module Worker instead of on the page.
 *
 * WHY. A run that the accelerator does not answer computes on the CPU, and on the page's own
 * thread that is a frame nobody draws: Louvain over the "every airline route on earth" sample
 * (3,214 nodes, 36,906 edges) held the page for over 200 ms at a 6x CPU throttle, the stand-in for
 * an iPad, where the reader saw the whole page stop. The element owns the Worker -- a consumer
 * writes nothing -- and the result is the one the same port computes on the page.
 *
 * WHICH WORK. Only the dispatcher members listed in {@link OFF_THREAD_MEMBERS}, whose published
 * result is plain data (typed arrays and numbers) and so crosses to the page unchanged, and only
 * over a graph of {@link OFF_THREAD_MIN_ELEMENTS} or more, where the copy of the graph is small
 * next to the work. Everything else runs where it always ran.
 *
 * CANCEL STOPS THE WORK. A run's signal reaches the call: when it aborts, the call rejects with the
 * signal's reason at once and the Worker computing it is terminated, so a canceled Betweenness
 * stops computing rather than finishing unseen. Calls of other runs it held are sent to a fresh
 * Worker.
 *
 * NOTHING IS LOST WHEN THE WORKER IS. Where there is no Worker (Node, a test environment), where
 * one cannot be started (a page whose policy refuses it), where the arguments cannot be copied to
 * it, or where it reports a failure, the member runs on the page through the same port -- a
 * failure then surfaces as the port's own error, with its own code.
 */

import { accelerated, type AcceleratedAlgorithms } from "@graphty/algorithms";
import type { GraphSnapshot } from "@graphty/graph-format";

import type { OffThreadReply, OffThreadRequest } from "./offThreadProtocol";

/**
 * The dispatcher members computed in the Worker: each returns plain data and takes a snapshot
 * first. Left out: the linear passes (components, degrees, a breadth-first search), which finish
 * before a copy would; the shortest-path searches, whose result carries a `pathTo` the element
 * calls; and `depthFirstSearch`, which takes a view rather than a snapshot.
 */
const OFF_THREAD_MEMBERS: ReadonlySet<string> = new Set([
    "pageRank",
    "personalizedPageRank",
    "eigenvectorCentrality",
    "katzCentrality",
    "hits",
    "betweennessCentrality",
    "edgeBetweennessCentrality",
    "closenessCentrality",
    "allPairsShortestPath",
    "triangleCount",
    "louvain",
    "leiden",
    "kCoreDecomposition",
    "labelPropagation",
    "labelPropagationSynchronous",
    "girvanNewman",
    "minimumSpanningTree",
    "primMST",
    "maxFlow",
    "minSTCut",
    "stoerWagner",
    "kargerMinCut",
    "maximumBipartiteMatching",
    "commonNeighborsPrediction",
    "adamicAdarPrediction",
]);

/** The smallest graph, in nodes plus edges, worth copying to the Worker. */
const OFF_THREAD_MIN_ELEMENTS = 10_000;

/** One request waiting for its answer, how to send it, and how to compute it on the page instead. */
interface Waiting {
    readonly resolve: (value: unknown) => void;
    readonly reject: (reason: unknown) => void;
    readonly onPage: () => Promise<unknown>;
    /** Post the request to a Worker; throws when an argument cannot be copied to it. */
    readonly send: (target: Worker) => void;
}

/** The Worker, null where none can run, undefined before the first try (or after a cancel). */
let worker: Worker | null | undefined;

/** The requests sent and not yet answered, by id. */
const waiting = new Map<number, Waiting>();

/** The next request's id. */
let nextId = 0;

/**
 * Answer a request on the page, settling its promise with what the port computes there.
 * @param entry - The request.
 */
function settleOnPage(entry: Waiting): void {
    entry.onPage().then(entry.resolve, entry.reject);
}

/**
 * Hand a waiting request to a Worker, or to the page where it cannot go.
 * @param target - The Worker, or null where none can run.
 * @param id - The request's id.
 * @param entry - The request.
 */
function dispatch(target: Worker | null, id: number, entry: Waiting): void {
    if (target === null) {
        waiting.delete(id);
        settleOnPage(entry);
        return;
    }

    try {
        entry.send(target);
    } catch {
        // An argument the Worker cannot be handed a copy of.
        waiting.delete(id);
        settleOnPage(entry);
    }
}

/**
 * Start the Worker. A separate function so the bundler sees the `new Worker(new URL(...))` form.
 * @returns The Worker.
 */
function spawn(): Worker {
    return new Worker(new URL("./offThreadWorker.ts", import.meta.url), { type: "module", name: "graphty-algorithms" });
}

/**
 * The Worker, started on first use; null where none can run.
 * @returns The Worker, or null.
 */
function workerOrNull(): Worker | null {
    if (worker !== undefined) {
        return worker;
    }

    if (typeof Worker === "undefined") {
        worker = null;
        return null;
    }

    try {
        const started = spawn();
        started.addEventListener("message", (event: MessageEvent<OffThreadReply>) => {
            const reply = event.data;
            const entry = waiting.get(reply.id);
            if (entry === undefined) {
                return;
            }

            waiting.delete(reply.id);
            if (reply.ok) {
                entry.resolve(reply.value);
            } else {
                // The port's own error, with its own class and code, comes from running it here.
                settleOnPage(entry);
            }
        });
        // A Worker that fails to load or dies: everything it held runs on the page, and so does
        // everything after it.
        started.addEventListener("error", () => {
            worker = null;
            const held = [...waiting.values()];
            waiting.clear();
            for (const entry of held) {
                settleOnPage(entry);
            }
        });
        worker = started;
    } catch {
        worker = null;
    }

    return worker;
}

/**
 * Stop a canceled request's work: terminate the Worker computing it, and send every other request
 * it held to a fresh one.
 * @param id - The canceled request.
 */
function abandon(id: number): void {
    waiting.delete(id);
    if (worker === null || worker === undefined) {
        return;
    }

    worker.terminate();
    worker = undefined;
    if (waiting.size === 0) {
        return;
    }

    const next = workerOrNull();
    for (const [heldId, entry] of [...waiting]) {
        dispatch(next, heldId, entry);
    }
}

/**
 * The error an aborted call rejects with: the signal's own reason, which is what the run aborted it with.
 * @param signal - The aborted signal.
 * @returns The reason, or an `AbortError` when the reason is not an error.
 */
function abortError(signal: AbortSignal): Error {
    const { reason } = signal as { reason: unknown };
    return reason instanceof Error ? reason : new DOMException("The run was canceled.", "AbortError");
}

/**
 * Run one member in the Worker.
 * @param target - The Worker.
 * @param call - What to send: the member, the graph it runs over and its other arguments.
 * @param call.member - The dispatcher member.
 * @param call.snapshot - The graph it runs over.
 * @param call.args - Its other arguments.
 * @param onPage - The same call on the page.
 * @param signal - The run's signal: aborting it rejects the call and stops its Worker.
 * @returns What the member returned.
 */
function callOffThread(
    target: Worker,
    call: { member: string; snapshot: GraphSnapshot; args: readonly unknown[] },
    onPage: () => Promise<unknown>,
    signal: AbortSignal | undefined,
): Promise<unknown> {
    const id = nextId++;

    return new Promise((resolve, reject) => {
        if (signal?.aborted === true) {
            reject(abortError(signal));
            return;
        }

        const onAbort = (): void => {
            if (signal !== undefined && waiting.has(id)) {
                abandon(id);
                reject(abortError(signal));
            }
        };
        const settled = (): void => {
            signal?.removeEventListener("abort", onAbort);
        };
        const entry: Waiting = {
            resolve: (value) => {
                settled();
                resolve(value);
            },
            reject: (reason) => {
                settled();
                reject(reason);
            },
            onPage,
            send: (to) => {
                // A COPY, in one buffer of its own, which is what is handed over: the snapshot's own
                // buffers include the element's live positions, and transferring those would detach
                // them (test/data/no-transfer.test.ts).
                const bytes = call.snapshot.toBytes();
                const request: OffThreadRequest = { id, member: call.member, bytes, args: call.args };
                to.postMessage(request, [bytes.buffer]);
            },
        };
        waiting.set(id, entry);
        signal?.addEventListener("abort", onAbort, { once: true });
        dispatch(target, id, entry);
    });
}

/**
 * The CPU dispatcher for a run over one snapshot: the listed members computed in the Worker when
 * the graph is large enough and a Worker can run, every other member on the page.
 * @param snapshot - The graph the run is over.
 * @param signal - The run's signal: aborting it rejects a Worker call at once and stops its work.
 * @returns The dispatcher.
 */
export function cpuDispatcher(snapshot: GraphSnapshot, signal?: AbortSignal): AcceleratedAlgorithms {
    const onPage = accelerated(null);

    if (snapshot.nodeCount + snapshot.edgeCount < OFF_THREAD_MIN_ELEMENTS) {
        return onPage;
    }

    return new Proxy(onPage, {
        get(target, member, receiver): unknown {
            const own: unknown = Reflect.get(target, member, receiver);
            if (typeof member !== "string" || !OFF_THREAD_MEMBERS.has(member) || typeof own !== "function") {
                return own;
            }

            return (over: GraphSnapshot, ...args: unknown[]): Promise<unknown> => {
                const call = (): Promise<unknown> =>
                    (own as (s: GraphSnapshot, ...rest: unknown[]) => Promise<unknown>).call(target, over, ...args);
                const off = workerOrNull();

                return off === null ? call() : callOffThread(off, { member, snapshot: over, args }, call, signal);
            };
        },
    });
}
