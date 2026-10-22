import type { F32 } from "@graphty/graph-format";
import { z } from "zod";

import { defineOptions, type OptionsSchema } from "../config";
import { GraphtyError } from "../errors";
import { layoutDim, SimpleLayoutConfig } from "./LayoutEngine";
import type { LocationMapFrame, LocationSource } from "./locationMap/place";
import { SnapshotLayoutEngine, type SnapshotLayoutInput } from "./SnapshotLayoutEngine";

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
 * reported as `W_LOCATION_UNPARSED`; they are never put at latitude 0, longitude 0. The 2D view
 * always draws the flat map; in 3D `surface` picks a flat map or a globe. Each answer publishes
 * {@link LocationMapLayout.geoFrame}, which the map and the edges' default route follow.
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
     * Read, project and place every node.
     * @param input - The graph and its nodes.
     * @returns The positions.
     */
    protected async compute(input: SnapshotLayoutInput): Promise<F32> {
        const { placeOnMap, detectSource } = await import("./locationMap/place");
        const n = input.graph.nodeCount;
        const ids = Array.from({ length: n }, (_, row) => input.graph.ids.idOf(row));
        const source = this.#source(input) ?? detectSource(this.#dataColumns(n));
        if (source === null) {
            throw new GraphtyError({
                code: "E_UNKNOWN_ATTRIBUTE",
                message:
                    'The location map layout found no location: set "location", or "latitude" and "longitude", ' +
                    "to the node attributes that hold it.",
                source: "layout",
                details: { option: "location", column: null, candidates: this.#dataColumns(n).map((c) => c.name) },
            });
        }

        const placement = placeOnMap(
            source,
            { ids, sizes: input.nodeSizes?.() ?? null, initial: input.initial },
            {
                format: this.config.format,
                surface: this.config.surface,
                projection: this.config.projection,
                extent: this.config.extent,
                size: this.config.size,
                unplaced: this.config.unplaced,
                overlap: this.config.overlap,
                dimensions: this.dimensions,
            },
        );
        for (const warning of placement.warnings) {
            input.warn(warning);
        }

        this.geoFrame = placement.frame;
        return placement.positions;
    }

    /**
     * Where the options say the locations are.
     * @param input - The run's input.
     * @returns The source, or null when no location option is set.
     */
    #source(input: SnapshotLayoutInput): LocationSource | null {
        const { location, latitude, longitude } = this.config;
        if (latitude !== null && longitude !== null) {
            return {
                kind: "columns",
                latitude,
                longitude,
                lat: input.column("latitude") ?? [],
                lon: input.column("longitude") ?? [],
            };
        }

        if (location !== null) {
            return { kind: "location", column: location, values: input.column("location") ?? [], named: true };
        }

        return null;
    }

    /**
     * Every top-level attribute of the nodes' data, by row, for finding the location unasked.
     * @param n - The number of rows.
     * @returns The attributes and their values.
     */
    #dataColumns(n: number): { name: string; values: unknown[] }[] {
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
