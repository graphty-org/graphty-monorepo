/**
 * Configuration for the custom elements manifest analyzer.
 *
 * `vite-plugin-cem` (wired up in `vite.config.ts`) loads this file from the package root if it
 * exists. Only `plugins` is set here: the file list and the Lit support come from
 * `vite.config.ts`, and every key this file leaves out keeps the value declared there.
 *
 * The plugin removes the element's `#private` fields from the manifest and gives the forwarded
 * DOM events their names. See `scripts/cem-graphty-plugin.mjs`.
 */

import { graphtyManifestPlugin } from "./scripts/cem-graphty-plugin.mjs";

export default {
    plugins: [graphtyManifestPlugin()],
};
