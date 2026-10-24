/**
 * The small datasets straight from their repository copy (data/<name>.ts), as the typed arrays the
 * converter recorded: the fixtures the dataset tests check, with no download.
 */

import { buildDataset, type DatasetData } from "../../data/build.js";
import { DATA as celegansNeuralData } from "../../data/celegans-neural.js";
import { DATA as contiguousUsaData } from "../../data/contiguous-usa.js";
import { DATA as davisSouthernWomenData } from "../../data/davis-southern-women.js";
import { DATA as dolphinsData } from "../../data/dolphins.js";
import { DATA as florentineFamiliesData } from "../../data/florentine-families.js";
import { DATA as footballData } from "../../data/football.js";
import { DATA as goSlimGenericData } from "../../data/go-slim-generic.js";
import { DATA as karateData } from "../../data/karate.js";
import { DATA as knuthMilesData } from "../../data/knuth-miles.js";
import { DATA as lesMiserablesData } from "../../data/les-miserables.js";
import { DATA as openflightsData } from "../../data/openflights.js";
import { DATA as politicalBlogsData } from "../../data/political-blogs.js";
import { DATA as politicalBooksData } from "../../data/political-books.js";
import { DATA as stelzlInteractomeData } from "../../data/stelzl-interactome.js";
import { DATA as veniceTransitData } from "../../data/venice-transit.js";
import { DATA as wikipathwaysSenescenceAutophagyData } from "../../data/wikipathways-senescence-autophagy.js";
import { DATA as yeastPerturbationData } from "../../data/yeast-perturbation.js";
import { type SampleGraph } from "../../src/types.js";

/** Every small dataset's data, by name. */
export const SOURCE_DATA: Readonly<Record<string, DatasetData>> = {
    "celegans-neural": celegansNeuralData,
    "contiguous-usa": contiguousUsaData,
    "davis-southern-women": davisSouthernWomenData,
    dolphins: dolphinsData,
    "florentine-families": florentineFamiliesData,
    football: footballData,
    "go-slim-generic": goSlimGenericData,
    karate: karateData,
    "knuth-miles": knuthMilesData,
    "les-miserables": lesMiserablesData,
    openflights: openflightsData,
    "political-blogs": politicalBlogsData,
    "political-books": politicalBooksData,
    "stelzl-interactome": stelzlInteractomeData,
    "venice-transit": veniceTransitData,
    "wikipathways-senescence-autophagy": wikipathwaysSenescenceAutophagyData,
    "yeast-perturbation": yeastPerturbationData,
};

/** @returns the celegans-neural dataset from its repository copy */
export const celegansNeural = (): SampleGraph => buildDataset(celegansNeuralData);
/** @returns the contiguous-usa dataset from its repository copy */
export const contiguousUsa = (): SampleGraph => buildDataset(contiguousUsaData);
/** @returns the davis-southern-women dataset from its repository copy */
export const davisSouthernWomen = (): SampleGraph => buildDataset(davisSouthernWomenData);
/** @returns the dolphins dataset from its repository copy */
export const dolphins = (): SampleGraph => buildDataset(dolphinsData);
/** @returns the florentine-families dataset from its repository copy */
export const florentineFamilies = (): SampleGraph => buildDataset(florentineFamiliesData);
/** @returns the football dataset from its repository copy */
export const football = (): SampleGraph => buildDataset(footballData);
/** @returns the go-slim-generic dataset from its repository copy */
export const goSlimGeneric = (): SampleGraph => buildDataset(goSlimGenericData);
/** @returns the karate dataset from its repository copy */
export const karate = (): SampleGraph => buildDataset(karateData);
/** @returns the knuth-miles dataset from its repository copy */
export const knuthMiles = (): SampleGraph => buildDataset(knuthMilesData);
/** @returns the les-miserables dataset from its repository copy */
export const lesMiserables = (): SampleGraph => buildDataset(lesMiserablesData);
/** @returns the openflights dataset from its repository copy */
export const openflights = (): SampleGraph => buildDataset(openflightsData);
/** @returns the political-blogs dataset from its repository copy */
export const politicalBlogs = (): SampleGraph => buildDataset(politicalBlogsData);
/** @returns the political-books dataset from its repository copy */
export const politicalBooks = (): SampleGraph => buildDataset(politicalBooksData);
/** @returns the stelzl-interactome dataset from its repository copy */
export const stelzlInteractome = (): SampleGraph => buildDataset(stelzlInteractomeData);
/** @returns the venice-transit dataset from its repository copy */
export const veniceTransit = (): SampleGraph => buildDataset(veniceTransitData);
/** @returns the wikipathways-senescence-autophagy dataset from its repository copy */
export const wikipathwaysSenescenceAutophagy = (): SampleGraph => buildDataset(wikipathwaysSenescenceAutophagyData);
/** @returns the yeast-perturbation dataset from its repository copy */
export const yeastPerturbation = (): SampleGraph => buildDataset(yeastPerturbationData);
