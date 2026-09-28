/**
 * @file `defineLogDestination`: the simple tier's log destination verb (design/extensions/simple-tier.md section 4).
 *
 * NOT BUILT YET. This placeholder carries the published name and its type so `./extend` and the
 * bundle export it; a call throws E_UNSUPPORTED until the log destination point lands.
 */

import { GraphtyError } from "../errors";
import type { DefineLogDestination } from "./types";

/**
 * Register a log destination from a plain definition object.
 * @throws A GraphtyError E_UNSUPPORTED: the verb is not built yet.
 */
export const defineLogDestination: DefineLogDestination = () => {
    throw new GraphtyError({
        code: "E_UNSUPPORTED",
        message: "defineLogDestination is not built yet in this version of graphty-element.",
        source: "registry",
        details: { reason: "not-built", verb: "defineLogDestination" },
    });
};
