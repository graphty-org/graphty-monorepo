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

import {
    type Gazetteer,
    hasLayers,
    PLACE_ROLES,
    type PlaceReading,
    type PlaceRole,
    placeShare,
    readPlaces,
} from "./gazetteer";

/** One attribute of the nodes: its name and its values, by row. */
export interface ColumnValues {
    readonly name: string;
    readonly values: readonly unknown[];
}

/** The three location options of the layout, as roles a column can play. */
export type LocationRole = "latitude" | "longitude" | "location";

/**
 * How the designated location is read (`data.knownFields.nodeLocationRole`): `auto` reads
 * coordinates first, then place names; `coords` only coordinates; `country`, `region` and `city`
 * read place names of that kind; `none` reads nothing and finds nothing.
 */
export type LocationRoleSetting = "auto" | "coords" | PlaceRole | "none";

/** What narrows a place name: a column of values by row, or a fixed country code. */
export type PlaceWithinSource =
    { readonly column: string; readonly values: readonly unknown[] } | { readonly code: string } | null;

/** A column of place names, read through the gazetteer. */
export interface PlaceSource {
    readonly kind: "place";
    readonly column: string;
    readonly values: readonly unknown[];
    /** The kind of place, or auto for the kind most of its values name. */
    readonly role: PlaceRole | "auto";
    readonly within: PlaceWithinSource;
    /** False when the column was found by its name or values. */
    readonly named: boolean;
}

/**
 * Where the locations come from: one column holding whole locations, two numeric columns, or a
 * column of place names.
 */
export type LocationSource =
    | PlaceSource
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

/** A source of coordinates: a location column or a latitude and longitude pair. */
export type CoordinateSource = Exclude<LocationSource, PlaceSource>;

/** The location options as set: a column name, or null for "find it". */
export interface LocationChoice {
    readonly location: string | null;
    readonly latitude: string | null;
    readonly longitude: string | null;
    /** How the location column is read; auto when absent. */
    readonly role?: LocationRoleSetting;
    /** The column that narrows a place name, or null to find one. */
    readonly within?: string | null;
    /** A fixed country code that narrows every place name. */
    readonly withinCode?: string | null;
}

/** The designation `data.knownFields` holds. */
export interface LocationDesignation {
    readonly nodeLocationPath?: string | null;
    readonly nodeLatitudePath?: string | null;
    readonly nodeLongitudePath?: string | null;
    readonly nodeLocationRole?: LocationRoleSetting | null;
    readonly nodeLocationWithinPath?: string | null;
    readonly nodeLocationWithin?: string | null;
}

/**
 * The columns the layout reads: its own options when they name any, else the designated ones.
 * @param options - The layout's options.
 * @param designated - `data.knownFields`, or undefined with none.
 * @returns The choice.
 */
export function chosenLocation(options: LocationChoice, designated: LocationDesignation | undefined): LocationChoice {
    const role = designated?.nodeLocationRole ?? "auto";
    const place = {
        role,
        within: designated?.nodeLocationWithinPath ?? null,
        withinCode: designated?.nodeLocationWithin ?? null,
    };
    if (options.location !== null || options.latitude !== null || options.longitude !== null) {
        return { ...options, ...place };
    }

    // The reader removed the field: nothing designated is read and nothing is found.
    if (role === "none") {
        return { location: null, latitude: null, longitude: null, ...place };
    }

    return {
        location: designated?.nodeLocationPath ?? null,
        latitude: designated?.nodeLatitudePath ?? null,
        longitude: designated?.nodeLongitudePath ?? null,
        ...place,
    };
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
/** The column names each kind of place is found by. */
const PLACE_NAMES: Readonly<Record<PlaceRole, ReadonlySet<string>>> = {
    country: new Set(["country", "iso2", "iso3"]),
    region: new Set(["state", "province", "region"]),
    city: new Set(["city", "town"]),
};

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
 * least half its values ({@link MIN_DETECTED_SHARE}), else a column of place names.
 * @param columns - Each attribute's name and values, by row.
 * @param places - The gazetteer layers at hand, for finding place columns by their values;
 *     false to find no place column.
 * @param role - The kind of location to look for (`data.knownFields.nodeLocationRole`).
 * @returns The source, or null when nothing looks like a location.
 */
export function detectSource(
    columns: readonly ColumnValues[],
    places: Gazetteer | false = {},
    role: LocationRoleSetting = "auto",
): LocationSource | null {
    if (role === "none") {
        return null;
    }

    if (role === "auto" || role === "coords") {
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

        if (best !== null) {
            return { kind: "location", column: best.column.name, values: best.column.values, named: false };
        }
    }

    if (places === false || role === "coords") {
        return null;
    }

    const found = placeColumns(columns, places);
    const wanted = role === "auto" ? (["city", "region", "country"] as const) : [role];
    const kind = wanted.find((each) => found[each] !== undefined);
    if (kind === undefined) {
        return null;
    }

    const column = found[kind] as ColumnValues;
    return {
        kind: "place",
        column: column.name,
        values: column.values,
        role: kind,
        within: narrowingColumn(found, kind),
        named: false,
    };
}

/**
 * The place columns among the attributes, one per kind: by name (country, iso2, iso3; state,
 * province, region; city, town), else by their values, when a gazetteer layer knows at least half
 * of them ({@link MIN_DETECTED_SHARE}), in the kind that knows the most, the coarser on a tie.
 * @param columns - The attributes.
 * @param places - The gazetteer layers at hand.
 * @returns The column of each kind found.
 */
function placeColumns(columns: readonly ColumnValues[], places: Gazetteer): Partial<Record<PlaceRole, ColumnValues>> {
    const found: Partial<Record<PlaceRole, ColumnValues>> = {};
    for (const kind of PLACE_ROLES) {
        found[kind] = columns.find((c) => PLACE_NAMES[kind].has(c.name.toLowerCase()));
    }

    const taken = new Set(Object.values(found).map((c) => c?.name));
    for (const column of columns) {
        if (taken.has(column.name)) {
            continue;
        }

        let best: { kind: PlaceRole; share: number } | null = null;
        for (const kind of PLACE_ROLES) {
            const layer = places[kind];
            const share = layer === undefined || found[kind] !== undefined ? 0 : placeShare(column.values, layer);
            if (share >= MIN_DETECTED_SHARE && share > (best?.share ?? 0)) {
                best = { kind, share };
            }
        }

        if (best !== null) {
            found[best.kind] = column;
            taken.add(column.name);
        }
    }

    return found;
}

/**
 * The column that narrows a place column of one kind: a city by its country, else its region; a
 * region by its country.
 * @param found - The place columns found.
 * @param kind - The kind narrowed.
 * @returns The narrowing column, or null.
 */
function narrowingColumn(found: Partial<Record<PlaceRole, ColumnValues>>, kind: PlaceRole | "auto"): PlaceWithinSource {
    const by = kind === "country" ? undefined : (found.country ?? (kind === "region" ? undefined : found.region));
    return by === undefined ? null : { column: by.name, values: by.values };
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
 * A named column that no node carries is refused too. The Location column is read as `role`
 * says: under `auto`, as coordinates when half its values read as one, else as place names; under
 * `country`, `region` or `city`, as place names, narrowed by the `within` column or code, else by
 * a country or region column found by name. With `places` false, place names are never read.
 * @param choice - The options.
 * @param columns - The nodes' attributes, for finding what is unset.
 * @param read - The values of a named column, by row, or null when no node carries it.
 * @param places - The gazetteer layers at hand (for finding place columns by their values), or
 *     false when place names are not read.
 * @returns The source, or the refusal.
 */
export function resolveLocation(
    choice: LocationChoice,
    columns: readonly ColumnValues[],
    read: (name: string) => readonly unknown[] | null,
    places: Gazetteer | false = {},
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

    const role = choice.role ?? "auto";
    if (location !== null) {
        const values = carried(location);
        if (values === null) {
            return refuse("location");
        }

        const asPlace =
            role !== "coords" && role !== "none" && (role !== "auto" || locationShare(values) < MIN_DETECTED_SHARE);
        if (!asPlace || places === false) {
            return { source: { kind: "location", column: location, values, named: true }, filled: null };
        }

        const others = columns.filter((c) => c.name !== location);
        const within = designatedWithin(choice, carried) ?? narrowingColumn(placeColumns(others, {}), role);
        return { source: { kind: "place", column: location, values, role, within, named: true }, filled: null };
    }

    const found = detectSource(columns, places, role);
    if (found?.kind === "place") {
        return { source: { ...found, within: designatedWithin(choice, carried) ?? found.within }, filled: null };
    }

    return found === null ? refuse("location") : { source: found, filled: null };
}

/**
 * The narrowing the reader designated: a column (`nodeLocationWithinPath`) some node carries, else
 * a fixed country code (`nodeLocationWithin`).
 * @param choice - The choice.
 * @param carried - The values of a column, or null when no node carries it.
 * @returns The narrowing, or null when none is designated.
 */
function designatedWithin(
    choice: LocationChoice,
    carried: (name: string) => readonly unknown[] | null,
): PlaceWithinSource {
    const column = choice.within ?? null;
    const values = column === null ? null : carried(column);
    if (column !== null && values !== null) {
        return { column, values };
    }

    const code = choice.withinCode ?? "";
    return code === "" ? null : { code };
}

/**
 * Read a place column through the gazetteer.
 * @param source - The place column.
 * @param gazetteer - The layers; those the role needs must be here.
 * @returns The reading, or null when a layer it needs is not here yet.
 */
export function readPlaceSource(source: PlaceSource, gazetteer: Gazetteer): PlaceReading | null {
    if (!hasLayers(gazetteer, source.role)) {
        return null;
    }

    let within: readonly unknown[] | string | null = null;
    if (source.within !== null) {
        within = "code" in source.within ? source.within.code : source.within.values;
    }

    return readPlaces(source.values, source.role, within, gazetteer);
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
