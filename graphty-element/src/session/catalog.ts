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
 * `optionsFor()` is graph-dependent too: it resolves one descriptor's data-dependent bounds and
 * node choices against a scope of this graph.
 */

import { DATASETS, GENERATOR_CATALOG } from "@graphty/graph-samples";

import { BUILT_IN_ALGORITHMS } from "../catalog/algorithms";
import { registeredCameraDescriptors } from "../catalog/cameraRegistry";
import { CAMERA_DESCRIPTORS } from "../catalog/cameras";
import { channelValuesOf } from "../catalog/channelValues";
import { FORMAT_DESCRIPTORS } from "../catalog/formats";
import { registeredLayoutDescriptors } from "../catalog/layoutRegistry";
import { LAYOUT_DESCRIPTORS } from "../catalog/layouts";
import { registeredLogSinkDescriptors } from "../catalog/logSinkRegistry";
import { LOG_SINK_DESCRIPTORS } from "../catalog/logSinks";
import { MODEL_DESCRIPTORS } from "../catalog/models";
import { registeredPaletteDescriptors } from "../catalog/paletteRegistry";
import { PALETTE_DESCRIPTORS } from "../catalog/palettes";
import { registeredAlgorithmDescriptors } from "../catalog/registry";
import { SCALE_DESCRIPTORS } from "../catalog/scales";
import { SCREENSHOT_PRESET_DESCRIPTORS } from "../catalog/screenshotPresets";
import { shaderDescriptors } from "../catalog/shaderRegistry";
import type { ShaderDescriptor } from "../catalog/shaders";
import type {
    AlgorithmDescriptor,
    AttributeDescriptor,
    FormatDescriptor,
    LayoutDescriptor,
    Path,
    Query,
    QueryValidation,
} from "../catalog/types";
import { catalogFormatDescriptors } from "../catalog/writerRegistry";
import { isGraphtyError } from "../errors";
import { transitionDescriptors } from "../transitions/registry";
import { describeMetrics, type MetricsSource } from "./metrics";
import { optionsFor, type OptionsForSource } from "./optionsFor";
import { nearestNames } from "./results/ResultsApi";
import { channelDescriptor, sessionChannels } from "./styles/channels";
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
     * Every file format the element can read or write, plus every registered reader and writer.
     * @returns the format descriptors, the element's own first
     */
    formats: () => composeFormats(catalogFormatDescriptors()),
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
    /**
     * Every screenshot preset `captureScreenshot({ preset })` takes, with the settings it sets.
     * Static.
     * @returns the preset descriptors
     */
    screenshotPresets: () => SCREENSHOT_PRESET_DESCRIPTORS,
    // No `shaders` table here: a shader id names one of the project's own shaders, so the list
    // is built per session (`createSessionCatalog`), never read from the catalog by id.
    /**
     * Every layout transition `layoutTransition` can name: the element's presets, then the
     * registered ones.
     * @returns the transition descriptors, the element's own first
     */
    transitions: () => transitionDescriptors(),
    /**
     * Every graph generator `data.generate` runs: graph-samples' catalogue. Static.
     * @returns the generator descriptors
     */
    generators: () => GENERATOR_CATALOG,
    /**
     * Every sample dataset `data.loadDataset` downloads: graph-samples' catalogue. Static.
     * @returns the dataset descriptors
     */
    datasets: () => DATASETS,
    /**
     * Every sample 3D model the element ships. Static: samples are resolved from the package.
     * @returns the model descriptors
     */
    models: () => MODEL_DESCRIPTORS,
});

/**
 * Derive a table from a composed one, cached on the composed table's identity, so the derived
 * array is the same object until something registers.
 * @param derive - Builds the derived list.
 * @returns A function from the composed table to the derived one.
 */
function deriver<T>(derive: (list: readonly T[]) => readonly T[]): (list: readonly T[]) => readonly T[] {
    let cached: { readonly from: readonly T[]; readonly list: readonly T[] } | null = null;
    return (list) => {
        if (cached?.from !== list) {
            cached = { from: list, list: Object.freeze(derive(list)) };
        }

        return cached.list;
    };
}

/**
 * The formats with the file styles experiment off: no `styles` field and no `styles` writer option.
 */
const formatsWithoutStyles = deriver<FormatDescriptor>((list) =>
    list.map((descriptor) => {
        const { styles: _styles, writerOptions, ...rest } = descriptor;
        return Object.freeze({
            ...rest,
            ...(writerOptions === undefined
                ? {}
                : { writerOptions: Object.freeze(writerOptions.filter((option) => option.name !== "styles")) }),
        });
    }),
);

/**
 * The fixed layout's options the file styles experiment adds: Graphviz routing the edges of a
 * placed file, as Graphviz draws it.
 */
const FILE_STYLE_LAYOUT_OPTIONS: Readonly<Record<string, readonly string[]>> = Object.freeze({
    fixed: Object.freeze(["edgeRoutes", "graphvizAttributes"]),
});

/** The layouts with the file styles experiment off: without the options it adds. */
const layoutsWithoutStyles = deriver<LayoutDescriptor>((list) =>
    list.map((descriptor) => {
        const gated = FILE_STYLE_LAYOUT_OPTIONS[descriptor.id];
        return gated === undefined
            ? descriptor
            : Object.freeze({
                  ...descriptor,
                  options: Object.freeze(descriptor.options.filter((option) => !gated.includes(option.name))),
              });
    }),
);

/** What `validate` reads: the session's one query engine and the paths it answers. */
export interface CatalogQuerySource {
    /**
     * The paths an expression reads that nothing in the session answers.
     * @param where - The expression.
     * @returns The unresolved paths.
     * @throws A `GraphtyError` coded `E_BAD_SELECTOR` when the expression does not parse.
     */
    readonly unresolvedPathsOf: (where: Query) => readonly Path[];
    /**
     * Every path the session answers, on nodes or edges, for the nearest candidates.
     * @returns The paths.
     */
    readonly answerablePaths: () => readonly Path[];
}

/**
 * The attributes that hold time: the declared time columns, then the timeline's candidates (the
 * columns whose values read as time), best first.
 * @param attributes - The session's attributes.
 * @param candidates - `session.time.candidates()`: the columns that read as time, best first.
 * @returns The time attributes.
 */
function timeAttributesOf(
    attributes: readonly AttributeDescriptor[],
    candidates: readonly { readonly kind: "node" | "edge"; readonly column: string }[],
): readonly AttributeDescriptor[] {
    const declared = attributes.filter((each) => each.roles?.includes("time") === true);
    const read = candidates.flatMap(
        ({ kind, column }) =>
            attributes.find(
                (each) => each.kind === kind && each.name === column && each.roles?.includes("time") !== true,
            ) ?? [],
    );
    return Object.freeze([...declared, ...read]);
}

/**
 * Check an expression without running it.
 * @param source - The query engine and the answered paths; absent, nothing is reported unresolved.
 * @param query - The expression.
 * @param kind - Which kind of expression it is.
 * @returns The check.
 */
function validateQuery(
    source: CatalogQuerySource | undefined,
    query: Query,
    kind: "selector" | "filter" | "formula" = "selector",
): QueryValidation {
    if (kind === "formula") {
        return Object.freeze({
            ok: false,
            error: Object.freeze({ code: "E_UNSUPPORTED", position: 0, params: Object.freeze({ kind }) }),
            unresolvedPaths: Object.freeze([]),
        });
    }

    let unresolved: readonly Path[];
    try {
        unresolved = source?.unresolvedPathsOf(query) ?? [];
    } catch (error) {
        if (!isGraphtyError(error)) {
            throw error;
        }

        const params = Object.freeze({ ...error.details });
        const position = typeof params.position === "number" ? params.position : 0;
        return Object.freeze({
            ok: false,
            error: Object.freeze({ code: error.code, position, params }),
            unresolvedPaths: Object.freeze([]),
        });
    }

    const answerable = unresolved.length === 0 ? [] : [...new Set(source?.answerablePaths() ?? [])];
    const runs = new Set(answerable.filter((path) => path.startsWith("results.")).map((path) => path.split(".")[1]));
    const unresolvedPaths = unresolved.map((path) => {
        const [root, run] = path.split(".");
        const reason = root === "results" && !runs.has(run) ? "unknown-run" : "unknown-attribute";
        return Object.freeze({ path, reason, candidates: nearestNames(path, answerable) } as const);
    });
    return Object.freeze({ ok: unresolvedPaths.length === 0, unresolvedPaths: Object.freeze(unresolvedPaths) });
}

/**
 * One session's catalogue: the shared tables, plus the metric listing and the option resolver for
 * its own graph.
 * @param source - Where the metric listing reads the cost model and the run history, and where
 *   `optionsFor` resolves a scope.
 * @returns The catalogue.
 */
export function createSessionCatalog(
    source: MetricsSource &
        Pick<OptionsForSource, "resolve" | "attributes" | "results" | "nodeValues"> & {
            /** The project's own shaders, listed after the presets and registered ones. */
            readonly projectShaders?: () => readonly ShaderDescriptor[];
            /** Whether the file styles experiment is on; absent reads on. */
            readonly fileStyles?: () => boolean;
            /** `session.time.candidates()`, for `timeAttributes`; absent, only declared time columns are listed. */
            readonly timeCandidates?: () => readonly { readonly kind: "node" | "edge"; readonly column: string }[];
            /** What `validate` checks expressions against; absent, no path is reported unresolved. */
            readonly query?: CatalogQuerySource;
        },
): SessionCatalogApi {
    const fileStyles = (): boolean => source.fileStyles?.() !== false;
    const layouts = (): readonly LayoutDescriptor[] =>
        fileStyles() ? SESSION_CATALOG_TABLES.layouts() : layoutsWithoutStyles(SESSION_CATALOG_TABLES.layouts());
    return Object.freeze({
        ...SESSION_CATALOG_TABLES,
        /**
         * Every file format, without what the file styles experiment adds while it is off.
         * @returns the format descriptors, the element's own first
         */
        formats: () =>
            fileStyles() ? SESSION_CATALOG_TABLES.formats() : formatsWithoutStyles(SESSION_CATALOG_TABLES.formats()),
        /**
         * Every layout, without the options the file styles experiment adds while it is off.
         * @returns the layout descriptors, the element's own first
         */
        layouts,
        /**
         * The style channels this session offers for a target.
         * @param target - Nodes or edges.
         * @returns The channels, in table order.
         */
        channels: (target) => sessionChannels(target, fileStyles()),
        /**
         * Every value of one enum channel this session offers, named, with its picture.
         * @param channel - The channel.
         * @returns The values; empty for a channel that is not an enum or that the session does not offer.
         */
        channelValues: (channel) => {
            const target = channelDescriptor(channel)?.target;
            return channelValuesOf(
                target === undefined
                    ? undefined
                    : sessionChannels(target, fileStyles()).find((each) => each.channel === channel),
            );
        },
        /**
         * Every shader, one entry per id: the element's presets, the registered ones, then the
         * project's own (pasted, or carried in by a file). A project shader replaces a catalog entry
         * with its id, since a use of that id draws the project's text; `copyOf` says which catalog
         * entry a project shader's content equals.
         * @returns the shader descriptors, the element's own first
         */
        shaders: () => {
            const pasted = source.projectShaders?.() ?? [];
            if (pasted.length === 0) {
                return shaderDescriptors();
            }

            const own = new Map(pasted.map((descriptor) => [descriptor.id, descriptor]));
            const listed = shaderDescriptors().map((descriptor) => own.get(descriptor.id) ?? descriptor);
            const catalog = new Set(listed.map((descriptor) => descriptor.id));
            return Object.freeze([...listed, ...pasted.filter((descriptor) => !catalog.has(descriptor.id))]);
        },
        /**
         * Every metric the element could compute on this graph, with what it would cost and
         * whether it has been run.
         * @returns one entry per algorithm, in catalogue order
         */
        metrics: () => describeMetrics(source),
        /**
         * The attributes that hold points in time.
         * @returns The time attributes, declared ones first.
         */
        timeAttributes: () => timeAttributesOf(source.attributes?.() ?? [], source.timeCandidates?.() ?? []),
        /**
         * Check an expression against this session without running it.
         * @param query - The expression.
         * @param o - Which kind of expression it is.
         * @returns The check.
         */
        validate: (query, o) => validateQuery(source.query, query, o?.kind),
        /**
         * One algorithm's or layout's options, with data-dependent bounds and node choices
         * resolved over a scope of this graph.
         * @param key - An algorithm key or a layout id.
         * @param scope - The scope to measure; the session's default scope when absent.
         * @returns The resolved options.
         */
        optionsFor: (key, scope) =>
            Promise.resolve().then(() =>
                optionsFor(
                    {
                        algorithms: SESSION_CATALOG_TABLES.algorithms,
                        layouts,
                        resolve: source.resolve,
                        attributes: source.attributes,
                        results: source.results,
                        nodeValues: source.nodeValues,
                    },
                    key,
                    scope,
                ),
            ),
    });
}
