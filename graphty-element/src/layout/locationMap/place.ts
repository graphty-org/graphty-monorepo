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
    type LocationError,
    type LocationFormat,
    parseColumnValue,
} from "babylonjs-map/location";
import {
    boundsOf,
    createMapFrame,
    type GeoBounds,
    latLonToSphere,
    longitudeIn,
    type MapFrame,
    type ProjectionId,
    WEB_MERCATOR_MAX_LATITUDE,
    worldBounds,
} from "babylonjs-map/projection";

import type { LocationSourceFact } from "../../config/Basemap";
import type { CoordinateSource } from "./source";

export { detectSource, type LocationSource } from "./source";

/** What every frame carries besides its surface. */
interface FrameCommon {
    readonly kind: "geographic";
    /** Where the locations were read. */
    readonly location: LocationSourceFact;
    /** The ids of the nodes with no place on the map, in the tray or left where they were. */
    readonly unplacedIds: ReadonlySet<unknown>;
    /** The warnings the run reported. */
    readonly warnings: readonly PlaceWarning[];
}

/** How the location map layout lays a flat map or a globe in the scene. */
export type LocationMapFrame =
    | (FrameCommon & {
          readonly surface: "flat";
          readonly dimensions: 2 | 3;
          readonly projection: ProjectionId;
          /** The box shown, `[[west, south], [east, north]]` in degrees. */
          readonly bounds: GeoBounds;
          /** Scene units across the box's longer side. */
          readonly size: number;
          /** The projection placed in the scene, which the map is drawn with. */
          readonly mapFrame: MapFrame;
      })
    | (FrameCommon & {
          readonly surface: "globe";
          readonly dimensions: 3;
          readonly radius: number;
          /** Whether the whole globe is the view's subject (world data or `extent: "world"`), not the data on it. */
          readonly world: boolean;
          /**
           * The turn that brings the data's center in front of the camera, as the rows of a 3x3
           * matrix (row i is where axis i goes), row-vector convention as Babylon.js uses it.
           */
          readonly rotation: readonly number[];
      });

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

/**
 * Degrees across the box for data at one place: enough of the bundled world picture (about six
 * degrees to a hundred texels) to show the region around it, where 1 degree showed a blur.
 */
const ONE_PLACE_SPAN = 10;

/**
 * The least span of any other data, about a kilometer: a city's data is framed at its own size
 * (babylonjs-map's default of 1 degree drew Venice's 0.3 degrees as a blob).
 */
const DATA_MIN_SPAN = 0.01;

/**
 * The box around the placed points: boundsOf's own, or for points all at one place, the region
 * around it.
 * @param placed - The placed points.
 * @returns The box, or null for none.
 */
function dataBounds(placed: readonly LatLon[]): GeoBounds | null {
    const first = placed[0];
    const onePlace = first !== undefined && placed.every((p) => p.lat === first.lat && p.lon === first.lon);
    return boundsOf(placed, { minSpan: onePlace ? ONE_PLACE_SPAN : DATA_MIN_SPAN });
}

/**
 * A value as a warning sample shows it: primitives as they are, anything else as JSON text.
 * @param value - The value.
 * @returns The sample.
 */
function sampleOf(value: unknown): unknown {
    return value === null || typeof value !== "object" ? value : JSON.stringify(value);
}

/** Every row's reading: its point, or why it has none. */
interface Readings {
    readonly points: (LatLon | null)[];
    /** Each row's error, null for a row read. */
    readonly errors: (LocationError | null)[];
    /** The format a location column was read in; `decimal` for two columns. */
    readonly format: LocationFormat;
    /** What reading the column's format raised: an ambiguous or a swapped format. */
    readonly warnings: PlaceWarning[];
}

/**
 * Reads every row's location. A location column is read in the format its values choose (or the
 * `format` option), and a value that format refuses is tried in the formats that cannot be
 * mistaken for another, so a column mixing spellings loses no row.
 * @param source - Where the locations are.
 * @param format - The format option.
 * @param n - The number of rows.
 * @returns The points and errors by row, the format, and the format's warnings.
 */
function readPoints(source: CoordinateSource, format: LocationFormat | "auto", n: number): Readings {
    const warnings: PlaceWarning[] = [];
    let read: (row: number) => LatLon | LocationError;
    let use: LocationFormat = format === "auto" ? "decimal" : format;
    if (source.kind === "columns") {
        read = (row) => latLonFromColumns(source.lat[row], source.lon[row]);
    } else {
        if (format === "auto") {
            const found = detectLocationFormat(source.values);
            use = found.format ?? "decimal";
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

        read = (row) => parseColumnValue(source.values[row], use);
    }

    const points: (LatLon | null)[] = [];
    const errors: (LocationError | null)[] = [];
    for (let row = 0; row < n; row++) {
        const result = read(row);
        const failed = isLocationError(result);
        points.push(failed ? null : result);
        errors.push(failed ? result : null);
    }

    return { points, errors, format: use, warnings };
}

/**
 * The warnings about the rows left unplaced: values missing or unreadable, and values out of
 * range (beyond the poles or the date line, or past the latitude a Web Mercator map reaches).
 * Both carry the one total of unplaced rows and their ids, so a count can select them.
 * @param errors - Each row's error, null for a row placed.
 * @param ids - Node ids.
 * @returns The warnings.
 */
function unplacedWarnings(errors: readonly (LocationError | null)[], ids: readonly unknown[]): PlaceWarning[] {
    let missing = 0;
    let unparsed = 0;
    let outOfRange = 0;
    const unparsedSamples: unknown[] = [];
    const rangeSamples: unknown[] = [];
    const unplacedIds: unknown[] = [];
    errors.forEach((error, row) => {
        if (error === null) {
            return;
        }

        unplacedIds.push(ids[row]);
        const sample = { id: ids[row], value: sampleOf(error.params.value), code: error.code };
        if (error.code === "empty") {
            missing++;
        } else if (error.code === "range") {
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
    });

    const unplaced = unplacedIds.length;
    const common = { unplaced, total: ids.length, ids: unplacedIds };
    const warnings: PlaceWarning[] = [];
    if (missing + unparsed > 0) {
        warnings.push({
            code: "W_LOCATION_UNPARSED",
            params: { missing, unparsed, outOfRange, ...common, samples: unparsedSamples },
        });
    }

    if (outOfRange > 0) {
        warnings.push({
            code: "W_LOCATION_OUT_OF_RANGE",
            params: { count: outOfRange, ...common, samples: rangeSamples },
        });
    }

    return warnings;
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

/** Data spanning this many degrees of longitude or more is world data: the globe opens at the equator. */
const WORLD_SPAN = 120;

/**
 * The angle a box spans on a sphere, in radians: its width at its middle latitude, or its height,
 * whichever is greater.
 * @param bounds - The box.
 * @returns The angle; at least a hundredth of a radian.
 */
function spanOf(bounds: GeoBounds): number {
    const [[west, south], [east, north]] = bounds;
    const middle = ((south + north) / 2) * DEG;
    return Math.max(0.01, (east - west) * DEG * Math.cos(middle), (north - south) * DEG);
}

/**
 * Places every node at its location on a flat map or a globe.
 *
 * On a flat map the box is fitted to the data (or the whole world), crossing the date line when
 * the data does, and a point past the latitude Web Mercator reaches (+/-85.05 degrees) goes to the
 * tray as out of range rather than onto the map's edge. On a globe the radius is set so the
 * data's extent spans `size` scene units of arc, the same share of the view as on the flat map,
 * and the data's center is turned to face the camera (world data at the equator, north up).
 * Unplaced nodes sit in one row below the map.
 * @param source - Where the locations are.
 * @param nodes - Ids, sizes and current positions by row.
 * @param options - The layout's options.
 * @param filled - The half of a pair the layout found itself, for the frame's source fact.
 * @returns Positions, the frame the map is drawn in, and the warnings.
 */
export function placeOnMap(
    source: CoordinateSource,
    nodes: PlaceNodes,
    options: PlaceOptions,
    filled: "latitude" | "longitude" | null = null,
): Placement {
    const dim = options.dimensions;
    const n = nodes.ids.length;
    const readings = readPoints(source, options.format, n);
    const { points, errors } = readings;
    const flat = dim === 2 || options.surface === "flat";
    const projection: ProjectionId = options.projection === "auto" ? "web-mercator" : options.projection;
    if (flat && projection === "web-mercator") {
        points.forEach((p, row) => {
            if (p !== null && Math.abs(p.lat) > WEB_MERCATOR_MAX_LATITUDE) {
                points[row] = null;
                errors[row] = { code: "range", params: { value: errors[row]?.params.value ?? `${p.lat}, ${p.lon}` } };
            }
        });
    }

    const warnings = [...readings.warnings, ...unplacedWarnings(errors, nodes.ids)];
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

    const common = {
        kind: "geographic" as const,
        location: locationFact(source, readings.format, filled),
        unplacedIds: new Set(unplacedRows.map((row) => nodes.ids[row])),
        warnings,
    };
    let frame: LocationMapFrame;
    let trayWidth: number;
    let trayTop: number;
    if (flat) {
        const bounds =
            options.extent === "world" ? worldBounds(projection) : (dataBounds(placed) ?? worldBounds(projection));
        const mapFrame = createMapFrame({ projection, bounds, size: options.size });
        frame = {
            ...common,
            surface: "flat",
            dimensions: dim,
            projection,
            bounds: mapFrame.bounds,
            size: options.size,
            mapFrame,
        };
        // A box across the date line runs east past 180: a point west of the line moves a turn east.
        const scene = points.map((p) =>
            p === null ? null : mapFrame.toScene({ lat: p.lat, lon: longitudeIn(p.lon, bounds) }),
        );
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
        const bounds = options.extent === "world" ? worldBounds("equirectangular") : dataBounds(placed);
        const world = bounds === null || bounds[1][0] - bounds[0][0] >= WORLD_SPAN;
        const radius = options.size / (bounds === null ? 2 * Math.PI : spanOf(bounds));
        const center = placed.length > 0 ? centerOf(placed) : { lat: 0, lon: 0 };
        const rotation = facing(world ? { lat: 0, lon: center.lon } : center);
        frame = { ...common, surface: "globe", dimensions: 3, radius, world, rotation };
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

    // One row, centered under the map, however many there are.
    const step = 1.5 * spacing;
    const rowWidth = (unplacedRows.length - 1) * step;
    unplacedRows.forEach((row, k) => {
        if (options.unplaced === "leave") {
            positions.set(nodes.initial.subarray(dim * row, dim * row + dim), dim * row);
            return;
        }

        positions[dim * row] = Math.min(-rowWidth / 2, -trayWidth / 2 + spacing / 2) + k * step;
        positions[dim * row + 1] = trayTop;
        if (dim === 3) {
            positions[dim * row + 2] = 0;
        }
    });

    return { positions, frame, warnings, unplacedRows };
}

/**
 * The frame's fact about where the locations were read.
 * @param source - The source.
 * @param format - The format a location column was read in.
 * @param filled - The half of a pair found by name.
 * @returns The fact.
 */
function locationFact(
    source: CoordinateSource,
    format: LocationFormat,
    filled: "latitude" | "longitude" | null,
): LocationSourceFact {
    return source.kind === "columns"
        ? { kind: "columns", latitude: source.latitude, longitude: source.longitude, filled }
        : { kind: "location", column: source.column, format };
}
