/**
 * @file The ceilings and caps the element runs under when nothing has measured this machine.
 *
 * `Capabilities.limits` is documented as MEASURED: `session.calibrate()` times the host and fills
 * it in. That probe does not exist yet, and until it does every consumer that needs one of these
 * numbers has to invent it -- which is how the one shipped consumer ended up carrying a
 * large-graph threshold of its own, ten times the element's, with nothing between the two to
 * notice they disagreed.
 *
 * So these are published as what they are: SHIPPED DEFAULTS, not measurements of the machine this
 * code is running on. When `calibrate()` lands it replaces them and `Capabilities.calibration.basis`
 * turns from `"defaults"` into `"probe"`, which is how a consumer can tell which kind of number it
 * is holding.
 *
 * TWO OF THEM ARE ENFORCED, AND WERE MEASURED ONCE. `renderCeiling` and `edgesDrawn` used to be
 * the design table's figures, 200,000 nodes and 500,000 edges, and nothing checked them. The
 * renderer could not reach either: at 18,000 nodes / 180,000 edges the page stopped producing
 * frames (issue #405). The measurement behind the numbers below, taken 2026-09-26 in headless
 * Chromium on an RTX 4070 SUPER with `layout="random"`, ten edges per node and the default
 * style, found that the wall is not the GPU. It is V8's heap: `performance.memory.jsHeapSizeLimit`
 * is 3.5 GB in that Chromium and the renderer draws every edge as two Babylon meshes plus, on
 * the default arrow-headed style, a ShaderMaterial of its own, which costs about 20 KB of heap
 * per edge and 10 KB per node. The heap was at its limit from 15,000 / 150,000 up (every load
 * past that point is garbage-collection bound: 12.6 s, then 19.4 s at 17,000) and the renderer
 * process died at 18,000 / 180,000. Nodes alone are cheap: 200,000 with no edges used 2.0 GB.
 *
 * The ceilings below keep the worst case they allow together, 50,000 nodes AND 100,000 edges,
 * at 2.7 GB of heap (74 % of the limit, loaded in 8.0 s), which leaves room for a layout and a
 * run to allocate. 100,000 nodes with the same edges reached 84 % and 11.4 s, which is why the
 * node ceiling is the lower of the two measured figures. `DataManager` refuses a load past
 * either with `E_TOO_LARGE`; see `refuseAboveCeiling` there for why a refusal and not a
 * degraded draw. When the arrowheads share one material (pull request #394 in flight) the
 * per-edge cost falls and the same measurement should be repeated to raise these.
 *
 * ONE OF THE SIX FIELDS IS ABSENT, and it is worth saying why the other five are not.
 *
 * Two names used to collide with `CostGateLimits` and mean different things on each side, so
 * neither could be published without teaching a consumer the wrong unit: `exactComputationCap`
 * was a node count here and seconds there, and `memoryBudgetBytes` was one graph's memory here
 * and one run's published columns there. Both now carry their unit in the name --
 * `approximateAboveNodes` and `graphMemoryBudgetBytes` here, `exactComputationSeconds` and
 * `runColumnBudgetBytes` on the gate -- so the collision is gone and with it the reason to
 * withhold a number.
 *
 * `graphMemoryBudgetBytes` is still absent, for the one reason that survives the rename: the
 * element API design's defaults table names no figure for it. There is nothing measured and
 * nothing designed to publish, and inventing one here is exactly what this file exists to stop a
 * consumer doing. It is omitted from the TYPE as well as from the value, so a reader cannot
 * reach a field that has no defensible answer. A consumer who wants the per-run budget already
 * has `DEFAULT_COST_GATE_LIMITS.runColumnBudgetBytes`.
 */

import type { Limits } from "../acceleration";
import { DEFAULT_SELECTION_CAP } from "./selection";

/**
 * The fields of {@link Limits} the element can state a defensible default for.
 *
 * The one it cannot is `graphMemoryBudgetBytes`, for which the design names no figure; see the
 * file comment.
 */
export type DefaultableLimits = Omit<Limits, "graphMemoryBudgetBytes">;

/**
 * What the element runs under until something measures this machine.
 *
 * Read it rather than inventing a number: a consumer's own threshold is a copy that nothing keeps
 * in step, and the element is the party that knows what its own renderer and its own passes cost.
 */
export const DEFAULT_LIMITS: Readonly<DefaultableLimits> = Object.freeze({
    /** Above this node count the element draws less visual detail. A shipped default, not measured. */
    largeGraphThreshold: 10_000,
    /**
     * The most nodes the element will hold. Enforced: a load past it fails with `E_TOO_LARGE`.
     * Measured once (see the file comment), on one machine; not this machine's figure.
     */
    renderCeiling: 50_000,
    /** The most elements one selection will hold before it refuses to grow. A shipped default, not measured. */
    selectionCap: DEFAULT_SELECTION_CAP,
    /**
     * The most edges the element will hold. Enforced: a load past it fails with `E_TOO_LARGE`.
     * Measured once (see the file comment), on one machine; not this machine's figure.
     */
    edgesDrawn: 100_000,
    /**
     * Above this NODE COUNT an approximable algorithm is approximated rather than computed
     * exactly. A shipped default, not measured. Not to be confused with the cost gate's
     * `exactComputationSeconds`, which is a duration and answers a different question.
     */
    approximateAboveNodes: 2_000,
});
