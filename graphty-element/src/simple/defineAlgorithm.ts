/**
 * @file `defineAlgorithm`: the simple tier's algorithm verb (design/extensions/simple-tier.md section 4).
 *
 * NOT BUILT YET. This placeholder carries the published name and its type so `./extend` and the
 * bundle export it; a call throws E_UNSUPPORTED until the algorithm point lands.
 */

import { GraphtyError } from "../errors";
import type { DefineAlgorithm } from "./types";

/**
 * Register a algorithm from a plain definition object.
 * @throws A GraphtyError E_UNSUPPORTED: the verb is not built yet.
 */
export const defineAlgorithm: DefineAlgorithm = () => {
    throw new GraphtyError({
        code: "E_UNSUPPORTED",
        message: "defineAlgorithm is not built yet in this version of graphty-element.",
        source: "registry",
        details: { reason: "not-built", verb: "defineAlgorithm" },
    });
};
