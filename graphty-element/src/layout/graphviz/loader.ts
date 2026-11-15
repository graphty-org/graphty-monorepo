/**
 * @file The one module that imports the Graphviz package. It runs inside the Worker.
 *
 * The package is an optional peer, so it is the literal target of an `await import()` inside
 * `try`, never a static import: a consumer's bundler resolves a static import when it builds the
 * Worker, so a static import of a package the consumer did not install failed their build (Vite 8
 * reported a missing export of its placeholder module). Where it does not load, every request is
 * answered `graphviz.unavailable`.
 *
 * Every layout gets a fresh WebAssembly instance (`unload()` then `load()`): a reused instance
 * was measured to give wrong answers and to crash after an earlier layout failed.
 */

import { GRAPHVIZ_PACKAGE, type GraphvizEngine } from "./engines";
import type { GraphvizReply } from "./protocol";

/** The answer where the package does not load. */
const UNAVAILABLE: GraphvizReply = {
    ok: false,
    code: "graphviz.unavailable",
    params: { package: GRAPHVIZ_PACKAGE, feature: "graphviz" },
};

/**
 * Load the package.
 * @returns its `Graphviz` class, or null where it is not installed
 */
async function loadGraphviz(): Promise<typeof import("@hpcc-js/wasm-graphviz").Graphviz | null> {
    try {
        return (await import("@hpcc-js/wasm-graphviz")).Graphviz;
    } catch {
        return null;
    }
}

/** Messages a WebAssembly fault or a blown stack throws, as opposed to Graphviz refusing the graph. */
const CRASH = /maximum call stack|out of bounds|unreachable|runtimeerror|memory access|aborted|abort\(/i;

/** Graphviz's own syntax error: `syntax error in line 3 near 'x'`. */
const SYNTAX = /syntax error in line (\d+) near '([^']*)'/i;

/**
 * Whether the package loads here.
 * @returns ok, or `graphviz.unavailable`
 */
export async function probe(): Promise<GraphvizReply> {
    return (await loadGraphviz()) === null ? UNAVAILABLE : { ok: true, json: "" };
}

/**
 * Classify what a failed layout threw.
 * @param engine - the engine
 * @param error - what it threw
 * @returns the failure
 */
export function classify(engine: GraphvizEngine, error: unknown): GraphvizReply {
    const message = error instanceof Error ? error.message : String(error);
    const syntax = SYNTAX.exec(message);
    if (syntax !== null) {
        return { ok: false, code: "graphviz.syntax", params: { engine, line: Number(syntax[1]), near: syntax[2] } };
    }

    if (error instanceof RangeError || CRASH.test(message)) {
        return { ok: false, code: "graphviz.crashed", params: { engine, message: message.trim() } };
    }

    const messages = message
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
    return { ok: false, code: "graphviz.error", params: { engine, messages } };
}

/**
 * Lay one graph out in a fresh instance.
 * @param dot - the DOT text
 * @param engine - the engine
 * @param pinned - keep every node at the `pos` the DOT gives it and route only the edges (`neato -n2`)
 * @returns Graphviz's `-Tjson` text, or why it failed
 */
export async function layout(dot: string, engine: GraphvizEngine, pinned = false): Promise<GraphvizReply> {
    const Graphviz = await loadGraphviz();
    if (Graphviz === null) {
        return UNAVAILABLE;
    }
    try {
        Graphviz.unload();
        const graphviz = await Graphviz.load();
        return { ok: true, json: graphviz.layout(dot, "json", engine, pinned ? { nop: 2 } : undefined) };
    } catch (error) {
        return classify(engine, error);
    }
}
