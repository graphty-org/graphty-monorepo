import CoordinateParser from "coordinate-parser";
import * as mgrsModule from "mgrs";
import ngeohash from "ngeohash";
import { toLatLon as utmToLatLon } from "utm";

import {
    checked,
    isEmpty,
    isLocationError,
    type LatLon,
    type LocationError,
    locationError,
    parseLatLon,
    readPair,
    toNumber,
} from "./parse-lat-lon.js";
import { decodePlusCode } from "./plus-code.js";

// mgrs ships UMD for Node, whose ESM import puts the functions under `default`, and an ES module
// for bundlers, which has no default export. Reflect.get reads either without a bundler warning.
const mgrs = (Reflect.get(mgrsModule, "default") as typeof mgrsModule | undefined) ?? mgrsModule;

/**
 * The location spellings {@link parseLocation} reads:
 * - `decimal`: "40.64, -73.78", [40.64, -73.78] or { lat, lon }, latitude first
 * - `lon-lat`: a decimal pair with longitude first, "-73.78, 40.64"
 * - `geojson`: a GeoJSON Point or a Feature holding one, as an object or JSON text
 * - `wkt`: "POINT(-73.78 40.64)", with optional Z/M and an EWKT "SRID=4326;" prefix
 * - `iso6709`: "+40.6398-073.7789/", also in degrees and minutes or degrees, minutes and seconds
 * - `dms`: degrees, minutes, seconds with hemispheres, "40 38 23 N, 73 46 44 W", "40deg38'23"N ..."
 * - `geohash`: "dr5x1n7", decoded to the cell's center
 * - `plus-code`: a full Open Location Code, "87G8Q2PQ+6V"
 * - `mgrs`: "18TWL8573807587", decoded to the square's center
 * - `utm`: "18T 585738 4507587" (zone, latitude band, easting, northing in meters)
 */
export type LocationFormat =
    "decimal" | "lon-lat" | "geojson" | "wkt" | "iso6709" | "dms" | "geohash" | "plus-code" | "mgrs" | "utm";

/** Every format, in the order `auto` tries them. */
export const LOCATION_FORMATS: readonly LocationFormat[] = [
    "decimal",
    "lon-lat",
    "geojson",
    "wkt",
    "iso6709",
    "plus-code",
    "mgrs",
    "utm",
    "geohash",
    "dms",
];

const NUM = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?`;
const WKT = new RegExp(
    String.raw`^\s*(?:SRID=\d+\s*;\s*)?POINT\s*(?:ZM|Z|M)?\s*\(\s*(${NUM})\s+(${NUM})(?:\s+${NUM}){0,2}\s*\)\s*$`,
    "i",
);
const ISO =
    /^([+-])(\d{2}(?:\d{2}){0,2})(\.\d+)?([+-])(\d{3}(?:\d{2}){0,2})(\.\d+)?(?:[+-]\d+(?:\.\d+)?)?(?:CRS[\w:.]+)?\/?$/;
const GEOHASH = /^[0-9b-hjkmnp-z]{1,12}$/i;
const DMS_SHAPE = /[NSEW\s,;\u00b0'"\u2032\u2033]|deg/i;
const MGRS = /^\d{1,2}[C-HJ-NP-X][A-HJ-NP-Z]{2}(?:\d\d){0,5}$/i;

/**
 * Reads "18T 585738 4507587": a zone of one or two digits, a latitude band, then easting and
 * northing in meters, each optionally followed by "m" and its "E" or "N", with an optional comma
 * or semicolon between them. A scanner of single tokens rather than one regex, so the many ways
 * to share out whitespace between optional parts cannot make it backtrack.
 * @param text - The text.
 * @returns Zone, band, easting and northing, or null when the text is not that shape.
 */
function readUtm(text: string): { zone: number; band: string; easting: number; northing: number } | null {
    let at = 0;
    const take = (token: RegExp): string | null => {
        token.lastIndex = at;
        const match = token.exec(text);
        if (match === null) {
            return null;
        }
        at = token.lastIndex;
        return match[0];
    };
    const space = (): number => take(/\s*/y)?.length ?? 0;
    space();
    const zone = take(/\d{1,2}/y);
    space();
    const band = take(/[C-HJ-NP-X]/iy);
    if (zone === null || band === null || space() === 0) {
        return null;
    }
    const easting = take(/\d+(?:\.\d+)?/y);
    let gap = space();
    for (const optional of [/m/iy, /e/iy, /[,;]/y]) {
        if (take(optional) !== null) {
            gap = space();
        }
    }
    const northing = gap === 0 ? null : take(/\d+(?:\.\d+)?/y);
    if (easting === null || northing === null) {
        return null;
    }
    space();
    for (const optional of [/m/iy, /n/iy]) {
        if (take(optional) !== null) {
            space();
        }
    }
    return at === text.length
        ? { zone: Number(zone), band, easting: Number(easting), northing: Number(northing) }
        : null;
}

/**
 * ISO 6709 degrees from a sign, integer digits (degrees, then minutes and seconds) and a fraction.
 * @param sign - "+" or "-".
 * @param digits - Degrees, then two digits each of minutes and seconds if given.
 * @param fraction - The decimal fraction of the last unit, with its point.
 * @param degreeDigits - 2 for latitude, 3 for longitude.
 * @returns The angle in degrees, or NaN for minutes or seconds of 60 or more.
 */
function isoAngle(sign: string, digits: string, fraction: string | undefined, degreeDigits: number): number {
    const parts = [
        digits.slice(0, degreeDigits),
        digits.slice(degreeDigits, degreeDigits + 2),
        digits.slice(degreeDigits + 2),
    ];
    const filled = parts.filter((p) => p !== "");
    filled[filled.length - 1] += fraction ?? "";
    const [d, m = 0, s = 0] = filled.map(Number);
    if (m >= 60 || s >= 60) {
        return Number.NaN;
    }
    return (sign === "-" ? -1 : 1) * (d + m / 60 + s / 3600);
}

function geojson(value: unknown): LatLon | LocationError {
    let object: unknown = value;
    if (typeof value === "string") {
        try {
            object = JSON.parse(value);
        } catch {
            return locationError("syntax", value);
        }
    }
    const record = object as { type?: unknown; coordinates?: unknown; geometry?: unknown } | null;
    const point = record?.type === "Feature" ? (record.geometry as typeof record) : record;
    const coordinates = point?.type === "Point" ? point.coordinates : undefined;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
        return locationError("syntax", value);
    }
    return checked(toNumber(coordinates[1]), toNumber(coordinates[0]), value);
}

/**
 * Collapses every run of whitespace to one space, so a pattern's adjacent `\s*` and `\s+` cannot
 * backtrack over a long run. No pattern here needs two whitespace characters in a row.
 * @param text - The text.
 * @returns The text with single spaces.
 */
function singleSpaced(text: string): string {
    return text.trim().split(/\s+/).join(" ");
}

function fromString(value: unknown, read: (text: string) => LatLon | LocationError): LatLon | LocationError {
    return typeof value === "string" ? read(value.trim()) : locationError("syntax", value);
}

const PARSERS: Record<LocationFormat, (value: unknown) => LatLon | LocationError> = {
    decimal: parseLatLon,
    "lon-lat": (value) => {
        const pair = readPair(value);
        return pair ? checked(pair[1], pair[0], value) : locationError("syntax", value);
    },
    geojson,
    wkt: (value) =>
        fromString(value, (text) => {
            const match = WKT.exec(text);
            return match ? checked(Number(match[2]), Number(match[1]), value) : locationError("syntax", value);
        }),
    iso6709: (value) =>
        fromString(value, (text) => {
            const m = ISO.exec(text);
            return m
                ? checked(isoAngle(m[1], m[2], m[3], 2), isoAngle(m[4], m[5], m[6], 3), value)
                : locationError("syntax", value);
        }),
    dms: (value) =>
        fromString(value, (text) => {
            // A coordinate has a hemisphere, a degree, minute or second mark, or a space or comma
            // between its parts; digits joined by a dash ("555-0101", a phone number) have none,
            // and the lenient reader below would take them for 5 55' N, 101 W.
            if (!DMS_SHAPE.test(text)) {
                return locationError("syntax", value);
            }
            try {
                const parsed = new CoordinateParser(text.replaceAll(/deg/gi, "°"));
                return checked(parsed.getLatitude(), parsed.getLongitude(), value);
            } catch {
                return locationError("syntax", value);
            }
        }),
    geohash: (value) =>
        fromString(value, (text) => {
            if (!GEOHASH.test(text)) {
                return locationError("syntax", value);
            }
            const { latitude, longitude } = ngeohash.decode(text.toLowerCase());
            return checked(latitude, longitude, value);
        }),
    "plus-code": (value) =>
        fromString(value, (text) => {
            const point = decodePlusCode(text);
            if (point === "short") {
                return locationError("short-code", value);
            }
            return point ? checked(point.lat, point.lon, value) : locationError("syntax", value);
        }),
    mgrs: (value) =>
        fromString(value, (text) => {
            const compact = text.replaceAll(/\s+/g, "");
            if (!MGRS.test(compact)) {
                return locationError("syntax", value);
            }
            try {
                const [lon, lat] = mgrs.toPoint(compact.toUpperCase());
                return checked(lat, lon, value);
            } catch {
                return locationError("syntax", value);
            }
        }),
    utm: (value) =>
        fromString(value, (text) => {
            const utm = readUtm(text);
            if (!utm || utm.zone < 1 || utm.zone > 60) {
                return locationError("syntax", value);
            }
            try {
                const { latitude, longitude } = utmToLatLon(
                    utm.easting,
                    utm.northing,
                    utm.zone,
                    utm.band.toUpperCase(),
                );
                return checked(latitude, longitude, value);
            } catch {
                return locationError("range", value);
            }
        }),
};

/**
 * Reads a location written in one of {@link LOCATION_FORMATS}. It never throws.
 *
 * With `auto` (the default) each value is tried in every format in {@link LOCATION_FORMATS}
 * order except two that need a whole column to judge: `lon-lat` (a lone pair is read latitude
 * first) and `geohash` (which also matches short words). To read a column consistently, those
 * included, pick its format once with {@link detectLocationFormat}.
 * @param value - The value: a string, a [lat, lon] array, a { lat, lon } object or a GeoJSON object.
 * @param format - The format, or `auto`.
 * @returns The point in degrees, or `{ code, params: { value } }`.
 */
export function parseLocation(value: unknown, format: LocationFormat | "auto" = "auto"): LatLon | LocationError {
    if (isEmpty(value)) {
        return locationError("empty", value);
    }
    if (format !== "auto") {
        return PARSERS[format](value);
    }
    let best: LocationError = locationError("syntax", value);
    for (const f of LOCATION_FORMATS) {
        if (f === "geohash" || f === "lon-lat") {
            continue;
        }
        const result = PARSERS[f](value);
        if (!isLocationError(result)) {
            return result;
        }
        if (result.code !== "syntax") {
            best = result; // a value that was the right shape but out of range says so
        }
    }
    return best;
}

/** A number with an optional hemisphere letter before or after it, and a decimal point or comma. */
const HEMISPHERE_NUMBER = /^([NSEW])? ?([+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)) ?\u00b0? ?([NSEW])?$/i; // matched only against singleSpaced text

/**
 * Reads one angle of a latitude or longitude column: a number, or text holding a number with an
 * optional hemisphere letter before or after it ("51.5074 N", "W 0.1278"; S and W are negative)
 * and a decimal point or a decimal comma ("48,8566").
 * @param value - The value.
 * @param axis - Which angle: a latitude takes N or S, a longitude E or W.
 * @returns The angle in degrees, or NaN.
 */
function angleOf(value: unknown, axis: "lat" | "lon"): number {
    if (typeof value === "number") {
        return value;
    }
    const match = typeof value === "string" ? HEMISPHERE_NUMBER.exec(singleSpaced(value)) : null;
    if (match === null) {
        return Number.NaN;
    }
    // A group that did not take part is undefined at run time, whatever the regex typing says.
    const [, before, digits, after] = match as (string | undefined)[];
    if (before !== undefined && after !== undefined) {
        return Number.NaN;
    }
    const letter = (before ?? after)?.toUpperCase();
    const number = Number((digits ?? "").replace(",", "."));
    if (letter === undefined) {
        return number;
    }
    if (!(axis === "lat" ? "NS" : "EW").includes(letter)) {
        return Number.NaN;
    }
    return letter === "S" || letter === "W" ? -Math.abs(number) : Math.abs(number);
}

/**
 * Reads separate latitude and longitude values: numbers, or text holding a number with an
 * optional hemisphere letter ("51.5074 N", "0.1278 W") and a decimal point or comma ("48,8566").
 * @param lat - The latitude.
 * @param lon - The longitude.
 * @returns The point, or an error whose `value` is `[lat, lon]`.
 */
export function latLonFromColumns(lat: unknown, lon: unknown): LatLon | LocationError {
    const value = [lat, lon];
    if (isEmpty(lat) || isEmpty(lon)) {
        return locationError("empty", value);
    }
    return checked(angleOf(lat, "lat"), angleOf(lon, "lon"), value);
}

/**
 * Reads one angle of a separate latitude or longitude column, as {@link latLonFromColumns} does.
 * @param value - The value.
 * @param axis - `lat` or `lon`.
 * @returns The angle, or NaN when the value is empty or not an angle of that axis in range.
 */
export function angleFromColumn(value: unknown, axis: "lat" | "lon"): number {
    const angle = isEmpty(value) ? Number.NaN : angleOf(value, axis);
    const limit = axis === "lat" ? 90 : 180;
    return Math.abs(angle) <= limit ? angle : Number.NaN;
}

/**
 * The formats a single value can be retried in when its column's format does not read it: their
 * spelling cannot be mistaken for another format's. Geohash is never among them, since words and
 * ids read as geohashes one value at a time.
 */
const UNAMBIGUOUS: readonly LocationFormat[] = ["decimal", "dms", "wkt", "geojson", "iso6709"];

/**
 * Reads one value of a column whose format was picked for the whole column (by
 * {@link detectLocationFormat}): in that format, and when that fails for its syntax, in the
 * formats whose spelling cannot be mistaken (a decimal pair, degrees-minutes-seconds, WKT, GeoJSON
 * and ISO 6709), so a column mixing spellings loses no row. Geohash is never tried per value, and
 * a longitude-first column never retries a pair latitude first.
 * @param value - The value.
 * @param format - The column's format.
 * @returns The point, or the error: a range error from any reading wins over a syntax one.
 */
export function parseColumnValue(value: unknown, format: LocationFormat): LatLon | LocationError {
    const first = parseLocation(value, format);
    if (!isLocationError(first) || first.code !== "syntax") {
        return first;
    }
    let best = first;
    for (const retry of UNAMBIGUOUS) {
        if (retry === format || (retry === "decimal" && format === "lon-lat")) {
            continue;
        }
        const result = PARSERS[retry](value);
        if (!isLocationError(result)) {
            return result;
        }
        if (result.code !== "syntax") {
            best = result;
        }
    }
    return best;
}

/**
 * Whether a column can be geohashes: every value is text of one length, at least five
 * characters, in the geohash alphabet, with a letter in it. ZIP codes (digits only) and words
 * (lengths vary) are not.
 * @param sample - The column's non-empty values.
 * @returns True when the column may be read as geohashes.
 */
function geohashColumn(sample: readonly unknown[]): boolean {
    const length = typeof sample[0] === "string" ? sample[0].trim().length : 0;
    return (
        length >= 5 &&
        sample.every(
            (v) => typeof v === "string" && v.trim().length === length && GEOHASH.test(v.trim()) && /[a-z]/i.test(v),
        )
    );
}

/** What {@link detectLocationFormat} found. */
export interface FormatDetection {
    /** The format that read the most values, or null when none read any. */
    format: LocationFormat | null;
    /** Share of the non-empty sample the format read, 0 to 1. */
    share: number;
    /** Non-empty values sampled. */
    sampled: number;
    /** Other formats that read as many values (within 5%), most first. */
    alternatives: LocationFormat[];
}

/**
 * Picks one format for a column of values, so a column is read the same way throughout. It
 * samples up to `limit` non-empty values and scores each format by the share it reads in range.
 * Ties go to the earlier format in {@link LOCATION_FORMATS}, so a decimal pair reads latitude
 * first unless only longitude first fits (then the result is `lon-lat`); when longitude first
 * reads as many values, `lon-lat` is listed among the alternatives. Geohash is scored only for a
 * column whose values all share one length of at least five characters and contain letters.
 * @param values - The column's values.
 * @param limit - The most values sampled. Default 200.
 * @returns The format, its share and close alternatives.
 */
export function detectLocationFormat(values: Iterable<unknown>, limit = 200): FormatDetection {
    const sample: unknown[] = [];
    for (const v of values) {
        if (!isEmpty(v)) {
            sample.push(v);
            if (sample.length >= limit) {
                break;
            }
        }
    }
    const geohash = geohashColumn(sample);
    const scores = LOCATION_FORMATS.map((format) => ({
        format,
        hits: format === "geohash" && !geohash ? 0 : sample.filter((v) => !isLocationError(PARSERS[format](v))).length,
    })).sort((a, b) => b.hits - a.hits); // stable: ties keep LOCATION_FORMATS order
    const [top] = scores;
    if (sample.length === 0 || top.hits === 0) {
        return { format: null, share: 0, sampled: sample.length, alternatives: [] };
    }
    const close = (s: { hits: number }): boolean => s.hits > 0 && top.hits - s.hits <= sample.length * 0.05;
    // The DMS reader is lenient (it takes decimals and ISO 6709 too): an expected tie, not an
    // ambiguity. A decimal pair that reads as well longitude first is one: European capitals
    // written longitude first read as places in Africa.
    const pair = top.format === "decimal" || top.format === "lon-lat";
    const expected = (s: { format: LocationFormat; hits: number }): boolean =>
        s.format === "dms" || (pair && s.format === "decimal") || (pair && s.format === "lon-lat" && s.hits < top.hits);
    return {
        format: top.format,
        share: top.hits / sample.length,
        sampled: sample.length,
        alternatives: scores
            .slice(1)
            .filter((s) => close(s) && !expected(s))
            .map((s) => s.format),
    };
}
