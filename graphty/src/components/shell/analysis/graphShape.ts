/**
 * One O(n+m) pass over the records the shell already holds, and nothing more.
 *
 * Spec 7.5 fixes the ceiling this module works under: "Templates are size-aware. A
 * template never schedules a computation above O(n+m) on its own; anything more
 * expensive is offered as an action." So this file computes connected parts, the giant
 * part's size, isolated nodes, self loops and parallel edges -- all of which one pass
 * answers -- and computes no diameter and no path lengths, which the graph-summary
 * reading therefore states as a component sentence rather than an "at most N steps"
 * sentence.
 *
 * Directedness is the other thing this module is careful about. graphty-element has no
 * graph-level directed flag; only Pajek and yEd GraphML write a per-edge `directed`
 * key, and the shell's `graphInfo.graphType.directed` DEFAULTS TO TRUE. Branching the
 * 7.3 rule table on that default would assert a direction nobody read off the data, so
 * the answer here is tri-state and "unknown" is a real answer that rule 3 (Who has
 * influence) declines to fire on. The parallel-edge count reads that same tri-state:
 * A->B plus B->A is one repeated pair in an undirected graph and two distinct edges in
 * a directed one, so the count is only direction-blind when the records SAID undirected.
 *
 * App shell progressive disclosure design, section 7 "Novice path" (7.3 Insights strip,
 * 7.5 Plain-language readings).
 */

/** The raw records the shell already holds (`ShellGraphData`). @public */
export interface GraphShapeInput {
    /** Node records as `handle.getData()` returns them. */
    readonly nodes: readonly Readonly<Record<string, unknown>>[];
    /** Edge records as `handle.getData()` returns them. */
    readonly edges: readonly Readonly<Record<string, unknown>>[];
}

/** What one O(n+m) pass over the loaded records can honestly say. @public */
export interface GraphShape {
    /** Nodes loaded. */
    readonly nodeCount: number;
    /** Edges loaded. */
    readonly edgeCount: number;
    /** Connected components, ignoring direction. */
    readonly connectedPartCount: number;
    /** Nodes in the largest component. */
    readonly largestPartNodeCount: number;
    /** Components of exactly one node. */
    readonly isolatedNodeCount: number;
    /** Edges whose endpoints are the same node. */
    readonly selfLoopCount: number;
    /**
     * Edges repeating an endpoint pair already seen. The pair is ordered unless the
     * records said undirected, so a reciprocal pair is never counted as parallel on a
     * graph whose direction was measured directed or never measured at all.
     */
    readonly parallelEdgeCount: number;
    /** Whether every component but the largest is a single node. */
    readonly smallPartsMostlySingleNodes: boolean;
    /** "directed" or "undirected" only when EVERY edge record says so; otherwise "unknown". */
    readonly directedness: "directed" | "undirected" | "unknown";
}

/** What an empty graph's shape is: every count zero, and nothing claimed about direction. */
const EMPTY_SHAPE: GraphShape = {
    nodeCount: 0,
    edgeCount: 0,
    connectedPartCount: 0,
    largestPartNodeCount: 0,
    isolatedNodeCount: 0,
    selfLoopCount: 0,
    parallelEdgeCount: 0,
    smallPartsMostlySingleNodes: true,
    directedness: "unknown",
};

/**
 * The id an endpoint field carries, whether it is a string, a number or a node object.
 *
 * An empty string is not an id, so it reads as absent: a record that cannot name its
 * endpoint must not be unioned into a component with every other such record.
 * @param value - whatever the endpoint field holds.
 * @returns the id as a string, or null when the field names no node.
 */
export function edgeEndpointId(value: unknown): string | null {
    if (typeof value === "string") {
        return value.length > 0 ? value : null;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }

    if (typeof value === "object" && value !== null) {
        const record = value as Record<string, unknown>;
        if ("id" in record) {
            return edgeEndpointId(record.id);
        }
    }

    return null;
}

/**
 * The two ends of an edge record.
 *
 * `src`/`dst` is preferred because that is the spelling `Graphty.tsx`'s `getData`
 * writes; `source`/`target` is accepted because that is the spelling most source files
 * carry into `edge.data`, which `getData` spreads over the record.
 *
 * EXPORTED ON 2026-09-14, and the reason is the defect it retires. `AppShell` had a
 * SECOND, private reader of the same fact -- an `edgeEndpoint` helper and a
 * `neighborsOf` loop that read `edge.source` and `edge.target` and nothing else. Those
 * two fields are exactly the two `getData` never writes (`Graphty.tsx:280-286` builds
 * `{id, src, dst, ...edge.data}`), so every edge yielded no endpoint, every iteration was
 * skipped, and the node inspector reported "Expand 0 neighbors" for every node on every
 * dataset. It read as an id-type bug and was not one: a JSON file whose edge records
 * happen to be spelled `{"source":..,"target":..}` restored the two names through the
 * `...edge.data` spread and worked, while karate.gml could not -- `GMLDataSource.ts`
 * :302-310 builds `{src, dst, ...edge}` and then deliberately DELETES `source` and
 * `target` from the data. Verified in the browser: node 34 on Karate Club reported 0
 * neighbours while its own result card said 17 links.
 *
 * The fix was not to add the two missing field names to the second reader. It was to
 * delete the second reader, because two spellings of one fact is what let them disagree
 * in the first place, and adding the names would have left the next call site free to
 * invent a third spelling. `edgeEndpointId` beside this also accepts an endpoint given as
 * a node OBJECT and rejects the empty string as an id, neither of which the private
 * helper did, so the shell's neighbour list got strictly better as well as correct.
 * @param edge - one edge record.
 * @returns both endpoint ids, either of which may be null.
 * @public
 */
export function edgeEndpoints(edge: Readonly<Record<string, unknown>>): {
    readonly source: string | null;
    readonly target: string | null;
} {
    const source = edgeEndpointId(edge.src) ?? edgeEndpointId(edge.source);
    const target = edgeEndpointId(edge.dst) ?? edgeEndpointId(edge.target);

    return { source, target };
}

/** A disjoint-set forest over node ids, which is what makes the pass O(n+m). */
class UnionFind {
    readonly #parent = new Map<string, string>();
    readonly #size = new Map<string, number>();

    /**
     * Adds an id as its own singleton set, if it is not already known.
     * @param id - the node id.
     */
    add(id: string): void {
        if (!this.#parent.has(id)) {
            this.#parent.set(id, id);
            this.#size.set(id, 1);
        }
    }

    /**
     * Whether an id has been added.
     * @param id - the node id.
     * @returns true when the id is in the forest.
     */
    has(id: string): boolean {
        return this.#parent.has(id);
    }

    /**
     * The representative of an id's set, with path compression.
     * @param id - the node id.
     * @returns the set's representative id.
     */
    find(id: string): string {
        let root = id;
        let parent = this.#parent.get(root) ?? root;
        while (parent !== root) {
            root = parent;
            parent = this.#parent.get(root) ?? root;
        }

        let walk = id;
        while (walk !== root) {
            const next = this.#parent.get(walk) ?? root;
            this.#parent.set(walk, root);
            walk = next;
        }

        return root;
    }

    /**
     * Merges the sets holding two ids, smaller into larger.
     * @param a - one node id.
     * @param b - the other node id.
     */
    union(a: string, b: string): void {
        const rootA = this.find(a);
        const rootB = this.find(b);
        if (rootA === rootB) {
            return;
        }

        const sizeA = this.#size.get(rootA) ?? 1;
        const sizeB = this.#size.get(rootB) ?? 1;
        const [big, small] = sizeA >= sizeB ? [rootA, rootB] : [rootB, rootA];
        this.#parent.set(small, big);
        this.#size.set(big, sizeA + sizeB);
        this.#size.delete(small);
    }

    /**
     * The size of every set in the forest.
     * @returns one count per component, in no particular order.
     */
    componentSizes(): number[] {
        const sizes = new Map<string, number>();
        for (const id of this.#parent.keys()) {
            const root = this.find(id);
            sizes.set(root, (sizes.get(root) ?? 0) + 1);
        }

        return Array.from(sizes.values());
    }
}

/**
 * Whether every edge agreed on the same value of a `directed` key.
 * @param edges - the edge records.
 * @returns "directed" or "undirected" only when every edge said so, else "unknown".
 */
function readDirectedness(edges: readonly Readonly<Record<string, unknown>>[]): GraphShape["directedness"] {
    if (edges.length === 0) {
        return "unknown";
    }

    let sawTrue = false;
    let sawFalse = false;

    for (const edge of edges) {
        const value = edge.directed;
        if (value === true) {
            sawTrue = true;
        } else if (value === false) {
            sawFalse = true;
        } else {
            return "unknown";
        }
    }

    if (sawTrue && !sawFalse) {
        return "directed";
    }

    if (sawFalse && !sawTrue) {
        return "undirected";
    }

    return "unknown";
}

/**
 * One pass over the records. Nothing above O(n+m); no diameter, no path lengths.
 *
 * Direction is ignored for components, because 7.5's component sentence counts parts a
 * user can see, not strongly connected ones. That licence stops at components: parallel
 * edges read the measured directedness instead. An edge naming an endpoint that is not
 * in the node list unions nothing -- a node that was not loaded cannot be placed in a
 * part -- but it is still counted for self loops and parallel pairs, which are
 * properties of the edge record itself.
 * @param input - the loaded node and edge records.
 * @returns everything one pass can honestly say about the graph's shape.
 */
export function computeGraphShape(input: GraphShapeInput): GraphShape {
    const { nodes, edges } = input;

    if (nodes.length === 0 && edges.length === 0) {
        return EMPTY_SHAPE;
    }

    const forest = new UnionFind();
    for (const node of nodes) {
        const id = edgeEndpointId(node.id);
        if (id !== null) {
            forest.add(id);
        }
    }

    // A parallel edge is a REPEAT of an endpoint pair, and what counts as a repeat
    // depends on direction: in an undirected graph A->B and B->A are the same pair, in a
    // directed graph they are two edges. Direction here is a tri-state whose usual value
    // is "unknown", so the pair key is ORDERED unless the records said undirected. An
    // ordered repeat is a repeat under either reading, so the count never asserts a
    // parallel edge that direction would explain away; where direction was never
    // measured it can only under-report, and 6.2 draws no Counts row for a zero.
    const directedness = readDirectedness(edges);
    const pairsAreUnordered = directedness === "undirected";
    const seenPairs = new Set<string>();
    let selfLoopCount = 0;
    let parallelEdgeCount = 0;

    for (const edge of edges) {
        const { source, target } = edgeEndpoints(edge);
        if (source === null || target === null) {
            continue;
        }

        if (source === target) {
            selfLoopCount++;
        }

        const pair = pairsAreUnordered && target < source ? [target, source] : [source, target];
        const key = JSON.stringify(pair);
        if (seenPairs.has(key)) {
            parallelEdgeCount++;
        } else {
            seenPairs.add(key);
        }

        if (forest.has(source) && forest.has(target)) {
            forest.union(source, target);
        }
    }

    const componentSizes = forest.componentSizes();
    const largestPartNodeCount = componentSizes.length > 0 ? Math.max(...componentSizes) : 0;
    const isolatedNodeCount = componentSizes.filter((size) => size === 1).length;

    // "Every component but the largest is a single node": one component of the largest
    // size is set aside, and every other component must hold exactly one node. With
    // fewer than two components there are no small parts, so the answer is vacuously
    // true; the reading only consults it in the several-parts branch.
    let largestSeen = false;
    let smallPartsMostlySingleNodes = true;
    for (const size of componentSizes) {
        if (!largestSeen && size === largestPartNodeCount) {
            largestSeen = true;
            continue;
        }

        if (size !== 1) {
            smallPartsMostlySingleNodes = false;
            break;
        }
    }

    return {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        connectedPartCount: componentSizes.length,
        largestPartNodeCount,
        isolatedNodeCount,
        selfLoopCount,
        parallelEdgeCount,
        smallPartsMostlySingleNodes,
        directedness,
    };
}
