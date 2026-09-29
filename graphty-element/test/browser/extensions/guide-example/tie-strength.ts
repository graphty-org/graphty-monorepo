import {
    type AlgorithmDescriptor,
    type AlgorithmOutput,
    type AlgorithmRunContext,
    DeclaredAlgorithm,
    declaredCaveats,
    edgeMetricFields,
    forEachChunked,
    metricFieldSpecs,
    type ResultElementValues,
} from "../../../../extend";

/** What a caller may configure about a run. One interface, matching the one option list. */
interface TieStrengthOptions extends Record<string, unknown> {
    strength: string;
}

const TIE_STRENGTH_DESCRIPTOR: AlgorithmDescriptor = {
    // `key` must equal `static type` below: an algorithm has one name.
    key: "tie-strength",
    plainName: "Tie strength",
    technicalName: "share of the weaker end's strength",
    description: "How much of the weaker end's total strength one tie between two nodes carries.",
    category: "structure",
    // The shape fixes the FIELD NAMES, which is how any consumer reads `results.<runId>.value`
    // without opening the catalogue first.
    shape: "edge-metric",
    // Ten descriptors for one measured number, each carrying a published path string a plugin
    // should never have to learn or retype.
    fields: edgeMetricFields({ plainName: "Share of strength", technicalName: "tie share" }),
    // The one thing a reader can configure, declared ONCE: which edge attribute is the strength.
    options: [
        {
            name: "strength",
            plainName: "Strength",
            type: "attribute",
            default: "strength",
            description: "The edge attribute saying how strong each recorded interaction is.",
        },
    ],
    costClass: "instant",
    complexity: "O(n + m)",
};

export class TieStrength extends DeclaredAlgorithm<TieStrengthOptions> {
    static override namespace = "acme";
    static override type = "tie-strength";
    static override descriptor = TIE_STRENGTH_DESCRIPTOR;

    /** Optional: recorded on every run, so a saved result says what produced its numbers. */
    static version = "1.0.0";

    /**
     * Optional: the work over a graph of n nodes and m edges, for the pre-click estimate, in the
     * units of the declared costClass ("instant": elements visited).
     */
    static costUnits = (n: number, m: number): number => n + m;

    override async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        // Options arrive already checked and with the declared default filled in.
        const { strength } = this.schemaOptions;

        // The graph as a graph-format snapshot. Undirected, and every recorded interaction between
        // two nodes merged into one tie whose weight is their SUM. The weights come from the
        // attribute the reader chose; the element fills them and records the choice as the run's
        // weight caveat.
        const input = context.input("undirected", {
            simplify: "sum",
            weight: { attribute: strength, meaning: "strength" },
        });
        const ties = input.subgraph();

        if (ties.edgeCount === 0) {
            return null;
        }

        // A node's strength: the summed weight of every tie it has.
        const nodeStrength = ties.weightedDegree();
        const { src, dst, weights } = ties.edgeList();
        const rows = Array.from({ length: ties.edgeCount }, (_, row) => row);
        const edges: ResultElementValues<string>[] = [];

        // Chunks of 1024, a progress report at the start of each and the frame handed back between
        // them; a cancelled run stops at the next chunk.
        await forEachChunked(context, "Measuring ties", rows, (row) => {
            const weaker = Math.min(nodeStrength[src[row]], nodeStrength[dst[row]]);

            // A tie with no strength at either end has nothing to share: no row, rather than a
            // measurement that was never made.
            if (weaker <= 0) {
                return;
            }

            const value = (weights === null ? 1 : weights[row]) / weaker;

            // Publish by the element's edge id, never by row. One tie stands for every edge
            // merged into it, so the value is each of theirs.
            for (const id of input.subgraphEdgeIds(row)) {
                edges.push({ id, values: { value } });
            }
        });

        return {
            shape: "edge-metric",
            fields: metricFieldSpecs("edge"),
            edges,
            graph: { normalization: "none" },
            // What this run does that its numbers do not admit to, printed unedited to a reader.
            caveats: declaredCaveats({
                direction: "undirected",
                method: "tie weight over the weaker end's strength",
                notes: ["Every edge between the same two nodes is one tie; their strengths are summed."],
            }),
        };
    }
}

DeclaredAlgorithm.register(TieStrength);
