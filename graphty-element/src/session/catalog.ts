/**
 * @file The session's catalogue: what the element can offer, as plain data.
 *
 * Every entry is a descriptor the catalogue module already declares -- a plain name, a technical
 * name, what it computes, what it costs and what it can be configured with. Nothing here is a
 * class or a closure, so the whole answer survives `JSON.stringify`, a `postMessage` to a worker
 * and a write to a saved document.
 *
 * EVERY TABLE BUT `scales` IS COMPOSED: the element's own frozen table, followed by whatever a
 * third party registered. Six of the seven can carry a plugin -- algorithms, cameras, formats,
 * layouts, log destinations and palettes -- because those are the six supported extension points,
 * and a registered extension that could not be found in the catalogue could not be offered by a
 * picker, which is half of what it means to have one. `scales` stays static because a scale is
 * internal and nothing registers one.
 *
 * THE COMPOSED TABLE IS THE BUILT-IN ARRAY ITSELF UNTIL SOMETHING REGISTERS. Two sessions asking
 * what the element can do must get back the same data, and identity is how a consumer checks
 * that -- a fresh array per call would make two sessions that agree exactly look as though they
 * disagreed. A page that imports no plugin therefore sees precisely the object it saw before the
 * catalogue learned to carry plugins.
 *
 * WHAT THE ELEMENT SHIPS IS STILL A FIXED ANSWER. The static tables in `./catalog` are frozen
 * module constants and nothing appends to them; composition happens here, at the catalogue door,
 * which is why "what does the element ship" and "what can this page do" stay two answerable
 * questions rather than one blurred one.
 *
 * `metrics()` is the exception and cannot be shared, because it is about THIS graph -- which
 * metrics it can support, what each would cost over the scope a run would cover, and which have
 * already been run here. So a session's catalogue is the shared tables with its own `metrics()`
 * closed over its own graph.
 *
 * The rest of the graph-dependent half -- resolved option bounds, expression validation -- is not
 * wired to the session's query engine yet.
 */

import { BUILT_IN_ALGORITHMS } from "../catalog/algorithms";
import { registeredCameraDescriptors } from "../catalog/cameraRegistry";
import { CAMERA_DESCRIPTORS } from "../catalog/cameras";
import { registeredFormatDescriptors } from "../catalog/formatRegistry";
import { FORMAT_DESCRIPTORS } from "../catalog/formats";
import { registeredLayoutDescriptors } from "../catalog/layoutRegistry";
import { LAYOUT_DESCRIPTORS } from "../catalog/layouts";
import { registeredLogSinkDescriptors } from "../catalog/logSinkRegistry";
import { LOG_SINK_DESCRIPTORS } from "../catalog/logSinks";
import { registeredPaletteDescriptors } from "../catalog/paletteRegistry";
import { PALETTE_DESCRIPTORS } from "../catalog/palettes";
import { registeredAlgorithmDescriptors } from "../catalog/registry";
import { SCALE_DESCRIPTORS } from "../catalog/scales";
import type { AlgorithmDescriptor } from "../catalog/types";
import { describeMetrics, type MetricsSource } from "./metrics";
import type { SessionCatalogApi } from "./types";

/**
 * Build the composer for one table.
 *
 * Cached on the IDENTITY of the registered half, which every registry guarantees is stable until
 * its map changes. That is what keeps the identity promise in the file header: with nothing
 * registered the built-in array comes straight back, and with something registered the same
 * concatenation comes back until the registration changes.
 *
 * One closure per table rather than one shared function over both arrays, so the memo is typed
 * as the table it serves and no table can be handed another's cached answer.
 * @param builtIn - The element's own frozen table.
 * @returns A function from the registered half to the composed list.
 */
function composer<T>(builtIn: readonly T[]): (registered: readonly T[]) => readonly T[] {
    let cached: { readonly from: readonly T[]; readonly list: readonly T[] } | null = null;

    return (registered: readonly T[]): readonly T[] => {
        if (registered.length === 0) {
            return builtIn;
        }

        if (cached?.from !== registered) {
            cached = { from: registered, list: Object.freeze([...builtIn, ...registered]) };
        }

        return cached.list;
    };
}

const composeAlgorithms = composer<AlgorithmDescriptor>(BUILT_IN_ALGORITHMS);
const composeCameras = composer(CAMERA_DESCRIPTORS);
const composeFormats = composer(FORMAT_DESCRIPTORS);
const composeLayouts = composer(LAYOUT_DESCRIPTORS);
const composeLogSinks = composer(LOG_SINK_DESCRIPTORS);
const composePalettes = composer(PALETTE_DESCRIPTORS);

export const SESSION_CATALOG_TABLES = Object.freeze({
    /**
     * Every algorithm that can be run: the element's own, plus whatever was registered.
     *
     * A third party's algorithm reaches this list by declaring a descriptor on its class, and
     * until it did, a plugin could be registered and called but could not be started as a RUN --
     * the run machinery resolves a key through this list, so a key it did not carry was refused.
     * Everything hanging off a run was therefore available to the element's own algorithms and to
     * nobody else: progress, cancellation, a cost estimate before the click, a ranking, a
     * summary, a reading, and the styling derived from a result's shape.
     * @returns the algorithm descriptors, the element's own first
     */
    algorithms: () => composeAlgorithms(registeredAlgorithmDescriptors()),
    /**
     * Every camera view the viewer can be put in: the element's own five, plus whatever was
     * registered.
     * @returns the camera descriptors, the element's own first
     */
    cameras: () => composeCameras(registeredCameraDescriptors()),
    /**
     * Every file format the element can read, plus whatever was registered.
     * @returns the format descriptors, the element's own first
     */
    formats: () => composeFormats(registeredFormatDescriptors()),
    /**
     * Every layout a graph can be arranged with: the element's own, plus whatever was registered.
     * @returns the layout descriptors, the element's own first
     */
    layouts: () => composeLayouts(registeredLayoutDescriptors()),
    /**
     * Every destination log records can be delivered to, plus whatever was registered.
     * @returns the log destination descriptors, the element's own first
     */
    logSinks: () => composeLogSinks(registeredLogSinkDescriptors()),
    /**
     * Every colour palette a layer can paint with: the element's own seventeen, plus whatever was
     * registered.
     * @returns the palette descriptors, the element's own first
     */
    palettes: () => composePalettes(registeredPaletteDescriptors()),
    /**
     * Every scale the element ships. Static, because a scale is internal and nothing registers one.
     * @returns the scale descriptors
     */
    scales: () => SCALE_DESCRIPTORS,
});

/**
 * One session's catalogue: the shared tables, plus the metric listing for its own graph.
 * @param source - Where the metric listing reads the cost model and the run history.
 * @returns The catalogue.
 */
export function createSessionCatalog(source: MetricsSource): SessionCatalogApi {
    return Object.freeze({
        ...SESSION_CATALOG_TABLES,
        /**
         * Every metric the element could compute on this graph, with what it would cost and
         * whether it has been run.
         * @returns one entry per algorithm, in catalogue order
         */
        metrics: () => describeMetrics(source),
    });
}
