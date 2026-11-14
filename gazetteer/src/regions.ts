import data from "../data/regions.json";
import type { GazetteerLayerFile } from "./types";

/**
 * The region layer. Natural Earth 1:10m admin 1 states and provinces (public domain): about 4,600
 * first-level regions, by name, other names, postal and ISO 3166-2 codes.
 */
export const regions = data as GazetteerLayerFile;
