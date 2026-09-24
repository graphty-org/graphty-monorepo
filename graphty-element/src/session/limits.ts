/**
 * @file The ceilings and caps the element runs under when nothing has measured this machine.
 *
 * `Capabilities.limits` is documented as MEASURED: `session.calibrate()` times the host and fills
 * it in. That probe does not exist yet, and until it does every consumer that needs one of these
 * numbers has to invent it -- which is how the one shipped consumer ended up carrying a
 * large-graph threshold of its own, ten times the element's, with nothing between the two to
 * notice they disagreed.
 *
 * So these are published as what they are: SHIPPED DEFAULTS, not measurements. Every one of them
 * is the fallback the element API design's Performance defaults table names for the case where the
 * probe cannot run, and none of them describes the machine this code is running on. When
 * `calibrate()` lands it replaces them and `Capabilities.calibration.basis` turns from
 * `"defaults"` into `"probe"`, which is how a consumer can tell which kind of number it is holding.
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
    /** The most nodes this machine is expected to draw at an interactive frame rate. A shipped default, not measured. */
    renderCeiling: 200_000,
    /** The most elements one selection will hold before it refuses to grow. A shipped default, not measured. */
    selectionCap: DEFAULT_SELECTION_CAP,
    /** The most edges drawn at once; beyond it edges are hidden until the view narrows. A shipped default, not measured. */
    edgesDrawn: 500_000,
    /**
     * Above this NODE COUNT an approximable algorithm is approximated rather than computed
     * exactly. A shipped default, not measured. Not to be confused with the cost gate's
     * `exactComputationSeconds`, which is a duration and answers a different question.
     */
    approximateAboveNodes: 2_000,
});
