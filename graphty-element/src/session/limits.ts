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
 * TWO OF THE SIX FIELDS ARE DELIBERATELY ABSENT, and the reason is the same for both: the name
 * means one thing here and a different thing on `CostGateLimits`, so publishing a number
 * under it would teach a consumer the wrong unit.
 *
 * - `exactComputationCap` is a NODE COUNT here ("above this node count an approximable algorithm
 *   is approximated"), design default 2,000 nodes, and SECONDS on `CostGateLimits`
 *   ("the seconds at or below which a run is computed exactly"), default 30. Shipping the seconds
 *   value under the node-count name would tell every consumer to approximate anything above 30
 *   nodes.
 * - `memoryBudgetBytes` is how much memory the element will hold for ONE GRAPH here, and on
 *   `CostGateLimits` it is how many bytes ONE RUN's published columns may occupy before the run is
 *   refused. The design's defaults table names no figure for the first, so there is nothing
 *   honest to publish; a consumer that wants the second already has `DEFAULT_COST_GATE_LIMITS`.
 *
 * Both are omitted from the TYPE as well as from the value, so a consumer reading
 * `DEFAULT_LIMITS` cannot reach a field that would lie to them.
 */

import type { Limits } from "../acceleration";
import { DEFAULT_SELECTION_CAP } from "./selection";

/**
 * The fields of {@link Limits} the element can state a defensible default for.
 *
 * The two it cannot are the two whose names collide with `CostGateLimits`; see the file
 * comment for which value each name carries on each side.
 */
export type DefaultableLimits = Omit<Limits, "exactComputationCap" | "memoryBudgetBytes">;

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
});
