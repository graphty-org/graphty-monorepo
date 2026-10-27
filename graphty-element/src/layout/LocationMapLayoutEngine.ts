import type { F32 } from "@graphty/graph-format";
import { z } from "zod";

import { defineOptions, type OptionsSchema } from "../config";
import { Basemap } from "../config/Basemap";
import { GraphtyError } from "../errors";
import { layoutDim, SimpleLayoutConfig } from "./LayoutEngine";
import { cachedGazetteer, type Gazetteer, GAZETTEER_URL, hasLayers, loadGazetteer } from "./locationMap/gazetteer";
import type { LocationMapFrame, Placement, PlaceOptions } from "./locationMap/place";
import {
    chosenLocation,
    type ColumnValues,
    type CoordinateSource,
    isLocationRefusal,
    type LocationChoice,
    type LocationRefusal,
    type PlaceSource,
    readPlaceSource,
    type ResolvedLocation,
    resolveLocation,
} from "./locationMap/source";
import { SnapshotLayoutEngine, type SnapshotLayoutInput } from "./SnapshotLayoutEngine";

/** The placement module, once loaded: a restore (undo) computes its frame from it at once. */
let placeModule: typeof import("./locationMap/place") | null = null;

/**
 * The placement module, loaded on first use. A load that fails (a page whose build was replaced
 * under it, a dropped connection) is not remembered, so the next run tries again.
 * @returns The module.
 * @throws A `GraphtyError` with code `E_FETCH_FAILED` when the module could not be loaded.
 */
async function loadPlace(): Promise<typeof import("./locationMap/place")> {
    try {
        placeModule ??= await import("./locationMap/place");
    } catch (error) {
        throw GraphtyError.wrap(error, {
            code: "E_FETCH_FAILED",
            source: "layout",
            details: { layout: "location-map" },
        });
    }

    return placeModule;
}

/** The location formats the layout reads, `auto` first. Mirrors babylonjs-map's `LOCATION_FORMATS`. */
const FORMATS = [
    "auto",
    "decimal",
    "lon-lat",
    "geojson",
    "wkt",
    "iso6709",
    "dms",
    "geohash",
    "plus-code",
    "mgrs",
    "utm",
] as const;

const locationMapOptionsSchema = defineOptions({
    location: {
        schema: z.string().nullable().default(null),
        meta: {
            label: "Location",
            description: "The node attribute holding each node's whole location",
        },
    },
    latitude: {
        schema: z.string().nullable().default(null),
        meta: {
            label: "Latitude",
            description: "The node attribute holding each node's latitude, used with Longitude",
        },
    },
    longitude: {
        schema: z.string().nullable().default(null),
        meta: {
            label: "Longitude",
            description: "The node attribute holding each node's longitude, used with Latitude",
        },
    },
    format: {
        schema: z.enum(FORMATS).default("auto"),
        meta: {
            label: "Format",
            description: "How the location is written; auto reads the column to decide",
            advanced: true,
        },
    },
    surface: {
        schema: z.enum(["flat", "globe"]).default("flat"),
        meta: {
            label: "Surface",
            description: "A flat map or a globe; the 2D view always draws the flat map",
        },
    },
    projection: {
        schema: z.enum(["auto", "web-mercator", "equirectangular"]).default("auto"),
        meta: {
            label: "Projection",
            description: "The flat map's projection; auto is Web Mercator, which matches every tile source",
            advanced: true,
        },
    },
    extent: {
        schema: z.enum(["data", "world"]).default("data"),
        meta: {
            label: "Extent",
            description: "Fit the map to the located nodes, or show the whole world",
        },
    },
    size: {
        schema: z.number().positive().default(100),
        meta: {
            label: "Size",
            description: "Scene units across the shown map, or the globe's radius",
            advanced: true,
        },
    },
    unplaced: {
        schema: z.enum(["tray", "leave"]).default("tray"),
        meta: {
            label: "Unplaced Nodes",
            description: "Nodes with no usable location: in a row beside the map, or left where they were",
            advanced: true,
        },
    },
    overlap: {
        schema: z.enum(["spread", "stack"]).default("spread"),
        meta: {
            label: "Overlap",
            description: "Nodes at the same place: spread around it, or stacked on it",
            advanced: true,
        },
    },
    map: {
        schema: Basemap.nullable().default(null),
        meta: {
            label: "Map",
            description:
                "The map drawn under the graph: a named source ({ source: id }), a tile service " +
                "({ tiles, attribution }) or one picture ({ image, bounds }); null for the bundled world image",
        },
    },
    gazetteer: {
        schema: z.union([z.string().min(1), z.literal(false)]).default(GAZETTEER_URL),
        meta: {
            label: "Gazetteer",
            description:
                "Where place names (countries, regions, cities) are looked up: the address of the gazetteer " +
                "files, fetched on first use; false to read no place names",
            advanced: true,
        },
    },
    nodeScale: {
        schema: z.enum(["scene", "screen"]).default("scene"),
        meta: {
            label: "Node Scale",
            description:
                "How node sizes are read: in scene units, which grow as the camera zooms in, or on screen, " +
                "where a node keeps its size at any zoom",
            advanced: true,
        },
    },
});

const LocationMapLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    location: z.string().nullable().default(null),
    latitude: z.string().nullable().default(null),
    longitude: z.string().nullable().default(null),
    format: z.enum(FORMATS).default("auto"),
    surface: z.enum(["flat", "globe"]).default("flat"),
    projection: z.enum(["auto", "web-mercator", "equirectangular"]).default("auto"),
    extent: z.enum(["data", "world"]).default("data"),
    size: z.number().positive().default(100),
    unplaced: z.enum(["tray", "leave"]).default("tray"),
    overlap: z.enum(["spread", "stack"]).default("spread"),
    nodeScale: z.enum(["scene", "screen"]).default("scene"),
    map: Basemap.nullable().default(null),
    gazetteer: z.union([z.string().min(1), z.literal(false)]).default(GAZETTEER_URL),
    dim: z.number().default(3),
});
type LocationMapLayoutConfigType = z.infer<typeof LocationMapLayoutConfig>;

/**
 * The location map layout: every node at the place its data names, on a flat map or a globe that
 * the element draws under the graph. The location is one attribute (a decimal pair, GeoJSON, WKT,
 * ISO 6709, degrees-minutes-seconds, a geohash, a plus code, MGRS or UTM) or a latitude and a
 * longitude attribute; with neither option set, it reads the columns designated in
 * `data.knownFields` (`nodeLocationPath`, or `nodeLatitudePath` and `nodeLongitudePath`), and with
 * none designated it finds them by name or by their values (`session.layout.locationColumns()`).
 * A column of place names (countries, regions or cities, `nodeLocationRole`) is looked up in the
 * gazetteer the `gazetteer` option names, fetched on first use; a city is narrowed by a country
 * or region column (`nodeLocationWithinPath`, else one found by name).
 *
 * Nodes with no usable location go to a tray below the map (or stay where they were) and are
 * reported as `W_LOCATION_UNPARSED` and `W_LOCATION_OUT_OF_RANGE`; they are never put at latitude
 * 0, longitude 0. The 2D view always draws the flat map; in 3D `surface` picks a flat map or a
 * globe. Each answer publishes {@link LocationMapLayout.geoFrame}, which the map and the edges'
 * default route follow. A graph with no location the layout can find is refused when the layout
 * starts, so the previous layout stays drawn: the refusal is `layout.needs-location`, the code the
 * layout's cost estimate gives before it is chosen.
 */
export class LocationMapLayout extends SnapshotLayoutEngine {
    static readonly type = "location-map";
    static readonly maxDimensions = 3;
    static readonly zodOptionsSchema: OptionsSchema = locationMapOptionsSchema;

    config: LocationMapLayoutConfigType;
    protected readonly dimensions: 2 | 3;
    /** How the last answer laid the map in the scene, or null before the first answer. */
    geoFrame: LocationMapFrame | null = null;

    /**
     * Create a location map layout engine.
     * @param opts - The options, and `dim` from the view.
     */
    constructor(opts: Partial<LocationMapLayoutConfigType> = {}) {
        super(opts);
        this.config = LocationMapLayoutConfig.parse(opts);
        this.dimensions = layoutDim(this.config.dim);
    }

    /**
     * Take new options that change only the map drawn under the graph, without placing a node
     * again: a new `map` swaps the picture under nodes that stay where they are.
     * @param options - The layout's new options.
     * @returns True when they were taken; false when another option changed, or none did, so the
     *     layout runs again.
     */
    takeDrawingOptions(options: Readonly<Record<string, unknown>>): boolean {
        const parsed = LocationMapLayoutConfig.safeParse({ ...options, dim: this.config.dim });
        if (!parsed.success) {
            return false;
        }

        const { map: next, ...placing } = parsed.data;
        const { map: was, ...placed } = this.config;
        // The same options again ask for the layout to run again, as for any layout.
        if (JSON.stringify(placing) !== JSON.stringify(placed) || JSON.stringify(next) === JSON.stringify(was)) {
            return false;
        }

        this.config = parsed.data;
        return true;
    }

    /**
     * The view's dimension, as the layout's `dim`.
     * @param dimension - 2 or 3.
     * @returns The option.
     */
    static getOptionsForDimension(dimension: 2 | 3): object {
        return { dim: dimension };
    }

    /**
     * The options the layout reads.
     * @returns The configuration.
     */
    protected get options(): Readonly<Record<string, unknown>> {
        return this.config;
    }

    /**
     * Start the layout: refuse a graph with no location the layout can find, before it becomes the
     * active layout, so the previous one stays drawn.
     * @throws A `GraphtyError` with code `E_UNKNOWN_ATTRIBUTE` whose `details.refusal` is the
     *     `layout.needs-location` fact, or with code `E_FETCH_FAILED` when the placement code could not
     *     be loaded.
     */
    override async init(): Promise<void> {
        await super.init();
        const n = this.graph.nodeCount;
        if (n === 0) {
            return;
        }

        const columns = this.#dataColumns(n);
        const read = (name: string): readonly unknown[] | null => named(columns, name);
        let answer = resolveLocation(this.#choice(), columns, read, this.#places());
        const url = this.config.gazetteer;
        if (isLocationRefusal(answer) && url !== false && !hasLayers(cachedGazetteer(url), "auto")) {
            // A column of place names is found by its values only with the gazetteer here.
            const loaded = await loadGazetteer(url, "auto").catch(() => null);
            if (loaded !== null) {
                answer = resolveLocation(this.#choice(), columns, read, this.#places());
            }
        }

        if (isLocationRefusal(answer)) {
            throw refusalError(answer);
        }

        if (answer.source.kind === "place" && url !== false) {
            await loadGazetteer(url, answer.source.role);
        }

        // Loaded here, before the layout becomes the active one: a load that fails in the run
        // instead would leave the map named the layout with the old drawing and nothing said.
        await loadPlace();
    }

    /**
     * Read, project and place every node.
     * @param input - The graph and its nodes.
     * @returns The positions.
     */
    protected async compute(input: SnapshotLayoutInput): Promise<F32> {
        const { placeOnMap } = await loadPlace();
        const n = input.graph.nodeCount;
        const ids = Array.from({ length: n }, (_, row) => input.graph.ids.idOf(row));
        const columns = this.#dataColumns(n);
        const answer = resolveLocation(
            this.#choice(),
            columns,
            (name) => this.#optionColumn(input, columns, name),
            this.#places(),
        );
        if (isLocationRefusal(answer)) {
            this.geoFrame = null;
            if (n === 0) {
                return new Float32Array(0);
            }

            throw refusalError(answer);
        }

        const url = this.config.gazetteer;
        if (answer.source.kind === "place" && url !== false) {
            await loadGazetteer(url, answer.source.role);
        }

        const placement = this.#place(placeOnMap, answer, {
            ids,
            sizes: input.nodeSizes?.() ?? null,
            initial: input.initial,
        });
        if (placement === null) {
            this.geoFrame = null;
            throw refusalError({
                code: "layout.needs-location",
                params: { missing: "location", attributes: columns.map((c) => c.name) },
            });
        }

        for (const warning of placement.warnings) {
            input.warn(warning);
        }

        this.geoFrame = placement.frame;
        return placement.positions;
    }

    /**
     * Take the coordinates undo, redo or a restore wrote, and the frame they were laid out in: the
     * layout published no answer of its own, so the map, the edges' routes and the camera's facing
     * are worked out again from the nodes' locations. At once when the placement code is loaded
     * (it is after any run in this page), else as soon as it is.
     */
    override loadArrangement(): void {
        super.loadArrangement();
        if (placeModule !== null) {
            this.#restoreFrame(placeModule);
        } else {
            void loadPlace().then((m) => {
                this.#restoreFrame(m);
            });
        }
    }

    /**
     * The options the placement reads.
     * @returns The options and the view's dimension.
     */
    #placeOptions(): PlaceOptions {
        const { format, surface, projection, extent, size, unplaced, overlap } = this.config;
        return { format, surface, projection, extent, size, unplaced, overlap, dimensions: this.dimensions };
    }

    /**
     * The frame a run would publish over the graph as it stands, without moving a node.
     * @param m - The placement module.
     */
    #restoreFrame(m: typeof import("./locationMap/place")): void {
        const n = this.graph.nodeCount;
        const columns = this.#dataColumns(n);
        const answer = resolveLocation(this.#choice(), columns, (name) => named(columns, name), this.#places());
        if (isLocationRefusal(answer)) {
            this.geoFrame = null;
            return;
        }

        const ids = Array.from({ length: n }, (_, row) => this.graph.ids.idOf(row));
        const placement = this.#place(m.placeOnMap, answer, {
            ids,
            sizes: null,
            initial: new Float32Array(this.dimensions * n).fill(Number.NaN),
        });
        this.geoFrame = placement?.frame ?? null;
    }

    /**
     * The gazetteer layers here, or false when the layout reads no place names.
     * @returns The layers.
     */
    #places(): Gazetteer | false {
        const url = this.config.gazetteer;
        return url === false ? false : cachedGazetteer(url);
    }

    /**
     * Place the nodes from a resolved source: a place column is read through the gazetteer first,
     * and the frame then says so, with the credits its data owes.
     * @param placeOnMap - The placement.
     * @param answer - The resolved source.
     * @param nodes - The nodes.
     * @returns The placement, or null when the place layers it needs are not here.
     */
    #place(
        placeOnMap: typeof import("./locationMap/place").placeOnMap,
        answer: ResolvedLocation,
        nodes: Parameters<typeof import("./locationMap/place").placeOnMap>[1],
    ): Placement | null {
        const { source } = answer;
        if (source.kind !== "place") {
            return placeOnMap(source, nodes, this.#placeOptions(), answer.filled);
        }

        const places = this.#places();
        const reading = places === false ? null : readPlaceSource(source, places);
        if (reading === null) {
            return null;
        }

        // An unmatched name stays as written, so it is reported as unparsed, not as missing.
        const coordinates: CoordinateSource = {
            kind: "columns",
            latitude: source.column,
            longitude: source.column,
            lat: reading.lat.map((lat, row) => lat ?? source.values[row]),
            lon: reading.lon.map((lon, row) => lon ?? source.values[row]),
        };
        const placement = placeOnMap(coordinates, nodes, this.#placeOptions(), null);
        const location = {
            kind: "place" as const,
            column: source.column,
            role: reading.role,
            within: withinColumn(source),
            attribution: reading.attribution,
        };
        return { ...placement, frame: { ...placement.frame, location } };
    }

    /**
     * The columns to read: the layout's own options when they name any, else the ones designated
     * in `data.knownFields` (`nodeLocationPath`, or `nodeLatitudePath` and `nodeLongitudePath`).
     * @returns The choice; all null leaves the layout to find them.
     */
    #choice(): LocationChoice {
        const known = this._nodes[0]?.parentGraph?.getStyles?.().config.data.knownFields;
        return chosenLocation(this.config, known);
    }

    /**
     * The values of a column an option names: through the run's column reader, which also reads
     * `results.<run>.<field>` and dotted paths, else the nodes' own data.
     * @param input - The run's input.
     * @param columns - The nodes' own data.
     * @param name - The column.
     * @returns The values by row, or null when no node carries it.
     */
    #optionColumn(
        input: SnapshotLayoutInput,
        columns: readonly ColumnValues[],
        name: string,
    ): readonly unknown[] | null {
        const options = ["location", "latitude", "longitude"] as const;
        const option = options.find((o) => this.config[o] === name);
        return (option === undefined ? null : input.column(option)) ?? named(columns, name);
    }

    /**
     * Every top-level attribute of the nodes' data, by row, for finding the location unasked.
     * @param n - The number of rows.
     * @returns The attributes and their values.
     */
    #dataColumns(n: number): ColumnValues[] {
        const rows: (Record<string, unknown> | undefined)[] = new Array<Record<string, unknown> | undefined>(n);
        const { ids } = this.graph;
        for (const node of this._nodes) {
            const row = ids.indexOf(node.id);
            if (row >= 0 && row < n) {
                rows[row] = node.data as Record<string, unknown>;
            }
        }

        const names = new Set<string>();
        for (const data of rows.slice(0, 200)) {
            for (const key of Object.keys(data ?? {})) {
                if (key !== "id" && key !== "position") {
                    names.add(key);
                }
            }
        }

        return [...names].map((name) => ({ name, values: rows.map((data) => data?.[name]) }));
    }
}

/**
 * The column that narrowed a place column's names.
 * @param source - The place column.
 * @returns The column, or null for none or a fixed code.
 */
function withinColumn(source: PlaceSource): string | null {
    return source.within !== null && "column" in source.within ? source.within.column : null;
}

/**
 * A column of the nodes' own data by name.
 * @param columns - The columns.
 * @param name - The name.
 * @returns The values, or null when no node carries it.
 */
function named(columns: readonly ColumnValues[], name: string): readonly unknown[] | null {
    return columns.find((c) => c.name === name)?.values ?? null;
}

/**
 * The error a refused run throws: no sentence, only the refusal's code and its facts.
 * @param refusal - The refusal.
 * @returns The error.
 */
function refusalError(refusal: LocationRefusal): GraphtyError {
    return new GraphtyError({
        code: "E_UNKNOWN_ATTRIBUTE",
        message: refusal.code,
        source: "layout",
        details: { refusal, option: refusal.params.missing, candidates: refusal.params.attributes },
    });
}
