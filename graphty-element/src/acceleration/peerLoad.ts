/**
 * @file Tells "the GPU package is not installed" from "it is installed and broken", and checks
 * that a loaded package has what the element calls.
 *
 * The root entry point imports `@graphty/webgpu-graph-algorithms` with a literal `import()`
 * inside `try`, and every bundler turns a missing package into a different error at run time.
 * Only the shapes recorded below count as "not installed" (`E_MISSING_PACKAGE`, which prints
 * nothing). Anything else is a real failure (`E_ACCELERATOR_FAILED`, printed as an error), so a
 * future bundler's new wording shows up as a visible failure someone can fix by adding a shape
 * here, not as a silent CPU run.
 *
 * Pure: no import of the package, no DOM, no side effect, so the unit tests can feed it every
 * recorded string directly.
 */

import { GraphtyError } from "../errors";

/** The optional peer the root entry point loads. */
export const WEBGPU_PEER = "@graphty/webgpu-graph-algorithms";

/** The registered name of the accelerator built over {@link WEBGPU_PEER}. */
const ACCELERATOR = "webgpu-graph-algorithms";

/**
 * One recorded module-not-found shape: the message pattern, whose first group is the specifier,
 * and the `code` the error must carry when the runtime sets one.
 */
interface NotFoundShape {
    readonly pattern: RegExp;
    readonly code?: string;
}

/**
 * Every recorded way a missing package reaches the `catch` (captured 2026-10-22 unless noted).
 * Each pattern's first group is the specifier, which must be the peer or one of its subpaths.
 */
const NOT_FOUND_SHAPES: readonly NotFoundShape[] = [
    // Vite's optional-peer placeholder; dev adds " Is it installed?", a production build omits it.
    { pattern: /Could not resolve "([^"]+)" imported by "/ },
    // webpack 5.90.2 and later: `import()` inside `try` of a package it could not resolve.
    { pattern: /Cannot find module '([^']+)'/, code: "MODULE_NOT_FOUND" },
    // Node's ESM loader (esbuild and Rollup output run in Node).
    { pattern: /Cannot find package '([^']+)'/, code: "ERR_MODULE_NOT_FOUND" },
    // Chromium: a bare specifier no import map maps (Rollup, Rolldown, esbuild, ./bundle).
    { pattern: /Failed to resolve module specifier ["']([^"']+)["']/ },
    // Firefox, the same case. Its quotes are typographic, written as escapes here.
    { pattern: /The specifier ["'“]([^"'”]+)["'”] was a bare specifier/ },
    // Safari, the same case.
    { pattern: /Module name, '([^']+)' does not resolve to a valid URL/ },
];

/**
 * Whether a specifier names the peer or one of its subpaths.
 * @param specifier - The specifier an error message named.
 * @returns True for the peer.
 */
function isPeer(specifier: string): boolean {
    return specifier === WEBGPU_PEER || specifier.startsWith(`${WEBGPU_PEER}/`);
}

/**
 * Whether a load error is one of the recorded "this package is not installed" shapes, naming
 * the peer.
 * @param error - What the `import()` rejected with.
 * @returns True when the package is simply not there.
 */
export function isPeerMissing(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    const code = (error as { code?: unknown } | null)?.code;

    return NOT_FOUND_SHAPES.some((shape) => {
        const specifier = shape.pattern.exec(message)?.[1];
        return specifier !== undefined && isPeer(specifier) && (shape.code === undefined || code === shape.code);
    });
}

/**
 * Turns what the peer's `import()` rejected with into the element's error.
 * @param error - What the `import()` rejected with.
 * @returns `E_MISSING_PACKAGE` for a recorded not-installed shape, otherwise
 * `E_ACCELERATOR_FAILED` with the original as `cause`.
 */
export function classifyPeerLoadError(error: unknown): GraphtyError {
    if (isPeerMissing(error)) {
        return new GraphtyError({
            code: "E_MISSING_PACKAGE",
            message: `the optional package ${WEBGPU_PEER} is not installed`,
            source: "acceleration",
            recoverable: false,
            details: { accelerator: ACCELERATOR, package: WEBGPU_PEER, feature: "webgpu" },
            cause: error,
        });
    }

    const said = error instanceof Error ? error.message : String(error);
    return new GraphtyError({
        code: "E_ACCELERATOR_FAILED",
        message: `the optional package ${WEBGPU_PEER} is installed but failed to load: ${said}`,
        source: "acceleration",
        recoverable: false,
        details: { accelerator: ACCELERATOR, package: WEBGPU_PEER },
        cause: error,
    });
}

/**
 * Reads one named export, also looking under `default`: Vite has once given a dynamically
 * imported package an extra nested `default` in dev that its production build lacked
 * (vitejs/vite#17529), so the namespace's shape is not trusted.
 * @param namespace - What `import()` resolved to.
 * @param name - The export.
 * @returns The value, or undefined.
 */
function exportOf(namespace: unknown, name: string): unknown {
    const module = (namespace ?? {}) as Record<string, unknown>;
    return module[name] ?? (module.default as Record<string, unknown> | undefined)?.[name];
}

/** What the factory needs from the two loaded modules. */
export interface LoadedPeer {
    readonly root: { readonly EXACT_MAX_NODES: number };
    readonly acquireAccelerator: (...args: never[]) => unknown;
}

/**
 * Checks that the loaded package has what the element calls.
 * @param root - The peer's root module namespace.
 * @param browser - The peer's `/browser` module namespace.
 * @returns The exports, read by name.
 * @throws A `GraphtyError` with `E_ACCELERATOR_INCOMPATIBLE`, `params.missing` naming the
 * exports that were absent.
 */
export function checkPeerExports(root: unknown, browser: unknown): LoadedPeer {
    const exactMaxNodes = exportOf(root, "EXACT_MAX_NODES");
    const acquireAccelerator = exportOf(browser, "acquireAccelerator");
    const missing = [
        ...(typeof exactMaxNodes === "number" ? [] : ["EXACT_MAX_NODES"]),
        ...(typeof acquireAccelerator === "function" ? [] : ["acquireAccelerator"]),
    ];

    if (typeof exactMaxNodes !== "number" || typeof acquireAccelerator !== "function") {
        throw new GraphtyError({
            code: "E_ACCELERATOR_INCOMPATIBLE",
            message: `the installed ${WEBGPU_PEER} lacks ${missing.join(", ")}; install a version in graphty-element's peer range`,
            source: "acceleration",
            recoverable: false,
            details: { accelerator: ACCELERATOR, package: WEBGPU_PEER, missing },
        });
    }

    return {
        root: { EXACT_MAX_NODES: exactMaxNodes },
        acquireAccelerator: acquireAccelerator as LoadedPeer["acquireAccelerator"],
    };
}
