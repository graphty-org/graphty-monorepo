/**
 * @file Browser timing rows for sets at scale (design/sets/sets-design.md 6.2 and 6.5). Recorded,
 * never asserted: each row prints beside its projection and the `bench-browser` project appends it
 * to `benchmarks/results/browser-<host>.jsonl`.
 *
 * - The freeze row: one node added while five layers over fixed sets and five over expression
 *   rules are live. Timed from the add to the first repaint after it (the fixed-set layers, which
 *   the added node does not affect, repaint nothing; the rule layers, which it joins, repaint that
 *   one node), to every layer repainted, the
 *   time spent resolving inside the scheduler's frames, and then a 200-row `scope.count` panel
 *   over the ten sets.
 * - One 50% scoped run's input in both orientations: the declared and the undirected derived
 *   snapshots a run over half the nodes asks for, under one holder, as the run would.
 *
 * 100k nodes by default; GRAPHTY_BENCH_SCALE=large adds 1M nodes / 5M edges and 1M / 10M.
 */

import { barabasiAlbertGraph } from "@graphty/graph-samples/generators";
import { assert, it } from "vitest";

import { DerivedInputs } from "../../src/algorithms/input/derivedInputs";
import { createScopedInput } from "../../src/algorithms/input/ScopedInput";
import type { LayerSpec, SetId } from "../../src/catalog/types";
import { DataConfig } from "../../src/config/DataConfig";
import { createEdgeCounter } from "../../src/data/edgeIdentity";
import { GraphStore } from "../../src/data/GraphStore";
import { ingestEdge, ingestNode } from "../../src/data/ingest";
import { createGraphSession, setsNotifierOfSession } from "../../src/session/GraphSession";
import { resolveFixed } from "../../src/session/sets/resolve";
import type { ElementSession, GraphSession, SessionAttributes } from "../../src/session/types";

const LARGE = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BENCH_SCALE === "large";
const SIZES: readonly { label: string; n: number; m: number }[] = [
    { label: "100k / 500k", n: 100_000, m: 5 },
    ...(LARGE
        ? [
              { label: "1M / 5M", n: 1_000_000, m: 5 },
              { label: "1M / 10M", n: 1_000_000, m: 10 },
          ]
        : []),
];

/**
 * Print one row and hand it to the project's appender.
 * @param name - the row
 * @param ms - the milliseconds
 * @param projection - the design's projection
 */
function record(name: string, ms: number, projection: string): void {
    console.log(`${name}: ${ms.toFixed(1)} ms (projection: ${projection})`);
    console.log(
        `bench-row ${JSON.stringify({ date: new Date().toISOString(), runner: "browser", agent: navigator.userAgent, name, medianMs: ms, projection })}`,
    );
}

/**
 * A store holding a generated graph as one load, every node carrying `w` from 0 to 99.
 * @param n - nodes
 * @param m - edges per added node
 * @returns the store and each node's attributes by row
 */
function storeOf(n: number, m: number): { store: GraphStore; attributes: Map<number, SessionAttributes> } {
    const graph = barabasiAlbertGraph({ n, m, seed: 1 });
    const store = new GraphStore({
        directed: false,
        positionScale: () => 1,
        onNodeRemap: () => undefined,
        onEdgeRemap: () => undefined,
        onReplaced: () => undefined,
        edgeCounter: createEdgeCounter(),
    });
    const attributes = new Map<number, SessionAttributes>();
    store.openLoad();
    for (let i = 0; i < n; i++) {
        attributes.set(ingestNode(store, i, {}).index, { w: i % 100 });
    }

    for (let e = 0; e < graph.src.length; e++) {
        ingestEdge(store, graph.src[e], graph.dst[e], 1);
    }

    store.closeLoad();

    return { store, attributes };
}

/** Let pending timers, microtasks and a frame run. */
async function tick(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * A layer painting a set.
 * @param id - the set
 * @returns the layer
 */
function layerOver(id: SetId): LayerSpec {
    return { name: `over ${id}`, selector: { match: "member", of: { set: id } }, set: { "node.color": "#ff0000" } };
}

/**
 * Wait until no watch waits for a frame and no pass is painting.
 * @param session - the session
 */
async function settled(session: GraphSession): Promise<void> {
    const notifier = setsNotifierOfSession(session);
    const { paint } = session as ElementSession;
    while (notifier.pending > 0 || paint.painting()) {
        await tick();
    }
}

for (const size of SIZES) {
    it(`a freeze with live sets at ${size.label}`, async () => {
        const { store, attributes } = storeOf(size.n, size.m);
        const session = createGraphSession({
            store,
            records: { nodeAttributes: (index) => attributes.get(index), edgeAttributes: () => undefined },
            config: { data: DataConfig.parse({ directed: false }) },
        });
        session.data.snapshot();
        // Time spent inside the scheduler's frames: the re-resolution, apart from the paint.
        let resolving = 0;
        setsNotifierOfSession(session).useFrames((callback) => {
            const handle = requestAnimationFrame(() => {
                const began = performance.now();
                callback();
                resolving += performance.now() - began;
            });
            return () => {
                cancelAnimationFrame(handle);
            };
        });

        const sets: SetId[] = [];
        for (let k = 0; k < 5; k++) {
            sets.push(
                session.sets.create({
                    kind: "fixed",
                    nodes: Array.from({ length: size.n / 10 }, (_, i) => i * (k + 2)),
                    reading: "induced",
                }),
            );
        }

        for (let k = 0; k < 5; k++) {
            sets.push(
                session.sets.create({
                    kind: "rule",
                    where: `data.w < \`${String(10 * (k + 1))}\``,
                    reading: "induced",
                }),
            );
        }

        for (const id of sets) {
            await session.styles.add(layerOver(id));
        }

        const { paint, styles } = session as ElementSession;
        await paint.repaintAll(styles.compiled(), { signal: new AbortController().signal, report: () => undefined });
        await settled(session);

        let first = 0;
        paint.onPainted(() => {
            first ||= performance.now();
        });
        resolving = 0;
        const start = performance.now();
        attributes.set(ingestNode(store, size.n, {}).index, { w: 0 });
        session.data.snapshot();
        const frozen = performance.now();
        await settled(session);
        const all = performance.now();

        const panel = performance.now();
        for (let row = 0; row < 200; row++) {
            await session.scope.count({ set: sets[row % sets.length] });
        }
        const counted = performance.now();

        record(`freeze with live sets, add one node, the freeze itself, ${size.label}`, frozen - start, "none stated");
        record(`freeze with live sets, to the first repaint after it, ${size.label}`, first - start, "under 200 ms");
        record(
            `freeze with live sets, to every layer repainted, ${size.label}`,
            all - start,
            "within the re-resolution time",
        );
        record(
            `freeze with live sets, the re-resolution alone (inside the scheduler's frames), ${size.label}`,
            resolving,
            "none stated",
        );
        record(
            `freeze with live sets, then a 200-row scope.count panel, ${size.label}`,
            counted - panel,
            "none stated",
        );
        assert.isAbove(first, 0, "a pass ran after the freeze");
        session.dispose();
    });

    it(`one 50% scoped run's input in both orientations at ${size.label}`, () => {
        const { store } = storeOf(size.n, size.m);
        const snapshot = store.getSnapshot();
        const half = Array.from({ length: size.n / 2 }, (_, i) => 2 * i);
        const times: number[] = [];
        for (let run = 0; run < 3; run++) {
            const resolution = resolveFixed({ kind: "fixed", nodes: half, reading: "induced" }, { snapshot, store });
            const inputs = new DerivedInputs({ release: () => undefined });
            const holder = {};
            const binding = { inputs, holder, scope: () => ({ graph: snapshot, resolution }) };
            const data = {
                getSnapshot: () => store.getSnapshot(),
                undirected: (graph: typeof snapshot) => store.undirected(graph),
            };
            const began = performance.now();
            const declared = createScopedInput(data, "declared", undefined, binding).derived();
            const undirected = createScopedInput(data, "undirected", undefined, binding).derived();
            times.push(performance.now() - began);
            assert.isAbove(declared.snapshot.nodeCount + undirected.snapshot.nodeCount, 0);
            inputs.releaseHolder(holder);
            inputs.dispose();
        }

        record(
            `50% scoped run input, declared and undirected, ${size.label}`,
            times.sort((a, b) => a - b)[1],
            "must complete",
        );
    });
}
