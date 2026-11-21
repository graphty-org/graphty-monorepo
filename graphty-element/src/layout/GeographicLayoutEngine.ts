import type { F32, F64 } from "@graphty/graph-format";
import { geographicColumnNames } from "@graphty/graph-io/positions";
import { geographic } from "@graphty/layout";
import { z } from "zod";

import { defineOptions, type OptionsSchema } from "../config";
import { SimpleLayoutConfig } from "./LayoutEngine";
import { sceneUnits, SnapshotLayoutEngine, type SnapshotLayoutInput } from "./SnapshotLayoutEngine";

const PROJECTIONS = ["equirectangular", "web-mercator", "equal-earth"] as const;

const geographicLayoutOptionsSchema = defineOptions({
    latitude: {
        schema: z.string().nullable().default(null),
        meta: {
            label: "Latitude",
            description:
                "The node attribute holding each node's latitude in degrees; empty reads the designated latitude field, else the attribute named lat or latitude (any case), else `latitude`",
        },
    },
    longitude: {
        schema: z.string().nullable().default(null),
        meta: {
            label: "Longitude",
            description:
                "The node attribute holding each node's longitude in degrees; empty reads the designated longitude field, else the attribute named lon, lng or longitude (any case), else `longitude`",
        },
    },
    projection: {
        schema: z.enum(PROJECTIONS).default("equirectangular"),
        meta: {
            label: "Projection",
            description: "How longitude and latitude become x and y; equal-earth keeps areas in proportion",
        },
    },
    centralMeridian: {
        schema: z.union([z.number(), z.literal("auto")]).default(0),
        meta: {
            label: "Central Meridian",
            description:
                "The longitude drawn at the center, in degrees; auto puts the map's edges in the widest gap between nodes, so nodes on both sides of the 180th meridian are drawn side by side",
            advanced: true,
        },
    },
    scalingFactor: {
        schema: z.number().positive().default(100),
        meta: {
            label: "Scaling Factor",
            description: "The radius of the globe the map is drawn from, in scene units",
            advanced: true,
        },
    },
});

const GeographicLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    latitude: z.string().nullable().default(null),
    longitude: z.string().nullable().default(null),
    projection: z.enum(PROJECTIONS).default("equirectangular"),
    centralMeridian: z.union([z.number(), z.literal("auto")]).default(0),
    scalingFactor: z.number().positive().default(100),
});
type GeographicLayoutConfigType = z.infer<typeof GeographicLayoutConfig>;
type GeographicLayoutOpts = Partial<GeographicLayoutConfigType>;

/**
 * A number from a node attribute: a number, or a string that reads as one.
 * @param value - the attribute's value
 * @returns the number, NaN for anything else
 */
function degrees(value: unknown): number {
    if (typeof value === "number") {
        return value;
    }

    return typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
}

/**
 * The geographic layout: every node at its latitude and longitude, projected onto a flat map
 * (equirectangular, Web Mercator or Equal Earth), north up, with no map drawn under it. The
 * attributes default to the designated latitude and longitude fields (`data.setRole`), else to the
 * one attribute named `lat` or `latitude` and the one named `lon`, `lng` or `longitude` (any case;
 * the rule graph-io reads a file's geographic position column by), else to `latitude` and `longitude`. A node with no usable coordinates is placed at the
 * origin and reported as a `layout-warning` with code `W_NO_POSITION`. For a map or a globe drawn
 * under the graph, use the `location-map` layout.
 */
export class GeographicLayout extends SnapshotLayoutEngine {
    static readonly type: string = "geographic";
    static readonly maxDimensions: number = 2;
    static readonly zodOptionsSchema: OptionsSchema = geographicLayoutOptionsSchema;
    protected readonly dimensions = 2;
    config: GeographicLayoutConfigType;

    /**
     * Create a geographic layout engine
     * @param opts - the attributes, the projection, the central meridian and the scale
     */
    constructor(opts: GeographicLayoutOpts = {}) {
        super(opts);
        this.config = GeographicLayoutConfig.parse(opts);
    }

    /**
     * Get dimension-specific options: a flat map has no third dimension.
     * @param dimension - The desired dimension (2 or 3)
     * @returns Empty object for 2D, null for 3D (unsupported)
     */
    static getOptionsForDimension(dimension: 2 | 3): object | null {
        return dimension > this.maxDimensions ? null : {};
    }

    /**
     * The options the layout reads, with the attributes resolved to their defaults.
     * @returns the configuration
     */
    protected get options(): Readonly<Record<string, unknown>> {
        const known = this.knownFields();
        return {
            ...this.config,
            latitude: this.config.latitude ?? known?.nodeLatitudePath ?? null,
            longitude: this.config.longitude ?? known?.nodeLongitudePath ?? null,
        };
    }

    /**
     * Project every node's coordinates.
     * @param input - the graph and its node attributes
     * @returns the coordinates, in scene units
     */
    protected compute(input: SnapshotLayoutInput): F32 {
        const n = input.graph.nodeCount;
        const rows = this.rowRecords(n);
        const named = this.#namedColumns(rows);
        const read = (option: "latitude" | "longitude"): F64 => {
            const name = named?.[option] ?? option;
            const values = input.column(option) ?? rows.map((data) => data?.[name]);
            const out = new Float64Array(n);
            for (let i = 0; i < n; i++) {
                out[i] = degrees(values[i]);
            }

            return out;
        };
        const graph = input.graph.withColumns({ lat: read("latitude"), lon: read("longitude") });
        const positions = sceneUnits(
            geographic(graph, {
                latitude: "lat",
                longitude: "lon",
                projection: this.config.projection,
                centralMeridian: this.config.centralMeridian,
            }),
            this.config.scalingFactor,
        );
        let missing = 0;
        for (let i = 0; i < positions.length; i++) {
            if (Number.isNaN(positions[i])) {
                missing += i % 2 === 0 ? 1 : 0;
                positions[i] = 0;
            }
        }

        if (missing > 0) {
            input.warn({ code: "W_NO_POSITION", params: { missing, total: n } });
        }

        return positions;
    }

    /**
     * The latitude and longitude attributes by graph-io's name rule, when an option or a designated
     * field leaves one of them unnamed.
     * @param rows - each row's data
     * @returns the names, or null when both are named or the rule finds no pair
     */
    #namedColumns(rows: readonly (Record<string | number, unknown> | undefined)[]): {
        readonly latitude: string;
        readonly longitude: string;
    } | null {
        const { latitude, longitude } = this.options;
        if (latitude !== null && longitude !== null) {
            return null;
        }
        const names = new Set<string>();
        for (const data of rows) {
            for (const key of Object.keys(data ?? {})) {
                names.add(key);
            }
        }
        return geographicColumnNames(names);
    }
}
