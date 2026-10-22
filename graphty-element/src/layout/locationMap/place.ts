/**
 * @file Where the location map layout puts each node: reads each node's location, projects it
 * onto a flat map or a globe, spreads nodes that share a place, and lines up the nodes with no
 * usable location in a tray beside the map.
 *
 * Loaded lazily by `LocationMapLayout` the first time it runs, with babylonjs-map's two
 * Babylon-free entry points, so neither the main entry nor `./session` carries the parsers.
 */

import {
    detectLocationFormat,
    isLocationError,
    type LatLon,
    latLonFromColumns,
    type LocationFormat,
    parseLocation,
} from "babylonjs-map/location";
import {
    boundsOf,
    createMapFrame,
    type GeoBounds,
    latLonToSphere,
    type MapFrame,
    type ProjectionId,
    worldBounds,
} from "babylonjs-map/projection";

/** How the location map layout lays a flat map or a globe in the scene. */
export type LocationMapFrame =
    | {
          readonly kind: "geographic";
          readonly surface: "flat";
          readonly dimensions: 2 | 3;
          readonly projection: ProjectionId;
          /** The box shown, `[[west, south], [east, north]]` in degrees. */
          readonly bounds: GeoBounds;
          /** Scene units across the box's longer side. */
          readonly size: number;
          /** The projection placed in the scene, which the map is drawn with. */
          readonly mapFrame: MapFrame;
      }
    | {
          readonly kind: "geographic";
          readonly surface: "globe";
          readonly dimensions: 3;
          readonly radius: number;
          /**
           * The turn that brings the data's center in front of the camera, as the rows of a 3x3
           * matrix (row i is where axis i goes), row-vector convention as Babylon.js uses it.
           */
          readonly rotation: readonly number[];
      };

/** The layout's options, validated. */
export interface PlaceOptions {
    readonly format: LocationFormat | "auto";
    readonly surface: "flat" | "globe";
    readonly projection: ProjectionId | "auto";
    readonly extent: "data" | "world";
    readonly size: number;
    readonly unplaced: "tray" | "leave";
    readonly overlap: "spread" | "stack";
    readonly dimensions: 2 | 3;
}

/** Where the locations come from: one column holding whole locations, or two numeric columns. */
export type LocationSource =
    | {
          readonly kind: "location";
          readonly column: string;
          readonly values: readonly unknown[];
          /** False when the column was found by its values, which never reads geohashes. */
          readonly named: boolean;
      }
    | {
          readonly kind: "columns";
          readonly latitude: string;
          readonly longitude: string;
          readonly lat: readonly unknown[];
          readonly lon: readonly unknown[];
      };

/** A warning the layout reports, as a code and its parameters. */
export interface PlaceWarning {
    readonly code: "W_LOCATION_UNPARSED" | "W_LOCATION_OUT_OF_RANGE" | "W_LOCATION_AMBIGUOUS" | "W_LOCATION_SWAPPED";
    readonly params: Readonly<Record<string, unknown>>;
}

/** What {@link placeOnMap} answers. */
export interface Placement {
    /** `dimensions` numbers per row; NaN for a row left unplaced. */
    readonly positions: Float32Array<ArrayBuffer>;
    readonly frame: LocationMapFrame;
    readonly warnings: readonly PlaceWarning[];
    /** Rows with no usable location. */
    readonly unplacedRows: readonly number[];
}

/** The per-node facts the placement reads. */
export interface PlaceNodes {
    readonly ids: readonly unknown[];
    /** How wide each node is drawn, or null when unknown; NaN entries count as 1. */
    readonly sizes: Float32Array | null;
    /** Each row's current position, `dimensions` per row, for `unplaced: "leave"`. */
    readonly initial: Float32Array;
}

const MAX_SAMPLES = 8;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const DEG = Math.PI / 180;

const LAT_NAMES = new Set(["lat", "latitude"]);
const LON_NAMES = new Set(["lon", "lng", "long", "longitude"]);

/**
 * Finds the location among a node's attributes when no option names it: a latitude and a
 * longitude column by name, else the one column whose values a location format reads (at least
 * 90% of a sample). Geohashes are never guessed this way, since short words read as geohashes.
 * @param columns - Each attribute's name and values, by row.
 * @returns The source, or null when nothing looks like a location.
 */
export function detectSource(
    columns: readonly { readonly name: string; readonly values: readonly unknown[] }[],
): LocationSource | null {
    const lat = columns.find((c) => LAT_NAMES.has(c.name.toLowerCase()));
    const lon = columns.find((c) => LON_NAMES.has(c.name.toLowerCase()));
    if (lat !== undefined && lon !== undefined) {
        return { kind: "columns", latitude: lat.name, longitude: lon.name, lat: lat.values, lon: lon.values };
    }

    let best: { column: (typeof columns)[number]; share: number } | null = null;
    for (const column of columns) {
        const found = detectLocationFormat(column.values);
        if (
            found.format !== null &&
            found.format !== "geohash" &&
            found.share >= 0.9 &&
            found.share > (best?.share ?? 0)
        ) {
            best = { column, share: found.share };
        }
    }

    return best === null
        ? null
        : { kind: "location", column: best.column.name, values: best.column.values, named: false };
}

/**
 * A value as a warning sample shows it: primitives as they are, anything else as JSON text.
 * @param value - The value.
 * @returns The sample.
 */
function sampleOf(value: unknown): unknown {
    return value === null || typeof value !== "object" ? value : JSON.stringify(value);
}

/**
 * Reads every row's location.
 * @param source - Where the locations are.
 * @param format - The format option.
 * @param ids - Node ids, for warning samples.
 * @returns The points (null where none), and the warnings about reading them.
 */
function readPoints(
    source: LocationSource,
    format: LocationFormat | "auto",
    ids: readonly unknown[],
): { points: (LatLon | null)[]; warnings: PlaceWarning[] } {
    const warnings: PlaceWarning[] = [];
    let read: (row: number) => ReturnType<typeof parseLocation>;
    if (source.kind === "columns") {
        read = (row) => latLonFromColumns(source.lat[row], source.lon[row]);
    } else {
        let use: LocationFormat = format === "auto" ? "decimal" : format;
        if (format === "auto") {
            const found = detectLocationFormat(source.values);
            use = found.format ?? "decimal";
            if (use === "geohash" && !source.named) {
                use = "decimal";
            }

            if (found.alternatives.length > 0) {
                warnings.push({
                    code: "W_LOCATION_AMBIGUOUS",
                    params: { formats: [use, ...found.alternatives], column: source.column },
                });
            }

            if (use === "lon-lat") {
                warnings.push({ code: "W_LOCATION_SWAPPED", params: { column: source.column } });
            }
        }

        read = (row) => parseLocation(source.values[row], use);
    }

    let missing = 0;
    let unparsed = 0;
    const unparsedSamples: unknown[] = [];
    let outOfRange = 0;
    const rangeSamples: unknown[] = [];
    const points = ids.map((id, row): LatLon | null => {
        const result = read(row);
        if (!isLocationError(result)) {
            return result;
        }

        const sample = { id, value: sampleOf(result.params.value), code: result.code };
        if (result.code === "empty") {
            missing++;
        } else if (result.code === "range") {
            outOfRange++;
            if (rangeSamples.length < MAX_SAMPLES) {
                rangeSamples.push(sample);
            }
        } else {
            unparsed++;
            if (unparsedSamples.length < MAX_SAMPLES) {
                unparsedSamples.push(sample);
            }
        }

        return null;
    });

    if (missing + unparsed > 0) {
        warnings.push({
            code: "W_LOCATION_UNPARSED",
            params: { missing, unparsed, total: ids.length, samples: unparsedSamples },
        });
    }

    if (outOfRange > 0) {
        warnings.push({ code: "W_LOCATION_OUT_OF_RANGE", params: { count: outOfRange, samples: rangeSamples } });
    }

    return { points, warnings };
}

/**
 * The middle size of the nodes, which spacing on the map is measured in.
 * @param sizes - Node sizes, or null.
 * @returns The median finite size, or 1.
 */
function typicalSize(sizes: Float32Array | null): number {
    const finite = sizes === null ? [] : [...sizes].filter((s) => Number.isFinite(s) && s > 0).sort((a, b) => a - b);
    return finite.length === 0 ? 1 : finite[Math.floor(finite.length / 2)];
}

/**
 * Offsets that spread nodes sharing one place around it in a sunflower spiral; the first keeps
 * the place.
 * @param keys - Each placed row's place key, or null for an unplaced row.
 * @param spacing - The distance between neighbors.
 * @returns Each row's offset, [dx, dy].
 */
function spreadOffsets(keys: readonly (string | null)[], spacing: number): [number, number][] {
    const seen = new Map<string, number>();
    return keys.map((key): [number, number] => {
        if (key === null) {
            return [0, 0];
        }

        const k = seen.get(key) ?? 0;
        seen.set(key, k + 1);
        const r = spacing * Math.sqrt(k);
        return [r * Math.cos(k * GOLDEN_ANGLE), r * Math.sin(k * GOLDEN_ANGLE)];
    });
}

/**
 * The turn that brings a direction to face the camera (scene -z), as matrix rows.
 * @param center - The data's center.
 * @returns Rows of the 3x3 matrix.
 */
function facing(center: LatLon): number[] {
    // Turn east by -lon about the poles, then tip by -lat about the east-west axis.
    const yaw = -center.lon * DEG;
    const pitch = -center.lat * DEG;
    const turn = ([x, y, z]: number[]): number[] => {
        // a point at longitude L moves to L + yaw: in latLonToSphere's left-handed frame
        // x = ring sin L, z = -ring cos L
        const x1 = x * Math.cos(yaw) - z * Math.sin(yaw);
        const z1 = z * Math.cos(yaw) + x * Math.sin(yaw);
        return [x1, y * Math.cos(pitch) - z1 * Math.sin(pitch), y * Math.sin(pitch) + z1 * Math.cos(pitch)];
    };
    return [...turn([1, 0, 0]), ...turn([0, 1, 0]), ...turn([0, 0, 1])];
}

/**
 * Applies matrix rows to a point (row-vector convention: v * M).
 * @param m - The rows.
 * @param p - The point.
 * @param p.x - Its x.
 * @param p.y - Its y.
 * @param p.z - Its z.
 * @returns The turned point.
 */
export function turn(m: readonly number[], p: { x: number; y: number; z: number }): [number, number, number] {
    return [
        p.x * m[0] + p.y * m[3] + p.z * m[6],
        p.x * m[1] + p.y * m[4] + p.z * m[7],
        p.x * m[2] + p.y * m[5] + p.z * m[8],
    ];
}

/**
 * The mean direction of some points, as a point.
 * @param points - The points.
 * @returns Their center, or latitude 0, longitude 0 when they cancel out.
 */
function centerOf(points: readonly LatLon[]): LatLon {
    let x = 0;
    let y = 0;
    let z = 0;
    for (const p of points) {
        const v = latLonToSphere(p, 1);
        x += v.x;
        y += v.y;
        z += v.z;
    }

    if (Math.hypot(x, y, z) < 1e-9) {
        return { lat: 0, lon: 0 };
    }

    return { lat: Math.atan2(y, Math.hypot(x, z)) / DEG, lon: Math.atan2(x, -z) / DEG };
}

/**
 * Places every node at its location on a flat map or a globe.
 * @param source - Where the locations are.
 * @param nodes - Ids, sizes and current positions by row.
 * @param options - The layout's options.
 * @returns Positions, the frame the map is drawn in, and the warnings.
 */
export function placeOnMap(source: LocationSource, nodes: PlaceNodes, options: PlaceOptions): Placement {
    const dim = options.dimensions;
    const n = nodes.ids.length;
    const { points, warnings } = readPoints(source, options.format, nodes.ids);
    const placed = points.filter((p): p is LatLon => p !== null);
    const spacing = typicalSize(nodes.sizes);
    const halfSize = (row: number): number => {
        const s = nodes.sizes?.[row];
        return s !== undefined && Number.isFinite(s) ? s / 2 : spacing / 2;
    };
    const positions = new Float32Array(dim * n).fill(Number.NaN);
    const unplacedRows: number[] = [];
    for (let row = 0; row < n; row++) {
        if (points[row] === null) {
            unplacedRows.push(row);
        }
    }

    let frame: LocationMapFrame;
    let trayWidth: number;
    let trayTop: number;
    if (dim === 2 || options.surface === "flat") {
        const projection: ProjectionId = options.projection === "auto" ? "web-mercator" : options.projection;
        const bounds =
            options.extent === "world" ? worldBounds(projection) : (boundsOf(placed) ?? worldBounds(projection));
        const mapFrame = createMapFrame({ projection, bounds, size: options.size });
        frame = {
            kind: "geographic",
            surface: "flat",
            dimensions: dim,
            projection,
            bounds: mapFrame.bounds,
            size: options.size,
            mapFrame,
        };
        const scene = points.map((p) => (p === null ? null : mapFrame.toScene(p)));
        const offsets =
            options.overlap === "spread"
                ? spreadOffsets(
                      scene.map((s) => (s === null ? null : `${s.x.toFixed(4)},${s.y.toFixed(4)}`)),
                      spacing,
                  )
                : null;
        scene.forEach((s, row) => {
            if (s !== null) {
                positions[dim * row] = s.x + (offsets?.[row][0] ?? 0);
                positions[dim * row + 1] = s.y + (offsets?.[row][1] ?? 0);
                if (dim === 3) {
                    // toward the camera, which looks along +z, so a node never sinks into the map
                    positions[dim * row + 2] = -halfSize(row);
                }
            }
        });
        trayWidth = mapFrame.width;
        trayTop = -mapFrame.height / 2 - 2 * spacing;
    } else {
        const radius = options.size;
        const rotation =
            options.extent === "data" && placed.length > 0 ? facing(centerOf(placed)) : facing({ lat: 0, lon: 0 });
        frame = { kind: "geographic", surface: "globe", dimensions: 3, radius, rotation };
        // degrees of arc per scene unit at the surface, for spreading in place
        const degPerUnit = 1 / (radius * DEG);
        const offsets =
            options.overlap === "spread"
                ? spreadOffsets(
                      points.map((p) => (p === null ? null : `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`)),
                      spacing * degPerUnit,
                  )
                : null;
        points.forEach((p, row) => {
            if (p !== null) {
                const lat = Math.max(-90, Math.min(90, p.lat + (offsets?.[row][1] ?? 0)));
                const lon = p.lon + (offsets?.[row][0] ?? 0) / Math.max(Math.cos(p.lat * DEG), 0.01);
                const at = turn(rotation, latLonToSphere({ lat, lon }, radius + halfSize(row)));
                positions.set(at, 3 * row);
            }
        });
        trayWidth = 2 * radius;
        trayTop = -radius - 2 * spacing;
    }

    const step = 1.5 * spacing;
    const perRow = Math.max(1, Math.floor(trayWidth / step));
    unplacedRows.forEach((row, k) => {
        if (options.unplaced === "leave") {
            positions.set(nodes.initial.subarray(dim * row, dim * row + dim), dim * row);
            return;
        }

        positions[dim * row] = -trayWidth / 2 + (k % perRow) * step + spacing / 2;
        positions[dim * row + 1] = trayTop - Math.floor(k / perRow) * step;
        if (dim === 3) {
            positions[dim * row + 2] = 0;
        }
    });

    return { positions, frame, warnings, unplacedRows };
}
