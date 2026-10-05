/**
 * The Analyze popover's words: its headings, each algorithm's name, the one line saying what it
 * answers, the words a reader might type to find it, and the cost line.
 *
 * graphty-element is neutral about presentation (CLAUDE.md), so it publishes each algorithm's
 * facts -- its key, its result shape, its options, its cost -- and the app writes every word a
 * reader sees. The headings are the app's grouping of the element's result shapes
 * (tier1-design.md section 5.T7: "the catalog by what the run adds").
 */

import type { AlgorithmDescriptor, OptionDescriptor } from "@graphty/graphty-element/catalog";

/** One heading of the list, and the result shapes it gathers. */
export interface Heading {
    readonly id: "rank" | "groups" | "paths" | "measure";
    readonly title: string;
    readonly shapes: readonly AlgorithmDescriptor["shape"][];
}

/**
 * The headings in list order. Every result shape the element declares falls under exactly one
 * (a test holds this); a heading with no entries is not drawn.
 */
export const HEADINGS: readonly Heading[] = [
    { id: "rank", title: "Rank nodes and edges", shapes: ["node-metric", "edge-metric"] },
    { id: "groups", title: "Find groups", shapes: ["community", "layered-grouping", "category-table"] },
    { id: "paths", title: "Find paths and edge sets", shapes: ["path", "node-set", "edge-set", "pair-list"] },
    { id: "measure", title: "Measure the graph", shapes: ["fact", "temporal"] },
];

/** What the app says about one algorithm. */
interface AlgorithmWords {
    /** Its name in the list, on its row and in the footer. */
    readonly name: string;
    /** One line: the question it answers. */
    readonly answers: string;
    /** Words a reader might type for it ("brokers" finds Betweenness). */
    readonly aliases: readonly string[];
    /** The one "Start here" of its heading (at most one per heading). */
    readonly startHere?: boolean;
}

/** The words for the element's own algorithms, by key. */
const WORDS: Readonly<Record<string, AlgorithmWords>> = {
    degree: {
        name: "Degree",
        answers: "How many edges each node has.",
        aliases: ["connections", "links", "hubs", "popular"],
    },
    betweenness: {
        name: "Betweenness",
        answers: "Which nodes sit on the most shortest paths between others.",
        aliases: ["brokers", "bridges", "gatekeepers", "bottlenecks"],
    },
    closeness: {
        name: "Closeness",
        answers: "Which nodes are, on average, nearest to all the others.",
        aliases: ["reach", "distance", "central"],
    },
    pagerank: {
        name: "PageRank",
        answers: "Which nodes are connected to other well-connected nodes.",
        aliases: ["influence", "important", "importance", "random walk", "central"],
        startHere: true,
    },
    eigenvector: {
        name: "Eigenvector",
        answers: "Which nodes are tied to other central nodes.",
        aliases: ["prestige", "well connected", "influence"],
    },
    katz: {
        name: "Katz",
        answers: "Which nodes reach many others by short walks.",
        aliases: ["influence", "reach"],
    },
    hits: {
        name: "HITS",
        answers: "Which nodes point to good sources, and which are pointed to.",
        aliases: ["hubs", "authorities"],
    },
    louvain: {
        name: "Louvain",
        answers: "Which nodes form densely linked groups.",
        aliases: ["communities", "clusters", "groups", "modularity"],
        startHere: true,
    },
    leiden: {
        name: "Leiden",
        answers: "Densely linked groups, each kept in one connected piece.",
        aliases: ["communities", "clusters", "groups", "modularity"],
    },
    "label-propagation": {
        name: "Label propagation",
        answers: "Groups found by letting neighbors vote on a label.",
        aliases: ["communities", "groups", "fast clusters"],
    },
    "girvan-newman": {
        name: "Girvan-Newman",
        answers: "The groups left after removing the busiest edges.",
        aliases: ["communities", "divisive", "dendrogram"],
    },
    components: {
        name: "Connected components",
        answers: "Which parts of the graph are cut off from each other.",
        aliases: ["islands", "pieces", "disconnected"],
    },
    "shortest-path": {
        name: "Shortest path",
        answers: "The fewest steps, or the lightest route, between two nodes.",
        aliases: ["route", "dijkstra", "how are they connected"],
        startHere: true,
    },
    "all-pairs-distance": {
        name: "All-pairs distance",
        answers: "How far each node is from all the others.",
        aliases: ["distance matrix", "floyd-warshall", "how far apart"],
    },
    bfs: {
        name: "Steps away",
        answers: "Which nodes are one, two or more steps from a start node.",
        aliases: ["breadth-first", "bfs", "hops", "degrees of separation"],
    },
    dfs: {
        name: "Depth-first order",
        answers: "The order a walk visits nodes, going deep before backing up.",
        aliases: ["visit order", "traversal", "dfs"],
    },
    kruskal: {
        name: "Minimum spanning tree",
        answers: "The lightest set of edges that still joins every node.",
        aliases: ["backbone", "skeleton", "kruskal"],
    },
    prim: {
        name: "Spanning tree from a node",
        answers: "The lightest set of edges joining every node, grown from a start node.",
        aliases: ["backbone", "prim"],
    },
    "bipartite-matching": {
        name: "Bipartite matching",
        answers: "The most edges pairing one side with the other.",
        aliases: ["pairing", "assignment", "two sides"],
    },
    "max-flow": {
        name: "Most flow",
        answers: "The most that can move from one node to another.",
        aliases: ["max flow", "maximum flow", "throughput", "capacity"],
    },
    "min-cut": {
        name: "Weakest cut",
        answers: "The lightest set of edges that cuts one node off from another.",
        aliases: ["minimum cut", "min cut", "bottleneck", "separate"],
    },
    "k-core": {
        name: "Core number",
        answers: "How deep in the dense core of the graph each node sits.",
        aliases: ["k-core", "coreness"],
    },
    "clustering-coefficient": {
        name: "Clustering coefficient",
        answers: "How many of each node's neighbors are tied to each other.",
        aliases: ["tightly knit", "triangles", "cliquish"],
    },
    "link-prediction": {
        name: "Link prediction",
        answers: "Which missing edges the shared neighbors suggest.",
        aliases: ["missing links", "recommend", "adamic-adar", "jaccard"],
    },
};

/**
 * The words for one algorithm. An algorithm a third party registered has no words of the app's,
 * so it reads under its technical name, which is the element's fact about it.
 * @param descriptor - the element's descriptor.
 * @returns the words.
 */
export function wordsFor(descriptor: AlgorithmDescriptor): AlgorithmWords {
    return WORDS[descriptor.key] ?? { name: descriptor.technicalName, answers: "", aliases: [] };
}

/** One heading with the entries under it. */
interface HeadingEntries {
    readonly heading: Heading;
    readonly entries: readonly AlgorithmDescriptor[];
}

/**
 * Whether an entry matches the filter text: a case-insensitive part of its name, its line, its
 * aliases, its key or its technical name.
 * @param descriptor - the entry.
 * @param text - what the reader typed.
 * @returns true when it matches, or when the text is blank.
 */
export function matches(descriptor: AlgorithmDescriptor, text: string): boolean {
    const want = text.trim().toLowerCase();
    if (want === "") {
        return true;
    }
    const words = wordsFor(descriptor);
    return [words.name, words.answers, ...words.aliases, descriptor.key, descriptor.technicalName].some((word) =>
        word.toLowerCase().includes(want),
    );
}

/**
 * The list under its headings, filtered; a heading with no entries left is dropped.
 * @param algorithms - the element's catalog.
 * @param text - the filter text.
 * @returns the headings in order, each with its entries in catalog order.
 */
export function groupAlgorithms(algorithms: readonly AlgorithmDescriptor[], text = ""): HeadingEntries[] {
    return HEADINGS.map((heading) => ({
        heading,
        entries: algorithms.filter((a) => heading.shapes.includes(a.shape) && matches(a, text)),
    })).filter((group) => group.entries.length > 0);
}

/**
 * The cost line beside Run, from the element's estimate in seconds.
 * @param seconds - the estimate; Infinity when it cannot be bounded.
 * @returns such as "Under a second", "About 4 seconds", "About 3 minutes".
 */
export function costLine(seconds: number): string {
    if (!Number.isFinite(seconds)) {
        return "Time cannot be estimated";
    }
    if (seconds < 1) {
        return "Under a second";
    }
    if (seconds < 90) {
        const whole = Math.round(seconds);
        return `About ${String(whole)} second${whole === 1 ? "" : "s"}`;
    }
    if (seconds < 90 * 60) {
        return `About ${String(Math.round(seconds / 60))} minutes`;
    }
    return `About ${String(Math.round(seconds / 3600))} hours`;
}

/** What the app calls one option of the short form, and each of its choices. */
interface OptionWords {
    readonly label: string;
    readonly choices?: Readonly<Record<string, string>>;
}

/**
 * The words for the options the short form draws, by `<algorithm key>.<option name>` (a test
 * holds that every one the element ships has words here).
 */
const OPTION_WORDS: Readonly<Record<string, OptionWords>> = {
    "pagerank.dampingFactor": { label: "Damping factor" },
    "katz.alpha": { label: "Attenuation" },
    "louvain.resolution": { label: "Resolution" },
    "leiden.resolution": { label: "Resolution" },
    "label-propagation.maxIterations": { label: "Most rounds" },
    "girvan-newman.maxCommunities": { label: "Most groups" },
    "components.strength": { label: "Connected", choices: { weak: "Either direction", strong: "Both directions" } },
    "min-cut.useGlobalMinCut": { label: "Weakest cut anywhere in the graph" },
    "link-prediction.method": {
        label: "Score",
        choices: { "adamic-adar": "Adamic-Adar", "common-neighbors": "Common neighbors" },
    },
    "link-prediction.topK": { label: "Pairs" },
};

/**
 * The words for one option. An option the app has no words for (a third party's algorithm) reads
 * under its name and its choices under their values: the element's facts, not its words.
 * @param algorithm - the algorithm's key.
 * @param option - the element's option descriptor.
 * @returns the label, and the word for a choice by its value.
 */
export function optionWords(
    algorithm: string,
    option: OptionDescriptor,
): { label: string; choice: (value: string) => string } {
    const words = OPTION_WORDS[`${algorithm}.${option.name}`];
    return {
        label: words?.label ?? option.name,
        choice: (value) => words?.choices?.[value] ?? value,
    };
}

/** The option types the short form draws a control for; the rest keep their defaults. */
const DRAWN = new Set<OptionDescriptor["type"]>(["number", "integer", "enum", "boolean"]);

/**
 * Whether the short form draws a control for this option: a value the reader sets, not one
 * read from the selection (node ids) or one marked advanced or internal by the element.
 * @param option - the element's option descriptor.
 * @returns true when it gets a control.
 */
export function isEssential(option: OptionDescriptor): boolean {
    return option.advanced !== true && option.internal !== true && DRAWN.has(option.type);
}
