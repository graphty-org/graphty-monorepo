import { projections, worldBounds } from "./projection/frame.js";
import type { GeoBounds, Projection, ProjectionId, UnitXY } from "./projection/types.js";

/**
 * A raster tile service, addressed by an XYZ URL template: `{z}`, `{x}`, `{y}`, `{-y}` (the TMS
 * row order), `{s}` (one of `subdomains`) and `{r}` (always empty: tiles are fetched at 1x).
 */
export interface TileSource {
    tiles: string;
    /** The credit the provider requires, shown whenever its tiles are. */
    attribution: string;
    /** Where the credit links to (the provider's copyright or license page), when it has one. */
    attributionUrl?: string;
    /** Default `web-mercator`. */
    projection?: ProjectionId;
    /** Tile width in pixels. Default 256. */
    tileSize?: number;
    /** Default 0. */
    minZoom?: number;
    /** The deepest zoom the service has. Default 19. */
    maxZoom?: number;
    subdomains?: readonly string[];
    /**
     * The width of a zoom-0 tile in map units (the map is one unit wide). Default 1 for Web Mercator
     * (one tile) and 0.5 for equirectangular (two tiles side by side). NASA GIBS uses 0.8.
     */
    tileExtent?: number;
}

/** One picture of a box of the earth: a historical map, a regional chart, the bundled world. */
export interface ImageSource {
    image: string;
    /** The box the picture shows. Default the whole world in its projection. */
    bounds?: GeoBounds;
    /** The projection the picture is drawn in. Default `equirectangular`. */
    projection?: ProjectionId;
    attribution?: string;
    /** Where the credit links to, when it has a page. */
    attributionUrl?: string;
    /** `gray` draws the picture as a light gray backdrop (desaturated and lightened). Default `color`. */
    tone?: "color" | "gray";
}

/** Something a map can show. */
export type MapSource = TileSource | ImageSource;

/** A tile of a source's pyramid. A single-image source has one tile, 0/0/0. */
export interface TileId {
    z: number;
    x: number;
    y: number;
}

/** The ids of the named sources in {@link mapSources}. */
export type MapSourceId =
    | "natural-earth"
    | "natural-earth-gray"
    | "openstreetmap"
    | "opentopomap"
    | "nasa-gibs-blue-marble"
    | "nasa-gibs-blue-marble-bathymetry"
    | "usgs-topo"
    | "usgs-imagery"
    | "eox-s2cloudless-2016";

const OSM = "(c) OpenStreetMap contributors";
const OSM_URL = "https://www.openstreetmap.org/copyright";
const NATURAL_EARTH = new URL("../assets/natural-earth.jpg", import.meta.url).href;

/**
 * Free map sources usable from a static page with no key. `natural-earth` is a 4096 x 2048
 * public-domain world image shipped in this package, so it contacts no third party;
 * `natural-earth-gray` is the same picture drawn as a plain light gray backdrop. The network
 * sources ask for light use: this package only loads the tiles in view and never prefetches.
 */
export const mapSources: Readonly<Record<MapSourceId, MapSource>> = {
    "natural-earth": {
        image: NATURAL_EARTH,
        projection: "equirectangular",
        attribution: "Natural Earth",
        attributionUrl: "https://www.naturalearthdata.com/",
    },
    "natural-earth-gray": {
        image: NATURAL_EARTH,
        projection: "equirectangular",
        attribution: "Natural Earth",
        attributionUrl: "https://www.naturalearthdata.com/",
        tone: "gray",
    },
    openstreetmap: {
        tiles: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: OSM,
        attributionUrl: OSM_URL,
        maxZoom: 19,
    },
    opentopomap: {
        tiles: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        subdomains: ["a", "b", "c"],
        attribution: `Map data: ${OSM}, SRTM; map style: (c) OpenTopoMap (CC-BY-SA)`,
        attributionUrl: "https://opentopomap.org/about",
        maxZoom: 17,
    },
    "nasa-gibs-blue-marble": {
        tiles: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_NextGeneration/default/2004-08-01/500m/{z}/{y}/{x}.jpeg",
        attribution: "NASA EOSDIS GIBS",
        attributionUrl: "https://earthdata.nasa.gov/gibs",
        projection: "equirectangular",
        tileSize: 512,
        tileExtent: 0.8,
        maxZoom: 7,
    },
    "nasa-gibs-blue-marble-bathymetry": {
        tiles: "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief_Bathymetry/default/2004-08-01/500m/{z}/{y}/{x}.jpeg",
        attribution: "NASA EOSDIS GIBS",
        attributionUrl: "https://earthdata.nasa.gov/gibs",
        projection: "equirectangular",
        tileSize: 512,
        tileExtent: 0.8,
        maxZoom: 7,
    },
    "usgs-topo": {
        tiles: "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",
        attribution: "USGS The National Map",
        attributionUrl: "https://www.usgs.gov/programs/national-geospatial-program/national-map",
        maxZoom: 16,
    },
    "usgs-imagery": {
        tiles: "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}",
        attribution: "USGS The National Map",
        attributionUrl: "https://www.usgs.gov/programs/national-geospatial-program/national-map",
        maxZoom: 16,
    },
    "eox-s2cloudless-2016": {
        tiles: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg",
        attribution:
            "Sentinel-2 cloudless - https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016)",
        attributionUrl: "https://s2maps.eu",
        maxZoom: 15,
    },
};

/** A map rectangle in a projection's map units. */
export interface MapRect {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

/** A source with every default filled in, and its tile geometry. */
export interface ResolvedSource {
    readonly source: MapSource;
    readonly projection: Projection;
    readonly tileSize: number;
    readonly minZoom: number;
    readonly maxZoom: number;
    readonly attribution: string;
    /** Where the credit links to, or "" when it has no page. */
    readonly attributionUrl: string;
    /** How the picture is drawn: as it is, or as a light gray backdrop. */
    readonly tone: "color" | "gray";
    /** The tiles at the source's `minZoom` that cover its map. */
    roots(): TileId[];
    /** The four tiles one level down, less any wholly outside the map. */
    children(tile: TileId): TileId[];
    /** The part of the map a tile covers, clipped to the map's edge. */
    rect(tile: TileId): MapRect;
    /** The tile's full (unclipped) square, for texture coordinates. */
    square(tile: TileId): MapRect;
    url(tile: TileId): string;
}

/**
 * Fills in a source's defaults and works out its tile geometry.
 * @param source - The source.
 * @returns The resolved source.
 */
export function resolveSource(source: MapSource): ResolvedSource {
    if ("image" in source) {
        const projection = projections[source.projection ?? "equirectangular"];
        const [[w, s], [e, n]] = source.bounds ?? worldBounds(projection);
        const a: UnitXY = projection.forward({ lat: n, lon: w });
        const b: UnitXY = projection.forward({ lat: s, lon: e });
        const rect = { x0: a.x, y0: a.y, x1: b.x, y1: b.y };
        return {
            source,
            projection,
            tileSize: Infinity,
            minZoom: 0,
            maxZoom: 0,
            attribution: source.attribution ?? "",
            attributionUrl: source.attributionUrl ?? "",
            tone: source.tone ?? "color",
            roots: () => [{ z: 0, x: 0, y: 0 }],
            children: () => [],
            rect: () => rect,
            square: () => rect,
            url: () => source.image,
        };
    }
    const projection = projections[source.projection ?? "web-mercator"];
    const extent = source.tileExtent ?? (projection.height < 1 ? 0.5 : 1);
    const minZoom = source.minZoom ?? 0;
    const inMap = (t: TileId): boolean => {
        const side = extent / 2 ** t.z;
        return t.x >= 0 && t.y >= 0 && t.x * side < 1 && t.y * side < projection.height;
    };
    const square = (t: TileId): MapRect => {
        const side = extent / 2 ** t.z;
        return { x0: t.x * side, y0: t.y * side, x1: (t.x + 1) * side, y1: (t.y + 1) * side };
    };
    return {
        source,
        projection,
        tileSize: source.tileSize ?? 256,
        minZoom,
        maxZoom: source.maxZoom ?? 19,
        attribution: source.attribution,
        attributionUrl: source.attributionUrl ?? "",
        tone: "color",
        roots() {
            const side = extent / 2 ** minZoom;
            const tiles: TileId[] = [];
            for (let y = 0; y < Math.ceil(projection.height / side - 1e-9); y++) {
                for (let x = 0; x < Math.ceil(1 / side - 1e-9); x++) {
                    tiles.push({ z: minZoom, x, y });
                }
            }
            return tiles;
        },
        children(t) {
            const z = t.z + 1;
            return [
                { z, x: 2 * t.x, y: 2 * t.y },
                { z, x: 2 * t.x + 1, y: 2 * t.y },
                { z, x: 2 * t.x, y: 2 * t.y + 1 },
                { z, x: 2 * t.x + 1, y: 2 * t.y + 1 },
            ].filter(inMap);
        },
        rect(t) {
            const r = square(t);
            return { x0: r.x0, y0: r.y0, x1: Math.min(1, r.x1), y1: Math.min(projection.height, r.y1) };
        },
        square,
        url(t) {
            const columns = Math.ceil(1 / (extent / 2 ** t.z) - 1e-9);
            const x = ((t.x % columns) + columns) % columns;
            const rows = Math.ceil(projection.height / (extent / 2 ** t.z) - 1e-9);
            const subdomains = source.subdomains ?? [];
            const values: Record<string, string | number> = {
                z: t.z,
                x,
                y: t.y,
                "-y": rows - 1 - t.y,
                s: subdomains.length > 0 ? subdomains[(x + t.y) % subdomains.length] : "",
                r: "",
            };
            return source.tiles.replaceAll(/\{(z|x|y|-y|s|r)\}/g, (_, key: string) => String(values[key]));
        },
    };
}
