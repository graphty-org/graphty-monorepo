/**
 * @file The acceleration subsystem: the types a consumer reads, the registry an entry point
 * registers into, and the controller that owns the hardware.
 *
 * Nothing here names a GPU type. WebGPU arrives through the `@graphty/graphty-element/webgpu`
 * entry point, which is a side-effect import and the whole of a consumer's integration.
 */

export { AccelerationController } from "./AccelerationController";
export type { AcceleratorRegistration, RegisterAcceleratorOptions } from "./registry";
export { AcceleratorRegistry, acceleratorRegistry, registerAccelerator } from "./registry";
export type {
    AccelerationCapabilities,
    AccelerationPolicy,
    AccelerationPrecision,
    AccelerationState,
    AccelerationStatus,
    AcceleratorDeviceInfo,
    AcceleratorFactory,
    AcceleratorFactoryOptions,
    CalibrationRecord,
    Capabilities,
    CaptureCapability,
    GraphAccelerator,
    Limits,
    WorkerCapability,
    XrCapability,
} from "./types";
export {
    ACCELERATION_MIN_NODES_DEFAULT,
    ACCELERATION_MIN_NODES_KEY,
    CPU_PRECISION,
    DEFAULT_ACCELERATOR_PRECISION,
} from "./types";
