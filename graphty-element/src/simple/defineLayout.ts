/**
 * @file `defineLayout`: the simple tier's layout verb (design/extensions/simple-tier.md section 4).
 *
 * NOT BUILT YET. This placeholder carries the published name and its type so `./extend` and the
 * bundle export it; a call throws E_UNSUPPORTED until the layout point lands.
 */

import { GraphtyError } from "../errors";
import type { DefineLayout } from "./types";

/**
 * Register a layout from a plain definition object.
 * @throws A GraphtyError E_UNSUPPORTED: the verb is not built yet.
 */
export const defineLayout: DefineLayout = () => {
    throw new GraphtyError({
        code: "E_UNSUPPORTED",
        message: "defineLayout is not built yet in this version of graphty-element.",
        source: "registry",
        details: { reason: "not-built", verb: "defineLayout" },
    });
};
