/**
 * The app shell with the REAL graphty-element: nothing mocked, no setter replaced.
 *
 * Every other shell test stands in for the element, so a sample the element cannot parse,
 * or a manifest count that disagrees with what the element builds, passes them all. This
 * file picks each sample through Welcome's own sample list -- the path a reader takes --
 * and asks the element, through its own events and accessors, what it loaded and whether
 * it drew anything.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeAll, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { findSample, SAMPLE_MANIFEST, type SampleRecord } from "../../../data/sampleManifest";
import { fireEvent, render, screen, waitFor, within } from "../../../test/test-utils";
import { AppShell } from "../AppShell";
import { COMMAND_PALETTE_PLACEHOLDER } from "../CommandPalette";

/** The element itself, by its own published type; the import above registers it. */
type ElementUnderTest = import("@graphty/graphty-element").Graphty;

/** A hang guard for loading a sample, laying it out and drawing it; not a pass/fail timing. */
const LOAD_TEST_TIMEOUT_MS = 120_000;

/** What the element reported once the load ended and the picture settled. */
interface LoadedSample {
    readonly nodes: number;
    readonly edges: number;
    readonly distinctColours: number;
}

/**
 * Counts the distinct pixel colours in the element's own screenshot.
 * @param element - the mounted graphty-element.
 * @returns how many distinct RGBA values the captured image holds.
 */
async function countScreenshotColours(element: ElementUnderTest): Promise<number> {
    const shot = await element.captureScreenshot({ format: "png" });
    const bitmap = await createImageBitmap(shot.blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");

    if (context === null) {
        throw new Error("no 2d context to read the screenshot back");
    }

    context.drawImage(bitmap, 0, 0);

    const pixels = new Uint32Array(context.getImageData(0, 0, bitmap.width, bitmap.height).data.buffer);

    return new Set(pixels).size;
}

/**
 * Renders the shell, clicks a sample's Welcome row, and waits on the element's own load
 * events. Rejects when the element reports `data-loading-error` for the load.
 * @param record - the manifest row to click.
 * @returns the shell's container and the element, once the load is complete and the frame stable.
 */
async function mountSampleThroughWelcome(
    record: SampleRecord,
): Promise<{ readonly container: HTMLElement; readonly element: ElementUnderTest }> {
    const { container } = render(<AppShell initialShellWidth={1440} measureViewport={false} persist={false} />);
    const element = container.querySelector<ElementUnderTest>("graphty-element");

    if (element === null) {
        throw new Error("the shell mounted no graphty-element");
    }

    const loaded = new Promise<void>((resolve, reject) => {
        element.addEventListener("data-loading-complete", () => {
            resolve();
        });
        element.addEventListener("data-loading-error", (event) => {
            const { error } = (event as CustomEvent<{ error: Error }>).detail;

            reject(new Error(`the element rejected ${record.fileName}: ${error.message}`));
        });
    });

    const row = container.querySelector<HTMLElement>(`[data-sample-row="${record.id}"]`);

    if (row === null) {
        throw new Error(`Welcome drew no row for ${record.id}`);
    }

    fireEvent.click(row);
    await loaded;
    await element.waitForStableFrame();

    return { container, element };
}

/**
 * Loads a sample through Welcome and reports what the element holds and draws.
 * @param record - the manifest row to click.
 * @returns what the element holds and draws once the load is complete and the frame stable.
 */
async function loadSampleThroughWelcome(record: SampleRecord): Promise<LoadedSample> {
    const { element } = await mountSampleThroughWelcome(record);

    return {
        nodes: element.getNodeCount(),
        edges: element.getEdgeCount(),
        distinctColours: await countScreenshotColours(element),
    };
}

/**
 * The whole check one sample must pass: it loads without an error, the element holds the
 * manifest's counts, and the canvas is not one flat colour.
 * @param record - the manifest row to check.
 */
async function expectSampleLoads(record: SampleRecord): Promise<void> {
    const loaded = await loadSampleThroughWelcome(record);

    assert.deepEqual(
        { nodes: loaded.nodes, edges: loaded.edges },
        { nodes: record.size.nodes, edges: record.size.edges },
        `${record.fileName}: the element's counts against the manifest's`,
    );
    // A canvas with nothing drawn on it is one flat clear colour.
    assert.isAbove(loaded.distinctColours, 1, `${record.fileName}: the canvas is blank`);
}

/** The first sample served from a URL, whose file the broken-sample cases replace. */
function servedSample(): SampleRecord & { readonly source: { readonly kind: "url"; readonly url: string } } {
    const served = SAMPLE_MANIFEST.find((record) => record.source.kind === "url");

    if (served?.source.kind !== "url") {
        throw new Error("the manifest has no served sample to break");
    }

    return served as SampleRecord & { readonly source: { readonly kind: "url"; readonly url: string } };
}

/**
 * Serves `body` in place of one sample file; every other request goes to the network.
 * @param url - the sample's site-root-relative URL.
 * @param body - the broken file.
 */
function serveBrokenFile(url: string, body: string): void {
    const realFetch = globalThis.fetch.bind(globalThis);

    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
        const requested = input instanceof Request ? input.url : String(input);

        return requested.endsWith(url) ? Promise.resolve(new Response(body, { status: 200 })) : realFetch(input, init);
    });
}

/**
 * Awaits a check that must fail.
 * @param check - the check.
 * @returns the error it failed with.
 */
async function failureOf(check: Promise<void>): Promise<Error> {
    const outcome = await check.then(
        () => null,
        (error: unknown) => error,
    );

    assert.instanceOf(outcome, Error, "the check passed on a broken sample");

    return outcome;
}

describe("AppShell with the real graphty-element", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    for (const record of SAMPLE_MANIFEST) {
        // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
        it(
            `loads ${record.name} with the manifest's counts and draws it`,
            async () => {
                await expectSampleLoads(record);
            },
            LOAD_TEST_TIMEOUT_MS,
        );
    }

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "fails when a sample's file is not the format it claims",
        async () => {
            const served = servedSample();

            serveBrokenFile(served.source.url, "this is not a graph");

            const failure = await failureOf(expectSampleLoads(served));

            assert.include(failure.message, `the element rejected ${served.fileName}`);
        },
        LOAD_TEST_TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "fails when a sample's file is cut short",
        async () => {
            const served = servedSample();

            // The element refuses a GML file that ends inside an open list, so the load itself
            // fails rather than holding the one node that parsed.
            serveBrokenFile(served.source.url, "graph [ node [ id 1 ");

            const failure = await failureOf(expectSampleLoads(served));

            assert.include(failure.message, `the element rejected ${served.fileName}`);
        },
        LOAD_TEST_TIMEOUT_MS,
    );
});

/**
 * Every node within `depth` hops of `seed`, following edges either way. The test's own
 * reference walk, which the element's filter is checked against.
 * @param edges - the graph's edges.
 * @param seed - the node to start from.
 * @param depth - how many hops to take.
 * @returns the ids reached, as strings, sorted.
 */
function hopsFrom(edges: readonly { source: unknown; target: unknown }[], seed: string, depth: number): string[] {
    const reached = new Set([seed]);
    let frontier = [seed];

    for (let hop = 0; hop < depth; hop++) {
        const next: string[] = [];

        for (const edge of edges) {
            const [source, target] = [String(edge.source), String(edge.target)];

            for (const [from, to] of [
                [source, target],
                [target, source],
            ]) {
                if (frontier.includes(from) && !reached.has(to)) {
                    reached.add(to);
                    next.push(to);
                }
            }
        }

        frontier = next;
    }

    return [...reached].sort();
}

describe("the ego network with the real graphty-element", () => {
    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "shows exactly a node's 2-hop neighborhood, and Clear shows the whole graph again",
        async () => {
            const karate = findSample("karate");
            assert.isDefined(karate);
            const { container, element } = await mountSampleThroughWelcome(karate);
            const { session } = element;
            const edges = session.data.edges();
            const total = session.data.nodes().length;

            // A node whose 2-hop neighborhood is wider than its 1-hop one and narrower than the
            // graph, so the depth visibly matters.
            const seedRecord = session.data.nodes().find((node) => {
                const two = hopsFrom(edges, String(node.id), 2).length;

                return two > hopsFrom(edges, String(node.id), 1).length && two < total;
            });
            assert.isDefined(seedRecord, "karate has no node whose 2-hop neighborhood is a strict subset");
            const seed = String(seedRecord.id);

            await session.selection.apply({ nodes: [seedRecord.id] });

            const visible = (): string[] => [...session.visibility.nodes].map(String).sort();
            const changed = (): Promise<void> =>
                new Promise((resolve) => {
                    const unwatch = session.on("visibility:changed", () => {
                        unwatch();
                        resolve();
                    });
                });

            // G applies the element's neighborhood filter at the default depth of one hop.
            let next = changed();
            fireEvent.keyDown(window, { key: "g" });
            await next;
            assert.deepEqual(visible(), hopsFrom(edges, seed, 1));

            // The depth control moves the same filter to two hops.
            const control = await within(container).findByTestId("ego-network-control");
            next = changed();
            fireEvent.click(within(control).getByLabelText("2 hop"));
            await next;
            assert.deepEqual(session.visibility.filter, { kind: "neighborhood", seeds: [seedRecord.id], depth: 2 });
            assert.deepEqual(visible(), hopsFrom(edges, seed, 2));

            next = changed();
            fireEvent.click(within(control).getByRole("button", { name: "Clear" }));
            await next;
            assert.isNull(session.visibility.filter);
            assert.strictEqual(session.visibility.nodes.size, total);
        },
        LOAD_TEST_TIMEOUT_MS,
    );
});

describe("the inspector's Pin verb on the real graphty-element", () => {
    /* Karate's GML ids are integers, so the element holds node 34 under the number while the
       shell prints and passes "34". The Pinned badge reads the element's own pinned set, which
       is the only thing that answers for either spelling. */
    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "pins a numeric node by its printed id and draws the Pinned badge",
        async () => {
            const karate = SAMPLE_MANIFEST.find((record) => record.id === "karate");

            if (karate === undefined) {
                throw new Error("the manifest has no karate sample");
            }

            const { container } = render(<AppShell initialShellWidth={1440} measureViewport={false} persist={false} />);
            const element = container.querySelector<ElementUnderTest>("graphty-element");

            if (element === null) {
                throw new Error("the shell mounted no graphty-element");
            }

            const loaded = new Promise<void>((resolve) => {
                element.addEventListener("data-loading-complete", () => {
                    resolve();
                });
            });

            fireEvent.click(container.querySelector<HTMLElement>(`[data-sample-row="karate"]`) ?? container);
            await loaded;
            await element.waitForStableFrame();

            assert.isTrue(element.selectNode(34), "the element holds node 34");
            fireEvent.click(await screen.findByTestId("inspector-actions-more"));
            fireEvent.click(await screen.findByRole("menuitem", { name: "Pin" }));

            assert.include((await screen.findByTestId("node-pinned-badge")).textContent ?? "", "Pinned");
            assert.deepEqual([...element.session.positions.pinned], [34], "pinned under the id the graph holds");

            fireEvent.click(screen.getByTestId("node-unpin"));
            await waitFor(() => {
                assert.isNull(screen.queryByTestId("node-pinned-badge"));
            });
            assert.strictEqual(element.session.positions.pinned.size, 0);
        },
        LOAD_TEST_TIMEOUT_MS,
    );
});

describe("the command palette's node and edge search on the real graphty-element", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    /**
     * Opens the palette from the top bar's trigger and types into its field.
     * @param text - what to type.
     */
    async function typeInPalette(text: string): Promise<void> {
        fireEvent.click(screen.getByRole("button", { name: new RegExp(COMMAND_PALETTE_PLACEHOLDER) }));
        fireEvent.change(await screen.findByLabelText(COMMAND_PALETTE_PLACEHOLDER), { target: { value: text } });
    }

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "selects a node typed by its id and frames it",
        async () => {
            const cat = findSample("cat-social-network");
            assert.isDefined(cat);
            const { element } = await mountSampleThroughWelcome(cat);
            const framed = vi.spyOn(element, "zoomToNodes");

            await typeInPalette("Mr_Whiskers");
            const rows = await screen.findAllByRole("option", { name: /^Nodes/ });
            // The exact id match sorts first.
            assert.strictEqual(rows[0]?.textContent, "NodesMr_Whiskers");
            fireEvent.click(rows[0]);

            await waitFor(() => {
                assert.deepEqual([...element.session.selection.nodes], ["Mr_Whiskers"]);
            });
            await waitFor(() => {
                assert.deepEqual(framed.mock.calls[0]?.[0], "Mr_Whiskers");
            });
        },
        LOAD_TEST_TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "selects an edge found by one of its values",
        async () => {
            const cat = findSample("cat-social-network");
            assert.isDefined(cat);
            const { element } = await mountSampleThroughWelcome(cat);
            const [expected] = element.session.find("rivals", { kinds: ["edge"], limit: 1 }).records;
            assert.isDefined(expected, "the cat sample has a rivals edge");

            await typeInPalette("rivals");
            const [row] = await screen.findAllByRole("option", { name: /^Edges/ });
            assert.isDefined(row);
            fireEvent.click(row);

            await waitFor(() => {
                assert.deepEqual([...element.session.selection.edges], [expected.id]);
            });
            assert.strictEqual(element.session.selection.nodes.length, 0);
        },
        LOAD_TEST_TIMEOUT_MS,
    );
});

/**
 * The reader's main flows, with real input: every click and key below is made by the browser
 * (vitest's `userEvent`, which drives Playwright), so focus, a focus trap's timing and a
 * controlled field that discards keystrokes behave as they do for a person. `fireEvent.change`
 * writes a field's value directly and passes all three.
 */
describe("the shell's main flows, by real input, on the real graphty-element", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("opens the command palette with its field focused, so typing goes straight in", async () => {
        const cat = findSample("cat-social-network");
        assert.isDefined(cat);
        await mountSampleThroughWelcome(cat);

        await userEvent.click(screen.getByRole("button", { name: new RegExp(COMMAND_PALETTE_PLACEHOLDER) }));
        const field = await screen.findByLabelText<HTMLInputElement>(COMMAND_PALETTE_PLACEHOLDER);
        // Mantine's focus trap picks its target in a zero-delay timer after the dialog opens
        // (use-focus-trap.mjs); let that timer run, as it has by the time a hand types.
        await new Promise((resolve) => setTimeout(resolve, 0));
        await userEvent.keyboard("Mr_W");

        assert.strictEqual(field.value, "Mr_W", "the keys went into the palette's field");
    });

    it("lets the reader type in the Explore search", async () => {
        const cat = findSample("cat-social-network");
        assert.isDefined(cat);
        await mountSampleThroughWelcome(cat);

        if (screen.queryByRole("region", { name: "Explore" }) === null) {
            await userEvent.click(screen.getByRole("button", { name: "Explore" }));
        }
        const search = await screen.findByTestId<HTMLInputElement>("explore-search-input");
        await userEvent.click(search);
        await userEvent.keyboard("Mr");

        assert.strictEqual(search.value, "Mr", "the field kept what was typed");
    });

    it("keeps a second metric's layers over the first's on the element", async () => {
        const cat = findSample("cat-social-network");
        assert.isDefined(cat);
        const { element } = await mountSampleThroughWelcome(cat);
        const runLayers = (): string[] =>
            element.session.styles
                .list()
                .map((layer) => layer.source)
                .filter((source) => source.by === "run")
                .map((source) => (source as { algorithm?: string }).algorithm ?? "");

        /**
         * Runs one of the Analyze panel's suggested cards and waits for its layer.
         * @param card - the card's name.
         * @param algorithm - the algorithm whose layer it paints.
         */
        async function runCard(card: string, algorithm: string): Promise<void> {
            if (screen.queryByRole("region", { name: "Analyze" }) === null) {
                await userEvent.click(screen.getByRole("button", { name: "Analyze" }));
            }
            await userEvent.click(await screen.findByRole("button", { name: `Run ${card}` }));
            await waitFor(
                () => {
                    assert.include(runLayers(), algorithm);
                },
                { timeout: LOAD_TEST_TIMEOUT_MS },
            );
        }

        await runCard("Most connected", "degree");
        await runCard("Influence", "pagerank");

        assert.includeMembers(runLayers(), ["degree", "pagerank"], "the first run's layer is still in the stack");
    });

    it("keeps the image format the reader picks in the Present panel and captures in it", async () => {
        const cat = findSample("cat-social-network");
        assert.isDefined(cat);
        const { element } = await mountSampleThroughWelcome(cat);
        const capture = vi.spyOn(element, "captureScreenshot");

        await userEvent.click(screen.getByRole("button", { name: "Present" }));
        await userEvent.click(await screen.findByRole("combobox", { name: "Image format" }));
        await userEvent.click(await screen.findByRole("option", { name: "JPEG" }));
        await waitFor(() => {
            assert.strictEqual(screen.getByRole<HTMLInputElement>("combobox", { name: "Image format" }).value, "JPEG");
        });

        await userEvent.click(screen.getByRole("button", { name: "Export image" }));

        assert.deepEqual(capture.mock.calls[0]?.[0], { format: "jpeg", destination: { download: true } });
    });
});
