/**
 * @file Nothing is still drawn from the element's own bootstrap paint once the graph is on screen.
 *
 * WHAT THE BOOTSTRAP PAINT IS. A node exists before the style stack can address it -- the store
 * hands out the dense row index a pass is keyed by only once the node has been taken -- so
 * `StylePainter.bootstrapNodePaint` fills the gap with the element's own defaults under a
 * reserved mesh key, and the first pass replaces it. An element still wearing that key after the
 * picture has settled is therefore not a styling choice and not a default: it is an element no
 * repaint ever reached, and it will go on ignoring every layer a consumer adds.
 *
 * WHY IT IS READ OFF THE SCENE AND NOT OFF THE STYLE MODEL. The model was right the whole time.
 * Measured on the algorithm stories: the pass had resolved a colour, a size and a shape for every
 * one of the twenty nodes, `styles.explain()` named the layers that painted them, and the meshes
 * on screen were built from the bootstrap key. What was lost was the hand-over between the two --
 * the dirty set the pass announces and the renderer applies.
 *
 * THE FAULT THIS PINS. Three doors into a repaint fire within a few milliseconds of each other on
 * an ordinary load: the pass a data source's load ends with, the pass a finished algorithm run
 * asks for, and the layer that run's own suggestion adds. The passes interleaved, each one
 * emptying the dirty set the one before it was still painting from, and the renderer was handed
 * one set three times over. Which half of the graph came out unpainted depended only on which
 * door fired last: an algorithm that paints edges left every node on the bootstrap paint, and one
 * that paints nodes left every edge on it.
 */

// A value import, and load-bearing twice over: importing the package defines the custom element,
// and importing the algorithms is what registers them under the names this asks for.
import "../../src/algorithms";

import { afterEach, assert, describe, it } from "vitest";

import { Graphty } from "../../src/graphty-element";
import { bootstrapEdgePaint, bootstrapNodePaint } from "../../src/managers/StylePainter";
import cats from "../helpers/cat-social-network-2.json";

/**
 * The graph the stories draw, as a URL.
 *
 * A URL RATHER THAN THE TEXT, because the two are different load paths and only one of them is
 * the one that broke: a data source handed a document parses it in the same turn of the event
 * loop, and one handed a URL fetches it, which is what puts the load's own repaint alongside the
 * ones the algorithm run starts. The stories read this same file over https; a data: URL is the
 * same path with no network in it.
 */
const CATS = `data:application/json,${encodeURIComponent(JSON.stringify(cats))}`;

/** What the fixture declares, so a short load cannot pass by drawing nothing. */
const EXPECTED = { nodes: 20, edges: 29 };

/** How long the element may take to build its renderer. */
const MOUNT_TIMEOUT_MS = 15000;

/** How long the picture may take to stop changing. */
const STABLE_TIMEOUT_MS = 20000;

/** How long to leave for the frame that applies the last pass's paint. */
const SETTLE_MS = 500;

/** Mounting, loading, running an algorithm and settling is slower than the five-second default. */
const TEST_TIMEOUT_MS = 60000;

/** Where the element is mounted, kept so the test can take it down again. */
let container: HTMLDivElement | null = null;

/**
 * Mount a `<graphty-element>` the way a page does and wait until its graph is live.
 * @returns The mounted element.
 */
async function mount(): Promise<Graphty> {
    container = document.createElement("div");
    container.style.width = "480px";
    container.style.height = "360px";
    document.body.appendChild(container);

    const mounted = document.createElement("graphty-element");

    assert.instanceOf(mounted, Graphty, "importing the package is what defines the custom element");

    mounted.style.width = "100%";
    mounted.style.height = "100%";
    mounted.style.display = "block";
    container.appendChild(mounted);

    const deadline = Date.now() + MOUNT_TIMEOUT_MS;

    while (!mounted.graph.initialized) {
        if (Date.now() > deadline) {
            throw new Error("the element never finished initialising");
        }

        await new Promise((resolve) => setTimeout(resolve, 20));
    }

    return mounted;
}

/**
 * The key each mesh is drawn under, read off the mesh itself: the `styleId` a node writes into
 * its mesh's metadata, the `meshKey` the edge behind a line carries, and the mesh's name for
 * anything else. THE NAME ALONE NO LONGER SAYS. A node whose first pass resolves the same style
 * it was built from keeps its placeholder mesh (rebuilding an identical one cost the size of the
 * scene per node, issue #388) and the instance's name still spells the bootstrap key; the hand-over
 * writes the session's key into the metadata, so an element the hand-over never reached is the one
 * whose metadata still says bootstrap.
 */
function drawnFromBootstrap(element: Graphty): Record<string, number> {
    const keys = [bootstrapNodePaint().meshKey, bootstrapEdgePaint().meshKey];
    const tally: Record<string, number> = {};

    for (const mesh of element.graph.scene.meshes) {
        const metadata = mesh.metadata as { styleId?: unknown; parentEdge?: { meshKey?: unknown } } | undefined;
        let drawnUnder = mesh.name;

        if (typeof metadata?.styleId === "string") {
            drawnUnder = metadata.styleId;
        } else if (typeof metadata?.parentEdge?.meshKey === "string") {
            drawnUnder = metadata.parentEdge.meshKey;
        }

        if (keys.some((key) => drawnUnder.includes(key))) {
            tally[mesh.name] = (tally[mesh.name] ?? 0) + 1;
        }
    }

    return tally;
}

describe("once the picture has settled", () => {
    afterEach(() => {
        container?.remove();
        container = null;
    });

    it(
        "no element is still drawn from the paint the element gives one it has not styled yet",
        async () => {
            const element = await mount();

            // The story's own order: what to run, and the reader's layer, before the data -- a
            // layer is a standing instruction rather than a pass over what happens to be loaded.
            element.runAlgorithmsOnLoad = true;
            element.algorithmsOnLoad = ["graphty:kruskal"];
            element.layoutBehavior = { layout: { preSteps: 200 } };

            // Fired and forgotten, which is the order a render function is forced into.
            void element.session.styles.add({
                name: "Reader - dim every edge",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.color": "#999999" },
            });

            element.dataSourceConfig = { data: CATS };
            element.dataSource = "json";
            element.layoutConfig = { seed: 42 };
            element.layout = "ngraph";

            await element.waitForStableFrame({ timeoutMs: STABLE_TIMEOUT_MS });

            const { graph, session } = element;

            graph.applySuggestedStyles("graphty:kruskal");

            await graph.operationQueue.waitForCompletion();
            await session.styles.settled();
            await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

            assert.deepStrictEqual(
                { nodes: session.status.counts.nodes, edges: session.status.counts.edges },
                EXPECTED,
                "the fixture loaded whole, so what follows is about paint and not about a short load",
            );

            const stranded = drawnFromBootstrap(element);

            assert.deepStrictEqual(
                stranded,
                {},
                "every node and edge has been repainted by the style stack since it was built; the meshes " +
                    `still built from the element's own fallback paint are ${JSON.stringify(stranded)}`,
            );
        },
        TEST_TIMEOUT_MS,
    );
});
