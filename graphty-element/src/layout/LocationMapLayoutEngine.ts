import type { F32 } from "@graphty/graph-format";
import { z } from "zod";

import { defineOptions, type OptionsSchema } from "../config";
import { Basemap } from "../config/Basemap";
import { GraphtyError } from "../errors";
import { layoutDim, SimpleLayoutConfig } from "./LayoutEngine";
import type { LocationMapFrame, PlaceOptions } from "./locationMap/place";
import { type ColumnValues, isLocationRefusal, type LocationRefusal, resolveLocation } from "./locationMap/source";
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
    mapDimension: {
        schema: z.enum(["2d", "3d"]).default("3d"),
        meta: {
            label: "Map Dimension",
            description:
                "In the 3D view, a 3D map (the globe) or a 2D map (a flat map, edges arced above it); " +
                "the 2D view always draws the 2D map",
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
    mapScale: {
        schema: z.number().positive().default(1),
        meta: {
            label: "Map Scale",
            description:
                "How many times larger the map (flat or globe) is drawn than Size makes it, with nodes " +
                "and edges kept their size, so nodes close together draw further apart",
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
    mapDimension: z.enum(["2d", "3d"]).default("3d"),
    projection: z.enum(["auto", "web-mercator", "equirectangular"]).default("auto"),
    extent: z.enum(["data", "world"]).default("data"),
    size: z.number().positive().default(100),
    mapScale: z.number().positive().default(1),
    unplaced: z.enum(["tray", "leave"]).default("tray"),
    overlap: z.enum(["spread", "stack"]).default("spread"),
    nodeScale: z.enum(["scene", "screen"]).default("scene"),
    map: Basemap.nullable().default(null),
    dim: z.number().default(3),
});
type LocationMapLayoutConfigType = z.infer<typeof LocationMapLayoutConfig>;

/**
 * The location map layout: every node at the place its data names, on a flat map or a globe that
 * the element draws under the graph. The location is one attribute (a decimal pair, GeoJSON, WKT,
 * ISO 6709, degrees-minutes-seconds, a geohash, a plus code, MGRS or UTM) or a latitude and a
 * longitude attribute; with neither option set, the layout finds them by name or by their values.
 *
 * Nodes with no usable location go to a tray below the map (or stay where they were) and are
 * reported as `W_LOCATION_UNPARSED` and `W_LOCATION_OUT_OF_RANGE`; they are never put at latitude
 * 0, longitude 0. The 2D view always draws a 2D (flat) map with straight edges; in the 3D view
 * `mapDimension` picks the 3D map, a globe (the default), or the 2D map with edges arced above it.
 * Each answer publishes {@link LocationMapLayout.geoFrame}, which the map and the edges' default
 * route follow. A graph with no location the layout can find is refused when the layout
 * starts, so the previous layout stays drawn: the refusal is `layout.needs-location`, the code the
 * layout's cost estimate gives before it is chosen.
 */
export class LocationMapLayout extends SnapshotLayoutEngine {
    static type = "location-map";
    static maxDimensions = 3;
    static zodOptionsSchema: OptionsSchema = locationMapOptionsSchema;

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
        const answer = resolveLocation(this.config, columns, (name) => named(columns, name));
        if (isLocationRefusal(answer)) {
            throw refusalError(answer);
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
        const answer = resolveLocation(this.config, columns, (name) => this.#optionColumn(input, columns, name));
        if (isLocationRefusal(answer)) {
            this.geoFrame = null;
            if (n === 0) {
                return new Float32Array(0);
            }

            throw refusalError(answer);
        }

        const placement = placeOnMap(
            answer.source,
            { ids, sizes: input.nodeSizes?.() ?? null, initial: input.initial },
            this.#placeOptions(),
            answer.filled,
        );
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
        const { format, mapDimension, projection, extent, size, mapScale, unplaced, overlap } = this.config;
        return {
            format,
            surface: mapDimension === "3d" ? "globe" : "flat",
            projection,
            extent,
            size,
            mapScale,
            unplaced,
            overlap,
            dimensions: this.dimensions,
        };
    }

    /**
     * The frame a run would publish over the graph as it stands, without moving a node.
     * @param m - The placement module.
     */
    #restoreFrame(m: typeof import("./locationMap/place")): void {
        const n = this.graph.nodeCount;
        const columns = this.#dataColumns(n);
        const answer = resolveLocation(this.config, columns, (name) => named(columns, name));
        if (isLocationRefusal(answer)) {
            this.geoFrame = null;
            return;
        }

        const ids = Array.from({ length: n }, (_, row) => this.graph.ids.idOf(row));
        const placement = m.placeOnMap(
            answer.source,
            { ids, sizes: null, initial: new Float32Array(this.dimensions * n).fill(Number.NaN) },
            this.#placeOptions(),
            answer.filled,
        );
        this.geoFrame = placement.frame;
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
