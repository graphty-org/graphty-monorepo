/**
 * @file Runs one Graphviz request in its own module Worker.
 *
 * A Worker lives for one request and is terminated after it, so every layout starts in a fresh
 * Worker and a fresh WebAssembly instance, and a crashed one leaves nothing behind for the next.
 * Graphviz cannot be interrupted from inside, so the time budget and an abort both end the
 * Worker with `terminate()`.
 */

import { GRAPHVIZ_PACKAGE, type GraphvizEngine } from "./engines";
import type { GraphvizReply, GraphvizRequest } from "./protocol";

/** The answer where the package cannot load: not installed, no Worker, or refused by the page. */
const UNAVAILABLE: GraphvizReply = {
    ok: false,
    code: "graphviz.unavailable",
    params: { package: GRAPHVIZ_PACKAGE, feature: "graphviz" },
};

/** How one request may be cut short. */
interface GraphvizRunOptions {
    /** Ends the request, and its Worker, when it aborts. */
    readonly signal?: AbortSignal;
    /** Milliseconds before the Worker is stopped and the request fails with `graphviz.timeout`. */
    readonly timeoutMs?: number;
}

/**
 * Start the Worker. A separate function so the bundler sees the `new Worker(new URL(...))`
 * pattern it rewrites.
 * @returns the Worker
 */
function spawn(): Worker {
    return new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "graphty-graphviz" });
}

/**
 * Run one request in a fresh Worker.
 * @param request - the request
 * @param options - the abort signal and the time budget
 * @returns the Worker's reply, or a failure the host itself observed (no Worker here, a timeout,
 *   a Worker that died); rejects with the signal's reason when aborted
 */
export function runGraphviz(request: GraphvizRequest, options: GraphvizRunOptions = {}): Promise<GraphvizReply> {
    const engine: GraphvizEngine | null = request.kind === "layout" ? request.engine : null;
    if (typeof Worker === "undefined") {
        return Promise.resolve(UNAVAILABLE);
    }

    const { signal, timeoutMs } = options;
    if (signal?.aborted === true) {
        return Promise.reject(signal.reason as Error);
    }

    return new Promise<GraphvizReply>((resolve, reject) => {
        const worker = spawn();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const finish = (): void => {
            clearTimeout(timer);
            signal?.removeEventListener("abort", onAbort);
            worker.terminate();
        };
        const onAbort = (): void => {
            finish();
            reject(signal?.reason as Error);
        };

        worker.addEventListener("message", (event: MessageEvent<GraphvizReply>) => {
            finish();
            resolve(event.data);
        });
        worker.addEventListener("error", (event: ErrorEvent) => {
            event.preventDefault();
            finish();
            // A probe's Worker that fails is one that could not load the package.
            resolve(
                request.kind === "probe"
                    ? UNAVAILABLE
                    : {
                          ok: false,
                          code: "graphviz.crashed",
                          params: { engine, message: event.message || "the Graphviz worker stopped" },
                      },
            );
        });
        signal?.addEventListener("abort", onAbort, { once: true });
        if (timeoutMs !== undefined && Number.isFinite(timeoutMs)) {
            timer = setTimeout(() => {
                finish();
                resolve({ ok: false, code: "graphviz.timeout", params: { engine, ms: timeoutMs } });
            }, timeoutMs);
        }

        worker.postMessage(request);
    });
}

/** The probe's answer, once asked. */
let availability: Promise<boolean> | null = null;

/**
 * Whether Graphviz layouts can run here: a Worker loads the package once and says.
 *
 * The answer is kept for the life of the page, but a timeout is not an answer: a Worker that was
 * too slow to load the package on a busy machine says nothing about whether it is there, so that
 * probe reports false and the next ask probes again.
 * @returns true when the package is installed and loads in a Worker
 */
export function probeGraphviz(): Promise<boolean> {
    availability ??= runGraphviz({ kind: "probe" }, { timeoutMs: 30_000 }).then(
        (reply) => {
            if (!reply.ok && reply.code === "graphviz.timeout") {
                availability = null;
            }

            return reply.ok;
        },
        () => false,
    );
    return availability;
}
