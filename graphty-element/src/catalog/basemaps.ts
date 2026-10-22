/**
 * @file The named map sources the `basemap` setting accepts (`{ source: id }`), as data, so an
 * application lists them without importing babylonjs-map or copying its ids.
 *
 * `kind` is what the picture shows; `coverage` is where it has pictures. Grouping, order and the
 * words a reader sees are the application's.
 */

import type { MapSourceId } from "babylonjs-map";

/**
 * One named map source.
 * @since 3.31.0
 */
export interface BasemapSourceDescriptor {
    /** The id `basemap.source` takes. */
    readonly id: MapSourceId;
    /** The source's own name. */
    readonly plainName: string;
    /** What the picture shows: land and water, streets, satellite imagery, or terrain. */
    readonly kind: "plain" | "streets" | "satellite" | "terrain";
    /** Where it has pictures: the whole world, or the United States only. */
    readonly coverage: "world" | "us";
    /** Whether it is fetched from a third party (every source but the bundled world image). */
    readonly network: boolean;
}

/** Every source, by id, so a source babylonjs-map adds cannot be left out of the table. */
const SOURCES: Readonly<Record<MapSourceId, Omit<BasemapSourceDescriptor, "id">>> = {
    "natural-earth": { plainName: "Natural Earth", kind: "plain", coverage: "world", network: false },
    openstreetmap: { plainName: "OpenStreetMap", kind: "streets", coverage: "world", network: true },
    opentopomap: { plainName: "OpenTopoMap", kind: "terrain", coverage: "world", network: true },
    "nasa-gibs-blue-marble": { plainName: "NASA Blue Marble", kind: "satellite", coverage: "world", network: true },
    "eox-s2cloudless-2016": {
        plainName: "Sentinel-2 cloudless 2016",
        kind: "satellite",
        coverage: "world",
        network: true,
    },
    "usgs-topo": { plainName: "USGS Topo", kind: "terrain", coverage: "us", network: true },
    "usgs-imagery": { plainName: "USGS Imagery", kind: "satellite", coverage: "us", network: true },
};

/**
 * Every named map source, the bundled world image (the default) first.
 * @since 3.31.0
 */
export const BASEMAP_SOURCE_DESCRIPTORS: readonly BasemapSourceDescriptor[] = Object.freeze(
    (Object.keys(SOURCES) as MapSourceId[]).map((id) => Object.freeze({ id, ...SOURCES[id] })),
);
