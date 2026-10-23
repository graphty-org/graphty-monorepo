/**
 * @file The root entry point's WebGPU loader: when `@graphty/webgpu-graph-algorithms` is
 * installed, the element uses it, and the consumer writes nothing.
 *
 * Importing this module registers a lazy factory under the name the explicit `./webgpu` entry
 * uses, and does nothing else. The first time a controller probes, the factory imports the
 * package, checks it has what the element calls, and builds the real factory through
 * `createWebGpuFactory` -- the same one `./webgpu` builds. `acceleration="off"` never probes, so
 * it never downloads the package.
 *
 * Every outcome is published on `capabilities.acceleration`: not installed is `E_MISSING_PACKAGE`
 * (and prints nothing), installed and broken is `E_ACCELERATOR_FAILED`, installed and lacking an
 * export is `E_ACCELERATOR_INCOMPATIBLE`, and installed on a browser with no usable GPU is the
 * probe's own code (`E_NO_WEBGPU`, `E_NO_ADAPTER`, ...).
 *
 * ## Why the import is written exactly this way
 *
 * Each `await import()` names the package as a string literal and sits directly inside `try`.
 * That is the form every bundler recognises as an optional import: webpack (5.90.2 and later)
 * checks that the `import()` is lexically inside `try`, esbuild treats `try { await import() }`
 * as external when it cannot resolve it, Vite substitutes a placeholder module for an optional
 * peer that is not installed, and Rollup leaves an unresolved specifier external. Present, the
 * package becomes a lazy chunk of its own in each of them. Absent, the build passes and the
 * `catch` runs. A computed specifier, a `.then().catch()` chain, or a static import of the
 * package in a lazily loaded module breaks one bundler or another.
 *
 * Only `index.ts` (and `bundle.ts` through it) imports this file. The Node-safe entry points
 * never reach it, so a Node consumer never tries to import a browser-only subpath.
 */

import { checkPeerExports, classifyPeerLoadError } from "./peerLoad";
import { registerDefaultAccelerator } from "./registry";
import type { AcceleratorFactory, AcceleratorFactoryOptions, GraphAccelerator } from "./types";
import { createWebGpuFactory, WEBGPU_ACCELERATOR_NAME, type WebGpuPeerBrowser } from "./webgpuFactory";

let loaded: Promise<AcceleratorFactory> | null = null;

/**
 * Imports the package and builds the factory over it.
 * @returns The factory.
 * @throws A `GraphtyError` with `E_MISSING_PACKAGE`, `E_ACCELERATOR_FAILED` or
 * `E_ACCELERATOR_INCOMPATIBLE`.
 */
async function loadFactory(): Promise<AcceleratorFactory> {
    let root: unknown;
    let browser: unknown;
    try {
        root = await import("@graphty/webgpu-graph-algorithms");
        browser = await import("@graphty/webgpu-graph-algorithms/browser");
    } catch (error) {
        throw classifyPeerLoadError(error);
    }

    const peer = checkPeerExports(root, browser);
    return createWebGpuFactory(peer.root, {
        acquireAccelerator: peer.acquireAccelerator as WebGpuPeerBrowser["acquireAccelerator"],
    });
}

/**
 * The lazy factory: loads the package once per page, then delegates every probe to the factory
 * built over it.
 * @param options - Passed to the real factory.
 * @returns What the real factory returns.
 * @throws What {@link loadFactory} or the real factory throws.
 */
async function lazyWebGpuFactory(options?: AcceleratorFactoryOptions): Promise<GraphAccelerator | null> {
    loaded ??= loadFactory();
    const factory = await loaded;
    return factory(options);
}

registerDefaultAccelerator({ name: WEBGPU_ACCELERATOR_NAME, backend: "webgpu", factory: lazyWebGpuFactory });
