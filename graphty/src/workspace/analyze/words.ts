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
import type { Caveats, CostEstimate, GraphSession, Run, WeightMeaning } from "@graphty/graphty-element/session";

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
    "edge-betweenness": {
        name: "Edge betweenness",
        answers: "Which edges carry the most shortest paths between nodes.",
        aliases: ["bridges", "busy edges", "bottlenecks", "edges that hold it together"],
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
    "markov-clustering": {
        name: "Markov clustering",
        answers: "Groups where flow along the edges gets trapped.",
        aliases: ["communities", "clusters", "groups", "flow", "mcl"],
    },
    "spectral-clustering": {
        name: "Spectral clustering",
        answers: "The nodes split into a chosen number of groups.",
        aliases: ["communities", "clusters", "groups", "eigenvectors", "split"],
    },
    "hierarchical-clustering": {
        name: "Hierarchical clustering",
        answers: "Groups built by merging the closest nodes until a chosen number remain.",
        aliases: ["communities", "clusters", "groups", "merge", "agglomerative", "dendrogram"],
    },
    components: {
        name: "Connected components",
        answers: "Which parts of the graph are cut off from each other.",
        aliases: ["islands", "pieces", "disconnected"],
    },
    "shortest-path": {
        name: "Shortest path",
        answers: "The fewest steps, or the shortest route by weight, between two nodes.",
        aliases: ["route", "dijkstra", "how are they connected"],
        startHere: true,
    },
    astar: {
        name: "Guided route",
        answers: "A route between two nodes, optionally steered by where they are drawn.",
        aliases: ["a*", "astar", "route", "path", "how are they connected"],
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

/**
 * What a run is called on screen: its method's name in the app's words, so a reader who picked
 * "PageRank" sees "PageRank" on every row, column and key. graphty-element still names a run in
 * its own English (`run.label`: the algorithm's plain name, then any qualifier that tells sibling
 * runs apart); the qualifier is kept, the plain name swapped. A label that does not start with
 * the plain name (a registered algorithm's own suggestion) is shown as the element wrote it.
 * @param session - the element's session, for the catalog.
 * @param run - the run.
 * @returns the name.
 */
export function runName(session: GraphSession, run: Pick<Run, "algorithm" | "label">): string {
    const descriptor = session.catalog.algorithms().find((algorithm) => algorithm.key === run.algorithm);
    if (descriptor === undefined || !run.label.startsWith(descriptor.plainName)) {
        return run.label;
    }
    return wordsFor(descriptor).name + run.label.slice(descriptor.plainName.length);
}

/** What the key calls the elements a run's highlight marks, by the run's result shape. */
const HIGHLIGHT_ENTRIES: Partial<Record<Run["shape"], string>> = {
    path: "On the path",
    "pair-list": "In a pair",
};

/**
 * The key's entry for a run's highlight: "On the path" for a path, "In the result" for a set.
 * Never the element's layer name ("Shortest route (edges)").
 * @param shape - the run's result shape.
 * @returns the words.
 */
export function highlightEntry(shape: Run["shape"]): string {
    return HIGHLIGHT_ENTRIES[shape] ?? "In the result";
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

/** The estimate, in seconds, at or over which the app calls a method "slow". */
const SLOW_SECONDS = 10;

/**
 * Whether the element's estimate is slow enough for the app to say so.
 * @param seconds - the estimate; Infinity when it cannot be bounded.
 * @returns true at or over SLOW_SECONDS, and when the time cannot be bounded.
 */
export function isSlow(seconds: number): boolean {
    return seconds >= SLOW_SECONDS;
}

/** What the app calls one option, and each of its choices. */
interface OptionWords {
    readonly label: string;
    readonly choices?: Readonly<Record<string, string>>;
    /** What an option whose default is no value means while it is left empty. */
    readonly empty?: string;
}

/** A sampled run's sample size: empty means the exact run, from every node. */
const SAMPLE_SIZE: OptionWords = { label: "Sample size", empty: "Every node" };

/**
 * The app's words for the key options (the ones drawn outside the Advanced fold), by
 * `<algorithm key>.<option name>` (a test holds that every key option the element ships has
 * words here).
 */
const OPTION_WORDS: Readonly<Record<string, OptionWords>> = {
    "pagerank.dampingFactor": { label: "Damping factor" },
    "katz.alpha": { label: "Attenuation" },
    "louvain.resolution": { label: "Resolution" },
    "leiden.resolution": { label: "Resolution" },
    "label-propagation.maxIterations": { label: "Most rounds" },
    "girvan-newman.maxCommunities": { label: "Most groups" },
    "markov-clustering.inflation": { label: "Sharpness" },
    "spectral-clustering.clusters": { label: "Groups" },
    "hierarchical-clustering.clusters": { label: "Groups" },
    "components.strength": { label: "Connected", choices: { weak: "Either direction", strong: "Both directions" } },
    "astar.heuristic": {
        label: "Steer by",
        choices: { none: "Nothing (always shortest)", "layout-distance": "Distance on screen" },
    },
    "min-cut.useGlobalMinCut": { label: "Weakest cut anywhere in the graph" },
    "link-prediction.method": {
        label: "Score",
        choices: { "adamic-adar": "Adamic-Adar", "common-neighbors": "Common neighbors" },
    },
    "link-prediction.topK": { label: "Pairs" },
    // The Path popover's own words for its ends, so Made with names them the same way.
    "shortest-path.source": { label: "From" },
    "shortest-path.target": { label: "To" },
    "shortest-path.method": { label: "Method", empty: "Chosen automatically" },
    "closeness.k": SAMPLE_SIZE,
    "betweenness.k": SAMPLE_SIZE,
    "edge-betweenness.k": SAMPLE_SIZE,
};

/**
 * The words for options that mean the same thing in every algorithm, by option name; an entry
 * in OPTION_WORDS wins over these.
 */
const SHARED_OPTION_WORDS: Readonly<Record<string, string>> = {
    maxIterations: "Max iterations",
    tolerance: "Tolerance",
    k: "Sample size",
    randomSeed: "Random seed",
    seed: "Random seed",
    weight: "Weight",
    normalized: "Normalized",
    source: "Source",
    target: "Target",
    targetNode: "Target",
    sink: "Sink",
    startNode: "Start",
    // Layout options.
    start: "Start",
    root: "Center",
    groupBy: "Group by",
    scale: "Scale",
    columns: "Columns",
    align: "Direction",
    aspectRatio: "Aspect ratio",
    springLength: "Spring length",
    gravity: "Gravity",
};

/**
 * The words for one option. An option the app has no words for (a third party's algorithm, an
 * advanced option) reads under the element's plain name for it, and its choices under the
 * element's labels: never the raw option key.
 * @param algorithm - the algorithm's key, or the layout's catalog id.
 * @param option - the element's option descriptor.
 * @returns the label, the word for a choice by its value, and what the option left empty means.
 */
export function optionWords(
    algorithm: string,
    option: OptionDescriptor,
): { label: string; choice: (value: string) => string; empty: string } {
    const words = OPTION_WORDS[`${algorithm}.${option.name}`];
    return {
        label: words?.label ?? SHARED_OPTION_WORDS[option.name] ?? option.plainName,
        empty: words?.empty ?? "Not set",
        choice: (value) =>
            words?.choices?.[value] ?? option.values?.find((choice) => choice.value === value)?.label ?? value,
    };
}

/** A weight meaning as the element names it, or null when nobody chose one. */
export type Meaning = WeightMeaning["meaning"] | null;

/** What each meaning reads as on screen (tier2-design.md section 5); the element's "strength" is "closer". */
const MEANING_WORDS: Readonly<Record<WeightMeaning["meaning"], string>> = {
    strength: "closer",
    distance: "farther",
    capacity: "capacity",
};

/**
 * What each meaning tells a reader, as a whole sentence (glossary section 11), and what a weight
 * with none is read as. "Paths ignore it" alone was not understood in the tier 2 sessions.
 */
const MEANING_GLOSS: Readonly<Record<WeightMeaning["meaning"] | "unset", string>> = {
    strength: "A higher weight means a closer tie, such as more emails between two people.",
    distance: "A higher weight means farther apart, such as a longer trail; a path takes the smallest total.",
    capacity: "A higher weight means more can flow along the edge.",
    unset: "Choose what a higher weight means. Until you do, a path counts every edge as one step, and PageRank and communities read a higher weight as closer.",
};

/**
 * A meaning's word.
 * @param meaning - the meaning.
 * @returns "closer", "farther", "capacity", or null when none was chosen.
 */
function meaningWord(meaning: Meaning): string | null {
    return meaning === null ? null : MEANING_WORDS[meaning];
}

/**
 * A meaning's gloss.
 * @param meaning - the meaning.
 * @returns "A higher weight means more can flow along the edge.", ...
 */
export function meaningGloss(meaning: Meaning): string {
    return MEANING_GLOSS[meaning ?? "unset"];
}

/**
 * A weight column and its meaning.
 * @param attribute - the column.
 * @param meaning - its meaning.
 * @param extra - more words inside the brackets, such as "loaded".
 * @returns "emails (closer)", "emails (closer, loaded)", "emails" for no meaning and no extra.
 */
export function weightName(attribute: string, meaning: Meaning, extra?: string): string {
    const inside = [meaningWord(meaning), extra].filter((word): word is string => word !== null && word !== undefined);
    return inside.length === 0 ? attribute : `${attribute} (${inside.join(", ")})`;
}

/** Why a weight of another meaning was left unread, by the meaning the analysis reads. */
const NEEDS: Readonly<Record<WeightMeaning["meaning"], string>> = {
    distance: "a path needs a distance",
    strength: "this analysis reads closer",
    capacity: "a flow needs a capacity",
};

/**
 * Whether a coded fact's value is a meaning the app has words for.
 * @param value - the value.
 * @returns true for "strength", "distance" or "capacity".
 */
function isMeaning(value: unknown): value is WeightMeaning["meaning"] {
    return typeof value === "string" && Object.hasOwn(MEANING_WORDS, value);
}

/** What a run read as its weight: a short value for a row, and the explanation for a line under it. */
interface WeightRead {
    /** "km (farther)", "weight (read as closer)" or "None". */
    readonly value: string;
    /** Why, or how, when the value alone does not say it; null when it does. */
    readonly note: string | null;
}

/**
 * What a run read as its weight, from its caveats (tier2-design.md section 5, "Made with").
 * @param caveats - the run's caveats.
 * @returns the value ("emails (closer)", "w (read as closer)", "None") and its note ("Its meaning
 *     was not set, so this run assumed a higher weight means closer.", "Each edge counts as 1.",
 *     "Not read -- emails means closer, and a path needs a distance."), or no note.
 */
export function weightRead(caveats: Pick<Caveats, "weight" | "weightSkipped">): WeightRead {
    const skipped = caveats.weightSkipped;
    if (skipped !== undefined) {
        const { attribute, meaning, reads } = skipped.params;
        const column = String(attribute);
        // "Meaning not set" is the Data page's own word for a weight nobody gave a meaning.
        const has = isMeaning(meaning) ? `${column} means ${MEANING_WORDS[meaning]}` : `${column}'s meaning is not set`;
        const needs = isMeaning(reads) ? NEEDS[reads] : "this analysis reads another kind";
        return { value: "None", note: `Not read -- ${has}, and ${needs}.` };
    }
    const read = caveats.weight;
    if (read === null || read === undefined) {
        return { value: "None", note: "Each edge counts as 1." };
    }
    // A meaning nobody set, which the run assumed: the value says how it was read, the note
    // that it was assumed, so the two never read as "not set" and "closer" at once.
    return read.assumed === true
        ? {
              value: `${read.attribute} (read as ${MEANING_WORDS[read.meaning]})`,
              note: `Its meaning was not set, so this run assumed a higher weight means ${MEANING_WORDS[read.meaning]}.`,
          }
        : { value: weightName(read.attribute, read.meaning), note: null };
}

/**
 * A path run's ends and its answer, worded: its From and To by name, and the hops, or that no
 * path joins them (the element publishes a path of length 0). Null for any other run, or before
 * its result.
 * @param session - the element's session.
 * @param run - the run.
 * @returns the words, or null.
 */
function pathWords(session: GraphSession, run: Run): { from: string; to: string; hops: string | null } | null {
    const graph = run.result?.graph;
    if (run.shape !== "path" || graph === undefined) {
        return null;
    }
    const name = (id: unknown): string =>
        typeof id === "string" || typeof id === "number" ? (session.data.name(id) ?? String(id)) : "";
    const hops = typeof graph.hops === "number" ? graph.hops : 0;
    return {
        from: name(run.params.source),
        to: name(run.params.target),
        hops: graph.length === 0 ? null : `${String(hops)} ${hops === 1 ? "hop" : "hops"}`,
    };
}

/**
 * The status line for a finished path search: "Shortest path added: Ava to Lee, 2 hops", or
 * "No path from Ava to Lee.".
 * @param session - the element's session.
 * @param run - the run.
 * @returns the line, or null for any other run.
 */
export function pathAnnouncement(session: GraphSession, run: Run): string | null {
    const words = pathWords(session, run);
    if (words === null) {
        return null;
    }
    return words.hops === null
        ? `No path from ${words.from} to ${words.to}.`
        : `Shortest path added: ${words.from} to ${words.to}, ${words.hops}`;
}

/**
 * Why a run cannot start, in the reader's words, from the element's coded refusal.
 * @param estimate - the element's estimate for the run, `available` false.
 * @returns the sentence.
 */
export function runRefusalWords(estimate: CostEstimate): string {
    const params = estimate.refusal?.params ?? {};
    switch (estimate.refusal?.code) {
        case "algorithm.needs-directed":
            return "Needs a graph whose edges point one way";
        case "algorithm.needs-undirected":
            return "Needs a graph whose edges point both ways";
        case "algorithm.needs-weighted":
            return "Needs edge weights";
        case "algorithm.needs-connected":
            return typeof params.pieces === "number"
                ? `Needs a connected graph; this one is in ${params.pieces.toLocaleString("en-US")} pieces`
                : "Needs a connected graph";
        case "algorithm.needs-accelerator":
            return "Needs a graphics card this browser does not offer";
        case "estimate.scope-unresolved":
            return "The nodes to run on could not be found";
        default:
            return "Cannot run on this graph";
    }
}

/**
 * An option's words for a run that has finished: a choice of method left unset reads as the
 * method the run used (`caveats.method`), chosen automatically.
 * @param run - the run.
 * @param option - the element's option descriptor.
 * @returns the option's words, with what empty means for this run.
 */
export function ranOptionWords(
    run: Readonly<{ algorithm: string; status: Run["status"]; caveats: Pick<Caveats, "method"> }>,
    option: OptionDescriptor,
): ReturnType<typeof optionWords> {
    const words = optionWords(run.algorithm, option);
    const used = run.status === "succeeded" ? run.caveats.method : undefined;

    return used !== undefined && option.type === "enum" && option.values?.some((choice) => choice.value === used)
        ? { ...words, empty: `${words.choice(used)}, chosen automatically` }
        : words;
}
