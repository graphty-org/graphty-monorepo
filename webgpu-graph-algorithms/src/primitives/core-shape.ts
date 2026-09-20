/**
 * The shape helpers every core-walking primitive shares (spec 4.1): the row count and the arc count a CoreBinding
 * implies, the windowed rejection of P4, and the ViewBinding -> CoreBinding adapter the P7 pull kernels need.
 * Moved out of segmented-reduce.ts by M8b-T4 so spmv.ts can use them without duplicating them; the `primitive`
 * argument keeps each caller's error details byte-identical to what they were when the helpers were private.
 */

import { WebGpuGraphError } from "../errors.js";
import { type CoreBinding, type ViewBinding } from "../memory/residency.js";
import { type Binding } from "../types/memory.js";

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
 * Rejects a windowed core (executed at P4).
 * @param core - the core
 * @param primitive - the caller's name, used in the message and the feature detail
 */
export function assertNotWindowed(core: CoreBinding, primitive: string): void {
    if (core.plan === "windowed" || core.windows !== null) {
        throw new WebGpuGraphError("E_UNSUPPORTED", `${primitive}: windowed cores are executed at P4`, {
            feature: `${primitive}.windowed`,
        });
    }
}

/**
 * The CoreBinding shape of a residency VIEW (spec 4.3). residency.view() returns a ViewBinding -- a name -> Binding
 * record -- while graphBindings / graphOverrides and every core-walking primitive read rowPtr / colIdx / weights as
 * top-level fields (src/kernels.ts graphBindings / graphOverrides). This is the only adapter between the two in the
 * package. `plan` is "perArray" because views always upload per array (spec 4.3 lines 1182-1186) and `windows` is
 * null because a view is never windowed, which is what makes assertNotWindowed pass for a view. `serial` is -1: a
 * view is not a core and no caller of this function reads serial (nothing in src/primitives or src/algorithms
 * reads CoreBinding.serial).
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
    const colIdx = v.bindings.colIdx ?? null;
    const weights = v.bindings.weights ?? null;
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
        hasWeights: weights !== null,
    });
}
