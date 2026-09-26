/**
 * The shape helpers every core-walking primitive shares (spec 4.1): the row count and the arc count a CoreBinding
 * implies, the per-window binding of a windowed core (P4-T7, PD-8), the windowed rejections the pull and the
 * whole-core drivers keep (DEP-P4-B), and the ViewBinding -> CoreBinding adapter the P7 pull kernels need.
 * Moved out of segmented-reduce.ts by M8b-T4 so spmv.ts can use them without duplicating them; the `primitive`
 * argument keeps each caller's error details byte-identical to what they were when the helpers were private.
 */

import { WebGpuGraphError } from "../errors.js";
import { type CoreBinding, type ViewBinding } from "../memory/residency.js";
import { type ArcWindow, type Binding } from "../types/memory.js";

/** The lanes one TIER 1 (mid-degree) row is folded by, in segmentedReduce and spmvPull alike (PD-6: bitwise the same on every subgroup size). */
export const MID_TIER_LANES = 32;

/** The degree tiers of degreeOrder(): the permutation binding and the CPU-side segmentOffsets [0, hiEnd, midEnd, lowEnd, n]. */
export interface DegreeTiers {
    readonly perm: Binding;
    readonly segmentOffsets: readonly [number, number, number, number, number];
}

/**
 * The DegreeTiers of a degreeOrder / reverseDegreeOrder view (the perm binding and the five segment offsets
 * [0, hiEnd, midEnd, lowEnd, n] of graph-format's cuGraph thresholds 1024 / 32 / 1).
 * @param view - residency.view(s, "degreeOrder") or view(s, "reverseDegreeOrder")
 * @returns the tiers; E_INVALID_ARGUMENT when the view has no perm binding or its segmentOffsets are not five
 * ascending numbers ending at the row count (4 bytes per row of the perm binding)
 */
export function degreeTiersOf(view: ViewBinding): DegreeTiers {
    const { perm }: { readonly perm?: Binding | undefined } = view.bindings;
    if (perm === undefined) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `the ${view.view} view has no perm binding`, {
            argument: "view",
            value: view.view,
            expected: "a view with a perm binding (degreeOrder, reverseDegreeOrder)",
        });
    }
    const so: readonly number[] | undefined = view.scalars.segmentOffsets;
    const ascending =
        so !== undefined &&
        so.length === 5 &&
        so[0] === 0 &&
        so.every((value, k) => Number.isInteger(value) && (k === 0 || value >= so[k - 1]));
    if (!ascending || so[4] !== perm.size / 4) {
        throw new WebGpuGraphError(
            "E_INVALID_ARGUMENT",
            `the ${view.view} view's segmentOffsets are not five ascending numbers ending at the row count`,
            {
                argument: "view",
                value: so === undefined ? null : Array.from(so),
                expected: `[0, hiEnd, midEnd, lowEnd, ${perm.size / 4}] ascending`,
            },
        );
    }
    const segmentOffsets: readonly [number, number, number, number, number] = [so[0], so[1], so[2], so[3], so[4]];
    return Object.freeze({ perm, segmentOffsets });
}

/**
 * The row count of a core from its rowPtr binding (4(n + 1) bytes).
 * @param core - the core
 * @param primitive - the caller's name, used in the message and the detail
 * @returns n
 */
export function rowCountOf(core: CoreBinding, primitive: string): number {
    const bytes = core.rowPtr.size;
    if (bytes < 4 || bytes % 4 !== 0) {
        throw new WebGpuGraphError(
            "E_INVALID_ARGUMENT",
            `${primitive}: a rowPtr binding of ${bytes} bytes is not 4(n + 1)`,
            {
                argument: "core.rowPtr",
                value: bytes,
                expected: "a positive multiple of 4",
            },
        );
    }
    return bytes / 4 - 1;
}

/**
 * The arc count a core implies: the colIdx binding is 4 bytes per arc, and a null colIdx is an arc-less snapshot.
 * @param core - the core
 * @returns the arc count
 */
export function arcCountOf(core: CoreBinding): number {
    return core.colIdx === null ? 0 : core.colIdx.size / 4;
}

/**
 * The binding of one arc window of a windowed core's arc-indexed array (spec 4.2): the buffer the window was placed
 * in, at the window's offset, over its arcs; the kernel reads `array[arc - P.arcBase]` with `arcBase = w.start`.
 * @param core - a windowed core (arcBuffers non-null)
 * @param name - the arc-indexed array
 * @param w - one of core.windows
 * @returns the binding; E_INVALID_ARGUMENT when the core is not windowed or the array is absent
 */
export function windowBinding(core: CoreBinding, name: "colIdx" | "weights" | "arcToEdge", w: ArcWindow): Binding {
    const buffer = core.arcBuffers?.[name][w.bufferIndex];
    if (buffer === undefined) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `windowBinding: the core has no window buffers of ${name}`, {
            argument: "core",
            value: name,
            expected: "a windowed core whose plan uploaded the array",
        });
    }
    return { buffer, offset: w.offset, size: 4 * (w.end - w.start), window: w };
}

/** One dispatch of a frontier-walking kernel over a core (P8-T12): the arc range it owns and the core with its arc-indexed arrays bound to that window (the core itself, over every arc, when it is not windowed). */
export interface CoreWindow {
    readonly arcBase: number;
    readonly arcEnd: number;
    readonly core: CoreBinding;
}

/**
 * The per-window dispatches of a kernel that walks rows named by a FRONTIER rather than by a row range (P8-T12:
 * `advance-expand`, `bfs-fused`, `bfs-bottom-up`, `sssp-pred`): every window sees every frontier entry and clips
 * each row to `[arcBase, arcEnd)`, so the ranges must PARTITION `[0, arcCount)` or a row is expanded twice. P4's
 * windows do not: `planArcWindows` opens a window at the previous window's end aligned DOWN to 64 arcs, so two
 * consecutive windows overlap by up to 63 arcs at an unaligned row boundary (the overlap belongs to the earlier
 * window's rows, which a row-range dispatch such as `degree` never revisits). Here a window owns `[start, next
 * window's start)` -- the last one `[start, end)` -- which is inside its binding (`next.start <= end`) and
 * partitions the arcs exactly; a window whose owned range is empty dispatches, harmlessly, over nothing.
 * @param core - the core (windowed or not)
 * @returns one entry per window, in arc order; exactly one entry over `[0, arcCount)` when the core is not windowed
 */
export function coreWindows(core: CoreBinding): readonly CoreWindow[] {
    if (core.windows === null) {
        return [{ arcBase: 0, arcEnd: arcCountOf(core), core }];
    }
    return core.windows.map((w, k, all) => ({
        arcBase: w.start,
        arcEnd: k + 1 < all.length ? all[k + 1].start : w.end,
        core: {
            ...core,
            colIdx: windowBinding(core, "colIdx", w),
            weights: core.weights === null ? null : windowBinding(core, "weights", w),
        },
    }));
}

/**
 * Rejects a windowed core: the pull cannot accumulate its affine epilogue across windows (DEP-P4-B).
 * @param core - the core
 * @param primitive - the caller's name, used in the message and the feature detail
 */
export function assertNotWindowed(core: CoreBinding, primitive: string): void {
    if (core.plan === "windowed" || core.windows !== null) {
        throw new WebGpuGraphError("E_UNSUPPORTED", `${primitive}: windowed cores are not executed by the pull`, {
            feature: `${primitive}.windowed`,
        });
    }
}

/**
 * Rejects a windowed core for a driver that walks the whole core (DEP-P4-B: pageRank, the power iterations and
 * connectedComponents): `E_TOO_LARGE { needed, limit, path: "windowed", algorithm }` (spec 3.8 / 3.12), the refusal
 * GraphResidency.core() itself issued before P4-T7 executed windows for degree and segmentedReduce.
 * @param core - the core
 * @param arcCount - the snapshot's arc count (4 bytes per arc of each arc-indexed array)
 * @param limit - the device's maxStorageBufferBindingSize
 * @param algorithm - the driver's name
 */
export function assertWholeCore(core: CoreBinding, arcCount: number, limit: number, algorithm: string): void {
    if (core.plan === "windowed") {
        throw new WebGpuGraphError(
            "E_TOO_LARGE",
            `${algorithm}: the arc arrays need a windowed upload (${core.windows?.length ?? 0} windows), which ${algorithm} does not execute (DEP-P4-B)`,
            { needed: 4 * arcCount, limit, path: "windowed", algorithm },
        );
    }
}

/**
 * The CoreBinding shape of a residency VIEW (spec 4.3). residency.view() returns a ViewBinding -- a name -> Binding
 * record -- while graphBindings / graphOverrides and every core-walking primitive read rowPtr / colIdx / weights as
 * top-level fields (src/kernels.ts graphBindings / graphOverrides). This is the only adapter between the two in the
 * package. `plan` is "perArray" because views always upload per array (spec 4.3 lines 1182-1186) and `windows` is
 * null because a view is never windowed, which is what makes assertNotWindowed pass for a view. `serial` is -1: a
 * view is not a core and no caller of this function reads serial (nothing in src/primitives or src/algorithms
 * reads CoreBinding.serial). A zero-size `colIdx` or `weights` binding (the reverse view of an arc-less directed
 * snapshot uploads zero-byte arc arrays) becomes null, the core's own spelling of "no arcs", so `graphBindings` binds
 * the dummy instead of a zero-length range (P8-T8: the one-node directed fixture of the BFS suite).
 * @param v - the view binding, from residency.view(s, "reverse") or view(s, "edgeList")
 * @param arcCount - the arc count of the view, from v.scalars.arcCount[0]; it must agree with the colIdx binding,
 * which is what record() derives the arc window from (E_INVALID_ARGUMENT { argument: "arcCount" } otherwise)
 * @returns the equivalent CoreBinding
 */
export function coreOfView(v: ViewBinding, arcCount: number): CoreBinding {
    const { rowPtr }: { readonly rowPtr?: Binding | undefined } = v.bindings;
    if (rowPtr === undefined) {
        throw new WebGpuGraphError("E_INVALID_ARGUMENT", `the ${v.view} view has no rowPtr binding`, {
            argument: "view",
            value: v.view,
            expected: "a view with a rowPtr binding (reverse)",
        });
    }
    // an arc-less DIRECTED snapshot's reverse view uploads zero-byte arc arrays; the core spells "no arcs" as null
    // (graphBindings then binds the rowPtr dummy), and a zero-size binding is never bound (spec 3.6)
    const colIdx = v.bindings.colIdx === undefined || v.bindings.colIdx.size === 0 ? null : v.bindings.colIdx;
    const weights = v.bindings.weights === undefined || v.bindings.weights.size === 0 ? null : v.bindings.weights;
    const bound = colIdx === null ? 0 : colIdx.size / 4;
    if (bound !== arcCount) {
        throw new WebGpuGraphError(
            "E_INVALID_ARGUMENT",
            `the ${v.view} view binds ${bound} arcs but its arcCount scalar says ${arcCount}`,
            {
                argument: "arcCount",
                value: arcCount,
                expected: bound,
            },
        );
    }
    return Object.freeze({
        serial: -1,
        plan: "perArray" as const,
        rowPtr,
        colIdx,
        weights,
        arcToEdge: null,
        edgeToArc: null,
        windows: null,
        arcBuffers: null,
        hasWeights: weights !== null,
    });
}
