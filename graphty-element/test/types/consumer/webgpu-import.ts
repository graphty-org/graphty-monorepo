/**
 * @file The compile a third party gets, run against the published declarations.
 *
 * Two lines are the whole WebGPU integration for a consumer: import the element, import
 * `@graphty/graphty-element/webgpu`. This file is those lines plus the types a status chip and a
 * third-party accelerator need, compiled against `dist/` by `tsconfig.strict-consumer.json`
 * rather than against `src/` -- so what is checked is what is published.
 *
 * It is a compile, not a test: nothing here runs. What it catches is a GPU type escaping into the
 * published surface. `GPUDevice`, `GPUBuffer` and the rest come from `@webgpu/types`, which the
 * strict-consumer project does not put in scope and which a consumer of this package is never
 * asked to install. A declaration that named one would fail to resolve here, which is the same
 * error that consumer's build would report -- found in this repository instead of in theirs.
 */

import "@graphty/graphty-element/webgpu";

import type { Capabilities, GraphAccelerator } from "@graphty/graphty-element/session";

/**
 * What a status chip renders, written the way a consumer writes it.
 *
 * Plain, serialisable data with no device object anywhere in it, which is what lets an
 * application put the vendor on screen without importing a GPU type.
 */
export const status: Capabilities["acceleration"] = {
    policy: "auto",
    state: "idle",
    backend: "webgpu",
    vendor: "acme",
    architecture: "gen-1",
    device: "Acme Fake GPU",
};

/**
 * An accelerator supplied by someone other than this package.
 *
 * The boundary is names and functions: a third party implements one member and hands it over,
 * and nothing in the shape of the thing they hand over mentions WebGPU.
 */
export const injected: GraphAccelerator = {
    name: "third-party",
    backend: "webgpu",
    precision: "f32",
    forceAtlas2: (): never => {
        throw new Error("this accelerator is a type-level example, not a working one");
    },
};
