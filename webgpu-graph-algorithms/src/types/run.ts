/**
 * The run options every algorithm function accepts beside its own.
 * Types only.
 */

/** Options every algorithm function accepts in addition to its own. */
export interface GpuRunOptions {
    /** A preallocated destination of exact length; E_INVALID_ARGUMENT when the length does not match. */
    readonly dest?: Float32Array | Uint32Array | undefined;
    /** Checked between batches; E_ABORTED. */
    readonly signal?: AbortSignal | undefined;
    readonly onProgress?: ((done: number, total: number) => void) | undefined;
}
