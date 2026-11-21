import data from "../data/cities.json";
import type { GazetteerLayerFile } from "./types";

/**
 * The city layer. GeoNames cities15000 (CC BY 4.0; credit GeoNames): about 34,000 cities of 15,000
 * people or more, by name and Latin-script other names.
 */
export const cities = data as GazetteerLayerFile;
