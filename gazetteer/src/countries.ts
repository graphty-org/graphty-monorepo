import data from "../data/countries.json";
import type { GazetteerLayerFile } from "./types";

/**
 * The country layer. Natural Earth 1:10m admin 0 countries (public domain): 245 countries and
 * territories, by name, other names and ISO codes.
 */
export const countries = data as GazetteerLayerFile;
