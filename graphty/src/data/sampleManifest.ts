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
