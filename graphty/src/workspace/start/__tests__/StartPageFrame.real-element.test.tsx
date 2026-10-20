/**
 * The start page inside the app's own frame (index.css, which keeps the workspace from ever
 * scrolling), on the REAL graphty-element: the page scrolls both ways by wheel, touch and keyboard;
 * its bar of facts ends the first view at iPad sizes; the theme button switches the theme in place;
 * and the Samples dialog offers every dataset graph-samples lists that a browser opens in a moment.
 */

// The app's frame, as main.tsx loads it.
import "../../../index.css";
// Registers the real <graphty-element>, as the app's loader does.
import "@graphty/graphty-element";

import { DATASET_DESCRIPTORS, GENERATOR_DESCRIPTORS } from "@graphty/graphty-element/catalog";
import { DEFAULT_LIMITS } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { swipeOver, wheelOver } from "../../../test/real-pointer";
import { openSamples, sampleRow } from "../../../test/samples-dialog";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { forgetUsageAnswer } from "../../privacy/usageData";
import { clearRecent } from "../../project/recent";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a sample loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/**
 * Renders the start page and waits for its graph to load.
 * @returns the store.
 */
async function startPage(): Promise<WorkspaceStore> {
    const store = createWorkspaceStore();
    render(<Workspace store={store} />);
    await waitFor(
        () => {
            const hero = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
                "graphty-element[data-start-page]",
            );
            assert.equal(hero?.session.data.statistics().nodeCount, 77);
        },
        { timeout: TIMEOUT_MS },
    );
    return store;
}

/**
 * How far the page is scrolled.
 * @returns the document's scroll offset.
 */
function scrolled(): number {
    return document.scrollingElement?.scrollTop ?? 0;
}

/**
 * Whether the page is scrolled as far down as it goes.
 * @returns true once it is.
 */
function atEnd(): boolean {
    const end = (document.scrollingElement?.scrollHeight ?? 0) - window.innerHeight;
    return end > 0 && scrolled() >= end - 1;
}

/**
 * Opens the start page and scrolls it to the end by wheel, over the headline (the graph's canvas
 * keeps the wheel for zooming the graph).
 */
async function scrollDown(): Promise<void> {
    await startPage();
    await wheelOver(screen.getByRole("heading", { level: 1 }), 5000);
    await waitFor(() => {
        assert.isTrue(atEnd(), "the wheel scrolled the page down");
    });
}

/**
 * The foot of the page, where a pointer scrolls it back up.
 * @returns the footer.
 */
function foot(): HTMLElement {
    return screen.getByRole("contentinfo");
}

beforeEach(async () => {
    await clearRecent();
    forgetUsageAnswer();
    await page.viewport(1440, 900);
    // The page under test stays mounted until the next render, so a test that scrolled it would
    // otherwise hand the next one a page that opens scrolled down.
    window.scrollTo(0, 0);
});

afterEach(async () => {
    await clearRecent();
});

describe("the start page in the app's frame", () => {
    it("scrolls down, and back up again, by wheel", async () => {
        await scrollDown();

        await wheelOver(foot(), -5000);
        await waitFor(() => {
            assert.equal(scrolled(), 0, "the wheel scrolled it back up");
        });
    });

    it("shows the header's own lockup only once the page is scrolled past the big one", async () => {
        await startPage();
        const header = document.querySelector<HTMLElement>(".ws-land-top");
        assert.isUndefined(header?.dataset.scrolled, "at the top, the big lockup is in view");

        // A window shrunk to nothing and back, as a screenshot tool does, is not a scroll.
        await page.viewport(1, 1);
        await page.viewport(1440, 900);
        await waitFor(() => {
            assert.equal(window.innerWidth, 1440);
        });
        assert.isUndefined(header?.dataset.scrolled, "a resize did not scroll the page");

        await wheelOver(screen.getByRole("heading", { level: 1 }), 5000);
        await waitFor(() => {
            assert.isTrue(atEnd(), "the wheel scrolled the page down");
            assert.equal(header?.dataset.scrolled, "true", "scrolled down, the header shows its lockup");
        });
        await wheelOver(foot(), -5000);
        await waitFor(() => {
            assert.isUndefined(header?.dataset.scrolled, "back at the top, it hides it again");
        });
    });

    it("scrolls back up by touch", async () => {
        await scrollDown();

        // A finger moving down the page scrolls it up.
        const before = scrolled();
        await swipeOver(foot(), 400);
        await waitFor(() => {
            assert.isBelow(scrolled(), before, "a swipe scrolled it back up");
        });
    });

    it("scrolls back up, and down again, by keyboard", async () => {
        await scrollDown();

        await userEvent.keyboard("{Home}");
        await waitFor(() => {
            assert.equal(scrolled(), 0, "Home scrolled it back up");
        });
        await userEvent.keyboard("{End}");
        await waitFor(() => {
            assert.isAbove(scrolled(), 0, "End scrolled it down");
        });
    });

    // Full screen, and under Safari's address and tab bars (upright, and on its side).
    for (const [width, height] of [
        [1180, 820],
        [820, 1180],
        [820, 1080],
        [820, 1000],
        [1024, 640],
    ]) {
        it(`ends the first view with the bar of facts on an iPad, ${String(width)} x ${String(height)}`, async () => {
            await page.viewport(width, height);
            await startPage();
            const bar = screen.getByRole("complementary", { name: "graphty at a glance" });
            // The first view is the page at the top. The previous test's page can still be
            // finishing a smooth scroll when this one mounts, so put it at the top and wait there.
            window.scrollTo(0, 0);
            await waitFor(() => {
                assert.equal(scrolled(), 0, "the page is at the top");
                const box = bar.getBoundingClientRect();
                assert.isAtMost(box.bottom, window.innerHeight, "the bar is inside the first view");
                assert.isAbove(box.top, window.innerHeight / 2, "the bar is at the foot of the view");
            });
            assert.isNotNull(bar.textContent?.match(/\d+ algorithms/), "the bar names the algorithms");
        });
    }

    it("switches the theme in place from the button at the top right", async () => {
        await startPage();
        const land = document.querySelector<HTMLElement>(".ws-land");
        const before = land?.dataset.scheme;
        const next = before === "dark" ? "light" : "dark";

        await userEvent.click(screen.getByRole("button", { name: `Switch to ${next} mode` }));
        await waitFor(() => {
            assert.equal(document.querySelector<HTMLElement>(".ws-land")?.dataset.scheme, next);
        });
        assert.isNull(screen.queryByRole("dialog"), "no settings opened");
        assert.isNotNull(screen.getByRole("button", { name: `Switch to ${before ?? "dark"} mode` }));
    });

    it("offers every dataset graph-samples lists that graphty-element opens, and opens one", async () => {
        const store = await startPage();
        const dialog = await openSamples();
        const offered = [
            ...within(within(dialog).getByRole("region", { name: "Graphs" })).getAllByRole("button"),
            ...within(within(dialog).getByRole("region", { name: "Datasets" })).getAllByRole("button"),
        ];
        const opens = DATASET_DESCRIPTORS.filter(
            (dataset) => dataset.nodes <= DEFAULT_LIMITS.renderCeiling && dataset.edges <= DEFAULT_LIMITS.edgesDrawn,
        );
        // The app's own four copies stand in for theirs in graph-samples, each listed once.
        assert.lengthOf(offered, opens.length);
        for (const title of [
            "Doubtful Sound dolphins",
            "OpenFlights airline routes",
            "Generic GO slim (Gene Ontology)",
        ]) {
            assert.isNotNull(sampleRow(dialog, title));
        }

        await userEvent.click(sampleRow(dialog, "Doubtful Sound dolphins"));
        await waitFor(
            () => {
                const element = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
                    "graphty-element:not([data-start-page])",
                );
                assert.equal(element?.session.data.statistics().nodeCount, 62);
                assert.equal(element?.session.data.statistics().edgeCount, 159);
            },
            { timeout: TIMEOUT_MS },
        );
        assert.equal(store.get().project?.name, "Doubtful Sound dolphins");
        assert.isNull(store.get().notice);
    });

    it("says what a large dataset takes before it downloads, and leaves out one the element does not open", async () => {
        const store = await startPage();

        const large = sampleRow(await openSamples(), "Gene Ontology (go-basic)");
        assert.include(large.textContent, "1.4 MB");
        await userEvent.click(large);
        const asked = await screen.findByRole("dialog", { name: "Gene Ontology (go-basic)" });
        assert.include(asked.textContent, "48,340 nodes and 71,496 edges, a 1.4 MB download.");
        assert.include(asked.textContent, "takes a while to open");
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog"));
        });
        assert.isNull(store.get().project, "nothing opened");

        // The license is where the data comes from, said once, under the size; Open is always there.
        await userEvent.click(sampleRow(await openSamples(), "Gene Ontology (go-basic)"));
        const again = await screen.findByRole("dialog", { name: "Gene Ontology (go-basic)" });
        assert.include(again.textContent, "License: CC BY 4.0");
        assert.isNotNull(within(again).queryByRole("button", { name: "Open" }));
        await userEvent.click(within(again).getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog"));
        });

        // A dataset past graphty-element's published ceilings has no row: it could only open empty.
        const samples = await openSamples();
        for (const dataset of DATASET_DESCRIPTORS) {
            const tile = within(samples)
                .queryAllByRole("button")
                .find((button) => button.textContent.startsWith(dataset.title));
            const fits = dataset.nodes <= DEFAULT_LIMITS.renderCeiling && dataset.edges <= DEFAULT_LIMITS.edgesDrawn;
            if (!fits) {
                assert.isUndefined(tile, `${dataset.name} is left out`);
            }
        }
        assert.isNull(screen.queryByText(/Too large/), "no row offers what does not open");
    });

    it("lists every generator, and generates a small graph with the parameters set", async () => {
        const store = await startPage();
        const samples = await openSamples();
        const generated = () =>
            within(within(samples).getByRole("region", { name: "Generated" })).getAllByRole("button");
        assert.lengthOf(generated(), GENERATOR_DESCRIPTORS.length);

        await userEvent.type(within(samples).getByRole("searchbox", { name: "Search samples" }), "small world");
        assert.deepEqual(
            generated().map((button) => button.textContent),
            ["Newman-Wattsgraphty", "Watts-Strogatzgraphty"],
        );

        await userEvent.click(sampleRow(samples, "Watts-Strogatz"));
        const dialog = await screen.findByRole("dialog", { name: "Watts-Strogatz" });
        const nodes = within(dialog).getByRole("textbox", { name: "Nodes" });
        assert.equal((nodes as HTMLInputElement).value, "60");
        await userEvent.tripleClick(nodes);
        await userEvent.keyboard("24");
        await userEvent.click(within(dialog).getByRole("button", { name: "Generate" }));

        await waitFor(
            () => {
                const element = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
                    "graphty-element:not([data-start-page])",
                );
                assert.equal(element?.session.data.statistics().nodeCount, 24);
                // A ring of 24 with 4 neighbors each keeps 24 * 4 / 2 edges through the rewiring.
                assert.equal(element?.session.data.statistics().edgeCount, 48);
            },
            { timeout: TIMEOUT_MS },
        );
        assert.equal(store.get().project?.name, "Watts-Strogatz");
        assert.isNull(store.get().notice);
    });
});
