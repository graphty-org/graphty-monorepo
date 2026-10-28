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
 * NOTHING IS LOST WHEN THE WORKER IS. Where there is no Worker (Node, a test environment), where
 * one cannot be started (a page whose policy refuses it), where the arguments cannot be copied to
 * it, or where it reports a failure, the member runs on the page through the same port -- a
 * failure then surfaces as the port's own error, with its own code.
 */

import { accelerated, type AcceleratedAlgorithms } from "@graphty/algorithms";
import type { GraphSnapshot } from "@graphty/graph-format";

import type { OffThreadReply, OffThreadRequest } from "./offThreadProtocol";

/** The dispatcher members computed in the Worker: each returns plain data. */
const OFF_THREAD_MEMBERS: ReadonlySet<string> = new Set(["louvain", "kCoreDecomposition", "labelPropagation"]);

/** The smallest graph, in nodes plus edges, worth copying to the Worker. */
const OFF_THREAD_MIN_ELEMENTS = 10_000;

/** One request waiting for its answer, and how to compute it on the page instead. */
interface Waiting {
    readonly resolve: (value: unknown) => void;
    readonly reject: (reason: unknown) => void;
    readonly onPage: () => Promise<unknown>;
}

/** The Worker, null where none can run, undefined before the first try. */
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
 * Run one member in the Worker.
 * @param target - The Worker.
 * @param member - The dispatcher member.
 * @param snapshot - The graph it runs over.
 * @param args - Its other arguments.
 * @param onPage - The same call on the page.
 * @returns What the member returned.
 */
function callOffThread(
    target: Worker,
    member: string,
    snapshot: GraphSnapshot,
    args: readonly unknown[],
    onPage: () => Promise<unknown>,
): Promise<unknown> {
    const id = nextId++;

    return new Promise((resolve, reject) => {
        const entry: Waiting = { resolve, reject, onPage };
        // A COPY, in one buffer of its own, which is what is handed over: the snapshot's own
        // buffers include the element's live positions, and transferring those would detach them
        // (test/data/no-transfer.test.ts).
        const bytes = snapshot.toBytes();
        const request: OffThreadRequest = { id, member, bytes, args };
        waiting.set(id, entry);
        try {
            target.postMessage(request, [bytes.buffer]);
        } catch {
            // An argument the Worker cannot be handed a copy of.
            waiting.delete(id);
            settleOnPage(entry);
        }
    });
}

/**
 * The CPU dispatcher for a run over one snapshot: the listed members computed in the Worker when
 * the graph is large enough and a Worker can run, every other member on the page.
 * @param snapshot - The graph the run is over.
 * @returns The dispatcher.
 */
export function cpuDispatcher(snapshot: GraphSnapshot): AcceleratedAlgorithms {
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

                return off === null ? call() : callOffThread(off, member, over, args, call);
            };
        },
    });
}
