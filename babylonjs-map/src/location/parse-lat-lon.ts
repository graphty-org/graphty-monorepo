/** A point in WGS 84 degrees. */
export interface LatLon {
    lat: number;
    lon: number;
}

/**
 * Why a value could not be read as a location:
 * - `empty`: nothing to read (null, undefined, an empty or blank string)
 * - `syntax`: not in the format asked for (or, for `auto`, in any format)
 * - `range`: latitude outside -90..90 or longitude outside -180..180
 * - `short-code`: a short plus code, which needs a reference place to decode
 */
export type LocationErrorCode = "empty" | "syntax" | "range" | "short-code";

/** A neutral error: a code and the value it was about. Applications write the words. */
export interface LocationError {
    code: LocationErrorCode;
    params: { value: unknown };
}

const DECIMAL = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)`;
const PAIR = new RegExp(String.raw`^\s*(${DECIMAL})\s*[,;\s]\s*(${DECIMAL})\s*$`);
const NUMBER = new RegExp(String.raw`^\s*${DECIMAL}\s*$`);

/**
 * Makes a `{ code, params }` error.
 * @param code - The reason.
 * @param value - The value it is about.
 * @returns The error.
 */
export function locationError(code: LocationErrorCode, value: unknown): LocationError {
    return { code, params: { value } };
}

/**
 * Reads a number from a number or a decimal string.
 * @param value - The value.
 * @returns The number, or NaN.
 */
export function toNumber(value: unknown): number {
    if (typeof value === "number") {
        return value;
    }
    return typeof value === "string" && NUMBER.test(value) ? Number(value) : Number.NaN;
}

/**
 * Checks a latitude and longitude read from `value`.
 * @param lat - Latitude in degrees.
 * @param lon - Longitude in degrees.
 * @param value - The value they were read from.
 * @returns The point, or a `syntax` or `range` error.
 */
export function checked(lat: number, lon: number, value: unknown): LatLon | LocationError {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return locationError("syntax", value);
    }
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        return locationError("range", value);
    }
    return { lat, lon };
}

/**
 * Whether a value holds nothing to read.
 * @param value - The value.
 * @returns True for null, undefined and blank strings.
 */
export function isEmpty(value: unknown): boolean {
    return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

/**
 * The two numbers of a decimal pair, in the order written: a "a, b" string or an [a, b] array.
 * @param value - The value.
 * @returns The numbers, or null when the value is not a pair.
 */
export function readPair(value: unknown): [number, number] | null {
    if (typeof value === "string") {
        const match = PAIR.exec(value);
        return match ? [Number(match[1]), Number(match[2])] : null;
    }
    if (Array.isArray(value) && value.length === 2 && value.every((v) => typeof v === "number")) {
        return [value[0], value[1]];
    }
    return null;
}

const LAT_KEYS = ["lat", "latitude"];
const LON_KEYS = ["lon", "lng", "long", "longitude"];

/**
 * Reads a decimal latitude and longitude, latitude first: a "lat, lon" string (comma, semicolon
 * or space between them), a [lat, lon] array of numbers, or an object with `lat`/`latitude` and
 * `lon`/`lng`/`long`/`longitude` keys.
 * @param value - The value to read.
 * @returns The point in degrees, or a `{ code, params }` error.
 */
export function parseLatLon(value: unknown): LatLon | LocationError {
    if (isEmpty(value)) {
        return locationError("empty", value);
    }
    const pair = readPair(value);
    if (pair) {
        return checked(pair[0], pair[1], value);
    }
    if (typeof value === "object" && !Array.isArray(value)) {
        const record = value as Record<string, unknown>;
        const lat = LAT_KEYS.find((k) => k in record);
        const lon = LON_KEYS.find((k) => k in record);
        if (lat && lon) {
            return checked(toNumber(record[lat]), toNumber(record[lon]), value);
        }
    }
    return locationError("syntax", value);
}

/**
 * Whether a parse result is an error.
 * @param result - A result of {@link parseLatLon} or `parseLocation`.
 * @returns True for a `{ code, params }` error.
 */
export function isLocationError(result: LatLon | LocationError): result is LocationError {
    return "code" in result;
}
