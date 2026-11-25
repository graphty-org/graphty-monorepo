/**
 * The graphty app's own samples: the ones the start page features first, and the timed ones
 * graph-samples does not ship. Every graph-samples dataset and generator comes from graphty-element's
 * catalog instead (workspace/start/sampleLibrary.ts), so a new one appears with no change here.
 */

/**
 * One sample on the tier 1 start screen (design/ui/tier1-real-app/tier1-design.md section 2.11).
 * @public
 */
export interface StartSample {
    /** Stable id. */
    readonly id: string;
    /** The dataset's name, which the project opens under. */
    readonly name: string;
    /** What it is and what it is good for, naming only tier 1 jobs. */
    readonly sentence: string;
    /** Its size as the start screen reads it, before anything is loaded. */
    readonly size: string;
    /** Where the element imports it from, under the app's base URL. */
    readonly url: string;
    /** Its picture, for a sample with no graph-samples dataset to take one from. */
    readonly picture?: string;
    /**
     * The element's reader options it opens with, beside its address: the columns a table's edges run between when
     * its header does not name them.
     */
    readonly options?: Readonly<Record<string, unknown>>;
    /**
     * The values its nodes are labeled with when it opens, one label line each (`"data.name"`), for a file whose
     * format carries no styling, so no labels of its own. A node lacking one of them leaves out that line.
     */
    readonly labels?: readonly string[];
}

/**
 * A sample file from another program, on the start screen's own section for them.
 * @public
 */
export interface ProgramSample extends StartSample {
    /** The program that wrote the file, which its card is named for. */
    readonly program: string;
}

/**
 * The tier 1 samples, Les Miserables first, then the timed ones: three real networks written by
 * scripts/fetch-timeline-samples.ts and one synthetic, written by scripts/write-timeline-samples.ts
 * (public/samples/SOURCES.md has their sources and licenses). Each opens by URL through graphty-element's
 * ordinary import, with nothing run.
 *
 * The first four are this site's own copies of graph-samples datasets (OWN_COPIES in
 * workspace/start/open.ts), featured first and served with the app so the start page's graph and
 * the featured samples open without the dataset server. Every other graph-samples dataset, and
 * every generator, comes from graphty-element's catalog. The sizes are the source files' own counts,
 * which graph-samples' dataset metadata and public/samples/SOURCES.md also record.
 */
export const START_SAMPLES: readonly StartSample[] = [
    {
        id: "les-miserables",
        name: "Les Miserables",
        sentence:
            "Characters who share a chapter of the novel. Good for a first look at communities and who holds the story together.",
        size: "77 characters",
        url: `${import.meta.env.BASE_URL}samples/les-miserables.gml`,
    },
    {
        id: "karate",
        name: "Zachary's karate club",
        sentence:
            "Members of a club and who met outside it. Good for finding who connects the club and which members group together.",
        size: "34 members",
        url: `${import.meta.env.BASE_URL}samples/karate.gml`,
    },
    {
        id: "college-football",
        name: "College football",
        sentence:
            "Teams and the games they played in one season. Good for finding groups of teams that play each other most.",
        size: "115 teams",
        url: `${import.meta.env.BASE_URL}samples/football.gml`,
    },
    {
        id: "florentine",
        name: "Florentine families",
        sentence:
            "Marriages between the leading families of Renaissance Florence. Good for finding who brokers between groups.",
        size: "15 families",
        url: `${import.meta.env.BASE_URL}samples/florentine.gml`,
    },
    {
        id: "campus-contacts",
        name: "Campus contacts",
        sentence:
            "Which of 615 university students were near each other, hour by hour for one week. Good for watching groups gather by day and scatter at night.",
        size: "615 nodes, 8,142 edges",
        url: `${import.meta.env.BASE_URL}samples/campus-contacts.json`,
        picture: `${import.meta.env.BASE_URL}samples/campus-contacts.webp`,
    },
    {
        id: "graph-research",
        name: "Graph researchers",
        sentence:
            "Who wrote papers together in the Journal of Graph Algorithms and Applications from 1997 on. Good for watching a research community grow.",
        size: "549 nodes, 2,084 edges",
        url: `${import.meta.env.BASE_URL}samples/graph-research.json`,
        picture: `${import.meta.env.BASE_URL}samples/graph-research.webp`,
    },
    {
        id: "marvel-films",
        name: "Marvel films",
        sentence:
            "The Marvel Cinematic Universe films from 2008 on and the actors cast in two or more of them. Good for watching a franchise build up film by film.",
        size: "210 nodes, 582 edges",
        url: `${import.meta.env.BASE_URL}samples/marvel-films.json`,
        picture: `${import.meta.env.BASE_URL}samples/marvel-films.webp`,
    },
    {
        id: "paper-citations",
        name: "Paper citations",
        sentence:
            "Papers from 1995 to 2024 and the older papers they cite, each with its year. Good for watching a field grow year by year.",
        size: "159 nodes, 453 edges",
        url: `${import.meta.env.BASE_URL}samples/paper-citations.json`,
        picture: `${import.meta.env.BASE_URL}samples/paper-citations.webp`,
    },
];

/** What the card of a sample whose format carries no styling says of it. */
const NO_STYLING = " Its format carries no styling, so graphty labels the nodes and draws the rest in its own style.";

/** Where the samples from other programs are served (public/samples/programs/SOURCES.md has their sources). */
const PROGRAMS_URL = `${import.meta.env.BASE_URL}samples/programs/`;

/**
 * One sample file from each program whose files graphty reads, as the program (or its own tutorials, tests or
 * examples) wrote it, each opened with its file's styles. graph-io/test/corpus/programs/samples.json holds the same
 * files as the official load tests, with their counts, sources and licenses.
 */
export const PROGRAM_SAMPLES: readonly ProgramSample[] = [
    {
        id: "program-yed",
        program: "yEd",
        name: "FileMaker object dependencies",
        sentence:
            "A yEd diagram with stars, hexagons, diamonds and rounded boxes in nine colors, drawn where yEd put them.",
        size: "65 nodes, 102 edges",
        picture: `${PROGRAMS_URL}yed.webp`,
        url: `${PROGRAMS_URL}yed.graphml`,
    },
    {
        id: "program-yed-live",
        program: "yEd Live",
        name: "WaveNet",
        sentence: "A yEd Live diagram of filled and hollow shapes with dashed and dotted outlines and dashed edges.",
        size: "183 nodes, 207 edges",
        picture: `${PROGRAMS_URL}yed-live.webp`,
        url: `${PROGRAMS_URL}yed-live.graphml`,
    },
    {
        id: "program-cytoscape",
        program: "Cytoscape",
        name: "Malignant melanoma",
        sentence:
            "The first network of a Cytoscape session that ships with Cytoscape, with its shapes, colors and arrows.",
        size: "30 nodes, 137 edges",
        picture: `${PROGRAMS_URL}cytoscape.webp`,
        url: `${PROGRAMS_URL}cytoscape.cys`,
    },
    {
        id: "program-cytoscape-xgmml",
        program: "Cytoscape (XGMML)",
        name: "Yeast expression",
        sentence:
            "The network of Cytoscape's data visualization tutorial, genes colored by expression where Cytoscape placed them.",
        size: "331 nodes, 362 edges",
        picture: `${PROGRAMS_URL}cytoscape-xgmml.webp`,
        url: `${PROGRAMS_URL}cytoscape.xgmml.gz`,
    },
    {
        id: "program-ndex-cx",
        program: "NDEx (CX)",
        name: "JAK/STAT signaling, dark theme",
        sentence: "An NDEx network in the CX format, drawn on a dark background with white edges.",
        size: "34 nodes, 116 edges",
        picture: `${PROGRAMS_URL}ndex-cx.webp`,
        url: `${PROGRAMS_URL}ndex.cx`,
    },
    {
        id: "program-ndex-cx2",
        program: "NDEx (CX2)",
        name: "Toll-like receptor pathway",
        sentence: "A WikiPathways pathway from NDEx in the CX2 format, with its colored edges, arrows and annotations.",
        size: "280 nodes, 159 edges",
        picture: `${PROGRAMS_URL}ndex-cx2.webp`,
        url: `${PROGRAMS_URL}ndex.cx2`,
    },
    {
        id: "program-cytoscape-js",
        program: "Cytoscape.js",
        name: "GeneMANIA genes",
        sentence: "Cytoscape.js's GeneMANIA demo with its stylesheet: genes sized by score, edges colored by kind.",
        size: "31 nodes, 255 edges",
        picture: `${PROGRAMS_URL}cytoscape-js.webp`,
        url: `${PROGRAMS_URL}cytoscape-js.json`,
    },
    {
        id: "program-gephi",
        program: "Gephi",
        name: "Les Miserables",
        sentence: "The sample that ships with Gephi: characters colored by community and sized by importance.",
        size: "77 nodes, 254 edges",
        picture: `${PROGRAMS_URL}gephi.webp`,
        url: `${PROGRAMS_URL}gephi.gexf`,
    },
    {
        id: "program-graphviz",
        program: "Graphviz",
        name: "Linux kernel diagram",
        sentence: "A Graphviz gallery graph of colored boxes, ellipses and octagons, laid out as Graphviz would.",
        size: "65 nodes, 68 edges",
        picture: `${PROGRAMS_URL}graphviz.webp`,
        url: `${PROGRAMS_URL}graphviz.gv`,
    },
    {
        id: "program-ogdf",
        program: "OGDF",
        name: "Entity-relationship diagram",
        sentence: "An OGDF example of boxes in ten colors with black and white labels and dotted edges.",
        size: "43 nodes, 57 edges",
        picture: `${PROGRAMS_URL}ogdf.webp`,
        url: `${PROGRAMS_URL}ogdf.gml`,
    },
    {
        id: "program-pajek",
        program: "Pajek",
        name: "Phone calls",
        sentence: "A Pajek network of ellipses, boxes and diamonds in seven colors, drawn where the file placed them.",
        size: "111 nodes, 193 edges",
        picture: `${PROGRAMS_URL}pajek.webp`,
        url: `${PROGRAMS_URL}pajek.net`,
    },
    {
        id: "program-neo4j",
        program: "Neo4j",
        name: "Movies",
        sentence:
            `Neo4j's Movies graph as a neo4j-admin import file: people, films and who acted in, directed or reviewed ` +
            `what.${NO_STYLING}`,
        size: "169 nodes, 250 edges",
        picture: `${PROGRAMS_URL}neo4j.webp`,
        url: `${PROGRAMS_URL}neo4j-movies.csv`,
        // a person has a name and a film a title
        labels: ["data.name", "data.title"],
    },
    {
        id: "program-obo-foundry",
        program: "OBO Foundry",
        name: "Taxonomic ranks",
        sentence: `An OBO Foundry ontology of taxonomic ranks, from kingdom to species, as one tree.${NO_STYLING}`,
        size: "77 nodes, 75 edges",
        picture: `${PROGRAMS_URL}obo-foundry.webp`,
        url: `${PROGRAMS_URL}obo-foundry.obo`,
        labels: ["data.name"],
    },
    {
        id: "program-cytoscape-sif",
        program: "Cytoscape (SIF)",
        name: "Group nodes tutorial",
        sentence: `The network of Cytoscape's group nodes tutorial in the simple interaction format.${NO_STYLING}`,
        size: "37 nodes, 62 edges",
        picture: `${PROGRAMS_URL}cytoscape-sif.webp`,
        url: `${PROGRAMS_URL}cytoscape.sif`,
        labels: ["id"],
    },
    {
        id: "program-cytoscape-table",
        program: "Cytoscape (CSV table)",
        name: "HIV protein interactions",
        sentence: `Cytoscape's AP-MS tutorial table, read as a network from its Bait and Prey columns.${NO_STYLING}`,
        size: "453 nodes, 499 edges",
        picture: `${PROGRAMS_URL}cytoscape-table.webp`,
        url: `${PROGRAMS_URL}cytoscape-table.csv`,
        options: { edgeSource: "Bait", edgeTarget: "Prey" },
        labels: ["id"],
    },
    {
        id: "program-d3",
        program: "D3",
        name: "Les Miserables",
        sentence: `D3's own force layout sample: characters in ten groups and who appears with whom.${NO_STYLING}`,
        size: "77 nodes, 254 edges",
        picture: `${PROGRAMS_URL}d3.webp`,
        url: `${PROGRAMS_URL}d3.json`,
        labels: ["id"],
    },
];
