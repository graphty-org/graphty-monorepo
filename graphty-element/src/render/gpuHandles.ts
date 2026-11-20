/**
 * @file A WebGPU device and buffer as graphty-element's own declarations name them: opaque, so no
 * published `.d.ts` names `GPUDevice` or `GPUBuffer` and a consumer is never asked to install
 * `@webgpu/types` for graphty-element's sake (`tsconfig.strict-consumer.json` checks it). The code
 * that uses one casts it back to the WebGPU type where it calls the device.
 */

/** A `GPUDevice`, carried without naming the type. */
export type GpuDeviceHandle = object & { readonly gpuDeviceHandle?: never };

/** A `GPUBuffer`, carried without naming the type. */
export type GpuBufferHandle = object & { readonly gpuBufferHandle?: never };
