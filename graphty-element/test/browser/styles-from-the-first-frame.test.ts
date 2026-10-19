/**
 * @file A node is drawn with its resolved style from the first frame it is drawn in, while the
 * layout is still moving it.
 *
 * THE DEFECT THIS PINS. An import builds each chunk's nodes and edges as it reads them, from the
 * element's own defaults, and the pass after each chunk did not paint them: the pass the import's
 * end schedules painted the whole graph once. So a load that arrives over time -- a paged network
 * source, a stream -- drew every node in the defaults for the whole of the load, while the layout
 * ran and often until after it had settled. Even a one-chunk import drew the frames between the
 * build and that pass in the defaults. The paged cases hold the source between pages, so the
 * frames drawn while the import is still reading are the ones asserted on.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import type { LayerSpec } from "../../session";
import type { FormatDescriptor } from "../../src/catalog/types";
import { type BaseDataSourceConfig, DataSource, type DataSourceChunk } from "../../src/data/DataSource";
// A value import: importing the package is what defines the `<graphty-element>` custom element.
import { Graphty } from "../../src/graphty-element";
import { bootstrapEdgePaint, bootstrapNodePaint } from "../../src/managers/StylePainter";

/** The pages the source delivers, and the nodes on each: a ring, cut into arcs. */
const PAGES = 3;
const PER_PAGE = 40;
const COUNT = PAGES * PER_PAGE;
const NODES = Array.from({ length: COUNT }, (_, i) => ({ id: `n${i}`, heat: i % 2 === 0 ? 0 : 100 }));
const EDGES = NODES.map((_, i) => ({ src: `n${i}`, dst: `n${(i + 1) % COUNT}` }));

/** Opens the gate the source waits at before its next page; set while it waits. */
let releasePage: (() => void) | null = null;

/** The format the paged source registers under. */
const PAGED_FORMAT = "first-frame-paged";

/**
 * A source that delivers its graph a page at a time and waits for the test between pages, the
 * way a network source waits for its next response.
 */
class PagedSource extends DataSource {
    static type = PAGED_FORMAT;

    static descriptor: FormatDescriptor = {
        id: PAGED_FORMAT,
        plainName: "Paged test source",
        extensions: [".first-frame-paged"],
        mimeTypes: ["application/x-first-frame-paged"],
        canImport: true,
        canExport: false,
        options: [],
    };

    readonly #config: BaseDataSourceConfig;

    /** @param opts - What the host passed. */
    constructor(opts: BaseDataSourceConfig) {
        super(100, PER_PAGE);
        this.#config = opts;
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.#config;
    }

    /** @yields One page of nodes and the edges leaving them, then waits for the gate. */
    async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        for (let page = 0; page < PAGES; page++) {
            const nodes = NODES.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
            const ids = new Set(nodes.map((node) => node.id));
            yield {
                nodes: nodes.map((node) => ({ ...node })),
                edges: EDGES.filter((edge) => ids.has(edge.src)).map((edge) => ({ ...edge })),
            };

            if (page < PAGES - 1) {
                await new Promise<void>((resolve) => {
                    releasePage = resolve;
                });
            }
        }
    }
}

DataSource.register(PagedSource);

/** What one rendered frame showed of the nodes and edges drawn in it. */
interface Frame {
    /** Whether the layout had settled. */
    readonly settled: boolean;
    /** Each node's instance colour as "r,g,b", or "none". */
    readonly colors: readonly string[];
    /** Each node's drawn radius, in scene units. */
    readonly radii: readonly number[];
    /** How many of its nodes and edges are drawn from the element's own bootstrap paint. */
    readonly bootstrapped: readonly string[];
}

const MOUNT_TIMEOUT_MS = 10000;

/** Where each element is mounted, kept so the test can take them down again. */
const containers: HTMLDivElement[] = [];

async function mount(): Promise<Graphty> {
    const container = document.createElement("div");
    containers.push(container);
    container.style.width = "480px";
    container.style.height = "360px";
    document.body.appendChild(container);
    const mounted = document.createElement("graphty-element");
    assert.instanceOf(mounted, Graphty, "importing the package is what defines the custom element");
    mounted.style.width = "100%";
    mounted.style.height = "100%";
    mounted.style.display = "block";
    container.appendChild(mounted);
    await vi.waitFor(
        () => {
            assert.isTrue(mounted.graph.initialized, "the element finished initialising");
        },
        { timeout: MOUNT_TIMEOUT_MS },
    );
    return mounted;
}

/**
 * Read what a frame drew, right after it was drawn.
 * @param element - The element.
 * @returns The frame.
 */
function readFrame(element: Graphty): Frame {
    const nodes = [...element.graph.getDataManager().nodes.values()];
    return {
        settled: element.graph.getLayoutManager().layoutEngine?.isSettled ?? true,
        colors: nodes.map((node) => {
            const { color } = node.mesh.instancedBuffers as { color?: { r: number; g: number; b: number } };
            return color === undefined
                ? "none"
                : [color.r, color.g, color.b].map((channel) => Math.round(channel * 255)).join(",");
        }),
        radii: nodes.map((node) => node.mesh.getBoundingInfo().boundingSphere.radiusWorld),
        bootstrapped: [
            ...nodes.map((node) => {
                const metadata = node.mesh.metadata as { styleId?: unknown } | undefined;
                const key = typeof metadata?.styleId === "string" ? metadata.styleId : node.mesh.name;
                return { key, what: `node ${String(node.id)}` };
            }),
            // The key an edge's line is built under; private, read the way the paint tests read it.
            ...[...element.graph.getDataManager().edges.values()].map((edge) => ({
                key: (edge as unknown as { meshKey: string }).meshKey,
                what: `edge ${String(edge.srcId)}-${String(edge.dstId)}`,
            })),
        ]
            .filter(
                ({ key }) => key.includes(bootstrapNodePaint().meshKey) || key.includes(bootstrapEdgePaint().meshKey),
            )
            .map(({ what }) => what),
    };
}

/**
 * Load the paged source and keep, for each page, the first frame drawn once its nodes exist.
 * @param element - The element, with its layers already asked for.
 * @returns One frame per page.
 */
async function framesPerPage(element: Graphty): Promise<Frame[]> {
    const frames: Frame[] = [];
    const { scene } = element.graph;
    const observer = scene.onAfterRenderObservable.add(() => {
        if (element.graph.getDataManager().nodes.size === (frames.length + 1) * PER_PAGE) {
            frames.push(readFrame(element));
        }
    });

    releasePage = null;
    const loading = element.session.data.import({ type: PAGED_FORMAT, config: {} });
    for (let page = 1; page <= PAGES; page++) {
        await vi.waitFor(
            () => {
                assert.lengthOf(frames, page, `a frame was drawn with page ${String(page)} in it`);
            },
            { timeout: MOUNT_TIMEOUT_MS },
        );
        if (page < PAGES) {
            await vi.waitFor(() => {
                assert.isNotNull(releasePage, "the source is waiting for its next page");
            });
            const release = releasePage as unknown as () => void;
            releasePage = null;
            release();
        }
    }

    await loading;
    scene.onAfterRenderObservable.remove(observer);
    return frames;
}

/**
 * Assert that nothing in a frame is drawn from the element's own bootstrap paint.
 * @param frame - The frame.
 * @param page - Which page it showed, for the message.
 */
function assertNothingBootstrapped(frame: Frame, page: number): void {
    assert.isFalse(frame.settled, `page ${String(page)}: the layout is still running`);
    assert.deepStrictEqual(frame.bootstrapped, [], `page ${String(page)}: no node or edge is drawn from the defaults`);
}

/** A size no default layer paints, so a node is drawn at it only if THIS layer painted it. */
const SIZE = 3.25;

const CRIMSON: LayerSpec = {
    name: "First frame - every node crimson and large",
    target: "node",
    selector: { match: "everything" },
    set: { "node.color": "#DC143C", "node.size": SIZE },
};

const HEAT: LayerSpec = {
    name: "First frame - colour by heat",
    target: "node",
    selector: { match: "everything" },
    encode: { "node.color": { by: "data.heat", scale: "linear", domain: [0, 100], palette: "viridis" } },
};

describe("a node is drawn with its style from the first frame it is drawn in", () => {
    afterEach(() => {
        releasePage?.();
        releasePage = null;
        for (const container of containers.splice(0)) {
            container.remove();
        }
    });

    it("a fixed colour and size, on every page of a paged load", async () => {
        const element = await mount();
        void element.session.styles.add(CRIMSON);
        const frames = await framesPerPage(element);

        // The radius a default-sized node is drawn at, to compare the painted size against.
        const plain = await mount();
        await plain.session.data.import({ type: "json", config: { data: JSON.stringify({ nodes: [{ id: "x" }] }) } });
        await plain.waitForStableFrame();
        const [defaultRadius] = readFrame(plain).radii;

        frames.forEach((frame, at) => {
            const page = at + 1;
            assertNothingBootstrapped(frame, page);
            assert.deepStrictEqual(
                [...new Set(frame.colors)],
                ["220,20,60"],
                `page ${String(page)}: every node is crimson`,
            );
            for (const radius of frame.radii) {
                assert.closeTo(
                    radius / defaultRadius,
                    SIZE,
                    0.01,
                    `page ${String(page)}: every node is drawn at size ${String(SIZE)}`,
                );
            }
        });
    });

    it("a data-bound colour, on every page of a paged load", async () => {
        const element = await mount();
        void element.session.styles.add(HEAT);
        const frames = await framesPerPage(element);

        frames.forEach((frame, at) => {
            const page = at + 1;
            assertNothingBootstrapped(frame, page);
            assert.sameMembers(
                [...new Set(frame.colors)],
                ["68,1,84", "253,231,36"],
                `page ${String(page)}: the cold and the hot nodes are drawn in the two ends of the ramp`,
            );
        });
    });

    it("a layer asked for just before an inline import of a thousand nodes, on every frame drawn", async () => {
        const element = await mount();
        // A seeded layout, as a consumer that wants the same drawing on every load sets it.
        element.layoutConfig = { seed: 7 };
        const many = Array.from({ length: 1000 }, (_, i) => ({ id: `m${i}` }));
        const text = JSON.stringify({
            nodes: many,
            edges: many.map((_, i) => ({ src: `m${i}`, dst: `m${(i * 7 + 1) % many.length}` })),
        });
        const frames: Frame[] = [];
        const observer = element.graph.scene.onAfterRenderObservable.add(() => {
            if (element.graph.getDataManager().nodes.size > 0) {
                frames.push(readFrame(element));
            }
        });
        void element.session.styles.add(CRIMSON);
        await element.session.data.import({ type: "json", config: { data: text } });
        // Every frame up to the first one drawn after the whole graph's paint has been applied.
        await element.session.styles.settled();
        const drawnBefore = frames.length;
        await vi.waitFor(() => {
            assert.isAbove(frames.length, drawnBefore, "a frame was drawn after the paint settled");
        });
        element.graph.scene.onAfterRenderObservable.remove(observer);
        frames.forEach((frame, at) => {
            const drawn = at + 1;
            if (at === 0) {
                assert.isFalse(frame.settled, "the first frame is drawn while the layout is still running");
            }
            assert.deepStrictEqual(
                frame.bootstrapped,
                [],
                `frame ${String(drawn)}: nothing is drawn from the defaults`,
            );
            assert.deepStrictEqual(
                [...new Set(frame.colors)],
                ["220,20,60"],
                `frame ${String(drawn)}: every node is crimson`,
            );
        });
    });
});
