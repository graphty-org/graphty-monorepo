/**
 * @file `definePalette`: the simple tier's palette verb (design/extensions/simple-tier.md section 4).
 *
 * NOT BUILT YET. This placeholder carries the published name and its type so `./extend` and the
 * bundle export it; a call throws E_UNSUPPORTED until the palette point lands.
 */

import { GraphtyError } from "../errors";
import type { DefinePalette } from "./types";

/**
 * Register a palette from a plain definition object.
 * @throws A GraphtyError E_UNSUPPORTED: the verb is not built yet.
 */
export const definePalette: DefinePalette = () => {
    throw new GraphtyError({
        code: "E_UNSUPPORTED",
        message: "definePalette is not built yet in this version of graphty-element.",
        source: "registry",
        details: { reason: "not-built", verb: "definePalette" },
    });
};
