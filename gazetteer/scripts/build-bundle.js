/**
 * One vite library build (ES modules only) of the package's entries into dist/: gazetteer.js (the
 * root, with `loadLayer`) and one module per layer, countries.js, regions.js and cities.js, each
 * holding its layer's data (data/*.json) so a consumer loads only the layers it imports. Run
 * "npm run build" (tsc) first; tools/build-bundle.mjs then writes the d.ts shim of each entry.
 */

import path from "node:path";
import { build } from "vite";

import { buildBundle } from "../../tools/build-bundle.mjs";

await buildBundle({
    build,
    packageRoot: path.resolve(import.meta.dirname, ".."),
    entries: {
        gazetteer: "src/index.ts",
        countries: "src/countries.ts",
        regions: "src/regions.ts",
        cities: "src/cities.ts",
    },
    sourcemap: false,
});
