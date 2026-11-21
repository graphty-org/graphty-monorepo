/**
 * @file What loading a graph in pages costs the graph store on the "batched" path, where it lets
 * its builder go after each load and rebuilds it on the next write: 1,000,000 edges over 100,000
 * nodes, in ten pages (as `data.more()` pages or ten merged sources arrive). Each page's time and
 * the store's rebuild count are printed as `[builder-paging]` lines, never asserted; what is
 * asserted is the graph the pages made and that rebuilds stay logarithmic in the page count.
 *
 * Run with: npx vitest run --project=bench test/data/builder-release-paging.bench.test.ts
 * (BUILDER_PAGING_PAGES and BUILDER_PAGING_EDGES scale it).
 */

import { assert, describe, it } from "vitest";

import { GraphStore } from "../../src/data/GraphStore";

const PAGES = Number(process.env.BUILDER_PAGING_PAGES ?? 10);
const EDGES = Number(process.env.BUILDER_PAGING_EDGES ?? 1_000_000);
const NODES = EDGES / 10;
/** A safety limit, not a budget. */
const TIMEOUT_MS = 600_000;

describe(`${String(EDGES)} edges loaded in ${String(PAGES)} pages`, { timeout: TIMEOUT_MS }, () => {
    it("rebuilds the let-go builder a few times, not once per page", () => {
        const store = new GraphStore({
            directed: () => true,
            positionScale: () => 1,
            onReplaced: () => undefined,
            onNodeRemap: () => undefined,
            onEdgeRemap: () => undefined,
            denseEdgeIds: () => true,
            releaseBuilder: () => true,
        });
        const pageNodes = NODES / PAGES;
        const pageEdges = EDGES / PAGES;
        for (let page = 0; page < PAGES; page++) {
            const start = performance.now();
            const first = page * pageNodes;
            store.openLoad();
            const { builder } = store;
            for (let id = first; id < first + pageNodes; id++) {
                builder.addNode(id);
            }
            for (let at = 0; at < pageEdges; at++) {
                const row = builder.addEdge(first + (at % pageNodes), first + ((at * 7 + 1) % pageNodes), 1);
                store.stampEdgeId(row, store.nextEdgeId());
            }
            store.account();
            store.closeLoad();
            store.getSnapshot();
            store.releaseIdle();
            const ms = performance.now() - start;
            console.log(
                `[builder-paging] page ${String(page + 1)}: ${ms.toFixed(0)} ms, ${JSON.stringify(store.builderRelease)}`,
            );
        }

        const snapshot = store.getSnapshot();
        assert.strictEqual(snapshot.nodeCount, NODES);
        assert.strictEqual(snapshot.edgeCount, EDGES);
        assert.isAtMost(store.builderRelease.revivals, Math.ceil(Math.log2(PAGES)) + 2);
    });
});
