/**
 * The two types the memory AND the kernel layers share: they live here so src/kernel/kernel.ts never imports
 * src/memory/** for a type and the layer graph has no cycle (test/layers.test.ts). Types only; GPUBuffer is the ambient @webgpu/types global.
 */

/** One 64-arc-aligned window of colIdx / weights: the slice of the arc arrays one binding covers. */
export interface ArcWindow {
    readonly start: number;
    readonly end: number;
    readonly rowFirst: number;
    readonly rowLast: number;
    readonly bufferIndex: number;
    readonly offset: number;
}

/** A storage-buffer range; `window` is non-null only for a binding of one arc window. */
export interface Binding {
    readonly buffer: GPUBuffer;
    readonly offset: number;
    readonly size: number;
    readonly window: ArcWindow | null;
}
