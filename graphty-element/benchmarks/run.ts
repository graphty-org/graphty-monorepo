/**
 * Node benchmark runner for graphty-element's Node-safe sets modules. Prints one table per group
 * and appends the session to `benchmarks/results/<host>-<node>.json`. Timings are recorded beside
 * the design's projections (design/sets/sets-design.md section 6.5), never asserted.
 *
 * Inputs are seeded Barabasi-Albert graphs (m = 5) from @graphty/graph-samples at 100k nodes, or
 * 1M with GRAPHTY_BENCH_SCALE=large.
 *
 * Usage (from the package directory):
 *
 *   npm run benchmark                                  # every group
 *   npx tsx benchmarks/run.ts sets                     # selected groups
 *   GRAPHTY_BENCH_SCALE=large npm run benchmark        # the 1M rows
 *   node --expose-gc --import tsx benchmarks/run.ts    # GC before every run for exact memory deltas
 *   npx tsx benchmarks/run.ts --no-save                # do not append to benchmarks/results
 */

import { fromEdgeArrays, type GraphSnapshot, makeMask } from "@graphty/graph-format";
import { barabasiAlbertGraph } from "@graphty/graph-samples/generators";

import { revisionOf } from "../src/catalog/sets/hash";
import type { EdgeMember, NodeId, SetDefinition } from "../src/catalog/types";
import { EDGE_ID_COLUMN, stableEdgeMember } from "../src/data/edgeIdentity";
import { GraphStore } from "../src/data/GraphStore";
import { ingestEdge, ingestNode } from "../src/data/ingest";
import { createGraphSession, scopeResolverOfSession } from "../src/session/GraphSession";
import type { GraphSession } from "../src/session/types";
import { createScopeApi, edgeSpaceOf, ElementMask, nodeSpaceOf } from "../src/session/scope/index";
import { combineMasks, createMaterialiser } from "../src/session/sets/algebra";
import { addEdgeRow, digestOf, edgeMemberKey, resolveFixed, resolveScope } from "../src/session/sets/resolve";
import { createSetsApi, sessionEdgeMember } from "../src/session/sets/SetsApi";
import { appendSession, bench, type BenchResult, benchTimed, printTable } from "./harness";

const LARGE = process.env.GRAPHTY_BENCH_SCALE === "large";
const NODES = LARGE ? 1_000_000 : 100_000;
const LABEL = LARGE ? "1M" : "100k";

/**
 * The sets rows: the revision of a fixed set of every node, and of as many listed edges.
 * @returns The results.
 */
function runSetsBenchmarks(): BenchResult[] {
    const graph = barabasiAlbertGraph({ n: NODES, m: 5, seed: 1 });
    const nodes = Array.from({ length: NODES }, (_, i) => i);
    const edges: EdgeMember[] = Array.from({ length: NODES }, (_, i) => ({
        source: graph.src[i],
        target: graph.dst[i],
        id: `e${i}`,
    }));
    const byNodes: SetDefinition = { kind: "fixed", nodes, reading: "induced" };
    const byEdges: SetDefinition = { kind: "fixed", nodes: [], edges, reading: "listed" };
    const opts = { items: NODES, unit: "members" };

    return [
        bench("sets", `revisionOf(fixed, ${LABEL} nodes)`, { setup: () => byNodes, run: revisionOf }, opts),
        bench("sets", `revisionOf(fixed, ${LABEL} listed edges)`, { setup: () => byEdges, run: revisionOf }, opts),
    ];
}

/**
 * The resolver as it was before bitmaps: a Set of the member ids, a walk over every edge testing
 * both endpoints against it, a Set of the edge ids, and a fold over every id string. The baseline
 * the bitmap rows are recorded beside.
 * @param snapshot - The graph.
 * @param ids - The member node ids.
 * @returns The digest text, to keep the work live.
 */
function setBasedResolve(snapshot: GraphSnapshot, ids: readonly NodeId[]): string {
    const nodes = new Set<NodeId>();
    for (const id of ids) {
        if (snapshot.ids.indexOf(id) >= 0) {
            nodes.add(id);
        }
    }

    const space = edgeSpaceOf(snapshot);
    const edges = new Set<string>();
    const { src, dst } = snapshot.edgeList();
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (nodes.has(snapshot.ids.idOf(src[e])) && nodes.has(snapshot.ids.idOf(dst[e]))) {
            edges.add(space.idOf(e));
        }
    }

    let fold = 0x811c9dc5;
    for (const id of [...nodes, ...edges]) {
        const text = typeof id === "number" ? `#${id}` : `$${id}`;
        for (let at = 0; at < text.length; at++) {
            fold = Math.imul(fold ^ text.charCodeAt(at), 0x01000193) >>> 0;
        }
    }

    return fold.toString(16);
}

/**
 * The resolution rows (design 6.5): a 50% node list, a fixed 50% set with and without its edge
 * pass, and the digest of "visible", each beside the Set-based cost it replaces.
 * @returns The results.
 */
function runResolveBenchmarks(): BenchResult[] {
    const graph = barabasiAlbertGraph({ n: NODES, m: 5, seed: 1 });
    const snapshot = fromEdgeArrays(graph);
    const half = Array.from({ length: Math.floor(NODES / 2) }, (_, i) => 2 * i);
    const nodeSpace = nodeSpaceOf(snapshot);
    const edgeSpace = edgeSpaceOf(snapshot);
    const visibleNodes = new ElementMask<NodeId>(() => nodeSpace, snapshot.nodeCount);
    visibleNodes.grow(snapshot.nodeCount);
    visibleNodes.fill();
    const visibleEdges = new ElementMask<string>(() => edgeSpace, snapshot.edgeCount);
    visibleEdges.grow(snapshot.edgeCount);
    visibleEdges.fill();
    const visibility = { nodes: () => visibleNodes, edges: () => visibleEdges };
    const opts = { items: snapshot.edgeCount, unit: "edges" };
    const label = `${LABEL} / ${snapshot.edgeCount} edges`;
    // Warm the lazily computed identity columns once, as a session's store would have them.
    digestOf(resolveScope("graph", { snapshot }), snapshot);

    return [
        bench(
            "resolve",
            `resolveNow({ nodes }) 50%, counts only, ${label}`,
            { setup: () => createScopeApi({ snapshot: () => snapshot }), run: (api) => api.resolveNow({ nodes: half }).edgeCount },
            opts,
        ),
        bench("resolve", `old Set-based resolve + fold, 50%, ${label}`, { setup: () => half, run: (ids) => setBasedResolve(snapshot, ids) }, opts),
        bench(
            "resolve",
            `resolveFixed induced 50% (with edge pass), ${label}`,
            { setup: () => ({ kind: "fixed", nodes: half, reading: "induced" }) as const, run: (d) => resolveFixed(d, { snapshot }) },
            opts,
        ),
        bench(
            "resolve",
            `resolveFixed listed 50% (no edge pass), ${label}`,
            { setup: () => ({ kind: "fixed", nodes: half, reading: "listed" }) as const, run: (d) => resolveFixed(d, { snapshot }) },
            opts,
        ),
        bench(
            "resolve",
            `digest of "visible", nothing hidden, ${label}`,
            { setup: () => resolveScope("visible", { snapshot, visibility }), run: (r) => digestOf(r, snapshot) },
            opts,
        ),
    ];
}

/**
 * The listed rows (design 6.5, "first resolution of a 1M-edge fixed set"): a listed set's first
 * resolution, which builds its binding plan, over a graph ingested through the element's store so
 * every edge carries its counter and identity columns. Every other edge at 100k scale; one million
 * edges at the large scale. Bound by identity (a set loaded from a file, no seeds) and seeded (a
 * set built through the doors in this session: one merge of the edge-id column).
 * @returns The results.
 */
function runListedBenchmarks(): BenchResult[] {
    const graph = barabasiAlbertGraph({ n: NODES, m: 5, seed: 1 });
    const store = new GraphStore({
        directed: false,
        positionScale: () => 1,
        onReplaced: () => undefined,
        onNodeRemap: () => undefined,
        onEdgeRemap: () => undefined,
    });
    for (let i = 0; i < NODES; i++) {
        ingestNode(store, i, {});
    }

    store.openLoad();
    for (let e = 0; e < graph.src.length; e++) {
        ingestEdge(store, graph.src[e], graph.dst[e], 1);
    }

    store.closeLoad();
    const snapshot = store.getSnapshot();
    const step = LARGE ? 5 : 2;
    const members: EdgeMember[] = [];
    const seeds = new Map<string, number>();
    const counters = snapshot.edges.requireTyped(EDGE_ID_COLUMN, "u32").data;
    for (let e = 0; e < snapshot.edgeCount; e += step) {
        const member = stableEdgeMember(snapshot, e);
        members.push(member);
        seeds.set(edgeMemberKey(member), counters[e]);
    }

    const fresh = (): Extract<SetDefinition, { kind: "fixed" }> => ({ kind: "fixed", nodes: [], edges: members, reading: "listed" });
    const opts = { items: members.length, unit: "members" };
    const label = `${members.length} of ${snapshot.edgeCount} edges`;

    return [
        bench("listed", `first resolution, by identity, ${label}`, { setup: fresh, run: (d) => resolveFixed(d, { snapshot }).edgeCount }, opts),
        bench(
            "listed",
            `first resolution, seeded (merge), ${label}`,
            { setup: fresh, run: (d) => resolveFixed(d, { snapshot }, { counters: seeds, version: 1 }).edgeCount },
            opts,
        ),
    ];
}

/**
 * A seeded Barabasi-Albert graph in a store and a session over it, as a session's data layer
 * would hold it: every edge carries its counter and identity columns.
 * @returns The session and its snapshot.
 */
function sessionOverGraph(): { session: GraphSession; snapshot: GraphSnapshot } {
    const graph = barabasiAlbertGraph({ n: NODES, m: 5, seed: 1 });
    const store = new GraphStore({
        directed: false,
        positionScale: () => 1,
        onReplaced: () => undefined,
        onNodeRemap: () => undefined,
        onEdgeRemap: () => undefined,
    });
    for (let i = 0; i < NODES; i++) {
        ingestNode(store, i, {});
    }

    store.openLoad();
    for (let e = 0; e < graph.src.length; e++) {
        ingestEdge(store, graph.src[e], graph.dst[e], 1);
    }

    store.closeLoad();
    const session = createGraphSession({ store });

    return { session, snapshot: session.data.snapshot() };
}

/**
 * The algebra rows (design 6.5, 7): each of the four combinations of two large sets, one read
 * induced (every other node) and one listed (every third edge), so the edge-first path runs.
 * @returns The results.
 */
function runAlgebraBenchmarks(): BenchResult[] {
    const graph = barabasiAlbertGraph({ n: NODES, m: 5, seed: 1 });
    const snapshot = fromEdgeArrays(graph);
    const induced = resolveFixed({ kind: "fixed", nodes: Array.from({ length: Math.ceil(NODES / 2) }, (_, i) => 2 * i), reading: "induced" }, { snapshot });
    const listedEdges = makeMask(snapshot.edgeCount);
    const listedNodes = makeMask(snapshot.nodeCount);
    for (let e = 0; e < snapshot.edgeCount; e += 3) {
        addEdgeRow(e, snapshot, listedNodes, listedEdges);
    }

    const operands = [
        { nodes: induced.nodes, edges: induced.edges, induced: true },
        { nodes: listedNodes, edges: listedEdges, induced: false },
    ];
    const opts = { items: snapshot.edgeCount, unit: "edges" };
    const label = `${LABEL} / ${snapshot.edgeCount} edges, 50% induced with 33% listed`;

    return (["union", "intersection", "difference", "symmetric-difference"] as const).map((op) =>
        bench("algebra", `combineMasks ${op}, ${label}`, { setup: () => operands, run: (of) => combineMasks(op, of, snapshot) }, opts),
    );
}

/**
 * The door rows (design 6.5): `createFrom("visible")` with no filter, which stores induced, and
 * `createFrom` of a large listed scope, in total and its synchronous commit alone. Each run gets
 * a fresh session, so no resolution is served from a cache an earlier run filled.
 * @returns The results.
 */
async function runDoorBenchmarks(): Promise<BenchResult[]> {
    const visible = await benchTimed("doors", `createFrom("visible"), no filter, ${LABEL} (projection at 1M: under 200 ms)`, async () => {
        const { session } = sessionOverGraph();
        const start = performance.now();
        await session.sets.createFrom("visible");

        return performance.now() - start;
    });

    const commits: number[] = [];
    const total = await benchTimed("doors", `createFrom of a listed scope of every other edge, ${LABEL}, total`, async () => {
        const { session, snapshot } = sessionOverGraph();
        const resolver = scopeResolverOfSession(session);
        const edgeMember = (id: string): ReturnType<typeof sessionEdgeMember> => sessionEdgeMember(snapshot, id, () => undefined, null);
        const real = createMaterialiser({
            snapshot: () => session.data.snapshot(),
            resolve: (spec) => resolver.resolutionOf(spec),
            readingOf: (spec) => resolver.readingOf(spec),
            edgeMember,
        });
        let resolved = 0;
        const sets = createSetsApi({
            edgeMember,
            materialise: {
                ...real,
                from: async (source, reading) => {
                    const concrete = await real.from(source, reading);
                    resolved = performance.now();

                    return concrete;
                },
            },
        });
        const space = edgeSpaceOf(snapshot);
        const edges = Array.from({ length: Math.floor(snapshot.edgeCount / 2) }, (_, i) => space.idOf(2 * i));
        const start = performance.now();
        await sets.createFrom({ define: { kind: "fixed", nodes: [], edges, reading: "listed" } }, { reading: "listed" });
        const end = performance.now();
        commits.push(end - resolved);

        return end - start;
    });
    // The first entry is the warm-up's, as in every other row.
    const measured = commits.slice(1).sort((x, y) => x - y);
    const commit: BenchResult = {
        ...total,
        name: `createFrom of a listed scope of every other edge, ${LABEL}, synchronous commit (projection at 5M edges: under 50 ms)`,
        medianMs: measured[Math.floor(measured.length / 2)],
        minMs: measured[0],
        maxMs: measured[measured.length - 1],
    };

    return [visible, total, commit];
}

const GROUPS: Readonly<Record<string, () => BenchResult[] | Promise<BenchResult[]>>> = {
    sets: runSetsBenchmarks,
    resolve: runResolveBenchmarks,
    listed: runListedBenchmarks,
    algebra: runAlgebraBenchmarks,
    doors: runDoorBenchmarks,
};

const args = process.argv.slice(2);
const save = !args.includes("--no-save");
const selected = args.filter((a) => !a.startsWith("--"));
const names = selected.length === 0 ? Object.keys(GROUPS) : selected;

const all: BenchResult[] = [];
for (const name of names) {
    const group = GROUPS[name] as (() => BenchResult[] | Promise<BenchResult[]>) | undefined;
    if (group === undefined) {
        console.error(`unknown benchmark group "${name}"; known: ${Object.keys(GROUPS).join(", ")}`);
        process.exitCode = 1;
        break;
    }
    console.log(`\n== ${name} (${process.version}, median of 5 runs, ${LABEL} scale)\n`);
    const results = await group();
    printTable(results);
    all.push(...results);
}
if (save && all.length > 0) {
    console.log(`\nresults appended to ${appendSession(all)}`);
}
