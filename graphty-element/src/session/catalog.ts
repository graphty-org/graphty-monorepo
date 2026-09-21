/**
 * @file The session's catalogue: what the element can offer, as plain data.
 *
 * Every entry is a descriptor the catalogue module already declares -- a plain name, a technical
 * name, what it computes, what it costs and what it can be configured with. Nothing here is a
 * class or a closure, so the whole answer survives `JSON.stringify`, a `postMessage` to a worker
 * and a write to a saved document.
 *
 * The lists are static because what the element CAN do does not depend on which graph is loaded.
 * What it can do to THIS graph does, and that half of the catalogue -- applicability, resolved
 * option bounds, expression validation -- waits on the runs and the query engine.
 */

import { BUILT_IN_ALGORITHMS } from "../catalog/algorithms";
import { FORMAT_DESCRIPTORS } from "../catalog/formats";
import { LAYOUT_DESCRIPTORS } from "../catalog/layouts";
import { PALETTE_DESCRIPTORS } from "../catalog/palettes";
import { SCALE_DESCRIPTORS } from "../catalog/scales";
import type { SessionCatalogApi } from "./types";

/**
 * The one catalogue, shared by every session.
 *
 * It is shared rather than built per session because it is frozen data that says nothing about
 * any particular graph: two sessions that answered differently would be a bug, not a feature.
 */
export const SESSION_CATALOG: SessionCatalogApi = Object.freeze({
    /**
     * Every algorithm the element ships.
     * @returns the algorithm descriptors
     */
    algorithms: () => BUILT_IN_ALGORITHMS,
    /**
     * Every file format the element can read.
     * @returns the format descriptors
     */
    formats: () => FORMAT_DESCRIPTORS,
    /**
     * Every layout the element ships.
     * @returns the layout descriptors
     */
    layouts: () => LAYOUT_DESCRIPTORS,
    /**
     * Every colour palette the element ships.
     * @returns the palette descriptors
     */
    palettes: () => PALETTE_DESCRIPTORS,
    /**
     * Every scale the element ships.
     * @returns the scale descriptors
     */
    scales: () => SCALE_DESCRIPTORS,
});
