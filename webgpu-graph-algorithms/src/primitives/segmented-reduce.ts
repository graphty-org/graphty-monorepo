/**
 * The segmented (per-row) reduction primitive of spec 6 row 3: the caller's VALUE snippet folded over every CSR
 * row's arcs into `out[row]` (f32), a row with no arcs receiving the identity element. Without tiers it is ONE
 * thread-per-row dispatch (TIER 0, USE_PERM false: the perm slot carries the rowPtr dummy of graphBindings). With
 * the degree tiers of degreeOrder() (P4-T5, PD-6) it is up to three dispatches over the permuted rows: TIER 2, one
 * workgroup per row of degree >= 1024 over [0, hiEnd); TIER 1, 32 lanes per row of degree 32..1023 over [hiEnd,
 * midEnd); TIER 0, one thread per row over [midEnd, n) -- each compiled only when its range is non-empty. The row
 * and arc counts come from the core's binding sizes: the residency binds every array at its exact byte length
 * (contract 3.8), so rowPtr is 4(n + 1) bytes and colIdx 4 x arcCount. On a windowed core (spec 4.2, P4-T7, PD-8)
 * the dispatches repeat per window with `arcBase = w.start`, `arcEnd = w.end` and `accumulate = 1` over an out
 * pre-filled with the identity element (unless the caller asked to accumulate), so a row split across windows
 * combines its partials: the untiered dispatch covers the window's rows [rowFirst, rowLast], while every tier
 * dispatch covers its FULL tier range (permutation positions, not comparable with the window's node rows; a row
 * whose arcs lie outside the window folds nothing and `finish` writes comb(out[i], identity) = out[i]).
 */

import { WebGpuGraphError } from "../errors.js";
import { plan1d } from "../kernel/dispatch.js";
import { type Kernel } from "../kernel/kernel.js";
import { FILL_PARAMS, graphBindings, graphOverrides, kernelSpec, RANGE_PARAMS } from "../kernels.js";
import { type CoreBinding } from "../memory/residency.js";
import { type ArcWindow, type Binding } from "../types/memory.js";
import { arcCountOf, type DegreeTiers, MID_TIER_LANES, rowCountOf, windowBinding } from "./core-shape.js";
import { type ReduceOp, type ReduceScope } from "./reduce.js";

export { type DegreeTiers } from "./core-shape.js";

/** Options of segmentedReduce. `valueSnippet` is the Gunrock-style functor: WGSL statements assigning `v` from (row, arc, nbr, weight) (4.5; `nbr` because `target` is a WGSL reserved word). */
export interface SegmentedReduceOptions {
    readonly op: ReduceOp;
    readonly valueSnippet: string;
    readonly tiers: DegreeTiers | null;
    readonly accumulate?: boolean | undefined;
}

/** A prepared segmented reduce: one thread-per-row dispatch without tiers, up to three tier dispatches with them (times the windows of a windowed core, plus its identity fill). */
export interface SegmentedReducePlanner {
    /** Records the dispatches over rows [0, n) writing out[i] (f32) per row; a row with no arcs gets the identity element. */
    record(pass: GPUComputePassEncoder, core: CoreBinding, out: Binding): void;
    /** Dispatches the last record() issued (0 for n = 0; 1 without tiers; 1 to 3 with them; on a windowed core the identity fill plus that many per window). */
    readonly lastDispatches: number;
}

/** The largest finite f32, 0x1.fffffep+127 (the prelude's F32_MAX): the min identity; its negation the max identity. */
const F32_MAX = 2 ** 128 - 2 ** 104;

/**
 * The u32 bit pattern the `fill` kernel writes so every out word holds the identity element of the operator before
 * the windowed dispatches accumulate into it (PD-8).
 * @param op - the operator
 * @returns the bits of 0 (sum), F32_MAX (min) or -F32_MAX (max)
 */
function identityFillWord(op: ReduceOp): number {
    let identity = 0;
    if (op === "min") {
        identity = F32_MAX;
    } else if (op === "max") {
        identity = -F32_MAX;
    }
    const view = new DataView(new ArrayBuffer(4));
    view.setFloat32(0, identity, true);
    return view.getUint32(0, true);
}

/** The identifiers a VALUE snippet may name (contract 3.11, 4.5); every other identifier is rejected textually before compose. */
const VALUE_SNIPPET_VOCABULARY: ReadonlySet<string> = new Set(["row", "arc", "nbr", "weight", "v"]);

/**
 * The WGSL words a snippet statement may use that are not identifiers: the statement keywords (never the flow
 * keywords `return` / `break` / `continue`, which would leave the fold), the scalar type constructors and the
 * builtin math functions a value expression may call (a bounded list; a binding, a uniform or a module function such
 * as `identity` / `comb` / `linear_id` is NOT in it and is rejected as an identifier).
 */
const VALUE_SNIPPET_WGSL_WORDS: ReadonlySet<string> = new Set([
    "if",
    "else",
    "let",
    "var",
    "const",
    "true",
    "false",
    "f32",
    "u32",
    "i32",
    "bool",
    "abs",
    "ceil",
    "clamp",
    "exp",
    "exp2",
    "floor",
    "fract",
    "inverseSqrt",
    "log",
    "log2",
    "max",
    "min",
    "mix",
    "pow",
    "round",
    "select",
    "sign",
    "sqrt",
    "step",
    "trunc",
]);

/**
 * The OP override value of an operator (the body's `OP == 1u` / `OP == 2u` tests, contract 4.5).
 * @param op - the operator
 * @returns 0 for sum, 1 for min, 2 for max
 */
function opCode(op: ReduceOp): number {
    switch (op) {
        case "sum":
            return 0;
        case "min":
            return 1;
        case "max":
            return 2;
        default:
            throw new WebGpuGraphError("E_INVALID_ARGUMENT", `segmentedReduce: unknown op ${String(op)}`, {
                argument: "op",
                value: op,
                expected: "sum | min | max",
            });
    }
}

/**
 * WGSL comments removed (a comment may mention `target` or any other word).
 * @param text - WGSL text
 * @returns the text with block and line comments replaced by spaces
 */
function stripComments(text: string): string {
    return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

/**
 * The textual vocabulary check of contract 3.11: the snippet must assign `v` (`=`, `+=`, `-=`, `*=` or `/=`) and its
 * identifiers may be only row, arc, nbr, weight and v; numeric literals and the WGSL words of
 * VALUE_SNIPPET_WGSL_WORDS are not identifiers and pass; anything else -- a binding, a uniform, a module function,
 * a locally declared name, a flow keyword, a reserved word such as `target` -- is E_SHADER_COMPILE { stage:
 * "compose", slot: "VALUE", identifier } on every device, before any shader is created.
 * @param snippet - the VALUE snippet text
 */
function validateValueSnippet(snippet: string): void {
    const code = stripComments(snippet);
    if (!/\bv\s*[-+*/]?=(?!=)/.test(code)) {
        throw new WebGpuGraphError("E_SHADER_COMPILE", "segmentedReduce: the VALUE snippet never assigns v", {
            id: "segmented-reduce",
            stage: "compose",
            slot: "VALUE",
        });
    }
    const tokens = code.match(/[A-Za-z_][A-Za-z0-9_]*|[0-9][0-9A-Za-z_.]*/g) ?? [];
    for (const token of tokens) {
        if (/^[0-9]/.test(token) || VALUE_SNIPPET_VOCABULARY.has(token) || VALUE_SNIPPET_WGSL_WORDS.has(token)) {
            continue;
        }
        throw new WebGpuGraphError(
            "E_SHADER_COMPILE",
            `segmentedReduce: the VALUE snippet names "${token}"; the only identifiers allowed are row, arc, nbr, weight and v`,
            { id: "segmented-reduce", stage: "compose", slot: "VALUE", identifier: token },
        );
    }
}

/** One tier's compiled pipeline and the rows [start, end) of the permutation it covers per record() (a tier whose range is empty is not compiled). */
interface TierDispatch {
    readonly tier: 0 | 1 | 2;
    readonly kernel: Kernel;
    readonly start: number;
    readonly end: number;
}

/**
 * The tiered planner: without tiers ONE `segmented-reduce` dispatch with TIER 0 over [0, n); with tiers TIER 2 over
 * [0, hiEnd) (one workgroup per row), then TIER 1 over [hiEnd, midEnd) (WG / 32 rows per workgroup), then TIER 0
 * over [midEnd, n), each with its own RangeParams record and the perm binding.
 */
class TieredPlanner implements SegmentedReducePlanner {
    private readonly scope: ReduceScope;
    private readonly tiers: readonly TierDispatch[];
    private readonly fill: Kernel;
    private readonly perm: Binding | null;
    private readonly hasWeights: boolean;
    private readonly accumulate: boolean;
    private readonly identityWord: number;
    private dispatches = 0;

    /**
     * Wraps the compiled tier pipelines with the pattern they were compiled for.
     * @param scope - the scope the pipelines were prepared in
     * @param tiers - the compiled tiers in dispatch order (TIER 2, 1, 0; only the non-empty ones)
     * @param fill - the `fill` pipeline of the identity pre-fill of a windowed core
     * @param perm - the degreeOrder permutation binding (null: USE_PERM false, rows are node indices)
     * @param hasWeights - the HAS_WEIGHTS the pipelines were compiled with
     * @param accumulate - whether record() combines into out instead of overwriting
     * @param identityWord - the u32 bits of the operator's identity element (identityFillWord)
     */
    constructor(
        scope: ReduceScope,
        tiers: readonly TierDispatch[],
        fill: Kernel,
        perm: Binding | null,
        hasWeights: boolean,
        accumulate: boolean,
        identityWord: number,
    ) {
        this.scope = scope;
        this.tiers = tiers;
        this.fill = fill;
        this.perm = perm;
        this.hasWeights = hasWeights;
        this.accumulate = accumulate;
        this.identityWord = identityWord;
    }

    /**
     * Dispatches the last record() issued.
     * @returns 0 for n = 0, else the number of non-empty tier ranges
     */
    get lastDispatches(): number {
        return this.dispatches;
    }

    /**
     * Records the dispatches: every tier's rows over the arcs [0, arcCount), each with its own params record;
     * nothing for n = 0 (no zero-length binding is ever created). On a windowed core: the identity fill (unless
     * accumulating into the caller's out), then the dispatches once per window (PD-8).
     * @param pass - the pass to record into
     * @param core - a core with the SAME weights pattern as the one prepared (any snapshot; with tiers, the one the
     * tiers were built from)
     * @param out - at least 4n bytes of f32
     */
    record(pass: GPUComputePassEncoder, core: CoreBinding, out: Binding): void {
        if ((core.weights !== null) !== this.hasWeights) {
            throw new WebGpuGraphError(
                "E_INVALID_ARGUMENT",
                "segmentedReduce: the core's weights pattern differs from the one prepared",
                {
                    argument: "core",
                    value: core.weights !== null,
                    expected: this.hasWeights,
                },
            );
        }
        const n = rowCountOf(core, "segmentedReduce");
        if (out.size < 4 * n) {
            throw new WebGpuGraphError(
                "E_INVALID_ARGUMENT",
                `segmentedReduce: out holds ${out.size} bytes, ${4 * n} needed`,
                {
                    argument: "out",
                    value: out.size,
                    expected: `>= ${4 * n}`,
                },
            );
        }
        this.dispatches = 0;
        if (n === 0) {
            return;
        }
        if (core.windows === null) {
            this.recordWindow(pass, core, out, n, null, 0);
            return;
        }
        if (!this.accumulate) {
            const params = this.scope.params(FILL_PARAMS, { count: n, value: this.identityWord, mode: 0 });
            const bound = this.fill.bind({ dst: out, P: params.binding });
            this.fill.dispatch(pass, bound, plan1d(n, this.scope.workgroupSize, this.scope.caps), [params.offset]);
            this.dispatches++;
        }
        const { windows } = core;
        windows.forEach((w, k) => {
            const windowed: CoreBinding = {
                ...core,
                colIdx: windowBinding(core, "colIdx", w),
                weights: core.weights === null ? null : windowBinding(core, "weights", w),
            };
            this.recordWindow(pass, windowed, out, n, w, k + 1 < windows.length ? windows[k + 1].start : w.end);
        });
    }

    /**
     * The tier dispatches over one arc window (or the whole core when `w` is null): every non-empty tier over its
     * full range, except the untiered TIER 0 dispatch, which covers exactly the window's rows. Consecutive windows
     * overlap by up to ARC_WINDOW_ALIGN - 1 arcs (the next window opens at the aligned-down end of this one), and a
     * tier dispatch visits EVERY row, so the tiers fold [w.start, nextStart) and leave the overlap to the next
     * window; the untiered dispatch keeps [w.start, w.end): its rows [rowFirst, rowLast] are exactly the rows whose
     * arcs end inside this window, and the next window's rows start after them.
     * @param pass - the pass to record into
     * @param core - the core with the window's colIdx / weights bound
     * @param out - the output binding
     * @param n - the row count
     * @param w - the window, or null for the single whole-core dispatch
     * @param nextStart - the next window's first arc (w.end for the last window)
     */
    private recordWindow(
        pass: GPUComputePassEncoder,
        core: CoreBinding,
        out: Binding,
        n: number,
        w: ArcWindow | null,
        nextStart: number,
    ): void {
        const wg = this.scope.workgroupSize;
        for (const { tier, kernel, start, end } of this.tiers) {
            let first = start;
            let last = tier === 0 ? n : end;
            let arcEnd = w === null ? arcCountOf(core) : Math.min(w.end, nextStart);
            if (w !== null && this.perm === null) {
                first = w.rowFirst;
                last = w.rowLast + 1;
                arcEnd = w.end;
            }
            const rows = last - first;
            if (rows <= 0) {
                continue;
            }
            const params = this.scope.params(RANGE_PARAMS, {
                start: first,
                end: last,
                arcBase: w === null ? 0 : w.start,
                arcEnd,
                accumulate: w !== null || this.accumulate ? 1 : 0,
                n,
            });
            const bound = kernel.bind({ ...graphBindings(core, this.perm), out, P: params.binding });
            let rowsPerGroup = wg;
            if (tier === 2) {
                rowsPerGroup = 1;
            } else if (tier === 1) {
                rowsPerGroup = wg / MID_TIER_LANES;
            }
            kernel.dispatch(pass, bound, plan1d(rows, rowsPerGroup, this.scope.caps), [params.offset]);
            this.dispatches++;
        }
    }
}

/**
 * Prepares the tier pipelines for a snapshot's dummy pattern (USE_PERM = tiers !== null, HAS_WEIGHTS) and snippet:
 * TIER 0 always; TIER 1 iff a row of degree 32..1023 exists (segmentOffsets[2] > segmentOffsets[1]); TIER 2 iff a
 * row of degree >= 1024 exists (segmentOffsets[1] > 0). The mid tier folds 32 lanes per row, so a device whose
 * workgroup size is below 32 is E_UNSUPPORTED { feature: "segmentedReduce.tiers" }.
 * @param scope - the reduce scope (pipelines, pool, params writer)
 * @param core - the core whose weights pattern selects HAS_WEIGHTS
 * @param options - operator, snippet, tiers (null: the single thread-per-row dispatch), accumulate
 * @returns the planner
 */
export async function prepareSegmentedReduce(
    scope: ReduceScope,
    core: CoreBinding,
    options: SegmentedReduceOptions,
): Promise<SegmentedReducePlanner> {
    const op = opCode(options.op);
    validateValueSnippet(options.valueSnippet);
    const { tiers } = options;
    const perm = tiers?.perm ?? null;
    if (tiers !== null && scope.workgroupSize < MID_TIER_LANES) {
        throw new WebGpuGraphError(
            "E_UNSUPPORTED",
            `segmentedReduce: the mid tier folds ${MID_TIER_LANES} lanes per row, more than the workgroup size ${scope.workgroupSize}`,
            { feature: "segmentedReduce.tiers" },
        );
    }
    const ranges: readonly { readonly tier: 0 | 1 | 2; readonly start: number; readonly end: number }[] =
        tiers === null
            ? [{ tier: 0, start: 0, end: rowCountOf(core, "segmentedReduce") }]
            : [
                  { tier: 2, start: 0, end: tiers.segmentOffsets[1] },
                  { tier: 1, start: tiers.segmentOffsets[1], end: tiers.segmentOffsets[2] },
                  { tier: 0, start: tiers.segmentOffsets[2], end: tiers.segmentOffsets[4] },
              ];
    const compiled: TierDispatch[] = [];
    for (const range of ranges) {
        if (range.tier !== 0 && range.end <= range.start) {
            continue;
        }
        const overrides = { ...graphOverrides(core, perm), OP: op, TIER: range.tier };
        const spec = kernelSpec("segmented-reduce", overrides, { VALUE: options.valueSnippet });
        compiled.push({ ...range, kernel: await scope.pipelines.kernel(spec) });
    }
    const fill = await scope.pipelines.kernel(kernelSpec("fill"));
    return new TieredPlanner(
        scope,
        compiled,
        fill,
        perm,
        core.weights !== null,
        options.accumulate === true,
        identityFillWord(options.op),
    );
}
