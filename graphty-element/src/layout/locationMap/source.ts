/**
 * @file Where the location map layout finds each node's location: the columns its options name,
 * or, for any left unset, the columns it finds itself. One answer for every caller -- the layout's
 * run, the cost estimate that refuses a graph with no location before Apply, and the option
 * choices a form lists -- so the three never disagree.
 *
 * Babylon-free and DOM-free: it reads babylonjs-map's `location` entry only, so the session's
 * planning can import it.
 */

import { angleFromColumn, detectLocationFormat } from "babylonjs-map/location";

/** One attribute of the nodes: its name and its values, by row. */
export interface ColumnValues {
    readonly name: string;
    readonly values: readonly unknown[];
}

/** The three location options of the layout, as roles a column can play. */
export type LocationRole = "latitude" | "longitude" | "location";

/** Where the locations come from: one column holding whole locations, or two numeric columns. */
export type LocationSource =
    | {
          readonly kind: "location";
          readonly column: string;
          readonly values: readonly unknown[];
          /** False when the column was found by its values. */
          readonly named: boolean;
      }
    | {
          readonly kind: "columns";
          readonly latitude: string;
          readonly longitude: string;
          readonly lat: readonly unknown[];
          readonly lon: readonly unknown[];
      };

/** The location options as set: a column name, or null for "find it". */
export interface LocationChoice {
    readonly location: string | null;
    readonly latitude: string | null;
    readonly longitude: string | null;
}

/** Where the layout reads the locations, and what it found for itself. */
export interface ResolvedLocation {
    readonly source: LocationSource;
    /** The half of a latitude and longitude pair the layout found by name, when only the other was set. */
    readonly filled: "latitude" | "longitude" | null;
}

/** Why the layout cannot place anything: no location column, or a named one no node carries. */
export interface LocationRefusal {
    readonly code: "layout.needs-location";
    readonly params: {
        /** The role nothing fills: the whole location, or one half of a pair. */
        readonly missing: LocationRole;
        /** The node attributes the layout looked at. */
        readonly attributes: readonly string[];
    };
}

/** The least share of a column's values that must read for the layout to pick it unasked. */
export const MIN_DETECTED_SHARE = 0.5;

const LAT_NAMES = new Set(["lat", "latitude"]);
const LON_NAMES = new Set(["lon", "lng", "long", "longitude"]);

/**
 * Whether a value holds nothing.
 * @param value - The value.
 * @returns True for null, undefined and blank text.
 */
function isBlank(value: unknown): boolean {
    return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

/**
 * The share of a column's non-empty values one axis reads as an angle in range.
 * @param values - The values.
 * @param axis - Latitude or longitude.
 * @returns 0 to 1; 0 for a column with no values.
 */
export function angleShare(values: readonly unknown[], axis: "lat" | "lon"): number {
    let filled = 0;
    let read = 0;
    for (const value of values) {
        if (!isBlank(value)) {
            filled++;
            if (Number.isFinite(angleFromColumn(value, axis))) {
                read++;
            }
        }
    }

    return filled === 0 ? 0 : read / filled;
}

/**
 * The share of a column's values a location format reads, in the format that reads the most.
 * @param values - The values.
 * @returns 0 to 1.
 */
export function locationShare(values: readonly unknown[]): number {
    const found = detectLocationFormat(values);
    return found.format === null ? 0 : found.share;
}

/**
 * Finds the location among the nodes' attributes when no option names it: a latitude and a
 * longitude column by name, else the column a location format reads best, when it reads at
 * least half its values ({@link MIN_DETECTED_SHARE}).
 * @param columns - Each attribute's name and values, by row.
 * @returns The source, or null when nothing looks like a location.
 */
export function detectSource(columns: readonly ColumnValues[]): LocationSource | null {
    const lat = columns.find((c) => LAT_NAMES.has(c.name.toLowerCase()));
    const lon = columns.find((c) => LON_NAMES.has(c.name.toLowerCase()));
    if (lat !== undefined && lon !== undefined) {
        return { kind: "columns", latitude: lat.name, longitude: lon.name, lat: lat.values, lon: lon.values };
    }

    let best: { column: ColumnValues; share: number } | null = null;
    for (const column of columns) {
        const share = locationShare(column.values);
        if (share >= MIN_DETECTED_SHARE && share > (best?.share ?? 0)) {
            best = { column, share };
        }
    }

    return best === null
        ? null
        : { kind: "location", column: best.column.name, values: best.column.values, named: false };
}

/**
 * Where the layout reads the locations, from its options and the nodes' attributes.
 *
 * - Latitude and Longitude both set: those two columns.
 * - Only one of them set: the other is found by name (lat, latitude; lon, lng, long, longitude)
 *   and reported as `filled`; with no such column the layout refuses, naming the missing half.
 * - Location set: that column.
 * - None set: {@link detectSource}.
 *
 * A named column that no node carries is refused too.
 * @param choice - The options.
 * @param columns - The nodes' attributes, for finding what is unset.
 * @param read - The values of a named column, by row, or null when no node carries it.
 * @returns The source, or the refusal.
 */
export function resolveLocation(
    choice: LocationChoice,
    columns: readonly ColumnValues[],
    read: (name: string) => readonly unknown[] | null,
): ResolvedLocation | LocationRefusal {
    const attributes = columns.map((c) => c.name);
    const refuse = (missing: LocationRole): LocationRefusal => ({
        code: "layout.needs-location",
        params: { missing, attributes },
    });
    const carried = (name: string): readonly unknown[] | null => {
        const values = read(name);
        return values !== null && values.some((v) => !isBlank(v)) ? values : null;
    };

    const { latitude, longitude, location } = choice;
    if (latitude !== null || longitude !== null) {
        const latName = latitude ?? columns.find((c) => LAT_NAMES.has(c.name.toLowerCase()))?.name;
        const lonName = longitude ?? columns.find((c) => LON_NAMES.has(c.name.toLowerCase()))?.name;
        const lat = latName === undefined ? null : carried(latName);
        const lon = lonName === undefined ? null : carried(lonName);
        if (lat === null || latName === undefined) {
            return refuse("latitude");
        }

        if (lon === null || lonName === undefined) {
            return refuse("longitude");
        }

        let filled: ResolvedLocation["filled"] = null;
        if (latitude === null) {
            filled = "latitude";
        } else if (longitude === null) {
            filled = "longitude";
        }

        return { source: { kind: "columns", latitude: latName, longitude: lonName, lat, lon }, filled };
    }

    if (location !== null) {
        const values = carried(location);
        return values === null
            ? refuse("location")
            : { source: { kind: "location", column: location, values, named: true }, filled: null };
    }

    const found = detectSource(columns);
    return found === null ? refuse("location") : { source: found, filled: null };
}

/**
 * Whether an answer of {@link resolveLocation} is a refusal.
 * @param answer - The answer.
 * @returns True for a refusal.
 */
export function isLocationRefusal(answer: ResolvedLocation | LocationRefusal): answer is LocationRefusal {
    return "code" in answer;
}

/** How well one column fits one of the location roles. */
export interface ColumnFit {
    readonly name: string;
    /** The share of its values read in that role, 0 to 1. */
    readonly share: number;
    /** Whether it reads at least half its values ({@link MIN_DETECTED_SHARE}). */
    readonly fits: boolean;
}

/**
 * Every column's fit for a role, best first: the share of its values read as a latitude, a
 * longitude, or a whole location. Among the columns that fit, one named for the role comes first.
 * @param columns - The nodes' attributes.
 * @param role - The role.
 * @returns The fits, the fitting columns first (named for the role, then best share), then the rest
 *     in their order.
 */
export function columnFits(columns: readonly ColumnValues[], role: LocationRole): ColumnFit[] {
    // A column named for the role leads the ones that fit (a numeric code can read as latitudes).
    let names: ReadonlySet<string> = new Set<string>();
    if (role === "latitude") {
        names = LAT_NAMES;
    } else if (role === "longitude") {
        names = LON_NAMES;
    }

    const fits = columns.map((c) => {
        let share: number;
        if (role === "location") {
            share = locationShare(c.values);
        } else {
            share = angleShare(c.values, role === "latitude" ? "lat" : "lon");
        }

        return { name: c.name, share, fits: share >= MIN_DETECTED_SHARE };
    });
    const named = (f: ColumnFit): number => (names.has(f.name.toLowerCase()) ? 1 : 0);
    const good = fits.filter((f) => f.fits).sort((a, b) => named(b) - named(a) || b.share - a.share);
    return [...good, ...fits.filter((f) => !f.fits)];
}
