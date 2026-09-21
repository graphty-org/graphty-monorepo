/**
 * @file `@graphty/graphty-element/extend`: the registration surface a third party writes against.
 *
 * ```js
 * import { LayoutEngine, registerAccelerator } from "@graphty/graphty-element/extend";
 * ```
 *
 * Four things can be brought to the element from outside today: an algorithm, a layout engine, a
 * data source and a hardware accelerator. Each is a class or a function registered with the
 * subsystem that runs it, and every one of those subsystems is free of the renderer, so this
 * entry point resolves in Node, in a worker and in a build script. A plugin can therefore be
 * written, unit-tested and published without a browser anywhere in the loop.
 *
 * Failures are reported as a `GraphtyError` carrying a stable code, so a plugin reports a
 * problem the same way the element does rather than inventing an error class of its own.
 *
 * Node-safety is enforced by a test: `test/packaging/node-safe-entries.test.ts` resolves this
 * module's import graph and fails if Babylon.js, Lit or a DOM global appears in it.
 */

// ---------------------------------------------------------------------------------------------
// Acceleration: a factory, registered by name, called with the ceiling it must respect
// ---------------------------------------------------------------------------------------------

export type {
    AccelerationPrecision,
    AcceleratorDeviceInfo,
    AcceleratorFactory,
    AcceleratorFactoryOptions,
    AcceleratorRegistration,
    GraphAccelerator,
    RegisterAcceleratorOptions,
} from "./src/acceleration";
export { AcceleratorRegistry, acceleratorRegistry, DEFAULT_ACCELERATOR_PRECISION, registerAccelerator } from "./src/acceleration";

// ---------------------------------------------------------------------------------------------
// Algorithms, layouts and data sources: a class, registered with its own base
// ---------------------------------------------------------------------------------------------

export type { AlgorithmStatics } from "./src/algorithms/Algorithm";
export { Algorithm } from "./src/algorithms/Algorithm";
export type { OptionDefinition, OptionsFromSchema, OptionsSchema } from "./src/algorithms/types/OptionSchema";
export { defineOptionsSchema, OptionValidationError, resolveOptions, validateOption } from "./src/algorithms/types/OptionSchema";
export type { BaseDataSourceConfig, DataSourceChunk } from "./src/data/DataSource";
export { DataSource } from "./src/data/DataSource";
export type { EdgePosition, Position, SimpleLayoutConfigType, SimpleLayoutOpts } from "./src/layout/LayoutEngine";
export { LayoutEngine, SimpleLayoutConfig, SimpleLayoutEngine } from "./src/layout/LayoutEngine";

// ---------------------------------------------------------------------------------------------
// How a plugin reports a failure
// ---------------------------------------------------------------------------------------------

export type { GraphtyErrorCode, GraphtyErrorInit, GraphtyErrorSource, GraphtyErrorTarget } from "./src/errors";
export { GraphtyError, isGraphtyError } from "./src/errors";
