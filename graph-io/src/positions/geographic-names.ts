/**
 * The names graph-io reads as latitude, longitude and altitude columns (any case): `lat` and `latitude`; `lon`, `lng`
 * and `longitude` (`long` is not read, it is as often a length); `alt` and `altitude`.
 */

/** The axis each recognized column name reads as, by its lower-case spelling. */
export const GEOGRAPHIC_AXES: Readonly<Partial<Record<string, "lat" | "lon" | "alt">>> = {
    lat: "lat",
    latitude: "lat",
    lon: "lon",
    lng: "lon",
    longitude: "lon",
    alt: "alt",
    altitude: "alt",
};

/** The latitude, longitude and altitude columns {@link geographicColumnNames} found. */
export interface GeographicColumnNames {
    readonly latitude: string;
    readonly longitude: string;
    /** The altitude column, or null when there is none. */
    readonly altitude: string | null;
}

/**
 * The latitude and longitude columns among some column names, by the name rule graph-io's CSV and JSON importers
 * read a geographic position column with: exactly one name of each axis (two, such as `lat` and `latitude`, are
 * ambiguous and read as none). It looks at names only; the values are the caller's to check.
 * @param names - the column (or attribute) names
 * @returns the names found, or null when there is no single latitude and longitude pair
 */
export function geographicColumnNames(names: Iterable<string>): GeographicColumnNames | null {
    const found = { lat: [] as string[], lon: [] as string[], alt: [] as string[] };
    for (const name of new Set(names)) {
        const axis = GEOGRAPHIC_AXES[name.toLowerCase()];
        if (axis !== undefined) {
            found[axis].push(name);
        }
    }
    if (found.lat.length !== 1 || found.lon.length !== 1) {
        return null;
    }
    return { latitude: found.lat[0], longitude: found.lon[0], altitude: found.alt.length === 1 ? found.alt[0] : null };
}
