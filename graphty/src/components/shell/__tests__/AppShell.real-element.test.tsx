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

import { afterEach, assert, describe, it, vi } from "vitest";

import { SAMPLE_MANIFEST, type SampleRecord } from "../../../data/sampleManifest";
import { fireEvent, render } from "../../../test/test-utils";
import { AppShell } from "../AppShell";

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
 * @returns what the element holds and draws once the load is complete and the frame stable.
 */
async function loadSampleThroughWelcome(record: SampleRecord): Promise<LoadedSample> {
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
        it(
            `loads ${record.name} with the manifest's counts and draws it`,
            async () => {
                await expectSampleLoads(record);
            },
            LOAD_TEST_TIMEOUT_MS,
        );
    }

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
