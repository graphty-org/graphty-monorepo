/**
 * The gazetteer: place names with coordinates, offline. Three layers, each its own module so a
 * consumer loads only what it uses: countries and regions from Natural Earth (public domain), cities
 * from GeoNames (CC BY 4.0, credit GeoNames).
 */

import type { GazetteerLayerFile, PlaceRole } from "./types";

export type { GazetteerLayerFile, GazetteerPlace, PlaceCredit, PlaceRole } from "./types";

/**
 * Load one layer, on first use (each layer is a separate module, fetched by the bundler's code
 * splitting or read from disk in Node).
 * @param role - The layer: `"country"`, `"region"` or `"city"`.
 * @returns The layer.
 */
export async function loadLayer(role: PlaceRole): Promise<GazetteerLayerFile> {
    switch (role) {
        case "country":
            return (await import("./countries")).countries;
        case "region":
            return (await import("./regions")).regions;
        case "city":
            return (await import("./cities")).cities;
        default:
            throw new TypeError(`unknown gazetteer layer: ${String(role)}`);
    }
}
