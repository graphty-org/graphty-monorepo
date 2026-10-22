/** A point in WGS 84 degrees. */
export interface LatLon {
    lat: number;
    lon: number;
}

/**
 * Why a value could not be read as a location:
 * - `empty`: nothing to read (null, undefined, an empty or blank string)
 * - `syntax`: not a "lat, lon" string or a [lat, lon] pair of finite numbers
 * - `range`: latitude outside -90..90 or longitude outside -180..180
 */
export type LocationErrorCode = "empty" | "syntax" | "range";

/** A neutral error: a code and the value it was about. Applications write the words. */
export interface LocationError {
    code: LocationErrorCode;
    params: { value: unknown };
}

const DECIMAL = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)`;
const PAIR = new RegExp(String.raw`^\s*(${DECIMAL})\s*[,;\s]\s*(${DECIMAL})\s*$`);

/**
 * Reads a decimal latitude and longitude, latitude first, from a "lat, lon" string (comma,
 * semicolon or space between them) or a [lat, lon] array of numbers.
 * @param value - The value to read.
 * @returns The point in degrees, or a `{ code, params }` error.
 */
export function parseLatLon(value: unknown): LatLon | LocationError {
    const fail = (code: LocationErrorCode): LocationError => ({ code, params: { value } });
    let lat: number;
    let lon: number;
    if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
        return fail("empty");
    }
    if (typeof value === "string") {
        const match = PAIR.exec(value);
        if (!match) {
            return fail("syntax");
        }
        lat = Number(match[1]);
        lon = Number(match[2]);
    } else if (Array.isArray(value) && value.length === 2 && value.every((v) => typeof v === "number")) {
        [lat, lon] = value as [number, number];
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            return fail("syntax");
        }
    } else {
        return fail("syntax");
    }
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        return fail("range");
    }
    return { lat, lon };
}

/**
 * Whether a {@link parseLatLon} result is an error.
 * @param result - A result of {@link parseLatLon}.
 * @returns True for a `{ code, params }` error.
 */
export function isLocationError(result: LatLon | LocationError): result is LocationError {
    return "code" in result;
}
