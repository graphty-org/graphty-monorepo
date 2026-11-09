/**
 * The sample library: one list of every sample the app offers, in one order, which the start
 * page's library and the Samples dialog both draw with the same card (SampleCard.tsx). The main
 * menu's Open sample list is its first part: the app's own samples, from offeredSamples().
 */

import {
    DATASET_DESCRIPTORS,
    type DatasetMeta,
    GENERATOR_DESCRIPTORS,
    type GeneratorDescriptor,
} from "@graphty/graphty-element/catalog";

import { offeredSamples, START_SAMPLES, type StartSample } from "../../data/sampleManifest";
import { countWords, fitsInBrowser, isLarge, megabytes } from "./library";
import { copyOf, OWN_COPIES, pictureOf, samplePicture } from "./open";

/**
 * The field each dataset comes from, for the tag on its tile and the library's field filter: this
 * app's grouping of graph-samples' catalog. A dataset not named here is filed under "Other".
 */
const FIELDS: Readonly<Record<string, string>> = {
    karate: "Social",
    "florentine-families": "Social",
    "davis-southern-women": "Social",
    "les-miserables": "Social",
    football: "Sports",
    // The app's own copies of football and florentine-families, by their sample ids.
    "college-football": "Sports",
    florentine: "Social",
    "campus-contacts": "Social",
    "graph-research": "Science",
    "marvel-films": "Culture",
    "paper-citations": "Science",
    "political-books": "Politics",
    dolphins: "Animals",
    "contiguous-usa": "Places",
    "knuth-miles": "Places",
    "celegans-neural": "Biology",
    "political-blogs": "Politics",
    openflights: "Places",
    "venice-transit": "Places",
    "yeast-perturbation": "Biology",
    "stelzl-interactome": "Biology",
    "wikipathways-senescence-autophagy": "Biology",
    "go-slim-generic": "Ontology",
    "road-ny": "Places",
    "com-dblp": "Science",
    "ogbn-arxiv": "Science",
    "go-basic": "Ontology",
    "disease-ontology": "Ontology",
    "bioplex3-hct116": "Biology",
};

/** The field of every generated graph, for the field filter. */
export const GENERATED = "Generated";

/** A short title that says what each dataset is good for; the dataset's own name is the subline. */
const HOOKS: Readonly<Record<string, string>> = {
    karate: "A club that split in two",
    "florentine-families": "How the Medici brokered power",
    "davis-southern-women": "Who went to which party, 1930s",
    "les-miserables": "Who holds the novel together",
    football: "Conferences fall out of who played whom",
    "college-football": "Conferences fall out of who played whom",
    florentine: "How the Medici brokered power",
    "campus-contacts": "A week of who was near whom",
    "graph-research": "A research community grows",
    "marvel-films": "A film universe, release by release",
    "paper-citations": "Thirty years of citations",
    "political-books": "Left, right and the few in between",
    dolphins: "A pod with two social circles",
    "contiguous-usa": "Borders as a network",
    "knuth-miles": "128 cities, every driving distance",
    "celegans-neural": "The wiring of a whole nervous system",
    "political-blogs": "The 2004 blogosphere, split by party",
    openflights: "Every airline route on Earth",
    "venice-transit": "Every stop by bus, tram and boat",
    "yeast-perturbation": "Cytoscape's classic gene network",
    "stelzl-interactome": "Human proteins that bind each other",
    "wikipathways-senescence-autophagy": "A drawn pathway from NDEx",
    "go-slim-generic": "The Gene Ontology in miniature",
    "road-ny": "Every road in New York City",
    "com-dblp": "Who wrote papers with whom",
    "ogbn-arxiv": "What arXiv papers cite",
    "go-basic": "The whole Gene Ontology",
    "disease-ontology": "How human diseases are classified",
    "bioplex3-hct116": "Human proteins found together",
};

/** What a sample card shows. */
export interface SampleCardData {
    readonly name: string;
    /** The short title the card leads with. */
    readonly hook: string;
    /** The field it comes from, on its tag. */
    readonly field: string;
    readonly size: string;
    readonly sentence: string;
    /**
     * The address of a picture of the graph, when there is one. Asked for when the card draws: the
     * address depends on the site's dataset address, which loads after this module.
     */
    readonly picture: () => string | undefined;
    /** A word on what opening it takes, for a large dataset. */
    readonly note: string | undefined;
}

/** What a tile of the library opens. */
export type SampleSource =
    | { readonly kind: "sample"; readonly sample: StartSample }
    | { readonly kind: "dataset"; readonly dataset: DatasetMeta }
    | { readonly kind: "generator"; readonly generator: GeneratorDescriptor };

/** One tile in the sample library. */
export interface LibraryTile extends SampleCardData {
    readonly id: string;
    /** What the search box matches against, lowercase. */
    readonly words: string;
    readonly source: SampleSource;
}

/**
 * The note on a large dataset's tile: its download.
 * @param dataset - The dataset.
 * @returns The words, or undefined for one that opens in a moment.
 */
function noteOf(dataset: DatasetMeta): string | undefined {
    if (!isLarge(dataset)) {
        return undefined;
    }
    return dataset.bytes === undefined ? "Large: slower to open" : `Large: ${megabytes(dataset.bytes)}, slower to open`;
}

/**
 * A dataset's size as a tile reads it: "77 nodes, 254 edges".
 * @param dataset - The dataset.
 * @returns The words.
 */
function sizeWords(dataset: DatasetMeta): string {
    return `${countWords(dataset.nodes)} nodes, ${countWords(dataset.edges)} edges`;
}

/**
 * The first sentence of a dataset's description.
 * @param text - The description.
 * @returns Its first sentence.
 */
function firstSentence(text: string): string {
    // A full stop after something other than a full stop: "E1 .. E14" does not end it.
    const end = text.search(/[^.]\.(\s|$)/);
    return end === -1 ? text : text.slice(0, end + 2);
}

/**
 * Every tile: the app's own samples first, then every other dataset in graph-samples' catalog that
 * graphty-element can open, in the catalog's order, then every generator. A dataset past the
 * element's published ceilings is left out: its tile could only open an empty graph.
 */
const SAMPLE_TILES: readonly LibraryTile[] = [
    ...START_SAMPLES.map((sample): LibraryTile => {
        const dataset = copyOf(sample);
        const field = FIELDS[sample.id] ?? "Other";
        const hook = HOOKS[sample.id] ?? sample.name;
        return {
            id: sample.id,
            name: sample.name,
            hook,
            field,
            size: dataset === undefined ? sample.size : sizeWords(dataset),
            sentence: sample.sentence,
            picture: () => samplePicture(sample),
            note: undefined,
            words: `${sample.name} ${hook} ${field} ${sample.sentence}`.toLowerCase(),
            source: { kind: "sample", sample },
        };
    }),
    ...DATASET_DESCRIPTORS.filter(
        (dataset) => !Object.values(OWN_COPIES).includes(dataset.name) && fitsInBrowser(dataset),
    ).map((dataset): LibraryTile => ({
        id: dataset.name,
        name: dataset.title,
        hook: HOOKS[dataset.name] ?? dataset.title,
        field: FIELDS[dataset.name] ?? "Other",
        size: sizeWords(dataset),
        sentence: firstSentence(dataset.description),
        picture: () => pictureOf(dataset),
        note: noteOf(dataset),
        words: `${dataset.title} ${HOOKS[dataset.name] ?? ""} ${FIELDS[dataset.name] ?? "Other"} ${dataset.description}`.toLowerCase(),
        source: { kind: "dataset", dataset },
    })),
    ...GENERATOR_DESCRIPTORS.map((generator): LibraryTile => ({
        id: `generate-${generator.name}`,
        name: generator.plainName,
        hook: generator.plainName,
        field: GENERATED,
        size:
            generator.params.length === 0
                ? "nothing to set"
                : generator.params.map((param) => param.plainName).join(", "),
        sentence: generator.description,
        picture: () => pictureOf(generator),
        note: undefined,
        words: `${generator.plainName} ${generator.name} ${GENERATED} ${generator.description}`.toLowerCase(),
        source: { kind: "generator", generator },
    })),
];

/**
 * The tiles this site offers, in order: the app's own samples that offeredSamples() offers (the
 * timed ones only with the timeline experiment on), then the datasets and the generators.
 * @param timeline - Whether the timeline experiment is on.
 * @returns The tiles.
 */
export function offeredTiles(timeline: boolean): readonly LibraryTile[] {
    const own = new Set(offeredSamples(timeline));
    return SAMPLE_TILES.filter((tile) => tile.source.kind !== "sample" || own.has(tile.source.sample));
}
